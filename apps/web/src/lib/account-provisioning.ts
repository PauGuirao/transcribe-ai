import type { SupabaseClient } from "@supabase/supabase-js";

export interface ProvisionResult {
  profileId: string;
  organizationId: string;
  wasNewOrg: boolean;
}

interface AuthUserLike {
  id: string;
  email: string;
  user_metadata?: Record<string, any> | null;
}

interface ProvisionOptions {
  joinOrgId?: string;
}

/**
 * Single source of truth for provisioning a user account on sign-in / sign-up.
 *
 * Behaviour:
 *  - Always upserts a `profiles` row (idempotent).
 *  - If `joinOrgId` is provided: joins that org as a `member` and sets it as
 *    the user's `current_organization_id`. No personal org is created.
 *  - Otherwise, if the profile already has a `current_organization_id`, this
 *    is a returning user — no-op.
 *  - Otherwise, creates a personal org "{First Name}'s Grup" on the free plan
 *    with the user as `owner` and sets it as `current_organization_id`.
 *
 * Errors after the profile row has been created are logged but not re-thrown
 * with a rollback — the next sign-in will be idempotent and retry.
 *
 * NOTE: This must be called with a **service-role** Supabase client so that
 * RLS does not block the cross-table inserts/updates that happen before the
 * user is fully provisioned.
 */
export async function provisionUserAccount(
  supabase: SupabaseClient,
  user: AuthUserLike,
  opts: ProvisionOptions = {}
): Promise<ProvisionResult> {
  const userId = user.id;
  const email = user.email;
  const fullName =
    (user.user_metadata && typeof user.user_metadata.full_name === "string"
      ? user.user_metadata.full_name
      : null) ?? null;

  // 1. Upsert profile (idempotent — updates email/full_name on every sign-in).
  const { error: profileUpsertError } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        email,
        full_name: fullName,
      },
      { onConflict: "id", ignoreDuplicates: false }
    );

  if (profileUpsertError) {
    // This is the only error we re-throw — without a profile, nothing else
    // can work, so fail loudly and let the auth callback redirect to error.
    throw new Error(
      `Failed to upsert profile for user ${userId}: ${profileUpsertError.message}`
    );
  }

  // 2. Read profile to find the current organization id (if any).
  const { data: profile, error: profileSelectError } = await supabase
    .from("profiles")
    .select("id, current_organization_id")
    .eq("id", userId)
    .maybeSingle();

  if (profileSelectError || !profile) {
    throw new Error(
      `Failed to read profile after upsert for user ${userId}: ${
        profileSelectError?.message ?? "not found"
      }`
    );
  }

  // 3. Invitation path — user is joining an existing organization.
  if (opts.joinOrgId) {
    const joinOrgId = opts.joinOrgId;

    // Validate org exists.
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("id", joinOrgId)
      .maybeSingle();

    if (orgError) {
      throw new Error(
        `Failed to validate joinOrgId ${joinOrgId}: ${orgError.message}`
      );
    }
    if (!org) {
      throw new Error("Invalid joinOrgId");
    }

    // Insert membership only if the row doesn't already exist.
    const { data: existingMember, error: memberSelectError } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", joinOrgId)
      .eq("user_id", userId)
      .maybeSingle();

    if (memberSelectError) {
      console.error(
        `[provisionUserAccount] Failed to check existing membership for user ${userId} in org ${joinOrgId}:`,
        memberSelectError
      );
    }

    if (!existingMember) {
      const { error: memberInsertError } = await supabase
        .from("organization_members")
        .insert({
          organization_id: joinOrgId,
          user_id: userId,
          role: "member",
          joined_at: new Date().toISOString(),
        });

      if (memberInsertError) {
        console.error(
          `[provisionUserAccount] Failed to insert organization_members for user ${userId} in org ${joinOrgId}:`,
          memberInsertError
        );
      }
    }

    // Always set this org as the current one for the user.
    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({ current_organization_id: joinOrgId })
      .eq("id", userId);

    if (profileUpdateError) {
      console.error(
        `[provisionUserAccount] Failed to set current_organization_id=${joinOrgId} for user ${userId}:`,
        profileUpdateError
      );
    }

    return {
      profileId: userId,
      organizationId: joinOrgId,
      wasNewOrg: false,
    };
  }

  // 4. Returning user — already has a current organization. No-op.
  if (profile.current_organization_id) {
    return {
      profileId: userId,
      organizationId: profile.current_organization_id,
      wasNewOrg: false,
    };
  }

  // 5. Fresh signup — create a personal org.
  const firstName = deriveFirstName(fullName, email);
  const orgName = `${firstName}'s Grup`;

  const { data: newOrg, error: orgInsertError } = await supabase
    .from("organizations")
    .insert({
      name: orgName,
      owner_id: userId,
      plan: "free",
      minutes_per_month: 60,
      minutes_used_this_period: 0,
      max_members: 1,
      subscription_status: null,
    })
    .select("id")
    .single();

  if (orgInsertError || !newOrg) {
    console.error(
      `[provisionUserAccount] Failed to create personal organization for user ${userId}:`,
      orgInsertError
    );
    // Profile exists; next sign-in will retry. Surface a generic id so the
    // caller can decide what to do — but we return a result rather than throw
    // so the welcome email/etc still has a chance to run on retry.
    throw new Error(
      `Failed to create personal organization for user ${userId}: ${
        orgInsertError?.message ?? "no row returned"
      }`
    );
  }

  const newOrgId = newOrg.id as string;

  // 6. Insert ownership membership.
  const { error: memberInsertError } = await supabase
    .from("organization_members")
    .insert({
      organization_id: newOrgId,
      user_id: userId,
      role: "owner",
      joined_at: new Date().toISOString(),
    });

  if (memberInsertError) {
    console.error(
      `[provisionUserAccount] Failed to insert owner membership for user ${userId} in new org ${newOrgId}:`,
      memberInsertError
    );
  }

  // 7. Point profile at the new org.
  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({ current_organization_id: newOrgId })
    .eq("id", userId);

  if (profileUpdateError) {
    console.error(
      `[provisionUserAccount] Failed to set current_organization_id=${newOrgId} for user ${userId}:`,
      profileUpdateError
    );
  }

  return {
    profileId: userId,
    organizationId: newOrgId,
    wasNewOrg: true,
  };
}

/**
 * Derive the first name used in the personal org name. Preserves accents.
 * Falls back to the local part of the email if no full name is available.
 */
function deriveFirstName(fullName: string | null, email: string): string {
  if (fullName && fullName.trim().length > 0) {
    const [first] = fullName.trim().split(/\s+/);
    if (first) return first;
  }
  const localPart = (email ?? "").split("@")[0] ?? "";
  return localPart || "User";
}

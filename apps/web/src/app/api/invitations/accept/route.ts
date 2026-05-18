import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

async function getSessionClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
}

// ---------------------------------------------------------------------------
// POST /api/invitations/accept
// Body: { token: string }
// Consumes an invitation for the currently logged-in user. Does NOT modify
// the user's `profiles.current_organization_id` — the active org stays put.
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const sessionClient = await getSessionClient();
    const {
      data: { user },
      error: authError,
    } = await sessionClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";

    if (!token) {
      return NextResponse.json(
        { reason: "not_found" },
        { status: 410 }
      );
    }

    const service = getServiceClient();

    const { data: invite, error: inviteError } = await service
      .from("email_invitations")
      .select(
        "id, organization_id, role, expires_at, used_at, organizations:organization_id(id, name, max_members)"
      )
      .eq("token", token)
      .maybeSingle();

    if (inviteError || !invite) {
      return NextResponse.json({ reason: "not_found" }, { status: 410 });
    }

    if (invite.used_at) {
      return NextResponse.json({ reason: "used" }, { status: 410 });
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ reason: "expired" }, { status: 410 });
    }

    // Already a member?
    const { data: existingMember } = await service
      .from("organization_members")
      .select("id")
      .eq("organization_id", invite.organization_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json(
        { error: "You are already a member of this organization" },
        { status: 409 }
      );
    }

    const orgRel = Array.isArray(invite.organizations)
      ? invite.organizations[0]
      : invite.organizations;

    const maxMembers = orgRel?.max_members ?? 0;
    if (maxMembers > 0) {
      const { count: memberCount } = await service
        .from("organization_members")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", invite.organization_id);

      if ((memberCount ?? 0) + 1 > maxMembers) {
        return NextResponse.json(
          { error: "Organization is at capacity" },
          { status: 409 }
        );
      }
    }

    const role = invite.role === "admin" ? "admin" : "member";

    const { error: insertError } = await service
      .from("organization_members")
      .insert({
        organization_id: invite.organization_id,
        user_id: user.id,
        role,
        joined_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Error adding member:", insertError);
      return NextResponse.json(
        { error: "Failed to join organization" },
        { status: 500 }
      );
    }

    const { error: updateInviteError } = await service
      .from("email_invitations")
      .update({
        used_at: new Date().toISOString(),
        used_by: user.id,
      })
      .eq("id", invite.id);

    if (updateInviteError) {
      console.error("Error marking invitation used:", updateInviteError);
      // Membership is created; do not unwind it. Continue.
    }

    return NextResponse.json({
      organizationId: invite.organization_id,
      organizationName: orgRel?.name ?? null,
      role,
    });
  } catch (error) {
    console.error("POST /api/invitations/accept error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

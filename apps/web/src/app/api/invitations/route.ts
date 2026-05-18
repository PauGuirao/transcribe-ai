import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { mailerooService } from "@/lib/maileroo";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVITE_EXPIRY_DAYS = 7;

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
// POST /api/invitations
// Body: { email: string, role?: 'member' | 'admin' }
// Creates a pending invitation for the caller's active organization.
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
    const rawEmail = typeof body?.email === "string" ? body.email : "";
    const email = rawEmail.trim().toLowerCase();
    const role: "member" | "admin" =
      body?.role === "admin" ? "admin" : "member";

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { error: "A valid email is required" },
        { status: 400 }
      );
    }

    const service = getServiceClient();

    // Caller's active organization
    const { data: profile, error: profileError } = await service
      .from("profiles")
      .select("current_organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.current_organization_id) {
      return NextResponse.json(
        { error: "No active organization found" },
        { status: 400 }
      );
    }

    const orgId = profile.current_organization_id as string;

    // Caller must be owner or admin in that org
    const { data: callerMember, error: memberError } = await service
      .from("organization_members")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .single();

    if (memberError || !callerMember) {
      return NextResponse.json(
        { error: "You are not a member of this organization" },
        { status: 403 }
      );
    }

    if (!["owner", "admin"].includes(callerMember.role)) {
      return NextResponse.json(
        { error: "Only owners and admins can invite members" },
        { status: 403 }
      );
    }

    // Capacity check: existing members + pending non-expired invites must fit
    const nowIso = new Date().toISOString();

    const [{ data: org, error: orgError }, memberCountRes, pendingInvitesRes] =
      await Promise.all([
        service
          .from("organizations")
          .select("id, name, image_url, max_members")
          .eq("id", orgId)
          .single(),
        service
          .from("organization_members")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId),
        service
          .from("email_invitations")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId)
          .is("used_at", null)
          .gt("expires_at", nowIso),
      ]);

    if (orgError || !org) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const memberCount = memberCountRes.count ?? 0;
    const pendingCount = pendingInvitesRes.count ?? 0;
    const maxMembers = org.max_members ?? 0;

    if (maxMembers > 0 && memberCount + pendingCount >= maxMembers) {
      return NextResponse.json(
        { error: "Organization is at capacity" },
        { status: 409 }
      );
    }

    const token = randomUUID();
    const expiresAt = new Date(
      Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    );

    const { error: insertError } = await service
      .from("email_invitations")
      .insert({
        organization_id: orgId,
        email,
        token,
        role,
        created_by: user.id,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error("Error creating invitation:", insertError);
      return NextResponse.json(
        { error: "Failed to create invitation" },
        { status: 500 }
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const inviteUrl = `${baseUrl}/invite/${token}`;

    // Best-effort email send. Don't fail the request if email delivery fails.
    try {
      const inviterName =
        (user.user_metadata?.full_name as string | undefined) ||
        user.email?.split("@")[0] ||
        undefined;
      await mailerooService.sendInvitationEmail(
        email,
        inviteUrl,
        org.name ?? "",
        inviterName
      );
    } catch (mailError) {
      console.warn("Invitation email could not be sent:", mailError);
    }

    return NextResponse.json({
      token,
      inviteUrl,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("POST /api/invitations error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// GET /api/invitations?token=<token>
// Public read used by the /invite/[token] page to preview an invitation.
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token")?.trim();
    if (!token) {
      return NextResponse.json(
        { valid: false, reason: "not_found" },
        { status: 200 }
      );
    }

    const service = getServiceClient();

    const { data: invite, error } = await service
      .from("email_invitations")
      .select(
        "organization_id, role, expires_at, used_at, created_by, organizations:organization_id(id, name, image_url)"
      )
      .eq("token", token)
      .maybeSingle();

    if (error) {
      console.error("Error reading invitation:", error);
      return NextResponse.json(
        { valid: false, reason: "not_found" },
        { status: 200 }
      );
    }

    if (!invite) {
      return NextResponse.json({ valid: false, reason: "not_found" });
    }

    if (invite.used_at) {
      return NextResponse.json({ valid: false, reason: "used" });
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, reason: "expired" });
    }

    // Resolve inviter display name (best-effort)
    let inviterName: string | null = null;
    if (invite.created_by) {
      const { data: inviterProfile } = await service
        .from("profiles")
        .select("full_name, email")
        .eq("id", invite.created_by)
        .maybeSingle();
      if (inviterProfile) {
        inviterName =
          inviterProfile.full_name ||
          inviterProfile.email?.split("@")[0] ||
          null;
      }
    }

    const orgRel = Array.isArray(invite.organizations)
      ? invite.organizations[0]
      : invite.organizations;

    return NextResponse.json({
      valid: true,
      organizationId: invite.organization_id,
      organizationName: orgRel?.name ?? null,
      organizationImageUrl: orgRel?.image_url ?? null,
      inviterName,
      role: invite.role ?? "member",
      expiresAt: invite.expires_at,
    });
  } catch (error) {
    console.error("GET /api/invitations error:", error);
    return NextResponse.json(
      { valid: false, reason: "not_found" },
      { status: 200 }
    );
  }
}

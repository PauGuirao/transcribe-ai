import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { provisionUserAccount } from "@/lib/account-provisioning";
import { sendWelcomeEmailIfNeeded } from "@/lib/auth-callback-helpers";

const PENDING_INVITE_COOKIE = "pending_invite_token";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  const cookieStore = await cookies();

  // User-scoped client: only used to exchange the OAuth code for a session.
  const supabase = createServerClient(
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

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data?.user) {
    console.error("[auth/callback] exchangeCodeForSession failed:", error);
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  const user = data.user;

  // Service-role client: used for all provisioning / invitation work so that
  // RLS does not block the cross-table writes that happen before the user is
  // fully set up.
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // Inline-validate the pending invite token (set by /invite/[token] when the
  // visitor was not signed in). We mark it used here on success.
  let joinOrgId: string | undefined;
  const inviteToken = cookieStore.get(PENDING_INVITE_COOKIE)?.value;
  if (inviteToken) {
    try {
      const { data: invite, error: inviteError } = await serviceClient
        .from("email_invitations")
        .select("id, organization_id, email, used_at, expires_at")
        .eq("token", inviteToken)
        .maybeSingle();

      if (inviteError) {
        console.error(
          "[auth/callback] Failed to look up pending invite:",
          inviteError
        );
      } else if (
        invite &&
        !invite.used_at &&
        new Date(invite.expires_at) > new Date()
      ) {
        joinOrgId = invite.organization_id as string;

        const { error: markUsedError } = await serviceClient
          .from("email_invitations")
          .update({
            used_at: new Date().toISOString(),
            used_by: user.id,
          })
          .eq("id", invite.id);

        if (markUsedError) {
          console.error(
            "[auth/callback] Failed to mark invite as used:",
            markUsedError
          );
        }
      }
    } catch (err) {
      console.error("[auth/callback] Unexpected error processing invite:", err);
    } finally {
      // Always clear the cookie — regardless of success — so it doesn't leak
      // into a future sign-in attempt.
      cookieStore.set({
        name: PENDING_INVITE_COOKIE,
        value: "",
        maxAge: 0,
        path: "/",
      });
    }
  }

  // Single source of truth for provisioning.
  try {
    await provisionUserAccount(
      serviceClient,
      {
        id: user.id,
        email: user.email!,
        user_metadata: user.user_metadata ?? null,
      },
      { joinOrgId }
    );
  } catch (err) {
    console.error("[auth/callback] provisionUserAccount failed:", err);
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  // Re-read the profile so we can hand a complete shape to the welcome-email
  // helper (which expects `welcome_sent`).
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("id, welcome_sent, current_organization_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) {
    await sendWelcomeEmailIfNeeded(serviceClient, user, profile);
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}

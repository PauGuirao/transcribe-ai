import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { 
  waitForProfileCreation, 
  createProfileFallback,
  sendWelcomeEmailIfNeeded,
  logAuthCallbackStart,
  logAuthSuccess,
  logAuthError,
  logNoAuthCode
} from "@/lib/auth-callback-helpers";
import { processInvitation, hasInvitationToken } from "@/lib/invitation-processor";
import { 
  determineRedirectAfterAuth, 
  createRedirectResponse, 
  createFallbackRedirect 
} from "@/lib/organization-redirect-handler";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  const cookieStore = await cookies();

  logAuthCallbackStart(request);

  if (code) {
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

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error("❌ Error exchanging code for session:", error);
        logAuthError(error, origin);
        return NextResponse.redirect(`${origin}/auth/auth-code-error`);
      }

      const { user } = data;
      console.log(`🔐 Session exchange successful for user: ${user.id}`);

      // Enhanced profile creation with fallback
      let existingProfile = await waitForProfileCreation(supabase, user.id);
      
      if (!existingProfile) {
        console.log(`🚨 Profile not found after retries, attempting fallback creation for user ${user.id}`);
        existingProfile = await createProfileFallback(supabase, user);
        
        if (!existingProfile) {
          console.error(`💥 Both profile wait and fallback creation failed for user ${user.id}`);
          logAuthError(new Error("Profile creation failed"), origin);
          return NextResponse.redirect(`${origin}/auth/auth-code-error`);
        }
      }

      // Send welcome email if needed
      await sendWelcomeEmailIfNeeded(supabase, user, existingProfile);

      // Process invitation if present
      const inviteToken = hasInvitationToken(cookieStore);
      if (inviteToken) {
        console.log(`Invitation token found: ${inviteToken}`);
        // Process invitation and redirect to team page
        return await processInvitation(supabase, user, inviteToken, cookieStore, origin);
      }

      // No invitation - determine redirect based on organization status
      const redirectDecision = await determineRedirectAfterAuth(supabase, user.id, origin);
      logAuthSuccess(redirectDecision.reason, redirectDecision.url, origin);
      return createRedirectResponse(redirectDecision);

    } catch (error) {
      console.error("💥 Unexpected error in auth callback:", error);
      logAuthError(error, origin);
      return NextResponse.redirect(`${origin}/auth/auth-code-error`);
    }
  }

  logNoAuthCode(requestUrl.searchParams, origin);
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}

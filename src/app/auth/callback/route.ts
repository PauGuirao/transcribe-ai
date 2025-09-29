import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  waitForProfileCreation,
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
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  
  // Log the callback start
  logAuthCallbackStart(request);

  if (code) {
    const cookieStore = await cookies();
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

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Get the authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Wait for profile creation and handle welcome email
        const profile = await waitForProfileCreation(supabase, user.id);
        
        if (!profile) {
          return NextResponse.redirect(`${origin}/auth/error?message=Profile creation failed`);
        }
        
        console.log(`Profile found for user ${user.id}:`, profile);
        
        // Send welcome email if needed
        await sendWelcomeEmailIfNeeded(supabase, user, profile);
        
        // Check for invitation token
        const inviteToken = hasInvitationToken(cookieStore);
        
        if (inviteToken) {
          // Process invitation and redirect to team page
          return await processInvitation(supabase, user, inviteToken, cookieStore, origin);
        }
        
        // No invitation - determine redirect based on organization status
        const redirectDecision = await determineRedirectAfterAuth(supabase, user.id, origin);
        logAuthSuccess(redirectDecision.reason, redirectDecision.url, origin);
        return createRedirectResponse(redirectDecision);
      }
      
      // Fallback to dashboard if we can't get user info
      logAuthSuccess("fallback", `${origin}/dashboard`, origin);
      return createFallbackRedirect(origin);
    }

    // If there's an error with the code exchange, redirect to error page
    logAuthError(error, origin);
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  // No code parameter - this shouldn't happen in normal OAuth flow
  logNoAuthCode(searchParams, origin);
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}

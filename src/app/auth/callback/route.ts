import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { mailerooService } from "@/lib/maileroo";
import { apiCache } from "@/lib/cache";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  
  // Enhanced logging for production debugging
  const logData = {
    timestamp: new Date().toISOString(),
    url: request.url,
    code: code ? `present (${code.substring(0, 10)}...)` : "missing",
    origin,
    allParams: Object.fromEntries(searchParams.entries()),
    userAgent: request.headers.get('user-agent'),
    referer: request.headers.get('referer')
  };
  
  console.log("=== AUTH CALLBACK ROUTE HIT ===");
  console.log(JSON.stringify(logData, null, 2));

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

        // Wait for the database trigger to complete profile creation
        let existingProfile = null;
        let retryCount = 0;
        const maxRetries = 5;
        
        while (!existingProfile && retryCount < maxRetries) {
          const { data } = await supabase
            .from("profiles")
            .select("id, welcome_sent, current_organization_id")
            .eq("id", user.id)
            .single();
          
          existingProfile = data;
          
          if (!existingProfile) {
            console.log(`Profile not found for user ${user.id}, waiting... (attempt ${retryCount + 1})`);
            // Wait a bit for the database trigger to complete
            await new Promise(resolve => setTimeout(resolve, 500));
            retryCount++;
          }
        }
        
        if (!existingProfile) {
          console.error(`Profile creation failed for user ${user.id} after ${maxRetries} attempts`);
          return NextResponse.redirect(`${origin}/auth/error?message=Profile creation failed`);
        }
        
        console.log(`Profile found for user ${user.id}:`, existingProfile);
        
        // if welcome_sent is false send email
        const isNewUser = !existingProfile?.welcome_sent;
        // Send welcome email for new users
        if (isNewUser) {
          try {
            await mailerooService.sendWelcomeEmail(
              user.email!,
              user.user_metadata?.full_name || user.email!.split('@')[0]
            );
            console.log(`Welcome email sent to ${user.email}`);
            // Update welcome_sent to true after successful email send
            await supabase
              .from("profiles")
              .update({ welcome_sent: true })
              .eq("id", user.id);
          } catch (emailError) {
            console.error("Failed to send welcome email:", emailError);
            // Don't fail the auth flow if email fails
          }
        }
        
        // Check for invitation token in cookies (set by the signin page)
        const inviteToken = cookieStore.get('invite_token')?.value;
        
        if (inviteToken) {
          console.log(`Found invite token: ${inviteToken}`);
          // This is an invitation flow - handle joining the organization
          let invitationProcessed = false;
          
          try {
            // First try the new secure email_invitations table
            const { data: emailInviteData, error: emailInviteError } = await supabase
              .from("email_invitations")
              .select("organization_id, email, expires_at, used_at")
              .eq("token", inviteToken)
              .single();

            let inviteData = null;
            let isSecureInvite = false;

            if (!emailInviteError && emailInviteData) {
              console.log(`Valid secure email invitation found for token: ${inviteToken}`);
              // This is a secure email invitation
              isSecureInvite = true;
              
              // Check if invitation is expired
              if (new Date(emailInviteData.expires_at) < new Date()) {
                console.log("Email invitation expired");
                // Clear the invitation token cookie and redirect to invite page with error
                cookieStore.set('invite_token', '', { maxAge: 0 });
                return NextResponse.redirect(`${origin}/invite/${inviteToken}?error=expired`);
              }

              // Check if invitation is already used
              if (emailInviteData.used_at) {
                console.log("Email invitation already used");
                // Clear the invitation token cookie and redirect to invite page with error
                cookieStore.set('invite_token', '', { maxAge: 0 });
                return NextResponse.redirect(`${origin}/invite/${inviteToken}?error=used`);
              }

              // Check if user email matches invitation email
              if (user.email !== emailInviteData.email) {
                console.log("Email mismatch for invitation");
                // Clear the invitation token cookie and redirect to invite page with error
                cookieStore.set('invite_token', '', { maxAge: 0 });
                return NextResponse.redirect(`${origin}/invite/${inviteToken}?error=email_mismatch`);
              }

              inviteData = { organization_id: emailInviteData.organization_id };
              console.log(`Invitation data: ${JSON.stringify(inviteData)}`);
            } else {
              // Fallback to old invitations table for backward compatibility
              console.log(`No secure email invitation found for token: ${inviteToken}, checking old invitations table`);
              const { data: oldInviteData, error: oldInviteError } = await supabase
                .from("invitations")
                .select("organization_id")
                .eq("token", inviteToken)
                .single();

              if (!oldInviteError && oldInviteData) {
                inviteData = oldInviteData;
                console.log(`Fallback invitation data: ${JSON.stringify(inviteData)}`);
              } else {
                console.log(`No fallback invitation found for token: ${inviteToken}`);
              }
            }

            if (inviteData) {
              // Check if user is already a member of this organization
              const { data: existingMember } = await supabase
                .from("organization_members")
                .select("id")
                .eq("organization_id", inviteData.organization_id)
                .eq("user_id", user.id)
                .single();

              if (!existingMember) {
                // Get user's current auto-created organization (if any) before joining the new one
                const { data: currentProfile } = await supabase
                  .from("profiles")
                  .select("current_organization_id")
                  .eq("id", user.id)
                  .single();

                const autoCreatedOrgId = currentProfile?.current_organization_id;

                // Add user to organization as a member
                console.log(`Joining organization ${inviteData.organization_id} as member`);
                const { error: insertError } = await supabase
                  .from("organization_members")
                  .insert({
                    organization_id: inviteData.organization_id,
                    user_id: user.id,
                    role: "member",
                    joined_at: new Date().toISOString()
                  });

                if (!insertError) {
                  // Update user's current organization to the invited one
                  await supabase
                    .from("profiles")
                    .update({ current_organization_id: inviteData.organization_id })
                    .eq("id", user.id);

                  // If this is a secure email invitation, mark it as used
                  if (isSecureInvite) {
                    await supabase
                      .from("email_invitations")
                      .update({ used_at: new Date().toISOString() })
                      .eq("token", inviteToken);
                  }

                  // Invalidate relevant caches to ensure immediate updates
                  apiCache.invalidateByPrefix(`members:${inviteData.organization_id}`);
                  apiCache.invalidateByPrefix(`profile:${user.id}`);
                  apiCache.invalidateByPrefix(`org:${inviteData.organization_id}`);

                  // Clean up the auto-created organization if it exists and is different from the invited one
                  if (autoCreatedOrgId && autoCreatedOrgId !== inviteData.organization_id) {
                    try {
                      // Check if this organization was auto-created (has default name and only this user as owner)
                      const { data: autoOrg } = await supabase
                        .from("organizations")
                        .select("name, owner_id")
                        .eq("id", autoCreatedOrgId)
                        .eq("owner_id", user.id)
                        .single();

                      if (autoOrg && (autoOrg.name === "test")) {
                        // Check if this user is the only member
                        const { data: members } = await supabase
                          .from("organization_members")
                          .select("id")
                          .eq("organization_id", autoCreatedOrgId);

                        if (members && members.length <= 1) {
                          // Safe to delete - remove organization member record first
                          await supabase
                            .from("organization_members")
                            .delete()
                            .eq("organization_id", autoCreatedOrgId);

                          // Then delete the organization
                          await supabase
                            .from("organizations")
                            .delete()
                            .eq("id", autoCreatedOrgId);

                          console.log(`Cleaned up auto-created organization ${autoCreatedOrgId} for user ${user.id}`);
                        }
                      }
                    } catch (cleanupError) {
                      console.error("Error cleaning up auto-created organization:", cleanupError);
                      // Don't fail the invitation process if cleanup fails
                    }
                  }

                  invitationProcessed = true;
                  console.log(`Successfully processed invitation for user ${user.id} to join organization ${inviteData.organization_id}`);
                } else {
                  console.error("Failed to add user to organization:", insertError);
                }
              } else {
                // User is already a member, still consider this as processed
                invitationProcessed = true;
                console.log(`User ${user.id} is already a member of organization ${inviteData.organization_id}`);
              }
            }
          } catch (error) {
            console.error("Error processing invitation:", error);
          }
          
          // Clear the invitation token cookie
          cookieStore.set('invite_token', '', { maxAge: 0 });
          
          // Always redirect to team page for invitation flows, regardless of success/failure
          // This prevents users from being redirected to organization setup page
          return NextResponse.redirect(`${origin}/team`);
        }
        
        // No invitation - handle normal redirect logic
        // Check if user has an organization and get organization details
        const { data: userOrg } = await supabase
          .from("profiles")
          .select(`
            current_organization_id,
            organizations!current_organization_id (
              id,
              name
            )
          `)
          .eq("id", user.id)
          .single();
        if (userOrg?.current_organization_id && userOrg.organizations) {
          const orgData = Array.isArray(userOrg.organizations) ? userOrg.organizations[0] : userOrg.organizations;
          const orgName = orgData?.name;
          // Check if organization has default name that needs to be changed
          if (orgName === "test") {
            // User needs to set up organization name
            return NextResponse.redirect(`${origin}/organization`);
          } else {
            // User has a proper organization name, redirect to dashboard
            return NextResponse.redirect(`${origin}/dashboard`);
          }
        } else {
          // User needs to set up organization
          return NextResponse.redirect(`${origin}/organization`);
        }
      }
      
      // Fallback to dashboard if we can't get user info
      const redirectUrl = `${origin}/dashboard`;
      console.log("=== AUTH SUCCESS (FALLBACK) ===");
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        action: "successful_redirect_fallback",
        redirectUrl,
        origin
      }, null, 2));
      return NextResponse.redirect(redirectUrl);
    }

    console.log("=== AUTH ERROR ===");
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      action: "auth_error",
      error: error.message,
      errorCode: error.status,
      redirectUrl: `${origin}/auth/auth-code-error`
    }, null, 2));
    // If there's an error with the code exchange, redirect to error page
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  // No code parameter - this shouldn't happen in normal OAuth flow
  console.log("=== NO AUTH CODE ===");
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    action: "no_code_redirect",
    redirectUrl: `${origin}/auth/auth-code-error`,
    searchParams: Object.fromEntries(searchParams.entries())
  }, null, 2));
  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}

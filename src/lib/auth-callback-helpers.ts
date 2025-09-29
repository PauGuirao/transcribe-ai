import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { SupabaseClient } from '@supabase/supabase-js';
import { mailerooService } from "@/lib/maileroo";
import { apiCache } from "@/lib/cache";

export type AuthProfile = {
  id: string;
  welcome_sent: boolean;
  current_organization_id: string | null;
};

export type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
  };
};

// Types for better type safety
export interface AuthCallbackContext {
  supabase: ReturnType<typeof createServerClient>;
  user: any;
  origin: string;
  cookieStore: any;
}

export interface ProfileData {
  id: string;
  welcome_sent: boolean;
  current_organization_id: string | null;
}

export interface InvitationData {
  organization_id: string;
  email?: string;
  expires_at?: string;
  used_at?: string;
}

export interface OrganizationData {
  id: string;
  name: string;
  owner_id?: string;
}

// Profile creation and validation helpers
export async function waitForProfileCreation(
  supabase: any,
  userId: string,
  maxRetries: number = 8
): Promise<ProfileData | null> {
  let existingProfile = null;
  let retryCount = 0;
  
  // Exponential backoff delays: 100ms, 200ms, 400ms, 800ms, 1600ms, 3200ms, 6400ms, 12800ms
  const getDelay = (attempt: number) => Math.min(100 * Math.pow(2, attempt), 5000);
  
  console.log(`🔍 Starting profile creation wait for user ${userId}`);
  
  while (!existingProfile && retryCount < maxRetries) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, welcome_sent, current_organization_id, email, full_name")
        .eq("id", userId)
        .single();
      
      if (error) {
        console.log(`⚠️ Profile query error for user ${userId} (attempt ${retryCount + 1}): ${error.message}`);
      }
      
      existingProfile = data;
      
      if (!existingProfile) {
        const delay = getDelay(retryCount);
        console.log(`⏳ Profile not found for user ${userId}, waiting ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        retryCount++;
      } else {
        console.log(`✅ Profile found for user ${userId} after ${retryCount + 1} attempts`);
      }
    } catch (error) {
      console.error(`💥 Unexpected error checking profile for user ${userId}:`, error);
      const delay = getDelay(retryCount);
      await new Promise(resolve => setTimeout(resolve, delay));
      retryCount++;
    }
  }
  
  if (!existingProfile) {
    console.error(`❌ Profile creation failed for user ${userId} after ${maxRetries} attempts`);
  }
  
  return existingProfile;
}

// Fallback profile creation function
export async function createProfileFallback(
  supabase: any,
  user: AuthUser
): Promise<ProfileData | null> {
  console.log(`🛠️ Attempting fallback profile creation for user ${user.id}`);
  
  try {
    const userName = user.user_metadata?.full_name || 
                    user.email?.split('@')[0] || 
                    'User';
    
    // Create profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email,
        tokens: 2,
        plan_type: 'Gratis',
        full_name: userName,
        welcome_sent: false
      })
      .select("id, welcome_sent, current_organization_id")
      .single();
    
    if (profileError) {
      console.error(`❌ Fallback profile creation failed:`, profileError);
      return null;
    }
    
    console.log(`✅ Fallback profile created successfully for user ${user.id}`);
    
    // Create organization
    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: 'test',
        owner_id: user.id,
        plan_type: 'individual',
        max_members: 1,
        subscription_status: 'inactive',
        settings: {}
      })
      .select("id")
      .single();
    
    if (orgError) {
      console.error(`⚠️ Fallback organization creation failed:`, orgError);
      // Profile exists, continue without organization
      return profile;
    }
    
    // Create organization member record
    const { error: memberError } = await supabase
      .from("organization_members")
      .insert({
        organization_id: organization.id,
        user_id: user.id,
        role: 'owner',
        joined_at: new Date().toISOString()
      });
    
    if (memberError) {
      console.error(`⚠️ Fallback organization member creation failed:`, memberError);
    }
    
    // Update profile with organization
    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update({ current_organization_id: organization.id })
      .eq("id", user.id)
      .select("id, welcome_sent, current_organization_id")
      .single();
    
    if (updateError) {
      console.error(`⚠️ Fallback profile organization update failed:`, updateError);
      return profile; // Return original profile
    }
    
    console.log(`✅ Fallback profile setup completed for user ${user.id}`);
    return updatedProfile || profile;
    
  } catch (error) {
    console.error(`💥 Fallback profile creation failed for user ${user.id}:`, error);
    return null;
  }
}

export async function sendWelcomeEmailIfNeeded(
  supabase: any,
  user: any,
  profile: ProfileData
): Promise<void> {
  const isNewUser = !profile.welcome_sent;
  
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
}

// Invitation processing helpers
export async function findInvitationByToken(
  supabase: any,
  token: string
): Promise<{ data: InvitationData | null; isSecure: boolean }> {
  // First try the new secure email_invitations table
  const { data: emailInviteData, error: emailInviteError } = await supabase
    .from("email_invitations")
    .select("organization_id, email, expires_at, used_at")
    .eq("token", token)
    .single();

  if (!emailInviteError && emailInviteData) {
    console.log(`Valid secure email invitation found for token: ${token}`);
    return { data: emailInviteData, isSecure: true };
  }

  // Fallback to old invitations table for backward compatibility
  console.log(`No secure email invitation found for token: ${token}, checking old invitations table`);
  const { data: oldInviteData, error: oldInviteError } = await supabase
    .from("invitations")
    .select("organization_id")
    .eq("token", token)
    .single();

  if (!oldInviteError && oldInviteData) {
    console.log(`Fallback invitation data: ${JSON.stringify(oldInviteData)}`);
    return { data: oldInviteData, isSecure: false };
  }

  console.log(`No invitation found for token: ${token}`);
  return { data: null, isSecure: false };
}

export function validateSecureInvitation(
  inviteData: InvitationData,
  userEmail: string
): { isValid: boolean; error?: string } {
  // Check if invitation is expired
  if (inviteData.expires_at && new Date(inviteData.expires_at) < new Date()) {
    console.log("Email invitation expired");
    return { isValid: false, error: "expired" };
  }

  // Check if invitation is already used
  if (inviteData.used_at) {
    console.log("Email invitation already used");
    return { isValid: false, error: "used" };
  }

  // Check if user email matches invitation email
  if (inviteData.email && userEmail !== inviteData.email) {
    console.log("Email mismatch for invitation");
    return { isValid: false, error: "email_mismatch" };
  }

  return { isValid: true };
}

export async function addUserToOrganization(
  supabase: any,
  userId: string,
  organizationId: string
): Promise<boolean> {
  // Check if user is already a member of this organization
  const { data: existingMember } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .single();

  if (existingMember) {
    console.log(`User ${userId} is already a member of organization ${organizationId}`);
    return true;
  }

  // Add user to organization as a member
  console.log(`Joining organization ${organizationId} as member`);
  const { error: insertError } = await supabase
    .from("organization_members")
    .insert({
      organization_id: organizationId,
      user_id: userId,
      role: "member",
      joined_at: new Date().toISOString()
    });

  if (insertError) {
    console.error("Failed to add user to organization:", insertError);
    return false;
  }

  // Update user's current organization to the invited one
  await supabase
    .from("profiles")
    .update({ current_organization_id: organizationId })
    .eq("id", userId);

  return true;
}

export async function markInvitationAsUsed(
  supabase: any,
  token: string,
  isSecure: boolean
): Promise<void> {
  if (isSecure) {
    await supabase
      .from("email_invitations")
      .update({ used_at: new Date().toISOString() })
      .eq("token", token);
  }
}

export function invalidateRelevantCaches(organizationId: string, userId: string): void {
  apiCache.invalidateByPrefix(`members:${organizationId}`);
  apiCache.invalidateByPrefix(`profile:${userId}`);
  apiCache.invalidateByPrefix(`org:${organizationId}`);
}

// Organization management helpers
export async function cleanupAutoCreatedOrganization(
  supabase: any,
  organizationId: string,
  userId: string,
  newOrganizationId: string
): Promise<void> {
  if (!organizationId || organizationId === newOrganizationId) {
    return;
  }

  try {
    // Check if this organization was auto-created (has default name and only this user as owner)
    const { data: autoOrg } = await supabase
      .from("organizations")
      .select("name, owner_id")
      .eq("id", organizationId)
      .eq("owner_id", userId)
      .single();

    if (autoOrg && autoOrg.name === "test") {
      // Check if this user is the only member
      const { data: members } = await supabase
        .from("organization_members")
        .select("id")
        .eq("organization_id", organizationId);

      if (members && members.length <= 1) {
        // Safe to delete - remove organization member record first
        await supabase
          .from("organization_members")
          .delete()
          .eq("organization_id", organizationId);

        // Then delete the organization
        await supabase
          .from("organizations")
          .delete()
          .eq("id", organizationId);

        console.log(`Cleaned up auto-created organization ${organizationId} for user ${userId}`);
      }
    }
  } catch (cleanupError) {
    console.error("Error cleaning up auto-created organization:", cleanupError);
    // Don't fail the invitation process if cleanup fails
  }
}

export async function getUserOrganizationInfo(
  supabase: any,
  userId: string
): Promise<{ organizationId: string | null; organizationName: string | null }> {
  const { data: userOrg } = await supabase
    .from("profiles")
    .select(`
      current_organization_id,
      organizations!current_organization_id (
        id,
        name
      )
    `)
    .eq("id", userId)
    .single();

  if (userOrg?.current_organization_id && userOrg.organizations) {
    const orgData = Array.isArray(userOrg.organizations) 
      ? userOrg.organizations[0] 
      : userOrg.organizations;
    
    return {
      organizationId: userOrg.current_organization_id,
      organizationName: orgData?.name || null
    };
  }

  return { organizationId: null, organizationName: null };
}

// Logging helpers
export function logAuthCallbackStart(request: any): void {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  
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
}

export function logAuthSuccess(action: string, redirectUrl: string, origin: string): void {
  console.log(`=== AUTH SUCCESS (${action.toUpperCase()}) ===`);
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    action,
    redirectUrl,
    origin
  }, null, 2));
}

export function logAuthError(error: any, origin: string): void {
  console.log("=== AUTH ERROR ===");
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    action: "auth_error",
    error: error.message,
    errorCode: error.status,
    redirectUrl: `${origin}/auth/auth-code-error`
  }, null, 2));
}

export function logNoAuthCode(searchParams: URLSearchParams, origin: string): void {
  console.log("=== NO AUTH CODE ===");
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    action: "no_code_redirect",
    redirectUrl: `${origin}/auth/auth-code-error`,
    searchParams: Object.fromEntries(searchParams.entries())
  }, null, 2));
}
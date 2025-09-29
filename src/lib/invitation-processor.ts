import { NextResponse } from "next/server";
import {
  findInvitationByToken,
  validateSecureInvitation,
  addUserToOrganization,
  markInvitationAsUsed,
  invalidateRelevantCaches,
  cleanupAutoCreatedOrganization,
  type InvitationData
} from "./auth-callback-helpers";

export interface InvitationProcessResult {
  success: boolean;
  shouldRedirectToTeam: boolean;
  error?: string;
}

export async function processInvitation(
  supabase: any,
  user: any,
  inviteToken: string,
  cookieStore: any,
  origin: string
): Promise<NextResponse> {
  console.log(`Found invite token: ${inviteToken}`);
  
  try {
    // Find the invitation by token
    const { data: inviteData, isSecure } = await findInvitationByToken(supabase, inviteToken);
    
    if (!inviteData) {
      console.log(`No invitation found for token: ${inviteToken}`);
      cookieStore.set('invite_token', '', { maxAge: 0 });
      return NextResponse.redirect(`${origin}/team`);
    }

    // Validate secure invitation if applicable
    if (isSecure) {
      const validation = validateSecureInvitation(inviteData, user.email);
      if (!validation.isValid) {
        cookieStore.set('invite_token', '', { maxAge: 0 });
        return NextResponse.redirect(`${origin}/invite/${inviteToken}?error=${validation.error}`);
      }
    }

    // Get user's current organization before joining the new one
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("current_organization_id")
      .eq("id", user.id)
      .single();

    const autoCreatedOrgId = currentProfile?.current_organization_id;

    // Add user to the organization
    const joinSuccess = await addUserToOrganization(
      supabase,
      user.id,
      inviteData.organization_id
    );

    if (joinSuccess) {
      // Mark invitation as used if it's a secure invitation
      await markInvitationAsUsed(supabase, inviteToken, isSecure);

      // Invalidate relevant caches
      invalidateRelevantCaches(inviteData.organization_id, user.id);

      // Clean up auto-created organization if needed
      await cleanupAutoCreatedOrganization(
        supabase,
        autoCreatedOrgId,
        user.id,
        inviteData.organization_id
      );

      console.log(`Successfully processed invitation for user ${user.id} to join organization ${inviteData.organization_id}`);
    } else {
      console.error(`Failed to process invitation for user ${user.id}`);
    }

  } catch (error) {
    console.error("Error processing invitation:", error);
  }
  
  // Clear the invitation token cookie
  cookieStore.set('invite_token', '', { maxAge: 0 });
  
  // Always redirect to team page for invitation flows
  return NextResponse.redirect(`${origin}/team`);
}

export function hasInvitationToken(cookieStore: any): string | null {
  return cookieStore.get('invite_token')?.value || null;
}
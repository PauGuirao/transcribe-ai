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
  
  let inviteData: any = null;
  
  try {
    // Find the invitation by token
    const { data, isSecure } = await findInvitationByToken(supabase, inviteToken);
    inviteData = data;
    
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
      // Check if this organization was created from a group invitation and get user_tokens
      const { data: groupInvitation, error: groupInviteError } = await supabase
        .from("group_invitations")
        .select("user_tokens")
        .eq("created_organization_id", inviteData.organization_id)
        .single();

      // If group invitation found and has user_tokens, assign them to the user
      if (!groupInviteError && groupInvitation && groupInvitation.user_tokens && groupInvitation.user_tokens > 0) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ tokens: groupInvitation.user_tokens })
          .eq("id", user.id);

        if (profileError) {
          console.error("Error updating user tokens:", profileError);
        } else {
          console.log(`✅ Assigned ${groupInvitation.user_tokens} tokens to user ${user.id} from group invitation`);
        }
      }

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
  
  // Redirect to team page with welcome popup parameters for invitation flows
  if (inviteData?.organization_id) {
    return NextResponse.redirect(`${origin}/team?welcome=true&org=${encodeURIComponent(inviteData.organization_id)}`);
  } else {
    return NextResponse.redirect(`${origin}/team`);
  }
}

export function hasInvitationToken(cookieStore: any): string | null {
  return cookieStore.get('invite_token')?.value || null;
}

export function hasGroupInvitationToken(cookieStore: any): string | null {
  return cookieStore.get('group_invite_token')?.value || null;
}

export async function processGroupInvitation(
  supabase: any,
  user: any,
  groupInviteToken: string,
  cookieStore: any,
  origin: string
): Promise<NextResponse> {
  console.log(`Found group invite token: ${groupInviteToken}`);
  
  try {
    // Validate the group invitation token
    const { data: invitationData, error } = await supabase
      .from("group_invitations")
      .select(`
        id,
        email,
        organization_name,
        amount_paid,
        currency,
        payment_status,
        expires_at,
        is_used,
        stripe_customer_id,
        organization_settings,
        user_tokens,
        created_at
      `)
      .eq("token", groupInviteToken)
      .single();

    if (error || !invitationData) {
      console.log(error);
      console.log(`No group invitation found for token: ${groupInviteToken}`);
      cookieStore.set('group_invite_token', '', { maxAge: 0 });
      return NextResponse.redirect(`${origin}/dashboard`);
    }

    // Check if invitation is expired or already used
    if (invitationData.is_used || new Date() > new Date(invitationData.expires_at)) {
      console.log(`Group invitation is expired or already used: ${groupInviteToken}`);
      cookieStore.set('group_invite_token', '', { maxAge: 0 });
      return NextResponse.redirect(`${origin}/dashboard`);
    }

    // Check if user email matches invitation email
    console.log(`User email: ${user.email}`);
    console.log(`Invitation: ${JSON.stringify(invitationData)}`);
    if (user.email !== invitationData.email) {
      console.log(`User email ${user.email} doesn't match invitation email ${invitationData.email}`);
      cookieStore.set('group_invite_token', '', { maxAge: 0 });
      return NextResponse.redirect(`${origin}/dashboard`);
    }

    console.log(`Group invitation validated for user ${user.id}. Token will be processed in organization setup.`);

    // Don't clear the cookie yet - we need it in the organization page
    // The organization page will handle updating the organization and clearing the token

    // Redirect to organization setup with group setup flag
    return NextResponse.redirect(`${origin}/organization?group_setup=true`);

  } catch (error) {
    console.error("Error processing group invitation:", error);
    cookieStore.set('group_invite_token', '', { maxAge: 0 });
    return NextResponse.redirect(`${origin}/dashboard`);
  }
}
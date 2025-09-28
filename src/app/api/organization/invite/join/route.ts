import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { apiCache } from "@/lib/cache";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "No invitation token provided" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabaseClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    // Get the current user session
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate invitation token and get organization info
    // First check email_invitations table for secure invitations
    const { data: emailInviteData, error: emailInviteError } = await supabaseClient
      .from("email_invitations")
      .select("organization_id, email, expires_at, used_at")
      .eq("token", token)
      .single();

    let inviteData = null;
    let isEmailInvite = false;

    if (!emailInviteError && emailInviteData) {
      // This is an email-specific invitation
      isEmailInvite = true;
      
      // Check if invitation has expired
      if (new Date(emailInviteData.expires_at) < new Date()) {
        return NextResponse.json(
          { error: "This invitation has expired" },
          { status: 400 }
        );
      }

      // Check if invitation has already been used
      if (emailInviteData.used_at) {
        return NextResponse.json(
          { error: "This invitation has already been used" },
          { status: 400 }
        );
      }

      // Validate that the user's email matches the invited email
      if (user.email !== emailInviteData.email) {
        return NextResponse.json(
          { error: `This invitation is for ${emailInviteData.email}. Please sign in with the correct email address.` },
          { status: 403 }
        );
      }

      inviteData = { organization_id: emailInviteData.organization_id };
    } else {
      // Fallback to old invitations table for backward compatibility
      const { data: oldInviteData, error: oldInviteError } = await supabaseClient
        .from("invitations")
        .select("organization_id")
        .eq("token", token)
        .single();

      if (oldInviteError || !oldInviteData) {
        return NextResponse.json(
          { error: "Invalid or expired invitation token" },
          { status: 400 }
        );
      }

      inviteData = oldInviteData;
    }

    // Check if user is already a member of this organization
    const { data: existingMember, error: memberCheckError } = await supabaseClient
      .from("organization_members")
      .select("id")
      .eq("organization_id", inviteData.organization_id)
      .eq("user_id", user.id)
      .single();

    if (existingMember) {
      return NextResponse.json(
        { error: "You are already a member of this organization" },
        { status: 400 }
      );
    }

    // Get user's current auto-created organization (if any) before joining the new one
    const { data: currentProfile } = await supabaseClient
      .from("profiles")
      .select("current_organization_id")
      .eq("id", user.id)
      .single();

    const autoCreatedOrgId = currentProfile?.current_organization_id;

    // Add user to organization as a member
    const { error: insertError } = await supabaseClient
      .from("organization_members")
      .insert({
        organization_id: inviteData.organization_id,
        user_id: user.id,
        role: "member",
        joined_at: new Date().toISOString()
      });

    if (insertError) {
      console.error("Error adding user to organization:", insertError);
      return NextResponse.json(
        { error: "Failed to join organization" },
        { status: 500 }
      );
    }

    // Mark email invitation as used if it's an email invite
    if (isEmailInvite) {
      await supabaseClient
        .from("email_invitations")
        .update({ used_at: new Date().toISOString() })
        .eq("token", token);
    }

    // Update user's current organization
    const { error: profileUpdateError } = await supabaseClient
      .from("profiles")
      .update({ current_organization_id: inviteData.organization_id })
      .eq("id", user.id);

    if (profileUpdateError) {
      console.error("Error updating user profile:", profileUpdateError);
      // Don't fail the request if profile update fails, user is still added to org
    }

    // Invalidate relevant caches to ensure immediate updates
    apiCache.invalidateByPrefix(`members:${inviteData.organization_id}`);
    apiCache.invalidateByPrefix(`profile:${user.id}`);
    apiCache.invalidateByPrefix(`org:${inviteData.organization_id}`);

    // Clean up the auto-created organization if it exists and is different from the invited one
    if (autoCreatedOrgId && autoCreatedOrgId !== inviteData.organization_id) {
      try {
        // Check if this organization was auto-created (has default name and only this user as owner)
        const { data: autoOrg } = await supabaseClient
          .from("organizations")
          .select("name, owner_id")
          .eq("id", autoCreatedOrgId)
          .eq("owner_id", user.id)
          .single();

        if (autoOrg && (autoOrg.name === "test")) {
          // Check if this user is the only member
          const { data: members } = await supabaseClient
            .from("organization_members")
            .select("id")
            .eq("organization_id", autoCreatedOrgId);

          if (members && members.length <= 1) {
            // Safe to delete - remove organization member record first
            await supabaseClient
              .from("organization_members")
              .delete()
              .eq("organization_id", autoCreatedOrgId);

            // Then delete the organization
            await supabaseClient
              .from("organizations")
              .delete()
              .eq("id", autoCreatedOrgId);

            console.log(`Cleaned up auto-created organization ${autoCreatedOrgId} for user ${user.id}`);
          }
        }
      } catch (cleanupError) {
        console.error("Error cleaning up auto-created organization:", cleanupError);
        // Don't fail the main request if cleanup fails
      }
    }

    return NextResponse.json({
      success: true,
      message: "Successfully joined the organization!"
    });

  } catch (error) {
    console.error("Error in join organization API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
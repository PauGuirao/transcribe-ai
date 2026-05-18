import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { apiCache } from "@/lib/cache";

export async function POST(request: NextRequest) {
  console.log("=== ORGANIZATION INVITE JOIN API START ===");
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  try {
    const { token } = await request.json();
    console.log(`Received invitation token: ${token ? `${token.substring(0, 8)}...` : 'null'}`);

    if (!token) {
      console.log("❌ No invitation token provided");
      return NextResponse.json(
        { error: "No invitation token provided" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    console.log("🍪 Cookie store initialized");
    
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
    console.log("🔗 Supabase client created with service role");

    // Get the current user session
    console.log("👤 Getting current user session...");
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.log("❌ User authentication failed:", userError?.message || "No user found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    console.log(`✅ User authenticated: ${user.email} (ID: ${user.id})`);

    // Validate invitation token and get organization info
    // First check email_invitations table for secure invitations
    console.log("🔍 Checking email_invitations table for secure invitation...");
    const { data: emailInviteData, error: emailInviteError } = await supabaseClient
      .from("email_invitations")
      .select("organization_id, email, expires_at, used_at")
      .eq("token", token)
      .single();

    let inviteData = null;
    let isEmailInvite = false;

    if (!emailInviteError && emailInviteData) {
      console.log(`✅ Found secure email invitation for organization: ${emailInviteData.organization_id}`);
      console.log(`📧 Invitation email: ${emailInviteData.email}`);
      console.log(`⏰ Expires at: ${emailInviteData.expires_at}`);
      console.log(`🔄 Used at: ${emailInviteData.used_at || 'Not used yet'}`);
      
      // This is an email-specific invitation
      isEmailInvite = true;
      
      // Check if invitation has expired
      if (new Date(emailInviteData.expires_at) < new Date()) {
        console.log("❌ Email invitation has expired");
        return NextResponse.json(
          { error: "This invitation has expired" },
          { status: 400 }
        );
      }

      // Check if invitation has already been used
      if (emailInviteData.used_at) {
        console.log("❌ Email invitation has already been used");
        return NextResponse.json(
          { error: "This invitation has already been used" },
          { status: 400 }
        );
      }

      // Validate that the user's email matches the invited email
      if (user.email !== emailInviteData.email) {
        console.log(`❌ Email mismatch - User: ${user.email}, Invited: ${emailInviteData.email}`);
        return NextResponse.json(
          { error: `This invitation is for ${emailInviteData.email}. Please sign in with the correct email address.` },
          { status: 403 }
        );
      }
      
      console.log("✅ Email invitation validation passed");
      inviteData = { organization_id: emailInviteData.organization_id };
    } else {
      console.log("⚠️ No secure email invitation found, checking legacy invitations table...");
      console.log(`Email invite error: ${emailInviteError?.message || 'No error'}`);
      
      // Fallback to old invitations table for backward compatibility
      const { data: oldInviteData, error: oldInviteError } = await supabaseClient
        .from("invitations")
        .select("organization_id")
        .eq("token", token)
        .single();

      if (oldInviteError || !oldInviteData) {
        console.log("❌ No valid invitation found in legacy table either");
        console.log(`Legacy invite error: ${oldInviteError?.message || 'No data'}`);
        return NextResponse.json(
          { error: "Invalid or expired invitation token" },
          { status: 400 }
        );
      }
      
      console.log(`✅ Found legacy invitation for organization: ${oldInviteData.organization_id}`);
      inviteData = oldInviteData;
    }

    // Check if user is already a member of this organization
    console.log(`🔍 Checking if user is already a member of organization: ${inviteData.organization_id}`);
    const { data: existingMember, error: memberCheckError } = await supabaseClient
      .from("organization_members")
      .select("id")
      .eq("organization_id", inviteData.organization_id)
      .eq("user_id", user.id)
      .single();

    if (existingMember) {
      console.log("❌ User is already a member of this organization");
      return NextResponse.json(
        { error: "You are already a member of this organization" },
        { status: 400 }
      );
    }
    
    console.log("✅ User is not yet a member, proceeding with invitation");

    // Get user's current auto-created organization (if any) before joining the new one
    console.log("🔍 Getting user's current organization for cleanup purposes...");
    const { data: currentProfile } = await supabaseClient
      .from("profiles")
      .select("current_organization_id")
      .eq("id", user.id)
      .single();

    const autoCreatedOrgId = currentProfile?.current_organization_id;
    console.log(`Current organization ID: ${autoCreatedOrgId || 'None'}`);

    // Add user to organization as a member
    console.log(`➕ Adding user to organization ${inviteData.organization_id} as member...`);
    const { error: insertError } = await supabaseClient
      .from("organization_members")
      .insert({
        organization_id: inviteData.organization_id,
        user_id: user.id,
        role: "member",
        joined_at: new Date().toISOString()
      });

    if (insertError) {
      console.error("❌ Error adding user to organization:", insertError);
      return NextResponse.json(
        { error: "Failed to join organization" },
        { status: 500 }
      );
    }
    
    console.log("✅ Successfully added user to organization");

    // Mark email invitation as used if it's an email invite
    if (isEmailInvite) {
      console.log("📝 Marking email invitation as used...");
      await supabaseClient
        .from("email_invitations")
        .update({ used_at: new Date().toISOString() })
        .eq("token", token);
      console.log("✅ Email invitation marked as used");
    }

    // Update user's current organization
    console.log(`🔄 Updating user's current organization to: ${inviteData.organization_id}`);
    const { error: profileUpdateError } = await supabaseClient
      .from("profiles")
      .update({ current_organization_id: inviteData.organization_id })
      .eq("id", user.id);

    if (profileUpdateError) {
      console.error("⚠️ Error updating user profile:", profileUpdateError);
      // Don't fail the request if profile update fails, user is still added to org
    } else {
      console.log("✅ User profile updated successfully");
    }

    // Invalidate relevant caches to ensure immediate updates
    console.log("🗑️ Invalidating caches for immediate updates...");
    apiCache.invalidateByPrefix(`members:${inviteData.organization_id}`);
    apiCache.invalidateByPrefix(`profile:${user.id}`);
    apiCache.invalidateByPrefix(`org:${inviteData.organization_id}`);
    console.log("✅ Caches invalidated");

    // Clean up the auto-created organization if it exists and is different from the invited one
    if (autoCreatedOrgId && autoCreatedOrgId !== inviteData.organization_id) {
      console.log(`🧹 Attempting to clean up auto-created organization: ${autoCreatedOrgId}`);
      try {
        // Check if this organization was auto-created (has default name and only this user as owner)
        const { data: autoOrg } = await supabaseClient
          .from("organizations")
          .select("name, owner_id")
          .eq("id", autoCreatedOrgId)
          .eq("owner_id", user.id)
          .single();

        if (autoOrg && (autoOrg.name === "test")) {
          console.log(`Found auto-created organization with default name: ${autoOrg.name}`);
          
          // Check if this user is the only member
          const { data: members } = await supabaseClient
            .from("organization_members")
            .select("id")
            .eq("organization_id", autoCreatedOrgId);

          if (members && members.length <= 1) {
            console.log(`Organization has ${members.length} member(s), safe to delete`);
            
            // Safe to delete - remove organization member record first
            await supabaseClient
              .from("organization_members")
              .delete()
              .eq("organization_id", autoCreatedOrgId);
            console.log("✅ Removed organization member record");

            // Then delete the organization
            await supabaseClient
              .from("organizations")
              .delete()
              .eq("id", autoCreatedOrgId);

            console.log(`✅ Cleaned up auto-created organization ${autoCreatedOrgId} for user ${user.id}`);
          } else {
            console.log(`Organization has ${members?.length || 0} members, skipping cleanup`);
          }
        } else {
          console.log(`Organization is not auto-created (name: ${autoOrg?.name || 'unknown'}), skipping cleanup`);
        }
      } catch (cleanupError) {
        console.error("⚠️ Error cleaning up auto-created organization:", cleanupError);
        // Don't fail the main request if cleanup fails
      }
    } else {
      console.log("No auto-created organization cleanup needed");
    }

    console.log("🎉 Organization join process completed successfully");
    return NextResponse.json({
      success: true,
      message: "Successfully joined the organization!"
    });

  } catch (error) {
    console.error("💥 Error in join organization API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    console.log("=== ORGANIZATION INVITE JOIN API END ===");
    console.log(`End timestamp: ${new Date().toISOString()}`);
  }
}
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Get authenticated user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get group invitation details using admin client
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from("group_invitations")
      .select(`
        email,
        organization_name,
        amount_paid,
        currency,
        payment_status,
        expires_at,
        is_used,
        stripe_customer_id,
        organization_settings,
        user_tokens
      `)
      .eq("token", token)
      .single();

    if (invitationError || !invitation) {
      console.error("Error fetching group invitation:", invitationError);
      return NextResponse.json(
        { error: "Invitació no trobada o no vàlida" },
        { status: 404 }
      );
    }

    // Validate invitation
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);
    
    if (now > expiresAt) {
      return NextResponse.json(
        { error: "Aquesta invitació ha caducat" },
        { status: 400 }
      );
    }

    if (invitation.is_used) {
      return NextResponse.json(
        { error: "Aquesta invitació ja ha estat utilitzada" },
        { status: 400 }
      );
    }

    if (invitation.payment_status !== 'completed') {
      return NextResponse.json(
        { error: "El pagament per aquesta invitació no s'ha completat" },
        { status: 400 }
      );
    }

    // Verify user email matches invitation email
    if (user.email !== invitation.email) {
      return NextResponse.json(
        { error: `Aquesta invitació és per a ${invitation.email}. Si us plau, inicieu sessió amb el correu correcte.` },
        { status: 403 }
      );
    }

    // Parse organization settings
    let organizationSettings = {};
    try {
      organizationSettings = JSON.parse(invitation.organization_settings || '{}');
    } catch (e) {
      console.warn("Invalid organization settings JSON, using defaults");
    }

    // Create organization using admin client
    const { data: newOrganization, error: orgError } = await supabaseAdmin
      .from("organizations")
      .insert({
        name: invitation.organization_name,
        plan_type: 'group',
        max_members: 40,
        stripe_customer_id: invitation.stripe_customer_id,
        subscription_status: 'active',
        created_by: user.id,
        ...organizationSettings
      })
      .select()
      .single();

    if (orgError || !newOrganization) {
      console.error("Error creating organization:", orgError);
      return NextResponse.json(
        { error: "Error creant l'organització" },
        { status: 500 }
      );
    }

    // Update user profile to set the new organization and plan type
    const profileUpdates: any = {
      current_organization_id: newOrganization.id,
      plan_type: 'group'
    };

    // Add tokens if available from the invitation
    if (invitation.user_tokens && invitation.user_tokens > 0) {
      profileUpdates.tokens = invitation.user_tokens;
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update(profileUpdates)
      .eq("id", user.id);

    if (profileError) {
      console.error("Error updating user profile:", profileError);
      // Don't fail the request, but log the error
    }

    // Add user as admin member of the organization
    const { error: memberError } = await supabaseAdmin
      .from("organization_members")
      .insert({
        organization_id: newOrganization.id,
        user_id: user.id,
        role: 'admin'
      });

    if (memberError) {
      console.error("Error adding user to organization:", memberError);
      return NextResponse.json(
        { error: "Error afegint l'usuari a l'organització" },
        { status: 500 }
      );
    }

    // Mark invitation as used and link to created organization
    const { error: updateError } = await supabaseAdmin
      .from("group_invitations")
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
        created_organization_id: newOrganization.id
      })
      .eq("token", token);

    if (updateError) {
      console.error("Error marking invitation as used:", updateError);
      // Don't fail the request, but log the error
    }

    console.log("✅ Group invitation processed successfully:", {
      organizationId: newOrganization.id,
      organizationName: newOrganization.name,
      userId: user.id,
      userEmail: user.email
    });

    return NextResponse.json({
      success: true,
      organization: {
        id: newOrganization.id,
        name: newOrganization.name,
        plan_type: newOrganization.plan_type
      }
    });

  } catch (error) {
    console.error("Error processing group invitation:", error);
    return NextResponse.json(
      { error: "Error intern del servidor" },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { name, isGroupSetup, groupInvitationData } = await request.json();

    // Validate input
    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "El nombre de la organización es obligatorio" },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      return NextResponse.json(
        { error: "El nombre debe tener al menos 2 caracteres" },
        { status: 400 }
      );
    }

    if (trimmedName.length > 50) {
      return NextResponse.json(
        { error: "El nombre no puede tener más de 50 caracteres" },
        { status: 400 }
      );
    }

    // Create Supabase client
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

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Handle group setup flow
    if (isGroupSetup) {
      let invitationData;
      // Use provided invitation data if available, otherwise fetch from database
      if (groupInvitationData) {
        // 🔍 BREAKPOINT: Set breakpoint here to check provided invitation data
        console.log('🔍 [DEBUG] Using provided invitation data:', groupInvitationData);
        invitationData = groupInvitationData;
      } else {
        // Fallback: Get the group invitation token from cookies and fetch data
        const groupInviteToken = cookieStore.get('group_invite_token')?.value;
        
        // 🔍 BREAKPOINT: Set breakpoint here to check token retrieval
        console.log('🔍 [DEBUG] Group invite token from cookies:', groupInviteToken ? 'Found' : 'Not found');

        if (!groupInviteToken) {
          return NextResponse.json(
            { error: "No group invitation token found" },
            { status: 400 }
          );
        }

        // Validate the token using normal table query
        const { data: invitation, error: inviteError } = await supabase
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

        if (inviteError || !invitation) {
          console.error("Error validating group invitation token:", inviteError);
          return NextResponse.json(
            { error: "Invalid or expired invitation token" },
            { status: 400 }
          );
        }

        invitationData = invitation;
      }

      // Check if invitation is expired or used
      if (new Date(invitationData.expires_at) < new Date() || invitationData.is_used) {
        return NextResponse.json(
          { error: "Invitation has expired or already been used" },
          { status: 400 }
        );
      }

      // Check payment status
      if (invitationData.payment_status !== 'completed') {
        return NextResponse.json(
          { error: "Payment not completed for this invitation" },
          { status: 400 }
        );
      }

      // Update the user's organization with group plan data
      const { data: organization, error: updateError } = await supabase
        .from("organizations")
        .update({ 
          name: trimmedName,
          plan_type: 'group',
          max_members: 10,
          stripe_customer_id: invitationData.stripe_customer_id,
          subscription_status: 'active'
        })
        .eq("owner_id", user.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating organization:", updateError);
        return NextResponse.json(
          { error: "Error al actualizar la organización" },
          { status: 500 }
        );
      }

      if (!organization) {
        return NextResponse.json(
          { error: "Organización no encontrada" },
          { status: 404 }
        );
      }

      // Update user profile tokens with the tokens from group invitation
      if (invitationData.user_tokens && invitationData.user_tokens > 0) {
        const { error: tokenUpdateError } = await supabase
          .from("profiles")
          .update({ 
            tokens: invitationData.user_tokens 
          })
          .eq("id", user.id);

        if (tokenUpdateError) {
          console.error("Error updating user tokens:", tokenUpdateError);
        }
      }

      // Mark the invitation as used - get token from cookies if not provided
      const groupInviteToken = cookieStore.get('group_invite_token')?.value;
      
      if (groupInviteToken) {
        const { error: markUsedError } = await supabase.rpc('mark_group_invitation_as_used', {
          token_param: groupInviteToken,
          organization_id_param: organization.id
        });

        if (markUsedError) {
          console.error('Error marking group invitation as used:', markUsedError);
          return NextResponse.json(
            { error: 'Failed to mark invitation as used' },
            { status: 500 }
          );
        }

        // Clear the group invitation token cookie
        cookieStore.set('group_invite_token', '', { maxAge: 0 });
      }

      return NextResponse.json({
        success: true,
        organization: {
          id: organization.id,
          name: organization.name,
          plan_type: organization.plan_type,
        },
      });
    }

    // Regular organization setup (non-group)
    const { data: organization, error: updateError } = await supabase
      .from("organizations")
      .update({ name: trimmedName })
      .eq("owner_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating organization:", updateError);
      return NextResponse.json(
        { error: "Error al actualizar la organización" },
        { status: 500 }
      );
    }

    if (!organization) {
      return NextResponse.json(
        { error: "Organización no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      organization: {
        id: organization.id,
        name: organization.name,
      },
    });
  } catch (error) {
    console.error("Organization setup error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
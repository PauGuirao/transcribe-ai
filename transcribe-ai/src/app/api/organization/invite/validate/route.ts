import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { valid: false, error: "No invitation token provided" },
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

    // Check if email invitation token exists and is valid
    const { data: inviteData, error: inviteError } = await supabaseClient
      .from("email_invitations")
      .select(`
        email,
        organization_id,
        expires_at,
        used_at,
        organizations (
          id,
          name
        )
      `)
      .eq("token", token)
      .single();
      
    if (inviteError || !inviteData) {
      // Fallback: check old invitations table for backward compatibility
      const { data: oldInviteData, error: oldInviteError } = await supabaseClient
        .from("invitations")
        .select(`
          organization_id,
          organizations (
            id,
            name
          )
        `)
        .eq("token", token)
        .single();
        
      if (oldInviteError || !oldInviteData) {
        return NextResponse.json({
          valid: false,
          error: "Invalid or expired invitation token"
        });
      }
      
      // Handle old invitation format
      const orgData = oldInviteData.organizations as any;
      return NextResponse.json({
        valid: true,
        organization: {
          id: orgData.id,
          name: orgData.name
        },
        requiresEmail: false // Old format doesn't require email validation
      });
    }

    // Check if invitation has expired
    if (new Date(inviteData.expires_at) < new Date()) {
      return NextResponse.json({
        valid: false,
        error: "This invitation has expired"
      });
    }

    // Check if invitation has already been used
    if (inviteData.used_at) {
      return NextResponse.json({
        valid: false,
        error: "This invitation has already been used"
      });
    }

    // Handle the organizations data - it comes as an object from the join
    const orgData = inviteData.organizations as any;
    
    return NextResponse.json({
      valid: true,
      organization: {
        id: orgData.id,
        name: orgData.name
      },
      requiresEmail: true,
      invitedEmail: inviteData.email
    });

  } catch (error) {
    console.error("Error validating invite:", error);
    return NextResponse.json(
      { valid: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { mailerooService } from "@/lib/maileroo";
import { randomBytes } from "crypto";
import { QueryOptimizer, queryPerformanceAnalyzer } from "@/lib/query-optimizer";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
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

    // Get user's organization info
    const { data: profile } = await supabase
      .from("profiles")
      .select("current_organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.current_organization_id) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 400 }
      );
    }

    // Initialize query optimizer
    const queryOptimizer = new QueryOptimizer(supabase);
    const startTime = Date.now();

    // Use optimized invitation status check (combines membership and pending invitation checks)
    const invitationStatus = await queryOptimizer.checkUserInvitationStatus(
      email, 
      profile.current_organization_id
    );

    if (invitationStatus.membershipError || invitationStatus.invitationError) {
      console.error('Error checking invitation status:', {
        membershipError: invitationStatus.membershipError,
        invitationError: invitationStatus.invitationError
      });
      return NextResponse.json(
        { error: "Error checking user status" },
        { status: 500 }
      );
    }

    if (invitationStatus.isMember) {
      return NextResponse.json(
        { error: "Este usuario ya es miembro de la organización" },
        { status: 400 }
      );
    }

    if (invitationStatus.hasPendingInvitation) {
      return NextResponse.json(
        { error: "Ya hay una invitación pendiente para este correo electrónico" },
        { status: 400 }
      );
    }

    // Get organization details
    const { data: organization } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", profile.current_organization_id)
      .single();

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    // Generate unique token for this email invitation
    const token = randomBytes(32).toString('hex');

    // Create invitation record in database
    const { error: inviteError } = await supabase
      .from("email_invitations")
      .insert({
        token,
        email,
        organization_id: profile.current_organization_id,
        invited_by: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      });

    if (inviteError) {
      console.error("Error creating invitation:", inviteError);
      return NextResponse.json(
        { error: "Error al crear la invitación" },
        { status: 500 }
      );
    }

    // Create secure invitation URL with token
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;

    // Send invitation email
    await mailerooService.sendInvitationEmail(
      email,
      inviteUrl,
      organization.name,
      user.user_metadata?.full_name || user.email!.split('@')[0]
    );

    // Track query performance
    const queryTime = Date.now() - startTime;
    queryPerformanceAnalyzer.trackQuery('organization_invite_email', queryTime);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending invitation email:", error);
    return NextResponse.json(
      { error: "Error al enviar el correo de invitación" },
      { status: 500 }
    );
  }
}
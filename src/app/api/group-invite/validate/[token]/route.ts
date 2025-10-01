import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Get group invitation details
    const { data: invitation, error } = await supabase
      .from("group_invitations")
      .select(`
        email,
        organization_name,
        amount_paid,
        currency,
        payment_status,
        expires_at,
        is_used,
        created_at,
        stripe_customer_id
      `)
      .eq("token", token)
      .single();

    if (error || !invitation) {
      console.error("Error fetching group invitation:", error);
      return NextResponse.json(
        { error: "Invitació no trobada o no vàlida" },
        { status: 404 }
      );
    }

    // Check if invitation has expired
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);
    
    if (now > expiresAt) {
      return NextResponse.json(
        { error: "Aquesta invitació ha caducat" },
        { status: 400 }
      );
    }

    // Check if invitation has already been used
    if (invitation.is_used) {
      return NextResponse.json(
        { error: "Aquesta invitació ja ha estat utilitzada" },
        { status: 400 }
      );
    }

    // Check payment status - allow 'pending' for bank transfers
    if (invitation.payment_status !== 'completed' && invitation.payment_status !== 'pending') {
      return NextResponse.json(
        { error: "El pagament per aquesta invitació no s'ha completat" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      invitation: {
        email: invitation.email,
        organization_name: invitation.organization_name,
        amount_paid: invitation.amount_paid,
        currency: invitation.currency,
        payment_status: invitation.payment_status,
        expires_at: invitation.expires_at,
        is_used: invitation.is_used,
        created_at: invitation.created_at,
        stripe_customer_id: invitation.stripe_customer_id
      }
    });

  } catch (error) {
    console.error("Error validating group invitation:", error);
    return NextResponse.json(
      { error: "Error intern del servidor" },
      { status: 500 }
    );
  }
}
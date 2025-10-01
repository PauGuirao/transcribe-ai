import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { mailerooService } from "@/lib/maileroo";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

if (!webhookSecret) {
  throw new Error("Missing STRIPE_WEBHOOK_SECRET environment variable");
}

if (!serviceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-06-20",
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  serviceRoleKey
);

export async function POST(request: NextRequest) {
  console.log("🔔 Webhook received");
  
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("❌ Missing Stripe signature");
    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 }
    );
  }

  const payload = await request.text();
  console.log("📦 Payload received, length:", payload.length);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    console.log("✅ Webhook signature verified, event type:", event.type);
  } catch (err) {
    console.error("❌ Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      console.log("🎯 Handling checkout.session.completed event");
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan ?? "pro";
      const invitationEmail = session.metadata?.invitationEmail;
      const organizationName = session.metadata?.organizationName;
      const userTokens = session.metadata?.userTokens;

      console.log("👤 User ID from metadata:", userId);
      console.log("📋 Plan from metadata:", plan);
      console.log("📧 Invitation email from metadata:", invitationEmail);
      console.log("🏢 Organization name from metadata:", organizationName);
      console.log("🎫 User tokens from metadata:", userTokens);

      // Handle group plan invitations (bank transfer payments)
      if (plan === "group" && invitationEmail && organizationName) {
        console.log("🎯 Processing group plan invitation");
        try {
          // Generate a unique token for the invitation
          const token = crypto.randomUUID();

          // Create group invitation record
          const { data: invitationData, error: invitationError } = await supabaseAdmin
            .from("group_invitations")
            .insert({
              email: invitationEmail,
              organization_name: organizationName,
              stripe_payment_intent_id: session.payment_intent as string,
              stripe_customer_id: session.customer as string,
              amount_paid: session.amount_total || 0,
              currency: session.currency || 'eur',
              organization_settings: session.metadata?.organizationSettings ? 
                JSON.parse(session.metadata.organizationSettings) : {},
              user_tokens: userTokens ? parseInt(userTokens) : null,
              payment_status: 'completed',
              token: token,
              created_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
            })
            .select()
            .single();

          if (invitationError) {
            console.error("❌ Failed to create group invitation:", invitationError);
            return NextResponse.json(
              { error: "Failed to create group invitation" },
              { status: 500 }
            );
          }

          console.log("✅ Group invitation created successfully:", invitationData);
          
          // Send group invitation email with join button
          const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL}/group-invite/${invitationData.token}`;
          console.log("🔗 Generated join URL:", joinUrl);

          await mailerooService.sendGroupInvitationEmail(
            invitationEmail,
            joinUrl,
            organizationName,
            session.amount_total || 0,
            session.currency || 'eur'
          );
          
          console.log("✅ Group invitation email sent successfully to:", invitationEmail);
          
          console.log("🎉 Group invitation webhook processing completed successfully");
          return NextResponse.json({ received: true }, { status: 200 });
        } catch (error) {
          console.error("❌ Group invitation processing error:", error);
          return NextResponse.json(
            { error: "Group invitation processing failed" },
            { status: 500 }
          );
        }
      }

      // Handle regular user subscriptions (existing logic)
      if (!userId) {
        console.error("❌ No userId found in session metadata");
        return NextResponse.json(
          { error: "No userId in session metadata" },
          { status: 400 }
        );
      }

      const tokensByPlan: Record<string, number> = {
        paid: Number(process.env.STRIPE_PLAN_PRO_TOKENS ?? 999999),
      };

      const tokensAllowance = tokensByPlan[plan] ?? tokensByPlan.paid;
      console.log("🪙 Tokens allowance:", tokensAllowance);

      // First, find the user's organization
      console.log("🔍 Looking up user's organization...");
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("current_organization_id")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("❌ Profile lookup error:", profileError);
        return NextResponse.json(
          { error: "Failed to find user profile" },
          { status: 500 }
        );
      }

      if (!profile?.current_organization_id) {
        console.error("❌ No organization found for user:", userId);
        return NextResponse.json(
          { error: "No organization found for user" },
          { status: 500 }
        );
      }

      console.log("🏢 Found organization ID:", profile.current_organization_id);

      // Update the organization with subscription details
      console.log("📝 Updating organization subscription...");
      const { error: orgError } = await supabaseAdmin
        .from("organizations")
        .update({
          plan_type: plan === "paid" ? "group" : "pro",
          max_members: plan === "paid" ? 10 : 1,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          subscription_status: "active",
        })
        .eq("id", profile.current_organization_id);

      if (orgError) {
        console.error("❌ Failed to update organization:", orgError);
        return NextResponse.json(
          { error: "Failed to update organization" },
          { status: 500 }
        );
      }

      console.log("✅ Organization updated successfully");

      // Also update the user's profile to reflect subscription status
      console.log("📝 Updating user profile...");
      const { error: userError } = await supabaseAdmin
        .from("profiles")
        .update({
          tokens: tokensAllowance,
        })
        .eq("id", userId);

      if (userError) {
        console.error("❌ Failed to update user profile:", userError);
        return NextResponse.json(
          { error: "Failed to update user profile" },
          { status: 500 }
        );
      }

      console.log("✅ User profile updated successfully");
      console.log("🎉 Webhook processing completed successfully");
    }

    // Handle payment_intent.created for immediate activation on bank transfers
    if (event.type === "payment_intent.created") {
      console.log("🎯 Handling payment_intent.created event");
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      // Check if this is a bank transfer payment method
      const paymentMethodTypes = paymentIntent.payment_method_types;
      const isBankTransfer = paymentMethodTypes.includes('sepa_debit') || 
                            paymentMethodTypes.includes('bancontact') || 
                            paymentMethodTypes.includes('sofort');
      
      if (isBankTransfer && paymentIntent.metadata?.plan === "group") {
        console.log("🏦 Bank transfer payment detected for group plan");
        
        const invitationEmail = paymentIntent.metadata?.invitationEmail;
        const organizationName = paymentIntent.metadata?.organizationName;
        const userTokens = paymentIntent.metadata?.userTokens;
        
        if (invitationEmail && organizationName) {
          try {
            // Generate a unique token for the invitation
            const token = crypto.randomUUID();

            // Create group invitation with 'pending' payment status for immediate activation
            const { data: invitationData, error: invitationError } = await supabaseAdmin
              .from("group_invitations")
              .insert({
                email: invitationEmail,
                organization_name: organizationName,
                stripe_payment_intent_id: paymentIntent.id,
                stripe_customer_id: paymentIntent.customer as string,
                amount_paid: paymentIntent.amount || 0,
                currency: paymentIntent.currency || 'eur',
                organization_settings: paymentIntent.metadata?.organizationSettings ? 
                  JSON.parse(paymentIntent.metadata.organizationSettings) : {},
                user_tokens: userTokens ? parseInt(userTokens) : null,
                payment_status: 'pending',
                token: token,
                created_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
              })
              .select()
              .single();

            if (invitationError) {
              console.error("❌ Failed to create group invitation:", invitationError);
              return NextResponse.json(
                { error: "Failed to create group invitation" },
                { status: 500 }
              );
            }

            console.log("✅ Group invitation created with pending payment status:", invitationData);
            
            // Send group invitation email with join button
            const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL}/group-invite/${invitationData.token}`;
            console.log("🔗 Generated join URL:", joinUrl);

            await mailerooService.sendGroupInvitationEmail(
              invitationEmail,
              joinUrl,
              organizationName,
              paymentIntent.amount || 0,
              paymentIntent.currency || 'eur'
            );

            console.log("✅ Group invitation email sent successfully to:", invitationEmail);
            console.log("🎉 Bank transfer group invitation processing completed successfully");
            
          } catch (error) {
            console.error("❌ Bank transfer group invitation processing error:", error);
            return NextResponse.json(
              { error: "Failed to process bank transfer invitation" },
              { status: 500 }
            );
          }
        }
      }
    }

    // Handle payment_intent.payment_failed for account deactivation
    if (event.type === "payment_intent.payment_failed") {
      console.log("🎯 Handling payment_intent.payment_failed event");
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      
      if (paymentIntent.metadata?.plan === "group") {
        console.log("❌ Group plan payment failed, deactivating invitation");
        
        try {
          // Update group invitation to mark as failed
          const { error: updateError } = await supabaseAdmin
            .from("group_invitations")
            .update({ 
              payment_status: 'failed',
              is_used: true // Prevent further use
            })
            .eq("stripe_payment_intent_id", paymentIntent.id);

          if (updateError) {
            console.error("❌ Failed to update group invitation status:", updateError);
          } else {
            console.log("✅ Group invitation marked as failed");
          }
        } catch (error) {
          console.error("❌ Error handling payment failure:", error);
        }
      }
    } else {
      console.log("ℹ️ Unhandled event type:", event.type);
    }
  } catch (error) {
    console.error("❌ Stripe webhook handling error:", error);
    return NextResponse.json(
      { error: "Webhook handler failure" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

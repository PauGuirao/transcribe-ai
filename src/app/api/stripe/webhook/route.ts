import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

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

      console.log("👤 User ID from metadata:", userId);
      console.log("📋 Plan from metadata:", plan);

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
          plan_type: plan === "paid" ? "group" : "individual",
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

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { PLANS, type PlanId } from "@/config/pricing";

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

// Map plan IDs to database plan_type values
function getPlanType(planId: PlanId): 'free' | 'pro' | 'group' {
  switch (planId) {
    case 'free':
      return 'free';
    case 'individual':
      return 'pro';
    case 'team':
    case 'organization':
      return 'group';
    default:
      return 'pro';
  }
}

// Get max members based on plan
function getMaxMembers(planId: PlanId, numberOfUsers: number): number {
  const plan = PLANS[planId];
  if (!plan) return 1;

  if (plan.perUser) {
    return numberOfUsers;
  }
  return plan.users.max;
}

function getSeatCountFromMetadata(metadata: any, event: Stripe.Event): number {
  const raw = metadata?.numberOfUsers;
  if (raw) {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object as Stripe.Invoice;
    const qty = invoice.lines?.data?.[0]?.quantity;
    if (typeof qty === 'number' && Number.isFinite(qty) && qty > 0) {
      return qty;
    }
  }
  return 1;
}

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
    switch (event.type) {
      case "checkout.session.completed":
      case "invoice.payment_succeeded": {
        console.log(`🎯 Handling ${event.type} event`);

        // Normalize common fields
        let metadata: any;
        let customerId: string;

        if (event.type === "checkout.session.completed") {
          const session = event.data.object as Stripe.Checkout.Session;
          metadata = session.metadata;
          customerId = session.customer as string;
        } else {
          const invoice = event.data.object as Stripe.Invoice;
          metadata = invoice.metadata;
          customerId = invoice.customer as string;
        }

        const userId = metadata?.userId;
        const planId = (metadata?.plan as PlanId) ?? "individual";
        const numberOfUsers = getSeatCountFromMetadata(metadata, event);

        console.log("👤 User ID from metadata:", userId);
        console.log("📋 Plan from metadata:", planId);
        console.log("👥 Number of users:", numberOfUsers);

        if (!userId) {
          console.error("❌ No userId found in session metadata");
          return NextResponse.json(
            { error: "No userId in session metadata" },
            { status: 400 }
          );
        }

        // Determine plan type and max members
        const planType = getPlanType(planId);
        const maxMembers = getMaxMembers(planId, numberOfUsers);

        // Get tokens allowance (unlimited for paid plans)
        const tokensAllowance = planId === 'free' ? 60 : 999999;

        // Find user's organization
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

        // Update organization subscription
        console.log("📝 Updating organization subscription...");
        const { error: orgError } = await supabaseAdmin
          .from("organizations")
          .update({
            plan_type: planType,
            max_members: maxMembers,
            stripe_customer_id: customerId,
            stripe_subscription_id: event.type === "checkout.session.completed"
              ? (event.data.object as Stripe.Checkout.Session).subscription
              : (event.data.object as Stripe.Invoice).subscription,
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

        // Update user profile tokens
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
        break;
      }

      case "customer.subscription.deleted": {
        console.log("🎯 Handling subscription deleted event");
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find organization by stripe_customer_id and downgrade to free
        const { error: downgradeError } = await supabaseAdmin
          .from("organizations")
          .update({
            plan_type: "free",
            max_members: 1,
            subscription_status: "canceled",
          })
          .eq("stripe_customer_id", customerId);

        if (downgradeError) {
          console.error("❌ Failed to downgrade organization:", downgradeError);
        } else {
          console.log("✅ Organization downgraded to free plan");
        }
        break;
      }

      case "customer.subscription.updated": {
        console.log("🎯 Handling subscription updated event");
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Update subscription status
        const status = subscription.status === 'active' ? 'active' :
                      subscription.status === 'past_due' ? 'past_due' :
                      subscription.status === 'canceled' ? 'canceled' : 'inactive';

        const { error: updateError } = await supabaseAdmin
          .from("organizations")
          .update({
            subscription_status: status,
          })
          .eq("stripe_customer_id", customerId);

        if (updateError) {
          console.error("❌ Failed to update subscription status:", updateError);
        } else {
          console.log("✅ Subscription status updated to:", status);
        }
        break;
      }

      case "invoice.payment_failed": {
        console.log("🎯 Handling payment failed event");
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        // Mark subscription as past_due
        const { error: updateError } = await supabaseAdmin
          .from("organizations")
          .update({
            subscription_status: "past_due",
          })
          .eq("stripe_customer_id", customerId);

        if (updateError) {
          console.error("❌ Failed to update organization status:", updateError);
        } else {
          console.log("✅ Organization marked as past_due");
        }
        break;
      }

      default:
        console.log("ℹ️ Unhandled event type:", event.type);
        break;
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

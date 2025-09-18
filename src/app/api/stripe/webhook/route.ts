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
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 }
    );
  }

  const payload = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      console.log("Handling checkout.session.completed event");
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const plan = session.metadata?.plan ?? "pro";

      const tokensByPlan: Record<string, number> = {
        basic: Number(process.env.STRIPE_PLAN_BASIC_TOKENS ?? 80),
        pro: Number(process.env.STRIPE_PLAN_PRO_TOKENS ?? 250),
        premium: Number(process.env.STRIPE_PLAN_PREMIUM_TOKENS ?? 600),
      };

      const tokensAllowance = tokensByPlan[plan] ?? tokensByPlan.pro;

      if (userId) {
        const { error } = await supabaseAdmin
          .from("profiles")
          .update({
            is_subscribed: true,
            plan_type: plan,
            tokens: tokensAllowance,
            stripe_customer_id: session.customer,
          })
          .eq("id", userId);

        if (error) {
          console.error("Failed to update user subscription:", error);
          return NextResponse.json(
            { error: "Failed to update profile" },
            { status: 500 }
          );
        }
      }
    }
  } catch (error) {
    console.error("Stripe webhook handling error:", error);
    return NextResponse.json(
      { error: "Webhook handler failure" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

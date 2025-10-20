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

// Helper types and functions to simplify event handling

type WebhookMetadata = {
  userId?: string;
  plan?: string;
  invitationEmail?: string;
  organizationName?: string;
  numberOfUsers?: string;
  organizationSettings?: string;
  userTokens?: string;
};

async function createGroupInvitationAndSendEmail(params: {
  status: 'pending' | 'completed';
  invitationEmail: string;
  organizationName: string;
  paymentIntentId: string;
  customerId?: string;
  amount: number;
  currency: string;
  organizationSettings?: any;
  userTokens?: number | null;
}) {
  const token = crypto.randomUUID();

  const { data: invitationData, error: invitationError } = await supabaseAdmin
    .from("group_invitations")
    .insert({
      email: params.invitationEmail,
      organization_name: params.organizationName,
      stripe_payment_intent_id: params.paymentIntentId,
      stripe_customer_id: params.customerId ?? null,
      amount_paid: params.amount,
      currency: params.currency,
      organization_settings: params.organizationSettings ?? {},
      user_tokens: params.userTokens ?? null,
      payment_status: params.status,
      token,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (invitationError) {
    throw invitationError;
  }

  const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL}/group-invite/${invitationData.token}`;
  await mailerooService.sendGroupInvitationEmail(
    params.invitationEmail,
    joinUrl,
    params.organizationName,
    params.amount,
    params.currency
  );

  return invitationData;
}

function getSeatCountFromMetadataOrInvoice(metadata: any, event: Stripe.Event): number | undefined {
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
  return undefined;
}

function isBankDebitPaymentIntent(paymentIntent: Stripe.PaymentIntent): boolean {
  const pmt = paymentIntent.payment_method_types || [];
  return pmt.includes('sepa_debit') || pmt.includes('bancontact') || pmt.includes('sofort');
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
        let paymentIntentId: string;
        let customerId: string;
        let amountTotal: number;
        let currency: string;

        if (event.type === "checkout.session.completed") {
          const session = event.data.object as Stripe.Checkout.Session;
          metadata = session.metadata;
          paymentIntentId = session.payment_intent as string;
          customerId = session.customer as string;
          amountTotal = session.amount_total || 0;
          currency = session.currency || "eur";
        } else {
          const invoice = event.data.object as Stripe.Invoice;
          metadata = invoice.metadata;
          paymentIntentId = invoice.payment_intent as string;
          customerId = invoice.customer as string;
          amountTotal = invoice.amount_paid || 0;
          currency = invoice.currency || "eur";
        }

        const userId = metadata?.userId;
        const plan = metadata?.plan ?? "pro";
        const invitationEmail = metadata?.invitationEmail;
        const organizationName = metadata?.organizationName;
        const userTokens = metadata?.userTokens;
        const numberOfUsers = getSeatCountFromMetadataOrInvoice(metadata, event);

        console.log("👤 User ID from metadata:", userId);
        console.log("📋 Plan from metadata:", plan);
        console.log("📧 Invitation email from metadata:", invitationEmail);
        console.log("🏢 Organization name from metadata:", organizationName);
        console.log("🎫 User tokens from metadata:", userTokens);
        console.log("👥 Number of users (seats):", numberOfUsers);

        if (plan === "group" && invitationEmail && organizationName) {
          console.log("ℹ️ Group plan detected; skipping invitation email and granting access immediately");
        }

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
            plan_type: plan === "group" ? "group" : "pro",
            max_members: plan === "group" ? (numberOfUsers && Number.isFinite(numberOfUsers) && numberOfUsers > 0 ? numberOfUsers : 1) : 1,
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

      case "payment_intent.created": {
        console.log("🎯 Handling payment_intent.created event");
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        if (isBankDebitPaymentIntent(paymentIntent) && paymentIntent.metadata?.plan === "group") {
          console.log("🏦 Bank transfer payment detected for group plan");
          const invitationEmail = paymentIntent.metadata?.invitationEmail;
          const organizationName = paymentIntent.metadata?.organizationName;
          const userTokens = paymentIntent.metadata?.userTokens;

          if (invitationEmail && organizationName) {
            console.log("ℹ️ SEPA group plan detected; skipping invitation email and granting access immediately");
          }

          // Grant access immediately (activate subscription and tokens) even before funds settle
          const userIdPI = paymentIntent.metadata?.userId;
          const planPI = paymentIntent.metadata?.plan ?? "pro";
          const numberOfUsersPI = paymentIntent.metadata?.numberOfUsers
            ? parseInt(paymentIntent.metadata.numberOfUsers, 10)
            : undefined;

          if (!userIdPI) {
            console.error("❌ No userId found in payment intent metadata");
            break;
          }

          const tokensByPlan: Record<string, number> = {
            paid: Number(process.env.STRIPE_PLAN_PRO_TOKENS ?? 999999),
          };
          const tokensAllowancePI = tokensByPlan[planPI] ?? tokensByPlan.paid;

          console.log("🔍 Looking up user's organization (SEPA)...");
          const { data: profilePI, error: profileErrorPI } = await supabaseAdmin
            .from("profiles")
            .select("current_organization_id")
            .eq("id", userIdPI)
            .single();

          if (profileErrorPI || !profilePI?.current_organization_id) {
            console.error("❌ Failed to find user organization for SEPA:", profileErrorPI);
            break;
          }

          console.log("📝 Activating organization subscription (SEPA)...");
          const { error: orgErrorPI } = await supabaseAdmin
            .from("organizations")
            .update({
              plan_type: planPI === "group" ? "group" : "pro",
              max_members:
                planPI === "group"
                  ? numberOfUsersPI && Number.isFinite(numberOfUsersPI) && numberOfUsersPI > 0
                    ? numberOfUsersPI
                    : 1
                  : 1,
              stripe_customer_id: paymentIntent.customer as string,
              subscription_status: "active",
            })
            .eq("id", profilePI.current_organization_id);

          if (orgErrorPI) {
            console.error("❌ Failed to activate organization for SEPA:", orgErrorPI);
            break;
          }

          console.log("📝 Updating user tokens (SEPA)...");
          const { error: userErrorPI } = await supabaseAdmin
            .from("profiles")
            .update({ tokens: tokensAllowancePI })
            .eq("id", userIdPI);

          if (userErrorPI) {
            console.error("❌ Failed to update user tokens for SEPA:", userErrorPI);
            break;
          }

          console.log("✅ Access granted for SEPA successfully");
        }
        break;
      }

      case "payment_intent.payment_failed": {
        console.log("🎯 Handling payment_intent.payment_failed event");
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        if (paymentIntent.metadata?.plan === "group") {
          console.log("❌ Group plan payment failed, deactivating invitation");
          try {
            const { error: updateError } = await supabaseAdmin
              .from("group_invitations")
              .update({ payment_status: "failed", is_used: true })
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

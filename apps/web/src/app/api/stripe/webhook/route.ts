import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { PLANS, type PlanId } from "@/config/pricing";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!stripeSecretKey) throw new Error("Missing STRIPE_SECRET_KEY environment variable");
if (!webhookSecret) throw new Error("Missing STRIPE_WEBHOOK_SECRET environment variable");
if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable");

const stripe = new Stripe(stripeSecretKey, { apiVersion: "2024-06-20" });
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  serviceRoleKey,
);

/* --------------------------- Plan helpers ----------------------------- */

function getPlanType(planId: PlanId): "free" | "pro" | "group" {
  switch (planId) {
    case "free":
      return "free";
    case "basic":
    case "pro":
      return "pro";
    case "studio":
      return "group";
    default:
      return "pro";
  }
}

function getMaxMembers(planId: PlanId, numberOfUsers: number): number {
  const plan = PLANS[planId];
  if (!plan) return 1;
  return plan.perUser ? numberOfUsers : plan.users.max;
}

/**
 * Per-org minute allowance for a given plan + seat count. `perUser` plans
 * (e.g., studio) scale the per-seat minutesPerMonth by seat count; flat plans
 * use the value verbatim. Returns `null` only if the plan is metered as
 * unlimited (not currently used, but kept for future-proofing).
 */
function getMinutesPerMonth(planId: PlanId, numberOfUsers: number): number | null {
  const plan = PLANS[planId];
  if (!plan) return 60;
  const perSeat = plan.limits.minutesPerMonth;
  if (perSeat === null) return null;
  return plan.perUser ? perSeat * Math.max(1, numberOfUsers) : perSeat;
}

function getSeatCountFromMetadata(metadata: any, event: Stripe.Event): number {
  const raw = metadata?.numberOfUsers;
  if (raw) {
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  if (event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const qty = invoice.lines?.data?.[0]?.quantity;
    if (typeof qty === "number" && Number.isFinite(qty) && qty > 0) return qty;
  }
  return 1;
}

/* --------------------------- Idempotency ------------------------------ */

/**
 * Record this event id. Returns `true` if this is the first time we see it,
 * `false` if it's a Stripe retry of an already-processed event.
 *
 * Implementation: PRIMARY KEY conflict on `processed_stripe_events.event_id`.
 * The insert is the atomic dedup primitive — we never have to read-then-write.
 */
async function claimEvent(event: Stripe.Event): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("processed_stripe_events")
    .insert({ event_id: event.id, event_type: event.type });

  if (!error) return true;
  // Postgres unique_violation; Supabase wraps it as code "23505".
  if (error.code === "23505") {
    console.log(`⏭️  Duplicate webhook ${event.id} (${event.type}) — skipping`);
    return false;
  }
  // Any other DB error: log and proceed. We'd rather double-process than drop.
  console.error("⚠️ claimEvent insert error (proceeding anyway):", error);
  return true;
}

/* ----------------- Org helpers shared across handlers ----------------- */

/**
 * Downgrade an org found by stripe_customer_id to the free plan and reset its
 * minute allowance. Used by deletion, refund and dispute handlers.
 */
async function downgradeOrgByCustomer(
  customerId: string,
  status: "canceled" | "inactive",
  reason: string,
) {
  const freeMinutes = getMinutesPerMonth("free", 1) ?? 60;
  const { error } = await supabaseAdmin
    .from("organizations")
    .update({
      plan_type: "free",
      max_members: 1,
      minutes_per_month: freeMinutes,
      // Cap any over-quota carried from the previous plan.
      minutes_used_this_period: Math.min(0, freeMinutes),
      subscription_status: status,
    })
    .eq("stripe_customer_id", customerId);
  if (error) {
    console.error(`❌ Downgrade failed (${reason}):`, error);
  } else {
    console.log(`✅ Org downgraded to free (${reason})`);
  }
}

/* ------------------------------- POST --------------------------------- */

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error("❌ Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log(`🔔 ${event.type} (${event.id})`);

  // Idempotency: bail before doing any work if we've already processed this id.
  const fresh = await claimEvent(event);
  if (!fresh) {
    return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
  }

  try {
    switch (event.type) {
      /* --------- Subscription start + renewal -------------------------- */
      case "checkout.session.completed":
      case "invoice.payment_succeeded": {
        let metadata: any;
        let customerId: string;
        let subscriptionId: string | null = null;
        let periodStart: number | null = null;
        let periodEnd: number | null = null;

        if (event.type === "checkout.session.completed") {
          const session = event.data.object as Stripe.Checkout.Session;
          metadata = session.metadata;
          customerId = session.customer as string;
          subscriptionId = (session.subscription as string) ?? null;
        } else {
          const invoice = event.data.object as Stripe.Invoice;
          metadata = invoice.metadata;
          customerId = invoice.customer as string;
          subscriptionId = (invoice.subscription as string) ?? null;
          periodStart = invoice.period_start ?? null;
          periodEnd = invoice.period_end ?? null;
        }

        const userId = metadata?.userId;
        const planId = (metadata?.plan as PlanId) ?? "basic";
        const numberOfUsers = getSeatCountFromMetadata(metadata, event);

        if (!userId) {
          console.error("❌ No userId in metadata");
          return NextResponse.json({ error: "No userId" }, { status: 400 });
        }

        const planType = getPlanType(planId);
        const maxMembers = getMaxMembers(planId, numberOfUsers);
        const minutesPerMonth = getMinutesPerMonth(planId, numberOfUsers);
        const tokensAllowance = planId === "free" ? 60 : 999999;

        // Find the user's org and its current usage so we can cap on downgrade.
        const { data: profile, error: profileError } = await supabaseAdmin
          .from("profiles")
          .select("current_organization_id")
          .eq("id", userId)
          .single();
        if (profileError || !profile?.current_organization_id) {
          console.error("❌ Org lookup failed:", profileError);
          return NextResponse.json({ error: "Org not found" }, { status: 500 });
        }
        const orgId = profile.current_organization_id;

        const { data: orgRow } = await supabaseAdmin
          .from("organizations")
          .select("minutes_used_this_period")
          .eq("id", orgId)
          .single();
        const used = orgRow?.minutes_used_this_period ?? 0;

        // Downgrade safety: if the new plan's allowance is smaller than what
        // the org has already burned this period, cap usage to the new limit
        // so they don't see "2000/60 used" forever.
        const cappedUsed =
          minutesPerMonth !== null && used > minutesPerMonth
            ? minutesPerMonth
            : used;

        const { error: orgError } = await supabaseAdmin
          .from("organizations")
          .update({
            plan_type: planType,
            max_members: maxMembers,
            minutes_per_month: minutesPerMonth,
            minutes_used_this_period: cappedUsed,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: "active",
          })
          .eq("id", orgId);
        if (orgError) {
          console.error("❌ Org update failed:", orgError);
          return NextResponse.json({ error: "Org update failed" }, { status: 500 });
        }

        // Reset the usage window on every successful invoice payment (this is
        // the monthly renewal). For checkout-session-completed we leave the
        // window alone — the matching invoice event will reset it.
        if (event.type === "invoice.payment_succeeded" && periodStart && periodEnd) {
          const { error: resetErr } = await supabaseAdmin.rpc(
            "reset_org_period_usage",
            {
              p_org_id: orgId,
              p_period_start: new Date(periodStart * 1000).toISOString(),
              p_period_end: new Date(periodEnd * 1000).toISOString(),
            },
          );
          if (resetErr) console.error("❌ Period usage reset failed:", resetErr);
          else console.log("✅ Usage window reset");
        }

        const { error: userError } = await supabaseAdmin
          .from("profiles")
          .update({ tokens: tokensAllowance })
          .eq("id", userId);
        if (userError) {
          console.error("❌ Profile tokens update failed:", userError);
          return NextResponse.json({ error: "Profile update failed" }, { status: 500 });
        }

        console.log(
          `🎉 ${event.type} processed (plan=${planId} minutes=${minutesPerMonth} seats=${numberOfUsers})`,
        );
        break;
      }

      /* --------- Subscription end ------------------------------------- */
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await downgradeOrgByCustomer(
          sub.customer as string,
          "canceled",
          "subscription.deleted",
        );
        break;
      }

      /* --------- Subscription status change --------------------------- */
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const status =
          sub.status === "active"
            ? "active"
            : sub.status === "past_due"
              ? "past_due"
              : sub.status === "canceled"
                ? "canceled"
                : "inactive";

        const { error } = await supabaseAdmin
          .from("organizations")
          .update({ subscription_status: status })
          .eq("stripe_customer_id", customerId);
        if (error) console.error("❌ Subscription status update failed:", error);
        else console.log(`✅ Subscription status → ${status}`);
        break;
      }

      /* --------- Failed renewal --------------------------------------- */
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const { error } = await supabaseAdmin
          .from("organizations")
          .update({ subscription_status: "past_due" })
          .eq("stripe_customer_id", invoice.customer as string);
        if (error) console.error("❌ past_due update failed:", error);
        else console.log("✅ Org marked past_due");
        break;
      }

      /* --------- Refund (full or partial) ----------------------------- */
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const customerId = charge.customer as string;
        if (!customerId) {
          console.warn("⚠️ Refund without customer; skipping");
          break;
        }
        const fullyRefunded = (charge.amount_refunded ?? 0) >= (charge.amount ?? 0);
        if (fullyRefunded) {
          await downgradeOrgByCustomer(customerId, "canceled", "charge.refunded");
        } else {
          // Partial refund: leave plan in place but flag for ops review.
          console.warn(
            `⚠️ Partial refund (customer=${customerId} amount_refunded=${charge.amount_refunded}/${charge.amount}). ` +
              `No automatic plan change.`,
          );
        }
        break;
      }

      /* --------- Dispute / chargeback --------------------------------- */
      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        const charge = dispute.charge as string;
        try {
          const c = await stripe.charges.retrieve(charge);
          const customerId = c.customer as string | null;
          if (!customerId) {
            console.warn("⚠️ Dispute without customer; skipping downgrade");
            break;
          }
          // Treat chargebacks as immediate access revocation — recovery on
          // dispute resolution would be a separate operator action.
          await downgradeOrgByCustomer(customerId, "inactive", "charge.dispute.created");
          console.error(
            `🚨 DISPUTE filed (reason=${dispute.reason} amount=${dispute.amount} customer=${customerId})`,
          );
        } catch (e) {
          console.error("❌ Dispute handler failed:", e);
        }
        break;
      }

      default:
        console.log("ℹ️ Unhandled event type:", event.type);
        break;
    }
  } catch (error) {
    console.error("❌ Webhook handler failure:", error);
    // We've already claimed the event; if we want Stripe to retry, we'd need
    // to delete the row first. Returning 500 will trigger retry but the
    // duplicate will short-circuit. Trade-off: prefer to log + 200 so the
    // event isn't redelivered forever; ops investigates from logs.
    return NextResponse.json({ error: "Handler failure" }, { status: 500 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

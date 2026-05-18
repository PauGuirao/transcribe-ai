"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import type { PlanId, BillingPeriod } from "@/config/pricing";

/**
 * Shared pricing-card click handler used by every landing page.
 *
 * Flow:
 *   - Free plan          → /dashboard (logged in) or /auth/signin
 *   - Paid, anonymous    → /auth/signin?returnUrl=/payment?plan=... so that
 *                          after sign-in the user lands on /payment, which
 *                          auto-redirects to Stripe Checkout.
 *   - Paid, logged in    → POST /api/stripe/create-checkout-session inline and
 *                          window.location to Stripe directly (no /payment hop).
 *
 * Callers wire `startCheckout` straight to `<Pricing onPrimaryAction={...} />`.
 * Returned `loading` lets the card show a spinner while the Stripe call is in
 * flight.
 */
export function useStartCheckout() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const startCheckout = useCallback(
    async (planId: PlanId, period: BillingPeriod, users?: number) => {
      if (planId === "free") {
        router.push(user ? "/dashboard" : "/auth/signin");
        return;
      }

      const paymentQuery = new URLSearchParams({
        plan: planId,
        period,
        ...(users ? { users: users.toString() } : {}),
      }).toString();

      if (!user) {
        router.push(
          `/auth/signin?returnUrl=${encodeURIComponent(`/payment?${paymentQuery}`)}`,
        );
        return;
      }

      setLoading(true);
      try {
        const response = await fetch("/api/stripe/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: planId, period, users: users ?? 1 }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data?.error || "Checkout failed");
        }

        const { url } = await response.json();
        if (url) {
          window.location.href = url;
          return;
        }
        // Server returned 200 without a redirect URL — fall back to /payment.
        router.push(`/payment?${paymentQuery}`);
      } catch (err) {
        console.error("Stripe checkout error:", err);
        // Don't strand the user — /payment will retry.
        router.push(`/payment?${paymentQuery}`);
      } finally {
        setLoading(false);
      }
    },
    [user, router],
  );

  return { startCheckout, loading };
}

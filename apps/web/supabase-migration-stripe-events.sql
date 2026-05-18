-- =====================================================================
-- Stripe webhook idempotency table.
--
-- Stripe retries any webhook delivery that doesn't return 2xx within ~20s,
-- and may also replay events on its own (manual resend from dashboard, or
-- service-side retry storms). Without idempotency, the same event can fire
-- the same side effect twice — e.g., `invoice.payment_succeeded` could
-- double-grant tokens or double-reset usage windows.
--
-- Pattern: insert (event_id) at the top of the handler. PRIMARY KEY guards
-- against re-processing. If the insert fails on conflict, the handler short
-- -circuits and returns 200 OK.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.processed_stripe_events (
  event_id    text        PRIMARY KEY,
  event_type  text        NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- Purge events older than 90 days. Idempotency only needs to cover Stripe's
-- retry window (a few days) but keep ~3 months for audit / debugging.
CREATE INDEX IF NOT EXISTS processed_stripe_events_processed_at_idx
  ON public.processed_stripe_events (processed_at);

GRANT INSERT, SELECT ON public.processed_stripe_events TO service_role;

-- Optional: cron / scheduled trigger to keep the table small.
-- DELETE FROM public.processed_stripe_events WHERE processed_at < now() - interval '90 days';

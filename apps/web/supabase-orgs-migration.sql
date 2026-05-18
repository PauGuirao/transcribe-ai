-- Migration: clean organization + invitation model
--
-- Goal: every account has exactly one organization. Plan + Stripe + usage all
-- live on `organizations`. All features are identical across plans — the only
-- differentiator is monthly minute budget. Members of an org share the pool.
--
-- This migration is INCREMENTAL and SAFE:
--   - All ALTERs use IF NOT EXISTS where possible.
--   - All data renames are reversible from a backup.
--   - Drops at the bottom are wrapped in IF EXISTS.
--
-- Recommended: take a Supabase snapshot before running. Apply in a single tx.

BEGIN;

-- =====================================================================
-- 1. New columns on `organizations` for plan + Stripe + usage tracking.
-- =====================================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS plan                       text,
  ADD COLUMN IF NOT EXISTS minutes_per_month          integer,
  ADD COLUMN IF NOT EXISTS minutes_used_this_period   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS billing_period_start       timestamptz,
  ADD COLUMN IF NOT EXISTS billing_period_end         timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_customer_id         text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id     text,
  ADD COLUMN IF NOT EXISTS subscription_status        text;

CREATE INDEX IF NOT EXISTS organizations_stripe_customer_idx
  ON organizations (stripe_customer_id);

-- Ensure subscription_status is nullable (provisionUserAccount inserts NULL
-- for new personal orgs; some older deployments had it NOT NULL).
ALTER TABLE organizations
  ALTER COLUMN subscription_status DROP NOT NULL;

-- =====================================================================
-- 1a. email_invitations columns required by the new invite + auth flow.
--     Defensive: only adds what's missing.
-- =====================================================================

ALTER TABLE email_invitations
  ADD COLUMN IF NOT EXISTS used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member';

-- Legacy NOT NULL constraints from the old schema. Drop them so the new
-- code (which uses `created_by` only) can insert rows; and so step 8's
-- backfill-from-`invitations` doesn't violate them.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'email_invitations' AND column_name = 'invited_by'
  ) THEN
    -- Backfill created_by from legacy invited_by where missing.
    EXECUTE 'UPDATE email_invitations SET created_by = invited_by WHERE created_by IS NULL AND invited_by IS NOT NULL';
    -- Drop the NOT NULL so future inserts don't need to specify invited_by.
    EXECUTE 'ALTER TABLE email_invitations ALTER COLUMN invited_by DROP NOT NULL';
  END IF;
END $$;

ALTER TABLE email_invitations
  DROP CONSTRAINT IF EXISTS email_invitations_role_check;
ALTER TABLE email_invitations
  ADD CONSTRAINT email_invitations_role_check
  CHECK (role IN ('member', 'admin'));

CREATE INDEX IF NOT EXISTS email_invitations_token_idx ON email_invitations (token);
CREATE INDEX IF NOT EXISTS email_invitations_org_idx   ON email_invitations (organization_id);

-- =====================================================================
-- 1b. Stamp each transcribed audio with the org it should be charged to.
--     Required by the worker's chunkedUploadInit (insert) and stitchChunks
--     (consume_org_minutes RPC). Nullable so legacy / whatsapp paths that
--     don't fill it just skip the charge gracefully.
-- =====================================================================

ALTER TABLE audios
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS audios_organization_id_idx ON audios (organization_id);

-- Backfill organization_id for existing audios from the owner's active org.
UPDATE audios a
SET organization_id = p.current_organization_id
FROM profiles p
WHERE a.user_id = p.id
  AND a.organization_id IS NULL
  AND p.current_organization_id IS NOT NULL;

-- =====================================================================
-- 2. Normalize legacy `plan_type` values into the new `plan` column.
--    Old chaos: 'Gratis', 'individual', 'team', 'organization', 'free', 'pro', 'group'
--    New canonical: 'free' | 'basic' | 'pro' | 'studio'
-- =====================================================================

UPDATE organizations SET plan = CASE
  WHEN lower(coalesce(plan_type, '')) IN ('free', 'gratis', '')           THEN 'free'
  WHEN lower(plan_type) IN ('basic', 'individual')                        THEN 'basic'
  WHEN lower(plan_type) IN ('pro', 'team')                                THEN 'pro'
  WHEN lower(plan_type) IN ('studio', 'organization', 'group')            THEN 'studio'
  ELSE 'free'
END
WHERE plan IS NULL;

ALTER TABLE organizations
  ALTER COLUMN plan SET NOT NULL,
  ALTER COLUMN plan SET DEFAULT 'free';

-- Enforce valid values going forward.
ALTER TABLE organizations
  DROP CONSTRAINT IF EXISTS organizations_plan_check;
ALTER TABLE organizations
  ADD CONSTRAINT organizations_plan_check
  CHECK (plan IN ('free', 'basic', 'pro', 'studio'));

-- Set per-plan caps (idempotent).
UPDATE organizations SET
  minutes_per_month = CASE plan
    WHEN 'free'   THEN 60
    WHEN 'basic'  THEN 600
    WHEN 'pro'    THEN 3000
    WHEN 'studio' THEN 9000
  END,
  max_members = CASE plan
    WHEN 'studio' THEN 5
    ELSE 1
  END
WHERE minutes_per_month IS NULL OR minutes_per_month = 0;

ALTER TABLE organizations
  ALTER COLUMN minutes_per_month SET NOT NULL,
  ALTER COLUMN minutes_per_month SET DEFAULT 60;

-- =====================================================================
-- 3. Delete orphan auto-created orgs from legacy race conditions.
--    Runs BEFORE the rename in step 4 so the 'test' sentinel still matches.
--
--    A row matches ALL of the following:
--      a. The owner has MORE THAN ONE owned org.
--      b. The org is NOT the one the user is currently pointed at
--         (`profiles.current_organization_id`). → users stay where they are.
--      c. The plan is 'free'. → never touch a paid subscription.
--      d. The org name is still the literal sentinel: 'test', '', or NULL.
--      e. The org has 0 members other than the owner.
--      f. The org's owner has 0 audios (anywhere).
--
--    Anything that doesn't fit this exact "legacy unused auto-orphan" shape
--    is left alone. A user who legitimately owns multiple orgs (e.g. their
--    personal + a clinic they own) keeps both.
-- =====================================================================

WITH owners_with_multiple AS (
  SELECT owner_id
  FROM organizations
  WHERE owner_id IS NOT NULL
  GROUP BY owner_id
  HAVING COUNT(*) > 1
)
DELETE FROM organizations o
USING owners_with_multiple m
WHERE o.owner_id = m.owner_id
  AND o.plan = 'free'
  AND (o.name = 'test' OR o.name IS NULL OR o.name = '')
  -- Not the active org for the owner.
  AND NOT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = o.owner_id AND p.current_organization_id = o.id
  )
  -- No other members in this org.
  AND (
    SELECT COUNT(*) FROM organization_members om
    WHERE om.organization_id = o.id
  ) <= 1
  -- Owner has no audios at all (anywhere) — strong signal of unused account state.
  AND NOT EXISTS (
    SELECT 1 FROM audios a WHERE a.user_id = o.owner_id
  );

-- =====================================================================
-- 4. Rename remaining orgs still named 'test' (auto-created sentinel from
--    the legacy DB trigger). After step 3, anything still called 'test'
--    is an org the user IS using — so we keep it, just give it a real name.
-- =====================================================================

UPDATE organizations o
SET name = COALESCE(
  NULLIF(split_part(coalesce(p.full_name, ''), ' ', 1), ''),
  split_part(coalesce(p.email, 'user'), '@', 1)
) || '''s Grup'
FROM profiles p
WHERE o.owner_id = p.id
  AND (o.name = 'test' OR o.name = '' OR o.name IS NULL);

-- =====================================================================
-- 5. Drop the legacy auth-user DB trigger so org-creation lives only in
--    application code (provisionUserAccount). Defensive: trigger names
--    differ across snapshots — drop the common ones.
-- =====================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- =====================================================================
-- 6. Atomic minute-counter RPC. Called by the worker after each
--    successful transcription to charge usage against the org's pool.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.consume_org_minutes(
  p_org_id uuid,
  p_minutes integer
) RETURNS TABLE (
  minutes_used_this_period integer,
  minutes_per_month        integer,
  over_quota               boolean
) AS $$
  UPDATE organizations
  SET minutes_used_this_period = COALESCE(minutes_used_this_period, 0) + p_minutes
  WHERE id = p_org_id
  RETURNING
    minutes_used_this_period,
    minutes_per_month,
    minutes_used_this_period > minutes_per_month;
$$ LANGUAGE sql VOLATILE;

GRANT EXECUTE ON FUNCTION public.consume_org_minutes(uuid, integer) TO service_role;

-- =====================================================================
-- 7. Reset usage at the start of each billing cycle. Called by the
--    Stripe webhook on `invoice.payment_succeeded` (or daily cron for
--    free plans).
-- =====================================================================

CREATE OR REPLACE FUNCTION public.reset_org_period_usage(
  p_org_id uuid,
  p_period_start timestamptz,
  p_period_end   timestamptz
) RETURNS void AS $$
  UPDATE organizations
  SET minutes_used_this_period = 0,
      billing_period_start = p_period_start,
      billing_period_end   = p_period_end
  WHERE id = p_org_id;
$$ LANGUAGE sql VOLATILE;

GRANT EXECUTE ON FUNCTION public.reset_org_period_usage(uuid, timestamptz, timestamptz) TO service_role;

-- =====================================================================
-- 8. Drop the legacy persistent-token `invitations` table once any
--    remaining rows are migrated into `email_invitations`. Done as the
--    very last step so a failed migration leaves invitations intact.
-- =====================================================================

INSERT INTO email_invitations (organization_id, email, token, role, created_by, created_at, expires_at)
SELECT
  i.organization_id,
  '',                                 -- legacy table had no email; will need manual triage if you ever consume one of these tokens
  i.token,
  'member',
  o.owner_id,                         -- real user UUID (FK -> auth.users); NULL if org has no owner
  i.created_at,
  i.created_at + interval '7 days'
FROM invitations i
LEFT JOIN organizations o ON o.id = i.organization_id
WHERE NOT EXISTS (
  SELECT 1 FROM email_invitations ei WHERE ei.token = i.token
)
ON CONFLICT DO NOTHING;

-- Uncomment when ready to fully retire the legacy table:
-- DROP TABLE IF EXISTS invitations CASCADE;

COMMIT;

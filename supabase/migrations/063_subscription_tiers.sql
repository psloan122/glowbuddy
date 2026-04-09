-- 063_subscription_tiers.sql — 4-tier subscription model
--
-- Migrates the providers.tier check constraint from the legacy
-- ('free','pro','pro_trial') set to the new conversion-funnel tier set
-- ('free','verified','certified','enterprise') and adds the columns
-- the Stripe billing layer (Phase 2) will need.
--
-- The data migration treats every existing 'pro' or 'pro_trial' row as
-- 'verified' so the smallest paid tier preserves the trial users that
-- went through the legacy onboarding.

-- 1. Drop the old constraint so we can rewrite the live data without
--    fighting the check.
ALTER TABLE providers DROP CONSTRAINT IF EXISTS providers_tier_check;

-- 2. Migrate every existing pro / pro_trial row to verified.
UPDATE providers
   SET tier = 'verified'
 WHERE tier IN ('pro', 'pro_trial');

-- 3. Reinstate the constraint with the new allowed set.
ALTER TABLE providers
  ADD CONSTRAINT providers_tier_check
  CHECK (tier IN ('free', 'verified', 'certified', 'enterprise'));

-- 4. Stripe billing columns (populated in Phase 2 by checkout + webhook).
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS stripe_customer_id     text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status    text,
  ADD COLUMN IF NOT EXISTS trial_ends_at          timestamptz,
  ADD COLUMN IF NOT EXISTS current_period_end     timestamptz;

-- 5. Helper for tier rank comparisons in policies / functions.
CREATE OR REPLACE FUNCTION public.tier_rank(t text)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE t
    WHEN 'free'       THEN 0
    WHEN 'verified'   THEN 1
    WHEN 'certified'  THEN 2
    WHEN 'enterprise' THEN 3
    ELSE 0
  END;
$$;

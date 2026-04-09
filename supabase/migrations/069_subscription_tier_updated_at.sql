-- 069_subscription_tier_updated_at.sql — add tier_updated_at timestamp
--
-- Tracks when a provider's subscription tier was last changed (by Stripe
-- webhook or admin action). Used for audit trails and to show "Verified
-- since" badges on the dashboard.

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS tier_updated_at timestamptz;

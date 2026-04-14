-- 074: Add submitted_by_user to providers + price_unit to price_alerts

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS submitted_by_user uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS submitted_at      timestamptz DEFAULT now();

ALTER TABLE price_alerts
  ADD COLUMN IF NOT EXISTS price_unit text DEFAULT 'per_unit';

-- 077: Boost columns for paid competitor placement

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS boost_active  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS boost_cities  text[],
  ADD COLUMN IF NOT EXISTS boost_expires timestamptz;

CREATE INDEX IF NOT EXISTS idx_providers_boost
  ON providers(boost_active, state)
  WHERE boost_active = true;

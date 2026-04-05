-- Provider first-timer friendly fields

ALTER TABLE providers ADD COLUMN IF NOT EXISTS first_timer_friendly boolean DEFAULT false;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS first_timer_special text;

-- Partial index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_providers_first_timer_friendly
  ON providers (first_timer_friendly) WHERE first_timer_friendly = true;

-- Migration 051: Track source and verification state on provider_pricing
-- Lets us mix scraped (unverified) and provider-uploaded (verified) data
-- in the same table without losing provenance.

ALTER TABLE provider_pricing
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMPTZ;

-- Backfill: anything already in the table came from real provider uploads,
-- so the defaults are already correct (source='manual', verified=true).

CREATE INDEX IF NOT EXISTS idx_provider_pricing_source
  ON provider_pricing(source);
CREATE INDEX IF NOT EXISTS idx_provider_pricing_verified
  ON provider_pricing(verified);

COMMENT ON COLUMN provider_pricing.source IS
  'Origin of price row: manual | scrape | submission | api';
COMMENT ON COLUMN provider_pricing.verified IS
  'Has a human confirmed this price? Manual uploads default true, scrapes default false.';

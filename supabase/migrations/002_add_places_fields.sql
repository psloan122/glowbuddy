-- Add Google Places fields to procedures table
ALTER TABLE procedures
  ADD COLUMN IF NOT EXISTS google_place_id text,
  ADD COLUMN IF NOT EXISTS provider_address text,
  ADD COLUMN IF NOT EXISTS lat numeric,
  ADD COLUMN IF NOT EXISTS lng numeric,
  ADD COLUMN IF NOT EXISTS provider_phone text,
  ADD COLUMN IF NOT EXISTS provider_website text;

-- Add Google Places fields to providers table
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS google_place_id text,
  ADD COLUMN IF NOT EXISTS lat numeric,
  ADD COLUMN IF NOT EXISTS lng numeric;

-- Index for fast lookup by google_place_id
CREATE INDEX IF NOT EXISTS idx_providers_google_place_id ON providers(google_place_id);
CREATE INDEX IF NOT EXISTS idx_procedures_google_place_id ON procedures(google_place_id);

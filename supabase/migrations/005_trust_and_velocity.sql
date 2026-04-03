-- Trust scoring and velocity detection columns
ALTER TABLE procedures
  ADD COLUMN IF NOT EXISTS trust_score integer DEFAULT 50,
  ADD COLUMN IF NOT EXISTS flagged_reason text;

-- Provider response on disputes
ALTER TABLE disputes
  ADD COLUMN IF NOT EXISTS provider_response text;

-- Index for velocity checks (provider + location + time)
CREATE INDEX IF NOT EXISTS idx_procedures_provider_created
  ON procedures(provider_name, city, state, created_at);

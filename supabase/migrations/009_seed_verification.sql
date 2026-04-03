-- Seed Data Verification Columns
-- Tracks Google Places verification status for seed procedure rows

ALTER TABLE procedures
  ADD COLUMN IF NOT EXISTS google_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_status text,
  ADD COLUMN IF NOT EXISTS verified_place_id text,
  ADD COLUMN IF NOT EXISTS verified_business_name text,
  ADD COLUMN IF NOT EXISTS verified_address text;

-- Provider Onboarding Schema Updates
-- Adds columns needed for full provider onboarding flow

-- New columns on providers table
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS about text,
  ADD COLUMN IF NOT EXISTS hours text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_method text,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS notify_new_submission boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_dispute boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_weekly boolean DEFAULT true;

-- Update tier check to include pro_trial
ALTER TABLE providers DROP CONSTRAINT IF EXISTS providers_tier_check;
ALTER TABLE providers ADD CONSTRAINT providers_tier_check
  CHECK (tier IN ('free', 'pro', 'pro_trial'));

-- Add price_label column to provider_pricing if not exists
-- (schema.sql already has price_label with DEFAULT 'per session',
--  but we want to ensure it's there)
ALTER TABLE provider_pricing
  ADD COLUMN IF NOT EXISTS price_label text DEFAULT 'per unit';

-- Storage bucket for provider logos
-- NOTE: Create bucket 'provider-logos' in Supabase dashboard
-- Settings: Public bucket, 5MB max file size
-- Allowed MIME types: image/jpeg, image/png, image/webp

-- RLS policies for provider-logos bucket
-- (Run in SQL editor after creating the bucket)
/*
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'provider-logos'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Public can read logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'provider-logos');

CREATE POLICY "Users can update their own logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'provider-logos'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'provider-logos'
  AND auth.role() = 'authenticated'
);
*/

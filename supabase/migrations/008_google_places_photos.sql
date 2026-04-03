-- Google Places Photos & Extended Metadata
-- Adds Google-specific columns to providers and creates provider_photos table

-- New columns on providers table for Google metadata
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS google_rating numeric,
  ADD COLUMN IF NOT EXISTS google_review_count integer,
  ADD COLUMN IF NOT EXISTS google_maps_url text,
  ADD COLUMN IF NOT EXISTS google_price_level integer,
  ADD COLUMN IF NOT EXISTS hours_text text,
  ADD COLUMN IF NOT EXISTS photos_imported boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS google_synced_at timestamptz;

-- Provider photos table
CREATE TABLE IF NOT EXISTS provider_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  public_url text NOT NULL,
  source text DEFAULT 'google',
  google_attribution text,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_photos_provider_id
  ON provider_photos(provider_id);

-- RLS
ALTER TABLE provider_photos ENABLE ROW LEVEL SECURITY;

-- Public can view photos
CREATE POLICY "Anyone can view provider photos"
  ON provider_photos FOR SELECT
  USING (true);

-- Owner can insert photos for their provider
CREATE POLICY "Provider owner can insert photos"
  ON provider_photos FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT id FROM providers WHERE owner_user_id = auth.uid()
    )
  );

-- Owner can update their provider's photos
CREATE POLICY "Provider owner can update photos"
  ON provider_photos FOR UPDATE
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE owner_user_id = auth.uid()
    )
  );

-- Owner can delete their provider's photos
CREATE POLICY "Provider owner can delete photos"
  ON provider_photos FOR DELETE
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE owner_user_id = auth.uid()
    )
  );

-- Storage bucket for provider photos
-- NOTE: Create bucket 'provider-photos' in Supabase dashboard
-- Settings: Public bucket, 10MB max file size
-- Allowed MIME types: image/jpeg, image/png, image/webp

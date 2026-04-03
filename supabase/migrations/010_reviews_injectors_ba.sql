-- Migration 010: Reviews, Injectors, Before/After Photos
-- Adds reviews system, injector profiles, and before/after photo galleries

-- ============================================================
-- 1. NEW TABLES
-- ============================================================

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  injector_id UUID,
  procedure_id UUID REFERENCES procedures(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT,
  procedure_type TEXT,
  would_return BOOLEAN,
  verified_visit BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'removed')),
  flagged_reason TEXT,
  provider_response TEXT,
  provider_responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Before/After Photos table
CREATE TABLE IF NOT EXISTS before_after_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  injector_id UUID,
  uploaded_by TEXT NOT NULL CHECK (uploaded_by IN ('provider', 'patient')),
  uploader_user_id UUID REFERENCES auth.users(id),
  procedure_type TEXT,
  treatment_area TEXT,
  before_url TEXT NOT NULL,
  after_url TEXT NOT NULL,
  caption TEXT,
  consent_confirmed BOOLEAN DEFAULT false,
  consent_timestamp TIMESTAMPTZ,
  is_own_photo BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'active', 'removed')),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Injectors table
CREATE TABLE IF NOT EXISTS injectors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  credentials TEXT,
  bio TEXT,
  instagram TEXT,
  specialties TEXT[],
  years_experience INTEGER,
  profile_photo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add foreign key for injector_id references now that injectors table exists
ALTER TABLE reviews ADD CONSTRAINT reviews_injector_id_fkey
  FOREIGN KEY (injector_id) REFERENCES injectors(id) ON DELETE SET NULL;

ALTER TABLE before_after_photos ADD CONSTRAINT ba_photos_injector_id_fkey
  FOREIGN KEY (injector_id) REFERENCES injectors(id) ON DELETE SET NULL;

-- ============================================================
-- 2. ALTER EXISTING TABLES
-- ============================================================

-- Add review/rating fields to procedures
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5);
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS review_title TEXT;
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS review_body TEXT;
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS would_return BOOLEAN;
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS injector_name TEXT;
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS injector_id UUID REFERENCES injectors(id) ON DELETE SET NULL;
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS result_photo_url TEXT;
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS result_photo_consent BOOLEAN DEFAULT false;

-- Add aggregated review data to providers
ALTER TABLE providers ADD COLUMN IF NOT EXISTS avg_rating NUMERIC;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS before_after_count INTEGER DEFAULT 0;

-- ============================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE before_after_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE injectors ENABLE ROW LEVEL SECURITY;

-- Reviews: public can read active reviews
CREATE POLICY "reviews_public_read" ON reviews
  FOR SELECT USING (status = 'active');

-- Reviews: authenticated users can insert
CREATE POLICY "reviews_auth_insert" ON reviews
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Reviews: users can update their own reviews
CREATE POLICY "reviews_owner_update" ON reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Reviews: provider owners can read all reviews for their provider
CREATE POLICY "reviews_provider_read" ON reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = reviews.provider_id
      AND providers.owner_user_id = auth.uid()
    )
  );

-- Reviews: provider owners can update provider_response on their reviews
CREATE POLICY "reviews_provider_respond" ON reviews
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = reviews.provider_id
      AND providers.owner_user_id = auth.uid()
    )
  );

-- Before/After Photos: public can read active photos
CREATE POLICY "ba_photos_public_read" ON before_after_photos
  FOR SELECT USING (status = 'active');

-- Before/After Photos: authenticated users can insert with consent
CREATE POLICY "ba_photos_auth_insert" ON before_after_photos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND consent_confirmed = true);

-- Before/After Photos: provider owners have full CRUD on their photos
CREATE POLICY "ba_photos_provider_select" ON before_after_photos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = before_after_photos.provider_id
      AND providers.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "ba_photos_provider_insert" ON before_after_photos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = before_after_photos.provider_id
      AND providers.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "ba_photos_provider_update" ON before_after_photos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = before_after_photos.provider_id
      AND providers.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "ba_photos_provider_delete" ON before_after_photos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = before_after_photos.provider_id
      AND providers.owner_user_id = auth.uid()
    )
  );

-- Injectors: public can read active injectors
CREATE POLICY "injectors_public_read" ON injectors
  FOR SELECT USING (is_active = true);

-- Injectors: provider owners have full CRUD
CREATE POLICY "injectors_provider_select" ON injectors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = injectors.provider_id
      AND providers.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "injectors_provider_insert" ON injectors
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = injectors.provider_id
      AND providers.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "injectors_provider_update" ON injectors
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = injectors.provider_id
      AND providers.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "injectors_provider_delete" ON injectors
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = injectors.provider_id
      AND providers.owner_user_id = auth.uid()
    )
  );

-- ============================================================
-- 4. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_reviews_provider_status_rating
  ON reviews (provider_id, status, rating);

CREATE INDEX IF NOT EXISTS idx_ba_photos_provider_status
  ON before_after_photos (provider_id, status);

CREATE INDEX IF NOT EXISTS idx_injectors_provider
  ON injectors (provider_id);

CREATE INDEX IF NOT EXISTS idx_procedures_rating
  ON procedures (rating) WHERE rating IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_procedures_injector_id
  ON procedures (injector_id) WHERE injector_id IS NOT NULL;

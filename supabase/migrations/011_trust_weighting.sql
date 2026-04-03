-- Migration 012: Weighted Trust System for Reviews
-- Adds trust tiers, weighted rating calculations, and auto-update trigger

-- ============================================================
-- 1. ALTER REVIEWS TABLE
-- ============================================================

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS trust_tier TEXT DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS trust_weight NUMERIC DEFAULT 0.6,
  ADD COLUMN IF NOT EXISTS receipt_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_result_photo BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS receipt_id UUID REFERENCES procedures(id);

-- ============================================================
-- 2. ALTER PROVIDERS TABLE
-- ============================================================

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS weighted_rating NUMERIC,
  ADD COLUMN IF NOT EXISTS unweighted_rating NUMERIC,
  ADD COLUMN IF NOT EXISTS verified_review_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS photo_review_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unverified_review_count INTEGER DEFAULT 0;

-- ============================================================
-- 3. WEIGHTED RATING FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_weighted_rating(p_provider_id UUID)
RETURNS TABLE(
  weighted_avg NUMERIC,
  unweighted_avg NUMERIC,
  total_reviews INTEGER,
  verified_count INTEGER,
  photo_count INTEGER,
  unverified_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROUND(
      SUM(r.rating * r.trust_weight) / NULLIF(SUM(r.trust_weight), 0)
    , 1) AS weighted_avg,
    ROUND(AVG(r.rating::NUMERIC), 1) AS unweighted_avg,
    COUNT(*)::INTEGER AS total_reviews,
    COUNT(*) FILTER (
      WHERE r.trust_tier IN ('receipt_verified', 'receipt_and_photo')
    )::INTEGER AS verified_count,
    COUNT(*) FILTER (
      WHERE r.trust_tier IN ('has_photo', 'receipt_and_photo')
    )::INTEGER AS photo_count,
    COUNT(*) FILTER (
      WHERE r.trust_tier = 'unverified'
    )::INTEGER AS unverified_count
  FROM reviews r
  WHERE r.provider_id = p_provider_id
    AND r.status = 'active';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. PROVIDER RATING UPDATE TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION update_provider_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE providers p
  SET (
    weighted_rating,
    unweighted_rating,
    review_count,
    verified_review_count,
    photo_review_count,
    unverified_review_count
  ) = (
    SELECT
      weighted_avg,
      unweighted_avg,
      total_reviews,
      verified_count,
      photo_count,
      unverified_count
    FROM calculate_weighted_rating(NEW.provider_id)
  )
  WHERE p.id = NEW.provider_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_provider_rating
AFTER INSERT OR UPDATE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_provider_rating();

-- ============================================================
-- 5. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_reviews_trust_tier
  ON reviews (trust_tier) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_reviews_trust_weight
  ON reviews (trust_weight DESC, created_at DESC) WHERE status = 'active';

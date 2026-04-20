-- ════════════════════════════════════════════════════════════════════════
-- 085: Price quality metadata columns
-- ════════════════════════════════════════════════════════════════════════
--
-- Adds three columns to provider_pricing that are prerequisites for
-- migrations 086–089 (H4/H1/H2a/dedup cleanup):
--
--   quality_flag    TEXT    — triage label for manual review queues
--                             ('h4_suppressed', 'h1_promo', 'needs_review_h1_candidate',
--                              'domain_mismatch', 'scraper_duplicate', etc.)
--   relabel_history JSONB   — audit trail for label changes and suppressions
--                             stored as [{action, reason, timestamp, evidence_source}, …]
--   raw_snippet     TEXT    — ±300-char scrape context around the price match
--                             (NULL for all existing rows; populated by future scraper runs)
--
-- None of these columns are NOT NULL. All existing rows remain unchanged.
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE provider_pricing
  ADD COLUMN IF NOT EXISTS quality_flag    text,
  ADD COLUMN IF NOT EXISTS relabel_history jsonb,
  ADD COLUMN IF NOT EXISTS raw_snippet     text;

-- Index for admin review queues keyed on quality_flag
CREATE INDEX IF NOT EXISTS idx_pp_quality_flag
  ON provider_pricing (quality_flag)
  WHERE quality_flag IS NOT NULL;

COMMIT;

-- Verify:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'provider_pricing'
--   AND column_name IN ('quality_flag','relabel_history','raw_snippet');

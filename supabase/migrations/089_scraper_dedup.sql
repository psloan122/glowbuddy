-- ════════════════════════════════════════════════════════════════════════
-- 089: Scraper deduplication + partial unique index
-- ════════════════════════════════════════════════════════════════════════
--
-- PROBLEM: A single scraper run on 2026-04-12 inserted 7–10 copies of each
-- price row for many providers (confirmed by all duplicates sharing timestamps
-- within milliseconds of each other). The unique constraint
-- idx_provider_pricing_community_dedup covers (provider_id, procedure_type,
-- price, price_label) but NOT source_url, so per-URL duplicates slipped
-- through.
--
-- SCOPE: 2,359 duplicate groups, 3,425 excess rows (all procedure types).
--        Neurotoxin: ~60 groups, ~60 excess rows.
--        Filler per_syringe: worst affected (~100 groups, 600–900 excess rows).
--
-- STRATEGY: Keep the oldest row per (provider_id, procedure_type, price,
-- price_label, source_url). Soft-delete the rest (is_active = false) with
-- suppression_reason = 'scraper_duplicate_run'. This preserves audit history
-- while removing duplicates from browse results.
--
-- PART A: Soft-delete duplicate rows (keep earliest per group).
-- PART B: Add partial unique index to prevent future re-occurrence.
--
-- DOES NOT TOUCH: community_submitted, provider_listed, csv_import rows.
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── Part A: Soft-delete all but the oldest duplicate row per group ────────

UPDATE provider_pricing pp
SET
  is_active          = false,
  display_suppressed = true,
  suppression_reason = 'scraper_duplicate_run',
  quality_flag       = 'scraper_duplicate'
WHERE pp.source IN ('cheerio_scraper', 'scrape')
  AND pp.is_active = true
  AND pp.id NOT IN (
    -- Keep the single oldest row per unique (provider_id, procedure_type,
    -- price, price_label, source_url) tuple.
    SELECT DISTINCT ON (provider_id, procedure_type, price, price_label, source_url)
           id
    FROM provider_pricing
    WHERE source IN ('cheerio_scraper', 'scrape')
      AND is_active = true
    ORDER BY provider_id, procedure_type, price, price_label, source_url,
             created_at ASC, id ASC
  );

-- ── Part B: Partial unique index to prevent future batch duplicates ───────
-- Covers scraper sources only (community_submitted allows multiple patient
-- reports for the same price; provider_listed may be legitimately updated).
--
-- IMPORTANT: Run CONCURRENTLY in production to avoid table-level lock.
-- Swap the CREATE INDEX CONCURRENTLY line for the plain CREATE INDEX below
-- when running inside a transaction (e.g., in a CI migration runner that
-- wraps in BEGIN/COMMIT). CONCURRENTLY cannot run inside a transaction block.

-- For production (run OUTSIDE a transaction):
-- CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS
--   idx_pp_scraper_no_dup
-- ON provider_pricing (provider_id, procedure_type, price, price_label, source_url)
-- WHERE source IN ('cheerio_scraper', 'scrape')
--   AND is_active = true;

-- For CI / migration runner (inside transaction — blocks briefly):
CREATE UNIQUE INDEX IF NOT EXISTS
  idx_pp_scraper_no_dup
ON provider_pricing (provider_id, procedure_type, price, price_label, source_url)
WHERE source IN ('cheerio_scraper', 'scrape')
  AND is_active = true;

COMMIT;

-- ── Verify ────────────────────────────────────────────────────────────────
/*
-- Confirm no active duplicates remain:
SELECT COUNT(*) AS remaining_dup_groups
FROM (
  SELECT provider_id, procedure_type, price, price_label, source_url
  FROM provider_pricing
  WHERE source IN ('cheerio_scraper', 'scrape')
    AND is_active = true
  GROUP BY provider_id, procedure_type, price, price_label, source_url
  HAVING COUNT(*) > 1
) t;
-- Expected: 0

-- Confirm soft-deleted rows are tagged:
SELECT quality_flag, COUNT(*)
FROM provider_pricing
WHERE quality_flag = 'scraper_duplicate'
GROUP BY 1;
-- Expected: ~3,425
*/

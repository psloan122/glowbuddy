-- ════════════════════════════════════════════════════════════════════════
-- 088: H2a deletion + domain mismatch suppression
-- ════════════════════════════════════════════════════════════════════════
--
-- Part A — H2a: Wrong-page-type deletions
--   Rows scraped from pages that have no valid neurotoxin pricing.
--   Investigation confirmed these pages either contain weight-loss pricing,
--   wholesale/provider content, or session-package menus with no per-unit
--   pricing. The $5–$12 per_unit prices are completely fabricated by the
--   scraper misparse. DELETE (not suppress) — no valid signal at all.
--
-- H2A PROVIDERS + ROW COUNTS:
--   LaserAway Nashville Green Hills  (Nashville, TN)  4 rows  /weight-loss
--   Destin Weight Loss and Wellness  (Destin, FL)     10 rows  weight-loss clinic
--   BeautyGoalsLV                    (Las Vegas, NV)  26 rows  /botox (session-only page)
--   ABQ Medical Spa                  (Albuquerque, NM) 24 rows /weight-loss
--   MC Modern Skin                   (Seattle, WA)     2 rows  /weight-loss
--   Silhouette MD Aesthetics         (New York, NY)    6 rows  /weight-loss
--   SkinTight MedSpa                 (New York, NY)    1 row   /weight-loss
--   Viva La Med Spa                  (Chicago, IL)     2 rows  /weight-loss
--   TOTAL:                           ~75 neurotoxin rows
--
-- NOTE: BeautyGoalsLV rows are also scraper duplicates (×10 per price tier).
-- Deleting all rows for this provider is the clean approach.
--
-- Part B — Domain mismatch suppression (Part 6)
--   Pricing rows where source_url domain belongs to a different provider
--   (different city / state). Suppress rather than delete — the provider
--   record itself may be valid; only the pricing is wrong-attributed.
--
-- DOMAIN MISMATCH PROVIDERS + ROW COUNTS:
--   Dream Medspa         (Denver, CO)    ~88 rows  (dreamhoustonmedspa.com)
--   Dream spa            (Danbury, CT)   ~6 rows   (dreamhoustonmedspa.com)
--   A New Day Spa        (Sugar Hill, GA) ~74 rows (anewdayspautah.com)
--   Stay Ageless Clinic  (Miami, FL)     ~125 rows (stayageless.net — NY provider)
--   TOTAL:               ~293 rows (all procedure types)
--
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- ════════════════════════════════════════════════════════════════════════
-- PART A — H2a deletions (wrong page type)
-- ════════════════════════════════════════════════════════════════════════

-- A1: LaserAway /weight-loss rows
DELETE FROM provider_pricing pp
USING providers p
WHERE pp.provider_id = p.id
  AND p.name ILIKE '%laseraway%'
  AND pp.source_url ILIKE '%/weight-loss%'
  AND pp.source IN ('cheerio_scraper', 'scrape');

-- A2: Destin Weight Loss and Wellness — entire provider (weight-loss clinic
--     with no neurotoxin services; all prices are weight-loss session fees)
DELETE FROM provider_pricing pp
USING providers p
WHERE pp.provider_id = p.id
  AND p.name ILIKE '%destin weight%'
  AND p.city ILIKE '%destin%'
  AND pp.source IN ('cheerio_scraper', 'scrape');

-- A3: BeautyGoalsLV — all rows (page shows only session/package prices;
--     no per-unit pricing exists; all rows are scraper misparse + ×10 dup)
DELETE FROM provider_pricing pp
USING providers p
WHERE pp.provider_id = p.id
  AND p.name ILIKE '%beautygoalslv%'
  AND pp.source IN ('cheerio_scraper', 'scrape');

-- A4: All other /weight-loss source_url rows for neurotoxin procedures
--     (covers ABQ Medical Spa, MC Modern Skin, Silhouette MD, SkinTight,
--      Viva La Med Spa, and any future cases)
DELETE FROM provider_pricing pp
USING providers p
WHERE pp.provider_id = p.id
  AND pp.source_url ILIKE '%/weight-loss%'
  AND pp.procedure_type ILIKE ANY (
      ARRAY['%botox%','%dysport%','%xeomin%','%jeuveau%','%daxxify%','%neurotox%'])
  AND pp.source IN ('cheerio_scraper', 'scrape');

-- ════════════════════════════════════════════════════════════════════════
-- PART B — Domain mismatch suppression (all procedure types)
-- ════════════════════════════════════════════════════════════════════════
-- Suppressing rather than deleting preserves the rows for audit.
-- suppression_reason = 'domain_mismatch_wrong_city_attribution'

UPDATE provider_pricing pp
SET
  display_suppressed = true,
  suppression_reason = 'domain_mismatch_wrong_city_attribution',
  quality_flag       = 'domain_mismatch',
  relabel_history    = COALESCE(relabel_history, '[]'::jsonb) ||
    jsonb_build_array(jsonb_build_object(
      'action',          'suppress',
      'reason',          'source_url_domain_belongs_to_different_city_provider',
      'timestamp',       now(),
      'evidence_source', 'docs/botox-low-price-investigation.md §5.3'
    ))
WHERE pp.is_active = true
  AND pp.display_suppressed = false
  AND (
    -- Dream Medspa Denver / Dream spa Danbury using Houston domain
    (pp.source_url ILIKE '%dreamhoustonmedspa.com%'
     AND pp.provider_id IN (
       SELECT id FROM providers
       WHERE name ILIKE '%dream medspa%' OR name ILIKE '%dream spa%'
     ))
    -- A New Day Spa Sugar Hill GA using Utah domain
    OR (pp.source_url ILIKE '%anewdayspautah.com%'
        AND pp.provider_id IN (
          SELECT id FROM providers WHERE name ILIKE '%a new day spa%'
        ))
    -- Stay Ageless Miami using NY domain (already in JUNK_DOMAINS)
    OR (pp.source_url ILIKE '%stayageless.net%'
        AND pp.provider_id IN (
          SELECT id FROM providers
          WHERE name ILIKE '%stay ageless%' AND state = 'FL'
        ))
  );

SELECT refresh_city_benchmarks();

COMMIT;

-- ── Verify ────────────────────────────────────────────────────────────────
/*
-- H2a deletions confirmed gone:
SELECT COUNT(*) FROM provider_pricing pp
JOIN providers p ON p.id = pp.provider_id
WHERE (
  (p.name ILIKE '%laseraway%' AND pp.source_url ILIKE '%weight-loss%')
  OR p.name ILIKE '%destin weight%'
  OR p.name ILIKE '%beautygoalslv%'
);

-- Domain mismatch suppressed:
SELECT quality_flag, COUNT(*) FROM provider_pricing
WHERE quality_flag = 'domain_mismatch'
GROUP BY 1;
-- Expected: ~293
*/

-- ── Backlog note (Part 6.3) ───────────────────────────────────────────────
-- FUTURE AUDIT NEEDED: Review whether the source_url → provider_id linkage
-- has a systematic bug that caused the Houston domain to be associated with
-- Denver and Danbury providers. If the scraper resolves provider by domain
-- (not by name+city), there may be more mismatch cases not yet identified.
-- Recommended: one-time cross-check of source_url domain vs providers.state
-- for all cheerio_scraper and scrape rows.

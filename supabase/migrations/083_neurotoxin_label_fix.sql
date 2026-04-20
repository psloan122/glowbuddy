-- 083: Neurotoxin price_label bulk correction
--
-- ROOT CAUSE: Three distinct mislabeling patterns identified across ~279 rows:
--
--   1. flat_package / per_session rows with price < $50
--      These are per_unit prices ($6.50–$49). No neurotoxin session or package
--      legitimately costs under $50. Confirmed via provider_listed spot-check
--      (6 providers; all are clearly $12–$16/unit Dysport/Botox).
--      → Relabel to per_unit.
--
--   2. per_unit rows with price $100–$300
--      All from cheerio_scraper. $100–$300 is a normal per_session range for
--      small-to-medium neurotoxin treatments; impossible as per-unit pricing.
--      → Relabel to per_session.
--
--   3. per_unit rows with price > $300
--      Same scraper source; prices $350–$2700 represent multi-tier package
--      menus scraped as separate rows. Spot-checked: providers have 4–6 rows
--      each at different price tiers — clearly flat session/package prices.
--      → Relabel to flat_package.
--
--   4. per_session rows with price $50–$99
--      Only 2 rows (Glowhaus Denver, $50 and $75). Same provider already has
--      identical-price flat_package rows — these are scraper duplicates.
--      → Suppress (display_suppressed = true), do not relabel.
--
-- APPLIES TO: All neurotoxin-taxonomy procedures (Botox, Dysport, Xeomin,
--             Jeuveau, Daxxify, Neurotoxin) that are active and not already
--             suppressed.
--
-- AFFECTED ROWS: ~279 (201 + 2 + 37 + 37 + 2)
-- SOURCE BREAKDOWN: ~191 cheerio_scraper, 8 provider_listed/csv_import/scrape,
--                   rest community_submitted
--
-- After relabeling, refresh_city_benchmarks() rebuilds city avg tables to
-- reflect corrected labels.
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── Neurotoxin procedure filter (reused across all four UPDATE statements) ──
-- Using a CTE anchor so the filter text lives in one place.

-- ── Fix 1a: flat_package / per_session < $50 — suppress rows that would
--           conflict with an existing per_unit row for the same
--           (provider, procedure, price) tuple.
-- These are true duplicates: the correct per_unit row already exists.
UPDATE provider_pricing pp
SET
  display_suppressed = true,
  suppression_reason = 'duplicate_of_existing_per_unit_row'
WHERE pp.procedure_type ILIKE ANY (
        ARRAY['%botox%','%dysport%','%xeomin%','%jeuveau%','%daxxify%','%neurotox%'])
  AND pp.price_label     IN ('flat_package', 'per_session')
  AND pp.price            < 50
  AND pp.price            > 0
  AND pp.is_active        = true
  AND pp.display_suppressed = false
  AND EXISTS (
    SELECT 1 FROM provider_pricing pp2
    WHERE pp2.provider_id     = pp.provider_id
      AND pp2.procedure_type  = pp.procedure_type
      AND pp2.price           = pp.price
      AND pp2.price_label     = 'per_unit'
      AND pp2.id             != pp.id
  );

-- ── Fix 1b: flat_package / per_session < $50 — relabel rows with no conflict.
UPDATE provider_pricing pp
SET
  price_label  = 'per_unit'
WHERE pp.procedure_type ILIKE ANY (
        ARRAY['%botox%','%dysport%','%xeomin%','%jeuveau%','%daxxify%','%neurotox%'])
  AND pp.price_label     IN ('flat_package', 'per_session')
  AND pp.price            < 50
  AND pp.price            > 0
  AND pp.is_active        = true
  AND pp.display_suppressed = false
  AND NOT EXISTS (
    SELECT 1 FROM provider_pricing pp2
    WHERE pp2.provider_id     = pp.provider_id
      AND pp2.procedure_type  = pp.procedure_type
      AND pp2.price           = pp.price
      AND pp2.price_label     = 'per_unit'
      AND pp2.id             != pp.id
  );

-- ── Fix 2a: per_unit $100–$300 — suppress rows that would conflict with an
--           existing per_session row.
UPDATE provider_pricing pp
SET
  display_suppressed = true,
  suppression_reason = 'duplicate_of_existing_per_session_row'
WHERE pp.procedure_type ILIKE ANY (
        ARRAY['%botox%','%dysport%','%xeomin%','%jeuveau%','%daxxify%','%neurotox%'])
  AND pp.price_label  = 'per_unit'
  AND pp.price        BETWEEN 100 AND 300
  AND pp.is_active    = true
  AND pp.display_suppressed = false
  AND EXISTS (
    SELECT 1 FROM provider_pricing pp2
    WHERE pp2.provider_id     = pp.provider_id
      AND pp2.procedure_type  = pp.procedure_type
      AND pp2.price           = pp.price
      AND pp2.price_label     = 'per_session'
      AND pp2.id             != pp.id
  );

-- ── Fix 2b: per_unit $100–$300 → per_session (no conflict).
UPDATE provider_pricing pp
SET
  price_label  = 'per_session'
WHERE pp.procedure_type ILIKE ANY (
        ARRAY['%botox%','%dysport%','%xeomin%','%jeuveau%','%daxxify%','%neurotox%'])
  AND pp.price_label  = 'per_unit'
  AND pp.price        BETWEEN 100 AND 300
  AND pp.is_active    = true
  AND pp.display_suppressed = false
  AND NOT EXISTS (
    SELECT 1 FROM provider_pricing pp2
    WHERE pp2.provider_id     = pp.provider_id
      AND pp2.procedure_type  = pp.procedure_type
      AND pp2.price           = pp.price
      AND pp2.price_label     = 'per_session'
      AND pp2.id             != pp.id
  );

-- ── Fix 3a: per_unit > $300 — suppress rows that would conflict with an
--           existing flat_package row.
UPDATE provider_pricing pp
SET
  display_suppressed = true,
  suppression_reason = 'duplicate_of_existing_flat_package_row'
WHERE pp.procedure_type ILIKE ANY (
        ARRAY['%botox%','%dysport%','%xeomin%','%jeuveau%','%daxxify%','%neurotox%'])
  AND pp.price_label  = 'per_unit'
  AND pp.price        > 300
  AND pp.is_active    = true
  AND pp.display_suppressed = false
  AND EXISTS (
    SELECT 1 FROM provider_pricing pp2
    WHERE pp2.provider_id     = pp.provider_id
      AND pp2.procedure_type  = pp.procedure_type
      AND pp2.price           = pp.price
      AND pp2.price_label     = 'flat_package'
      AND pp2.id             != pp.id
  );

-- ── Fix 3b: per_unit > $300 → flat_package (no conflict).
UPDATE provider_pricing pp
SET
  price_label  = 'flat_package'
WHERE pp.procedure_type ILIKE ANY (
        ARRAY['%botox%','%dysport%','%xeomin%','%jeuveau%','%daxxify%','%neurotox%'])
  AND pp.price_label  = 'per_unit'
  AND pp.price        > 300
  AND pp.is_active    = true
  AND pp.display_suppressed = false
  AND NOT EXISTS (
    SELECT 1 FROM provider_pricing pp2
    WHERE pp2.provider_id     = pp.provider_id
      AND pp2.procedure_type  = pp.procedure_type
      AND pp2.price           = pp.price
      AND pp2.price_label     = 'flat_package'
      AND pp2.id             != pp.id
  );

-- ── Fix 4: per_session $50–$99 → suppress ────────────────────────────────
-- These are scraper duplicates of existing flat_package rows (confirmed:
-- Glowhaus Denver has flat_package rows at the same $50 and $75 prices).
-- Setting display_suppressed prevents them from appearing in /browse while
-- preserving the rows for audit. Do NOT relabel — they may be ambiguous.
UPDATE provider_pricing
SET
  display_suppressed = true,
  suppression_reason = 'label_ambiguous_mid_session_duplicate'
WHERE procedure_type ILIKE ANY (
        ARRAY['%botox%','%dysport%','%xeomin%','%jeuveau%','%daxxify%','%neurotox%'])
  AND price_label  = 'per_session'
  AND price        BETWEEN 50 AND 99
  AND is_active    = true
  AND display_suppressed = false;

-- ── Rebuild city benchmarks ───────────────────────────────────────────────
SELECT refresh_city_benchmarks();

COMMIT;

-- ── Verify ────────────────────────────────────────────────────────────────
-- Run manually after applying to confirm row counts reached zero:
/*
-- Should return 0 rows if Fix 1 applied cleanly:
SELECT COUNT(*) AS remaining_low_session
FROM provider_pricing
WHERE procedure_type ILIKE ANY(ARRAY['%botox%','%dysport%','%xeomin%','%jeuveau%','%daxxify%','%neurotox%'])
  AND price_label IN ('flat_package','per_session')
  AND price < 50
  AND is_active = true AND display_suppressed = false;

-- Should return 0 rows if Fix 2 + 3 applied cleanly:
SELECT COUNT(*) AS remaining_high_unit
FROM provider_pricing
WHERE procedure_type ILIKE ANY(ARRAY['%botox%','%dysport%','%xeomin%','%jeuveau%','%daxxify%','%neurotox%'])
  AND price_label = 'per_unit'
  AND price > 100
  AND is_active = true AND display_suppressed = false;

-- City benchmark spot-check after rebuild:
SELECT procedure_type, city, state, avg_unit_price, sample_size_unit
FROM city_benchmarks
WHERE city IN ('New York','Los Angeles','Miami')
  AND procedure_type ILIKE '%botox%'
ORDER BY city;
*/

-- 081: Suppress Dysport per_unit rows priced as Botox-equivalent units (BEU)
--
-- ROOT CAUSE:
-- provider_listing = "per unit" for Dysport means different things:
--   • Some providers price per actual Dysport unit  ($4–$8/unit)
--   • Some providers price per Botox-equivalent unit ($10–$14/unit)
--     where 1 BEU ≈ 2.5–3 actual Dysport units
--
-- Confirmed by provider_listed notes field:
--   "Price per unit. Dysport units are smaller than Botox —
--    ~2.5 Dysport units = 1 Botox unit."
--
-- The cheerio_scraper captured "$10–$12/unit" from websites where the
-- provider's "unit" is a BEU, not a Dysport unit. This makes those rows
-- incompatible with actual-unit rows for benchmarking purposes.
--
-- MARKET RESEARCH: Real Dysport per-actual-unit prices = $4–$8 nationally
-- (source: RealSelf, med spa surveys, aesthetics industry pricing guides).
-- Rows above $9 are overwhelmingly BEU-priced, not actual-unit-priced.
--
-- DISTRIBUTION (111 total Dysport per_unit rows, pre-cleanup):
--   $3–$8   (actual unit): 41 rows, avg $5.85   ← correct range
--   $9–$12  (BEU):         62 rows, avg $10.97  ← incompatible — suppress
--   $16–$17 (dupe/BEU):     8 rows, avg $16.19  ← deleted by migration 080b
--
-- FIX: Set display_suppressed = true + suppression_reason on the BEU rows.
-- This removes them from city_benchmarks aggregation (which already
-- filters WHERE display_suppressed = false) without deleting real data.
-- They remain in the table for auditing and potential future relabeling.
--
-- After this migration + 080b DELETE + refresh_city_benchmarks():
--   Dysport avg_unit_price will reflect actual Dysport unit pricing (~$5–$6)
-- ════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- STEP 1 — Preview: rows that will be suppressed (read-only)
-- ────────────────────────────────────────────────────────────────
/*
SELECT
  pp.id,
  prov.name     AS provider_name,
  prov.city,
  prov.state,
  pp.price,
  pp.price_label,
  pp.source,
  pp.notes
FROM provider_pricing pp
JOIN providers prov ON prov.id = pp.provider_id
WHERE pp.procedure_type     = 'Dysport'
  AND pp.price_label        = 'per_unit'
  AND pp.price              > 8
  AND pp.is_active          = true
  AND pp.display_suppressed = false
ORDER BY pp.price DESC, prov.name;
-- Expected: ~70 rows across cheerio_scraper, provider_listed, csv_import
-- (community_submitted rows at $16–16.50 will be removed by 080b DELETE)
*/


-- ────────────────────────────────────────────────────────────────
-- STEP 2 — Suppress BEU-priced Dysport rows
--
-- Threshold: price > 8.00
--   • $8.00 and below: plausible per-actual-unit pricing (keep visible)
--   • $9.00 and above: overwhelmingly BEU or outlier (suppress)
-- Note: community_submitted rows at $16–16.50 are handled by 080b.
-- ────────────────────────────────────────────────────────────────
UPDATE provider_pricing
SET
  display_suppressed  = true,
  suppression_reason  = 'dysport_beu_suspected'
WHERE procedure_type     = 'Dysport'
  AND price_label        = 'per_unit'
  AND price              > 8
  AND is_active          = true
  AND display_suppressed = false;

-- Expected: ~70 rows updated


-- ────────────────────────────────────────────────────────────────
-- STEP 3 — Verify suppression
-- ────────────────────────────────────────────────────────────────
/*
-- Active unsuppressed Dysport per_unit rows remaining:
SELECT
  price,
  source,
  COUNT(*) AS n
FROM provider_pricing
WHERE procedure_type     = 'Dysport'
  AND price_label        = 'per_unit'
  AND is_active          = true
  AND display_suppressed = false
GROUP BY price, source
ORDER BY price;
-- Expected: all rows $3–$8, avg ~$5.85

-- Suppressed rows:
SELECT source, COUNT(*) AS n, ROUND(AVG(price)::numeric,2) AS avg_price
FROM provider_pricing
WHERE procedure_type       = 'Dysport'
  AND suppression_reason   = 'dysport_beu_suspected'
GROUP BY source;
*/


-- ────────────────────────────────────────────────────────────────
-- STEP 4 — Rebuild city_benchmarks after this + 080b cleanup
-- (run this last, after both 080b DELETE and this UPDATE are done)
-- ────────────────────────────────────────────────────────────────
/*
SELECT * FROM refresh_city_benchmarks();
*/

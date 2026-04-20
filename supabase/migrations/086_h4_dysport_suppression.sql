-- ════════════════════════════════════════════════════════════════════════
-- 086: H4 suppression — Dysport per-unit price captured as Botox
-- ════════════════════════════════════════════════════════════════════════
--
-- Evidence: docs/botox-low-price-investigation.md §5.1
-- Mechanism: scraper's PROC_RE matches "Botox" and extracts all prices in the
-- ±100-char context window, capturing the adjacent lower Dysport price
-- ($3–$7/unit) as a second Botox per_unit row.
--
-- FINGERPRINT: provider has both a <$10 Botox per_unit row AND a Dysport
-- per_unit row within $0.50 of the same price.
--
-- PRE-FLIGHT COUNT: 57 rows match the full predicate.
--
-- SAFE ROWS (excluded from this migration, handled in 087/088 instead):
--   • 6 rows where no higher correct Botox row exists (flagged below)
--   • dermani MEDSPA® (5 locations) — H1 membership pricing; Botox $9 and
--     Dysport $9 are both real member rates, not a misattribution
--   • Destin Weight Loss and Wellness — H2a wrong page (handled in 088)
--   • Monaco MedSpa, Miami FL — H3 confirmed real retail ($6/unit)
--
-- NET ROWS TO SUPPRESS: 57 − 6 (no-higher-botox) − 6 (dermani) − 2 (destin)
--                          − 1 (monaco) = ~42 rows
--
-- Requires: migration 085 (quality_flag + relabel_history columns).
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── Step A: Flag the 6 rows where no correct higher Botox row exists ─────
-- These are confirmed H1 cases that happen to show up in the H4 fingerprint
-- (promo/specials page with Dysport also priced at $9). They need manual
-- review before suppression because suppressing leaves the provider with no
-- visible Botox price.
UPDATE provider_pricing pp
SET
  quality_flag    = 'h4_candidate_no_higher_botox_manual_review',
  relabel_history = COALESCE(relabel_history, '[]'::jsonb) ||
    jsonb_build_array(jsonb_build_object(
      'action',          'flagged',
      'reason',          'h4_fingerprint_but_no_higher_botox_row_exists',
      'timestamp',       now(),
      'evidence_source', 'docs/botox-low-price-investigation.md'
    ))
WHERE pp.procedure_type ILIKE '%botox%'
  AND pp.price_label = 'per_unit'
  AND pp.price < 10
  AND pp.is_active = true
  AND pp.display_suppressed = false
  AND pp.source IN ('cheerio_scraper', 'scrape')
  AND EXISTS (
    SELECT 1 FROM provider_pricing pp2
    WHERE pp2.provider_id = pp.provider_id
      AND pp2.procedure_type ILIKE '%dysport%'
      AND pp2.price_label = 'per_unit'
      AND ABS(pp2.price - pp.price) <= 0.50
      AND pp2.is_active = true
  )
  AND NOT EXISTS (
    SELECT 1 FROM provider_pricing pp3
    WHERE pp3.provider_id = pp.provider_id
      AND pp3.procedure_type ILIKE '%botox%'
      AND pp3.price_label = 'per_unit'
      AND pp3.price >= 10
      AND pp3.is_active = true AND pp3.display_suppressed = false
      AND pp3.id != pp.id
  );

-- ── Step B: Suppress clean H4 rows ──────────────────────────────────────
-- Requires: higher correct Botox row exists (safety check)
-- Excludes: dermani (H1 membership), Destin Weight Loss (H2a), Monaco (H3)
UPDATE provider_pricing pp
SET
  display_suppressed = true,
  suppression_reason = 'h4_dysport_price_captured_as_botox',
  quality_flag       = 'h4_suppressed',
  relabel_history    = COALESCE(relabel_history, '[]'::jsonb) ||
    jsonb_build_array(jsonb_build_object(
      'action',          'suppress',
      'reason',          'h4_dysport_misattribution',
      'timestamp',       now(),
      'evidence_source', 'docs/botox-low-price-investigation.md'
    ))
WHERE pp.procedure_type ILIKE '%botox%'
  AND pp.price_label = 'per_unit'
  AND pp.price < 10
  AND pp.is_active = true
  AND pp.display_suppressed = false
  AND pp.source IN ('cheerio_scraper', 'scrape')
  -- Fingerprint: matched Dysport row at same price
  AND EXISTS (
    SELECT 1 FROM provider_pricing pp2
    WHERE pp2.provider_id = pp.provider_id
      AND pp2.procedure_type ILIKE '%dysport%'
      AND pp2.price_label = 'per_unit'
      AND ABS(pp2.price - pp.price) <= 0.50
      AND pp2.is_active = true
  )
  -- Safety: higher Botox row must exist
  AND EXISTS (
    SELECT 1 FROM provider_pricing pp3
    WHERE pp3.provider_id = pp.provider_id
      AND pp3.procedure_type ILIKE '%botox%'
      AND pp3.price_label = 'per_unit'
      AND pp3.price >= 10
      AND pp3.is_active = true AND pp3.display_suppressed = false
      AND pp3.id != pp.id
  )
  -- Exclude dermani (H1: all brands at $9 is real membership pricing)
  AND pp.provider_id NOT IN (
    SELECT id FROM providers
    WHERE name ILIKE '%dermani medspa%'
  )
  -- Exclude Destin Weight Loss (H2a: entire provider deleted in 088)
  AND pp.provider_id NOT IN (
    SELECT id FROM providers
    WHERE name ILIKE '%destin weight%'
  )
  -- Exclude Monaco MedSpa Miami (H3: confirmed real retail $6/unit)
  AND pp.provider_id NOT IN (
    SELECT id FROM providers
    WHERE name ILIKE '%monaco medspa%' AND city = 'Miami'
  );

SELECT refresh_city_benchmarks();

COMMIT;

-- ── Verify ────────────────────────────────────────────────────────────────
/*
-- Should be ~42 for suppressed + ~6 for flagged:
SELECT quality_flag, COUNT(*)
FROM provider_pricing
WHERE quality_flag IN ('h4_suppressed','h4_candidate_no_higher_botox_manual_review')
GROUP BY 1;

-- Confirm no clean H4 rows remain unsuppressed:
SELECT COUNT(*) AS remaining_h4
FROM provider_pricing pp
JOIN provider_pricing pp2 ON pp2.provider_id = pp.provider_id
WHERE pp.procedure_type ILIKE '%botox%'
  AND pp.price_label = 'per_unit' AND pp.price < 10
  AND pp.is_active = true AND pp.display_suppressed = false
  AND pp.source IN ('cheerio_scraper', 'scrape')
  AND pp2.procedure_type ILIKE '%dysport%'
  AND pp2.price_label = 'per_unit'
  AND ABS(pp2.price - pp.price) <= 0.50
  AND pp2.is_active = true
  AND EXISTS (
    SELECT 1 FROM provider_pricing pp3
    WHERE pp3.provider_id = pp.provider_id
      AND pp3.procedure_type ILIKE '%botox%'
      AND pp3.price_label = 'per_unit' AND pp3.price >= 10
      AND pp3.is_active = true AND pp3.display_suppressed = false
      AND pp3.id != pp.id
  )
  AND pp.provider_id NOT IN (
    SELECT id FROM providers WHERE name ILIKE '%dermani%'
    UNION SELECT id FROM providers WHERE name ILIKE '%destin weight%'
    UNION SELECT id FROM providers WHERE name ILIKE '%monaco medspa%'
  );
*/

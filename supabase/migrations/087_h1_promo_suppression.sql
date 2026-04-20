-- ════════════════════════════════════════════════════════════════════════
-- 087: H1 suppression — confirmed promo/membership/new-client pricing
-- ════════════════════════════════════════════════════════════════════════
--
-- Evidence: docs/botox-low-price-investigation.md §3.2
-- Mechanism: scraper ingested per-unit prices from specials pages, new-client
-- landing pages, or membership pricing blocks, without the is_deal flag.
--
-- CONFIRMED PROVIDERS (Part 3.2):
--   Aurea Medical Aesthetics (Providence, RI)  — April Letybo special $8
--   Emagine Med Spa (San Diego, CA)            — "Smooth & Save" specials page $9
--   Center for Medical Aesthetics (Providence) — "NEW CLIENT SPECIAL" $9.99
--   James Christian Cosmetics (Miami Beach)    — promo landing page $7
--   Simply Tox (Salt Lake City)                — Easter special + membership
--   dermani MEDSPA® (5 locations)              — member-only $9 (non-member $11)
--   VIP Aesthetic Center (Hallandale Beach)    — /botox-special URL $9
--   Natura Med Spa Denver                      — specials page $9
--
-- H1 CANDIDATE (unconfirmed) rows from Part 3.1 are flagged with
-- 'needs_review_h1_candidate' rather than suppressed.
--
-- Requires: migration 085 (quality_flag + relabel_history columns).
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── Step A: Suppress confirmed H1 providers ──────────────────────────────
UPDATE provider_pricing pp
SET
  display_suppressed = true,
  suppression_reason = 'h1_confirmed_promo_or_membership_pricing',
  quality_flag       = 'h1_suppressed',
  relabel_history    = COALESCE(relabel_history, '[]'::jsonb) ||
    jsonb_build_array(jsonb_build_object(
      'action',          'suppress',
      'reason',          'h1_promo_membership_new_client',
      'timestamp',       now(),
      'evidence_source', 'docs/botox-low-price-investigation.md §3.2'
    ))
WHERE pp.procedure_type ILIKE '%botox%'
  AND pp.price_label = 'per_unit'
  AND pp.price < 10
  AND pp.is_active = true
  AND pp.display_suppressed = false
  AND pp.source IN ('cheerio_scraper', 'scrape')
  AND pp.provider_id IN (
    SELECT p.id FROM providers p
    WHERE p.name ILIKE ANY (ARRAY[
      '%aurea medical aesthetics%',
      '%emagine med spa%',
      '%center for medical aesthetics%',
      '%james christian cosmetics%',
      '%simply tox%',
      '%dermani medspa%',
      '%vip aesthetic center%',
      '%natura med spa%'
    ])
  );

-- ── Step B: Flag unconfirmed H1 candidates for manual review ─────────────
-- These are scraper rows at $6–$9.99 that are NOT H4, NOT from confirmed H1
-- providers, and NOT H2a/domain-mismatch providers. They may be real retail
-- or real promos — cannot determine without live page fetch.
UPDATE provider_pricing pp
SET
  quality_flag    = 'needs_review_h1_candidate',
  relabel_history = COALESCE(relabel_history, '[]'::jsonb) ||
    jsonb_build_array(jsonb_build_object(
      'action',    'flagged',
      'reason',    'possible_promo_h1_candidate_needs_url_verification',
      'timestamp', now()
    ))
WHERE pp.procedure_type ILIKE '%botox%'
  AND pp.price_label = 'per_unit'
  AND pp.price >= 6 AND pp.price < 10
  AND pp.source IN ('cheerio_scraper', 'scrape')
  AND pp.is_active = true
  AND pp.display_suppressed = false
  AND pp.quality_flag IS NULL   -- not already handled
  -- Not H4 (no matching Dysport at same price)
  AND NOT EXISTS (
    SELECT 1 FROM provider_pricing pp2
    WHERE pp2.provider_id = pp.provider_id
      AND pp2.procedure_type ILIKE '%dysport%'
      AND pp2.price_label = 'per_unit'
      AND ABS(pp2.price - pp.price) <= 0.50
      AND pp2.is_active = true
  )
  -- Not H2a / domain mismatch providers (handled in 088)
  AND pp.provider_id NOT IN (
    SELECT p.id FROM providers p
    WHERE p.name ILIKE ANY (ARRAY[
      '%destin weight%', '%beautygoalslv%', '%laseraway%',
      '%stay ageless%', '%a new day spa%', '%dream medspa%', '%dream spa%',
      '%abq medical spa%', '%mc modern skin%', '%silhouette md%',
      '%skintight medspa%', '%viva la med spa%'
    ])
  )
  -- Not confirmed H3 (Monaco MedSpa)
  AND pp.provider_id NOT IN (
    SELECT p.id FROM providers p
    WHERE p.name ILIKE '%monaco medspa%' AND p.city = 'Miami'
  );

COMMIT;

-- ── Verify ────────────────────────────────────────────────────────────────
/*
SELECT quality_flag, COUNT(*)
FROM provider_pricing
WHERE quality_flag IN ('h1_suppressed', 'needs_review_h1_candidate')
GROUP BY 1;

-- Expected: ~17 suppressed (confirmed H1), ~12-15 flagged (candidates)
*/

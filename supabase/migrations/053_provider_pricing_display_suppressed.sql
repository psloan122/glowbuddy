-- Migration 053: display_suppressed flag on provider_pricing
--
-- Cleans up the initial scraped seed dataset so the UI only surfaces prices
-- we are certain about. Area / package / starting-at pricing is hidden; only
-- confirmed per_unit / per_syringe / per_session / per_month rows remain
-- visible to end users. Suppressed rows stay in the table (for audits and
-- future re-classification) but every read path must filter them out with
-- `.eq('display_suppressed', false)`.
--
-- The spec's column names `price_type` and `procedure_slug` do not exist in
-- this schema — the real columns are `price_label` and `procedure_type`.
-- This migration therefore filters on those plus ILIKE patterns against
-- procedure_type to pick up the Botox/Dysport/Xeomin neurotoxin rows and the
-- filler rows. The mapping is:
--
--   spec price_type  → actual price_label
--   spec procedure_slug='neurotoxin' → procedure_type ILIKE any of
--     ('%botox%','%dysport%','%xeomin%','%jeuveau%','%daxxify%','%neurotoxin%')
--   spec procedure_slug='filler'     → procedure_type ILIKE any of
--     ('%filler%','%juvederm%','%restylane%','%rha%','%versa%','%belotero%')

-- 1. Add columns.
ALTER TABLE provider_pricing
  ADD COLUMN IF NOT EXISTS display_suppressed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS suppression_reason text;

COMMENT ON COLUMN provider_pricing.display_suppressed IS
  'When true, this row is hidden from all consumer-facing queries. Used to remove ambiguous scraped data (area/package/starting-at pricing) from the initial seed.';
COMMENT ON COLUMN provider_pricing.suppression_reason IS
  'Machine-readable tag explaining why the row was suppressed. See migration 053 for the authoritative list.';

-- Index so the .eq('display_suppressed', false) filter added to every read
-- path stays cheap even as the table grows.
CREATE INDEX IF NOT EXISTS idx_provider_pricing_display_visible
  ON provider_pricing (display_suppressed)
  WHERE display_suppressed = false;

-- 2. Suppress area / package / per_treatment / starting_at scrape rows.
UPDATE provider_pricing
SET
  display_suppressed = true,
  suppression_reason = 'area_or_package_pricing_not_per_unit'
WHERE
  source = 'scrape'
  AND (
    price_label IN ('flat_rate_area', 'per_treatment', 'package', 'starting_at')
    OR notes ILIKE '%area%'
    OR notes ILIKE '%flat rate%'
    OR notes ILIKE '%package%'
    OR notes ILIKE '%estimate%'
    OR notes ILIKE '%starting%'
  );

-- 3. Suppress suspiciously low neurotoxin per-unit prices (< $8/unit is
-- almost certainly a misclassified area price the scraper split wrong).
UPDATE provider_pricing
SET
  display_suppressed = true,
  suppression_reason = 'price_too_low_likely_misclassified'
WHERE
  source = 'scrape'
  AND price_label = 'per_unit'
  AND price < 8
  AND (
    procedure_type ILIKE '%botox%'
    OR procedure_type ILIKE '%dysport%'
    OR procedure_type ILIKE '%xeomin%'
    OR procedure_type ILIKE '%jeuveau%'
    OR procedure_type ILIKE '%daxxify%'
    OR procedure_type ILIKE '%neurotoxin%'
  );

-- 4. Suppress suspiciously low filler per-syringe prices (< $200/syringe is
-- almost certainly a misclassified per-0.1ml or lip-flip price).
UPDATE provider_pricing
SET
  display_suppressed = true,
  suppression_reason = 'price_too_low_likely_misclassified'
WHERE
  source = 'scrape'
  AND price_label = 'per_syringe'
  AND price < 200
  AND (
    procedure_type ILIKE '%filler%'
    OR procedure_type ILIKE '%juvederm%'
    OR procedure_type ILIKE '%restylane%'
    OR procedure_type ILIKE '%rha%'
    OR procedure_type ILIKE '%versa%'
    OR procedure_type ILIKE '%belotero%'
  );

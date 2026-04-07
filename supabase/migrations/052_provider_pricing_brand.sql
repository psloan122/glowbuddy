-- Migration 052: brand column on provider_pricing
--
-- Stores the specific neurotoxin brand (Botox/Dysport/Xeomin/Jeuveau/Daxxify)
-- or filler brand (Juvederm/Restylane/RHA/Versa/Belotero/etc.) for a price row
-- when the source explicitly listed it. Null when not specified — the display
-- layer falls back to a price-threshold inference.
--
-- Also retroactively scrubs internal classifier diagnostics that an earlier
-- version of import-validated-prices.js was incorrectly writing into the
-- consumer-facing notes column. Notes for source='scrape' rows are always
-- internal-only and should never be displayed to users.

ALTER TABLE provider_pricing
  ADD COLUMN IF NOT EXISTS brand TEXT;

CREATE INDEX IF NOT EXISTS idx_provider_pricing_brand
  ON provider_pricing(brand);

COMMENT ON COLUMN provider_pricing.brand IS
  'Specific brand for neurotoxins (Botox/Dysport/Xeomin/Jeuveau/Daxxify) or fillers (Juvederm/Restylane/RHA/Versa/Belotero) when explicitly listed by the provider. Null when unspecified — display layer falls back to inference.';

-- One-time cleanup: wipe leaked classifier diagnostics from existing
-- scraped rows. Genuine consumer notes only ever come from manual uploads.
UPDATE provider_pricing
SET notes = NULL
WHERE source = 'scrape'
  AND notes IS NOT NULL;

-- Migration 055 — Price alerts: smart location + brand + radius
--
-- Adds the columns needed by the PROMPT 6 price-alerts upgrade:
--
--   lat, lng        — precise coordinates from Google Places autocomplete
--   radius_miles    — how many miles around (lat, lng) should match
--                     (0 = fall back to exact city string match)
--   zip_code        — preserved from the Places result for display
--   brand           — e.g. "Botox", "Dysport". When set the alert only
--                     fires for provider_pricing rows with a matching brand.
--
-- Existing rows that used the legacy city/state flow get radius_miles=0
-- so matching logic knows to use exact city comparison.

ALTER TABLE price_alerts
  ADD COLUMN IF NOT EXISTS lat          DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng          DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS radius_miles INTEGER DEFAULT 25,
  ADD COLUMN IF NOT EXISTS zip_code     TEXT,
  ADD COLUMN IF NOT EXISTS brand        TEXT;

UPDATE price_alerts
   SET radius_miles = 0
 WHERE lat IS NULL
   AND city IS NOT NULL;

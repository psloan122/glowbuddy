-- 078: Fix providers missing lat/lng so they appear on the map
--
-- Root cause: community submissions create/update provider records but
-- may not supply coordinates if Google Places didn't return geometry.
-- Providers without lat/lng are invisible to map bounding-box queries.
--
-- Step 1: Immediate fix — stamp Mandan, ND providers with city-center
--         coordinates so they surface on the map while the full geocoding
--         backfill runs. The submission flow now calls the Geocoding API
--         on every new submission, so future providers won't need this.
UPDATE providers
SET
  lat       = 46.8258,
  lng       = -100.8896,
  is_active = true
WHERE city ILIKE 'mandan'
  AND state = 'ND'
  AND (lat IS NULL OR lng IS NULL);

-- Step 2: Diagnostic — see how many active providers still need geocoding.
--         Run this SELECT after applying the migration to gauge backfill scope.
--
-- SELECT COUNT(*), state
-- FROM providers
-- WHERE is_active = TRUE
--   AND (lat IS NULL OR lng IS NULL)
-- GROUP BY state
-- ORDER BY COUNT(*) DESC;
--
-- If the count is large (>100), run the Python geocoding script:
--   python scripts/backfill_provider_coords.py
-- That script queries the Geocoding API in batches with exponential backoff.

-- Step 3: Ensure all active providers from community submissions are visible.
--         This is a belt-and-suspenders pass for any provider that has an
--         address but slipped through without is_active = true.
UPDATE providers
SET is_active = true
WHERE is_active IS NULL
  AND google_place_id IS NOT NULL;

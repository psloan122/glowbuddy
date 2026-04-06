-- Schema updates for server-side provider filtering
-- Run these in the Supabase SQL editor

-- New columns on providers table
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS procedure_tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS place_types text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS seed_city text,
  ADD COLUMN IF NOT EXISTS photo_reference text,
  ADD COLUMN IF NOT EXISTS last_google_sync timestamptz;

-- Indexes for fast map viewport queries
CREATE INDEX IF NOT EXISTS idx_providers_lat_lng
  ON providers(lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_providers_city_state
  ON providers(city, state);

-- GIN index for procedure_tags array filtering (the key to fast filtering)
CREATE INDEX IF NOT EXISTS idx_providers_procedure_tags
  ON providers USING GIN(procedure_tags);

CREATE INDEX IF NOT EXISTS idx_providers_google_place_id
  ON providers(google_place_id);

CREATE INDEX IF NOT EXISTS idx_providers_claimed
  ON providers(is_claimed);

-- Postgres function: get unique procedure tags in a city
CREATE OR REPLACE FUNCTION get_procedure_tags_in_city(p_city text)
RETURNS text[]
LANGUAGE sql STABLE
AS $$
  SELECT ARRAY(
    SELECT DISTINCT unnest(procedure_tags)
    FROM providers
    WHERE (p_city IS NULL OR city ILIKE p_city)
    ORDER BY 1
  )
$$;

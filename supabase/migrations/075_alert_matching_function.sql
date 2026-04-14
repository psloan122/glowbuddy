-- 075: PostGIS, geo index, alert matching function, trigger timestamp

-- Enable PostGIS for radius queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add fired_at timestamp to existing triggers table
ALTER TABLE price_alert_triggers
  ADD COLUMN IF NOT EXISTS fired_at timestamptz DEFAULT now();

-- Geo index on providers for ST_DWithin queries
CREATE INDEX IF NOT EXISTS idx_providers_geo
  ON providers USING GIST (
    ST_MakePoint(lng, lat)::geography
  )
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- Active alerts index
CREATE INDEX IF NOT EXISTS idx_price_alerts_active_proc
  ON price_alerts(is_active, procedure_type)
  WHERE is_active = true;

-- Returns all providers matching an alert's criteria.
-- Uses existing column names: procedure_type, max_price, price_unit.
CREATE OR REPLACE FUNCTION get_alert_matches(p_alert_id uuid)
RETURNS TABLE (
  provider_id   uuid,
  provider_name text,
  city          text,
  state         text,
  price         numeric,
  price_unit    text,
  distance_mi   numeric
) AS $$
DECLARE
  a price_alerts%ROWTYPE;
BEGIN
  SELECT * INTO a FROM price_alerts WHERE id = p_alert_id;

  IF a.id IS NULL THEN
    RETURN;
  END IF;

  -- If no max_price set, this alert fires on any new price — skip matching
  IF a.max_price IS NULL OR a.max_price <= 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    prov.id,
    prov.name,
    prov.city,
    prov.state,
    pp.price,
    pp.price_label,
    CASE
      WHEN a.lat IS NOT NULL AND prov.lat IS NOT NULL THEN
        ROUND(
          ST_Distance(
            ST_MakePoint(prov.lng, prov.lat)::geography,
            ST_MakePoint(a.lng, a.lat)::geography
          ) / 1609.34
        )::numeric
      ELSE NULL
    END AS distance_mi
  FROM provider_pricing pp
  JOIN providers prov ON prov.id = pp.provider_id
  WHERE
    -- Match procedure (alert stores category slug like 'neurotoxin';
    -- provider_pricing stores brand like 'Botox'. Match either way.)
    (
      pp.procedure_type = a.procedure_type
      OR (a.brand IS NOT NULL AND pp.brand = a.brand)
      OR (a.brand IS NOT NULL AND pp.procedure_type = a.brand)
    )
    AND pp.price_label = COALESCE(a.price_unit, 'per_unit')
    AND pp.price < a.max_price
    AND pp.confidence_tier <= 3
    AND prov.is_active = true
    AND (
      -- City-only mode (radius = 0)
      (
        (a.radius_miles IS NULL OR a.radius_miles = 0)
        AND LOWER(prov.city) = LOWER(a.city)
        AND prov.state = a.state
      )
      OR
      -- Radius mode
      (
        a.radius_miles > 0
        AND a.lat IS NOT NULL
        AND prov.lat IS NOT NULL
        AND ST_DWithin(
          ST_MakePoint(prov.lng, prov.lat)::geography,
          ST_MakePoint(a.lng, a.lat)::geography,
          a.radius_miles * 1609.34
        )
      )
    )
    -- Don't re-fire for same provider unless price dropped further
    AND NOT EXISTS (
      SELECT 1 FROM price_alert_triggers pat
      WHERE pat.alert_id = a.id
        AND pat.provider_id = prov.id
        AND pat.price_seen <= pp.price
    )
  ORDER BY pp.price ASC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

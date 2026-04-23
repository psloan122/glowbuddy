-- ════════════════════════════════════════════════════════════════════════
-- 093: Fix city matching — ILIKE contains → exact equality
-- ════════════════════════════════════════════════════════════════════════
--
-- Problem: get_provider_price_summary used
--
--   prov.city ILIKE ('%' || p_city || '%')
--
-- which is a substring/contains match.  This means a search for
-- "Portland" also returns providers in "South Portland", "East Portland",
-- etc.  Similarly "New York" pulls in "West New York" and "New York City".
--
-- Because state is matched exactly (prov.state = p_state), Portland ME
-- and Portland OR are NOT cross-contaminated.  But within the same state
-- providers from neighbouring cities leak in:
--
--   "Portland, ME"  ← South Portland, ME
--   "New York, NY"  ← New York City, NY  /  West New York, NY
--   "Springfield, MA" ← West Springfield, MA
--
-- Fix: change city predicate to exact equality.
--
-- "South Portland" and "Portland" are different cities; if the user
-- selects "Portland" from the autocomplete they should see Portland only.
-- The autocomplete itself uses a starts-with ILIKE (see FindPrices.jsx
-- line 864) so partial-name discovery still works at search time.
--
-- DROP required: changing the WHERE predicate in the STABLE function
-- body — CREATE OR REPLACE is allowed here, but DROP+CREATE is used for
-- clarity and to keep the definition self-contained.
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

DROP FUNCTION IF EXISTS get_provider_price_summary(text, text, text, text);

CREATE OR REPLACE FUNCTION get_provider_price_summary(
  p_procedure_type  text,
  p_city            text,
  p_state           text,
  p_price_label     text DEFAULT 'per_unit'
)
RETURNS TABLE (
  provider_id        uuid,
  provider_name      text,
  provider_slug      text,
  lat                float8,
  lng                float8,
  min_price          numeric,
  median_price       numeric,
  max_price          numeric,
  sample_size        integer,
  latest_created_at  timestamptz,
  city_sample_size   integer,
  city_trimmed_mean  numeric,
  city_p25           numeric,
  city_p75           numeric,
  city_min           numeric,
  city_max           numeric,
  city_is_reliable   boolean
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH filtered AS (
    -- Single source of truth for the filter predicate (see §5 of
    -- docs/data-quality-decisions.md — do not duplicate this WHERE clause).
    --
    -- City: exact equality.  Previously ILIKE contains caused South Portland
    -- to leak into Portland results, West New York into New York, etc.
    -- State: already exact (= p_state) — unchanged.
    SELECT
      pp.price,
      pp.created_at,
      prov.id   AS pid,
      prov.name AS pname,
      prov.slug AS pslug,
      prov.lat  AS plat,
      prov.lng  AS plng
    FROM provider_pricing pp
    JOIN providers prov ON prov.id = pp.provider_id
    WHERE pp.procedure_type    ILIKE ('%' || p_procedure_type || '%')
      AND prov.city            = p_city
      AND prov.state           = p_state
      AND pp.price_label       = p_price_label
      AND pp.is_active         = true
      AND pp.display_suppressed = false
      AND pp.price             > 0
  ),

  ranked AS (
    SELECT price,
           PERCENT_RANK() OVER (ORDER BY price) AS pr
    FROM filtered
  ),

  city AS (
    SELECT
      COUNT(*)::integer                                                        AS n,
      CASE WHEN COUNT(*) >= 5
           THEN ROUND(
                  AVG(price) FILTER (WHERE pr BETWEEN 0.10 AND 0.90)::numeric,
                  2
                )
      END                                                                      AS trimmed,
      ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY price)::numeric, 2)  AS p25,
      ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY price)::numeric, 2)  AS p75,
      ROUND(MIN(price)::numeric, 2)                                            AS cmin,
      ROUND(MAX(price)::numeric, 2)                                            AS cmax
    FROM ranked
  )

  SELECT
    f.pid                                                                      AS provider_id,
    f.pname                                                                    AS provider_name,
    f.pslug                                                                    AS provider_slug,
    f.plat::float8                                                             AS lat,
    f.plng::float8                                                             AS lng,
    ROUND(MIN(f.price)::numeric, 2)                                            AS min_price,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY f.price)::numeric, 2)   AS median_price,
    ROUND(MAX(f.price)::numeric, 2)                                            AS max_price,
    COUNT(*)::integer                                                           AS sample_size,
    MAX(f.created_at)                                                           AS latest_created_at,
    city.n                                                                      AS city_sample_size,
    city.trimmed                                                                AS city_trimmed_mean,
    city.p25                                                                    AS city_p25,
    city.p75                                                                    AS city_p75,
    city.cmin                                                                   AS city_min,
    city.cmax                                                                   AS city_max,
    (city.n >= 5)                                                               AS city_is_reliable
  FROM filtered f
  CROSS JOIN city
  GROUP BY f.pid, f.pname, f.pslug, f.plat, f.plng,
           city.n, city.trimmed, city.p25, city.p75, city.cmin, city.cmax
  ORDER BY MIN(f.price) ASC;
$$;

-- ── Post-apply smoke test ─────────────────────────────────────────────
-- Portland ME should return only Portland providers, not South Portland.
-- Run manually after applying:
--
--   SELECT provider_name, min_price, p.city
--   FROM get_provider_price_summary('botox', 'Portland', 'ME', 'per_unit') rpc
--   JOIN providers p ON p.id = rpc.provider_id;
--   -- Expected: city = 'Portland' only, no 'South Portland' rows.
--
--   SELECT provider_name, min_price, p.city
--   FROM get_provider_price_summary('botox', 'New York', 'NY', 'per_unit') rpc
--   JOIN providers p ON p.id = rpc.provider_id
--   LIMIT 5;
--   -- Expected: city = 'New York' only, no 'West New York' or 'New York City'.

COMMIT;

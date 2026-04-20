-- ════════════════════════════════════════════════════════════════════════
-- 091: get_provider_price_summary v2 — shared CTE + city_is_reliable
-- ════════════════════════════════════════════════════════════════════════
--
-- Two amendments from review:
--
--   3.1  Refactored from plpgsql to sql (LANGUAGE sql) using a single
--        shared `filtered` CTE as the source of truth for the filter
--        predicate. The original plpgsql version duplicated the WHERE
--        clause in two separate query blocks, which caused the city-level
--        aggregates (header avg) and the per-provider rows (map pins) to
--        silently diverge whenever one block was updated without the other.
--
--   3.2  Added city_is_reliable boolean to the return type. true when
--        city_sample_size >= 5 (matches city_benchmarks.is_reliable).
--        city_trimmed_mean is also nulled at N < 5 to match migration 090.
--
-- IMPORTANT: the `filtered` CTE is the single source of truth for which
-- rows feed both the per-provider results and the city-level aggregates.
-- Do not duplicate the WHERE predicate elsewhere in this function —
-- divergence between the two would re-introduce the bug this function was
-- built to prevent (header/map mismatch on /browse, April 2026).
-- See docs/data-quality-decisions.md §5.
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- DROP required: adding city_is_reliable to return type — CREATE OR REPLACE
-- cannot change the return type signature in-place.
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
    -- Single source of truth for the filter predicate.
    -- Both city-level aggregates and per-provider rows read from here.
    -- If you change the WHERE conditions, they change for both —
    -- no risk of header/pin mismatch from split predicates.
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
      AND prov.city            ILIKE ('%' || p_city || '%')
      AND prov.state           = p_state
      AND pp.price_label       = p_price_label
      AND pp.is_active         = true
      AND pp.display_suppressed = false
      AND pp.price             > 0
  ),

  ranked AS (
    -- PERCENT_RANK over the full filtered set for trimmed mean.
    SELECT price,
           PERCENT_RANK() OVER (ORDER BY price) AS pr
    FROM filtered
  ),

  city AS (
    -- City-level stats computed once from ranked.
    -- trimmed_mean is NULL when n < 5 (matches city_benchmarks behavior).
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

COMMIT;

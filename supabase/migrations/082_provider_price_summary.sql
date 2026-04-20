-- 082: Unified provider price summary RPC
--
-- ROOT CAUSE: /browse had three independent price display surfaces that
-- aggregated the same `provider_pricing` rowset with different filters:
--
--   • Header (PriceContextBar) correctly filtered to normalized_compare_unit='per unit'
--   • Map pins (GlowMap) used min(normalized_compare_value) across ALL labels —
--     a per_session=$55 row produced a "$55" pin alongside a per_unit city avg of $9
--   • Cards (MapListCard) fell back to 'per_unit' label for unlabeled patient rows
--
-- Additionally, the client query has `.limit(40)` sorted by scraped_at desc,
-- so the header avg was computed from a non-representative sample (e.g., NYC has
-- 27 per_unit Botox rows but only 9 appeared in the 40-row window).
--
-- FIX:
--   1. This function is the single source of truth for price stats on /browse.
--      It runs over ALL rows (no row cap), returns per-provider summaries, and
--      attaches city-level aggregates (trimmed mean, p25, p75, min, max) to every
--      row so the client can read them from data[0] without a second query.
--   2. GlowMap receives `activePriceLabel` and skips rows not matching it when
--      selecting bestPrice for map pin labels (see React changes).
--   3. MapListCard leadPrice is built from the matching-label row only.
--
-- USAGE (from Supabase client):
--   supabase.rpc('get_provider_price_summary', {
--     p_procedure_type: 'botox',    -- ILIKE token, e.g. 'botox', 'dysport'
--     p_city:           'New York',
--     p_state:          'NY',
--     p_price_label:    'per_unit'  -- 'per_unit' | 'per_session' | 'per_syringe' | etc.
--   })
-- ════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_provider_price_summary(
  p_procedure_type  text,
  p_city            text,
  p_state           text,
  p_price_label     text DEFAULT 'per_unit'
)
RETURNS TABLE (
  -- Per-provider fields
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
  -- City aggregate — same value on every row; read from data[0]
  city_sample_size   integer,
  city_trimmed_mean  numeric,     -- 10% trimmed mean (robust to outliers)
  city_p25           numeric,     -- 25th percentile
  city_p75           numeric,     -- 75th percentile
  city_min           numeric,
  city_max           numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_city_n     integer;
  v_trimmed    numeric;
  v_p25        numeric;
  v_p75        numeric;
  v_city_min   numeric;
  v_city_max   numeric;
BEGIN
  -- ── City-level stats ────────────────────────────────────────────────
  -- Computed once over ALL qualifying rows (no row cap).
  -- Trimmed mean excludes the bottom 10% and top 10% by PERCENT_RANK,
  -- which is more robust than plain AVG when a city has extreme outliers.

  WITH ranked AS (
    SELECT
      pp.price,
      PERCENT_RANK() OVER (ORDER BY pp.price) AS pr
    FROM provider_pricing pp
    JOIN providers prov ON prov.id = pp.provider_id
    WHERE pp.procedure_type  ILIKE ('%' || p_procedure_type || '%')
      AND prov.city          ILIKE ('%' || p_city || '%')
      AND prov.state         = p_state
      AND pp.price_label     = p_price_label
      AND pp.is_active       = true
      AND pp.display_suppressed = false
      AND pp.price           > 0
  )
  SELECT
    COUNT(*)::integer,
    ROUND(
      AVG(price) FILTER (WHERE pr BETWEEN 0.10 AND 0.90)::numeric,
      2
    ),
    ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY price)::numeric, 2),
    ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY price)::numeric, 2),
    ROUND(MIN(price)::numeric, 2),
    ROUND(MAX(price)::numeric, 2)
  INTO v_city_n, v_trimmed, v_p25, v_p75, v_city_min, v_city_max
  FROM ranked;

  -- ── Per-provider rows ────────────────────────────────────────────────
  -- One row per provider that has at least one qualifying row.
  -- City aggregate is attached to every row so consumers read it from data[0].

  RETURN QUERY
  SELECT
    prov.id                                                                       AS provider_id,
    prov.name                                                                     AS provider_name,
    prov.slug                                                                     AS provider_slug,
    prov.lat::float8,
    prov.lng::float8,
    ROUND(MIN(pp.price)::numeric, 2)                                              AS min_price,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY pp.price)::numeric, 2)      AS median_price,
    ROUND(MAX(pp.price)::numeric, 2)                                              AS max_price,
    COUNT(*)::integer                                                              AS sample_size,
    MAX(pp.created_at)                                                            AS latest_created_at,
    v_city_n                                                                      AS city_sample_size,
    v_trimmed                                                                     AS city_trimmed_mean,
    v_p25                                                                         AS city_p25,
    v_p75                                                                         AS city_p75,
    v_city_min                                                                    AS city_min,
    v_city_max                                                                    AS city_max
  FROM provider_pricing pp
  JOIN providers prov ON prov.id = pp.provider_id
  WHERE pp.procedure_type  ILIKE ('%' || p_procedure_type || '%')
    AND prov.city          ILIKE ('%' || p_city || '%')
    AND prov.state         = p_state
    AND pp.price_label     = p_price_label
    AND pp.is_active       = true
    AND pp.display_suppressed = false
    AND pp.price           > 0
  GROUP BY prov.id, prov.name, prov.slug, prov.lat, prov.lng
  ORDER BY MIN(pp.price) ASC;
END;
$$;

COMMENT ON FUNCTION get_provider_price_summary IS
  'Unified price summary for /browse. Returns one row per provider with '
  'min/median/max price and sample size for the requested price_label, '
  'plus city-level aggregates (10% trimmed mean, p25, p75, min, max) '
  'attached to every row. All three /browse surfaces (header, map pins, '
  'provider cards) consume this single rowset to ensure price consistency. '
  'Run after any bulk price import or suppression change.';

-- ── Verify ────────────────────────────────────────────────────────────
-- Smoke test: should return rows for major cities with neurotoxin data.
-- Uncomment to run manually after applying:
/*
SELECT provider_name, min_price, city_trimmed_mean, city_sample_size
FROM get_provider_price_summary('botox', 'New York', 'NY', 'per_unit')
ORDER BY min_price ASC;
-- Expected: 19 rows, city_trimmed_mean ≈ 13.34, city_min = 5.00

SELECT provider_name, min_price, city_trimmed_mean, city_sample_size
FROM get_provider_price_summary('botox', 'Los Angeles', 'CA', 'per_unit')
ORDER BY min_price ASC;
-- Expected: 16 rows, city_trimmed_mean ≈ 11.29, city_min = 7.00

SELECT provider_name, min_price, city_trimmed_mean, city_sample_size
FROM get_provider_price_summary('botox', 'Miami', 'FL', 'per_unit')
ORDER BY min_price ASC;
-- Expected: 3 rows, city_trimmed_mean ≈ 9.47, city_min = 6.00
*/

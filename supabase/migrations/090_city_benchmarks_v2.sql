-- ════════════════════════════════════════════════════════════════════════
-- 090: city_benchmarks redesign — per-tier separation + trimmed means
-- ════════════════════════════════════════════════════════════════════════
--
-- Pre-flight (run before applying):
--   1. All legacy columns confirmed nullable (is_nullable = YES) — no
--      NOT NULL guards on INSERT path required, but COALESCE applied
--      below as belt-and-braces.
--   2. No FK references to city_benchmarks — TRUNCATE is safe.
--   3. PostgreSQL 17.6 — GENERATED ALWAYS AS STORED is fully supported.
--
-- New columns added:
--   Unit tier:  trimmed_mean_unit_price, median_unit_price, n_unit
--   Visit tier: trimmed_mean_visit_price, median_visit_price, n_visit
--   Area tier:  avg_area_price, n_area
--   Vial tier:  avg_vial_price, n_vial
--   Derived:    is_reliable  GENERATED ALWAYS AS (n_unit >= 5) STORED
--
-- Nulling rule for avg / trimmed_mean: NULL when n < 5 (too noisy).
-- median always populated — it is robust even at N=1.
-- is_reliable is the canonical downstream reliability check.
--
-- Legacy columns (unit_price_count, visit_price_count,
-- estimated_visit_from_units, total_records) are kept and synced by the
-- refresh function so existing consumers are not broken.
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── Statement A: add underlying columns first ─────────────────────────
-- Separated from Statement B so n_unit physically exists in the catalog
-- before the GENERATED column references it (belt-and-braces — PG 17
-- handles same-statement ordering, but this is unambiguous).

ALTER TABLE city_benchmarks
  ADD COLUMN IF NOT EXISTS trimmed_mean_unit_price  numeric,
  ADD COLUMN IF NOT EXISTS median_unit_price         numeric,
  ADD COLUMN IF NOT EXISTS n_unit                    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trimmed_mean_visit_price  numeric,
  ADD COLUMN IF NOT EXISTS median_visit_price        numeric,
  ADD COLUMN IF NOT EXISTS n_visit                   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_area_price            numeric,
  ADD COLUMN IF NOT EXISTS n_area                    integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_vial_price            numeric,
  ADD COLUMN IF NOT EXISTS n_vial                    integer NOT NULL DEFAULT 0;

-- ── Statement B: add generated column that depends on n_unit ──────────

ALTER TABLE city_benchmarks
  ADD COLUMN IF NOT EXISTS is_reliable boolean
    GENERATED ALWAYS AS (COALESCE(n_unit, 0) >= 5) STORED;

-- ── Rewrite refresh_city_benchmarks() ────────────────────────────────
-- DROP required: changing return type from TABLE(rows_inserted bigint)
-- to integer — CREATE OR REPLACE cannot change return type in-place.

DROP FUNCTION IF EXISTS refresh_city_benchmarks();

CREATE OR REPLACE FUNCTION refresh_city_benchmarks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  n integer;
BEGIN
  -- No FK references to this table (confirmed pre-flight).
  -- TRUNCATE is faster than DELETE and safe here.
  TRUNCATE city_benchmarks;

  WITH base AS (
    -- All active, unsuppressed, positively-priced rows with a valid city.
    SELECT
      prov.city,
      prov.state,
      pp.procedure_type,
      pp.price,
      pp.price_label
    FROM provider_pricing pp
    JOIN providers prov ON prov.id = pp.provider_id
    WHERE pp.is_active          = true
      AND pp.display_suppressed = false
      AND pp.price              > 0
      AND prov.city             IS NOT NULL
      AND prov.state            IS NOT NULL
  ),

  -- Per-unit PERCENT_RANK within each (city, state, procedure_type) group.
  -- Used to compute 10%–90% trimmed mean.
  unit_ranked AS (
    SELECT city, state, procedure_type, price,
      PERCENT_RANK() OVER (
        PARTITION BY city, state, procedure_type
        ORDER BY price
      ) AS pr
    FROM base
    WHERE price_label = 'per_unit'
  ),

  -- Per-visit ranking (per_session + flat_package combined into one tier).
  visit_ranked AS (
    SELECT city, state, procedure_type, price,
      PERCENT_RANK() OVER (
        PARTITION BY city, state, procedure_type
        ORDER BY price
      ) AS pr
    FROM base
    WHERE price_label IN ('per_session', 'flat_package')
  ),

  unit_stats AS (
    SELECT
      city, state, procedure_type,
      COUNT(*)::integer                                                       AS n_unit,
      -- avg and trimmed_mean are NULL when n < 5 — too noisy to show.
      -- median is always populated (robust even at N=1).
      CASE WHEN COUNT(*) >= 5
           THEN ROUND(AVG(price)::numeric, 2)
      END                                                                     AS avg_unit_price,
      CASE WHEN COUNT(*) >= 5
           THEN ROUND(
                  AVG(price) FILTER (WHERE pr BETWEEN 0.10 AND 0.90)::numeric,
                  2
                )
      END                                                                     AS trimmed_mean_unit_price,
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price)::numeric, 2)  AS median_unit_price
    FROM unit_ranked
    GROUP BY city, state, procedure_type
  ),

  visit_stats AS (
    SELECT
      city, state, procedure_type,
      COUNT(*)::integer                                                       AS n_visit,
      CASE WHEN COUNT(*) >= 5
           THEN ROUND(AVG(price)::numeric, 2)
      END                                                                     AS avg_visit_price,
      CASE WHEN COUNT(*) >= 5
           THEN ROUND(
                  AVG(price) FILTER (WHERE pr BETWEEN 0.10 AND 0.90)::numeric,
                  2
                )
      END                                                                     AS trimmed_mean_visit_price,
      ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price)::numeric, 2)  AS median_visit_price
    FROM visit_ranked
    GROUP BY city, state, procedure_type
  ),

  area_stats AS (
    SELECT
      city, state, procedure_type,
      COUNT(*)::integer             AS n_area,
      ROUND(AVG(price)::numeric, 2) AS avg_area_price
    FROM base
    WHERE price_label = 'per_area'
    GROUP BY city, state, procedure_type
  ),

  vial_stats AS (
    SELECT
      city, state, procedure_type,
      COUNT(*)::integer             AS n_vial,
      ROUND(AVG(price)::numeric, 2) AS avg_vial_price
    FROM base
    WHERE price_label = 'per_vial'
    GROUP BY city, state, procedure_type
  ),

  -- Union all distinct groups so every (city, state, procedure_type) that
  -- has ANY active row gets a benchmark entry, even if it only has area or
  -- vial rows (no unit rows).
  all_groups AS (
    SELECT DISTINCT city, state, procedure_type FROM base
  )

  INSERT INTO city_benchmarks (
    city, state, procedure_type,
    -- New per-tier columns
    avg_unit_price, trimmed_mean_unit_price, median_unit_price, n_unit,
    avg_visit_price, trimmed_mean_visit_price, median_visit_price, n_visit,
    avg_area_price, n_area,
    avg_vial_price, n_vial,
    -- Legacy columns kept for backwards compat — synced from new values.
    -- All are nullable (confirmed pre-flight), but COALESCE applied
    -- belt-and-braces. estimated_visit_from_units uses NULL (not 0)
    -- as fallback — 0 would be semantically wrong for "unknown avg".
    unit_price_count,
    visit_price_count,
    estimated_visit_from_units,
    total_records,
    updated_at
  )
  SELECT
    g.city,
    g.state,
    g.procedure_type,
    u.avg_unit_price,
    u.trimmed_mean_unit_price,
    u.median_unit_price,
    COALESCE(u.n_unit,  0),
    v.avg_visit_price,
    v.trimmed_mean_visit_price,
    v.median_visit_price,
    COALESCE(v.n_visit, 0),
    a.avg_area_price,
    COALESCE(a.n_area,  0),
    vi.avg_vial_price,
    COALESCE(vi.n_vial, 0),
    -- Legacy: unit_price_count
    COALESCE(u.n_unit,  0),
    -- Legacy: visit_price_count
    COALESCE(v.n_visit, 0),
    -- Legacy: estimated_visit_from_units
    -- NULL when avg_unit_price is NULL (n_unit < 5): NULL × 28 = NULL in SQL.
    -- COALESCE belt-and-braces with NULL (not 0) to avoid misleading zeros.
    ROUND(COALESCE(u.avg_unit_price * 28, NULL)::numeric, 2),
    -- Legacy: total_records
    COALESCE(u.n_unit, 0) + COALESCE(v.n_visit, 0)
      + COALESCE(a.n_area, 0) + COALESCE(vi.n_vial, 0),
    now()
  FROM all_groups g
  LEFT JOIN unit_stats  u  USING (city, state, procedure_type)
  LEFT JOIN visit_stats v  USING (city, state, procedure_type)
  LEFT JOIN area_stats  a  USING (city, state, procedure_type)
  LEFT JOIN vial_stats  vi USING (city, state, procedure_type);

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- ── Rebuild with new logic ────────────────────────────────────────────
SELECT refresh_city_benchmarks();

-- ── Post-apply verification (runs inside transaction; rolls back on fail) ──
DO $$
DECLARE
  row_count       integer;
  null_avg_count  integer;
  reliable_count  integer;
BEGIN
  SELECT COUNT(*) INTO row_count FROM city_benchmarks;

  SELECT COUNT(*) INTO null_avg_count
  FROM city_benchmarks
  WHERE n_unit >= 5 AND avg_unit_price IS NULL;

  SELECT COUNT(*) INTO reliable_count
  FROM city_benchmarks
  WHERE is_reliable = true;

  IF row_count = 0 THEN
    RAISE EXCEPTION 'city_benchmarks is empty after rebuild';
  END IF;

  IF null_avg_count > 0 THEN
    RAISE EXCEPTION
      'Found % rows where n_unit >= 5 but avg_unit_price IS NULL — '
      'CASE WHEN guard may be broken',
      null_avg_count;
  END IF;

  RAISE NOTICE 'city_benchmarks rebuilt: % rows total, % reliable cities',
    row_count, reliable_count;
END $$;

COMMIT;

-- ── Part 1.4 sample checks (run manually after apply) ─────────────────
/*
-- Low-N cities: avg should be NULL, median should be populated.
SELECT city, state, n_unit,
       avg_unit_price, trimmed_mean_unit_price, median_unit_price,
       is_reliable
FROM city_benchmarks
WHERE n_unit > 0 AND n_unit < 5
  AND procedure_type ILIKE '%botox%'
ORDER BY n_unit
LIMIT 5;

-- High-N cities: trimmed_mean should differ from raw avg.
SELECT city, state, n_unit,
       avg_unit_price, trimmed_mean_unit_price,
       ROUND(avg_unit_price - trimmed_mean_unit_price, 2) AS delta
FROM city_benchmarks
WHERE n_unit >= 20
  AND procedure_type ILIKE '%botox%'
ORDER BY n_unit DESC
LIMIT 5;

-- Reliable city count (target: >= 30 pre-launch).
SELECT COUNT(*) AS reliable_botox_cities
FROM city_benchmarks
WHERE is_reliable = true
  AND procedure_type ILIKE '%botox%';
*/

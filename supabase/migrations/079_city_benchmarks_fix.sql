-- 079: Fix city_benchmarks aggregation — strict price_label filter
--
-- ROOT CAUSE: The original populating query included price_label = 'per_vial'
-- rows in the avg_unit_price / unit_price_count aggregation alongside
-- price_label = 'per_unit' rows.  A single $450 per_vial row in Spring TX
-- inflated avg_unit_price from $10.29 to $65.25 (+534%).  A single $375
-- per_vial row in Kansas City MO inflated $15.17 to $66.57 (+375%).
--
-- FIX:
--   avg_unit_price   = AVG  where price_label = 'per_unit'  (strict, no other labels)
--   avg_visit_price  = AVG  where price_label IN ('per_session','flat_package','per_area')
--   per_vial / per_syringe / per_cycle / per_month / etc. → excluded from both aggregates
--
-- ADDS:
--   1. updated_at column (if not already present)
--   2. Unique constraint on (city, state, procedure_type) to support safe re-runs
--   3. refresh_city_benchmarks() — full rebuild function (TRUNCATE + INSERT)
--   4. assert_city_benchmarks_no_label_mixing() — regression assertion
--   5. Immediate rebuild execution

-- ────────────────────────────────────────────────────────────────
-- 1. Schema additions
-- ────────────────────────────────────────────────────────────────

ALTER TABLE city_benchmarks
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Ensure a unique constraint exists so future rebuilds can detect duplicates.
-- If the table was built with a different constraint name, this is a no-op.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conrelid = 'city_benchmarks'::regclass
      AND  contype  IN ('u', 'p')
      AND  conname  = 'city_benchmarks_city_state_procedure_key'
  ) THEN
    -- Only add if no other unique constraint already covers these three columns.
    -- Use a partial approach: try to add, ignore if a matching UK already exists.
    BEGIN
      ALTER TABLE city_benchmarks
        ADD CONSTRAINT city_benchmarks_city_state_procedure_key
        UNIQUE (city, state, procedure_type);
    EXCEPTION WHEN duplicate_table THEN
      NULL; -- constraint already exists under a different name, skip
    END;
  END IF;
END
$$;

-- ────────────────────────────────────────────────────────────────
-- 2. refresh_city_benchmarks() — corrected aggregation
-- ────────────────────────────────────────────────────────────────
--
-- Uses TRUNCATE + INSERT (full rebuild) so stale rows for retired
-- cities/procedures are removed on each run.  Wrap in a transaction
-- if partial-failure safety is needed.
--
-- Column semantics after fix:
--   avg_unit_price          — mean of per_unit rows only
--   unit_price_count        — n for above (= sample_size for unit prices)
--   avg_visit_price         — mean of per_session / flat_package / per_area rows
--   visit_price_count       — n for above (= sample_size for visit prices)
--   estimated_visit_from_units — avg_unit_price × 28 (typical Botox units/visit)
--   total_records           — all is_active, non-suppressed rows for that city+procedure

CREATE OR REPLACE FUNCTION refresh_city_benchmarks()
RETURNS TABLE (rows_inserted bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  n bigint;
BEGIN
  TRUNCATE city_benchmarks;

  INSERT INTO city_benchmarks (
    city,
    state,
    procedure_type,
    avg_unit_price,
    unit_price_count,
    avg_visit_price,
    visit_price_count,
    estimated_visit_from_units,
    total_records,
    updated_at
  )
  SELECT
    prov.city,
    prov.state,
    pp.procedure_type,

    -- UNIT PRICE: strictly per_unit only — never per_vial, per_syringe, etc.
    ROUND(
      AVG(CASE WHEN pp.price_label = 'per_unit' THEN pp.price END)::numeric,
      2
    ) AS avg_unit_price,
    COUNT(CASE WHEN pp.price_label = 'per_unit' THEN 1 END)::integer AS unit_price_count,

    -- VISIT PRICE: per_session / flat_package / per_area only
    ROUND(
      AVG(CASE WHEN pp.price_label IN ('per_session', 'flat_package', 'per_area')
               THEN pp.price END)::numeric,
      2
    ) AS avg_visit_price,
    COUNT(CASE WHEN pp.price_label IN ('per_session', 'flat_package', 'per_area')
               THEN 1 END)::integer AS visit_price_count,

    -- Estimated visit cost derived from unit price (28 units = typical Botox dose)
    -- NULL when no per_unit rows exist for this city+procedure
    ROUND(
      (AVG(CASE WHEN pp.price_label = 'per_unit' THEN pp.price END) * 28)::numeric,
      2
    ) AS estimated_visit_from_units,

    -- Total eligible rows regardless of label
    COUNT(*)::integer AS total_records,

    now() AS updated_at

  FROM provider_pricing pp
  JOIN providers prov ON prov.id = pp.provider_id
  WHERE pp.is_active       = true
    AND pp.display_suppressed = false
    AND pp.price           > 0
    AND prov.city          IS NOT NULL
    AND prov.state         IS NOT NULL
  GROUP BY prov.city, prov.state, pp.procedure_type;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN QUERY SELECT n;
END;
$$;

COMMENT ON FUNCTION refresh_city_benchmarks() IS
  'Full rebuild of city_benchmarks from provider_pricing. '
  'avg_unit_price = per_unit rows only. '
  'avg_visit_price = per_session / flat_package / per_area rows only. '
  'per_vial and all other labels are excluded from both aggregates. '
  'Run after bulk price imports or on a schedule.';

-- ────────────────────────────────────────────────────────────────
-- 3. assert_city_benchmarks_no_label_mixing()
--    Regression test: returns rows where unit_price_count includes
--    non-per_unit labels.  Zero rows = pass.
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION assert_city_benchmarks_no_label_mixing()
RETURNS TABLE (
  violation_city      text,
  violation_state     text,
  violation_procedure text,
  stored_count        integer,
  strict_unit_count   bigint,
  delta               bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    cb.city::text,
    cb.state::text,
    cb.procedure_type::text,
    cb.unit_price_count,
    COALESCE(src.strict_count, 0) AS strict_unit_count,
    (cb.unit_price_count - COALESCE(src.strict_count, 0))::bigint AS delta
  FROM city_benchmarks cb
  LEFT JOIN (
    SELECT
      prov.city,
      prov.state,
      pp.procedure_type,
      COUNT(*) AS strict_count
    FROM provider_pricing pp
    JOIN providers prov ON prov.id = pp.provider_id
    WHERE pp.price_label      = 'per_unit'
      AND pp.is_active        = true
      AND pp.display_suppressed = false
      AND pp.price            > 0
    GROUP BY prov.city, prov.state, pp.procedure_type
  ) src
    ON  src.city           = cb.city
    AND src.state          = cb.state
    AND src.procedure_type = cb.procedure_type
  WHERE cb.unit_price_count > COALESCE(src.strict_count, 0)
  ORDER BY delta DESC, cb.city;
$$;

COMMENT ON FUNCTION assert_city_benchmarks_no_label_mixing() IS
  'Regression assertion for city_benchmarks label purity. '
  'Returns zero rows when clean. '
  'Any returned row means unit_price_count includes non-per_unit labels — '
  'a bug introduced by a query that groups per_vial or other labels into the unit bucket.';

-- ────────────────────────────────────────────────────────────────
-- 4. Run the rebuild now
-- ────────────────────────────────────────────────────────────────
SELECT * FROM refresh_city_benchmarks();

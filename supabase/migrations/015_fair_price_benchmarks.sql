-- 015: Fair Price Benchmarks
-- Cache table for aggregated price data, refreshed by admin via refresh_price_benchmarks()

CREATE TABLE IF NOT EXISTS price_benchmarks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  procedure_type text NOT NULL,
  state text NOT NULL,
  city text,
  avg_price numeric NOT NULL,
  median_price numeric NOT NULL,
  sample_size integer NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

-- Unique index handling NULL city with a sentinel value
CREATE UNIQUE INDEX idx_price_benchmarks_unique
  ON price_benchmarks (procedure_type, state, COALESCE(city, '__STATE__'));

-- RPC: Get benchmark for a procedure type + location
-- Tries city-level first (sample_size >= 3), falls back to state-level
CREATE OR REPLACE FUNCTION get_price_benchmark(
  p_procedure_type text,
  p_state text,
  p_city text DEFAULT NULL
)
RETURNS TABLE (
  avg_price numeric,
  median_price numeric,
  sample_size integer
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Try city-level first
  IF p_city IS NOT NULL THEN
    RETURN QUERY
      SELECT pb.avg_price, pb.median_price, pb.sample_size
      FROM price_benchmarks pb
      WHERE pb.procedure_type = p_procedure_type
        AND pb.state = p_state
        AND pb.city = p_city
        AND pb.sample_size >= 3
      LIMIT 1;

    IF FOUND THEN RETURN; END IF;
  END IF;

  -- Fall back to state-level
  RETURN QUERY
    SELECT pb.avg_price, pb.median_price, pb.sample_size
    FROM price_benchmarks pb
    WHERE pb.procedure_type = p_procedure_type
      AND pb.state = p_state
      AND pb.city IS NULL
      AND pb.sample_size >= 3
    LIMIT 1;
END;
$$;

-- Admin function: Refresh all benchmarks from procedures table
CREATE OR REPLACE FUNCTION refresh_price_benchmarks()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- City-level aggregates
  INSERT INTO price_benchmarks (procedure_type, state, city, avg_price, median_price, sample_size, updated_at)
  SELECT
    p.procedure_type,
    p.state,
    p.city,
    ROUND(AVG(p.price_paid)::numeric, 2),
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY p.price_paid)::numeric, 2),
    COUNT(*)::integer,
    now()
  FROM procedures p
  WHERE p.status = 'active'
    AND p.price_paid > 0
    AND p.state IS NOT NULL
    AND p.city IS NOT NULL
  GROUP BY p.procedure_type, p.state, p.city
  ON CONFLICT (procedure_type, state, COALESCE(city, '__STATE__'))
  DO UPDATE SET
    avg_price = EXCLUDED.avg_price,
    median_price = EXCLUDED.median_price,
    sample_size = EXCLUDED.sample_size,
    updated_at = now();

  -- State-level aggregates (city IS NULL)
  INSERT INTO price_benchmarks (procedure_type, state, city, avg_price, median_price, sample_size, updated_at)
  SELECT
    p.procedure_type,
    p.state,
    NULL,
    ROUND(AVG(p.price_paid)::numeric, 2),
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY p.price_paid)::numeric, 2),
    COUNT(*)::integer,
    now()
  FROM procedures p
  WHERE p.status = 'active'
    AND p.price_paid > 0
    AND p.state IS NOT NULL
  GROUP BY p.procedure_type, p.state
  ON CONFLICT (procedure_type, state, COALESCE(city, '__STATE__'))
  DO UPDATE SET
    avg_price = EXCLUDED.avg_price,
    median_price = EXCLUDED.median_price,
    sample_size = EXCLUDED.sample_size,
    updated_at = now();
END;
$$;

-- RLS: public SELECT, no client writes
ALTER TABLE price_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read benchmarks"
  ON price_benchmarks FOR SELECT
  USING (true);

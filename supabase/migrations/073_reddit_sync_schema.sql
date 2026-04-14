-- 073: Schema additions for Reddit community price sync
-- Run in Supabase SQL Editor before running master_supabase_sync.py

-- Add price columns to providers table
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS botox_price_low    numeric,
  ADD COLUMN IF NOT EXISTS botox_price_high   numeric,
  ADD COLUMN IF NOT EXISTS botox_price_median numeric,
  ADD COLUMN IF NOT EXISTS botox_sample_n     int,
  ADD COLUMN IF NOT EXISTS botox_source       text;

-- Add deal columns to provider_pricing table
ALTER TABLE provider_pricing
  ADD COLUMN IF NOT EXISTS is_deal       boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS deal_type     text,
  ADD COLUMN IF NOT EXISTS deal_notes    text,
  ADD COLUMN IF NOT EXISTS regular_price numeric;

-- City benchmarks table
CREATE TABLE IF NOT EXISTS city_price_benchmarks (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  city            text,
  state           text,
  country         text DEFAULT 'US',
  procedure_type  text DEFAULT 'Botox',
  sample_size     int,
  median_price    numeric,
  mean_price      numeric,
  min_price       numeric,
  max_price       numeric,
  source          text DEFAULT 'reddit_community',
  updated_at      timestamptz DEFAULT now(),
  UNIQUE(city, state, procedure_type)
);

CREATE INDEX IF NOT EXISTS idx_city_benchmarks_city_state
ON city_price_benchmarks(city, state);

-- Enable RLS but allow service role full access
ALTER TABLE city_price_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access" ON city_price_benchmarks
  FOR SELECT USING (true);

CREATE POLICY "Allow service role full access" ON city_price_benchmarks
  FOR ALL USING (auth.role() = 'service_role');

-- 060_glow_fund.sql — The Glow Fund
--
-- 5% of every dollar GlowBuddy earns funds aesthetic reconstructive
-- treatments for domestic violence survivors and veterans. These two
-- tables back the /glow-fund page:
--
--   glow_fund          — single-row running total (total_donated,
--                        total_revenue, last_updated). Updated by
--                        a back-office process; read publicly.
--   glow_fund_reports  — ledger of quarterly transparency reports,
--                        one row per published quarter.
--
-- Public SELECT is allowed on both tables so the marketing page can
-- render without an authenticated client. Writes go through the
-- service role only — no public/authenticated insert or update
-- policies are defined, which (with RLS enabled) locks them down.

CREATE TABLE IF NOT EXISTS glow_fund (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  total_donated numeric(12, 2) NOT NULL DEFAULT 0,
  total_revenue numeric(12, 2) NOT NULL DEFAULT 0,
  last_updated timestamptz NOT NULL DEFAULT now()
);

-- Seed the single running-total row if the table is empty. Safe to
-- re-run: we only insert when there are no existing rows so repeated
-- migrations never duplicate the seed.
INSERT INTO glow_fund (total_donated, total_revenue)
SELECT 0, 0
WHERE NOT EXISTS (SELECT 1 FROM glow_fund);

CREATE TABLE IF NOT EXISTS glow_fund_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  quarter text NOT NULL,
  year integer NOT NULL,
  revenue numeric(12, 2),
  donated numeric(12, 2),
  recipient text,
  report_url text,
  published_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_glow_fund_reports_year_quarter
  ON glow_fund_reports (year DESC, quarter DESC);

ALTER TABLE glow_fund ENABLE ROW LEVEL SECURITY;
ALTER TABLE glow_fund_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS glow_fund_public_read ON glow_fund;
CREATE POLICY glow_fund_public_read ON glow_fund
  FOR SELECT USING (true);

DROP POLICY IF EXISTS glow_fund_reports_public_read ON glow_fund_reports;
CREATE POLICY glow_fund_reports_public_read ON glow_fund_reports
  FOR SELECT USING (true);

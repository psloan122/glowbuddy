-- ════════════════════════════════════════════════════════════════════════
-- 092: data_quality_dashboard view + weekly health snapshot table
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── Snapshot table (required by pg_cron block below) ─────────────────
CREATE TABLE IF NOT EXISTS data_quality_snapshots (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot   jsonb       NOT NULL,
  taken_at   timestamptz NOT NULL DEFAULT now()
);

-- ── Standing dashboard view ───────────────────────────────────────────
CREATE OR REPLACE VIEW data_quality_dashboard AS
SELECT
  -- Plausibility quarantine (migration 084 — table: provider_pricing_quarantine)
  (SELECT COUNT(*) FROM provider_pricing_quarantine
   WHERE quarantined_at > NOW() - INTERVAL '7 days')
    AS rejects_last_7d,

  (SELECT source FROM provider_pricing_quarantine
   WHERE quarantined_at > NOW() - INTERVAL '7 days'
   GROUP BY source ORDER BY COUNT(*) DESC LIMIT 1)
    AS top_reject_source_7d,

  -- Active suppression counts by reason
  (SELECT jsonb_object_agg(suppression_reason, c)
   FROM (
     SELECT suppression_reason, COUNT(*) AS c
     FROM provider_pricing
     WHERE display_suppressed = true
       AND suppression_reason IS NOT NULL
     GROUP BY suppression_reason
   ) s)
    AS suppressions_by_reason,

  -- Quality flag review queue (active, non-suppressed rows with a flag)
  (SELECT COUNT(*) FROM provider_pricing
   WHERE quality_flag IS NOT NULL
     AND display_suppressed = false)
    AS pending_review_rows,

  -- City coverage
  (SELECT COUNT(*) FROM city_benchmarks WHERE is_reliable = true)
    AS reliable_cities,

  (SELECT COUNT(*) FROM city_benchmarks
   WHERE n_unit > 0 AND is_reliable = false)
    AS low_n_cities,

  -- Ingest rate, last 24 h
  (SELECT COUNT(*) FROM provider_pricing
   WHERE created_at > NOW() - INTERVAL '24 hours')
    AS ingested_24h,

  -- New duplicate groups in last 7 days — should always be 0 after
  -- migration 089 added the partial unique index.
  (SELECT COUNT(*) FROM (
     SELECT provider_id, procedure_type, price, price_label, source_url
     FROM provider_pricing
     WHERE created_at > NOW() - INTERVAL '7 days'
       AND source IN ('cheerio_scraper', 'scrape')
       AND is_active = true
     GROUP BY provider_id, procedure_type, price, price_label, source_url
     HAVING COUNT(*) > 1
   ) dups)
    AS new_duplicate_groups_7d,

  now() AS computed_at;

GRANT SELECT ON data_quality_dashboard   TO authenticated;
GRANT SELECT ON data_quality_dashboard   TO service_role;
GRANT ALL     ON data_quality_snapshots  TO service_role;

COMMIT;

-- ── pg_cron weekly snapshot job ───────────────────────────────────────
--
-- PREREQUISITES before enabling:
--   1. pg_cron extension enabled:
--        Supabase Dashboard → Database → Extensions → pg_cron
--   2. data_quality_snapshots table exists — created above in this
--      migration, so this prerequisite is satisfied automatically.
--   3. Notification target configured as needed (pg_notify channel,
--      net.http_post webhook, or email via pg_net). The cron job below
--      only writes a snapshot row; alerting logic is left to the caller.
--
-- Alert thresholds to implement in your notification handler:
--   rejects_last_7d     > 2× trailing 4-week average → scraper regression
--   pending_review_rows > 100                        → review queue backlog
--   new_duplicate_groups_7d > 0                      → dedup constraint broken
--
-- To schedule (run OUTSIDE a transaction after enabling pg_cron):
/*
SELECT cron.schedule(
  'data-quality-weekly-snapshot',
  '0 9 * * 1',   -- Every Monday 09:00 UTC
  $$
    INSERT INTO data_quality_snapshots (snapshot, taken_at)
    SELECT row_to_json(dq)::jsonb, now()
    FROM data_quality_dashboard dq;
  $$
);
*/

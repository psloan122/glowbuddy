-- 080: Community-submitted price deduplication
--
-- ROOT CAUSE: The batch ingestion script (master_supabase_sync.py) that
-- populates provider_pricing with source='community_submitted' ran 5 times
-- without any deduplication guard:
--   Run 1 — 2026-04-14 02:24:39 UTC  (18 rows)
--   Run 2 — 2026-04-15 01:05:02 UTC  (23 rows)
--   Run 3 — 2026-04-15 01:09:52 UTC  (17 rows)
--   Run 4 — 2026-04-15 01:11:01 UTC  (76 rows)
--   Run 5 — 2026-04-15 01:12:03 UTC  (66 rows)
-- Each run was a plain INSERT with no ON CONFLICT clause and no
-- pre-flight SELECT. The script has no DELETE-before-insert step
-- (unlike import-validated-prices.js which does .delete().eq('source','scrape')
-- before re-inserting).
--
-- THIS IS NOT A CLIENT-SIDE DOUBLE-CLICK BUG. Log.jsx inserts into
-- `procedures`. The `provider_pricing` rows with source='community_submitted'
-- come entirely from the external batch script.
--
-- CONFIRMED DUPLICATE GROUPS (14 rows → 3 after cleanup):
--   PERMAESTHETICS® STUDIO + ACADEMY, Miami FL
--     Dysport  $16.00/per_unit  — 5 rows, keep earliest (2026-04-15 01:05:02)
--   The Things We Do, Los Angeles CA
--     Dysport  $16.50/per_unit  — 3 rows, keep earliest (2026-04-15 01:11:01)
--   Sente Bella MedSpa, San Diego CA
--     Jeuveau  $4.80/per_unit   — 6 rows, keep earliest (2026-04-14 02:24:39)
--
-- ADDS:
--   1. Partial unique index on (provider_id, procedure_type, price, price_label)
--      WHERE source = 'community_submitted'
--      → future re-runs of the script hit ON CONFLICT and skip, not duplicate
--   2. The DELETE cleanup lives in a separate script (cleanup_community_dupes.sql)
--      — see below. Run that only after reviewing the SELECT preview.

-- ────────────────────────────────────────────────────────────────
-- Partial unique index — community_submitted rows only
-- ────────────────────────────────────────────────────────────────
-- This enforces at the database level that the same
-- (provider, procedure, price, label) combination can only appear once
-- per source='community_submitted'.  The batch script must use
-- ON CONFLICT DO NOTHING (or DO UPDATE SET updated_at = now()) when
-- inserting to avoid errors on future runs.
--
-- WHY PARTIAL: scrape, csv_import, and user form rows are intentionally
-- allowed to co-exist with community rows for the same price point.
-- The partial WHERE clause scopes the constraint to the one source
-- that has idempotency requirements.

CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_pricing_community_dedup
  ON provider_pricing (provider_id, procedure_type, price, price_label)
  WHERE source = 'community_submitted';

-- ────────────────────────────────────────────────────────────────
-- NOTE: The existing duplicate rows violate the index above.
-- Postgres will refuse to create the index while duplicates exist.
-- Run the cleanup script FIRST, then apply this migration.
-- The cleanup SELECT preview and DELETE are in the next file:
--   080b_cleanup_community_dupes.sql
-- ────────────────────────────────────────────────────────────────

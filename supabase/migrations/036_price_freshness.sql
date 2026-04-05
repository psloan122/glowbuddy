-- Migration 036: Price freshness decay columns
-- Adds freshness tracking to procedures table for automated nudge emails

ALTER TABLE procedures ADD COLUMN IF NOT EXISTS freshness_confirmed_at TIMESTAMPTZ;
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS last_nudge_sent_at TIMESTAMPTZ;

-- Index for the cron job: find stale submissions that haven't been nudged recently
CREATE INDEX IF NOT EXISTS idx_procedures_freshness_nudge
  ON procedures (user_id, created_at)
  WHERE status = 'active'
    AND freshness_confirmed_at IS NULL
    AND (last_nudge_sent_at IS NULL OR last_nudge_sent_at < NOW() - INTERVAL '30 days');

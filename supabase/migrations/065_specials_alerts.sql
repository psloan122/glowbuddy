-- 065_specials_alerts.sql — Specials alert plumbing
--
-- Extends the existing provider_specials table (from migration 019) with
-- the columns needed for the Phase 1 demand-driven specials experience:
--
--   notify_alerts        — boolean, off by default. When true, the Phase 2
--                          edge function will fan a notification out to
--                          everyone with a matching active price alert.
--   max_redemptions      — optional cap on how many times the special can
--                          be redeemed before it auto-pauses.
--   redemption_count     — running counter, incremented elsewhere.
--   notification_count   — how many alert notifications were sent for
--                          this special. Bookkeeping only.
--   status               — formal lifecycle column. Replaces the implicit
--                          {is_active=true & ends_at>now()} pattern with
--                          'draft' / 'active' / 'expired' / 'paused'.
--                          is_active is left in place so existing read
--                          paths keep working.
--
-- Also creates the alert_notifications table that the Phase 2 edge
-- function will populate. The table is created now, but no Edge Function
-- is wired up in this phase — the table sits empty until Phase 2 ships
-- the publish-to-alerts flow.

ALTER TABLE provider_specials
  ADD COLUMN IF NOT EXISTS notify_alerts      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_redemptions    integer,
  ADD COLUMN IF NOT EXISTS redemption_count   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notification_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status             text    NOT NULL DEFAULT 'active';

-- Backfill status from the existing is_active boolean so old rows have
-- a sensible value before we add the check constraint.
UPDATE provider_specials
   SET status = CASE WHEN is_active THEN 'active' ELSE 'paused' END;

ALTER TABLE provider_specials
  DROP CONSTRAINT IF EXISTS provider_specials_status_check;
ALTER TABLE provider_specials
  ADD CONSTRAINT provider_specials_status_check
  CHECK (status IN ('draft', 'active', 'expired', 'paused'));

-- ── alert_notifications (Phase 2 destination table) ────────────────────
CREATE TABLE IF NOT EXISTS alert_notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES providers(id)  ON DELETE CASCADE,
  special_id  uuid REFERENCES provider_specials(id)   ON DELETE CASCADE,
  alert_id    uuid REFERENCES price_alerts(id)        ON DELETE SET NULL,
  type        text NOT NULL DEFAULT 'price_match',
  sent_at     timestamptz,
  read_at     timestamptz,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_notifications_user_unread
  ON alert_notifications (user_id, read_at)
  WHERE read_at IS NULL;

ALTER TABLE alert_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS alert_notifications_user_read   ON alert_notifications;
DROP POLICY IF EXISTS alert_notifications_user_update ON alert_notifications;

CREATE POLICY alert_notifications_user_read
  ON alert_notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY alert_notifications_user_update
  ON alert_notifications FOR UPDATE
  USING (user_id = auth.uid());

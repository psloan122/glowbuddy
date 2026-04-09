-- 066_notification_plumbing.sql — SMS + weekly digest infrastructure
--
-- This migration adds the columns and tables that the two new edge
-- functions (`notify-price-alert` and `provider-weekly-digest`) need
-- to run. It assumes 065_specials_alerts.sql may or may not have
-- been applied yet, so every DDL statement is IF NOT EXISTS / IF
-- EXISTS aware.
--
-- What it adds:
--   1. profiles.phone / phone_verified / notification_prefs
--      (the SMS system needs phone numbers; notification_prefs is the
--      single source of truth for SMS opt-in state)
--   2. provider_specials.notifications_sent / notified_at
--      (bookkeeping for the SMS fan-out)
--   3. alert_notifications (defensive create — no-op if 065 ran first)
--   4. email_log (for weekly digest dedup + analytics)
--   5. notification_errors (Twilio/Resend send failures land here
--      instead of crashing the edge function)
--
-- Explicitly *not* created: a dedicated provider_page_views table.
-- The dashboard already reads page-view counts out of custom_events
-- with event_name='provider_page_view' (see src/pages/ProviderProfile.jsx
-- and src/pages/Business/Dashboard.jsx). The weekly digest reads from
-- custom_events for the same reason.

-- ── 1. Consumer profile additions ────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_prefs jsonb NOT NULL DEFAULT jsonb_build_object(
    'sms', true,
    'email', true,
    'price_alerts', true,
    'specials', true
  );

-- E.164 sanity constraint (allows NULL; when set, must look like +15551234567)
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_phone_format_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_phone_format_check
  CHECK (phone IS NULL OR phone ~ '^\+[1-9][0-9]{7,14}$');

-- ── 2. Specials notification bookkeeping ─────────────────────────────
ALTER TABLE provider_specials
  ADD COLUMN IF NOT EXISTS notify_alerts      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notifications_sent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notified_at        timestamptz;

-- ── 3. alert_notifications (from 065, defensive) ─────────────────────
CREATE TABLE IF NOT EXISTS alert_notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES providers(id)  ON DELETE CASCADE,
  special_id  uuid REFERENCES provider_specials(id)   ON DELETE CASCADE,
  alert_id    uuid REFERENCES price_alerts(id)        ON DELETE SET NULL,
  type        text NOT NULL DEFAULT 'price_match',
  channel     text,  -- 'sms' | 'email' | 'push' — nullable for back-compat
  sent_at     timestamptz,
  read_at     timestamptz,
  created_at  timestamptz DEFAULT now()
);

-- Add `channel` if the table already existed without it.
ALTER TABLE alert_notifications
  ADD COLUMN IF NOT EXISTS channel text;

-- Dedup: one notification per (user, special) so fan-outs are idempotent.
-- Partial unique index so historical rows without a special_id are allowed.
CREATE UNIQUE INDEX IF NOT EXISTS idx_alert_notifications_user_special
  ON alert_notifications (user_id, special_id)
  WHERE special_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_alert_notifications_provider_sent
  ON alert_notifications (provider_id, sent_at DESC);

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

-- ── 4. email_log (weekly digest send history) ────────────────────────
CREATE TABLE IF NOT EXISTS email_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES providers(id)  ON DELETE CASCADE,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type        text NOT NULL,
  subject     text,
  recipient   text,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  stats       jsonb
);

CREATE INDEX IF NOT EXISTS idx_email_log_provider_type_sent
  ON email_log (provider_id, type, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_log_sent_at
  ON email_log (sent_at DESC);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

-- Only service_role reads/writes email_log. Providers can see their own
-- send history via an RPC if we ever need it.
DROP POLICY IF EXISTS email_log_service_role ON email_log;
CREATE POLICY email_log_service_role
  ON email_log FOR ALL
  USING (false);

-- ── 5. notification_errors (send-failure audit trail) ────────────────
CREATE TABLE IF NOT EXISTS notification_errors (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel       text NOT NULL,           -- 'sms' | 'email'
  provider_id   uuid REFERENCES providers(id)  ON DELETE SET NULL,
  user_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  special_id    uuid REFERENCES provider_specials(id) ON DELETE SET NULL,
  error_code    text,
  error_message text,
  payload       jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_errors_created
  ON notification_errors (created_at DESC);

ALTER TABLE notification_errors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_errors_service_role ON notification_errors;
CREATE POLICY notification_errors_service_role
  ON notification_errors FOR ALL
  USING (false);

-- 031: Price Alerts v2 — progress bars, provider tracking, unified notifications
-- Enhances existing price_alerts + price_alert_triggers from migration 016

-- Add trigger_count to price_alerts for quick access
ALTER TABLE price_alerts ADD COLUMN IF NOT EXISTS trigger_count int DEFAULT 0;

-- Add provider tracking + price context to triggers
ALTER TABLE price_alert_triggers ADD COLUMN IF NOT EXISTS price_seen numeric;
ALTER TABLE price_alert_triggers ADD COLUMN IF NOT EXISTS provider_name text;
ALTER TABLE price_alert_triggers ADD COLUMN IF NOT EXISTS provider_id uuid REFERENCES providers(id);

-- Unify notifications: allow user_notifications to carry price alert triggers
-- Make injector_update_id nullable (was implicitly nullable but be explicit)
ALTER TABLE user_notifications ALTER COLUMN injector_update_id DROP NOT NULL;
ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS price_alert_trigger_id uuid REFERENCES price_alert_triggers(id) ON DELETE CASCADE;

-- Index for efficient cooldown check
CREATE INDEX IF NOT EXISTS idx_price_alert_triggers_cooldown
  ON price_alert_triggers (alert_id, provider_name, triggered_at DESC);

-- Index for unified notifications
CREATE INDEX IF NOT EXISTS idx_user_notifications_price_alert
  ON user_notifications (user_id, price_alert_trigger_id)
  WHERE price_alert_trigger_id IS NOT NULL;

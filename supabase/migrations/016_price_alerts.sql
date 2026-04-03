-- 016: Price Alerts
-- Users can set alerts to be notified when new prices are submitted matching their criteria

CREATE TABLE IF NOT EXISTS price_alerts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  procedure_type text NOT NULL,
  city text,
  state text,
  max_price numeric,
  frequency text NOT NULL DEFAULT 'instant' CHECK (frequency IN ('instant', 'daily', 'weekly')),
  is_active boolean DEFAULT true,
  last_triggered_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_price_alerts_active ON price_alerts (procedure_type, is_active);

CREATE TABLE IF NOT EXISTS price_alert_triggers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id uuid NOT NULL REFERENCES price_alerts(id) ON DELETE CASCADE,
  procedure_id uuid NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
  triggered_at timestamptz DEFAULT now(),
  was_sent boolean DEFAULT false,
  was_read boolean DEFAULT false
);

CREATE INDEX idx_price_alert_triggers_unsent ON price_alert_triggers (alert_id, was_sent);

-- Trigger function: on new procedure INSERT, match against active alerts
CREATE OR REPLACE FUNCTION check_price_alerts()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only trigger for active procedures
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;

  INSERT INTO price_alert_triggers (alert_id, procedure_id)
  SELECT a.id, NEW.id
  FROM price_alerts a
  WHERE a.is_active = true
    AND a.procedure_type = NEW.procedure_type
    AND (a.state IS NULL OR a.state = NEW.state)
    AND (a.city IS NULL OR a.city = NEW.city)
    AND (a.max_price IS NULL OR NEW.price_paid <= a.max_price)
    AND a.user_id != COALESCE(NEW.user_id, '00000000-0000-0000-0000-000000000000'::uuid);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_price_alerts
  AFTER INSERT ON procedures
  FOR EACH ROW
  EXECUTE FUNCTION check_price_alerts();

-- RLS
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alert_triggers ENABLE ROW LEVEL SECURITY;

-- Users can CRUD their own alerts
CREATE POLICY "Users manage own alerts"
  ON price_alerts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can read triggers for their own alerts
CREATE POLICY "Users read own triggers"
  ON price_alert_triggers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM price_alerts
      WHERE price_alerts.id = price_alert_triggers.alert_id
        AND price_alerts.user_id = auth.uid()
    )
  );

-- Users can update their own triggers (mark as read)
CREATE POLICY "Users update own triggers"
  ON price_alert_triggers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM price_alerts
      WHERE price_alerts.id = price_alert_triggers.alert_id
        AND price_alerts.user_id = auth.uid()
    )
  );

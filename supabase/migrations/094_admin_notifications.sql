-- Migration 094: Admin notifications table + triggers
-- Real-time feed of new providers, prices, and reviews for admin dashboard.

-- ── Table ──

CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  metadata JSONB,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread
  ON admin_notifications (created_at DESC) WHERE NOT is_read;

-- ── RLS ──

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_read" ON admin_notifications;
CREATE POLICY "admin_read" ON admin_notifications
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM auth.users
      WHERE raw_user_meta_data->>'user_role' = 'admin'
    )
  );

DROP POLICY IF EXISTS "admin_update" ON admin_notifications;
CREATE POLICY "admin_update" ON admin_notifications
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM auth.users
      WHERE raw_user_meta_data->>'user_role' = 'admin'
    )
  );

-- ── Trigger: new provider ──

CREATE OR REPLACE FUNCTION notify_new_provider()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO admin_notifications (type, title, body, metadata)
  VALUES (
    'new_provider',
    'New provider: ' || NEW.name,
    COALESCE(NEW.city, '') || ', ' || COALESCE(NEW.state, ''),
    jsonb_build_object(
      'provider_id', NEW.id,
      'slug', NEW.slug,
      'source', NEW.source,
      'is_claimed', NEW.is_claimed
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_provider ON providers;
CREATE TRIGGER on_new_provider
  AFTER INSERT ON providers
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_provider();

-- ── Trigger: new price ──

CREATE OR REPLACE FUNCTION notify_new_price()
RETURNS TRIGGER AS $$
DECLARE
  prov_name TEXT;
BEGIN
  SELECT name INTO prov_name FROM providers WHERE id = NEW.provider_id;
  INSERT INTO admin_notifications (type, title, body, metadata)
  VALUES (
    'new_price',
    NEW.procedure_type || ' $' || NEW.price || ' logged',
    COALESCE(prov_name, 'Unknown provider'),
    jsonb_build_object(
      'pricing_id', NEW.id,
      'provider_id', NEW.provider_id,
      'source', NEW.source,
      'price_label', NEW.price_label
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_price ON provider_pricing;
CREATE TRIGGER on_new_price
  AFTER INSERT ON provider_pricing
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_price();

-- ── Trigger: new review ──

CREATE OR REPLACE FUNCTION notify_new_review()
RETURNS TRIGGER AS $$
DECLARE
  prov_name TEXT;
BEGIN
  SELECT name INTO prov_name FROM providers WHERE id = NEW.provider_id;
  INSERT INTO admin_notifications (type, title, body, metadata)
  VALUES (
    'new_review',
    NEW.rating || '-star review',
    COALESCE(prov_name, 'Unknown provider'),
    jsonb_build_object(
      'review_id', NEW.id,
      'provider_id', NEW.provider_id,
      'rating', NEW.rating
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_review ON reviews;
CREATE TRIGGER on_new_review
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_review();

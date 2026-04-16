-- 076: Menu parser — tables for provider PDF upload + AI price extraction

CREATE TABLE IF NOT EXISTS provider_menus (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id   uuid NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  file_url      text,
  file_type     text,
  raw_text      text,
  parsed_at     timestamptz,
  parsed_by     text DEFAULT 'claude',
  is_active     boolean DEFAULT true,
  uploaded_by   uuid REFERENCES auth.users(id),
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS menu_items_staging (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_id       uuid NOT NULL REFERENCES provider_menus(id) ON DELETE CASCADE,
  provider_id   uuid NOT NULL REFERENCES providers(id),
  raw_text      text,
  procedure_type text,
  price         numeric,
  price_label   text,
  confidence    numeric,
  is_confirmed  boolean DEFAULT false,
  confirmed_at  timestamptz,
  notes         text
);

CREATE INDEX IF NOT EXISTS idx_menu_items_provider
  ON menu_items_staging(provider_id, is_confirmed);

ALTER TABLE provider_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items_staging ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Provider owners manage menus" ON provider_menus;
CREATE POLICY "Provider owners manage menus" ON provider_menus
  FOR ALL USING (
    uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM providers
      WHERE id = provider_id AND owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access menus" ON provider_menus;
CREATE POLICY "Service role full access menus" ON provider_menus
  FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Anyone reads confirmed menu items" ON menu_items_staging;
CREATE POLICY "Anyone reads confirmed menu items" ON menu_items_staging
  FOR SELECT USING (is_confirmed = true);

DROP POLICY IF EXISTS "Provider owners manage staging" ON menu_items_staging;
CREATE POLICY "Provider owners manage staging" ON menu_items_staging
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM providers
      WHERE id = provider_id AND owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role full access staging" ON menu_items_staging;
CREATE POLICY "Service role full access staging" ON menu_items_staging
  FOR ALL USING (auth.role() = 'service_role');

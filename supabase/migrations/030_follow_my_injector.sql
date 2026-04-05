-- Follow My Injector: extend injectors table + add follows, updates, notifications

-- Extend existing injectors table with follow/claim fields
ALTER TABLE injectors ADD COLUMN IF NOT EXISTS slug text UNIQUE;
ALTER TABLE injectors ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE injectors ADD COLUMN IF NOT EXISTS previous_provider_ids uuid[] DEFAULT '{}';
ALTER TABLE injectors ADD COLUMN IF NOT EXISTS is_claimed boolean DEFAULT false;
ALTER TABLE injectors ADD COLUMN IF NOT EXISTS claimed_user_id uuid REFERENCES auth.users(id);
ALTER TABLE injectors ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
ALTER TABLE injectors ADD COLUMN IF NOT EXISTS follower_count int DEFAULT 0;
ALTER TABLE injectors ADD COLUMN IF NOT EXISTS booking_url text;
ALTER TABLE injectors ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Backfill display_name from name for existing rows
UPDATE injectors SET display_name = name WHERE display_name IS NULL;

-- Generate slugs for existing injectors
UPDATE injectors SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || left(id::text, 8)
WHERE slug IS NULL;

-- Injector follows
CREATE TABLE IF NOT EXISTS injector_follows (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  injector_id uuid REFERENCES injectors(id) ON DELETE CASCADE NOT NULL,
  notify_on_move boolean DEFAULT true,
  notify_on_special boolean DEFAULT true,
  notify_on_availability boolean DEFAULT false,
  followed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, injector_id)
);

CREATE INDEX idx_injector_follows_user ON injector_follows(user_id);
CREATE INDEX idx_injector_follows_injector ON injector_follows(injector_id);

-- Injector updates (activity feed)
CREATE TABLE IF NOT EXISTS injector_updates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  injector_id uuid REFERENCES injectors(id) ON DELETE CASCADE NOT NULL,
  update_type text NOT NULL CHECK (update_type IN ('moved', 'special', 'availability', 'announcement')),
  title text NOT NULL,
  body text,
  provider_id uuid REFERENCES providers(id),
  special_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_injector_updates_injector ON injector_updates(injector_id);

-- User notifications
CREATE TABLE IF NOT EXISTS user_notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  injector_update_id uuid REFERENCES injector_updates(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_user_notifications_user ON user_notifications(user_id, is_read);

-- RLS
ALTER TABLE injector_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE injector_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- injector_follows: users read/write own
CREATE POLICY "follows_own_read" ON injector_follows
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "follows_own_insert" ON injector_follows
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "follows_own_delete" ON injector_follows
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "follows_own_update" ON injector_follows
  FOR UPDATE USING (auth.uid() = user_id);

-- injector_updates: public SELECT, claimed injector INSERT
CREATE POLICY "updates_public_read" ON injector_updates
  FOR SELECT USING (true);
CREATE POLICY "updates_injector_insert" ON injector_updates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM injectors
      WHERE injectors.id = injector_updates.injector_id
      AND injectors.claimed_user_id = auth.uid()
    )
  );

-- user_notifications: users read/update own
CREATE POLICY "notifications_own_read" ON user_notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_own_update" ON user_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow claimed injectors to update their own row
CREATE POLICY "injectors_claimed_update" ON injectors
  FOR UPDATE USING (claimed_user_id = auth.uid());

-- Allow public read of injectors by slug (extend existing policy)
CREATE POLICY "injectors_public_read_by_slug" ON injectors
  FOR SELECT USING (slug IS NOT NULL);

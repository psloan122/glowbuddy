-- 042: Provider follows — lets patients follow provider pages
CREATE TABLE IF NOT EXISTS public.provider_follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_slug TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider_slug)
);

ALTER TABLE provider_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own follows"
  ON provider_follows FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own follows"
  ON provider_follows FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own follows"
  ON provider_follows FOR DELETE
  USING (auth.uid() = user_id);

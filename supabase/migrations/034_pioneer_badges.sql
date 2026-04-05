-- Pioneer Badge & Reward System
-- Tracks who was first to submit a verified price at each provider location

-- A. pioneer_records — tracks who was first at each provider
CREATE TABLE IF NOT EXISTS public.pioneer_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_slug TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  city TEXT,
  state TEXT,
  procedure_id UUID REFERENCES public.procedures(id) ON DELETE SET NULL,
  pioneer_tier TEXT NOT NULL CHECK (pioneer_tier IN ('early_reporter', 'pioneer', 'founding_patient')),
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(provider_slug, pioneer_tier)
);

CREATE INDEX IF NOT EXISTS idx_pioneer_records_user_id ON public.pioneer_records(user_id);
CREATE INDEX IF NOT EXISTS idx_pioneer_records_provider_slug ON public.pioneer_records(provider_slug);
CREATE INDEX IF NOT EXISTS idx_pioneer_records_city_state ON public.pioneer_records(city, state);
CREATE INDEX IF NOT EXISTS idx_pioneer_records_tier ON public.pioneer_records(pioneer_tier);

ALTER TABLE public.pioneer_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read pioneer_records"
  ON public.pioneer_records FOR SELECT USING (true);

CREATE POLICY "Authenticated insert own pioneer_records"
  ON public.pioneer_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- B. pioneer_giveaway_entries — separate $200/month pioneer giveaway
CREATE TABLE IF NOT EXISTS public.pioneer_giveaway_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  procedure_id UUID NOT NULL REFERENCES public.procedures(id) ON DELETE CASCADE,
  pioneer_record_id UUID NOT NULL REFERENCES public.pioneer_records(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  entries INTEGER DEFAULT 1,
  pioneer_tier TEXT NOT NULL CHECK (pioneer_tier IN ('early_reporter', 'pioneer', 'founding_patient')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pioneer_giveaway_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert pioneer_giveaway_entries"
  ON public.pioneer_giveaway_entries FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin read pioneer_giveaway_entries"
  ON public.pioneer_giveaway_entries FOR SELECT USING (true);

-- C. Expand user_badges constraint to include location_pioneer
ALTER TABLE public.user_badges DROP CONSTRAINT IF EXISTS user_badges_badge_type_check;
ALTER TABLE public.user_badges ADD CONSTRAINT user_badges_badge_type_check
  CHECK (badge_type IN ('glowgetter', 'price_pioneer', 'club_100', 'location_pioneer'));

-- D. Broaden profiles read policy for pioneer credits on provider pages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Public read profiles'
  ) THEN
    CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
  END IF;
END $$;

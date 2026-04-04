-- 025: Vagaro Booking Integration
-- URL-based booking integration + referral tracking

-- Provider booking platform connections
CREATE TABLE IF NOT EXISTS public.provider_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.providers(id) ON DELETE CASCADE UNIQUE,
  platform TEXT NOT NULL DEFAULT 'vagaro',
  vagaro_business_id TEXT,
  vagaro_widget_url TEXT,
  vagaro_booking_url TEXT,
  widget_embed_enabled BOOLEAN DEFAULT false,
  connection_status TEXT DEFAULT 'pending',
  connected_at TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Check constraint on connection status
ALTER TABLE public.provider_integrations
  ADD CONSTRAINT provider_integrations_status_check
  CHECK (connection_status IN ('pending', 'active', 'error'));

-- Booking referral tracking
CREATE TABLE IF NOT EXISTS public.booking_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.providers(id),
  platform TEXT NOT NULL,
  referral_token TEXT UNIQUE NOT NULL,
  procedure_name TEXT,
  estimated_value NUMERIC,
  status TEXT DEFAULT 'clicked',
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  session_id TEXT
);

-- Check constraint on referral status
ALTER TABLE public.booking_referrals
  ADD CONSTRAINT booking_referrals_status_check
  CHECK (status IN ('clicked', 'confirmed'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_provider_integrations_provider
  ON public.provider_integrations (provider_id);

CREATE INDEX IF NOT EXISTS idx_provider_integrations_status
  ON public.provider_integrations (connection_status)
  WHERE connection_status = 'active';

CREATE INDEX IF NOT EXISTS idx_booking_referrals_provider
  ON public.booking_referrals (provider_id, clicked_at DESC);

CREATE INDEX IF NOT EXISTS idx_booking_referrals_token
  ON public.booking_referrals (referral_token);

-- RLS
ALTER TABLE public.provider_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_referrals ENABLE ROW LEVEL SECURITY;

-- provider_integrations: providers can read/write their own
CREATE POLICY "Providers can read own integrations"
  ON public.provider_integrations FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM public.providers WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can insert own integrations"
  ON public.provider_integrations FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT id FROM public.providers WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Providers can update own integrations"
  ON public.provider_integrations FOR UPDATE
  USING (
    provider_id IN (
      SELECT id FROM public.providers WHERE owner_user_id = auth.uid()
    )
  );

-- Public can read active integrations (for VagaroBookButton)
CREATE POLICY "Anyone can read active integrations"
  ON public.provider_integrations FOR SELECT
  USING (connection_status = 'active');

-- booking_referrals: public insert
CREATE POLICY "Anyone can insert booking referrals"
  ON public.booking_referrals FOR INSERT
  WITH CHECK (true);

-- booking_referrals: providers can read their own
CREATE POLICY "Providers can read own referrals"
  ON public.booking_referrals FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM public.providers WHERE owner_user_id = auth.uid()
    )
  );

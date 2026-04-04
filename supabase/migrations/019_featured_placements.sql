-- 019: Featured Placement / Promoted Specials
-- Providers can pay to surface special offers at the top of market feeds

-- Provider specials / promoted offers
CREATE TABLE IF NOT EXISTS public.provider_specials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.providers(id) ON DELETE CASCADE,
  treatment_name TEXT NOT NULL,
  promo_price NUMERIC NOT NULL,
  price_unit TEXT NOT NULL DEFAULT 'unit',
  headline TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  placement_tier TEXT DEFAULT 'standard',
  impressions INT DEFAULT 0,
  clicks INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Placement purchases
CREATE TABLE IF NOT EXISTS public.special_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  special_id UUID REFERENCES public.provider_specials(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.providers(id),
  weeks INT NOT NULL DEFAULT 1,
  price_paid NUMERIC NOT NULL,
  stripe_payment_intent TEXT,
  status TEXT DEFAULT 'pending',
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- Check constraint on placement status
ALTER TABLE public.special_placements
  ADD CONSTRAINT special_placements_status_check
  CHECK (status IN ('pending', 'active', 'expired', 'cancelled'));

-- Check constraint on placement tier
ALTER TABLE public.provider_specials
  ADD CONSTRAINT provider_specials_tier_check
  CHECK (placement_tier IN ('standard', 'featured'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_provider_specials_active
  ON public.provider_specials (is_active, ends_at)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_provider_specials_provider
  ON public.provider_specials (provider_id);

CREATE INDEX IF NOT EXISTS idx_special_placements_status
  ON public.special_placements (status)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_special_placements_special
  ON public.special_placements (special_id);

-- RLS
ALTER TABLE public.provider_specials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_placements ENABLE ROW LEVEL SECURITY;

-- provider_specials: public can read active specials
CREATE POLICY "Anyone can read active specials"
  ON public.provider_specials FOR SELECT
  USING (is_active = true AND ends_at > NOW());

-- provider_specials: providers can read all their own
CREATE POLICY "Providers can read own specials"
  ON public.provider_specials FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM public.providers WHERE owner_user_id = auth.uid()
    )
  );

-- provider_specials: providers can insert own
CREATE POLICY "Providers can create specials"
  ON public.provider_specials FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT id FROM public.providers WHERE owner_user_id = auth.uid()
    )
  );

-- provider_specials: providers can update own
CREATE POLICY "Providers can update own specials"
  ON public.provider_specials FOR UPDATE
  USING (
    provider_id IN (
      SELECT id FROM public.providers WHERE owner_user_id = auth.uid()
    )
  );

-- special_placements: providers can read own
CREATE POLICY "Providers can read own placements"
  ON public.special_placements FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM public.providers WHERE owner_user_id = auth.uid()
    )
  );

-- special_placements: providers can insert own
CREATE POLICY "Providers can create placements"
  ON public.special_placements FOR INSERT
  WITH CHECK (
    provider_id IN (
      SELECT id FROM public.providers WHERE owner_user_id = auth.uid()
    )
  );

-- special_placements: providers can update own
CREATE POLICY "Providers can update own placements"
  ON public.special_placements FOR UPDATE
  USING (
    provider_id IN (
      SELECT id FROM public.providers WHERE owner_user_id = auth.uid()
    )
  );

-- Admin: service role bypasses RLS, so no admin policies needed

-- Function to increment impressions (called from client, debounced)
CREATE OR REPLACE FUNCTION public.increment_special_impressions(special_ids UUID[])
RETURNS void AS $$
BEGIN
  UPDATE public.provider_specials
  SET impressions = impressions + 1
  WHERE id = ANY(special_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment clicks
CREATE OR REPLACE FUNCTION public.increment_special_click(p_special_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.provider_specials
  SET clicks = clicks + 1
  WHERE id = p_special_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 024: Financing Widget Click Tracking
-- Track CareCredit and Cherry affiliate link clicks for analytics

CREATE TABLE IF NOT EXISTS public.financing_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.providers(id),
  procedure_name TEXT,
  financing_partner TEXT NOT NULL,
  estimated_procedure_cost NUMERIC,
  clicked_at TIMESTAMPTZ DEFAULT NOW(),
  session_id TEXT
);

-- Check constraint on partner
ALTER TABLE public.financing_clicks
  ADD CONSTRAINT financing_clicks_partner_check
  CHECK (financing_partner IN ('carecredit', 'cherry'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_financing_clicks_partner
  ON public.financing_clicks (financing_partner, clicked_at DESC);

CREATE INDEX IF NOT EXISTS idx_financing_clicks_provider
  ON public.financing_clicks (provider_id);

-- RLS: public insert only (anonymous tracking), admin select via service role
ALTER TABLE public.financing_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert financing clicks"
  ON public.financing_clicks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin can read financing clicks"
  ON public.financing_clicks FOR SELECT
  USING (false); -- service role bypasses RLS

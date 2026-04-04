-- 023: Twilio Call Tracking
-- Providers get assigned Twilio forwarding numbers for call tracking

-- Twilio numbers assigned to providers
CREATE TABLE IF NOT EXISTS public.provider_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.providers(id) ON DELETE CASCADE UNIQUE,
  twilio_number TEXT NOT NULL UNIQUE,
  real_number TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Call log
CREATE TABLE IF NOT EXISTS public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.providers(id),
  twilio_number TEXT NOT NULL,
  caller_area_code TEXT,
  duration_seconds INT,
  status TEXT,
  called_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'provider_card'
);

-- Check constraint on call status
ALTER TABLE public.call_logs
  ADD CONSTRAINT call_logs_status_check
  CHECK (status IN ('completed', 'no-answer', 'busy', 'failed'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_phone_numbers_provider
  ON public.provider_phone_numbers (provider_id);

CREATE INDEX IF NOT EXISTS idx_call_logs_provider
  ON public.call_logs (provider_id, called_at DESC);

CREATE INDEX IF NOT EXISTS idx_call_logs_called_at
  ON public.call_logs (called_at DESC);

-- RLS
ALTER TABLE public.provider_phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;

-- provider_phone_numbers: providers can read their own
CREATE POLICY "Providers can read own phone numbers"
  ON public.provider_phone_numbers FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM public.providers WHERE owner_user_id = auth.uid()
    )
  );

-- call_logs: providers can read their own
CREATE POLICY "Providers can read own call logs"
  ON public.call_logs FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM public.providers WHERE owner_user_id = auth.uid()
    )
  );

-- RPC: get twilio number for a provider (public, for CallNowButton)
CREATE OR REPLACE FUNCTION public.get_provider_twilio_number(p_provider_id UUID)
RETURNS TEXT AS $$
  SELECT twilio_number
  FROM public.provider_phone_numbers
  WHERE provider_id = p_provider_id
    AND is_active = true
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

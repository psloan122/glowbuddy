-- 070: Generic booking platform columns on providers
-- Supports Mindbody, Boulevard, Square, Jane, Acuity, SimplePractice, GlossGenius.
-- Vagaro keeps its richer integration via provider_integrations table.

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS booking_url TEXT,
  ADD COLUMN IF NOT EXISTS booking_platform TEXT;

COMMENT ON COLUMN public.providers.booking_url IS 'External booking page URL (non-Vagaro platforms)';
COMMENT ON COLUMN public.providers.booking_platform IS 'Booking platform slug: mindbody, boulevard, square, jane, acuity, simplepractice, glossgenius';

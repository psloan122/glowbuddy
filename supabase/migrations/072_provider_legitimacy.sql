-- 072: Provider legitimacy columns + bulk update RPC
--
-- Adds three columns populated by scripts/legitimacy_classifier.py and a
-- service_role-only RPC used by scripts/upload-legitimacy.mjs to apply
-- classifier output in bulk without clobbering unrelated fields.

ALTER TABLE public.providers
  ADD COLUMN IF NOT EXISTS legitimacy TEXT,
  ADD COLUMN IF NOT EXISTS legitimacy_score INTEGER,
  ADD COLUMN IF NOT EXISTS legitimacy_source TEXT;

COMMENT ON COLUMN public.providers.legitimacy IS
  'Automated med-spa classification label (confirmed_med_spa, likely_med_spa, mixed, unclassified, etc.)';
COMMENT ON COLUMN public.providers.legitimacy_score IS
  'Raw classifier score; positive = med-spa signal, negative = other';
COMMENT ON COLUMN public.providers.legitimacy_source IS
  'supabase_google_maps | scraped_website | (empty)';

CREATE INDEX IF NOT EXISTS idx_providers_legitimacy
  ON public.providers (legitimacy)
  WHERE legitimacy IS NOT NULL;

-- Bulk-update helper called from scripts/upload-legitimacy.mjs.
-- Each row in `payload` is applied via COALESCE so NULL values in the
-- payload never overwrite existing DB data — Phase A is additive only.
CREATE OR REPLACE FUNCTION public.bulk_update_provider_legitimacy(payload jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE public.providers p
  SET
    website           = COALESCE(u.website,           p.website),
    lat               = COALESCE(u.lat,               p.lat),
    lng               = COALESCE(u.lng,               p.lng),
    legitimacy        = COALESCE(u.legitimacy,        p.legitimacy),
    legitimacy_score  = COALESCE(u.legitimacy_score,  p.legitimacy_score),
    legitimacy_source = COALESCE(u.legitimacy_source, p.legitimacy_source)
  FROM jsonb_to_recordset(payload) AS u(
    id                uuid,
    website           text,
    lat               numeric,
    lng               numeric,
    legitimacy        text,
    legitimacy_score  integer,
    legitimacy_source text
  )
  WHERE p.id = u.id;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

REVOKE ALL ON FUNCTION public.bulk_update_provider_legitimacy(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bulk_update_provider_legitimacy(jsonb) TO service_role;

-- Classification metadata columns for medical-aesthetics filtering pass.
-- Generated 2026-04-06 alongside the strict 3-phase classification pass.

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS is_medical_aesthetic boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS classification_source text,
  ADD COLUMN IF NOT EXISTS classification_reason text,
  ADD COLUMN IF NOT EXISTS classified_at timestamptz;

-- Index to speed up active+medical filters used by the marketplace pages.
CREATE INDEX IF NOT EXISTS idx_providers_active_medical
  ON providers (is_active, is_medical_aesthetic)
  WHERE is_active = true AND is_medical_aesthetic = true;

-- Migration 054: simple inline "Active Special" field on providers.
--
-- Separate from the full promoted-specials flow in migration 019
-- (`provider_specials` table). This is a lightweight text field that
-- claimed providers can edit from the dashboard to surface a single
-- current promo on their browse-card without going through the paid
-- promoted-specials workflow.
--
-- Display rule (enforced in src/components/ProcedureCard.jsx and
-- src/components/BrandGroupCard.jsx):
--   Show banner when active_special IS NOT NULL AND
--     (special_expires_at IS NULL OR special_expires_at > NOW()).

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS active_special       text,
  ADD COLUMN IF NOT EXISTS special_expires_at   timestamptz,
  ADD COLUMN IF NOT EXISTS special_added_at     timestamptz;

COMMENT ON COLUMN providers.active_special IS
  'Free-form promo text shown at the top of the provider card on browse results. Max 80 chars enforced client-side.';
COMMENT ON COLUMN providers.special_expires_at IS
  'Optional expiry for the active_special. When past, the banner is hidden.';
COMMENT ON COLUMN providers.special_added_at IS
  'When the current active_special was last set. Used for sorting / audit.';

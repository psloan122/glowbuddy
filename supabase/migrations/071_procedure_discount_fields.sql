-- Migration 071: Add discount tracking to patient-submitted procedures
--
-- Allows patients to flag when they received a discount (military, loyalty,
-- first-time, etc.) so the price can be correctly badged on browse cards
-- and excluded from market average calculations.

ALTER TABLE procedures
  ADD COLUMN IF NOT EXISTS discount_type text,
  ADD COLUMN IF NOT EXISTS discount_amount integer;

COMMENT ON COLUMN procedures.discount_type IS
  'Discount category reported by the patient: Military/Veteran, First Visit, Loyalty, Referral, Seasonal, Other. NULL = no discount.';
COMMENT ON COLUMN procedures.discount_amount IS
  'Dollar amount saved (optional). NULL when not provided.';

-- Migration 056: procedure_slugs + brands on user_preferences
--
-- Drives the personalized browse experience (PROMPT 8). When a logged-in
-- user has saved treatment preferences we skip the ProcedureGate and render
-- their treatments directly, grouped by provider.
--
-- `procedure_slugs` holds pill slugs ("neurotoxin", "filler", "laser",
-- "weight-loss", etc.) matching PROCEDURE_PILLS in src/lib/constants.js.
-- `brands`          holds specific brand names ("Botox", "Dysport",
-- "Juvederm", etc.) matching provider_pricing.brand values.

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS procedure_slugs text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS brands          text[] NOT NULL DEFAULT '{}';

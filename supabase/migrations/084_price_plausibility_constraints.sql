-- ════════════════════════════════════════════════════════════════════════
-- 084: Neurotoxin price plausibility enforcement
-- ════════════════════════════════════════════════════════════════════════
--
-- PURPOSE: Final-defense layer that catches price/label mismatches before
-- they enter the visible dataset. Applies to neurotoxin procedures only
-- (Botox, Dysport, Xeomin, Jeuveau, Daxxify, generic "Neurotoxin" rows).
--
-- MECHANISM: BEFORE INSERT OR UPDATE trigger on provider_pricing.
--   If a row violates brand-specific price bounds:
--     1. A copy is inserted into provider_pricing_quarantine (for review).
--     2. The source row is suppressed (display_suppressed = true) with a
--        suppression_reason describing the violation.
--     3. The row IS written to provider_pricing — no silent data loss.
--        Ingest scripts see count=1, no errors.
--   Admin workflow: query provider_pricing_quarantine, fix, then re-activate
--   the provider_pricing row by setting display_suppressed = false.
--
-- BOUNDS (derived from botox-low-price-investigation.md + migration 083):
--
--   per_unit (brand-specific):
--     Botox    $8 – $50    (H4/membership floor; $50+ impossible per-unit)
--     Dysport  $3 – $15    (Dysport is ~$3.50–$5/unit wholesale)
--     Xeomin   $8 – $35    (similar to Botox, less premium ceiling)
--     Jeuveau  $6 – $25    (consistently cheaper than Botox)
--     Daxxify  $8 – $30    (similar range post-launch)
--     NULL     $3 – $50    (widest band — cannot safely narrow without brand)
--
--   per_session   $75 – $1,500  (lip flip ~$100, full face ~$400, therapeutic ~$1k)
--   flat_package  $50 – $5,000  ($50-$74 small packages preserved; >$5k is scraper noise)
--   per_area      $30 – $2,000  (small area lip flip ~$40; hyperhidrosis ~$1,200)
--   per_vial      $200 – $2,500 (vial pricing for clinics, not retail)
--
-- NOTE: flat_package < $75 is NOT enforced because $50–$74 "starter package"
-- tiers are legitimate (confirmed via provider spot-checks). Only > $5000 is
-- enforced as clearly scraper noise.
--
-- PRE-FLIGHT VIOLATOR COUNT (rows currently in DB that would be quarantined
-- on their first UPDATE after this migration runs):
--   Botox per_unit outside [8–50]:    35 rows
--   Dysport per_unit outside [3–15]:  34 rows
--   flat_package above 5000:          24 rows
--   Jeuveau per_unit outside [6–25]:  17 rows
--   Xeomin per_unit outside [8–35]:   15 rows
--   Daxxify per_unit outside [8–30]:  13 rows
--   per_session outside [75–1500]:     0 rows
--   TOTAL:                           138 rows
--
-- These 138 rows are NOT automatically quarantined by this migration — the
-- trigger only fires on INSERT or UPDATE, not retroactively. To quarantine
-- them, run migration 085_price_plausibility_backfill.sql (separate file,
-- reviewed separately).
--
-- BACKWARDS COMPATIBILITY: All ingest paths are INSERT-based. They will
-- receive their rows in provider_pricing (display_suppressed=true) with no
-- errors thrown. No schema changes, no column additions to provider_pricing.
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Quarantine table ──────────────────────────────────────────────────
-- Mirrors provider_pricing with three extra columns.
-- original_id → the provider_pricing.id of the quarantined row.
-- quarantined_at → when the trigger fired.
-- quarantine_reason → human-readable bounds violation description.
--
-- NOT a foreign key to provider_pricing.id — the source row may later be
-- deleted or the id may not yet be committed when the trigger fires on INSERT.

CREATE TABLE IF NOT EXISTS provider_pricing_quarantine (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_id         uuid,                -- provider_pricing.id at time of violation
  quarantined_at      timestamptz NOT NULL DEFAULT now(),
  quarantine_reason   text        NOT NULL,
  -- Mirror columns from provider_pricing (nullable — schema may evolve)
  provider_id         uuid,
  procedure_type      text,
  brand               text,
  price               numeric,
  price_label         text,
  treatment_area      text,
  units_or_volume     text,
  source              text,
  verified            boolean,
  source_url          text,
  scraped_at          timestamptz,
  notes               text,
  is_active           boolean,
  confidence_tier     integer,
  created_at          timestamptz
);

-- Index for admin queries: look up all quarantine entries for a provider.
CREATE INDEX IF NOT EXISTS idx_ppq_provider_id
  ON provider_pricing_quarantine (provider_id);

-- Index for admin queries: find quarantine entries by original row.
CREATE INDEX IF NOT EXISTS idx_ppq_original_id
  ON provider_pricing_quarantine (original_id);

-- ── 2. Trigger function ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_check_neurotoxin_plausibility()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_brand      text;
  v_reason     text := NULL;
  v_unit_lo    numeric;
  v_unit_hi    numeric;
BEGIN
  -- ── Guard 1: only neurotoxin procedure types ─────────────────────────
  IF NEW.procedure_type NOT ILIKE ANY (
      ARRAY['%botox%','%dysport%','%xeomin%','%jeuveau%','%daxxify%','%neurotox%']
  ) THEN
    RETURN NEW;
  END IF;

  -- ── Guard 2: already suppressed → skip ──────────────────────────────
  -- Prevents the trigger from re-quarantining a row it just suppressed
  -- (only relevant if something later UPDATEs a suppressed row).
  IF NEW.display_suppressed = true THEN
    RETURN NEW;
  END IF;

  -- ── Guard 3: must have a positive price to check ─────────────────────
  IF NEW.price IS NULL OR NEW.price <= 0 THEN
    RETURN NEW;
  END IF;

  -- Normalize brand to lowercase for matching; fall back to procedure_type.
  v_brand := lower(coalesce(NEW.brand, NEW.procedure_type, ''));

  -- ──────────────────────────────────────────────────────────────────────
  -- CHECK A: per_unit brand-specific bounds
  -- ──────────────────────────────────────────────────────────────────────
  IF NEW.price_label = 'per_unit' THEN

    IF v_brand LIKE '%dysport%' THEN
      v_unit_lo := 3;  v_unit_hi := 15;
    ELSIF v_brand LIKE '%jeuveau%' THEN
      v_unit_lo := 6;  v_unit_hi := 25;
    ELSIF v_brand LIKE '%daxxify%' THEN
      v_unit_lo := 8;  v_unit_hi := 30;
    ELSIF v_brand LIKE '%xeomin%' THEN
      v_unit_lo := 8;  v_unit_hi := 35;
    ELSIF v_brand LIKE '%botox%' THEN
      v_unit_lo := 8;  v_unit_hi := 50;
    ELSE
      -- NULL brand or generic procedure_type: use widest safe band.
      v_unit_lo := 3;  v_unit_hi := 50;
    END IF;

    IF NEW.price < v_unit_lo OR NEW.price > v_unit_hi THEN
      v_reason := format(
        'per_unit $%s out of brand range [%s–%s] for brand=%s procedure=%s',
        NEW.price, v_unit_lo, v_unit_hi,
        coalesce(NEW.brand, 'NULL'), NEW.procedure_type
      );
    END IF;

  -- ──────────────────────────────────────────────────────────────────────
  -- CHECK B: per_session bounds
  -- ──────────────────────────────────────────────────────────────────────
  ELSIF NEW.price_label = 'per_session' THEN
    IF NEW.price < 75 OR NEW.price > 1500 THEN
      v_reason := format(
        'per_session $%s out of range [75–1500]', NEW.price
      );
    END IF;

  -- ──────────────────────────────────────────────────────────────────────
  -- CHECK C: flat_package bounds (only ceiling enforced — see file header)
  -- ──────────────────────────────────────────────────────────────────────
  ELSIF NEW.price_label = 'flat_package' THEN
    IF NEW.price > 5000 THEN
      v_reason := format(
        'flat_package $%s exceeds ceiling 5000', NEW.price
      );
    END IF;

  -- ──────────────────────────────────────────────────────────────────────
  -- CHECK D: per_area bounds
  -- ──────────────────────────────────────────────────────────────────────
  ELSIF NEW.price_label = 'per_area' THEN
    IF NEW.price < 30 OR NEW.price > 2000 THEN
      v_reason := format(
        'per_area $%s out of range [30–2000]', NEW.price
      );
    END IF;

  -- ──────────────────────────────────────────────────────────────────────
  -- CHECK E: per_vial bounds
  -- ──────────────────────────────────────────────────────────────────────
  ELSIF NEW.price_label = 'per_vial' THEN
    IF NEW.price < 200 OR NEW.price > 2500 THEN
      v_reason := format(
        'per_vial $%s out of range [200–2500]', NEW.price
      );
    END IF;

  END IF;

  -- ──────────────────────────────────────────────────────────────────────
  -- VIOLATION FOUND: quarantine + suppress
  -- ──────────────────────────────────────────────────────────────────────
  IF v_reason IS NOT NULL THEN
    INSERT INTO provider_pricing_quarantine (
      original_id,
      quarantine_reason,
      provider_id,
      procedure_type,
      brand,
      price,
      price_label,
      treatment_area,
      units_or_volume,
      source,
      verified,
      source_url,
      scraped_at,
      notes,
      is_active,
      confidence_tier,
      created_at
    ) VALUES (
      NEW.id,
      v_reason,
      NEW.provider_id,
      NEW.procedure_type,
      NEW.brand,
      NEW.price,
      NEW.price_label,
      NEW.treatment_area,
      NEW.units_or_volume,
      NEW.source,
      NEW.verified,
      NEW.source_url,
      NEW.scraped_at,
      NEW.notes,
      NEW.is_active,
      NEW.confidence_tier,
      NEW.created_at
    );

    -- Suppress the row in provider_pricing rather than dropping it.
    -- The row is preserved for audit; ingest scripts see no errors.
    NEW.display_suppressed  := true;
    NEW.suppression_reason  := 'plausibility_violation: ' || v_reason;
  END IF;

  RETURN NEW;
END;
$$;

-- ── 3. Attach trigger ────────────────────────────────────────────────────
-- DROP before CREATE to allow safe re-runs of this migration.

DROP TRIGGER IF EXISTS trg_neurotoxin_price_plausibility ON provider_pricing;

CREATE TRIGGER trg_neurotoxin_price_plausibility
  BEFORE INSERT OR UPDATE ON provider_pricing
  FOR EACH ROW
  EXECUTE FUNCTION fn_check_neurotoxin_plausibility();

COMMIT;

-- ════════════════════════════════════════════════════════════════════════
-- POST-DEPLOY VERIFICATION
-- Run manually after applying to confirm trigger is attached and the
-- quarantine table exists.
-- ════════════════════════════════════════════════════════════════════════
/*
-- 1. Confirm trigger is registered:
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'provider_pricing'::regclass
  AND tgname = 'trg_neurotoxin_price_plausibility';

-- 2. Confirm quarantine table exists:
SELECT COUNT(*) FROM provider_pricing_quarantine;

-- 3. Smoke test — insert a bad row and verify it is suppressed + quarantined:
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO provider_pricing (
    id, provider_id, procedure_type, brand,
    price, price_label, source, is_active
  ) VALUES (
    v_id,
    (SELECT id FROM providers LIMIT 1),
    'Botox', 'Botox',
    999, 'per_unit', 'test', true
  );
  -- Expect display_suppressed = true
  PERFORM 1 FROM provider_pricing
    WHERE id = v_id AND display_suppressed = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SMOKE TEST FAILED: row not suppressed';
  END IF;
  -- Expect quarantine entry
  PERFORM 1 FROM provider_pricing_quarantine
    WHERE original_id = v_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SMOKE TEST FAILED: no quarantine entry';
  END IF;
  -- Clean up test row
  DELETE FROM provider_pricing WHERE id = v_id;
  DELETE FROM provider_pricing_quarantine WHERE original_id = v_id;
  RAISE NOTICE 'SMOKE TEST PASSED';
END $$;
*/

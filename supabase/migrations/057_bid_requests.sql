-- 057_bid_requests.sql — Bid Request feature
--
-- Patients post treatment requests; providers submit competitive bids;
-- GlowBuddy charges a $35 lead fee on acceptance. MVP tracks pending
-- charges manually (admin UI) with full Stripe automation deferred.
--
-- Tables:
--   bid_requests     — one row per patient request (24hr TTL)
--   provider_bids    — provider bids on a request, with glowbuddy_score
--   pending_charges  — ledger of $35 lead fees to charge on acceptance
--
-- Also extends user_notifications with generic type/title/body/data cols
-- and bid_request_id / provider_bid_id FKs so the existing notification
-- pipeline can fan out bid events without a new table.

-- ── bid_requests ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bid_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  procedure_slug text NOT NULL,
  brand_preference text,
  units_needed integer,
  treatment_areas text[],
  city text NOT NULL,
  state text NOT NULL,
  lat double precision,
  lng double precision,
  radius_miles integer DEFAULT 25,
  budget_min integer,
  budget_max integer,
  available_dates text[],
  available_times text,
  experience_level text CHECK (experience_level IN
    ('first_time', 'some_experience', 'experienced')),
  patient_notes text,
  status text DEFAULT 'open' CHECK (status IN
    ('open', 'closed', 'expired', 'cancelled')),
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  bids_count integer DEFAULT 0,
  accepted_bid_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bid_requests_status_expires
  ON bid_requests (status, expires_at);
CREATE INDEX IF NOT EXISTS idx_bid_requests_city_state_status
  ON bid_requests (city, state, status);
CREATE INDEX IF NOT EXISTS idx_bid_requests_user
  ON bid_requests (user_id, created_at DESC);

-- ── provider_bids ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS provider_bids (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid REFERENCES bid_requests(id) ON DELETE CASCADE NOT NULL,
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE NOT NULL,
  injector_name text,
  injector_credentials text,
  brand_offered text,
  price_per_unit numeric(10, 2),
  total_price numeric(10, 2) NOT NULL,
  available_slots jsonb,
  message_to_patient text,
  add_ons text,
  glowbuddy_score numeric(4, 1),
  status text DEFAULT 'pending' CHECK (status IN
    ('pending', 'accepted', 'declined', 'expired')),
  lead_fee_charged boolean DEFAULT false,
  lead_fee_amount numeric(10, 2) DEFAULT 35.00,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_provider_bids_request_status
  ON provider_bids (request_id, status);
CREATE INDEX IF NOT EXISTS idx_provider_bids_provider_status
  ON provider_bids (provider_id, status);

-- ── pending_charges ───────────────────────────────────────────────────
-- MVP ledger of $35 lead fees. Admin marks rows as charged manually.
CREATE TABLE IF NOT EXISTS pending_charges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id uuid REFERENCES providers(id) ON DELETE CASCADE NOT NULL,
  bid_id uuid REFERENCES provider_bids(id) ON DELETE CASCADE NOT NULL,
  request_id uuid REFERENCES bid_requests(id) ON DELETE CASCADE NOT NULL,
  amount numeric(10, 2) NOT NULL DEFAULT 35.00,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN
    ('pending', 'charged', 'failed', 'refunded', 'waived')),
  stripe_payment_intent text,
  notes text,
  created_at timestamptz DEFAULT now(),
  charged_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_pending_charges_status_created
  ON pending_charges (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pending_charges_provider
  ON pending_charges (provider_id, created_at DESC);

-- ── user_notifications extension ──────────────────────────────────────
-- The existing user_notifications table (from 030) only knew how to
-- carry injector_update_id and price_alert_trigger_id. Add generic
-- columns so bid events can pipe through the same bell + feed.
ALTER TABLE user_notifications
  ADD COLUMN IF NOT EXISTS type text,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS body text,
  ADD COLUMN IF NOT EXISTS data jsonb,
  ADD COLUMN IF NOT EXISTS bid_request_id uuid REFERENCES bid_requests(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS provider_bid_id uuid REFERENCES provider_bids(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_user_notifications_type_user
  ON user_notifications (user_id, type, created_at DESC)
  WHERE type IS NOT NULL;

-- ── Row Level Security ────────────────────────────────────────────────
ALTER TABLE bid_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_charges ENABLE ROW LEVEL SECURITY;

-- bid_requests: patient owns their own rows. Providers (authenticated
-- users with a claimed listing) can read any `open` row so they can bid.
DROP POLICY IF EXISTS bid_requests_owner_read ON bid_requests;
CREATE POLICY bid_requests_owner_read ON bid_requests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS bid_requests_owner_write ON bid_requests;
CREATE POLICY bid_requests_owner_write ON bid_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS bid_requests_owner_update ON bid_requests;
CREATE POLICY bid_requests_owner_update ON bid_requests
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS bid_requests_provider_read_open ON bid_requests;
CREATE POLICY bid_requests_provider_read_open ON bid_requests
  FOR SELECT USING (
    status = 'open'
    AND EXISTS (
      SELECT 1 FROM providers p
      WHERE p.owner_user_id = auth.uid()
        AND p.is_active = true
    )
  );

-- provider_bids:
--   Providers see/write their own bids (any status)
--   Patients see all bids on a request they own
DROP POLICY IF EXISTS provider_bids_provider_read ON provider_bids;
CREATE POLICY provider_bids_provider_read ON provider_bids
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM providers p
      WHERE p.id = provider_bids.provider_id
        AND p.owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS provider_bids_provider_insert ON provider_bids;
CREATE POLICY provider_bids_provider_insert ON provider_bids
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM providers p
      WHERE p.id = provider_bids.provider_id
        AND p.owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS provider_bids_patient_read ON provider_bids;
CREATE POLICY provider_bids_patient_read ON provider_bids
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bid_requests br
      WHERE br.id = provider_bids.request_id
        AND br.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS provider_bids_patient_update ON provider_bids;
CREATE POLICY provider_bids_patient_update ON provider_bids
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM bid_requests br
      WHERE br.id = provider_bids.request_id
        AND br.user_id = auth.uid()
    )
  );

-- pending_charges: admin-only for now. No RLS read/write policies are
-- added so only the service role can touch these rows (admin UI uses
-- the standard client but we gate it via user_metadata.user_role).
-- Provider can read their own rows for transparency.
DROP POLICY IF EXISTS pending_charges_provider_read ON pending_charges;
CREATE POLICY pending_charges_provider_read ON pending_charges
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM providers p
      WHERE p.id = pending_charges.provider_id
        AND p.owner_user_id = auth.uid()
    )
  );

-- ── bids_count trigger ────────────────────────────────────────────────
-- Keep bid_requests.bids_count in sync with provider_bids so inbox
-- queries don't need an extra count(*) per row.
CREATE OR REPLACE FUNCTION bump_bid_request_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE bid_requests
       SET bids_count = bids_count + 1
     WHERE id = NEW.request_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE bid_requests
       SET bids_count = GREATEST(0, bids_count - 1)
     WHERE id = OLD.request_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bump_bid_request_count ON provider_bids;
CREATE TRIGGER trg_bump_bid_request_count
AFTER INSERT OR DELETE ON provider_bids
FOR EACH ROW EXECUTE FUNCTION bump_bid_request_count();

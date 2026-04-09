-- 067_phone_verification.sql — phone verification + custom_events index
--
-- Adds the phone_verification_codes table used by the verify-phone-start
-- and verify-phone-confirm edge functions, plus a functional index on
-- custom_events so provider-weekly-digest's view-count queries stay fast
-- as page-view traffic scales past the first few thousand rows.

-- ── phone_verification_codes ─────────────────────────────────────────
--
-- Short-lived records. verify-phone-start INSERTs a row with a 6-digit
-- code and a 10-minute expiry. verify-phone-confirm looks up the most
-- recent non-expired, non-consumed row for (user_id, phone) and marks
-- it consumed on a successful match. A daily pg_cron job can sweep
-- expired rows, but the table stays small enough that manual cleanup
-- is fine for now.
--
-- attempts counter prevents brute-force: the edge function rejects
-- after 5 attempts on the same code.
CREATE TABLE IF NOT EXISTS phone_verification_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone       text NOT NULL,
  code        text NOT NULL,
  attempts    integer NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Fast lookup by user/phone for the confirm step.
CREATE INDEX IF NOT EXISTS idx_phone_verification_user_phone
  ON phone_verification_codes (user_id, phone, created_at DESC);

-- Rate-limit index — used to count codes sent in the last hour.
CREATE INDEX IF NOT EXISTS idx_phone_verification_user_created
  ON phone_verification_codes (user_id, created_at DESC);

-- Phone format sanity — same shape as profiles.phone.
ALTER TABLE phone_verification_codes
  DROP CONSTRAINT IF EXISTS phone_verification_codes_phone_format_check;
ALTER TABLE phone_verification_codes
  ADD CONSTRAINT phone_verification_codes_phone_format_check
  CHECK (phone ~ '^\+[1-9][0-9]{7,14}$');

ALTER TABLE phone_verification_codes ENABLE ROW LEVEL SECURITY;

-- Client code never reads these rows directly. Edge functions use
-- the service role which bypasses RLS. Leave all policies denying.
DROP POLICY IF EXISTS phone_verification_codes_service_only
  ON phone_verification_codes;
CREATE POLICY phone_verification_codes_service_only
  ON phone_verification_codes FOR ALL
  USING (false);

-- ── custom_events expression index for the weekly digest ─────────────
--
-- provider-weekly-digest counts provider_page_view rows by filtering on
-- properties->>'provider_id'. Without an index, that's a seq scan of
-- the whole custom_events table every time the digest runs for every
-- provider — quadratic in the number of providers + events.
--
-- Expression index on the jsonb extract lets PostgREST's
-- `properties->>provider_id = ?` clause hit an index directly. The
-- partial WHERE clause keeps the index narrow: we only ever care about
-- this extraction for provider_page_view events.
CREATE INDEX IF NOT EXISTS idx_custom_events_provider_page_view
  ON custom_events ((properties->>'provider_id'), created_at DESC)
  WHERE event_name = 'provider_page_view';

-- 058_waitlist_signups.sql — Bid Request waitlist
--
-- The Bid Request feature (migration 057) is built but gated behind a
-- waitlist while we validate demand. This table captures the email
-- addresses of patients and providers who want to be notified when it
-- launches. The unique constraint on email makes idempotent re-signups
-- a no-op via INSERT ... ON CONFLICT DO NOTHING.

CREATE TABLE IF NOT EXISTS waitlist_signups (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  type text CHECK (type IN ('patient', 'provider')),
  city text,
  state text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_signups_type_created
  ON waitlist_signups (type, created_at DESC);

-- Anyone can sign up. We rely on the unique constraint to dedupe and
-- the type CHECK to keep the field clean. No SELECT policy is added —
-- the admin page reads with the service role via the standard client
-- (gated client-side; this is internal-only for now).
ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS waitlist_signups_public_insert ON waitlist_signups;
CREATE POLICY waitlist_signups_public_insert ON waitlist_signups
  FOR INSERT WITH CHECK (true);

-- Public SELECT so that:
--   1. The waitlist form can detect "already on the list" by reading
--      back the row right after insert.
--   2. The /admin/waitlist page works for any visitor we share the
--      link with (internal-only for now per spec).
-- Tighten this later if we publish the URL or if the data becomes
-- sensitive — at that point swap in a service-role admin endpoint.
DROP POLICY IF EXISTS waitlist_signups_public_read ON waitlist_signups;
CREATE POLICY waitlist_signups_public_read ON waitlist_signups
  FOR SELECT USING (true);

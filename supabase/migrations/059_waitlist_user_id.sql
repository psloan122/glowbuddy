-- 059_waitlist_user_id.sql — link waitlist signups to auth users
--
-- When a logged-in user joins the waitlist we want to store their
-- auth.users.id alongside the email. This lets us later match the
-- signup back to a user account without a second email lookup, and
-- enables one-click re-detection when the same user lands on the
-- waitlist page again (we query by email for simplicity, but having
-- the user_id is useful for analytics and future auditing).
--
-- Nullable because anonymous email-only signups are still supported.

ALTER TABLE waitlist_signups
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_waitlist_signups_user_id
  ON waitlist_signups (user_id)
  WHERE user_id IS NOT NULL;

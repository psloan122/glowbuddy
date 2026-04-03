-- Add 'pending_confirmation' as the default status for new procedures.
-- Submissions from unauthenticated users start as pending_confirmation
-- and move to 'active' once the user confirms their email.

ALTER TABLE procedures
  ALTER COLUMN status SET DEFAULT 'pending_confirmation';

-- Ensure the status column accepts the new value.
-- (If using an enum, add the value; if text, this is a no-op.)
-- The existing values are: 'active', 'pending' (for outlier review).
-- Adding 'pending_confirmation' for unconfirmed email submissions.

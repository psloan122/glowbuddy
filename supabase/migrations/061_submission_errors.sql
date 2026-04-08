-- 061_submission_errors.sql — log silent price-submission failures
--
-- The /log handler in src/pages/Log.jsx writes to the `procedures` table.
-- When that insert fails (RLS denial, schema mismatch, constraint violation,
-- network blip) we now surface the real error to the user AND insert a row
-- here so we can audit invisible data loss.
--
-- This was added in response to a real incident where Julia's submission
-- in Mandeville LA was being saved as `status='pending'` because the
-- outlier detector had a min sample size of 3 and a ±40% threshold —
-- triggering false positives in low-volume markets and hiding her
-- legitimate price from /browse. The outlier thresholds were widened in
-- src/lib/outlierDetection.js, and any future failures will land here.

CREATE TABLE IF NOT EXISTS submission_errors (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  procedure_type text,
  city text,
  state text,
  error_code text,
  error_message text,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submission_errors_created
  ON submission_errors (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_submission_errors_user
  ON submission_errors (user_id, created_at DESC);

ALTER TABLE submission_errors ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) can write — we want to capture failures from
-- *every* code path, including ones where auth itself is the problem.
DROP POLICY IF EXISTS submission_errors_public_insert ON submission_errors;
CREATE POLICY submission_errors_public_insert ON submission_errors
  FOR INSERT WITH CHECK (true);

-- Users can read their own error rows (so a "your last submission failed"
-- banner could be added later). No public SELECT — admin reads via the
-- service role.
DROP POLICY IF EXISTS submission_errors_owner_read ON submission_errors;
CREATE POLICY submission_errors_owner_read ON submission_errors
  FOR SELECT USING (auth.uid() = user_id);

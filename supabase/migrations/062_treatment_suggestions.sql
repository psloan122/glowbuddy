-- 062_treatment_suggestions.sql — capture "missing treatment" requests
--
-- First-time users browsing /browse or filling out /log occasionally
-- look for treatments that aren't on our pill list yet (peptide therapy,
-- exosomes, polynucleotides, etc). Instead of dead-ending them with "no
-- results", every treatment-picker now shows a "Don't see your
-- treatment? Suggest it" inline form that writes here.
--
-- We capture city/state at the time of suggestion so we can prioritize
-- which treatments to add next based on geographic demand.

CREATE TABLE IF NOT EXISTS treatment_suggestions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  treatment_name text NOT NULL,
  suggested_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  city text,
  state text,
  source text,
  created_at timestamptz DEFAULT now(),
  status text DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_treatment_suggestions_created
  ON treatment_suggestions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_treatment_suggestions_status
  ON treatment_suggestions (status, created_at DESC);

ALTER TABLE treatment_suggestions ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or authenticated) can submit a suggestion. The form
-- shows up everywhere, including the gate state where the user hasn't
-- signed in yet, so we deliberately don't gate on auth.
DROP POLICY IF EXISTS treatment_suggestions_public_insert ON treatment_suggestions;
CREATE POLICY treatment_suggestions_public_insert ON treatment_suggestions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Users can read their own suggestions back (e.g. for a "thanks, we got
-- it" history view in settings later). No public SELECT — admins read
-- via the service role from /admin.
DROP POLICY IF EXISTS treatment_suggestions_owner_read ON treatment_suggestions;
CREATE POLICY treatment_suggestions_owner_read ON treatment_suggestions
  FOR SELECT USING (auth.uid() = suggested_by);

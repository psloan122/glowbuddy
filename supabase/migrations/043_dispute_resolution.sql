-- A. Resolution tracking columns on disputes
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES auth.users(id);
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS response_note TEXT;

-- B. Index for status filtering
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);

-- C. Replace admin-only UPDATE policy with admin-or-provider-owner
DROP POLICY IF EXISTS "Admin update disputes" ON disputes;
CREATE POLICY "Admin or provider owner update disputes"
  ON disputes FOR UPDATE
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = disputes.provider_id
      AND providers.owner_user_id = auth.uid()
    )
  );

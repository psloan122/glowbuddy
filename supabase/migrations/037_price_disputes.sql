-- Migration 037: Community price dispute system
-- Allows any authenticated user to flag a submission they believe is inaccurate.
-- Separate from the existing provider-initiated disputes table.

-- A. New columns on procedures
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS dispute_count INTEGER DEFAULT 0;
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS is_disputed BOOLEAN DEFAULT false;
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS dispute_resolved_at TIMESTAMPTZ;
ALTER TABLE procedures ADD COLUMN IF NOT EXISTS dispute_resolution TEXT
  CHECK (dispute_resolution IN ('confirmed', 'updated', 'removed'));

-- B. New procedure_disputes table
CREATE TABLE procedure_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  procedure_id UUID NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
  disputed_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL CHECK (reason IN ('price_wrong','wrong_provider','wrong_procedure','looks_fake','other')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(procedure_id, disputed_by)
);

-- C. Index for counting disputes per procedure
CREATE INDEX idx_procedure_disputes_procedure ON procedure_disputes(procedure_id);

-- D. RLS policies
ALTER TABLE procedure_disputes ENABLE ROW LEVEL SECURITY;

-- Users can insert disputes (but not on their own submissions)
CREATE POLICY "Users can flag submissions"
  ON procedure_disputes FOR INSERT
  TO authenticated
  WITH CHECK (
    disputed_by = auth.uid()
    AND procedure_id NOT IN (
      SELECT id FROM procedures WHERE user_id = auth.uid()
    )
  );

-- Users can read their own disputes (to check "already flagged" state)
CREATE POLICY "Users can read own disputes"
  ON procedure_disputes FOR SELECT
  TO authenticated
  USING (disputed_by = auth.uid());

-- Service role / admin can read all
CREATE POLICY "Service role reads all disputes"
  ON procedure_disputes FOR SELECT
  TO service_role
  USING (true);

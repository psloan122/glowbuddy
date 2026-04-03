-- 017: Verified Patient
-- Verification submissions and user verification tier tracking

CREATE TABLE IF NOT EXISTS verification_submissions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_type text NOT NULL CHECK (verification_type IN ('self_reported', 'appointment_confirmed', 'receipt_verified')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  evidence_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id),
  reviewer_notes text
);

CREATE INDEX idx_verification_submissions_user ON verification_submissions (user_id);
CREATE INDEX idx_verification_submissions_status ON verification_submissions (status);

CREATE TABLE IF NOT EXISTS user_verification (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  verification_tier text NOT NULL DEFAULT 'self_reported' CHECK (verification_tier IN ('self_reported', 'appointment_confirmed', 'receipt_verified')),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE verification_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_verification ENABLE ROW LEVEL SECURITY;

-- Users can read and insert their own submissions
CREATE POLICY "Users read own submissions"
  ON verification_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create own submissions"
  ON verification_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admin can read all and update status (via service key or SECURITY DEFINER functions)
-- For v1, admin updates happen through the admin panel with service-level access

-- user_verification is publicly readable (for showing badges)
CREATE POLICY "Public can read verification tiers"
  ON user_verification FOR SELECT
  USING (true);

-- Users can insert their own verification row
CREATE POLICY "Users create own verification"
  ON user_verification FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own verification row
CREATE POLICY "Users update own verification"
  ON user_verification FOR UPDATE
  USING (auth.uid() = user_id);

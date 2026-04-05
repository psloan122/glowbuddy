-- 039: Security audit fixes — comprehensive migration
-- Covers: admin auth, RLS policies, credit functions, rate limiting,
-- account deletion, profiles scoping, submission rate limiting

-- ============================================
-- A. is_admin() function using JWT user_metadata
-- ============================================
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      (auth.jwt() -> 'user_metadata' ->> 'user_role') = 'admin',
      false
    )
  );
END;
$$;

-- ============================================
-- B. Admin-only read policies on sensitive tables
-- ============================================

-- procedures: admin can read ALL statuses
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'procedures' AND policyname = 'Admin read all procedures') THEN
    DROP POLICY "Admin read all procedures" ON procedures;
  END IF;
END $$;
CREATE POLICY "Admin read all procedures"
  ON procedures FOR SELECT
  USING (is_admin());

-- disputes: admin read
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'disputes' AND policyname = 'Admin read disputes') THEN
    DROP POLICY "Admin read disputes" ON disputes;
  END IF;
END $$;
CREATE POLICY "Admin read disputes"
  ON disputes FOR SELECT
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = disputes.provider_id
      AND providers.owner_user_id = auth.uid()
    )
  );

-- Admin update disputes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'disputes' AND policyname = 'Admin update disputes') THEN
    DROP POLICY "Admin update disputes" ON disputes;
  END IF;
END $$;
CREATE POLICY "Admin update disputes"
  ON disputes FOR UPDATE
  USING (is_admin());

-- giveaway_entries: admin read
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'giveaway_entries' AND policyname = 'Admin read giveaway entries') THEN
    DROP POLICY "Admin read giveaway entries" ON giveaway_entries;
  END IF;
END $$;
CREATE POLICY "Admin read giveaway entries"
  ON giveaway_entries FOR SELECT
  USING (is_admin());

-- reviews: admin read flagged
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'Admin read all reviews') THEN
    CREATE POLICY "Admin read all reviews"
      ON reviews FOR SELECT
      USING (is_admin());
  END IF;
END $$;

-- Admin update reviews
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'Admin update reviews') THEN
    CREATE POLICY "Admin update reviews"
      ON reviews FOR UPDATE
      USING (is_admin());
  END IF;
END $$;

-- verification_submissions: admin read + update
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'verification_submissions' AND policyname = 'Admin read verification submissions') THEN
    CREATE POLICY "Admin read verification submissions"
      ON verification_submissions FOR SELECT
      USING (is_admin());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'verification_submissions' AND policyname = 'Admin update verification submissions') THEN
    CREATE POLICY "Admin update verification submissions"
      ON verification_submissions FOR UPDATE
      USING (is_admin());
  END IF;
END $$;

-- before_after_photos: admin read + update
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'before_after_photos' AND policyname = 'Admin read all photos') THEN
    CREATE POLICY "Admin read all photos"
      ON before_after_photos FOR SELECT
      USING (is_admin());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'before_after_photos' AND policyname = 'Admin update photos') THEN
    CREATE POLICY "Admin update photos"
      ON before_after_photos FOR UPDATE
      USING (is_admin());
  END IF;
END $$;

-- Admin update procedures (approve/remove)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'procedures' AND policyname = 'Admin update procedures') THEN
    CREATE POLICY "Admin update procedures"
      ON procedures FOR UPDATE
      USING (is_admin());
  END IF;
END $$;

-- ============================================
-- C. Fix procedures INSERT — enforce user_id match
-- ============================================
DROP POLICY IF EXISTS "Anyone can insert procedures" ON procedures;
DROP POLICY IF EXISTS "Insert own procedures" ON procedures;
CREATE POLICY "Insert own procedures"
  ON procedures FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users read own procedures (any status)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'procedures' AND policyname = 'Users read own procedures') THEN
    CREATE POLICY "Users read own procedures"
      ON procedures FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- D. Fix reviews INSERT — enforce user_id match
-- ============================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'Authenticated insert reviews') THEN
    DROP POLICY "Authenticated insert reviews" ON reviews;
  END IF;
END $$;
DROP POLICY IF EXISTS "Users insert own reviews" ON reviews;
CREATE POLICY "Users insert own reviews"
  ON reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- E. Fix giveaway_entries INSERT — enforce user_id
-- ============================================
DROP POLICY IF EXISTS "Anyone insert giveaway entries" ON giveaway_entries;
DROP POLICY IF EXISTS "Users insert own giveaway entries" ON giveaway_entries;
CREATE POLICY "Users insert own giveaway entries"
  ON giveaway_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users read own entries
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'giveaway_entries' AND policyname = 'Users read own giveaway entries') THEN
    CREATE POLICY "Users read own giveaway entries"
      ON giveaway_entries FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- F. Fix pioneer_giveaway_entries — enforce user_id + restrict SELECT
-- ============================================
DROP POLICY IF EXISTS "Anyone can insert pioneer_giveaway_entries" ON pioneer_giveaway_entries;
DROP POLICY IF EXISTS "Users insert own pioneer giveaway entries" ON pioneer_giveaway_entries;
CREATE POLICY "Users insert own pioneer giveaway entries"
  ON pioneer_giveaway_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin read pioneer_giveaway_entries" ON pioneer_giveaway_entries;
DROP POLICY IF EXISTS "Users read own pioneer giveaway entries" ON pioneer_giveaway_entries;
CREATE POLICY "pioneer_giveaway_entries_select"
  ON pioneer_giveaway_entries FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

-- ============================================
-- G. Fix user_verification — prevent self-upgrade
-- ============================================
DROP POLICY IF EXISTS "Users create own verification" ON user_verification;
DROP POLICY IF EXISTS "Users update own verification" ON user_verification;

-- SECURITY DEFINER function for admin verification management
CREATE OR REPLACE FUNCTION admin_set_verification_tier(
  p_user_id UUID,
  p_tier TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_verification (user_id, verification_tier, updated_at)
  VALUES (p_user_id, p_tier, now())
  ON CONFLICT (user_id)
  DO UPDATE SET verification_tier = p_tier, updated_at = now();
END;
$$;

-- ============================================
-- H. Fix credit_ledger — NO direct user inserts
-- ============================================
DROP POLICY IF EXISTS "Users insert own credit ledger" ON credit_ledger;
DROP POLICY IF EXISTS "Users insert deductions only" ON credit_ledger;
-- No INSERT policy at all — credits only via SECURITY DEFINER functions

-- SECURITY DEFINER function to award credits
CREATE OR REPLACE FUNCTION award_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_description TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_balance
  FROM credit_ledger
  WHERE user_id = p_user_id
    AND (expires_at IS NULL OR expires_at > now());

  v_balance := v_balance + p_amount;

  INSERT INTO credit_ledger (user_id, amount, balance_after, type, reference_id, description, expires_at)
  VALUES (p_user_id, p_amount, v_balance, p_type, p_reference_id, p_description, p_expires_at);

  RETURN v_balance;
END;
$$;

-- Atomic deduct_credits with row locking (fixes TOCTOU race condition)
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_type TEXT,
  p_description TEXT,
  p_reference_id UUID DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  -- Calculate current balance (locking via advisory lock for atomicity)
  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || 'credits'));

  SELECT COALESCE(SUM(amount), 0) INTO v_balance
  FROM credit_ledger
  WHERE user_id = p_user_id
    AND (expires_at IS NULL OR expires_at > now());

  IF v_balance < p_amount THEN
    RETURN false;
  END IF;

  INSERT INTO credit_ledger (user_id, amount, balance_after, type, reference_id, description)
  VALUES (p_user_id, -p_amount, v_balance - p_amount, p_type, p_reference_id, p_description);

  RETURN true;
END;
$$;

-- ============================================
-- I. Fix user_badges — no self-insert
-- ============================================
DROP POLICY IF EXISTS "System insert badges" ON user_badges;
-- No INSERT policy for users; badges only via SECURITY DEFINER

CREATE OR REPLACE FUNCTION award_badge(
  p_user_id UUID,
  p_badge_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_badges (user_id, badge_type)
  VALUES (p_user_id, p_badge_type)
  ON CONFLICT (user_id, badge_type) DO NOTHING;
END;
$$;

-- ============================================
-- J. Fix pioneer_records — no self-insert
-- ============================================
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pioneer_records' AND policyname = 'Authenticated insert own pioneer_records') THEN
    DROP POLICY "Authenticated insert own pioneer_records" ON pioneer_records;
  END IF;
END $$;
-- No INSERT policy for users; records only via SECURITY DEFINER

CREATE OR REPLACE FUNCTION award_pioneer_record(
  p_user_id UUID,
  p_provider_slug TEXT,
  p_provider_name TEXT,
  p_city TEXT,
  p_state TEXT,
  p_procedure_id UUID,
  p_pioneer_tier TEXT
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO pioneer_records (user_id, provider_slug, provider_name, city, state, procedure_id, pioneer_tier)
  VALUES (p_user_id, p_provider_slug, p_provider_name, p_city, p_state, p_procedure_id, p_pioneer_tier)
  ON CONFLICT (provider_slug, pioneer_tier) DO NOTHING
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ============================================
-- K. Profiles: add role column, scope public read
-- ============================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS terms_version TEXT;

-- Remove overly permissive "Public read profiles" policy
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Public read profiles') THEN
    DROP POLICY "Public read profiles" ON profiles;
  END IF;
END $$;

-- Create a limited public view for display-safe fields only
CREATE OR REPLACE VIEW public_profiles AS
SELECT
  user_id,
  display_name,
  city,
  state,
  created_at
FROM profiles;

GRANT SELECT ON public_profiles TO authenticated;
GRANT SELECT ON public_profiles TO anon;

-- ============================================
-- L. Rate limit log table
-- ============================================
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_cleanup ON rate_limit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_action ON rate_limit_log(user_id, action, created_at);

ALTER TABLE rate_limit_log ENABLE ROW LEVEL SECURITY;
-- No user-facing policies — only accessed via SECURITY DEFINER functions

-- Server-side submission rate limit check
CREATE OR REPLACE FUNCTION check_submission_rate_limit(p_user_id UUID)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM procedures
  WHERE user_id = p_user_id
    AND created_at > now() - INTERVAL '1 hour';
  RETURN v_count < 5;
END;
$$;

-- ============================================
-- M. Account deletion function (GDPR right to erasure)
-- ============================================
CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete in FK-safe order
  DELETE FROM credit_ledger WHERE user_id = v_user_id;
  DELETE FROM credit_redemptions WHERE user_id = v_user_id;
  DELETE FROM login_streaks WHERE user_id = v_user_id;
  DELETE FROM pioneer_giveaway_entries WHERE user_id = v_user_id;
  DELETE FROM giveaway_entries WHERE user_id = v_user_id;
  DELETE FROM pioneer_records WHERE user_id = v_user_id;
  DELETE FROM user_badges WHERE user_id = v_user_id;
  DELETE FROM verification_submissions WHERE user_id = v_user_id;
  DELETE FROM user_verification WHERE user_id = v_user_id;
  DELETE FROM reviews WHERE user_id = v_user_id;
  DELETE FROM referrals WHERE referrer_user_id = v_user_id OR referred_user_id = v_user_id;

  -- Anonymize submissions (preserve price data)
  UPDATE procedures SET user_id = NULL, is_anonymous = true WHERE user_id = v_user_id;

  -- Delete profile last
  DELETE FROM profiles WHERE user_id = v_user_id;
END;
$$;

-- 035: Glow Credits wallet & rewards system
-- Append-only credit ledger, redemption tracking, login streaks, provider GlowRewards

-- A. credit_ledger — append-only ledger of all credit transactions
CREATE TABLE IF NOT EXISTS credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'submission','receipt_verified','review','photo',
    'pioneer','referral','login_streak','freshness','dispute_defended',
    'rating','redeem_entry','redeem_special','redeem_treatment','expiry','admin'
  )),
  reference_id UUID,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_user ON credit_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_created ON credit_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_type ON credit_ledger(type);

ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own credit ledger"
  ON credit_ledger FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own credit ledger"
  ON credit_ledger FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- B. credit_redemptions — tracks each redemption event
CREATE TABLE IF NOT EXISTS credit_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  credits_spent INTEGER NOT NULL,
  redemption_type TEXT NOT NULL CHECK (redemption_type IN (
    'giveaway_entry','provider_special','treatment_credit'
  )),
  provider_id UUID REFERENCES providers(id),
  special_id UUID,
  status TEXT NOT NULL CHECK (status IN ('pending','confirmed','expired','cancelled')) DEFAULT 'pending',
  redemption_code TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_credit_redemptions_user ON credit_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_redemptions_code ON credit_redemptions(redemption_code);
CREATE INDEX IF NOT EXISTS idx_credit_redemptions_provider ON credit_redemptions(provider_id, status);

ALTER TABLE credit_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own redemptions"
  ON credit_redemptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own redemptions"
  ON credit_redemptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Providers read their redemptions"
  ON credit_redemptions FOR SELECT
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Providers update their redemptions"
  ON credit_redemptions FOR UPDATE
  USING (
    provider_id IN (
      SELECT id FROM providers WHERE owner_user_id = auth.uid()
    )
  );

-- C. Add GlowRewards fields to providers table
ALTER TABLE providers ADD COLUMN IF NOT EXISTS glow_rewards_enabled BOOLEAN DEFAULT false;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS glow_rewards_monthly_cap INTEGER DEFAULT 2500;
ALTER TABLE providers ADD COLUMN IF NOT EXISTS glow_rewards_redeemed_this_month INTEGER DEFAULT 0;

-- D. login_streaks — tracks daily login for streak credits
CREATE TABLE IF NOT EXISTS login_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
  current_streak INTEGER DEFAULT 0,
  last_login_date DATE,
  longest_streak INTEGER DEFAULT 0,
  total_streak_credits INTEGER DEFAULT 0
);

ALTER TABLE login_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own login streak"
  ON login_streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own login streak"
  ON login_streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own login streak"
  ON login_streaks FOR UPDATE
  USING (auth.uid() = user_id);

-- E. View: credit_balances — current balance per user (non-expired credits only)
CREATE OR REPLACE VIEW credit_balances AS
SELECT user_id, COALESCE(SUM(amount), 0) AS balance
FROM credit_ledger
WHERE expires_at IS NULL OR expires_at > NOW()
GROUP BY user_id;

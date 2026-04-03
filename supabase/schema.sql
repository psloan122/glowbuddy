-- GlowBuddy Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROCEDURES (crowdsourced patient submissions)
-- ============================================
CREATE TABLE procedures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  procedure_type TEXT NOT NULL,
  treatment_area TEXT NOT NULL,
  units_or_volume TEXT,
  price_paid INTEGER NOT NULL,
  provider_name TEXT NOT NULL,
  provider_slug TEXT,
  provider_type TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL CHECK (char_length(state) = 2),
  zip_code TEXT NOT NULL,
  date_of_treatment DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  is_anonymous BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'flagged', 'removed')),
  flagged_reason TEXT,
  outlier_flagged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROVIDERS (med spa business accounts)
-- ============================================
CREATE TABLE providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  provider_type TEXT NOT NULL,
  address TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL CHECK (char_length(state) = 2),
  zip_code TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  instagram TEXT,
  is_claimed BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROVIDER PRICING (uploaded by provider)
-- ============================================
CREATE TABLE provider_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE NOT NULL,
  procedure_type TEXT NOT NULL,
  treatment_area TEXT,
  units_or_volume TEXT,
  price INTEGER NOT NULL,
  price_label TEXT DEFAULT 'per session',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SPECIALS (provider-posted promotions)
-- ============================================
CREATE TABLE specials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  procedure_type TEXT,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed', 'free_add_on')),
  original_price INTEGER,
  special_price INTEGER,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DISPUTES (provider flags on patient submissions)
-- ============================================
CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  procedure_id UUID REFERENCES procedures(id) ON DELETE CASCADE NOT NULL,
  provider_id UUID REFERENCES providers(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GIVEAWAY ENTRIES (monthly drawing)
-- ============================================
CREATE TABLE giveaway_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  procedure_id UUID REFERENCES procedures(id) ON DELETE CASCADE NOT NULL,
  month TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USER BADGES
-- ============================================
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_type TEXT NOT NULL CHECK (badge_type IN ('glowgetter', 'price_pioneer', 'club_100')),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_type)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_procedures_type ON procedures(procedure_type);
CREATE INDEX idx_procedures_state ON procedures(state);
CREATE INDEX idx_procedures_status ON procedures(status);
CREATE INDEX idx_procedures_provider_slug ON procedures(provider_slug);
CREATE INDEX idx_procedures_zip ON procedures(zip_code);
CREATE INDEX idx_procedures_created ON procedures(created_at DESC);
CREATE INDEX idx_providers_slug ON providers(slug);
CREATE INDEX idx_providers_city_state ON providers(city, state);
CREATE INDEX idx_provider_pricing_provider ON provider_pricing(provider_id);
CREATE INDEX idx_specials_provider ON specials(provider_id);
CREATE INDEX idx_specials_active ON specials(is_active, expires_at);
CREATE INDEX idx_disputes_procedure ON disputes(procedure_id);
CREATE INDEX idx_user_badges_user ON user_badges(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- PROCEDURES
ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active procedures"
  ON procedures FOR SELECT
  USING (status = 'active');

CREATE POLICY "Anyone can insert procedures"
  ON procedures FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users update own procedures"
  ON procedures FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own procedures"
  ON procedures FOR DELETE
  USING (auth.uid() = user_id);

-- Admin can read all (for admin page)
CREATE POLICY "Admin read all procedures"
  ON procedures FOR SELECT
  USING (
    auth.jwt() ->> 'user_role' = 'admin'
  );

-- PROVIDERS
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read providers"
  ON providers FOR SELECT
  USING (true);

CREATE POLICY "Authenticated insert providers"
  ON providers FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owner update providers"
  ON providers FOR UPDATE
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Owner delete providers"
  ON providers FOR DELETE
  USING (auth.uid() = owner_user_id);

-- PROVIDER PRICING
ALTER TABLE provider_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read provider pricing"
  ON provider_pricing FOR SELECT
  USING (true);

CREATE POLICY "Provider owner write pricing"
  ON provider_pricing FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = provider_pricing.provider_id
      AND providers.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Provider owner update pricing"
  ON provider_pricing FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = provider_pricing.provider_id
      AND providers.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Provider owner delete pricing"
  ON provider_pricing FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = provider_pricing.provider_id
      AND providers.owner_user_id = auth.uid()
    )
  );

-- SPECIALS
ALTER TABLE specials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active specials"
  ON specials FOR SELECT
  USING (is_active = true);

CREATE POLICY "Provider owner write specials"
  ON specials FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = specials.provider_id
      AND providers.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Provider owner update specials"
  ON specials FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = specials.provider_id
      AND providers.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Provider owner delete specials"
  ON specials FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = specials.provider_id
      AND providers.owner_user_id = auth.uid()
    )
  );

-- DISPUTES
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Provider owner insert disputes"
  ON disputes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = disputes.provider_id
      AND providers.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Admin read disputes"
  ON disputes FOR SELECT
  USING (
    auth.jwt() ->> 'user_role' = 'admin'
    OR EXISTS (
      SELECT 1 FROM providers
      WHERE providers.id = disputes.provider_id
      AND providers.owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Admin update disputes"
  ON disputes FOR UPDATE
  USING (auth.jwt() ->> 'user_role' = 'admin');

-- GIVEAWAY ENTRIES
ALTER TABLE giveaway_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone insert giveaway entries"
  ON giveaway_entries FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admin read giveaway entries"
  ON giveaway_entries FOR SELECT
  USING (auth.jwt() ->> 'user_role' = 'admin');

-- USER BADGES
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read badges"
  ON user_badges FOR SELECT
  USING (true);

CREATE POLICY "System insert badges"
  ON user_badges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

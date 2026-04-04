-- 021: Review Safety — text similarity + AI sentiment analysis support
-- Adds flagging columns to reviews table for fraud detection

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS flagged_reason text;

-- AI-generated risk score (0-100, higher = more suspicious)
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS ai_risk_score integer;

-- AI-generated flag categories (e.g. 'fake_positive', 'bot_generated', 'competitor_attack')
ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS ai_flags text[];

-- Index for admin review queue of flagged reviews
CREATE INDEX IF NOT EXISTS idx_reviews_flagged
  ON reviews (status, created_at DESC) WHERE status = 'flagged';

-- Index for AI risk score queries
CREATE INDEX IF NOT EXISTS idx_reviews_ai_risk
  ON reviews (ai_risk_score DESC) WHERE ai_risk_score IS NOT NULL;

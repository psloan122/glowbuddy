-- Seed a few providers as "soft claimed" for demo competitor cards.
-- These are real businesses near Louisiana Glow in Mandeville, LA.

-- First, ensure these providers exist with coordinates and claimed status.
-- Use INSERT ... ON CONFLICT to be idempotent.

INSERT INTO providers (name, slug, city, state, zip_code, lat, lng, is_claimed, is_active, provider_type, google_rating, google_review_count)
VALUES
  ('Modern Aesthetic Plastic Surgery', 'modern-aesthetic-plastic-surgery-metairie-la', 'Metairie', 'LA', '70002', 29.9899, -90.1654, true, true, 'Med Spa', 4.8, 156),
  ('Etre Cosmetic Dermatology', 'etre-cosmetic-dermatology-new-orleans-la', 'New Orleans', 'LA', '70130', 29.9309, -90.0929, true, true, 'Dermatology', 4.9, 210),
  ('Lupo Center for Aesthetic Dermatology', 'lupo-center-new-orleans-la', 'New Orleans', 'LA', '70115', 29.9535, -90.0862, true, true, 'Dermatology', 4.7, 89)
ON CONFLICT (slug) DO UPDATE SET
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng,
  is_claimed = true,
  is_active = true,
  provider_type = EXCLUDED.provider_type,
  google_rating = EXCLUDED.google_rating,
  google_review_count = EXCLUDED.google_review_count;

-- Add sample procedures for these competitors so they appear in search
INSERT INTO procedures (provider_name, provider_slug, procedure_type, price_paid, city, state, status, is_seed)
VALUES
  ('Modern Aesthetic Plastic Surgery', 'modern-aesthetic-plastic-surgery-metairie-la', 'Botox / Dysport / Xeomin', 13, 'Metairie', 'LA', 'active', true),
  ('Modern Aesthetic Plastic Surgery', 'modern-aesthetic-plastic-surgery-metairie-la', 'Lip Filler', 650, 'Metairie', 'LA', 'active', true),
  ('Etre Cosmetic Dermatology', 'etre-cosmetic-dermatology-new-orleans-la', 'Botox / Dysport / Xeomin', 14, 'New Orleans', 'LA', 'active', true),
  ('Etre Cosmetic Dermatology', 'etre-cosmetic-dermatology-new-orleans-la', 'RF Microneedling', 450, 'New Orleans', 'LA', 'active', true),
  ('Etre Cosmetic Dermatology', 'etre-cosmetic-dermatology-new-orleans-la', 'Chemical Peel', 175, 'New Orleans', 'LA', 'active', true),
  ('Lupo Center for Aesthetic Dermatology', 'lupo-center-new-orleans-la', 'Botox / Dysport / Xeomin', 15, 'New Orleans', 'LA', 'active', true),
  ('Lupo Center for Aesthetic Dermatology', 'lupo-center-new-orleans-la', 'Lip Filler', 700, 'New Orleans', 'LA', 'active', true),
  ('Lupo Center for Aesthetic Dermatology', 'lupo-center-new-orleans-la', 'HydraFacial', 195, 'New Orleans', 'LA', 'active', true);

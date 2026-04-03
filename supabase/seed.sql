-- GlowBuddy Seed Data
-- All prices sourced from AEDIT, RealSelf, ASPS,
-- and published clinic data 2024-2025
-- Provider names are fictional but realistic
-- is_seed = true so you can filter these out later

ALTER TABLE procedures ADD COLUMN IF NOT EXISTS is_seed boolean DEFAULT false;

INSERT INTO procedures (
  procedure_type, treatment_area, units_or_volume,
  price_paid, provider_name, provider_type,
  city, state, zip_code, date_of_treatment,
  status, is_seed, created_at
) VALUES

-- NEW ORLEANS, LA (heaviest seeding - your backyard)
('Botox / Dysport / Xeomin', 'Forehead', '20 units', 260,
 'Crescent City Aesthetics', 'RN Injector',
 'New Orleans', 'LA', '70115', '2026-03-14',
 'active', true, NOW() - INTERVAL '18 days'),

('Botox / Dysport / Xeomin', 'Glabella (11s)', '25 units', 325,
 'The Glow Lounge', 'PA / NP Injector',
 'New Orleans', 'LA', '70130', '2026-03-08',
 'active', true, NOW() - INTERVAL '24 days'),

('Lip Filler', 'Lips', '1 syringe', 650,
 'Audubon Aesthetics', 'PA / NP Injector',
 'New Orleans', 'LA', '70118', '2026-03-20',
 'active', true, NOW() - INTERVAL '12 days'),

('Botox / Dysport / Xeomin', 'Crow''s Feet', '24 units', 312,
 'Crescent City Aesthetics', 'RN Injector',
 'New Orleans', 'LA', '70115', '2026-02-28',
 'active', true, NOW() - INTERVAL '32 days'),

('HydraFacial', 'Full Face', '1 session', 195,
 'NOLA Skin Studio', 'Med Spa (Non-Physician)',
 'New Orleans', 'LA', '70116', '2026-03-25',
 'active', true, NOW() - INTERVAL '7 days'),

('Cheek Filler', 'Cheeks', '2 syringes', 1300,
 'The Glow Lounge', 'PA / NP Injector',
 'New Orleans', 'LA', '70130', '2026-03-01',
 'active', true, NOW() - INTERVAL '30 days'),

('RF Microneedling', 'Full Face', '1 session', 850,
 'Audubon Aesthetics', 'PA / NP Injector',
 'New Orleans', 'LA', '70118', '2026-02-15',
 'active', true, NOW() - INTERVAL '44 days'),

('Botox / Dysport / Xeomin', 'Forehead', '30 units', 390,
 'Uptown Injections', 'Board-Certified Dermatologist',
 'New Orleans', 'LA', '70115', '2026-03-18',
 'active', true, NOW() - INTERVAL '14 days'),

-- METAIRIE / MANDEVILLE, LA
('Botox / Dysport / Xeomin', 'Forehead', '20 units', 240,
 'Lakeside Aesthetics', 'RN Injector',
 'Metairie', 'LA', '70001', '2026-03-22',
 'active', true, NOW() - INTERVAL '10 days'),

('Lip Filler', 'Lips', '1 syringe', 600,
 'Lakeside Aesthetics', 'RN Injector',
 'Metairie', 'LA', '70001', '2026-03-10',
 'active', true, NOW() - INTERVAL '22 days'),

('Botox / Dysport / Xeomin', 'Glabella (11s)', '20 units', 260,
 'Northshore Glow', 'Med Spa (Physician-Owned)',
 'Mandeville', 'LA', '70448', '2026-03-05',
 'active', true, NOW() - INTERVAL '27 days'),

('HydraFacial', 'Full Face', '1 session', 175,
 'Northshore Glow', 'Med Spa (Physician-Owned)',
 'Mandeville', 'LA', '70448', '2026-03-28',
 'active', true, NOW() - INTERVAL '4 days'),

-- HOUSTON, TX
('Botox / Dysport / Xeomin', 'Forehead', '25 units', 300,
 'Galleria Aesthetics', 'PA / NP Injector',
 'Houston', 'TX', '77056', '2026-03-15',
 'active', true, NOW() - INTERVAL '17 days'),

('Botox / Dysport / Xeomin', 'Crow''s Feet', '20 units', 240,
 'River Oaks Med Spa', 'Med Spa (Physician-Owned)',
 'Houston', 'TX', '77019', '2026-03-20',
 'active', true, NOW() - INTERVAL '12 days'),

('Lip Filler', 'Lips', '1 syringe', 700,
 'Galleria Aesthetics', 'PA / NP Injector',
 'Houston', 'TX', '77056', '2026-02-20',
 'active', true, NOW() - INTERVAL '38 days'),

('Cheek Filler', 'Cheeks', '1 syringe', 750,
 'River Oaks Med Spa', 'Med Spa (Physician-Owned)',
 'Houston', 'TX', '77019', '2026-03-12',
 'active', true, NOW() - INTERVAL '20 days'),

('RF Microneedling', 'Full Face', '1 session', 900,
 'Houston Skin Center', 'Board-Certified Dermatologist',
 'Houston', 'TX', '77005', '2026-02-25',
 'active', true, NOW() - INTERVAL '33 days'),

('Botox / Dysport / Xeomin', 'Forehead', '20 units', 240,
 'Woodlands Wellness Spa', 'RN Injector',
 'The Woodlands', 'TX', '77380', '2026-03-18',
 'active', true, NOW() - INTERVAL '14 days'),

('HydraFacial', 'Full Face', '1 session', 185,
 'Woodlands Wellness Spa', 'RN Injector',
 'The Woodlands', 'TX', '77380', '2026-03-25',
 'active', true, NOW() - INTERVAL '7 days'),

-- DALLAS, TX
('Botox / Dysport / Xeomin', 'Forehead', '25 units', 325,
 'Highland Park Aesthetics', 'PA / NP Injector',
 'Dallas', 'TX', '75205', '2026-03-10',
 'active', true, NOW() - INTERVAL '22 days'),

('Lip Filler', 'Lips', '1 syringe', 725,
 'Uptown Dallas Med Spa', 'Med Spa (Physician-Owned)',
 'Dallas', 'TX', '75219', '2026-03-05',
 'active', true, NOW() - INTERVAL '27 days'),

('Botox / Dysport / Xeomin', 'Glabella (11s)', '20 units', 260,
 'Highland Park Aesthetics', 'PA / NP Injector',
 'Dallas', 'TX', '75205', '2026-02-18',
 'active', true, NOW() - INTERVAL '40 days'),

('Under Eye Filler', 'Under Eyes', '1 syringe', 800,
 'Uptown Dallas Med Spa', 'Med Spa (Physician-Owned)',
 'Dallas', 'TX', '75219', '2026-03-22',
 'active', true, NOW() - INTERVAL '10 days'),

-- MIAMI, FL
('Botox / Dysport / Xeomin', 'Forehead', '25 units', 425,
 'Brickell Beauty Bar', 'Board-Certified Dermatologist',
 'Miami', 'FL', '33131', '2026-03-18',
 'active', true, NOW() - INTERVAL '14 days'),

('Lip Filler', 'Lips', '1 syringe', 850,
 'South Beach Aesthetics', 'Plastic Surgeon',
 'Miami Beach', 'FL', '33139', '2026-03-12',
 'active', true, NOW() - INTERVAL '20 days'),

('Cheek Filler', 'Cheeks', '2 syringes', 1600,
 'Brickell Beauty Bar', 'Board-Certified Dermatologist',
 'Miami', 'FL', '33131', '2026-02-28',
 'active', true, NOW() - INTERVAL '30 days'),

('RF Microneedling', 'Full Face', '1 session', 1200,
 'South Beach Aesthetics', 'Plastic Surgeon',
 'Miami Beach', 'FL', '33139', '2026-03-08',
 'active', true, NOW() - INTERVAL '24 days'),

('Botox / Dysport / Xeomin', 'Crow''s Feet', '24 units', 408,
 'Coral Gables Med Spa', 'PA / NP Injector',
 'Coral Gables', 'FL', '33134', '2026-03-25',
 'active', true, NOW() - INTERVAL '7 days'),

('HydraFacial', 'Full Face', '1 session', 250,
 'Coral Gables Med Spa', 'PA / NP Injector',
 'Coral Gables', 'FL', '33134', '2026-03-20',
 'active', true, NOW() - INTERVAL '12 days'),

-- NASHVILLE, TN
('Botox / Dysport / Xeomin', 'Forehead', '20 units', 280,
 'Belle Meade Aesthetics', 'PA / NP Injector',
 'Nashville', 'TN', '37205', '2026-03-15',
 'active', true, NOW() - INTERVAL '17 days'),

('Lip Filler', 'Lips', '1 syringe', 675,
 'Music City Med Spa', 'Med Spa (Physician-Owned)',
 'Nashville', 'TN', '37212', '2026-03-08',
 'active', true, NOW() - INTERVAL '24 days'),

('Botox / Dysport / Xeomin', 'Glabella (11s)', '22 units', 308,
 'Belle Meade Aesthetics', 'PA / NP Injector',
 'Nashville', 'TN', '37205', '2026-02-22',
 'active', true, NOW() - INTERVAL '36 days'),

('RF Microneedling', 'Full Face', '1 session', 875,
 'Music City Med Spa', 'Med Spa (Physician-Owned)',
 'Nashville', 'TN', '37212', '2026-03-01',
 'active', true, NOW() - INTERVAL '30 days'),

('Chemical Peel', 'Full Face', '1 session', 275,
 'Belle Meade Aesthetics', 'PA / NP Injector',
 'Nashville', 'TN', '37205', '2026-03-28',
 'active', true, NOW() - INTERVAL '4 days'),

-- ATLANTA, GA
('Botox / Dysport / Xeomin', 'Forehead', '25 units', 375,
 'Buckhead Aesthetics', 'Board-Certified Dermatologist',
 'Atlanta', 'GA', '30305', '2026-03-20',
 'active', true, NOW() - INTERVAL '12 days'),

('Lip Filler', 'Lips', '1 syringe', 800,
 'Midtown Skin Studio', 'PA / NP Injector',
 'Atlanta', 'GA', '30308', '2026-03-14',
 'active', true, NOW() - INTERVAL '18 days'),

('Cheek Filler', 'Cheeks', '1 syringe', 900,
 'Buckhead Aesthetics', 'Board-Certified Dermatologist',
 'Atlanta', 'GA', '30305', '2026-02-25',
 'active', true, NOW() - INTERVAL '35 days'),

('Botox / Dysport / Xeomin', 'Crow''s Feet', '20 units', 300,
 'Midtown Skin Studio', 'PA / NP Injector',
 'Atlanta', 'GA', '30308', '2026-03-22',
 'active', true, NOW() - INTERVAL '10 days'),

('HydraFacial', 'Full Face', '1 session', 225,
 'Peachtree Med Spa', 'Med Spa (Non-Physician)',
 'Atlanta', 'GA', '30309', '2026-03-28',
 'active', true, NOW() - INTERVAL '4 days'),

-- CHARLOTTE, NC
('Botox / Dysport / Xeomin', 'Forehead', '20 units', 280,
 'SouthPark Aesthetics', 'PA / NP Injector',
 'Charlotte', 'NC', '28209', '2026-03-12',
 'active', true, NOW() - INTERVAL '20 days'),

('Lip Filler', 'Lips', '1 syringe', 650,
 'SouthPark Aesthetics', 'PA / NP Injector',
 'Charlotte', 'NC', '28209', '2026-03-05',
 'active', true, NOW() - INTERVAL '27 days'),

('RF Microneedling', 'Full Face', '1 session', 800,
 'Queen City Med Spa', 'Med Spa (Physician-Owned)',
 'Charlotte', 'NC', '28202', '2026-02-20',
 'active', true, NOW() - INTERVAL '38 days'),

-- SCOTTSDALE, AZ
('Botox / Dysport / Xeomin', 'Forehead', '25 units', 325,
 'Old Town Aesthetics', 'PA / NP Injector',
 'Scottsdale', 'AZ', '85251', '2026-03-18',
 'active', true, NOW() - INTERVAL '14 days'),

('Lip Filler', 'Lips', '1 syringe', 700,
 'Desert Bloom Med Spa', 'Med Spa (Physician-Owned)',
 'Scottsdale', 'AZ', '85260', '2026-03-10',
 'active', true, NOW() - INTERVAL '22 days'),

('Cheek Filler', 'Cheeks', '2 syringes', 1400,
 'Old Town Aesthetics', 'PA / NP Injector',
 'Scottsdale', 'AZ', '85251', '2026-02-15',
 'active', true, NOW() - INTERVAL '43 days'),

('HydraFacial', 'Full Face', '1 session', 200,
 'Desert Bloom Med Spa', 'Med Spa (Physician-Owned)',
 'Scottsdale', 'AZ', '85260', '2026-03-25',
 'active', true, NOW() - INTERVAL '7 days'),

-- NEW YORK CITY, NY
('Botox / Dysport / Xeomin', 'Forehead', '20 units', 380,
 'Upper East Side Dermatology', 'Board-Certified Dermatologist',
 'New York', 'NY', '10021', '2026-03-20',
 'active', true, NOW() - INTERVAL '12 days'),

('Lip Filler', 'Lips', '1 syringe', 950,
 'Tribeca Skin Studio', 'PA / NP Injector',
 'New York', 'NY', '10013', '2026-03-15',
 'active', true, NOW() - INTERVAL '17 days'),

('Botox / Dysport / Xeomin', 'Crow''s Feet', '24 units', 432,
 'Upper East Side Dermatology', 'Board-Certified Dermatologist',
 'New York', 'NY', '10021', '2026-02-28',
 'active', true, NOW() - INTERVAL '30 days'),

('Cheek Filler', 'Cheeks', '2 syringes', 1900,
 'Tribeca Skin Studio', 'PA / NP Injector',
 'New York', 'NY', '10013', '2026-03-08',
 'active', true, NOW() - INTERVAL '24 days'),

('RF Microneedling', 'Full Face', '1 session', 1500,
 'Manhattan Aesthetics Group', 'Plastic Surgeon',
 'New York', 'NY', '10001', '2026-03-22',
 'active', true, NOW() - INTERVAL '10 days'),

-- LOS ANGELES, CA
('Botox / Dysport / Xeomin', 'Forehead', '25 units', 450,
 'Beverly Hills Aesthetics', 'Board-Certified Dermatologist',
 'Los Angeles', 'CA', '90210', '2026-03-18',
 'active', true, NOW() - INTERVAL '14 days'),

('Lip Filler', 'Lips', '1 syringe', 900,
 'West Hollywood Med Spa', 'PA / NP Injector',
 'Los Angeles', 'CA', '90046', '2026-03-12',
 'active', true, NOW() - INTERVAL '20 days'),

('Botox / Dysport / Xeomin', 'Glabella (11s)', '25 units', 500,
 'Beverly Hills Aesthetics', 'Board-Certified Dermatologist',
 'Los Angeles', 'CA', '90210', '2026-02-20',
 'active', true, NOW() - INTERVAL '38 days'),

('RF Microneedling', 'Full Face', '1 session', 1400,
 'West Hollywood Med Spa', 'PA / NP Injector',
 'Los Angeles', 'CA', '90046', '2026-03-25',
 'active', true, NOW() - INTERVAL '7 days'),

('Under Eye Filler', 'Under Eyes', '1 syringe', 1100,
 'Beverly Hills Aesthetics', 'Board-Certified Dermatologist',
 'Los Angeles', 'CA', '90210', '2026-03-05',
 'active', true, NOW() - INTERVAL '27 days'),

-- CHICAGO, IL
('Botox / Dysport / Xeomin', 'Forehead', '25 units', 375,
 'Gold Coast Aesthetics', 'PA / NP Injector',
 'Chicago', 'IL', '60610', '2026-03-15',
 'active', true, NOW() - INTERVAL '17 days'),

('Lip Filler', 'Lips', '1 syringe', 800,
 'Lincoln Park Skin Studio', 'Med Spa (Physician-Owned)',
 'Chicago', 'IL', '60614', '2026-03-08',
 'active', true, NOW() - INTERVAL '24 days'),

('Chemical Peel', 'Full Face', '1 session', 300,
 'Gold Coast Aesthetics', 'PA / NP Injector',
 'Chicago', 'IL', '60610', '2026-03-28',
 'active', true, NOW() - INTERVAL '4 days'),

('HydraFacial', 'Full Face', '1 session', 220,
 'Lincoln Park Skin Studio', 'Med Spa (Physician-Owned)',
 'Chicago', 'IL', '60614', '2026-03-20',
 'active', true, NOW() - INTERVAL '12 days'),

-- DENVER, CO
('Botox / Dysport / Xeomin', 'Forehead', '20 units', 300,
 'Cherry Creek Aesthetics', 'PA / NP Injector',
 'Denver', 'CO', '80206', '2026-03-12',
 'active', true, NOW() - INTERVAL '20 days'),

('Lip Filler', 'Lips', '1 syringe', 675,
 'LoDo Med Spa', 'Med Spa (Physician-Owned)',
 'Denver', 'CO', '80202', '2026-03-05',
 'active', true, NOW() - INTERVAL '27 days'),

('RF Microneedling', 'Full Face', '1 session', 875,
 'Cherry Creek Aesthetics', 'PA / NP Injector',
 'Denver', 'CO', '80206', '2026-02-22',
 'active', true, NOW() - INTERVAL '36 days');

-- Verify the insert
SELECT
  COUNT(*) as total_seeded,
  COUNT(DISTINCT city) as cities,
  COUNT(DISTINCT procedure_type) as procedure_types,
  AVG(price_paid) as avg_price,
  MIN(price_paid) as min_price,
  MAX(price_paid) as max_price
FROM procedures
WHERE is_seed = true;

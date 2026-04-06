-- Migration 045: procedure_catalog reference table
-- Normalizes PROCEDURE_TYPES / PROCEDURE_CATEGORIES / AVG_PRICES from constants.js
-- into a queryable table. Does NOT replace the existing `procedures` table.

create table if not exists procedure_catalog (
  id bigint generated always as identity primary key,
  name text not null unique,
  slug text not null unique,
  category text not null,
  category_tag text not null,
  avg_national_price numeric,
  default_unit text,
  is_active boolean not null default true,
  display_order int not null default 0
);

-- Public read access, no client writes
alter table procedure_catalog enable row level security;

create policy "procedure_catalog_public_read"
  on procedure_catalog for select
  using (true);

-- Seed from constants.js data
insert into procedure_catalog (name, slug, category, category_tag, avg_national_price, default_unit, display_order) values
  -- Neurotoxins
  ('Botox / Dysport / Xeomin', 'botox-dysport-xeomin', 'Neurotoxins', 'neurotoxin', 302, '/area', 1),
  ('Jeuveau', 'jeuveau', 'Neurotoxins', 'neurotoxin', 280, '/area', 2),
  ('Daxxify', 'daxxify', 'Neurotoxins', 'neurotoxin', 450, '/area', 3),
  ('Botox Lip Flip', 'botox-lip-flip', 'Neurotoxins', 'neurotoxin', 100, '', 4),
  -- Fillers
  ('Lip Filler', 'lip-filler', 'Fillers', 'filler', 672, '/syringe', 5),
  ('Cheek Filler', 'cheek-filler', 'Fillers', 'filler', 750, '/syringe', 6),
  ('Jawline Filler', 'jawline-filler', 'Fillers', 'filler', 800, '/syringe', 7),
  ('Nasolabial Filler', 'nasolabial-filler', 'Fillers', 'filler', 685, '/syringe', 8),
  ('Under Eye Filler', 'under-eye-filler', 'Fillers', 'filler', 750, '/syringe', 9),
  ('Chin Filler', 'chin-filler', 'Fillers', 'filler', 725, '/syringe', 10),
  ('Nose Filler', 'nose-filler', 'Fillers', 'filler', 700, '/syringe', 11),
  ('Hand Filler', 'hand-filler', 'Fillers', 'filler', 800, '/syringe', 12),
  ('Temple Filler', 'temple-filler', 'Fillers', 'filler', 750, '/syringe', 13),
  -- Body
  ('Kybella', 'kybella', 'Body', 'body', 1200, '/session', 14),
  ('CoolSculpting', 'coolsculpting', 'Body', 'body', 750, '/area', 15),
  ('Emsculpt NEO', 'emsculpt-neo', 'Body', 'body', 1000, '/session', 16),
  ('truSculpt', 'trusculpt', 'Body', 'body', 600, '/session', 17),
  ('SculpSure', 'sculpsure', 'Body', 'body', 700, '/session', 18),
  ('BodyTite', 'bodytite', 'Body', 'body', 3500, '/session', 19),
  ('Velashape', 'velashape', 'Body', 'body', 350, '/session', 20),
  ('Cellulite Treatment', 'cellulite-treatment', 'Body', 'body', 400, '/session', 21),
  -- Microneedling
  ('Microneedling', 'microneedling', 'Microneedling', 'microneedling', 250, '/session', 22),
  ('RF Microneedling', 'rf-microneedling', 'Microneedling', 'microneedling', 400, '/session', 23),
  ('Morpheus8', 'morpheus8', 'Microneedling', 'microneedling', 800, '/session', 24),
  ('PRP Microneedling', 'prp-microneedling', 'Microneedling', 'microneedling', 500, '/session', 25),
  ('Exosome Microneedling', 'exosome-microneedling', 'Microneedling', 'microneedling', 600, '/session', 26),
  -- Skin
  ('Chemical Peel', 'chemical-peel', 'Skin', 'skin', 200, '/session', 27),
  ('HydraFacial', 'hydrafacial', 'Skin', 'skin', 200, '/session', 28),
  ('Dermaplaning', 'dermaplaning', 'Skin', 'skin', 125, '/session', 29),
  ('LED Therapy', 'led-therapy', 'Skin', 'skin', 75, '/session', 30),
  ('Oxygen Facial', 'oxygen-facial', 'Skin', 'skin', 150, '/session', 31),
  ('Microdermabrasion', 'microdermabrasion', 'Skin', 'skin', 150, '/session', 32),
  ('Vampire Facial', 'vampire-facial', 'Skin', 'skin', 700, '/session', 33),
  -- Laser
  ('Laser Hair Removal', 'laser-hair-removal', 'Laser', 'laser', 285, '/session', 34),
  ('IPL / Photofacial', 'ipl-photofacial', 'Laser', 'laser', 350, '/session', 35),
  ('Fractional CO2 Laser', 'fractional-co2-laser', 'Laser', 'laser', 1500, '/session', 36),
  ('Clear + Brilliant', 'clear-brilliant', 'Laser', 'laser', 400, '/session', 37),
  ('Halo Laser', 'halo-laser', 'Laser', 'laser', 1200, '/session', 38),
  ('Picosure / Picoway', 'picosure-picoway', 'Laser', 'laser', 500, '/session', 39),
  ('Erbium Laser', 'erbium-laser', 'Laser', 'laser', 1000, '/session', 40),
  -- RF / Tightening
  ('Thermage', 'thermage', 'RF / Tightening', 'rf-tightening', 2500, '/session', 41),
  ('Ultherapy', 'ultherapy', 'RF / Tightening', 'rf-tightening', 3000, '/session', 42),
  ('Sofwave', 'sofwave', 'RF / Tightening', 'rf-tightening', 2500, '/session', 43),
  ('Tempsure', 'tempsure', 'RF / Tightening', 'rf-tightening', 600, '/session', 44),
  ('Exilis', 'exilis', 'RF / Tightening', 'rf-tightening', 500, '/session', 45),
  -- Weight Loss / GLP-1
  ('Semaglutide (Ozempic / Wegovy)', 'semaglutide-ozempic-wegovy', 'Weight Loss / GLP-1', 'weight-loss', 500, '/month', 46),
  ('Tirzepatide (Mounjaro / Zepbound)', 'tirzepatide-mounjaro-zepbound', 'Weight Loss / GLP-1', 'weight-loss', 550, '/month', 47),
  ('Liraglutide (Saxenda)', 'liraglutide-saxenda', 'Weight Loss / GLP-1', 'weight-loss', 450, '/month', 48),
  ('Compounded Semaglutide', 'compounded-semaglutide', 'Weight Loss / GLP-1', 'weight-loss', 300, '/month', 49),
  ('Compounded Tirzepatide', 'compounded-tirzepatide', 'Weight Loss / GLP-1', 'weight-loss', 350, '/month', 50),
  ('GLP-1 (unspecified)', 'glp-1-unspecified', 'Weight Loss / GLP-1', 'weight-loss', 400, '/month', 51),
  ('Semaglutide / Weight Loss', 'semaglutide-weight-loss', 'Weight Loss / GLP-1', 'weight-loss', 400, '/month', 52),
  ('B12 Injection', 'b12-injection', 'Weight Loss / GLP-1', 'weight-loss', 30, '/injection', 53),
  ('Lipotropic / MIC Injection', 'lipotropic-mic-injection', 'Weight Loss / GLP-1', 'weight-loss', 35, '/injection', 54),
  -- IV / Wellness
  ('IV Therapy', 'iv-therapy', 'IV / Wellness', 'iv-wellness', 175, '/session', 55),
  ('IV Vitamin Therapy', 'iv-vitamin-therapy', 'IV / Wellness', 'iv-wellness', 200, '/session', 56),
  ('IV Drip Therapy', 'iv-drip-therapy', 'IV / Wellness', 'iv-wellness', 200, '/session', 57),
  ('NAD+ Therapy', 'nad-therapy', 'IV / Wellness', 'iv-wellness', 500, '/session', 58),
  ('Peptide Therapy', 'peptide-therapy', 'IV / Wellness', 'iv-wellness', 300, '/month', 59),
  -- Hormone
  ('HRT (Hormone Replacement)', 'hrt-hormone-replacement', 'Hormone', 'hormone', 250, '/month', 60),
  ('Testosterone Therapy', 'testosterone-therapy', 'Hormone', 'hormone', 200, '/month', 61),
  -- Hair
  ('PRP Hair Restoration', 'prp-hair-restoration', 'Hair', 'hair', 800, '/session', 62),
  ('Hair Loss Treatment', 'hair-loss-treatment', 'Hair', 'hair', 400, '/session', 63),
  ('Scalp Micropigmentation', 'scalp-micropigmentation', 'Hair', 'hair', 1500, '/session', 64),
  -- Specialty
  ('PRP Injections', 'prp-injections', 'Specialty', 'specialty', 700, '/session', 65),
  ('Exosome Therapy', 'exosome-therapy', 'Specialty', 'specialty', 800, '/session', 66),
  ('Sculptra', 'sculptra', 'Specialty', 'specialty', 900, '/vial', 67),
  ('PDO Thread Lift', 'pdo-thread-lift', 'Specialty', 'specialty', 1500, '/session', 68),
  ('Sclerotherapy', 'sclerotherapy', 'Specialty', 'specialty', 350, '/session', 69),
  ('RF Ablation', 'rf-ablation', 'Specialty', 'specialty', 600, '/session', 70),
  -- Beauty
  ('Brow Lamination', 'brow-lamination', 'Beauty', 'beauty', 65, '', 71),
  ('Lash Lift', 'lash-lift', 'Beauty', 'beauty', 85, '', 72)
on conflict (name) do nothing;

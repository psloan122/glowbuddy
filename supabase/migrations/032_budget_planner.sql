-- 032: Budget Planner — treatment log + sourced cadence intervals

-- Personal treatment diary (separate from price submissions in procedures table)
CREATE TABLE IF NOT EXISTS treatment_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  treatment_name text NOT NULL,
  provider_id uuid REFERENCES providers(id),
  provider_name text,
  injector_id uuid REFERENCES injectors(id),
  date_received date NOT NULL,
  price_paid numeric,
  units_or_syringes numeric,
  satisfaction_rating int CHECK (satisfaction_rating BETWEEN 1 AND 5),
  notes text,
  next_recommended_date date,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_treatment_log_user ON treatment_log (user_id, date_received DESC);

-- FDA-sourced treatment cadence reference data
CREATE TABLE IF NOT EXISTS treatment_cadence (
  treatment_name text PRIMARY KEY,
  min_weeks_between int NOT NULL,
  recommended_weeks_between int NOT NULL,
  max_weeks_between int NOT NULL,
  notes text NOT NULL,
  fda_label_url text,
  clinical_source_url text
);

-- Seed cadence data — all intervals sourced from FDA prescribing information or peer-reviewed clinical literature

INSERT INTO treatment_cadence (treatment_name, min_weeks_between, recommended_weeks_between, max_weeks_between, notes, fda_label_url, clinical_source_url) VALUES

('Botox / Dysport / Xeomin', 12, 14, 20,
 'FDA prescribing information for BOTOX Cosmetic states retreatment should occur no more frequently than every 3 months (12 weeks) for glabellar lines. Most patients see optimal results with retreatment every 3–4 months. Effects typically wear off within 3–4 months per the FDA label.',
 'https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/103000s5316s5319s5323s5326s5331lbl.pdf',
 NULL),

('Lip Filler', 26, 39, 52,
 'FDA-cleared Juvéderm Ultra XC for lip augmentation demonstrates duration up to 12 months in clinical studies. At 6 months, 80.5% of subjects maintained results; at 12 months, 56.4% retained improvement. Touch-ups are commonly performed at 6–9 months.',
 'https://www.accessdata.fda.gov/cdrh_docs/pdf5/P050047S044b.pdf',
 NULL),

('Cheek Filler', 39, 65, 104,
 'FDA-cleared Juvéderm Voluma XC for midface volume loss demonstrates duration up to 2 years. At 78 weeks (~18 months), 81.7% of subjects were still responders in the pivotal clinical study. Touch-ups are typically recommended at 12–18 months.',
 'https://www.accessdata.fda.gov/cdrh_docs/pdf11/p110033c.pdf',
 NULL),

('Sculptra', 52, 78, 104,
 'FDA-cleared Sculptra Aesthetic involves an initial series of up to 4 treatment sessions spaced approximately 3 weeks apart. After the series, results may last up to 25 months per FDA clinical data, with 77% of patients reporting satisfaction at 2 years. Maintenance typically recommended every 12–18 months.',
 'https://www.accessdata.fda.gov/cdrh_docs/pdf3/P030050S039C.pdf',
 NULL),

('Kybella', 4, 6, 8,
 'FDA prescribing information for KYBELLA states treatments should be spaced no less than 1 month apart, with up to 6 treatment sessions permitted. Each session allows up to 50 injections. Results from treated fat cells are permanent, but multiple sessions are typically needed.',
 'https://www.accessdata.fda.gov/drugsatfda_docs/label/2015/206333s000lbl.pdf',
 NULL),

('Microneedling', 4, 6, 26,
 'Board-certified dermatologists and a 2024 comprehensive review in PMC recommend spacing professional microneedling sessions at least 4 weeks apart to allow the skin''s natural 28-day cell turnover cycle to complete. Most recommend 4–6 weeks between sessions in an initial series. Maintenance treatments are typically every 3–6 months.',
 NULL,
 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11499218/'),

('RF Microneedling', 4, 6, 26,
 'Radiofrequency microneedling follows similar spacing guidelines to standard microneedling — at least 4 weeks between sessions to allow healing and collagen remodeling. A series of 3–4 treatments spaced 4–6 weeks apart is typical, with maintenance every 3–6 months.',
 NULL,
 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11499218/'),

('Chemical Peel', 2, 4, 6,
 'The American Academy of Dermatology states that light chemical peels may be repeated every 2 to 5 weeks, with 3–5 treatments typically needed for desired results. Medium-depth peels require 6–12 weeks between treatments. Intervals cited are for light/superficial peels.',
 NULL,
 'https://www.aad.org/public/cosmetic/younger-looking/chemical-peels-faqs'),

('HydraFacial', 2, 4, 6,
 'Dermatologists recommend getting a HydraFacial every 4 weeks (monthly), aligning with the skin''s natural 28-day cell turnover cycle. The minimum safe interval is 2 weeks — more frequent treatments risk disrupting the skin barrier. Effects typically begin to diminish around the 4-week mark.',
 NULL,
 'https://www.hydrafacial.com/clinical-studies/'),

('PRP/PRF', 4, 5, 26,
 'Clinical practice recommends an initial series of 3 PRP/PRF facial treatments spaced 4–6 weeks apart for best results. After completing the initial series, results typically last up to 12 months. Maintenance treatments are recommended every 6–12 months.',
 NULL,
 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6320351/')

ON CONFLICT (treatment_name) DO NOTHING;

-- RLS
ALTER TABLE treatment_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_cadence ENABLE ROW LEVEL SECURITY;

-- Users can CRUD their own treatment log entries
CREATE POLICY "Users manage own treatment log"
  ON treatment_log FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Treatment cadence is public read
CREATE POLICY "Anyone can read treatment cadence"
  ON treatment_cadence FOR SELECT
  USING (true);

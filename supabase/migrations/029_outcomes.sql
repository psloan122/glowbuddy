-- Outcome-based search: outcomes + outcome_treatments junction table

CREATE TABLE IF NOT EXISTS outcomes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  label text UNIQUE NOT NULL,
  description text NOT NULL,
  icon text DEFAULT 'Sparkles',
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outcome_treatments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  outcome_id uuid REFERENCES outcomes(id) ON DELETE CASCADE NOT NULL,
  treatment_name text NOT NULL,
  relevance int DEFAULT 1 CHECK (relevance BETWEEN 1 AND 3),
  why_it_works text NOT NULL,
  typical_sessions text,
  time_to_results text,
  sources text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(outcome_id, treatment_name)
);

CREATE INDEX idx_outcome_treatments_outcome ON outcome_treatments(outcome_id);
CREATE INDEX idx_outcome_treatments_treatment ON outcome_treatments(treatment_name);

-- RLS: public read for both tables
ALTER TABLE outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_treatments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "outcomes_public_read" ON outcomes FOR SELECT USING (true);
CREATE POLICY "outcome_treatments_public_read" ON outcome_treatments FOR SELECT USING (true);

-- Seed 13 outcomes
INSERT INTO outcomes (slug, label, description, icon, sort_order) VALUES
  ('look-less-tired', 'Look less tired', 'Reduce dark circles, under-eye hollows, and a fatigued appearance', 'Moon', 1),
  ('smooth-forehead-lines', 'Smooth forehead lines', 'Soften horizontal forehead wrinkles and dynamic expression lines', 'Waves', 2),
  ('get-rid-of-11-lines', 'Get rid of 11 lines', 'Relax the vertical frown lines between your eyebrows', 'Frown', 3),
  ('plumper-lips', 'Plumper lips', 'Add volume, shape, and definition to thin or asymmetric lips', 'Heart', 4),
  ('lift-sagging-cheeks', 'Lift sagging cheeks', 'Restore mid-face volume loss and improve facial contour', 'ArrowUp', 5),
  ('shrink-pores', 'Shrink pores', 'Minimize enlarged pores and improve skin texture', 'Minimize2', 6),
  ('fix-acne-scars', 'Fix acne scars', 'Reduce the appearance of pitted or rolling acne scars', 'Eraser', 7),
  ('brighten-dull-skin', 'Brighten dull skin', 'Restore radiance, even out skin tone, and improve clarity', 'Sun', 8),
  ('reduce-double-chin', 'Reduce double chin', 'Eliminate submental fullness without surgery', 'ChevronDown', 9),
  ('prevent-aging', 'Prevent aging', 'Start early with treatments that slow visible signs of aging', 'Shield', 10),
  ('remove-sun-damage', 'Remove sun damage', 'Treat sun spots, hyperpigmentation, and photoaged skin', 'Sunset', 11),
  ('smooth-crows-feet', 'Smooth crow''s feet', 'Soften the fine lines around the outer corners of your eyes', 'Eye', 12),
  ('slim-jawline', 'Slim jawline', 'Reduce masseter bulk or refine jawline contour', 'Diamond', 13)
ON CONFLICT (slug) DO NOTHING;

-- Seed outcome_treatments junction data
-- Each links an outcome to relevant treatments with sourced why_it_works

-- 1. Look less tired
INSERT INTO outcome_treatments (outcome_id, treatment_name, relevance, why_it_works, typical_sessions, time_to_results, sources) VALUES
  ((SELECT id FROM outcomes WHERE slug='look-less-tired'), 'Under Eye Filler', 3,
   'Hyaluronic acid filler restores volume to the tear trough, reducing dark shadows caused by hollow under-eyes. Per the AAD, HA fillers provide immediate volume correction in this area.',
   '1 session', 'Immediate, final results at 2 weeks',
   ARRAY['https://www.aad.org/public/cosmetic/injectable-treatments/fillers']),
  ((SELECT id FROM outcomes WHERE slug='look-less-tired'), 'HydraFacial', 1,
   'The HydraFacial cleanse-extract-hydrate protocol brightens the periorbital area by removing dead skin cells and infusing hydrating serums. Results are temporary but immediately visible.',
   '1 session (monthly maintenance)', 'Immediate',
   ARRAY['https://hydrafacial.com/the-treatment/']),
  ((SELECT id FROM outcomes WHERE slug='look-less-tired'), 'RF Microneedling', 2,
   'Radiofrequency energy stimulates collagen production in the thin under-eye skin, improving crepiness and dark circles over time. Published clinical data shows improvement in periorbital skin quality.',
   '3 sessions, 4-6 weeks apart', '3-6 months',
   ARRAY['https://pubmed.ncbi.nlm.nih.gov/30358895/']),
  ((SELECT id FROM outcomes WHERE slug='look-less-tired'), 'Chemical Peel', 1,
   'Light chemical peels improve skin cell turnover around the eyes, reducing superficial discoloration. The ASDS notes peels can address mild hyperpigmentation.',
   '3-6 sessions, 2-4 weeks apart', '2-4 weeks per session',
   ARRAY['https://www.asds.net/skin-experts/skin-treatments/chemical-peels'])
ON CONFLICT (outcome_id, treatment_name) DO NOTHING;

-- 2. Smooth forehead lines
INSERT INTO outcome_treatments (outcome_id, treatment_name, relevance, why_it_works, typical_sessions, time_to_results, sources) VALUES
  ((SELECT id FROM outcomes WHERE slug='smooth-forehead-lines'), 'Botox / Dysport / Xeomin', 3,
   'Botulinum toxin temporarily relaxes the frontalis muscle that causes horizontal forehead lines. Per FDA prescribing information, onset occurs within 24-72 hours with peak effect at 2 weeks.',
   '1 session every 3-4 months', '3-7 days, peak at 2 weeks',
   ARRAY['https://www.accessdata.fda.gov/drugsatfda_docs/label/2023/103000s5330lbl.pdf']),
  ((SELECT id FROM outcomes WHERE slug='smooth-forehead-lines'), 'RF Microneedling', 2,
   'RF microneedling stimulates collagen remodeling in the forehead, improving the appearance of lines at rest. Effective for static lines that remain even when the face is relaxed.',
   '3 sessions, 4-6 weeks apart', '3-6 months',
   ARRAY['https://pubmed.ncbi.nlm.nih.gov/30358895/']),
  ((SELECT id FROM outcomes WHERE slug='smooth-forehead-lines'), 'Microneedling', 1,
   'Standard microneedling creates controlled micro-injuries that trigger collagen production, gradually softening fine forehead lines. Per the AAD, best for mild to moderate lines.',
   '3-6 sessions, 4 weeks apart', '2-3 months',
   ARRAY['https://www.aad.org/public/cosmetic/younger-looking/microneedling'])
ON CONFLICT (outcome_id, treatment_name) DO NOTHING;

-- 3. Get rid of 11 lines
INSERT INTO outcome_treatments (outcome_id, treatment_name, relevance, why_it_works, typical_sessions, time_to_results, sources) VALUES
  ((SELECT id FROM outcomes WHERE slug='get-rid-of-11-lines'), 'Botox / Dysport / Xeomin', 3,
   'The glabellar complex (corrugator and procerus muscles) is the primary FDA-approved indication for botulinum toxin. Per prescribing information, 20 units of Botox is the standard dose for glabellar lines.',
   '1 session every 3-4 months', '3-7 days, peak at 2 weeks',
   ARRAY['https://www.accessdata.fda.gov/drugsatfda_docs/label/2023/103000s5330lbl.pdf', 'https://www.aad.org/public/cosmetic/wrinkles/botox']),
  ((SELECT id FROM outcomes WHERE slug='get-rid-of-11-lines'), 'RF Microneedling', 1,
   'For deep static 11 lines that persist even without muscle movement, RF microneedling can improve skin quality and reduce line depth through collagen stimulation.',
   '3 sessions, 4-6 weeks apart', '3-6 months',
   ARRAY['https://pubmed.ncbi.nlm.nih.gov/30358895/'])
ON CONFLICT (outcome_id, treatment_name) DO NOTHING;

-- 4. Plumper lips
INSERT INTO outcome_treatments (outcome_id, treatment_name, relevance, why_it_works, typical_sessions, time_to_results, sources) VALUES
  ((SELECT id FROM outcomes WHERE slug='plumper-lips'), 'Lip Filler', 3,
   'Hyaluronic acid lip fillers add volume, define the vermilion border, and improve symmetry. Per FDA labeling for Juvederm Ultra, results are immediate with full effect visible at 2 weeks after swelling subsides.',
   '1 session', 'Immediate, final at 2 weeks',
   ARRAY['https://www.accessdata.fda.gov/drugsatfda_docs/label/2022/125172s029lbl.pdf', 'https://www.plasticsurgery.org/cosmetic-procedures/lip-augmentation']),
  ((SELECT id FROM outcomes WHERE slug='plumper-lips'), 'Botox Lip Flip', 2,
   'A small dose (4-6 units) of botulinum toxin relaxes the orbicularis oris muscle, causing the upper lip to subtly roll outward. This creates the appearance of a fuller lip without adding volume.',
   '1 session every 2-3 months', '3-7 days',
   ARRAY['https://www.aad.org/public/cosmetic/wrinkles/botox'])
ON CONFLICT (outcome_id, treatment_name) DO NOTHING;

-- 5. Lift sagging cheeks
INSERT INTO outcome_treatments (outcome_id, treatment_name, relevance, why_it_works, typical_sessions, time_to_results, sources) VALUES
  ((SELECT id FROM outcomes WHERE slug='lift-sagging-cheeks'), 'Cheek Filler', 3,
   'HA or calcium hydroxylapatite fillers restore volume to the malar and submalar regions, providing lift to the mid-face. Per ASPS data, cheek augmentation is one of the most effective non-surgical approaches to facial rejuvenation.',
   '1 session', 'Immediate, final at 2-4 weeks',
   ARRAY['https://www.plasticsurgery.org/cosmetic-procedures/dermal-fillers/cost', 'https://www.aad.org/public/cosmetic/injectable-treatments/fillers']),
  ((SELECT id FROM outcomes WHERE slug='lift-sagging-cheeks'), 'Sculptra', 2,
   'Poly-L-lactic acid stimulates your body''s own collagen production over months, gradually restoring volume. Per FDA prescribing information, results develop over several months and can last up to 2 years.',
   '2-3 sessions, 6 weeks apart', 'Gradual over 3-6 months',
   ARRAY['https://www.accessdata.fda.gov/drugsatfda_docs/label/2014/021788s001lbl.pdf']),
  ((SELECT id FROM outcomes WHERE slug='lift-sagging-cheeks'), 'RF Microneedling', 1,
   'RF energy delivered to the deep dermis and subcutaneous tissue promotes tissue tightening through collagen contraction and neocollagenesis, providing mild lift.',
   '3 sessions, 4-6 weeks apart', '3-6 months',
   ARRAY['https://pubmed.ncbi.nlm.nih.gov/30358895/'])
ON CONFLICT (outcome_id, treatment_name) DO NOTHING;

-- 6. Shrink pores
INSERT INTO outcome_treatments (outcome_id, treatment_name, relevance, why_it_works, typical_sessions, time_to_results, sources) VALUES
  ((SELECT id FROM outcomes WHERE slug='shrink-pores'), 'RF Microneedling', 3,
   'RF energy heats the dermis around pore openings, stimulating collagen contraction that tightens pore walls. Published studies show significant pore size reduction after a series of treatments.',
   '3 sessions, 4-6 weeks apart', '1-3 months',
   ARRAY['https://pubmed.ncbi.nlm.nih.gov/30358895/']),
  ((SELECT id FROM outcomes WHERE slug='shrink-pores'), 'HydraFacial', 2,
   'The vortex extraction step removes debris from pores while infusing serums that help minimize their appearance. Per the manufacturer, results are immediately visible.',
   'Monthly sessions', 'Immediate (temporary)',
   ARRAY['https://hydrafacial.com/the-treatment/']),
  ((SELECT id FROM outcomes WHERE slug='shrink-pores'), 'Chemical Peel', 2,
   'Chemical exfoliation with glycolic or salicylic acid removes the buildup of dead skin cells that make pores appear larger. The ASDS notes that regular light peels improve overall pore appearance.',
   '3-6 sessions, 2-4 weeks apart', '1-2 weeks per session',
   ARRAY['https://www.asds.net/skin-experts/skin-treatments/chemical-peels']),
  ((SELECT id FROM outcomes WHERE slug='shrink-pores'), 'Microneedling', 1,
   'Controlled micro-injuries trigger collagen production around pore structures, gradually reducing their diameter. Per the AAD, microneedling improves overall skin texture.',
   '3-6 sessions, 4 weeks apart', '2-3 months',
   ARRAY['https://www.aad.org/public/cosmetic/younger-looking/microneedling'])
ON CONFLICT (outcome_id, treatment_name) DO NOTHING;

-- 7. Fix acne scars
INSERT INTO outcome_treatments (outcome_id, treatment_name, relevance, why_it_works, typical_sessions, time_to_results, sources) VALUES
  ((SELECT id FROM outcomes WHERE slug='fix-acne-scars'), 'RF Microneedling', 3,
   'RF microneedling delivers energy at precise depths to break up scar tissue and stimulate collagen remodeling. Clinical studies show 25-75% improvement in atrophic acne scars after 3 sessions.',
   '3-4 sessions, 4-6 weeks apart', '3-6 months',
   ARRAY['https://pubmed.ncbi.nlm.nih.gov/30358895/', 'https://www.aad.org/public/cosmetic/younger-looking/laser-resurfacing']),
  ((SELECT id FROM outcomes WHERE slug='fix-acne-scars'), 'Microneedling', 2,
   'Standard microneedling creates thousands of micro-channels that trigger wound healing and collagen production. Per published research, it is effective for rolling and boxcar acne scars.',
   '4-6 sessions, 4 weeks apart', '3-6 months',
   ARRAY['https://pubmed.ncbi.nlm.nih.gov/29057965/', 'https://www.aad.org/public/cosmetic/younger-looking/microneedling']),
  ((SELECT id FROM outcomes WHERE slug='fix-acne-scars'), 'Chemical Peel', 1,
   'Medium-depth TCA peels can improve shallow acne scars by removing damaged surface layers and stimulating dermal remodeling. Per the ASDS, peels work best on superficial scars.',
   '3-6 sessions, 4-6 weeks apart', '2-4 weeks per session',
   ARRAY['https://www.asds.net/skin-experts/skin-treatments/chemical-peels'])
ON CONFLICT (outcome_id, treatment_name) DO NOTHING;

-- 8. Brighten dull skin
INSERT INTO outcome_treatments (outcome_id, treatment_name, relevance, why_it_works, typical_sessions, time_to_results, sources) VALUES
  ((SELECT id FROM outcomes WHERE slug='brighten-dull-skin'), 'HydraFacial', 3,
   'The multi-step cleanse-extract-hydrate process immediately removes dead skin cells and infuses brightening antioxidants. Per the manufacturer, results are visible after a single session.',
   '1 session (monthly for maintenance)', 'Immediate',
   ARRAY['https://hydrafacial.com/the-treatment/']),
  ((SELECT id FROM outcomes WHERE slug='brighten-dull-skin'), 'Chemical Peel', 3,
   'Glycolic and lactic acid peels accelerate cell turnover, removing dull surface cells to reveal brighter skin underneath. Per the ASDS, light peels are ideal for restoring glow with minimal downtime.',
   '3-6 sessions, 2-4 weeks apart', '1-2 weeks',
   ARRAY['https://www.asds.net/skin-experts/skin-treatments/chemical-peels']),
  ((SELECT id FROM outcomes WHERE slug='brighten-dull-skin'), 'IPL / Photofacial', 2,
   'Intense pulsed light targets melanin and hemoglobin in the skin, reducing uneven pigmentation and redness to improve overall clarity. The AAD notes IPL is effective for sun-damaged, uneven skin.',
   '3-5 sessions, 3-4 weeks apart', '1-3 weeks per session',
   ARRAY['https://www.aad.org/public/cosmetic/younger-looking/laser-resurfacing']),
  ((SELECT id FROM outcomes WHERE slug='brighten-dull-skin'), 'Microneedling', 1,
   'By stimulating rapid cell turnover and collagen production, microneedling gradually improves skin radiance and texture.',
   '3-6 sessions, 4 weeks apart', '2-3 months',
   ARRAY['https://www.aad.org/public/cosmetic/younger-looking/microneedling'])
ON CONFLICT (outcome_id, treatment_name) DO NOTHING;

-- 9. Reduce double chin
INSERT INTO outcome_treatments (outcome_id, treatment_name, relevance, why_it_works, typical_sessions, time_to_results, sources) VALUES
  ((SELECT id FROM outcomes WHERE slug='reduce-double-chin'), 'Kybella', 3,
   'Deoxycholic acid permanently destroys submental fat cells. Per FDA prescribing information, up to 6 treatments may be administered, with visible reduction typically observed after 2-4 sessions.',
   '2-6 sessions, 1 month apart', '6-8 weeks per session',
   ARRAY['https://www.accessdata.fda.gov/drugsatfda_docs/label/2015/206333s000lbl.pdf', 'https://www.aad.org/public/cosmetic/fat-reduction/kybella']),
  ((SELECT id FROM outcomes WHERE slug='reduce-double-chin'), 'CoolSculpting', 2,
   'Cryolipolysis freezes and destroys fat cells in the submental area without surgery. Per the manufacturer, treated fat cells are naturally eliminated from the body over 1-3 months.',
   '1-2 sessions', '1-3 months',
   ARRAY['https://www.plasticsurgery.org/cosmetic-procedures/nonsurgical-fat-reduction'])
ON CONFLICT (outcome_id, treatment_name) DO NOTHING;

-- 10. Prevent aging
INSERT INTO outcome_treatments (outcome_id, treatment_name, relevance, why_it_works, typical_sessions, time_to_results, sources) VALUES
  ((SELECT id FROM outcomes WHERE slug='prevent-aging'), 'Botox / Dysport / Xeomin', 3,
   'Starting neurotoxin treatments in your late 20s-30s prevents dynamic wrinkles from becoming static lines. Per the AAD, preventive (or "baby") Botox uses lower doses to maintain smooth skin before lines set in.',
   '1 session every 3-4 months', 'Ongoing prevention',
   ARRAY['https://www.aad.org/public/cosmetic/wrinkles/botox']),
  ((SELECT id FROM outcomes WHERE slug='prevent-aging'), 'Chemical Peel', 2,
   'Regular light peels maintain cell turnover rate, keeping skin fresh and preventing the buildup of sun-damaged surface cells. The ASDS recommends periodic peels as part of a maintenance routine.',
   'Every 4-6 weeks', 'Ongoing',
   ARRAY['https://www.asds.net/skin-experts/skin-treatments/chemical-peels']),
  ((SELECT id FROM outcomes WHERE slug='prevent-aging'), 'HydraFacial', 1,
   'Monthly HydraFacials maintain skin hydration and clarity, supporting the skin barrier. Consistent maintenance helps slow visible signs of aging.',
   'Monthly', 'Ongoing',
   ARRAY['https://hydrafacial.com/the-treatment/']),
  ((SELECT id FROM outcomes WHERE slug='prevent-aging'), 'Microneedling', 2,
   'Regular microneedling stimulates ongoing collagen production, maintaining skin density and elasticity. Per published research, collagen induction therapy is effective for anti-aging maintenance.',
   'Every 4-6 weeks', 'Ongoing',
   ARRAY['https://pubmed.ncbi.nlm.nih.gov/29057965/'])
ON CONFLICT (outcome_id, treatment_name) DO NOTHING;

-- 11. Remove sun damage
INSERT INTO outcome_treatments (outcome_id, treatment_name, relevance, why_it_works, typical_sessions, time_to_results, sources) VALUES
  ((SELECT id FROM outcomes WHERE slug='remove-sun-damage'), 'IPL / Photofacial', 3,
   'IPL targets melanin in sun spots and age spots, breaking up pigment clusters that are then cleared by the body. Per the AAD, IPL is one of the most effective treatments for sun-induced hyperpigmentation.',
   '3-5 sessions, 3-4 weeks apart', '1-3 weeks per session',
   ARRAY['https://www.aad.org/public/cosmetic/younger-looking/laser-resurfacing']),
  ((SELECT id FROM outcomes WHERE slug='remove-sun-damage'), 'Chemical Peel', 2,
   'Medium-depth peels using TCA or glycolic acid remove sun-damaged surface layers, reducing age spots and improving skin texture. Per ASPS data, chemical peels are effective for mild to moderate photodamage.',
   '3-6 sessions, 4-6 weeks apart', '1-2 weeks per session',
   ARRAY['https://www.plasticsurgery.org/cosmetic-procedures/chemical-peel/cost', 'https://www.asds.net/skin-experts/skin-treatments/chemical-peels']),
  ((SELECT id FROM outcomes WHERE slug='remove-sun-damage'), 'HydraFacial', 1,
   'HydraFacial with brightening boosters can improve mild sun damage by exfoliating and infusing targeted serums, though results are temporary compared to laser treatments.',
   'Monthly', 'Immediate (mild improvement)',
   ARRAY['https://hydrafacial.com/the-treatment/'])
ON CONFLICT (outcome_id, treatment_name) DO NOTHING;

-- 12. Smooth crow's feet
INSERT INTO outcome_treatments (outcome_id, treatment_name, relevance, why_it_works, typical_sessions, time_to_results, sources) VALUES
  ((SELECT id FROM outcomes WHERE slug='smooth-crows-feet'), 'Botox / Dysport / Xeomin', 3,
   'Botulinum toxin relaxes the orbicularis oculi muscle responsible for crow''s feet. Per FDA prescribing information, the approved dose for lateral canthal lines is 24 units total (12 per side).',
   '1 session every 3-4 months', '3-7 days, peak at 2 weeks',
   ARRAY['https://www.accessdata.fda.gov/drugsatfda_docs/label/2023/103000s5330lbl.pdf']),
  ((SELECT id FROM outcomes WHERE slug='smooth-crows-feet'), 'RF Microneedling', 1,
   'For static crow''s feet that persist at rest, RF microneedling can improve skin quality around the eye area through collagen stimulation.',
   '3 sessions, 4-6 weeks apart', '3-6 months',
   ARRAY['https://pubmed.ncbi.nlm.nih.gov/30358895/'])
ON CONFLICT (outcome_id, treatment_name) DO NOTHING;

-- 13. Slim jawline
INSERT INTO outcome_treatments (outcome_id, treatment_name, relevance, why_it_works, typical_sessions, time_to_results, sources) VALUES
  ((SELECT id FROM outcomes WHERE slug='slim-jawline'), 'Botox / Dysport / Xeomin', 3,
   'Injecting botulinum toxin into the masseter muscle causes it to gradually atrophy, resulting in a slimmer, more tapered jawline. Per the AAD, masseter reduction typically requires 25-50 units per side.',
   '1 session every 4-6 months', '4-6 weeks for visible slimming',
   ARRAY['https://www.aad.org/public/cosmetic/wrinkles/botox']),
  ((SELECT id FROM outcomes WHERE slug='slim-jawline'), 'Jawline Filler', 2,
   'Strategic HA filler placement along the jawline can create definition and the appearance of a slimmer, more contoured jaw. Per ASPS, jawline contouring is one of the fastest-growing filler applications.',
   '1 session', 'Immediate, final at 2 weeks',
   ARRAY['https://www.plasticsurgery.org/cosmetic-procedures/dermal-fillers/cost']),
  ((SELECT id FROM outcomes WHERE slug='slim-jawline'), 'Kybella', 1,
   'For jawline concerns caused by submental fat, Kybella can eliminate fat below the chin, improving the jaw-to-neck angle and overall jawline definition.',
   '2-4 sessions, 1 month apart', '6-8 weeks per session',
   ARRAY['https://www.accessdata.fda.gov/drugsatfda_docs/label/2015/206333s000lbl.pdf'])
ON CONFLICT (outcome_id, treatment_name) DO NOTHING;

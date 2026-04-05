-- First Timer Guides: educational content for treatment newcomers

CREATE TABLE IF NOT EXISTS treatment_guides (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  treatment_name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  what_to_expect text,
  fair_price_context text,
  starter_dose_note text,
  questions_to_ask text[] DEFAULT '{}',
  red_flags text[] DEFAULT '{}',
  avg_first_session_units text,
  typical_price_range_low integer,
  typical_price_range_high integer,
  price_unit text,
  duration_of_results text,
  consultation_recommended boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_first_timer_flags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  treatment_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, treatment_name)
);

-- RLS: treatment_guides public read
ALTER TABLE treatment_guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "treatment_guides_public_read" ON treatment_guides
  FOR SELECT USING (true);

-- RLS: user_first_timer_flags user-scoped CRUD
ALTER TABLE user_first_timer_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "first_timer_flags_select" ON user_first_timer_flags
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "first_timer_flags_insert" ON user_first_timer_flags
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "first_timer_flags_delete" ON user_first_timer_flags
  FOR DELETE USING (auth.uid() = user_id);

-- Seed 9 treatments (treatment_name matches PROCEDURE_TYPES in constants.js)
INSERT INTO treatment_guides (treatment_name, slug, what_to_expect, fair_price_context, starter_dose_note, questions_to_ask, red_flags, avg_first_session_units, typical_price_range_low, typical_price_range_high, price_unit, duration_of_results, consultation_recommended) VALUES

('Botox / Dysport / Xeomin', 'botox-dysport-xeomin',
 'Your first neurotoxin appointment takes about 15-20 minutes. The injector will mark target muscles, then use a tiny needle for quick injections. Most people feel a slight pinch. Results appear in 3-7 days and peak at 2 weeks.',
 'First-timers often start with fewer units than experienced patients. Expect to pay less than the "full face" prices you see online. Many providers offer new-patient specials.',
 'First-timers typically start with 20-40 units total. Common starter areas: forehead (10-20 units) or crow''s feet (10-15 units per side).',
 ARRAY['How many units do you recommend for my goals?', 'What brand do you use and why?', 'What is your experience level with neurotoxin?', 'Do you offer a touch-up if I need more?', 'What should I avoid before and after treatment?'],
 ARRAY['Prices that seem too good to be true (may be diluted product)', 'No consultation before injecting', 'Provider cannot tell you how many units they''re using', 'Pressure to treat more areas than you asked about', 'No before photos taken'],
 '20-40 units', 200, 500, 'per session', '3-4 months', true),

('Lip Filler', 'lip-filler',
 'Lip filler appointments take 30-45 minutes including numbing. A topical numbing cream is applied first, then filler is injected with a fine needle or cannula. Expect swelling for 2-3 days. Final results show at 2 weeks.',
 'One syringe is standard for first-timers. Going slow lets you build volume gradually and see how your body responds. You can always add more later.',
 'Start with 0.5-1 syringe of hyaluronic acid filler. Half a syringe gives a subtle enhancement; one full syringe provides noticeable but natural-looking volume.',
 ARRAY['What filler brand and type do you recommend for lips?', 'Do you use a needle or cannula?', 'Can I see before-and-after photos of your lip work?', 'What happens if I don''t like the results?', 'How do you handle asymmetry?'],
 ARRAY['Offering more than 1 syringe on your first visit', 'No numbing offered before injection', 'Cannot show previous lip filler results', 'Using permanent or non-HA filler for a first-timer', 'No discussion of your aesthetic goals'],
 '0.5-1 syringe', 500, 800, 'per syringe', '6-12 months', true),

('Cheek Filler', 'cheek-filler',
 'Cheek filler appointments last 30-45 minutes. The injector places filler deep along the cheekbone to restore volume and lift. Some bruising is normal. Swelling subsides in about a week, with final results at 2-4 weeks.',
 'Cheeks often need 1-2 syringes per side for a visible change. First-timers may start with 1 syringe per side and add more at a follow-up.',
 'Plan for 1-2 syringes total for your first session. This provides subtle lift and contouring without an overdone look.',
 ARRAY['How many syringes do you recommend for natural-looking results?', 'What filler brand works best for cheeks?', 'Will this help with my under-eye hollows too?', 'How do you ensure symmetry?', 'What is the downtime?'],
 ARRAY['Recommending 3+ syringes on a first visit', 'Using a filler not designed for deep injection', 'No assessment of facial proportions before injecting', 'Rushing through without discussing your goals'],
 '1-2 syringes', 600, 1500, 'per session', '12-24 months', true),

('Microneedling', 'microneedling',
 'Microneedling takes 30-60 minutes. After numbing cream sits for 20-30 minutes, a pen-like device creates tiny punctures in your skin. It feels like light sandpaper. Your skin will be red for 1-3 days, like a sunburn.',
 'Microneedling is one of the more affordable treatments and works best as a series (3-6 sessions). Many providers offer package pricing.',
 'One session shows mild improvement. A series of 3 sessions spaced 4-6 weeks apart delivers the best results for texture and tone.',
 ARRAY['What device do you use?', 'What depth setting do you recommend for my concerns?', 'Do you apply any serums during treatment?', 'How many sessions will I need?', 'What skincare should I use after?'],
 ARRAY['No numbing cream offered', 'Reusing needles or cartridges', 'No discussion of your skin concerns beforehand', 'Extremely low prices that suggest an unlicensed provider'],
 '1 session (series of 3 recommended)', 150, 350, 'per session', 'Cumulative (series of 3-6)', true),

('Chemical Peel', 'chemical-peel',
 'A chemical peel takes 15-30 minutes. The provider applies an acid solution that causes controlled exfoliation. You may feel tingling or mild burning. Light peels have 1-3 days of flaking; medium peels may cause 5-7 days of peeling.',
 'Light peels are affordable and great for first-timers. Medium and deep peels cost more but deliver more dramatic results. Start light and work up.',
 'First-timers should start with a light peel (glycolic or lactic acid). This treats surface concerns with minimal downtime.',
 ARRAY['What type and strength of peel do you recommend?', 'What is the expected downtime?', 'Should I stop any skincare products before the peel?', 'How many sessions will I need?', 'What SPF should I use after?'],
 ARRAY['Offering a deep peel as your first treatment', 'No skin assessment before choosing peel strength', 'No post-care instructions provided', 'Performing a peel on sunburned or irritated skin'],
 '1 session', 100, 300, 'per session', '1-3 months (light), 3-6 months (medium)', true),

('HydraFacial', 'hydrafacial',
 'A HydraFacial takes about 30 minutes with no downtime. It uses a device that cleanses, exfoliates, extracts, and hydrates your skin in one session. It feels like a cool paintbrush on your skin. You''ll glow immediately after.',
 'HydraFacials are consistent in pricing since they use a patented device. The base treatment is standard; add-ons (LED, boosters) increase the cost.',
 'The signature HydraFacial is perfect for first-timers. You don''t need add-ons to see great results on your first visit.',
 ARRAY['Is this a genuine HydraFacial or a similar hydradermabrasion?', 'What boosters do you recommend for my skin type?', 'How often should I get treatments?', 'Can I wear makeup right after?'],
 ARRAY['Price seems too low (may not be an authentic HydraFacial device)', 'Provider cannot explain the steps of the treatment', 'No skin assessment before choosing boosters'],
 '1 session', 150, 300, 'per session', '1-4 weeks', false),

('Kybella', 'kybella',
 'Kybella treatments take 15-20 minutes. The provider injects deoxycholic acid into the fat under your chin through multiple small injections. Expect significant swelling for 3-7 days — you''ll look like a bullfrog temporarily. Results develop over 4-6 weeks.',
 'Kybella typically requires 2-4 sessions spaced 6-8 weeks apart. Each session uses 1-3 vials. It''s an investment but results are permanent.',
 'First session usually uses 1-2 vials. Your provider will assess how much submental fat you have and create a treatment plan.',
 ARRAY['How many sessions do you think I will need?', 'How many vials per session?', 'Am I a good candidate or would liposuction be better?', 'What does the swelling timeline look like?', 'What pain management do you offer?'],
 ARRAY['Promising results in one session', 'Not discussing alternative options like CoolSculpting or lipo', 'No assessment of your chin profile before treatment', 'Using an off-brand deoxycholic acid product'],
 '1-2 vials', 900, 1800, 'per session', 'Permanent (after full series)', true),

('RF Microneedling', 'rf-microneedling',
 'RF microneedling combines microneedling with radiofrequency energy for deeper skin remodeling. Treatment takes 45-60 minutes after numbing. It feels like warm prickling. Redness lasts 2-5 days. Results build over 3-6 months.',
 'RF microneedling costs more than standard microneedling because of the technology involved. It delivers results in fewer sessions and treats deeper concerns like acne scars and skin laxity.',
 'A series of 3 sessions spaced 4-6 weeks apart is typical. One session shows improvement, but the full series delivers the best results.',
 ARRAY['What RF microneedling device do you use?', 'What depth and energy settings do you recommend?', 'How does this compare to standard microneedling for my concerns?', 'How many sessions will I need?', 'Can this be combined with other treatments?'],
 ARRAY['No numbing offered for what is a more intense treatment', 'Cannot name the device being used', 'Pricing that''s the same as standard microneedling (may not be real RF)', 'No post-treatment care instructions'],
 '1 session (series of 3 recommended)', 300, 600, 'per session', 'Cumulative (series of 3)', true),

('Sculptra', 'sculptra',
 'Sculptra is a biostimulator that triggers your body to produce collagen. Appointments take 30-45 minutes. The provider injects poly-L-lactic acid into areas of volume loss. Results develop gradually over 2-3 months as collagen builds.',
 'Sculptra is priced per vial and typically requires 2-3 sessions. It''s more cost-effective than filler for large-volume restoration because results last 2+ years.',
 'First session usually uses 1-2 vials. Your provider will create a treatment plan based on your volume loss and goals.',
 ARRAY['How many vials and sessions do you recommend?', 'What areas will you treat?', 'How long until I see results?', 'What is the massage protocol after treatment?', 'How does this compare to hyaluronic acid filler for my goals?'],
 ARRAY['Not explaining the 5-5-5 massage rule', 'Promising immediate results (Sculptra works gradually)', 'Using Sculptra in the lips (not FDA-approved for lips)', 'No treatment plan discussed upfront'],
 '1-2 vials', 700, 1200, 'per vial', '2+ years', true)

ON CONFLICT (treatment_name) DO NOTHING;

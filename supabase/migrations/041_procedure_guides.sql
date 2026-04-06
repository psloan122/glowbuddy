-- Comprehensive Procedure Guides: Yelp-style educational content for every procedure type
-- Sources: ASPS 2024 Statistics, RealSelf Worth-It ratings, FDA.gov, manufacturer data

CREATE TABLE IF NOT EXISTS procedure_guides (
  id              text PRIMARY KEY,
  name            text NOT NULL,
  slug            text UNIQUE NOT NULL,
  category        text NOT NULL,
  tagline         text,
  specs           jsonb NOT NULL DEFAULT '{}',
  content         jsonb NOT NULL DEFAULT '{}',
  procedure_types text[] DEFAULT '{}',
  satisfaction_rate numeric(4,1),
  avg_cost_low    numeric(8,2),
  avg_cost_high   numeric(8,2),
  avg_cost_unit   text DEFAULT 'per session',
  fda_approved    boolean DEFAULT false,
  is_published    boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE procedure_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "guides_public_read" ON procedure_guides
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

-- ════════════════════════════════════════
-- INJECTABLES
-- ════════════════════════════════════════

INSERT INTO procedure_guides (id, name, slug, category, tagline, procedure_types, satisfaction_rate, avg_cost_low, avg_cost_high, avg_cost_unit, fda_approved, specs, content) VALUES

-- 1. Botox / Dysport / Xeomin / Jeuveau
('botox', 'Botox / Dysport / Xeomin / Jeuveau', 'botox', 'injectables',
 'Temporary muscle relaxation to smooth dynamic wrinkles',
 ARRAY['Botox / Dysport / Xeomin', 'Jeuveau', 'Daxxify', 'Botox Lip Flip'],
 97.0, 200, 800, 'per session', true,
 '{"consultationRequired":"Recommended","treatmentTime":"15–30 minutes","sessionsNeeded":"1 (repeat every 3–4 months)","resultsAppear":"3–7 days","resultsDuration":"3–4 months","downtime":"None — return to activity same day","fdaApproved":true,"fdaApprovalYear":"2002","painLevel":"Mild (2/10)","averageCost":"$11–20/unit nationally","unitsTypical":"20–40 units for forehead + crow''s feet"}'::jsonb,
 '{
   "what_it_is": "Neuromodulators (commonly called Botox) are injectable treatments that temporarily relax facial muscles to smooth out wrinkles caused by repeated expressions like frowning and squinting. There are four FDA-approved brands: Botox (approved 2002), Dysport (2009), Xeomin (2011), and Jeuveau (2019). All use a purified form of botulinum toxin type A.",
   "how_it_works": "The injection blocks nerve signals to targeted muscles, preventing them from contracting. When the muscle relaxes, the skin above it smooths out. This works on dynamic wrinkles (wrinkles that form when you move your face) but not static wrinkles (lines that are visible even at rest). The effect is temporary because your body gradually creates new nerve pathways, which is why retreatment is needed every 3–4 months.",
   "first_time_what_to_expect": "Your first appointment takes about 15–30 minutes. The provider will ask about your goals, examine your facial muscles, and mark injection sites. The needles are very small — most people feel only a slight pinch. No anesthesia is needed. You may have tiny red bumps at injection sites that fade within an hour. Avoid lying down for 4 hours and skip intense exercise for 24 hours. Results start appearing in 3–7 days and peak at 2 weeks.",
   "good_candidate": "Adults 18+ with moderate to severe frown lines, forehead lines, or crow''s feet. People who want to prevent wrinkles from deepening. Candidates with realistic expectations about subtle, natural-looking results.",
   "not_good_candidate": "Pregnant or breastfeeding women. People with neuromuscular disorders (myasthenia gravis, ALS). Those allergic to botulinum toxin or any product ingredient. People with active skin infections at the injection site.",
   "questions_to_ask": [
     {"question": "How many units do you recommend for my goals?", "why": "Transparent dosing prevents surprise bills and ensures you get enough product for results."},
     {"question": "What brand of neurotoxin do you use and why?", "why": "Different brands have slightly different onset times and spread patterns — your provider should have a reason for their choice."},
     {"question": "How many neurotoxin injections have you performed?", "why": "Experience matters. Look for providers who do this regularly, not occasionally."},
     {"question": "Do you offer a complimentary touch-up if results are uneven at 2 weeks?", "why": "Reputable providers stand behind their work and will adjust if needed."},
     {"question": "What should I avoid before and after treatment?", "why": "Blood thinners, alcohol, and certain supplements increase bruising risk."}
   ],
   "red_flags": [
     "Provider cannot tell you the brand name they use",
     "Price seems unusually low (under $8/unit) — may indicate diluted product",
     "No medical professional on site overseeing treatment",
     "Cannot show before-and-after photos of their own patients",
     "Refuses to discuss units or dosing in advance",
     "Pushes you to treat areas you did not ask about"
   ],
   "source_citations": [
     "FDA approval: Botox (NDA 103000, 2002), Dysport (BLA 125274, 2009), Xeomin (BLA 125360, 2011), Jeuveau (BLA 761085, 2019)",
     "ASPS 2024 Procedural Statistics: 9.9 million neuromodulator treatments performed",
     "RealSelf Worth It Rating: 97%",
     "Average cost per unit: $11–20 (ASPS 2024, national average physician fee $550)"
   ]
 }'::jsonb),

-- 2. Lip Filler
('lip-filler', 'Lip Filler', 'lip-filler', 'injectables',
 'Hyaluronic acid gel to add volume, shape, and symmetry to the lips',
 ARRAY['Lip Filler'],
 91.0, 500, 800, 'per syringe', true,
 '{"consultationRequired":"Recommended","treatmentTime":"30–45 minutes","sessionsNeeded":"1 (touch-up at 2 weeks if needed)","resultsAppear":"Immediate (final at 2 weeks)","resultsDuration":"6–12 months","downtime":"2–3 days of swelling","fdaApproved":true,"fdaApprovalYear":"2006","painLevel":"Moderate (4/10)","averageCost":"$500–800 per syringe","unitsTypical":"0.5–1 syringe for first-timers"}'::jsonb,
 '{
   "what_it_is": "Lip filler uses hyaluronic acid (HA) — a sugar molecule naturally found in your skin — to add volume, define the lip border, and improve symmetry. Popular brands include Juvederm Ultra XC, Juvederm Volbella, and Restylane Kysse. HA fillers are reversible with an enzyme called hyaluronidase if you are unhappy with results.",
   "how_it_works": "The filler gel is injected directly into and around the lips using a fine needle or blunt-tipped cannula. HA attracts and holds water, plumping the tissue from within. The gel also provides structural support to shape the lip border (vermilion border) and smooth vertical lip lines. Results are immediate but swelling makes them look larger than the final result for the first 48–72 hours.",
   "first_time_what_to_expect": "A topical numbing cream is applied for 15–20 minutes before injection. Most modern lip fillers also contain lidocaine for comfort. The actual injection takes 10–15 minutes. Expect swelling for 2–3 days — your lips will look bigger than the final result during this time. Bruising is common but usually minor. Avoid kissing, straws, and strenuous exercise for 24 hours. Final results settle at about 2 weeks.",
   "good_candidate": "Adults who want fuller lips, improved symmetry, or a more defined lip border. People who want a reversible, temporary enhancement. Those who understand that starting conservative (0.5–1 syringe) gives the most natural results.",
   "not_good_candidate": "People with active cold sores or oral infections (treat first, then schedule). Those with unrealistic expectations about size from one syringe. Anyone allergic to hyaluronic acid or lidocaine. People currently taking blood thinners should discuss timing with their doctor.",
   "questions_to_ask": [
     {"question": "What filler brand and type do you recommend for my lips?", "why": "Different HA fillers have different consistencies — some are better for volume, others for subtle definition."},
     {"question": "Do you use a needle or cannula, and why?", "why": "Cannulas may reduce bruising; needles offer more precision. Both are valid — your provider should explain their preference."},
     {"question": "Can I see before-and-after photos of your lip filler work?", "why": "Lip aesthetics are highly subjective. Their portfolio shows whether their style matches your goals."},
     {"question": "What happens if I don''t like the results?", "why": "HA fillers are dissolvable — your provider should be willing to adjust or dissolve if needed."},
     {"question": "How many syringes are you recommending for my first time?", "why": "More than 1 syringe on a first visit is a yellow flag. Conservative is better."}
   ],
   "red_flags": [
     "Recommending more than 1 syringe on your very first lip filler appointment",
     "No numbing cream or lidocaine offered — the treatment should not be unnecessarily painful",
     "Cannot show you previous lip filler results on real patients",
     "Using permanent or non-hyaluronic acid filler for a first-timer (silicone, PMMA)",
     "No discussion of your aesthetic goals or what look you want",
     "Injecting without taking before photos"
   ],
   "source_citations": [
     "FDA approval: Juvederm Ultra XC (2006), Restylane Silk (2014), Restylane Kysse (2020)",
     "ASPS 2024 Statistics: 5.3 million HA filler procedures, average physician fee $715",
     "RealSelf lip filler Worth It Rating: 91%",
     "Hyaluronidase reversal: FDA-approved enzyme that dissolves HA filler"
   ]
 }'::jsonb),

-- 3. Cheek / Midface Filler
('cheek-filler', 'Cheek / Midface Filler', 'cheek-filler', 'injectables',
 'Restore volume and lift to the cheeks for a refreshed, youthful contour',
 ARRAY['Cheek Filler'],
 90.0, 600, 1500, 'per session', true,
 '{"consultationRequired":"Yes","treatmentTime":"30–45 minutes","sessionsNeeded":"1 (follow-up in 2–4 weeks)","resultsAppear":"Immediate (final at 2–4 weeks)","resultsDuration":"12–24 months","downtime":"2–5 days mild swelling","fdaApproved":true,"fdaApprovalYear":"2013","painLevel":"Moderate (3/10)","averageCost":"$600–1,500 per session","unitsTypical":"1–2 syringes per side"}'::jsonb,
 '{
   "what_it_is": "Cheek filler uses hyaluronic acid or calcium hydroxylapatite gel injected along the cheekbone to restore lost volume, lift sagging midface tissue, and improve facial contours. Popular products include Juvederm Voluma XC (FDA-approved specifically for cheeks in 2013) and Restylane Lyft. Volume loss in the cheeks is one of the first signs of aging, and restoring it can also improve under-eye hollows and nasolabial folds.",
   "how_it_works": "Filler is injected deep, near the bone, using a needle or cannula. The gel provides immediate structural support that lifts overlying tissue. Because cheek filler sits on the bone, it has a scaffolding effect — lifting the midface also reduces the appearance of under-eye hollows and smile lines. HA fillers also attract water, adding natural-looking fullness over the first 1–2 weeks.",
   "first_time_what_to_expect": "After a consultation to assess your facial structure, numbing cream or a dental block may be used. The injector places filler in small amounts along the cheekbone, checking symmetry throughout. You will see an immediate difference but should expect mild swelling for 2–5 days. Some bruising is normal. Avoid sleeping face-down and skip intense exercise for 48 hours. Final results settle at 2–4 weeks.",
   "good_candidate": "Adults noticing flatness or volume loss in the midface area. People with under-eye hollows caused by cheek volume loss. Those wanting a lifted, refreshed look without surgery. Anyone who has noticed their face looks more ''tired'' than it used to.",
   "not_good_candidate": "People with very thin skin over the cheekbones (filler may be visible). Those with active skin infections. Individuals with autoimmune conditions affecting connective tissue should consult their doctor first. Anyone expecting cheek filler to fix deep nasolabial folds alone (it helps but may not eliminate them).",
   "questions_to_ask": [
     {"question": "How many syringes do you recommend for natural-looking results?", "why": "Cheeks typically need 1–2 syringes per side. Underfilling wastes money; overfilling looks unnatural."},
     {"question": "What filler brand do you prefer for cheeks?", "why": "Voluma and Restylane Lyft are designed for deep injection. Using the wrong product gives poor results."},
     {"question": "Will cheek filler help my under-eye hollows too?", "why": "Often yes — the lift from cheek filler reduces tear trough shadows."},
     {"question": "How do you ensure my cheeks look symmetrical?", "why": "Everyone has natural asymmetry. A good injector addresses this and sets expectations."},
     {"question": "What is the bruising and swelling timeline?", "why": "Helps you plan around social events or work commitments."}
   ],
   "red_flags": [
     "Recommending 3+ syringes on a first visit with no treatment plan discussion",
     "Using a filler not designed for deep cheek injection (wrong viscosity)",
     "No assessment of facial proportions or bone structure before injecting",
     "Rushing through without discussing your aesthetic goals",
     "No before photos taken"
   ],
   "source_citations": [
     "FDA approval: Juvederm Voluma XC (2013, first HA filler approved for midface), Restylane Lyft (2010)",
     "ASPS 2024: Average HA filler physician fee $715, non-HA filler $901",
     "RealSelf dermal filler Worth It Rating: 90%"
   ]
 }'::jsonb),

-- 4. Jawline / Chin Filler
('jawline-filler', 'Jawline / Chin Filler', 'jawline-filler', 'injectables',
 'Define and contour the jawline and chin for a sharper, more balanced profile',
 ARRAY['Jawline Filler', 'Chin Filler'],
 88.0, 700, 2000, 'per session', true,
 '{"consultationRequired":"Yes","treatmentTime":"30–45 minutes","sessionsNeeded":"1–2","resultsAppear":"Immediate (final at 2–4 weeks)","resultsDuration":"12–24 months","downtime":"3–5 days swelling","fdaApproved":true,"fdaApprovalYear":"2022","painLevel":"Moderate (4/10)","averageCost":"$700–2,000 per session","unitsTypical":"2–4 syringes total"}'::jsonb,
 '{
   "what_it_is": "Jawline and chin filler uses thick, firm hyaluronic acid gel or calcium hydroxylapatite injected along the jawline and chin to create definition, improve symmetry, and strengthen the profile. Juvederm Volux XC was FDA-approved in 2022 specifically for jawline augmentation — the first filler designed for this area. Radiesse is also commonly used for jawline contouring.",
   "how_it_works": "The filler is injected deep along the mandible (jawbone) and at the chin point to create structural support. The thick gel provides immediate contouring by adding projection and definition where bone or soft tissue is lacking. This can sharpen a weak jawline, build chin projection, and improve the transition from face to neck. Because the jaw area has significant muscle movement (chewing, talking), thicker, more robust fillers are used here.",
   "first_time_what_to_expect": "After assessing your profile from multiple angles, the injector will mark strategic points along the jawline and chin. Numbing cream or ice is applied. Injection takes 15–20 minutes using a needle for precise placement. Swelling is more noticeable in this area — expect 3–5 days of puffiness. Tenderness when chewing is normal for 24–48 hours. Final contour settles at 2–4 weeks.",
   "good_candidate": "Adults wanting more jawline definition or chin projection. People with a ''soft'' or receding chin. Those who want non-surgical facial balancing. Men and women wanting a more sculpted lower face.",
   "not_good_candidate": "People with significant jowling or excess skin (may need surgical intervention). Those who grind their teeth heavily (bruxism) — discuss with your provider. Individuals expecting filler to match surgical jawline implant results.",
   "questions_to_ask": [
     {"question": "What filler do you recommend for my jawline goals?", "why": "Volux was specifically designed for the jaw; using softer fillers here gives poor results that migrate."},
     {"question": "How many syringes will my treatment plan require?", "why": "The jawline is a large area — 2–4 syringes is typical. Understanding the total investment upfront prevents sticker shock."},
     {"question": "Can I see profile photos of your jawline filler work?", "why": "Jawline contouring is an advanced technique. Results vary dramatically based on injector skill."},
     {"question": "Should I consider chin filler in addition to the jawline?", "why": "A balanced result often needs both. A weak chin undermines jawline definition."}
   ],
   "red_flags": [
     "Using soft lip or cheek filler for the jawline — this area needs a firm, structural product",
     "No profile assessment or photos taken from multiple angles before injecting",
     "Injector has no specific experience with jawline augmentation",
     "Quoting less than 2 syringes for full jawline contouring — this is rarely enough"
   ],
   "source_citations": [
     "FDA approval: Juvederm Volux XC (2022, first and only HA filler approved for jawline)",
     "ASPS 2024: Non-HA filler average physician fee $901",
     "Clinical studies show Volux maintains shape for 18–24 months in the jawline"
   ]
 }'::jsonb),

-- 5. Under Eye / Tear Trough Filler
('undereye-filler', 'Under Eye / Tear Trough Filler', 'undereye-filler', 'injectables',
 'Reduce dark hollows under the eyes for a more rested, refreshed appearance',
 ARRAY['Under Eye Filler'],
 82.0, 600, 1200, 'per session', true,
 '{"consultationRequired":"Required","treatmentTime":"20–30 minutes","sessionsNeeded":"1","resultsAppear":"Immediate (final at 2 weeks)","resultsDuration":"9–18 months","downtime":"5–10 days (bruising common)","fdaApproved":true,"fdaApprovalYear":"2011","painLevel":"Moderate (4/10)","averageCost":"$600–1,200 per session","unitsTypical":"0.5–1 syringe total (both eyes)"}'::jsonb,
 '{
   "what_it_is": "Tear trough filler uses a very soft, thin hyaluronic acid gel injected beneath the eyes to fill the hollow groove that causes dark shadows and a tired appearance. This is an advanced, off-label use of fillers — the under-eye area is considered a high-risk zone due to thin skin and proximity to blood vessels. Belotero Balance and Restylane are commonly used for their soft consistency.",
   "how_it_works": "A small amount of very soft HA filler is placed in the tear trough — the groove between the lower eyelid and the cheek. This fills the hollow space, reducing the shadow that makes eyes look dark and tired. The thin skin under the eyes means any lump or excess is visible, so injectors use minimal product and work very conservatively. A cannula (blunt-tipped needle) is often preferred here to reduce bruising risk.",
   "first_time_what_to_expect": "This treatment requires an experienced injector. After numbing cream, the provider uses a cannula inserted through a single entry point per side. Only 0.1–0.3 mL of filler is placed per side. You will see an immediate improvement in the hollow, but swelling and bruising under the eyes can last 5–10 days. Avoid bending over, heavy lifting, and alcohol for 48 hours. Sleep elevated the first night. Final results show at 2 weeks.",
   "good_candidate": "Adults with hereditary dark hollows under the eyes (not caused by fat pads or excess skin). People whose under-eye shadows are caused by volume loss, not pigmentation or thin skin alone. Those who understand this is a subtle improvement, not an elimination of dark circles.",
   "not_good_candidate": "People with puffy under-eyes or prominent fat pads (filler will make puffiness worse). Those with very thin, crepey under-eye skin (filler may show through as a bluish tint called Tyndall effect). Individuals with dark circles caused by pigmentation rather than hollowness. Anyone not willing to see a highly experienced injector — this area is not for beginners.",
   "questions_to_ask": [
     {"question": "How many under-eye filler treatments do you perform per month?", "why": "This is the highest-risk filler area. You want someone who does this regularly, not rarely."},
     {"question": "Do you use a needle or cannula for tear troughs?", "why": "Most experts prefer cannulas here to reduce bruising and vascular risk."},
     {"question": "What filler brand do you use under the eyes?", "why": "Only very soft, thin fillers belong here. Thick fillers look lumpy under thin eye skin."},
     {"question": "What is your plan if I develop the Tyndall effect (blue tint)?", "why": "This is a known complication — your provider should know how to dissolve filler if this occurs."},
     {"question": "Could my dark circles be better treated with cheek filler instead?", "why": "Sometimes midface volume loss causes under-eye shadows, and cheek filler is a safer approach."}
   ],
   "red_flags": [
     "Provider does under-eye filler infrequently or is newly trained in this area",
     "Using a thick filler (Voluma, Radiesse) under the eyes — only soft fillers belong here",
     "No discussion of whether your hollow is caused by volume loss vs. fat pads vs. pigmentation",
     "Planning to inject more than 0.5 mL per side on a first treatment",
     "No mention of hyaluronidase availability in case of complications",
     "Provider does not take photos from multiple angles and lighting conditions"
   ],
   "source_citations": [
     "FDA approval: Belotero Balance (2011), Restylane (2003) — tear trough use is off-label",
     "ASPS advisory: under-eye filler classified as advanced injection technique",
     "RealSelf Worth It Rating for under-eye filler: 82%",
     "Tyndall effect risk: documented in peer-reviewed literature for superficial HA placement"
   ]
 }'::jsonb),

-- 6. Sculptra
('sculptra', 'Sculptra', 'sculptra', 'injectables',
 'Biostimulator that triggers your body to rebuild its own collagen over months',
 ARRAY['Sculptra'],
 87.0, 700, 1200, 'per vial', true,
 '{"consultationRequired":"Required","treatmentTime":"30–45 minutes","sessionsNeeded":"2–3 sessions (6–8 weeks apart)","resultsAppear":"Gradual over 2–3 months","resultsDuration":"2+ years","downtime":"1–3 days swelling","fdaApproved":true,"fdaApprovalYear":"2009","painLevel":"Moderate (3/10)","averageCost":"$700–1,200 per vial","unitsTypical":"1–2 vials per session"}'::jsonb,
 '{
   "what_it_is": "Sculptra Aesthetic is a biostimulator made of poly-L-lactic acid (PLLA) — a biocompatible, biodegradable synthetic substance. Unlike traditional fillers that add volume directly, Sculptra stimulates your body to produce its own collagen. It was FDA-approved for cosmetic use in 2009 (originally approved in 2004 for HIV-related facial wasting). Results build gradually and last 2+ years.",
   "how_it_works": "PLLA microparticles are injected into the deep skin layer (dermis). These particles act as a scaffold that triggers your immune system to produce new collagen around them. The PLLA itself is gradually absorbed over months, but the new collagen remains. This is why results appear slowly — you are literally growing new tissue. Most patients see full results after 2–3 treatment sessions spaced 6–8 weeks apart.",
   "first_time_what_to_expect": "Your first session involves mixing the Sculptra vial with sterile water (it should be reconstituted at least 24 hours in advance). The provider injects it in a grid pattern across treatment areas. You will look puffy immediately — this is water swelling, not the final result. The swelling subsides in 2–3 days. You must massage the treated areas 5 times a day for 5 minutes for 5 days (the ''5-5-5 rule''). Results appear gradually over the next 2–3 months.",
   "good_candidate": "Adults with significant facial volume loss who want long-lasting results. People who prefer a gradual, natural-looking change over sudden transformation. Those willing to commit to 2–3 sessions over several months. Patients looking for large-area volume restoration (temples, cheeks, jawline).",
   "not_good_candidate": "People wanting immediate results (Sculptra takes months to show full effect). Those unwilling to follow the post-treatment massage protocol. People with active skin infections or autoimmune conditions. Not recommended for lips or under eyes.",
   "questions_to_ask": [
     {"question": "How many vials and sessions do you recommend for my goals?", "why": "Understanding the full treatment plan and investment upfront prevents disappointment."},
     {"question": "When did you reconstitute the Sculptra?", "why": "Sculptra should be mixed at least 24 hours before injection for proper hydration. Some providers mix it same-day, which increases nodule risk."},
     {"question": "Will you explain the 5-5-5 massage protocol?", "why": "Proper massage prevents lumps and distributes the product evenly. Providers who skip this discussion may not be experienced with Sculptra."},
     {"question": "How does Sculptra compare to HA filler for my goals?", "why": "Filler gives immediate results but lasts 1 year. Sculptra takes time but lasts 2+ years. The right choice depends on your timeline and budget."}
   ],
   "red_flags": [
     "Not explaining the 5-5-5 massage rule after injection",
     "Promising immediate results — Sculptra works gradually over months",
     "Using Sculptra in the lips or directly under the eyes (not appropriate for these areas)",
     "No treatment plan discussed upfront (number of sessions, vials, timeline)",
     "Mixing Sculptra the same day as injection (should be reconstituted 24+ hours prior)"
   ],
   "source_citations": [
     "FDA approval: Sculptra Aesthetic (PMA P030050/S002, 2009 for cosmetic facial wrinkles)",
     "Manufacturer (Galderma): 2+ year duration demonstrated in clinical trials",
     "5-5-5 massage protocol: standard of care recommended by manufacturer",
     "ASPS 2024: Non-HA filler average physician fee $901"
   ]
 }'::jsonb),

-- 7. Radiesse
('radiesse', 'Radiesse', 'radiesse', 'injectables',
 'Immediate filler plus collagen stimulation for hands, cheeks, and jawline',
 ARRAY[]::text[],
 85.0, 650, 900, 'per syringe', true,
 '{"consultationRequired":"Recommended","treatmentTime":"30–45 minutes","sessionsNeeded":"1–2","resultsAppear":"Immediate (collagen builds over 3 months)","resultsDuration":"12–18 months","downtime":"1–2 days","fdaApproved":true,"fdaApprovalYear":"2006","painLevel":"Moderate (3/10)","averageCost":"$650–900 per syringe","unitsTypical":"1–2 syringes"}'::jsonb,
 '{
   "what_it_is": "Radiesse is a dermal filler made of calcium hydroxylapatite (CaHA) microspheres suspended in a water-based gel. It provides immediate volume upon injection and then stimulates your body to produce its own collagen over the following months. FDA-approved in 2006, it is commonly used for cheeks, jawline, nasolabial folds, and hands. It is NOT reversible like hyaluronic acid fillers.",
   "how_it_works": "The CaHA microspheres provide an immediate scaffolding effect — you see volume right away. Over the next 3 months, these microspheres stimulate fibroblast cells to produce new collagen around them. The CaHA is eventually absorbed by the body, but the new collagen remains, providing lasting structural support. When diluted (hyperdilute Radiesse), it can be used as a biostimulator for skin quality improvement over larger areas.",
   "first_time_what_to_expect": "The appointment takes 30–45 minutes. Radiesse is injected with a needle or cannula into deeper tissue layers. You will see an immediate result that looks close to the final outcome (unlike Sculptra, which takes months). Mild swelling and tenderness at injection sites is normal for 1–2 days. Bruising is possible. Avoid heavy exercise for 24 hours.",
   "good_candidate": "Adults wanting immediate results with long-lasting collagen stimulation. People seeking jawline definition, cheek volume, or hand rejuvenation. Those who want a hybrid approach — instant fill plus gradual improvement.",
   "not_good_candidate": "Anyone who wants a reversible filler — Radiesse cannot be dissolved like HA fillers. Not suitable for lips or under the eyes. People with a history of keloid scarring should discuss risks with their provider.",
   "questions_to_ask": [
     {"question": "Why do you recommend Radiesse over hyaluronic acid filler for my area?", "why": "Your provider should have a specific reason — Radiesse is irreversible, so the choice should be deliberate."},
     {"question": "Have you used Radiesse in this specific area before?", "why": "Radiesse placement is technique-sensitive. Experience in your target area matters."},
     {"question": "What happens if I want the filler removed?", "why": "Unlike HA, Radiesse cannot be dissolved. Understanding this before treatment is critical."},
     {"question": "Are you using standard or hyperdilute Radiesse?", "why": "Full-strength provides structure; diluted improves skin quality. Different goals, different approaches."}
   ],
   "red_flags": [
     "Provider does not mention that Radiesse is NOT dissolvable",
     "Using Radiesse in the lips or under the eyes (wrong product for these areas)",
     "No discussion of why Radiesse is preferred over reversible HA alternatives",
     "Lack of experience with CaHA-specific injection techniques"
   ],
   "source_citations": [
     "FDA approval: Radiesse (2006, Merz Aesthetics)",
     "CaHA collagen stimulation: documented in multiple peer-reviewed studies",
     "ASPS 2024: Non-HA filler average physician fee $901",
     "Hyperdilute Radiesse technique published in Dermatologic Surgery journal"
   ]
 }'::jsonb),

-- 8. Kybella
('kybella', 'Kybella', 'kybella', 'injectables',
 'Permanently destroy fat cells under the chin without surgery',
 ARRAY['Kybella'],
 73.0, 900, 1800, 'per session', true,
 '{"consultationRequired":"Required","treatmentTime":"15–20 minutes","sessionsNeeded":"2–4 sessions (6–8 weeks apart)","resultsAppear":"4–6 weeks per session","resultsDuration":"Permanent (fat cells destroyed)","downtime":"5–10 days significant swelling","fdaApproved":true,"fdaApprovalYear":"2015","painLevel":"High (6/10)","averageCost":"$900–1,800 per session","unitsTypical":"1–3 vials per session"}'::jsonb,
 '{
   "what_it_is": "Kybella is an FDA-approved injectable treatment that permanently destroys fat cells under the chin (submental area). The active ingredient is synthetic deoxycholic acid — a molecule that naturally occurs in your body to break down dietary fat. Approved in 2015, it is the only injectable treatment specifically indicated for submental fat reduction.",
   "how_it_works": "Deoxycholic acid is injected in a grid pattern into the fat layer beneath the chin. It disrupts the fat cell membranes, causing them to break down and die. Your body then naturally processes and eliminates the destroyed fat cells over the following weeks. Once fat cells are destroyed, they cannot store fat again — results are permanent. However, multiple sessions are needed to destroy enough cells for a visible result.",
   "first_time_what_to_expect": "Your chin area is marked with a temporary grid tattoo to guide injections. Ice or numbing is applied. Multiple small injections are given (20–50 per session). The injection itself stings significantly. Expect DRAMATIC swelling under the chin for 5–10 days — you will look like a bullfrog. This is normal and expected. Numbness in the area may persist for several weeks. Most patients need 2–4 treatment sessions spaced 6–8 weeks apart to see their final result.",
   "good_candidate": "Adults with moderate submental fat (''double chin'') who want a non-surgical option. People in good overall health who can tolerate significant but temporary swelling. Those willing to commit to multiple treatment sessions.",
   "not_good_candidate": "People with significant skin laxity under the chin (Kybella reduces fat but does not tighten skin). Those needing dramatic fat reduction (surgical liposuction is more effective). Anyone with infections in the treatment area. Individuals who cannot afford 5–10 days of social downtime per session.",
   "questions_to_ask": [
     {"question": "How many sessions and vials do you think I will need?", "why": "Understanding the total treatment plan and cost upfront — most patients need 2–4 sessions."},
     {"question": "Am I a better candidate for Kybella or submental liposuction?", "why": "Lipo is one-and-done; Kybella requires multiple sessions. Honest providers discuss both options."},
     {"question": "What does the swelling timeline really look like?", "why": "If a provider minimizes the swelling, they may not be experienced. Kybella swelling is significant."},
     {"question": "Will Kybella address my skin laxity too?", "why": "Kybella removes fat but does not tighten skin. If you have loose skin, you may need additional treatments."},
     {"question": "What pain management do you offer during treatment?", "why": "Kybella injections are painful. Good providers offer comprehensive numbing."}
   ],
   "red_flags": [
     "Promising results in just one session — 2–4 sessions is the clinical norm",
     "Not discussing liposuction or CoolSculpting as alternatives",
     "No assessment of your chin profile and skin elasticity before treatment",
     "Minimizing the swelling and downtime — Kybella causes significant temporary swelling",
     "Using an off-brand or compounded deoxycholic acid product instead of FDA-approved Kybella"
   ],
   "source_citations": [
     "FDA approval: Kybella (NDA 206333, 2015, Allergan/AbbVie)",
     "Only FDA-approved injectable for submental fat reduction",
     "Clinical trials: Average 2–4 sessions for optimal results, 79% patient satisfaction at 12 weeks",
     "RealSelf Worth It Rating: 73%"
   ]
 }'::jsonb),

-- 9. PRF / PRP Injections
('prp-prf', 'PRF / PRP Injections', 'prp-prf', 'injectables',
 'Use your own blood platelets to rejuvenate skin, stimulate hair growth, or improve under-eye hollows',
 ARRAY['PRP Injections'],
 78.0, 400, 1000, 'per session', false,
 '{"consultationRequired":"Required","treatmentTime":"45–60 minutes (includes blood draw)","sessionsNeeded":"3–4 sessions (4–6 weeks apart)","resultsAppear":"Gradual over 4–8 weeks","resultsDuration":"6–12 months (maintenance needed)","downtime":"1–3 days redness","fdaApproved":false,"painLevel":"Moderate (4/10)","averageCost":"$400–1,000 per session","unitsTypical":"1–2 tubes of blood drawn"}'::jsonb,
 '{
   "what_it_is": "PRP (Platelet-Rich Plasma) and PRF (Platelet-Rich Fibrin) treatments use growth factors from your own blood to stimulate healing and regeneration. A small amount of blood is drawn, processed in a centrifuge to concentrate the platelets, and then injected or applied to the treatment area. PRF is a newer evolution that processes the blood differently — at lower speeds with no additives — creating a fibrin matrix that releases growth factors more slowly over time.",
   "how_it_works": "Platelets contain growth factors (PDGF, VEGF, TGF-beta) that signal your body to produce new collagen, elastin, and blood vessels. When concentrated and injected into skin or scalp, these growth factors kickstart tissue regeneration. PRP is spun faster, producing a liquid concentrate. PRF is spun slower, producing a gel-like substance in a fibrin matrix that releases growth factors over 10–14 days. Common uses include skin rejuvenation, under-eye hollows (''vampire facial''), and hair loss treatment.",
   "first_time_what_to_expect": "A blood draw (1–2 tubes) takes about 5 minutes. The blood is then centrifuged for 10–15 minutes while you wait. The concentrated platelets are injected into your target area using tiny needles or combined with microneedling. For skin treatments, expect redness for 1–3 days. For scalp injections, mild tenderness for 24 hours. Results are gradual — you will notice improvement over 4–8 weeks. A series of 3–4 sessions provides the best results.",
   "good_candidate": "Adults looking for a natural treatment using their own biology. People with early-stage hair thinning (androgenetic alopecia). Those wanting skin texture improvement without synthetic products. Patients who prefer minimal downtime.",
   "not_good_candidate": "People on blood thinners (affects platelet function). Those with platelet disorders or blood cancers. Individuals with active infections or autoimmune disease. Anyone expecting dramatic results from a single session — PRP/PRF is gradual and cumulative.",
   "questions_to_ask": [
     {"question": "Do you use PRP or PRF, and what centrifuge system?", "why": "The quality of the preparation directly affects results. FDA-cleared centrifuge systems produce more consistent concentrations."},
     {"question": "How do you verify platelet concentration?", "why": "Not all PRP is created equal. Higher platelet counts = more growth factors = better results."},
     {"question": "How many sessions are in the treatment plan?", "why": "Single sessions show minimal improvement. A series of 3–4 with maintenance is the evidence-based approach."},
     {"question": "What evidence do you have that PRP works for my specific concern?", "why": "PRP has stronger evidence for hair loss than for skin rejuvenation. Your provider should be honest about expected outcomes."}
   ],
   "red_flags": [
     "Claiming PRP is ''FDA-approved'' — the devices are FDA-cleared, but PRP therapy itself is not FDA-approved for cosmetic use",
     "Promising dramatic results from a single session",
     "Not using a proper centrifuge system or using an inconsistent preparation method",
     "Extremely low prices may indicate a poor-quality centrifuge or preparation technique",
     "No blood draw — some providers sell synthetic ''PRP'' alternatives that are not the same"
   ],
   "source_citations": [
     "PRP centrifuge devices: FDA 510(k) cleared (medical device, not drug approval)",
     "Meta-analysis in Dermatologic Surgery (2019): PRP effective for androgenetic alopecia",
     "PRF fibrin matrix research: Choukroun et al., Oral Surgery journal",
     "ASPS: PRP listed as emerging treatment, not yet included in annual statistics"
   ]
 }'::jsonb),

-- ════════════════════════════════════════
-- SKIN TREATMENTS
-- ════════════════════════════════════════

-- 10. HydraFacial
('hydrafacial', 'HydraFacial', 'hydrafacial', 'skin',
 'Patented 3-step cleanse, extract, and hydrate facial with zero downtime',
 ARRAY['HydraFacial'],
 98.0, 150, 350, 'per session', false,
 '{"consultationRequired":"Not required","treatmentTime":"30 minutes","sessionsNeeded":"1 (monthly recommended)","resultsAppear":"Immediate","resultsDuration":"1–4 weeks","downtime":"None","fdaApproved":false,"fdaCleared":true,"painLevel":"None (1/10)","averageCost":"$150–350 per session","unitsTypical":"N/A"}'::jsonb,
 '{
   "what_it_is": "HydraFacial is a patented skin treatment that uses a medical-grade device to cleanse, extract, and hydrate your skin in three steps. It is the most popular non-invasive facial treatment in the world, performed over 4 million times annually. Unlike a traditional facial, it uses vortex suction technology to remove debris from pores while simultaneously infusing serums. The device is FDA-cleared as a Class II medical device.",
   "how_it_works": "Step 1 (Cleanse + Peel): A gentle acid solution exfoliates dead skin cells. Step 2 (Extract + Hydrate): Vortex suction painlessly removes blackheads and debris from pores while infusing hyaluronic acid and antioxidants. Step 3 (Fuse + Protect): Peptides and growth factors are delivered to the skin surface. The entire process is performed with a single handheld device that uses disposable tips. Optional boosters (brightening, anti-aging, LED light) can be added.",
   "first_time_what_to_expect": "The treatment takes about 30 minutes and feels like a cool, wet suction on your skin — there is no pain. You will see the extracted impurities in a clear container (this is oddly satisfying). Your skin will look immediately brighter, plumper, and more hydrated right after. There is no redness or peeling for most people. You can apply makeup and return to all normal activities immediately.",
   "good_candidate": "Everyone. HydraFacial is safe for all skin types, tones, and ages. It is especially good for first-timers who want to try a professional treatment with zero risk or downtime. Great for dry, oily, acne-prone, or aging skin.",
   "not_good_candidate": "People with active rashes, sunburn, or open wounds on the face (wait until healed). Those with rosacea should inform their provider so the suction intensity can be adjusted. Otherwise, there are very few contraindications.",
   "questions_to_ask": [
     {"question": "Is this a genuine HydraFacial device or a similar hydradermabrasion machine?", "why": "Many med spas use knockoff devices and call the treatment a ''HydraFacial.'' The real device uses patented technology and branded serums."},
     {"question": "What boosters do you recommend for my skin concerns?", "why": "The base treatment is great, but targeted boosters (Britenol for dark spots, Dermabuilder for fine lines) can enhance results."},
     {"question": "How often should I come back?", "why": "Monthly treatments provide the best cumulative results, but even occasional treatments provide benefit."},
     {"question": "Can I see what was extracted from my pores?", "why": "A legit HydraFacial lets you see the waste canister — this is part of the experience and proves the extraction worked."}
   ],
   "red_flags": [
     "Price seems unusually low (under $100) — may not be a genuine HydraFacial device or using knockoff serums",
     "Provider cannot show you the HydraFacial device or calls it by a different name",
     "No skin assessment before choosing booster serums",
     "Claims of permanent results — HydraFacial provides temporary hydration and glow"
   ],
   "source_citations": [
     "HydraFacial (BeautyHealth Co.): FDA-cleared Class II medical device",
     "Over 4 million treatments performed annually worldwide (manufacturer data)",
     "RealSelf Worth It Rating: 98%",
     "ASPS 2024: HydraFacial among most popular non-invasive skin treatments"
   ]
 }'::jsonb),

-- 11. Chemical Peel
('chemical-peel', 'Chemical Peel', 'chemical-peel', 'skin',
 'Controlled exfoliation using acids to reveal smoother, brighter skin underneath',
 ARRAY['Chemical Peel'],
 88.0, 100, 600, 'per session', false,
 '{"consultationRequired":"Recommended","treatmentTime":"15–30 minutes","sessionsNeeded":"1–6 (depending on depth)","resultsAppear":"3–7 days (light), 7–14 days (medium)","resultsDuration":"1–3 months (light), 3–6 months (medium)","downtime":"1–3 days (light), 5–7 days (medium), 10–14 days (deep)","fdaApproved":false,"painLevel":"Mild to Moderate (2–5/10)","averageCost":"$100–600 per session","unitsTypical":"N/A"}'::jsonb,
 '{
   "what_it_is": "A chemical peel uses an acid solution applied to the skin to cause controlled exfoliation — old, damaged skin cells peel away to reveal smoother, brighter skin underneath. Peels range from light (glycolic, lactic acid) to medium (TCA) to deep (phenol). They treat acne, sun damage, fine lines, uneven tone, and texture. Chemical peels have been used for over 100 years and are one of the most well-studied cosmetic procedures.",
   "how_it_works": "The acid breaks the bonds between dead and damaged skin cells, causing them to shed. Light peels work on the outermost layer (epidermis) only. Medium peels penetrate the upper dermis, stimulating collagen production. Deep peels reach the mid-dermis for dramatic remodeling. As the skin heals, new cells grow in — smoother, more evenly pigmented, and with reduced fine lines. Deeper peels produce more dramatic results but require more downtime.",
   "first_time_what_to_expect": "For a light peel (recommended for first-timers): the acid is applied with a brush or gauze and left on for 2–5 minutes. You will feel tingling or mild stinging. The peel is neutralized and removed. Your skin may look slightly pink. Over the next 1–3 days, light flaking occurs — like a mild sunburn peeling. For a medium peel: expect 5–7 days of noticeable peeling and redness. Deep peels require significant downtime (10–14 days) and are typically done under sedation.",
   "good_candidate": "People with acne scars, sun damage, age spots, fine lines, or uneven skin tone. First-timers should start with light peels to see how their skin responds. Those committed to proper sun protection after treatment.",
   "not_good_candidate": "People with active acne lesions (cystic), cold sores triggered by skin trauma (take antivirals first), or recent sunburn. Those with darker skin tones should discuss post-inflammatory hyperpigmentation risk. Not suitable during pregnancy. Anyone who cannot commit to sun protection after the peel.",
   "questions_to_ask": [
     {"question": "What type and strength of peel do you recommend for a first-timer?", "why": "A good provider starts conservative. Jumping to a medium peel on your first visit increases risk of complications."},
     {"question": "What should I expect for downtime and peeling?", "why": "Honest expectations prevent panic when your skin starts flaking 3 days later."},
     {"question": "Do I need to prep my skin before the peel?", "why": "Some medium peels require 2 weeks of retinol or hydroquinone pre-treatment for safety and better results."},
     {"question": "What sunscreen should I use after?", "why": "Post-peel skin is extremely sun-sensitive. SPF 30+ is mandatory for weeks after."}
   ],
   "red_flags": [
     "Offering a deep (phenol) peel as your first chemical peel ever",
     "No skin assessment or Fitzpatrick scale evaluation before choosing peel strength",
     "No post-care instructions provided (sunscreen, moisturizer, what to avoid)",
     "Performing a peel on sunburned, irritated, or actively broken-out skin"
   ],
   "source_citations": [
     "American Academy of Dermatology (AAD): Chemical peels clinical guidelines",
     "ASPS 2024 Procedural Statistics: chemical peels among top 5 minimally invasive procedures",
     "Glycolic acid peels: extensively studied since the 1990s in peer-reviewed literature",
     "RealSelf Worth It Rating for chemical peels: 88%"
   ]
 }'::jsonb),

-- 12. Microneedling (traditional)
('microneedling', 'Microneedling', 'microneedling', 'skin',
 'Tiny controlled punctures stimulate your skin to heal itself with new collagen',
 ARRAY['Microneedling', 'PRP Microneedling', 'Exosome Microneedling'],
 86.0, 200, 450, 'per session', false,
 '{"consultationRequired":"Recommended","treatmentTime":"30–60 minutes (including numbing)","sessionsNeeded":"3–6 sessions (4–6 weeks apart)","resultsAppear":"2–4 weeks per session","resultsDuration":"Cumulative with series","downtime":"1–3 days redness","fdaApproved":false,"fdaCleared":true,"painLevel":"Moderate (4/10)","averageCost":"$200–450 per session","unitsTypical":"N/A"}'::jsonb,
 '{
   "what_it_is": "Microneedling (also called collagen induction therapy) uses a pen-like device with tiny sterile needles to create hundreds of controlled micro-injuries in the skin. This triggers your body''s wound healing response, producing new collagen and elastin. It treats acne scars, fine lines, enlarged pores, stretch marks, and uneven texture. Adding PRP (platelet-rich plasma) to the procedure — sometimes called a ''vampire facial'' — may enhance results.",
   "how_it_works": "The device punctures the top layer of skin at adjustable depths (0.5–2.5mm). These micro-injuries are too small to cause scarring but large enough to activate the skin''s repair cascade. Fibroblasts rush to the treated area and produce new collagen and elastin over the following weeks. Results are cumulative — each session adds to the collagen rebuilding. This is why a series of 3–6 treatments is recommended rather than a single session.",
   "first_time_what_to_expect": "Numbing cream is applied for 20–30 minutes before treatment. The provider then passes the microneedling pen across your face in multiple passes. It feels like light sandpaper or a vibrating sensation — mildly uncomfortable but not painful with numbing. Your skin will be bright red immediately after, like a moderate sunburn. Redness lasts 1–3 days. Mild flaking may occur on days 2–3. Avoid makeup, retinol, and sun exposure for 48 hours. Use gentle cleanser and moisturizer only.",
   "good_candidate": "People with acne scars, fine lines, large pores, uneven texture, or mild skin laxity. Those willing to commit to a series of treatments for best results. All skin types and tones can benefit (unlike some laser treatments that carry more risk for darker skin).",
   "not_good_candidate": "People with active acne, eczema, or psoriasis in the treatment area. Those on blood thinners or isotretinoin (Accutane) — wait 6 months after stopping. Individuals with a history of keloid scarring. Anyone with active skin infections.",
   "questions_to_ask": [
     {"question": "What microneedling device do you use?", "why": "Medical-grade devices (SkinPen, Dermapen) are superior to consumer-grade dermarollers. SkinPen is the only FDA-cleared microneedling device."},
     {"question": "What needle depth will you use for my concerns?", "why": "Deeper is not always better. Depth should be customized to your concern (0.5mm for pores, 1.5–2.5mm for scars)."},
     {"question": "Do you add PRP or other serums during treatment?", "why": "PRP can enhance results but adds cost. Your provider should explain whether the added expense is worthwhile for your specific goals."},
     {"question": "How many sessions will I need to see real improvement?", "why": "One session provides mild improvement. Real texture change requires 3–6 sessions. Budget accordingly."}
   ],
   "red_flags": [
     "No topical numbing cream offered — this treatment is uncomfortable without it",
     "Using non-sterile or reusable needle cartridges (needles must be single-use)",
     "No discussion of your skin concerns or treatment depth before starting",
     "Extremely low price may indicate unlicensed provider or consumer-grade device"
   ],
   "source_citations": [
     "SkinPen: Only FDA-cleared microneedling device (2018, Crown Aesthetics)",
     "Clinical studies: 51–60% improvement in acne scars after a series of treatments",
     "ASPS 2024: National average $954 for microneedling (includes PRP combination treatments)",
     "RealSelf Worth It Rating: 86%"
   ]
 }'::jsonb),

-- 13. RF Microneedling (Morpheus8, Sylfirm X)
('rf-microneedling', 'RF Microneedling', 'rf-microneedling', 'skin',
 'Microneedling supercharged with radiofrequency energy for deeper collagen remodeling',
 ARRAY['RF Microneedling', 'Morpheus8'],
 85.0, 600, 1500, 'per session', false,
 '{"consultationRequired":"Yes","treatmentTime":"45–60 minutes (including numbing)","sessionsNeeded":"3 sessions (4–6 weeks apart)","resultsAppear":"Gradual over 1–3 months","resultsDuration":"12–18 months","downtime":"2–5 days redness and swelling","fdaApproved":false,"fdaCleared":true,"painLevel":"Moderate to High (5/10)","averageCost":"$600–1,500 per session","unitsTypical":"N/A"}'::jsonb,
 '{
   "what_it_is": "RF (radiofrequency) microneedling combines the collagen-stimulating effects of microneedling with thermal energy from radiofrequency. Insulated needles penetrate the skin and deliver RF energy at the tip, heating the deeper layers of skin to stimulate robust collagen and elastin production. Popular devices include Morpheus8, Sylfirm X, Genius, and Vivace. These devices are FDA-cleared for dermatological use.",
   "how_it_works": "The device inserts tiny needles into the skin at adjustable depths (0.5–4mm depending on device). RF energy is then delivered through the needle tips, heating the deep dermis and subcutaneous fat to 60–70 degrees Celsius. This controlled thermal injury triggers a powerful wound healing response, producing significantly more collagen than standard microneedling alone. The insulated needles protect the skin surface while treating deeper layers. This makes RF microneedling effective for skin laxity, deep acne scars, and body skin tightening.",
   "first_time_what_to_expect": "Numbing cream is applied for 30–45 minutes. The treatment takes 30–45 minutes and feels like warm prickling — more intense than standard microneedling. Each pass of the device delivers a brief pulse of heat. Your face will be red and slightly swollen afterward, similar to a moderate sunburn. Redness and mild swelling last 2–5 days. Tiny grid-like marks may be visible for 3–5 days. Avoid sun, retinol, and active skincare for 5–7 days. Results build gradually over 1–3 months as collagen remodels.",
   "good_candidate": "People with moderate acne scarring, skin laxity, enlarged pores, fine lines, or uneven texture who want more dramatic results than standard microneedling. Adults looking for skin tightening without surgery. Safe for all skin types when proper settings are used.",
   "not_good_candidate": "People with pacemakers or metal implants in the treatment area (RF energy can interfere). Those with active acne or skin infections. Individuals on isotretinoin (wait 6 months). Anyone expecting single-session dramatic results — a series of 3 is standard.",
   "questions_to_ask": [
     {"question": "What RF microneedling device do you use?", "why": "Device quality and capabilities vary significantly. Morpheus8, Sylfirm X, and Genius are top-tier devices."},
     {"question": "What depth and energy level will you use for my skin?", "why": "Settings should be customized to your concerns. Higher energy treats laxity; lower energy treats texture and scars."},
     {"question": "How does this compare to standard microneedling for my goals?", "why": "RF microneedling costs 2–3x more. Make sure the additional cost is justified for your specific concerns."},
     {"question": "How many sessions will I need?", "why": "Three sessions spaced 4–6 weeks apart is the standard protocol. One session shows improvement but the full series delivers the best results."}
   ],
   "red_flags": [
     "No numbing offered for what is a more intense treatment than standard microneedling",
     "Cannot name the specific RF microneedling device being used",
     "Pricing similar to standard microneedling — real RF devices are expensive to operate",
     "No post-treatment care instructions or sunscreen guidance",
     "Claiming results equivalent to a surgical facelift"
   ],
   "source_citations": [
     "Morpheus8 (InMode): FDA-cleared for dermatological procedures",
     "Sylfirm X (Viol): FDA-cleared for treatment of skin conditions",
     "Clinical studies: 40–50% improvement in skin texture, 85% patient satisfaction (RealSelf)",
     "ASPS 2024: RF microneedling listed among fastest-growing energy-based treatments"
   ]
 }'::jsonb),

-- 14. Laser Resurfacing (CO2, Fraxel)
('laser-resurfacing', 'Laser Resurfacing', 'laser-resurfacing', 'skin',
 'Precision laser energy removes damaged skin layers and stimulates deep collagen renewal',
 ARRAY['Fractional CO2 Laser'],
 90.0, 1000, 5000, 'per session', false,
 '{"consultationRequired":"Required","treatmentTime":"30–90 minutes","sessionsNeeded":"1–3 (depending on type)","resultsAppear":"2–4 weeks (skin heals)","resultsDuration":"Years (with sun protection)","downtime":"5–14 days (ablative), 2–5 days (fractional)","fdaApproved":false,"fdaCleared":true,"painLevel":"High (6–8/10)","averageCost":"$1,000–5,000 per session","unitsTypical":"N/A"}'::jsonb,
 '{
   "what_it_is": "Laser skin resurfacing uses concentrated beams of light energy to remove damaged outer skin layers and stimulate collagen production in deeper layers. There are two main types: ablative lasers (CO2 and Erbium) that vaporize tissue, and non-ablative lasers (Fraxel, Clear + Brilliant) that heat tissue without removing it. Fractional technology treats a fraction of the skin at a time, leaving healthy tissue between treatment zones for faster healing.",
   "how_it_works": "Ablative lasers (CO2, Erbium) vaporize thin layers of damaged skin, precisely removing wrinkles, scars, and sun damage. The wound healing process generates new, healthier skin with increased collagen. Fractional lasers create thousands of microscopic treatment columns while leaving surrounding tissue intact �� this speeds healing while still triggering significant collagen remodeling. Non-ablative lasers heat the dermis without breaking the skin surface, offering less dramatic results with less downtime.",
   "first_time_what_to_expect": "For fractional CO2 (the most common): topical numbing cream is applied for 45–60 minutes. The laser treatment takes 15–30 minutes and feels like hot pin-pricks with occasional snapping sensations. Your skin will be bright red, swollen, and feel like a severe sunburn immediately after. Days 1–3: significant swelling and oozing. Days 3–7: skin crusts and peels. Days 7–14: pink new skin emerges. Full redness can persist for 2–4 weeks. Sun protection is critical for months afterward.",
   "good_candidate": "People with moderate to severe sun damage, deep wrinkles, acne scarring, or uneven skin texture. Those willing to accept significant downtime for dramatic results. Lighter skin tones carry less risk of post-inflammatory hyperpigmentation (darker skin tones should discuss risks with their dermatologist).",
   "not_good_candidate": "People who cannot take 1–2 weeks off from social activities. Those with darker skin tones (Fitzpatrick IV–VI) should discuss PIH risk carefully. Individuals prone to keloid scarring. Those on isotretinoin (wait 6–12 months). Anyone unable to commit to strict sun protection for months after treatment.",
   "questions_to_ask": [
     {"question": "What type of laser do you recommend for my specific concerns?", "why": "CO2 is the gold standard for deep treatment but has significant downtime. Non-ablative options exist for those wanting less downtime."},
     {"question": "What is the realistic downtime for the settings you recommend?", "why": "Downtime varies dramatically based on laser type and settings. You need honest expectations."},
     {"question": "What is your experience with laser resurfacing on my skin type?", "why": "Risk of post-inflammatory hyperpigmentation increases with darker skin tones. Experience matters."},
     {"question": "What pre-treatment skin prep do I need?", "why": "Many protocols require 2–4 weeks of retinol and hydroquinone before treatment for safety and better results."}
   ],
   "red_flags": [
     "Performing ablative laser on darker skin without discussing hyperpigmentation risk",
     "No pre-treatment skin assessment or Fitzpatrick scale evaluation",
     "Promising minimal downtime for ablative CO2 laser (5–14 days is normal)",
     "No antiviral prescription for patients with cold sore history (laser can trigger outbreaks)",
     "Using aggressive settings on a first-time patient without discussing expectations"
   ],
   "source_citations": [
     "CO2 laser resurfacing: FDA-cleared, gold standard since the 1990s",
     "Fraxel (Solta Medical): FDA-cleared fractional non-ablative laser",
     "ASPS 2024: 3.7 million laser skin resurfacing procedures, 6% year-over-year increase",
     "RealSelf Worth It Rating for laser resurfacing: ~90%"
   ]
 }'::jsonb),

-- 15. IPL / Photofacial
('ipl', 'IPL / Photofacial', 'ipl', 'skin',
 'Broad-spectrum light treats sun damage, redness, and brown spots with minimal downtime',
 ARRAY['IPL / Photofacial'],
 94.0, 300, 600, 'per session', false,
 '{"consultationRequired":"Recommended","treatmentTime":"20–30 minutes","sessionsNeeded":"3–5 sessions (3–4 weeks apart)","resultsAppear":"1–2 weeks (spots darken then flake off)","resultsDuration":"6–12 months with sun protection","downtime":"1–3 days mild darkening of spots","fdaApproved":false,"fdaCleared":true,"painLevel":"Mild to Moderate (3/10)","averageCost":"$300–600 per session","unitsTypical":"N/A"}'::jsonb,
 '{
   "what_it_is": "IPL (Intense Pulsed Light) — also called a photofacial or fotofacial — uses broad-spectrum light to treat sun damage, brown spots, redness, rosacea, broken capillaries, and uneven skin tone. Unlike a laser (which uses a single wavelength), IPL emits multiple wavelengths that can be filtered to target different chromophores (melanin for brown spots, hemoglobin for redness). It is one of the most popular and well-studied skin treatments available.",
   "how_it_works": "The IPL device emits pulses of light that are absorbed by melanin (brown pigment) and hemoglobin (red blood cells in vessels). The light energy converts to heat, damaging the targeted pigment or blood vessel without harming surrounding tissue. Brown spots darken over the next few days, then flake off within 1–2 weeks. Broken blood vessels are heated and reabsorbed by the body. Over a series of treatments, skin tone becomes more even, redness decreases, and overall clarity improves.",
   "first_time_what_to_expect": "The treatment takes 20–30 minutes. A cooling gel is applied, and you wear eye shields. Each pulse feels like a warm snap — like a rubber band flicking against your skin. Most people tolerate it without numbing. Immediately after, brown spots appear darker (this is expected and means the treatment is working). Over 7–14 days, dark spots will crust slightly and flake off, revealing lighter skin underneath. Redness and broken vessels fade gradually over the days following treatment. Avoid sun exposure for 2 weeks before and after.",
   "good_candidate": "People with sun damage, freckles, age spots, rosacea, broken capillaries, or generally uneven skin tone. Those who want noticeable improvement with minimal downtime. Light to medium skin tones respond best (Fitzpatrick I–III).",
   "not_good_candidate": "People with very dark skin tones (Fitzpatrick V–VI) — IPL cannot distinguish target pigment from skin tone, creating burn risk. Those with a recent tan (natural or spray). Individuals taking photosensitizing medications. Anyone with melasma (IPL can worsen it). People with unrealistic expectations about single-session results.",
   "questions_to_ask": [
     {"question": "Is IPL appropriate for my skin tone?", "why": "IPL works best on lighter skin. Darker skin tones have higher burn risk and should use different technology."},
     {"question": "Could my dark spots be melasma instead of sun damage?", "why": "IPL can make melasma worse. An experienced provider differentiates between the two before treating."},
     {"question": "How many sessions will I need for my level of sun damage?", "why": "Most people need 3–5 sessions. Setting expectations prevents disappointment after session one."},
     {"question": "What should I do about sun exposure before and after?", "why": "IPL on tanned skin increases burn risk. Two weeks of sun avoidance before treatment is critical."}
   ],
   "red_flags": [
     "Treating darker skin tones without discussing the increased risk of burns and hyperpigmentation",
     "Not asking about recent sun exposure or tanning",
     "Not evaluating whether your dark spots could be melasma (which IPL can worsen)",
     "No eye protection provided during treatment",
     "Claiming one session will eliminate all sun damage"
   ],
   "source_citations": [
     "IPL devices: FDA-cleared for dermatological use (multiple manufacturers)",
     "RealSelf Worth It Rating for IPL: 94%",
     "AAD (American Academy of Dermatology): IPL recommended for photoaging and vascular lesions",
     "Fitzpatrick scale: IPL safest for types I–III, higher risk for types IV–VI"
   ]
 }'::jsonb),

-- 16. Dermaplaning
('dermaplaning', 'Dermaplaning', 'dermaplaning', 'skin',
 'Surgical blade gently removes dead skin and peach fuzz for instant smoothness and glow',
 ARRAY['Dermaplaning'],
 89.0, 100, 250, 'per session', false,
 '{"consultationRequired":"Not required","treatmentTime":"30 minutes","sessionsNeeded":"1 (monthly recommended)","resultsAppear":"Immediate","resultsDuration":"3–4 weeks","downtime":"None","painLevel":"None (1/10)","averageCost":"$100–250 per session","unitsTypical":"N/A"}'::jsonb,
 '{
   "what_it_is": "Dermaplaning is a physical exfoliation technique where a sterile surgical scalpel (size 10 blade) is held at a 45-degree angle and gently scraped across the skin to remove the top layer of dead skin cells (stratum corneum) and fine vellus hair (peach fuzz). It creates an instantly smooth, bright, ''glass skin'' effect. It is commonly done as a standalone treatment or as a prep before chemical peels, facials, or laser treatments to enhance product penetration.",
   "how_it_works": "The scalpel blade physically scrapes away dead skin cells and fine hair from the skin surface. This immediate manual exfoliation reveals the fresh, smooth skin underneath. By removing the barrier of dead cells and peach fuzz, skincare products can penetrate more effectively, and makeup applies more smoothly. Despite popular myths, dermaplaning does NOT cause hair to grow back thicker or darker — vellus hair is genetically different from terminal hair and is unaffected by cutting.",
   "first_time_what_to_expect": "Your skin is cleansed and dried. The provider holds your skin taut and gently strokes the blade across your face in short, feathering motions. It feels like a credit card being scraped across your face — no pain at all. The entire face takes about 30 minutes. Immediately after, your skin will look noticeably smoother and brighter. There is zero downtime — you can apply makeup and go about your day. Use SPF and avoid harsh exfoliants for 24 hours.",
   "good_candidate": "Anyone wanting smoother skin, better product absorption, or improved makeup application. People with dull, rough skin texture. Those who want a low-risk, no-downtime treatment. Great for first-timers and for prepping skin before other treatments.",
   "not_good_candidate": "People with active acne breakouts (blade can spread bacteria). Those with active cystic acne, eczema, or psoriasis. Individuals on isotretinoin or with thin, fragile skin. Not recommended for skin with active cold sores.",
   "questions_to_ask": [
     {"question": "Do you use a sterile, single-use blade?", "why": "Blades must be fresh and sterile for each client. Reuse creates infection risk."},
     {"question": "Can I combine this with another treatment today?", "why": "Dermaplaning enhances the absorption of chemical peels, facials, and serums. Combining can provide better value."},
     {"question": "Will the hair grow back thicker?", "why": "This is a common myth. A knowledgeable provider will confidently explain that vellus hair grows back identically."},
     {"question": "What should I use on my skin afterward?", "why": "Fresh skin absorbs everything more readily — use clean, gentle products and SPF for 24 hours."}
   ],
   "red_flags": [
     "Reusing blades between clients (each blade must be sterile and single-use)",
     "Performing dermaplaning on active acne or irritated skin",
     "Provider is inexperienced or using a non-medical blade",
     "Charging over $300 for dermaplaning alone — this is a straightforward treatment"
   ],
   "source_citations": [
     "American Society for Dermatologic Surgery (ASDS): Dermaplaning procedure overview",
     "Vellus hair vs. terminal hair: dermatology textbook evidence that shaving does not change hair growth",
     "RealSelf Worth It Rating for dermaplaning: ~89%"
   ]
 }'::jsonb),

-- ════════════════════════════════════════
-- BODY / LASER
-- ════════════════════════════════════════

-- 17. Laser Hair Removal
('laser-hair-removal', 'Laser Hair Removal', 'laser-hair-removal', 'body-laser',
 'Permanent hair reduction using laser energy that targets hair follicles',
 ARRAY['Laser Hair Removal'],
 93.0, 200, 900, 'per session', false,
 '{"consultationRequired":"Yes","treatmentTime":"15–60 minutes (varies by area)","sessionsNeeded":"6–8 sessions (4–8 weeks apart)","resultsAppear":"Hair sheds 1–3 weeks after each session","resultsDuration":"Long-lasting (80–90% reduction)","downtime":"None to minimal (1 day redness)","fdaApproved":false,"fdaCleared":true,"painLevel":"Moderate (4/10)","averageCost":"$200–900 per session (varies by area)","unitsTypical":"N/A"}'::jsonb,
 '{
   "what_it_is": "Laser hair removal uses concentrated light energy to permanently reduce unwanted hair. The laser targets melanin (pigment) in the hair follicle, heating and damaging it to prevent future growth. Because hair grows in cycles, multiple sessions are needed to catch each follicle during its active growth phase. The FDA allows the term ''permanent hair reduction'' — most patients achieve 80–90% reduction after a full series. Some maintenance sessions may be needed annually.",
   "how_it_works": "The laser emits a specific wavelength of light that is absorbed by melanin in the hair shaft. This light energy converts to heat, which travels down the shaft to the follicle and damages the cells responsible for hair growth. Only hairs in the active growth phase (anagen) are affected — about 20% of hairs at any given time. This is why 6–8 sessions spaced 4–8 weeks apart are needed to catch all follicles in their growth phase. Common laser types include Alexandrite (755nm), Diode (810nm), and Nd:YAG (1064nm — safest for dark skin).",
   "first_time_what_to_expect": "Shave the treatment area 24 hours before (do NOT wax or pluck). The technician will calibrate the laser to your skin tone and hair color. A cooling device or gel protects the skin surface. Each pulse feels like a rubber band snapping against your skin — uncomfortable but tolerable. Smaller areas (underarms) take 15 minutes; larger areas (legs, back) take 45–60 minutes. Expect mild redness and bumps for a few hours after. Hair begins shedding (falling out) 1–3 weeks later. The treated area will look progressively smoother after each session.",
   "good_candidate": "People with dark hair and lighter skin get the best results (highest contrast for the laser). Dark skin tones CAN be treated safely with Nd:YAG lasers. Those committed to 6–8 sessions. People tired of shaving, waxing, or ingrown hairs.",
   "not_good_candidate": "People with blonde, white, gray, or red hair (not enough melanin for the laser to target). Those with a recent tan or sunburn. Individuals taking photosensitizing medications. Anyone who has waxed or plucked within 4 weeks (the follicle must be intact). People with unrealistic expectations about complete 100% hair elimination.",
   "questions_to_ask": [
     {"question": "What type of laser do you use, and is it appropriate for my skin tone?", "why": "Nd:YAG is safest for darker skin. Using the wrong laser on dark skin causes burns."},
     {"question": "How many sessions will my treatment area need?", "why": "6–8 sessions is standard. Providers promising results in 2–3 sessions are being dishonest."},
     {"question": "Who operates the laser — an RN, a tech, or a physician?", "why": "Regulations vary by state. In some states, unlicensed operators cause more complications."},
     {"question": "What results should I realistically expect?", "why": "80–90% reduction is realistic. Some maintenance sessions may be needed. 100% removal is not guaranteed."}
   ],
   "red_flags": [
     "Using IPL (intense pulsed light) and calling it ''laser'' hair removal — IPL is less effective",
     "Promising complete permanent hair removal (80–90% reduction is realistic)",
     "Treating dark skin with a laser not designed for it (Alexandrite can burn dark skin)",
     "Extremely low prices (under $50 per session) may indicate IPL or an unlicensed operator",
     "Performing treatment on tanned or sunburned skin"
   ],
   "source_citations": [
     "FDA: Laser hair removal devices cleared for ''permanent hair reduction''",
     "Nd:YAG (1064nm): documented safety for Fitzpatrick skin types IV–VI",
     "ASPS 2024: Average physician fee for laser hair removal $697",
     "RealSelf Worth It Rating: 93%"
   ]
 }'::jsonb),

-- 18. CoolSculpting / CoolTone
('coolsculpting', 'CoolSculpting / CoolTone', 'coolsculpting', 'body-laser',
 'Freeze and permanently destroy fat cells without surgery or downtime',
 ARRAY['CoolSculpting'],
 68.0, 600, 1500, 'per area per session', true,
 '{"consultationRequired":"Required","treatmentTime":"35–60 minutes per area","sessionsNeeded":"1–2 per area","resultsAppear":"2–3 months","resultsDuration":"Permanent (fat cells destroyed)","downtime":"Minimal (soreness for 1–2 weeks)","fdaApproved":true,"fdaApprovalYear":"2010","painLevel":"Moderate (4/10) during, soreness after","averageCost":"$600–1,500 per area per session","unitsTypical":"1–2 sessions per treatment area"}'::jsonb,
 '{
   "what_it_is": "CoolSculpting (cryolipolysis) is an FDA-approved non-surgical body contouring treatment that uses controlled cooling to freeze and permanently destroy fat cells beneath the skin. Approved in 2010, it treats visible fat bulges in areas like the abdomen, flanks, thighs, chin, and upper arms. CoolTone (approved 2019) is a complementary treatment that uses magnetic muscle stimulation to tone muscles, but it does not reduce fat.",
   "how_it_works": "An applicator is placed on the target area and draws tissue between two cooling panels using suction. The panels cool fat cells to a precise temperature (-11 degrees Celsius) that triggers apoptosis (controlled cell death) in fat cells without damaging skin, nerves, or muscle. Fat cells are more susceptible to cold than other tissue types. Over the next 2–3 months, your body naturally processes and eliminates the dead fat cells through the lymphatic system. Studies show 20–25% fat reduction per treatment cycle in the treated area.",
   "first_time_what_to_expect": "During the consultation, your provider will pinpoint which areas to treat and how many applicator cycles are needed. The applicator is placed on your skin — you will feel intense cold and a pulling/tugging sensation from the suction. After 5–10 minutes, the area goes numb and you can relax, read, or use your phone for the remaining 35–50 minutes. When the applicator is removed, the provider massages the frozen tissue (this can be uncomfortable for 2 minutes). Over the next 2 weeks, you may experience tenderness, numbness, and mild bruising in the treated area. Results appear gradually over 2–3 months.",
   "good_candidate": "People within 10–20 pounds of their goal weight with pinchable fat bulges that do not respond to diet and exercise. Those who want fat reduction without surgery or significant downtime. Adults with realistic expectations (CoolSculpting reduces fat by 20–25% per treatment, not 50–60%).",
   "not_good_candidate": "People who are significantly overweight (CoolSculpting is for body contouring, not weight loss). Those with cryoglobulinemia, cold agglutinin disease, or paroxysmal cold hemoglobinuria. Individuals expecting dramatic transformation from a single treatment. Anyone with a history of paradoxical adipose hyperplasia (PAH) — a rare complication where treated fat grows instead of shrinking.",
   "questions_to_ask": [
     {"question": "How many treatment cycles do I need for my goal area?", "why": "Each area typically needs 1–2 cycles. Understanding the full treatment plan prevents surprise costs."},
     {"question": "What is paradoxical adipose hyperplasia (PAH) and what is the risk?", "why": "PAH is a rare but real complication where treated fat enlarges instead of shrinking. A transparent provider discusses this upfront."},
     {"question": "How does CoolSculpting compare to liposuction for my goals?", "why": "CoolSculpting gives 20–25% reduction; lipo can remove much more. Your provider should be honest about which option fits your goals."},
     {"question": "When will I see results, and are they really permanent?", "why": "Results take 2–3 months. Fat cells are permanently destroyed, but remaining cells can still enlarge with weight gain."}
   ],
   "red_flags": [
     "Promising more than 25% fat reduction per session (clinical average is 20–25%)",
     "Not discussing paradoxical adipose hyperplasia (PAH) as a potential risk",
     "Using a non-CoolSculpting cryolipolysis device and calling it CoolSculpting",
     "Treating someone who is significantly overweight rather than referring to appropriate weight management",
     "Not taking before photos or measurements"
   ],
   "source_citations": [
     "FDA approval: CoolSculpting (2010, Allergan/AbbVie), CoolTone (2019)",
     "Clinical studies: Average 20–25% fat reduction per treatment cycle",
     "PAH incidence: estimated 1 in 4,000–20,000 treatments",
     "RealSelf Worth It Rating: 68%"
   ]
 }'::jsonb),

-- 19. Emsculpt / Emsculpt NEO
('emsculpt', 'Emsculpt / Emsculpt NEO', 'emsculpt', 'body-laser',
 'Build muscle and reduce fat simultaneously using electromagnetic energy',
 ARRAY['Emsculpt NEO'],
 92.0, 750, 1000, 'per session', true,
 '{"consultationRequired":"Recommended","treatmentTime":"30 minutes","sessionsNeeded":"4 sessions (2–3 days apart)","resultsAppear":"2–4 weeks (muscle), 3 months (fat)","resultsDuration":"6+ months (with maintenance)","downtime":"None","fdaApproved":true,"fdaApprovalYear":"2018","painLevel":"Moderate (3/10) — strong muscle contractions","averageCost":"$750–1,000 per session","unitsTypical":"4 sessions initial protocol"}'::jsonb,
 '{
   "what_it_is": "Emsculpt and Emsculpt NEO use High-Intensity Focused Electromagnetic (HIFEM) technology to cause supramaximal muscle contractions — contractions far more intense than you could achieve through exercise. One 30-minute session induces roughly 20,000 muscle contractions. Emsculpt NEO (FDA-cleared 2020) adds radiofrequency heating to simultaneously reduce fat. Treatment areas include abdomen, buttocks, arms, calves, and thighs.",
   "how_it_works": "HIFEM energy penetrates the skin and fat layer to directly stimulate motor neurons in the muscle. This causes supramaximal contractions (100% muscle engagement vs. ~40% during voluntary exercise). These intense contractions force the muscle to adapt — muscle fibers thicken and new fibers grow, increasing muscle mass by an average of 25%. Emsculpt NEO adds radiofrequency energy that heats fat cells to 42–43 degrees Celsius, causing apoptosis (fat cell death) and an average 30% fat reduction. The combination of more muscle and less fat creates visible body contouring.",
   "first_time_what_to_expect": "An applicator is strapped to your target area (e.g., abdomen). The treatment starts at a low intensity and is gradually increased over the first few minutes. You will feel your muscles contracting intensely and involuntarily — it is a very strange sensation but not painful. The contractions come in cycles of intense pulses followed by slower ''tapping'' movements that help flush lactic acid. The 30-minute session is equivalent to doing 20,000 crunches or squats. You can talk and relax during treatment. There is zero downtime — you may feel mild muscle soreness the next day (like after a hard workout).",
   "good_candidate": "Fit individuals who want enhanced muscle definition or targeted fat reduction. People who exercise regularly but have stubborn areas. Those wanting a non-invasive body contouring option with no downtime. Athletes seeking enhanced core strength or muscle recovery.",
   "not_good_candidate": "People with pacemakers, defibrillators, or metal implants near the treatment area. Those with hernias in the treatment zone. Individuals who are significantly overweight (Emsculpt is for contouring, not weight loss). Pregnant women.",
   "questions_to_ask": [
     {"question": "Do you have Emsculpt or Emsculpt NEO?", "why": "NEO adds fat reduction via RF. Original Emsculpt only builds muscle. Know which technology you are paying for."},
     {"question": "How many sessions are included in the treatment protocol?", "why": "The standard protocol is 4 sessions over 2 weeks. Ask about package pricing — single sessions are less effective."},
     {"question": "What maintenance schedule do you recommend?", "why": "Results peak at 3 months but require maintenance sessions (every 3–6 months) to sustain."},
     {"question": "How does this compare to CoolSculpting for fat reduction?", "why": "Emsculpt NEO builds muscle AND reduces fat. CoolSculpting only reduces fat. The right choice depends on your goals."}
   ],
   "red_flags": [
     "Claiming results without exercise or lifestyle changes — Emsculpt supplements fitness, not replaces it",
     "Not differentiating between original Emsculpt and NEO when discussing fat reduction",
     "Selling single sessions without discussing the 4-session protocol",
     "Using a knockoff electromagnetic device and calling it Emsculpt"
   ],
   "source_citations": [
     "FDA clearance: Emsculpt (2018), Emsculpt NEO (2020), BTL Aesthetics",
     "Clinical data: 25% average muscle increase, 30% fat reduction (NEO), 96% patient satisfaction",
     "RealSelf Worth It Rating: 92%",
     "20,000 supramaximal contractions per session: BTL manufacturer clinical data"
   ]
 }'::jsonb),

-- 20. Ultherapy / Sofwave
('ultherapy', 'Ultherapy / Sofwave', 'ultherapy', 'body-laser',
 'Non-invasive skin lifting and tightening using focused ultrasound energy',
 ARRAY['Ultherapy', 'Sofwave'],
 74.0, 1500, 4000, 'per session', true,
 '{"consultationRequired":"Required","treatmentTime":"60–90 minutes","sessionsNeeded":"1 (Ultherapy), 1–2 (Sofwave)","resultsAppear":"Gradual over 2–3 months","resultsDuration":"1–2 years","downtime":"Minimal (mild redness, tenderness)","fdaApproved":true,"fdaApprovalYear":"2009","painLevel":"High (6–8/10 for Ultherapy), Moderate (3–4/10 for Sofwave)","averageCost":"$1,500–4,000 per session","unitsTypical":"N/A"}'::jsonb,
 '{
   "what_it_is": "Ultherapy and Sofwave are non-invasive skin lifting and tightening treatments that use focused ultrasound energy to stimulate deep collagen production. Ultherapy (FDA-approved 2009) is the only non-invasive treatment FDA-cleared specifically for lifting the skin on the neck, chin, and brow. Sofwave (FDA-cleared 2019) uses a different ultrasound technology (SUPERB) that treats at a shallower depth with less pain. Both work by heating deep tissue to trigger collagen remodeling without surgery.",
   "how_it_works": "Ultherapy delivers focused ultrasound energy to precise depths (1.5mm, 3mm, and 4.5mm) in the skin and SMAS layer (the same deep tissue layer that surgeons tighten in a facelift). This creates thermal coagulation points that trigger the body''s natural healing response, producing new collagen over 2–3 months. Sofwave uses parallel ultrasound beams at 1.5mm depth with integrated cooling, treating the mid-dermis for collagen renewal and fine wrinkle reduction. Ultherapy goes deeper for more lifting; Sofwave is less painful and focuses on skin texture and mild laxity.",
   "first_time_what_to_expect": "For Ultherapy: ultrasound imaging is used to see the tissue layers in real time. The treatment takes 60–90 minutes. Each pulse delivers focused energy and can be quite uncomfortable — patients describe sharp, hot sensations along the jawline and neck. Pain management options include OTC pain relievers, nerve blocks, or mild sedation. Redness and mild swelling last a few hours. Results develop gradually over 2–3 months. For Sofwave: treatment takes 30–45 minutes and is significantly less painful due to integrated cooling. Mild redness resolves within hours.",
   "good_candidate": "Adults with mild to moderate skin laxity on the face, neck, or brow who want improvement without surgery. People who notice early jowling, neck looseness, or brow drooping. Those willing to wait 2–3 months for gradual results. Ages 30–65 with realistic expectations.",
   "not_good_candidate": "People with severe skin laxity (surgical facelift is more appropriate). Those with very thin skin (may not have enough tissue for treatment). Individuals with open wounds or severe acne in the treatment area. Anyone expecting facelift-level results from a non-surgical treatment.",
   "questions_to_ask": [
     {"question": "Do you recommend Ultherapy or Sofwave for my concerns?", "why": "Ultherapy goes deeper for more lifting but is more painful. Sofwave is gentler with less lifting power. The right choice depends on your laxity level."},
     {"question": "What pain management do you offer?", "why": "Ultherapy can be quite painful. Good practices offer nerve blocks, prescription pain management, or Pro-Nox (nitrous oxide)."},
     {"question": "What level of improvement should I realistically expect?", "why": "Ultrasound skin tightening provides subtle to moderate improvement. It will not replicate a surgical facelift."},
     {"question": "How many treatments will I need?", "why": "Ultherapy is typically a single treatment. Sofwave may need 1–2 sessions. Annual maintenance may be recommended."}
   ],
   "red_flags": [
     "Comparing results to a surgical facelift — ultrasound treatments provide more subtle improvement",
     "No pain management discussion for Ultherapy (it is one of the most painful non-invasive treatments)",
     "Using ultrasound imaging but not actually treating at the SMAS depth",
     "Extremely low pricing may indicate a non-genuine device or inexperienced operator",
     "Not performing treatment with ultrasound visualization (Ultherapy should use real-time imaging)"
   ],
   "source_citations": [
     "FDA clearance: Ultherapy (2009, only non-invasive treatment cleared for skin lifting), Sofwave (2019)",
     "Ultherapy treats at SMAS layer: same tissue targeted in surgical facelifts",
     "Clinical trials: measurable lifting in 85% of patients at 6 months post-treatment",
     "RealSelf Worth It Rating for Ultherapy: 74%"
   ]
 }'::jsonb),

-- ════════════════════════════════════════
-- WELLNESS / MEDICAL
-- ════════════════════════════════════════

-- 21. Semaglutide / GLP-1
('semaglutide', 'Semaglutide / GLP-1 Weight Loss', 'semaglutide', 'wellness',
 'FDA-approved injectable that reduces appetite and helps achieve medically significant weight loss',
 ARRAY['Semaglutide (Ozempic / Wegovy)', 'Compounded Semaglutide', 'Semaglutide / Weight Loss', 'GLP-1 (unspecified)'],
 91.0, 199, 1349, 'per month', true,
 '{"consultationRequired":"Required (medical evaluation)","treatmentTime":"Weekly self-injection (seconds)","sessionsNeeded":"Ongoing (minimum 3–6 months for meaningful results)","resultsAppear":"Appetite reduction within 1–2 weeks; visible weight loss at 4–8 weeks","resultsDuration":"Ongoing while taking medication; weight may return if stopped","downtime":"None","fdaApproved":true,"fdaApprovalYear":"2021","painLevel":"Minimal (1/10) — tiny subcutaneous needle","averageCost":"$199–1,349/month (brand), $200–400/month (compounded)","unitsTypical":"Graduated dosing: 0.25mg → 0.5mg → 1.0mg → 1.7mg → 2.4mg weekly"}'::jsonb,
 '{
   "what_it_is": "Semaglutide is a GLP-1 receptor agonist — a medication that mimics a natural hormone your gut produces after eating. It is FDA-approved for weight management as Wegovy (2021) and for type 2 diabetes as Ozempic (2017). Clinical trials showed average weight loss of 15–17% of body weight over 68 weeks. It is the most effective non-surgical weight loss medication available. Med spas and weight loss clinics also offer compounded semaglutide (not FDA-approved) at lower prices.",
   "how_it_works": "GLP-1 (glucagon-like peptide-1) is a hormone that tells your brain you are full. Semaglutide mimics this hormone but lasts much longer in your body (7 days vs. minutes). It works by: (1) reducing appetite and food cravings, (2) slowing stomach emptying so you feel full longer, and (3) improving blood sugar regulation. The dosage is gradually increased over 16–20 weeks to minimize side effects. Most patients notice significantly reduced hunger and food noise within the first 1–2 weeks.",
   "first_time_what_to_expect": "You will need a medical evaluation (in-person or telehealth) including BMI, health history, and lab work. The starting dose is very low (0.25mg weekly) and increases every 4 weeks. You self-inject once weekly in the abdomen, thigh, or upper arm using a pre-filled pen or syringe. The needle is tiny — most patients say it is painless. Common initial side effects include nausea, constipation, and reduced appetite. Nausea typically subsides within 2–4 weeks as your body adjusts. Eating smaller meals and avoiding high-fat foods helps. You will have regular check-ins with your prescriber to monitor progress and adjust dosing.",
   "good_candidate": "Adults with BMI 30+ (obesity), or BMI 27+ with at least one weight-related condition (high blood pressure, type 2 diabetes, high cholesterol). People who have tried diet and exercise but need additional medical support. Those committed to ongoing lifestyle changes alongside medication.",
   "not_good_candidate": "People with a personal or family history of medullary thyroid carcinoma or MEN2 syndrome (boxed warning). Those with a history of pancreatitis. Individuals seeking rapid weight loss without lifestyle changes. Anyone who is pregnant, planning pregnancy, or breastfeeding. People with type 1 diabetes.",
   "questions_to_ask": [
     {"question": "Are you prescribing brand-name Wegovy/Ozempic or compounded semaglutide?", "why": "Brand-name is FDA-approved with consistent dosing. Compounded versions are cheaper but not FDA-regulated and may vary in quality."},
     {"question": "What is the dosing escalation schedule?", "why": "Proper titration (slowly increasing dose) minimizes nausea. Providers who start at high doses are cutting corners."},
     {"question": "What happens when I stop the medication?", "why": "Studies show significant weight regain after stopping. Your provider should discuss a long-term plan, not just short-term use."},
     {"question": "How will you monitor me during treatment?", "why": "Regular check-ins, lab work, and body composition tracking ensure safety and effectiveness."},
     {"question": "What side effects should I watch for?", "why": "Nausea is common; pancreatitis and gallbladder issues are rare but serious. Know the warning signs."}
   ],
   "red_flags": [
     "No medical evaluation before prescribing — semaglutide has contraindications that must be screened for",
     "Starting at a high dose without gradual titration (causes severe nausea)",
     "Selling compounded semaglutide without disclosing it is not FDA-approved",
     "No follow-up appointments or monitoring scheduled",
     "Promising specific weight loss numbers (individual results vary significantly)",
     "Advertising to patients who do not meet BMI criteria for medical weight management"
   ],
   "source_citations": [
     "FDA approval: Wegovy (semaglutide 2.4mg, 2021 for weight management), Ozempic (2017 for type 2 diabetes)",
     "STEP 1 trial: 14.9% average body weight loss vs. 2.4% placebo over 68 weeks (NEJM, 2021)",
     "Novo Nordisk self-pay pricing: $199–349/month (2025 promotional), list price $1,349/month",
     "FDA boxed warning: Risk of thyroid C-cell tumors based on rodent studies"
   ]
 }'::jsonb),

-- 22. IV Therapy
('iv-therapy', 'IV Therapy', 'iv-therapy', 'wellness',
 'Intravenous delivery of vitamins, minerals, and hydration directly into your bloodstream',
 ARRAY['IV Therapy', 'IV Vitamin Therapy', 'IV Drip Therapy'],
 80.0, 150, 400, 'per session', false,
 '{"consultationRequired":"Brief screening","treatmentTime":"30–60 minutes","sessionsNeeded":"1 (as desired)","resultsAppear":"During or within hours of infusion","resultsDuration":"1–2 weeks","downtime":"None","fdaApproved":false,"painLevel":"Mild (2/10) — IV insertion only","averageCost":"$150–400 per session","unitsTypical":"N/A"}'::jsonb,
 '{
   "what_it_is": "IV therapy delivers vitamins, minerals, antioxidants, and fluids directly into your bloodstream through an intravenous drip. By bypassing the digestive system, IV delivery achieves much higher blood levels of nutrients than oral supplements. Common formulations include the Myers'' Cocktail (B vitamins, vitamin C, magnesium, calcium), NAD+, glutathione, and customized ''drip bars'' targeting hydration, energy, immunity, or recovery. IV therapy is widely offered at med spas, wellness clinics, and mobile IV services.",
   "how_it_works": "A small IV catheter is placed in a vein (usually in the arm). A bag of sterile saline containing vitamins and minerals drips slowly into your bloodstream over 30–60 minutes. Because the nutrients bypass your gut, absorption is nearly 100% (vs. 20–50% for oral vitamins). The saline itself provides hydration. Different formulations target different goals: B12 and B-complex for energy, vitamin C and zinc for immunity, glutathione for skin brightening, magnesium for muscle recovery.",
   "first_time_what_to_expect": "A brief health screening (allergies, medical conditions) is done before your first session. A nurse or medic inserts a small IV catheter — a brief pinch. The drip runs for 30–60 minutes while you relax in a chair. Some people feel an immediate cooling sensation or taste vitamins. Most people feel more hydrated and energized within hours. Some notice improved skin glow the next day. Side effects are rare but can include bruising at the IV site, mild nausea (especially with B vitamins), or a warm flushing sensation (with magnesium).",
   "good_candidate": "People who are dehydrated, recovering from illness, jet lag, or hangovers. Those with confirmed nutrient deficiencies. Athletes seeking faster recovery. Individuals who have difficulty absorbing oral vitamins (GI conditions). Anyone wanting a wellness boost.",
   "not_good_candidate": "People with kidney disease or heart failure (fluid overload risk). Those with certain electrolyte imbalances. Individuals allergic to any ingredients in the formulation. Anyone expecting IV therapy to cure serious medical conditions — it is a wellness supplement, not a medical treatment.",
   "questions_to_ask": [
     {"question": "Who is administering my IV and what are their credentials?", "why": "IV insertion should be performed by a licensed nurse, paramedic, or physician. Unlicensed administration is a safety risk."},
     {"question": "What exactly is in my IV bag?", "why": "You should know every ingredient. Reputable providers list all components and their concentrations."},
     {"question": "Is there a physician overseeing the IV therapy practice?", "why": "Many states require a medical director to oversee IV therapy. No medical oversight is a compliance and safety red flag."},
     {"question": "What side effects should I watch for?", "why": "While generally safe, allergic reactions, vein irritation, and fluid overload are possible. Your provider should discuss these."}
   ],
   "red_flags": [
     "No health screening before starting the IV (allergies, medical history, medications)",
     "Cannot tell you exactly what is in the IV bag or the concentrations",
     "No licensed medical professional on site or overseeing the practice",
     "Making medical claims that IV therapy cures diseases or serious conditions",
     "Extremely low prices may indicate diluted or substandard vitamin compounding"
   ],
   "source_citations": [
     "Myers'' Cocktail: Developed by John Myers, MD; studied in peer-reviewed literature since the 1980s",
     "IV therapy is not FDA-approved as a treatment — individual vitamin compounds may be FDA-approved",
     "IV absorption: ~100% bioavailability vs. 20–50% oral (pharmacology textbook data)",
     "RealSelf Worth It Rating for IV therapy: ~80%"
   ]
 }'::jsonb),

-- 23. Hormone Therapy (HRT / BHRT)
('hormone-therapy', 'Hormone Therapy (HRT / BHRT)', 'hormone-therapy', 'wellness',
 'Restore hormonal balance to improve energy, mood, metabolism, and quality of life',
 ARRAY['HRT (Hormone Replacement)', 'Testosterone Therapy'],
 84.0, 100, 500, 'per month', false,
 '{"consultationRequired":"Required (blood work mandatory)","treatmentTime":"Varies (pellets: 15 min; creams: daily; injections: weekly)","sessionsNeeded":"Ongoing","resultsAppear":"2–4 weeks (energy), 3–6 months (full optimization)","resultsDuration":"Ongoing while on therapy","downtime":"None (minimal for pellet insertion)","fdaApproved":false,"painLevel":"Minimal","averageCost":"$100–500/month","unitsTypical":"Dosing based on lab results"}'::jsonb,
 '{
   "what_it_is": "Hormone replacement therapy (HRT) restores hormones that have declined due to aging, menopause, andropause, or other conditions. Conventional HRT uses FDA-approved synthetic or bioidentical hormones (estrogen, progesterone, testosterone). BHRT (bioidentical hormone replacement therapy) uses hormones molecularly identical to what your body produces — these can be FDA-approved (Estrace, Prometrium) or custom-compounded. Delivery methods include pellets, creams, patches, injections, and oral forms. Med spas and wellness clinics often focus on testosterone and thyroid optimization.",
   "how_it_works": "As men and women age, production of key hormones (estrogen, progesterone, testosterone, thyroid, DHEA) declines. This causes symptoms like fatigue, weight gain, low libido, brain fog, mood changes, hot flashes, and muscle loss. HRT replaces these hormones to restore optimal levels. Treatment begins with comprehensive blood work to identify deficiencies. Dosing is customized based on your lab results and adjusted over time. Hormone pellets (inserted under the skin every 3–4 months) provide the most consistent delivery; creams and injections require more frequent self-administration.",
   "first_time_what_to_expect": "Your first visit includes a detailed health history and comprehensive blood work panel (total and free testosterone, estradiol, progesterone, thyroid, DHEA-S, cortisol, vitamin D, and more). Results take about a week. Your provider will review results and create a customized treatment plan. If starting pellets, a small incision is made in the hip area and pellets are inserted under the skin — takes 10–15 minutes with local anesthesia. If using creams or injections, you will be taught how to self-administer. Most patients notice improved energy and sleep within 2–4 weeks. Full optimization takes 3–6 months with lab monitoring and dose adjustments.",
   "good_candidate": "Women experiencing perimenopause or menopause symptoms (hot flashes, night sweats, mood changes). Men with confirmed low testosterone (fatigue, low libido, muscle loss). Anyone with lab-confirmed hormone deficiency and symptoms affecting quality of life.",
   "not_good_candidate": "People with hormone-sensitive cancers (breast, prostate, uterine). Those with a history of blood clots or stroke (some hormone forms increase risk). Individuals who have not had proper blood work to confirm deficiency. Anyone seeking hormones for performance enhancement without a medical indication.",
   "questions_to_ask": [
     {"question": "What comprehensive lab panel do you run before prescribing?", "why": "Treating ''by symptoms'' without blood work is dangerous. A full panel should include at minimum: testosterone, estradiol, progesterone, thyroid, DHEA-S, and metabolic markers."},
     {"question": "Do you use FDA-approved or custom-compounded hormones?", "why": "FDA-approved bioidenticals have standardized dosing and quality control. Compounded hormones vary by pharmacy and are not FDA-regulated."},
     {"question": "How often will you monitor my levels and adjust dosing?", "why": "Hormone therapy requires regular lab monitoring (every 3–6 months). Providers who prescribe without follow-up labs are not practicing safely."},
     {"question": "What are the risks specific to my health history?", "why": "Hormone therapy has real risks (cardiovascular, clotting, cancer risk depending on the hormone). Your provider should discuss these for YOUR specific situation."}
   ],
   "red_flags": [
     "Prescribing hormones without comprehensive blood work first",
     "No follow-up lab monitoring after starting therapy",
     "One-size-fits-all dosing (not customized to your lab results)",
     "Promising anti-aging miracles rather than discussing realistic hormonal optimization",
     "Using compounded hormones without disclosing that they are not FDA-approved",
     "No discussion of risks and contraindications"
   ],
   "source_citations": [
     "FDA-approved bioidentical hormones: Estrace (estradiol), Prometrium (progesterone), various testosterone formulations",
     "North American Menopause Society (NAMS): HRT guidelines and position statements",
     "Endocrine Society: Clinical practice guidelines for testosterone therapy in men",
     "Women''s Health Initiative (WHI): Long-term HRT risk/benefit data"
   ]
 }'::jsonb),

-- 24. Hair Restoration (PRP, exosomes)
('hair-restoration', 'Hair Restoration (PRP / Exosomes)', 'hair-restoration', 'wellness',
 'Stimulate dormant hair follicles and slow hair loss using growth factor treatments',
 ARRAY['PRP Hair Restoration', 'Hair Loss Treatment'],
 79.0, 500, 2000, 'per session', false,
 '{"consultationRequired":"Required (scalp evaluation)","treatmentTime":"60–90 minutes (includes blood draw for PRP)","sessionsNeeded":"3–4 initial sessions (4–6 weeks apart), then maintenance","resultsAppear":"3–6 months (gradual)","resultsDuration":"12–18 months (maintenance needed)","downtime":"None to minimal (scalp tenderness 24h)","fdaApproved":false,"painLevel":"Moderate (4/10)","averageCost":"$500–2,000 per session","unitsTypical":"3–4 sessions initial series"}'::jsonb,
 '{
   "what_it_is": "Hair restoration treatments at med spas and dermatology offices primarily use PRP (platelet-rich plasma) or exosome therapy to stimulate hair growth in areas of thinning. PRP uses growth factors concentrated from your own blood. Exosome therapy uses extracellular vesicles (derived from stem cells) that contain growth factors and signaling molecules. Both aim to wake up dormant hair follicles, extend the growth phase, and increase hair thickness. These are non-surgical alternatives to hair transplantation.",
   "how_it_works": "PRP: Blood is drawn and centrifuged to concentrate platelets (which contain growth factors like PDGF, VEGF, and IGF-1). The PRP is then injected into the scalp at areas of thinning. Growth factors stimulate hair follicle stem cells, extend the anagen (growth) phase, and increase blood supply to the follicle. Exosomes: These tiny vesicles contain growth factors and mRNA that signal cells to regenerate. They are applied to the scalp via microneedling or direct injection. Exosome therapy is newer and has less published evidence than PRP but shows promising early results.",
   "first_time_what_to_expect": "For PRP: A blood draw (1–2 tubes) is taken and processed in a centrifuge for 10–15 minutes. Your scalp is numbed with topical anesthetic or nerve blocks. PRP is injected across the thinning areas using a fine needle in a grid pattern — expect 50–100 small injections. The scalp will be tender for 24 hours. You may wash your hair the next day. There is no visible downtime. Results are gradual — you may notice less shedding within 4–6 weeks, and visible thickening at 3–6 months. A series of 3–4 sessions provides the best results, followed by maintenance every 6–12 months.",
   "good_candidate": "People with early to moderate androgenetic alopecia (genetic hair thinning) who still have active follicles. Those who want to slow hair loss and improve thickness without surgery. Men and women with thinning hair (not complete baldness). Patients who are also using minoxidil or finasteride and want to enhance results.",
   "not_good_candidate": "People with complete baldness in the target area (no follicles to stimulate). Those with blood disorders or on blood thinners. Individuals with autoimmune hair loss (alopecia areata) should discuss with a dermatologist first. Anyone expecting a full head of new hair — PRP improves thickness and slows loss but does not regrow hair in bald areas.",
   "questions_to_ask": [
     {"question": "Do you use PRP or exosomes, and what system do you use to prepare them?", "why": "PRP quality varies dramatically based on the centrifuge system. FDA-cleared systems produce more consistent results."},
     {"question": "What evidence supports this treatment for my type of hair loss?", "why": "PRP has strong evidence for androgenetic alopecia. Evidence for exosomes is still emerging. Honest providers discuss the data."},
     {"question": "How many sessions will I need, and what is the maintenance schedule?", "why": "A series of 3–4 sessions is standard, with maintenance every 6–12 months. Understand the ongoing commitment."},
     {"question": "Should I also be using minoxidil or finasteride?", "why": "PRP works best as part of a comprehensive hair loss plan. Providers who only offer PRP without discussing medical therapy are not giving you the full picture."},
     {"question": "What realistic improvement can I expect?", "why": "PRP can slow loss and improve thickness, but it will not reverse complete baldness. Honest expectations matter."}
   ],
   "red_flags": [
     "Promising full hair regrowth or reversal of baldness (PRP slows loss and improves thickness only)",
     "No scalp evaluation or hair loss diagnosis before treatment",
     "Using exosomes with no published evidence for their specific product",
     "Extremely high prices (over $3,000/session) without justification",
     "No discussion of complementary treatments (minoxidil, finasteride, low-level laser therapy)",
     "No before/after photos or documentation of their results"
   ],
   "source_citations": [
     "PRP for hair loss: Meta-analysis in Dermatologic Surgery (2019) — effective for androgenetic alopecia",
     "PRP centrifuge devices: FDA 510(k) cleared as medical devices",
     "Exosome therapy: Not FDA-approved; considered investigational by the FDA as of 2024",
     "International Society of Hair Restoration Surgery (ISHRS): PRP guidelines"
   ]
 }'::jsonb)

ON CONFLICT (id) DO NOTHING;

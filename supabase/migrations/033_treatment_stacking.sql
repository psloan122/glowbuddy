-- 033: Treatment Stacking Guide — compatibility matrix with sourced citations

CREATE TABLE IF NOT EXISTS treatment_stacking (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  treatment_a text NOT NULL,
  treatment_b text NOT NULL,
  compatibility text NOT NULL CHECK (compatibility IN ('great_combo', 'same_day_ok', 'space_apart', 'avoid')),
  timing_note text,
  why text NOT NULL,
  pro_tip text,
  source_url text,
  source_type text CHECK (source_type IN ('fda_label', 'peer_reviewed', 'clinical_consensus')),
  UNIQUE(treatment_a, treatment_b)
);

CREATE INDEX idx_stacking_a ON treatment_stacking (treatment_a);
CREATE INDEX idx_stacking_b ON treatment_stacking (treatment_b);

-- RLS: public SELECT, admin-only writes
ALTER TABLE treatment_stacking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read treatment stacking"
  ON treatment_stacking FOR SELECT
  USING (true);

-- Saved routines
CREATE TABLE IF NOT EXISTS user_routines (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_name text NOT NULL DEFAULT 'My Routine',
  treatments text[] NOT NULL DEFAULT '{}',
  quiz_answers jsonb,
  schedule jsonb,
  cost_estimate_low numeric,
  cost_estimate_high numeric,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own routines"
  ON user_routines FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ──────────────────────────────────────────────────────────────────
-- SEED DATA — all compatibility rules sourced from peer-reviewed
-- literature, FDA labels, or documented clinical consensus.
-- ──────────────────────────────────────────────────────────────────

INSERT INTO treatment_stacking (treatment_a, treatment_b, compatibility, timing_note, why, pro_tip, source_url, source_type) VALUES

-- ═══ GREAT COMBOS ═══

('Botox / Dysport / Xeomin', 'Lip Filler', 'same_day_ok',
 'Can be performed same day; administer filler first.',
 'Consensus recommendations for combined aesthetic interventions support same-day neurotoxin and filler treatment. A multinational panel found combined same-day treatments improve clinical results with no loss of efficacy or increased adverse effects. Filler placement should precede neurotoxin injection.',
 'Ask your provider to do filler first, then Botox. This allows precise filler placement before any muscle relaxation alters landmarks.',
 'https://pubmed.ncbi.nlm.nih.gov/27100962/',
 'peer_reviewed'),

('Botox / Dysport / Xeomin', 'Cheek Filler', 'same_day_ok',
 'Can be performed same day; administer filler first.',
 'Same multinational consensus panel endorses same-day combined neurotoxin and volumizer treatment for facial rejuvenation. The combination addresses both dynamic wrinkles and volume loss, with patients rating the combination as superior to toxin alone.',
 'Filler first, then Botox. Different treatment zones minimize any interaction.',
 'https://pubmed.ncbi.nlm.nih.gov/27100962/',
 'peer_reviewed'),

('Microneedling', 'PRP/PRF', 'great_combo',
 'PRP applied immediately after microneedling in the same session.',
 'Microneedling creates controlled micro-channels that enhance PRP absorption. A comprehensive PMC review found that combining microneedling with PRP produces significantly higher results across all assessment methodologies compared to either treatment alone. The growth factors in PRP act synergistically with the collagen induction cascade triggered by microneedling.',
 'This is a standard clinical protocol — most providers offer them as a single combined treatment.',
 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7028374/',
 'peer_reviewed'),

('RF Microneedling', 'PRP/PRF', 'great_combo',
 'PRP applied immediately after RF microneedling in the same session.',
 'Similar mechanism to standard microneedling + PRP — the micro-channels created by RF microneedling enhance PRP penetration. The added radiofrequency energy stimulates deeper collagen remodeling, and PRP growth factors further amplify the healing response.',
 'RF microneedling creates deeper channels than standard microneedling, potentially allowing better PRP absorption.',
 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11499218/',
 'peer_reviewed'),

('HydraFacial', 'Microneedling', 'great_combo',
 'HydraFacial first, then microneedling in the same session.',
 'HydraFacial cleanses and hydrates skin, creating an optimal surface for microneedling. Clinical practice supports performing HydraFacial as a prep step before microneedling to improve treatment penetration and outcomes. Wait 48-72 hours post-microneedling before another HydraFacial.',
 'HydraFacial as a pre-treatment clears debris and preps skin for better microneedling results.',
 'https://www.hydrafacial.com/clinical-studies/',
 'clinical_consensus'),

('HydraFacial', 'RF Microneedling', 'great_combo',
 'HydraFacial first, then RF microneedling in the same session.',
 'Same prep benefit as with standard microneedling — HydraFacial cleanses and hydrates before the more intensive RF microneedling procedure. The clean, hydrated skin surface may improve energy delivery consistency.',
 'HydraFacial before RF microneedling is a popular combination at med spas for enhanced results.',
 'https://www.hydrafacial.com/clinical-studies/',
 'clinical_consensus'),

('HydraFacial', 'Chemical Peel', 'great_combo',
 'HydraFacial first, then a light chemical peel in the same session.',
 'HydraFacial prep removes surface debris and dead skin cells, allowing more even chemical peel penetration. This combination is widely practiced and supported by clinical consensus for light/superficial peels.',
 'Only combine with light peels — medium and deep peels require separate sessions.',
 'https://www.hydrafacial.com/clinical-studies/',
 'clinical_consensus'),

('HydraFacial', 'PRP/PRF', 'great_combo',
 'HydraFacial first, then PRP application in the same session.',
 'HydraFacial cleanses and creates micro-exfoliation that may improve PRP absorption. The hydrated skin surface provides an optimal environment for topical PRP application.',
 'A popular combination — the cleansed skin absorbs PRP growth factors more effectively.',
 'https://www.hydrafacial.com/clinical-studies/',
 'clinical_consensus'),

('Botox / Dysport / Xeomin', 'Sculptra', 'same_day_ok',
 'Can be done same day but in different treatment zones. Space 2 weeks apart if targeting adjacent areas.',
 'Botox and Sculptra target different tissue layers — Botox relaxes muscles while Sculptra stimulates collagen production in the deep dermis. They can complement each other when targeting different facial zones. However, Sculptra requires 5 days of post-treatment massage, which could theoretically spread neurotoxin in adjacent areas.',
 'If getting both, ensure they target different zones. Avoid Botox in areas that will need Sculptra massage.',
 'https://pubmed.ncbi.nlm.nih.gov/27100962/',
 'clinical_consensus'),

('Lip Filler', 'Cheek Filler', 'same_day_ok',
 'Can be performed in the same session.',
 'HA fillers in different facial zones are routinely combined in single sessions. The ASDS guidelines and consensus recommendations support multi-zone filler treatment in a single visit when performed by an experienced injector.',
 'Many providers offer full-face filler sessions. Discuss your goals upfront so they can plan the treatment order.',
 'https://pubmed.ncbi.nlm.nih.gov/27100962/',
 'clinical_consensus'),

('Sculptra', 'Cheek Filler', 'same_day_ok',
 'Can be combined; Sculptra for deep volume, HA filler for immediate contouring.',
 'Sculptra and HA fillers work through different mechanisms — Sculptra stimulates collagen over months while HA provides immediate volume. Dermatologists commonly layer these for comprehensive midface rejuvenation.',
 'Sculptra for gradual, long-lasting volume building; HA filler for immediate sculpting and definition.',
 'https://www.dermatologytimes.com/view/sculptra-tips-include-enforcing-rule-fives-combining-temporary-fillers',
 'clinical_consensus'),

('Microneedling', 'Chemical Peel', 'same_day_ok',
 'Light chemical peel can precede microneedling in the same session.',
 'A practical approach review in PMC notes that superficial chemical peels can be combined with microneedling in the same session, with the peel applied first to remove the stratum corneum and enhance microneedling penetration. This combination is documented in clinical practice guidelines.',
 'Only light/superficial peels — never combine microneedling with medium or deep peels in the same session.',
 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6122508/',
 'peer_reviewed'),

-- ═══ SPACE APART ═══

('Botox / Dysport / Xeomin', 'Microneedling', 'space_apart',
 'Wait at least 2 weeks after Botox before microneedling.',
 'Clinical guidance documents risk of neurotoxin migration when microneedling is performed too soon after botulinum toxin injection. The pressure, vibration, and inflammation from microneedling may physically displace unsettled toxin into adjacent unintended muscles. A minimum 2-week interval allows the toxin to fully bind to target motor nerve terminals.',
 'If you want both, do microneedling first and wait for skin healing (7-14 days), then Botox. Or do Botox first and wait 2+ weeks.',
 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9345194/',
 'peer_reviewed'),

('Botox / Dysport / Xeomin', 'RF Microneedling', 'space_apart',
 'Wait at least 2 weeks after Botox before RF microneedling.',
 'Same neurotoxin migration concern as standard microneedling, with the added consideration that RF energy generates heat which could theoretically accelerate toxin diffusion. The 2-week minimum interval allows the toxin to fully bind to motor nerve terminals before any mechanical or thermal manipulation.',
 'RF microneedling is more intense than standard — err on the longer side of the 2-week minimum.',
 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9345194/',
 'peer_reviewed'),

('Lip Filler', 'Microneedling', 'space_apart',
 'Wait at least 2 weeks after filler before microneedling the treated area.',
 'Dermal fillers need time to integrate into tissue and stabilize. Microneedling too soon may displace filler, increase swelling, or cause uneven distribution. Medical professionals recommend waiting at least 2 weeks between fillers and microneedling treatments.',
 'If microneedling is planned, consider doing it before your filler appointment instead.',
 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11499218/',
 'clinical_consensus'),

('Cheek Filler', 'Microneedling', 'space_apart',
 'Wait at least 2 weeks after filler before microneedling the treated area.',
 'Same filler stabilization principle — HA fillers require time to integrate and settle. Mechanical disruption from microneedling needles could displace filler before it has fully incorporated into tissue.',
 'Microneedling can typically be performed safely in areas away from the filler injection sites during the waiting period.',
 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11499218/',
 'clinical_consensus'),

('Lip Filler', 'RF Microneedling', 'space_apart',
 'Wait at least 2-4 weeks after filler before RF microneedling.',
 'RF microneedling combines mechanical needle penetration with radiofrequency heat energy. A PMC review on concomitant use of HA and laser/energy devices notes that heat from energy-based devices may accelerate HA filler degradation. The panel recommends performing energy treatments before filler, or waiting 2-4 weeks after filler placement.',
 'Longer wait than standard microneedling due to the thermal component. Energy treatments before filler is the safest sequence.',
 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6742610/',
 'peer_reviewed'),

('Cheek Filler', 'RF Microneedling', 'space_apart',
 'Wait at least 2-4 weeks after filler before RF microneedling.',
 'A review of concomitant HA and laser/energy device use found that thermal degradation of HA fillers is a concern with energy-based treatments. When combination treatment is planned, the consensus is to perform energy treatments first, or space them 2-4 weeks after filler.',
 'If you want both, plan RF microneedling before your filler appointment for the safest sequence.',
 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6742610/',
 'peer_reviewed'),

('Chemical Peel', 'Microneedling', 'space_apart',
 'Wait at least 2 weeks between medium/deep chemical peels and microneedling.',
 'Medium and deep chemical peels cause significant epidermal disruption and require healing time. A PMC practical approach review notes that while superficial peels can be combined with microneedling, medium and deep peels compromise the skin barrier sufficiently that microneedling poses increased risk of scarring and infection.',
 'Light peels can be combined same-day, but medium/deep peels need full healing first.',
 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6122508/',
 'peer_reviewed'),

('Chemical Peel', 'RF Microneedling', 'space_apart',
 'Wait at least 4 weeks between medium/deep chemical peels and RF microneedling.',
 'Medium and deep peels disrupt the epidermal barrier significantly. RF microneedling on compromised skin carries elevated risk of burns, scarring, and post-inflammatory hyperpigmentation. The skin needs complete re-epithelialization before any energy-based treatment.',
 'The deeper the peel, the longer the wait. Let your skin fully heal — peeling and redness should be completely resolved.',
 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6122508/',
 'peer_reviewed'),

('Kybella', 'Lip Filler', 'space_apart',
 'Wait at least 4 weeks after Kybella before any procedure in the chin/jaw area.',
 'Per the FDA prescribing information for KYBELLA (deoxycholic acid), treatments should be spaced at least 1 month apart. The FDA label advises caution with prior or planned aesthetic treatments in the submental area, as Kybella causes substantial tissue inflammation and swelling that must resolve before additional procedures.',
 'Kybella causes significant swelling for 1-2 weeks. Wait until swelling fully resolves before considering filler nearby.',
 'https://www.accessdata.fda.gov/drugsatfda_docs/label/2022/206333s005lbl.pdf',
 'fda_label'),

('Kybella', 'Cheek Filler', 'space_apart',
 'Wait at least 4 weeks after Kybella before filler in adjacent areas.',
 'Per the FDA KYBELLA label, caution should be used in patients who have had or plan to have aesthetic treatment of the submental area. The inflammatory response from deoxycholic acid injections can affect adjacent tissue, and changes in anatomy from Kybella-treated areas may impact filler placement accuracy.',
 'Kybella inflammation can extend beyond the injection zone. Let it fully resolve before any nearby filler.',
 'https://www.accessdata.fda.gov/drugsatfda_docs/label/2022/206333s005lbl.pdf',
 'fda_label'),

('Kybella', 'Botox / Dysport / Xeomin', 'space_apart',
 'Wait at least 4 weeks after Kybella before Botox in the chin/jaw area.',
 'The FDA KYBELLA label advises caution with aesthetic treatments in the submental area. The significant inflammatory response and swelling from deoxycholic acid could affect neurotoxin distribution if Botox is injected in adjacent chin or jawline areas during the active inflammation period.',
 'Kybella for the chin and Botox for the upper face can typically be done closer together since the zones are far apart.',
 'https://www.accessdata.fda.gov/drugsatfda_docs/label/2022/206333s005lbl.pdf',
 'fda_label'),

('Kybella', 'Microneedling', 'space_apart',
 'Wait at least 4-6 weeks after Kybella before microneedling the treated area.',
 'Per the FDA label, Kybella causes adipocytolysis (fat cell destruction) with substantial tissue inflammation, edema, and induration. Microneedling in an area with active inflammation and tissue destruction could worsen adverse effects and delay healing. Full resolution of Kybella-induced inflammation is necessary.',
 'The submental area typically takes 4-6 weeks to fully recover from Kybella. Don''t microneedle until swelling and firmness resolve.',
 'https://www.accessdata.fda.gov/drugsatfda_docs/label/2022/206333s005lbl.pdf',
 'fda_label'),

('Kybella', 'RF Microneedling', 'space_apart',
 'Wait at least 6 weeks after Kybella before RF microneedling the treated area.',
 'Combining RF energy with the tissue that is actively undergoing Kybella-induced adipocytolysis could cause unpredictable tissue response. The FDA label notes the significant inflammatory cascade from deoxycholic acid — adding thermal energy to inflamed tissue may worsen adverse effects.',
 'Allow full recovery from Kybella before any energy-based treatment in the area.',
 'https://www.accessdata.fda.gov/drugsatfda_docs/label/2022/206333s005lbl.pdf',
 'fda_label'),

('Kybella', 'Chemical Peel', 'space_apart',
 'Wait at least 4 weeks after Kybella before chemical peels in the chin area.',
 'Per FDA label, Kybella causes tissue inflammation and edema. Applying chemical agents to skin overlying actively inflamed subcutaneous tissue could increase irritation and risk of post-inflammatory hyperpigmentation.',
 'Chemical peels on other facial areas are fine during the Kybella recovery period.',
 'https://www.accessdata.fda.gov/drugsatfda_docs/label/2022/206333s005lbl.pdf',
 'fda_label'),

('Sculptra', 'Microneedling', 'space_apart',
 'Wait at least 2-4 weeks after Sculptra before microneedling.',
 'Sculptra requires a specific post-treatment massage protocol (5 minutes, 5 times daily, for 5 days) to ensure even distribution and reduce nodule risk per the FDA-cleared instructions for use. Microneedling during this settling period could disrupt Sculptra distribution and potentially cause nodule formation.',
 'Complete the full 5-day massage protocol and let Sculptra settle before microneedling.',
 'https://www.accessdata.fda.gov/cdrh_docs/pdf3/P030050S039C.pdf',
 'fda_label'),

('Sculptra', 'RF Microneedling', 'space_apart',
 'Wait at least 4 weeks after Sculptra before RF microneedling.',
 'Sculptra''s post-treatment massage protocol and settling period must be respected. Additionally, RF energy and heat could theoretically affect poly-L-lactic acid microsphere distribution during the early phase when Sculptra is still being incorporated into tissue.',
 'Give Sculptra time to settle and start its collagen-stimulating process before any energy treatments.',
 'https://www.accessdata.fda.gov/cdrh_docs/pdf3/P030050S039C.pdf',
 'fda_label'),

('Sculptra', 'Chemical Peel', 'space_apart',
 'Wait at least 2 weeks after Sculptra before chemical peels over the treated area.',
 'Sculptra injection sites need time to heal and the massage protocol to be completed. Chemical peels over recently injected areas could increase irritation and potentially affect the inflammatory cascade needed for Sculptra''s collagen-stimulating mechanism.',
 'Peels on non-treated facial areas are fine during the Sculptra settling period.',
 'https://www.accessdata.fda.gov/cdrh_docs/pdf3/P030050S039C.pdf',
 'fda_label'),

('Botox / Dysport / Xeomin', 'Chemical Peel', 'space_apart',
 'Wait at least 1 week after Botox before a chemical peel, or do the peel first.',
 'Clinical consensus recommends allowing neurotoxin to fully bind before any facial manipulation. Chemical peel application involves pressure and massage that could theoretically displace unsettled toxin. If combining, perform the chemical peel first and wait for healing before Botox.',
 'Safest sequence: peel first, wait for healing, then Botox. Or Botox first, then wait at least 7 days.',
 'https://pubmed.ncbi.nlm.nih.gov/27100962/',
 'clinical_consensus'),

('Botox / Dysport / Xeomin', 'HydraFacial', 'space_apart',
 'Wait at least 5-7 days after Botox before HydraFacial, or do HydraFacial first.',
 'HydraFacial involves suction and skin manipulation that could potentially displace freshly injected neurotoxin. Clinical practice recommends performing HydraFacial before Botox on the same day, or waiting 5-7 days after Botox for the toxin to fully bind.',
 'Best approach: HydraFacial first as skin prep, then Botox in the same session.',
 'https://pubmed.ncbi.nlm.nih.gov/27100962/',
 'clinical_consensus'),

('Lip Filler', 'HydraFacial', 'space_apart',
 'Wait 1-2 weeks after lip filler before HydraFacial on the lower face.',
 'HydraFacial involves suction and extraction that could displace freshly placed filler. Allow the filler to fully integrate into tissue before any mechanical manipulation. HydraFacial can be performed first as a prep step.',
 'HydraFacial before filler is a great prep combo. After filler, give it time to settle.',
 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7497045/',
 'clinical_consensus'),

('Cheek Filler', 'HydraFacial', 'space_apart',
 'Wait 1-2 weeks after cheek filler before HydraFacial.',
 'Same principle — the suction and mechanical manipulation of HydraFacial could displace freshly placed HA filler. Consensus pre- and post-treatment recommendations advise avoiding facial manipulation for 1-2 weeks after filler placement.',
 'You can still do HydraFacial on areas away from the filler injection sites during the waiting period.',
 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7497045/',
 'clinical_consensus'),

('Lip Filler', 'Chemical Peel', 'space_apart',
 'Wait at least 2 weeks after filler before a chemical peel over the treated area.',
 'Chemical agents on skin overlying freshly placed filler may increase inflammation and theoretically affect filler integration. The skin barrier should be intact and the filler settled before introducing chemical exfoliation.',
 'Peels on other facial zones are fine while waiting for lip filler to settle.',
 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7497045/',
 'clinical_consensus'),

('Cheek Filler', 'Chemical Peel', 'space_apart',
 'Wait at least 2 weeks after filler before a chemical peel over the treated area.',
 'Same principle — allow the filler to settle and integrate before applying chemical agents that cause inflammation and exfoliation over the treatment area.',
 'A light peel on non-filler areas is generally fine during the waiting period.',
 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7497045/',
 'clinical_consensus'),

('Sculptra', 'Lip Filler', 'same_day_ok',
 'Can be combined when treating different zones.',
 'Sculptra and HA fillers work through different mechanisms and are typically used in different facial zones — Sculptra for temples and cheeks, lip filler for lips. When treating separate areas, they can be administered in the same session.',
 'Common combination: Sculptra for overall volume restoration + lip filler for definition.',
 'https://www.dermatologytimes.com/view/sculptra-tips-include-enforcing-rule-fives-combining-temporary-fillers',
 'clinical_consensus'),

('Sculptra', 'PRP/PRF', 'space_apart',
 'Wait at least 2-4 weeks after Sculptra before PRP treatment.',
 'Sculptra requires its specific massage protocol and settling period. PRP injection involves needling that could disrupt Sculptra distribution. Allow the poly-L-lactic acid to fully incorporate before additional injectable treatments in the same area.',
 'PRP for skin rejuvenation in areas away from Sculptra sites is fine during the waiting period.',
 'https://www.accessdata.fda.gov/cdrh_docs/pdf3/P030050S039C.pdf',
 'fda_label'),

('Sculptra', 'HydraFacial', 'space_apart',
 'Wait at least 1 week after Sculptra before HydraFacial. HydraFacial first is fine same-day.',
 'Sculptra injection sites need time for the 5-5-5 massage protocol. HydraFacial suction could interfere with Sculptra settling if performed too soon. HydraFacial as a pre-treatment before Sculptra injection is acceptable.',
 'HydraFacial before Sculptra is a nice prep step. After Sculptra, focus on the massage protocol first.',
 'https://www.accessdata.fda.gov/cdrh_docs/pdf3/P030050S039C.pdf',
 'fda_label'),

('Kybella', 'Sculptra', 'space_apart',
 'Wait at least 6 weeks after Kybella before Sculptra in adjacent areas.',
 'Both treatments cause significant tissue response — Kybella through adipocytolysis and Sculptra through a foreign body reaction that stimulates collagen. Combining both in the lower face simultaneously could cause unpredictable tissue inflammation and complicate assessment of individual treatment effects.',
 'These target different concerns (fat reduction vs. collagen stimulation). Space them well apart for predictable results.',
 'https://www.accessdata.fda.gov/drugsatfda_docs/label/2022/206333s005lbl.pdf',
 'fda_label'),

('Kybella', 'PRP/PRF', 'space_apart',
 'Wait at least 4 weeks after Kybella before PRP in the submental area.',
 'Per FDA label, Kybella causes significant tissue inflammation and edema. Introducing PRP (with its concentrated growth factors) into actively inflamed tissue from Kybella could produce an unpredictable healing response.',
 'PRP in other facial areas is fine during the Kybella recovery period.',
 'https://www.accessdata.fda.gov/drugsatfda_docs/label/2022/206333s005lbl.pdf',
 'fda_label'),

('Kybella', 'HydraFacial', 'space_apart',
 'Wait at least 2-3 weeks after Kybella before HydraFacial on the chin area.',
 'HydraFacial involves suction that could exacerbate Kybella-induced swelling and discomfort. The submental area needs time for the inflammatory response to subside before any mechanical skin treatment.',
 'HydraFacial on the upper face is fine while the chin area recovers from Kybella.',
 'https://www.accessdata.fda.gov/drugsatfda_docs/label/2022/206333s005lbl.pdf',
 'fda_label'),

('Botox / Dysport / Xeomin', 'PRP/PRF', 'space_apart',
 'Wait at least 2 weeks after Botox before PRP injections in the same area.',
 'PRP injection involves multiple needle passes that could displace neurotoxin before it fully binds. Additionally, PRP-induced inflammation could theoretically affect toxin diffusion patterns. The 2-week interval allows full toxin binding to motor end plates.',
 'PRP and Botox in completely different facial zones (e.g., PRP scalp + Botox forehead) have less concern.',
 'https://pubmed.ncbi.nlm.nih.gov/27100962/',
 'clinical_consensus'),

('Lip Filler', 'PRP/PRF', 'space_apart',
 'Wait at least 2 weeks after lip filler before PRP in the same area.',
 'PRP injection involves needling that could displace freshly placed filler. Allow the HA to integrate before additional injectable treatments in the same zone.',
 'PRP for skin rejuvenation in other facial areas is fine while lip filler settles.',
 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7497045/',
 'clinical_consensus'),

('Cheek Filler', 'PRP/PRF', 'space_apart',
 'Wait at least 2 weeks after cheek filler before PRP in the same area.',
 'Same principle — HA filler needs time to settle and integrate. PRP injections could mechanically displace filler that hasn''t fully incorporated into tissue.',
 'Stagger these treatments by 2+ weeks for best results.',
 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7497045/',
 'clinical_consensus'),

('Microneedling', 'RF Microneedling', 'space_apart',
 'Wait at least 4-6 weeks between standard and RF microneedling sessions.',
 'Both treatments create controlled micro-injuries that trigger collagen remodeling. Performing them too close together can overwhelm the skin''s healing capacity, increasing risk of scarring and prolonged inflammation. The skin needs one full cell turnover cycle (approximately 28 days) to recover.',
 'These target similar mechanisms — choose one per session rather than stacking both.',
 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11499218/',
 'peer_reviewed'),

('Chemical Peel', 'PRP/PRF', 'space_apart',
 'Wait at least 2 weeks after a medium chemical peel before PRP.',
 'Chemical peels disrupt the epidermal barrier. PRP injection through compromised skin increases infection risk and could produce unpredictable inflammatory responses. Allow complete re-epithelialization before PRP.',
 'Light peels are less disruptive — some providers combine them with PRP after shorter intervals.',
 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6122508/',
 'peer_reviewed'),

('Chemical Peel', 'HydraFacial', 'space_apart',
 'Wait at least 1-2 weeks after a medium chemical peel before HydraFacial.',
 'Medium and deep peels compromise the skin barrier significantly. HydraFacial suction and extraction on peeling or healing skin could cause irritation, uneven peeling, or damage. Wait for complete re-epithelialization.',
 'Light peels + HydraFacial in the same session is fine. Medium/deep peels need full healing first.',
 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6122508/',
 'peer_reviewed'),

-- ═══ AVOID ═══

('Botox / Dysport / Xeomin', 'Botox / Dysport / Xeomin', 'avoid',
 'Do not use two different neurotoxin brands simultaneously.',
 'FDA prescribing information for BOTOX states that the effect of administering different botulinum toxin products at the same time or within several months of each other is unknown. Concurrent use of different neurotoxin formulations is not established for safety, and potency units are not interchangeable between products, creating risk of overdose or unpredictable spread.',
 'Stick with one neurotoxin brand per treatment cycle. Switching brands should be done with a full washout period.',
 'https://www.accessdata.fda.gov/drugsatfda_docs/label/2024/103000s5316s5319s5323s5326s5331lbl.pdf',
 'fda_label')

ON CONFLICT (treatment_a, treatment_b) DO NOTHING;

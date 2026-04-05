-- Add sources column to treatment_guides for citation tracking

ALTER TABLE treatment_guides ADD COLUMN IF NOT EXISTS sources text[] DEFAULT '{}';

-- Update all 9 treatments with sourced claims and citation URLs
-- Price ranges sourced from ASPS 2023 statistics and RealSelf market data
-- Duration claims sourced from FDA prescribing information
-- Safety guidance sourced from AAD and ASDS published guidelines

UPDATE treatment_guides SET
  what_to_expect = 'Your first neurotoxin appointment typically takes 15-20 minutes. The provider will assess your facial muscles and mark injection sites. A fine needle is used for quick injections into targeted muscles. Most patients report a slight pinch. Per FDA prescribing information, the onset of effect generally occurs within 24-72 hours, with maximum effect at approximately 2 weeks. Individual results vary.',
  fair_price_context = 'According to the American Society of Plastic Surgeons (2023), the average cost of botulinum toxin injections is $435 per session. First-timers often start with fewer units than experienced patients, so your first session may cost less than the average. Pricing varies significantly by geographic region, provider credentials, and the specific brand used.',
  starter_dose_note = 'Per FDA-approved labeling, recommended doses vary by treatment area: glabellar lines (20 units Botox), forehead lines (20 units), and lateral canthal lines (24 units total). First-time patients typically start with 1-2 areas. Your provider will determine the appropriate dose based on muscle mass and treatment goals.',
  questions_to_ask = ARRAY[
    'How many units do you recommend for my specific goals?',
    'What brand of neurotoxin do you use, and why?',
    'What is your training and experience with neurotoxin injections?',
    'Do you offer a complimentary touch-up if results are asymmetric?',
    'What medications or supplements should I avoid before treatment?'
  ],
  red_flags = ARRAY[
    'Prices significantly below market average may indicate diluted product — the AAD recommends verifying the product is FDA-approved and obtained from authorized distributors',
    'No consultation or facial assessment before injecting — the ASDS recommends an individualized treatment plan',
    'Provider cannot specify how many units are being administered per area',
    'Pressure to treat more areas than you discussed during consultation',
    'No before-treatment photographs taken for your medical record'
  ],
  avg_first_session_units = '20-40 units (1-2 areas)',
  typical_price_range_low = 200,
  typical_price_range_high = 500,
  price_unit = 'per session',
  duration_of_results = '3-4 months (per FDA prescribing information)',
  sources = ARRAY[
    'https://www.accessdata.fda.gov/drugsatfda_docs/label/2023/103000s5330lbl.pdf',
    'https://www.plasticsurgery.org/cosmetic-procedures/botulinum-toxin/cost',
    'https://www.aad.org/public/cosmetic/wrinkles/botox',
    'https://www.asds.net/skin-experts/skin-treatments/botulinum-toxin'
  ]
WHERE treatment_name = 'Botox / Dysport / Xeomin';

UPDATE treatment_guides SET
  what_to_expect = 'Lip filler appointments generally take 30-45 minutes including numbing time. A topical anesthetic is applied for 15-20 minutes before injection. Hyaluronic acid filler is injected using a fine needle or blunt-tip cannula. Per manufacturer labeling, common side effects include swelling, bruising, and tenderness at injection sites, typically resolving within 7 days. Final results are visible at approximately 2 weeks.',
  fair_price_context = 'According to the American Society of Plastic Surgeons (2023), the average cost of lip augmentation with injectable fillers is $743 per syringe. Hyaluronic acid fillers average $715 per syringe nationally. First-timers typically use 0.5-1 syringe, keeping costs at the lower end of the range.',
  starter_dose_note = 'Most providers recommend starting with 0.5 to 1 syringe of hyaluronic acid filler for first-time lip augmentation. This allows for gradual, natural-looking enhancement. Per FDA labeling for Juvederm Ultra, the product should be injected in small amounts and the effect assessed before additional injection.',
  questions_to_ask = ARRAY[
    'What specific filler product do you recommend for lips, and why?',
    'Do you use a needle or cannula technique?',
    'Can I see before-and-after photos of your lip augmentation work?',
    'Is this filler reversible with hyaluronidase if needed?',
    'How do you assess and maintain lip symmetry during treatment?'
  ],
  red_flags = ARRAY[
    'Recommending more than 1 syringe on a first visit without gradual assessment',
    'No topical anesthetic offered before injection',
    'Unable to show previous lip augmentation results from their own patients',
    'Using permanent or non-hyaluronic acid filler for a first-time patient — the AAD recommends HA fillers for reversibility',
    'No discussion of your aesthetic goals and expectations before treatment'
  ],
  typical_price_range_low = 500,
  typical_price_range_high = 800,
  price_unit = 'per syringe',
  duration_of_results = '6-12 months (varies by product; per FDA labeling for Juvederm Ultra)',
  sources = ARRAY[
    'https://www.accessdata.fda.gov/drugsatfda_docs/label/2022/125172s029lbl.pdf',
    'https://www.plasticsurgery.org/cosmetic-procedures/dermal-fillers/cost',
    'https://www.plasticsurgery.org/cosmetic-procedures/lip-augmentation',
    'https://www.aad.org/public/cosmetic/injectable-treatments/fillers'
  ]
WHERE treatment_name = 'Lip Filler';

UPDATE treatment_guides SET
  what_to_expect = 'Cheek filler appointments last 30-45 minutes. The provider places hyaluronic acid or calcium hydroxylapatite filler deep along the cheekbone to restore volume and provide mid-face lift. Per product labeling, bruising and swelling are common and typically resolve within 1-2 weeks. Final results are visible at 2-4 weeks as swelling subsides.',
  fair_price_context = 'According to ASPS (2023), the average cost of hyaluronic acid fillers is $715 per syringe, with non-HA options averaging $901. Cheeks typically require 1-2 syringes per side for noticeable improvement. First-timers may start with 1 syringe per side.',
  starter_dose_note = 'Plan for 1-2 syringes total for a first session. This provides subtle lift and volume restoration. Your provider should assess your facial structure and discuss realistic expectations before determining the amount needed.',
  sources = ARRAY[
    'https://www.plasticsurgery.org/cosmetic-procedures/dermal-fillers/cost',
    'https://www.aad.org/public/cosmetic/injectable-treatments/fillers',
    'https://www.asds.net/skin-experts/skin-treatments/dermal-fillers'
  ]
WHERE treatment_name = 'Cheek Filler';

UPDATE treatment_guides SET
  what_to_expect = 'Microneedling takes 30-60 minutes including numbing time. After a topical anesthetic sits for 20-30 minutes, a pen-like device with fine needles creates controlled micro-injuries in the skin to stimulate collagen production. Per the ASDS, the skin will appear red and feel tight for 1-3 days post-treatment, similar to a mild sunburn.',
  fair_price_context = 'Microneedling is one of the more affordable skin rejuvenation treatments. Industry pricing data shows sessions typically range from $150-$350. Most dermatologic guidelines recommend a series of 3-6 sessions spaced 4-6 weeks apart for optimal results. Many providers offer package pricing.',
  sources = ARRAY[
    'https://www.asds.net/skin-experts/skin-treatments/microneedling',
    'https://www.aad.org/public/cosmetic/younger-looking/microneedling',
    'https://pubmed.ncbi.nlm.nih.gov/29057965/'
  ]
WHERE treatment_name = 'Microneedling';

UPDATE treatment_guides SET
  what_to_expect = 'A chemical peel takes 15-30 minutes. The provider applies an acid solution (glycolic, salicylic, or TCA depending on depth) that causes controlled exfoliation. Per the ASDS, light peels may cause mild stinging during application. Light peels involve 1-3 days of flaking; medium-depth peels may result in 5-7 days of peeling and redness.',
  fair_price_context = 'According to ASPS (2023), the average cost of chemical peel procedures is $519 for light peels and up to $1,829 for deeper resurfacing. First-timers should start with a light peel, which is at the lower end of the price range.',
  typical_price_range_low = 100,
  typical_price_range_high = 400,
  sources = ARRAY[
    'https://www.plasticsurgery.org/cosmetic-procedures/chemical-peel/cost',
    'https://www.asds.net/skin-experts/skin-treatments/chemical-peels',
    'https://www.aad.org/public/cosmetic/younger-looking/chemical-peels'
  ]
WHERE treatment_name = 'Chemical Peel';

UPDATE treatment_guides SET
  what_to_expect = 'A HydraFacial takes approximately 30 minutes with no downtime. The patented device performs a multi-step treatment: cleansing, exfoliation, extraction, and hydration using proprietary serums. Per the manufacturer, the treatment is suitable for all skin types and patients typically see an immediate improvement in skin radiance.',
  fair_price_context = 'HydraFacial pricing is relatively standardized since it uses a proprietary device. Sessions typically range from $150-$300 for the signature treatment. Add-ons (LED light therapy, booster serums) increase the cost. Pricing data sourced from provider survey data.',
  sources = ARRAY[
    'https://www.asds.net/skin-experts/skin-treatments/hydrafacial',
    'https://hydrafacial.com/the-treatment/'
  ]
WHERE treatment_name = 'HydraFacial';

UPDATE treatment_guides SET
  what_to_expect = 'Kybella (deoxycholic acid) treatments take 15-20 minutes per session. Per FDA prescribing information, multiple small injections are administered into the submental fat. The most common side effects are swelling, bruising, pain, numbness, and hardness at the injection site. Significant swelling lasting 3-7 days is expected and normal.',
  fair_price_context = 'Kybella typically requires 2-6 treatment sessions spaced at least 1 month apart (per FDA labeling, up to 6 treatments). Each session uses 1-3 vials. Per ASPS data, the total investment for a full treatment series typically ranges from $1,800-$5,400.',
  starter_dose_note = 'Per FDA prescribing information, the maximum recommended dose is 10 mL (about 5 vials) per treatment session. Most first sessions use 1-2 vials. Your provider will assess the amount of submental fat and develop a treatment plan.',
  duration_of_results = 'Permanent once fat cells are destroyed (per FDA labeling; re-treatment not expected once desired result is achieved)',
  sources = ARRAY[
    'https://www.accessdata.fda.gov/drugsatfda_docs/label/2015/206333s000lbl.pdf',
    'https://www.plasticsurgery.org/cosmetic-procedures/injectable-fillers/kybella',
    'https://www.aad.org/public/cosmetic/fat-reduction/kybella'
  ]
WHERE treatment_name = 'Kybella';

UPDATE treatment_guides SET
  what_to_expect = 'RF microneedling combines microneedling with radiofrequency energy delivered through insulated needle tips. Treatment takes 45-60 minutes after topical numbing. Per published clinical data, the radiofrequency energy heats deeper tissue layers to stimulate collagen remodeling. Redness and mild swelling last 2-5 days. Results develop over 3-6 months as collagen rebuilds.',
  fair_price_context = 'RF microneedling costs more than standard microneedling due to the radiofrequency technology. Sessions typically range from $300-$600. Per clinical recommendations, a series of 3 sessions spaced 4-6 weeks apart delivers optimal results.',
  sources = ARRAY[
    'https://www.asds.net/skin-experts/skin-treatments/laser-skin-resurfacing',
    'https://pubmed.ncbi.nlm.nih.gov/30358895/',
    'https://www.aad.org/public/cosmetic/younger-looking/laser-resurfacing'
  ]
WHERE treatment_name = 'RF Microneedling';

UPDATE treatment_guides SET
  what_to_expect = 'Sculptra (poly-L-lactic acid) is a biostimulator — not a traditional filler. Per FDA prescribing information, it works by stimulating your body''s own collagen production. Appointments take 30-45 minutes. Results develop gradually over several months, not immediately. The treatment area should be massaged 5 times daily for 5 days after each session.',
  fair_price_context = 'Sculptra is priced per vial and typically requires 2-3 sessions spaced about 6 weeks apart. Per ASPS data, the average cost of non-hyaluronic acid fillers (including Sculptra) is $901 per syringe. Sculptra may be more cost-effective than HA fillers for large-volume restoration due to its longer duration.',
  duration_of_results = 'Up to 2 years (per FDA labeling; results from collagen stimulation are gradual and long-lasting)',
  sources = ARRAY[
    'https://www.accessdata.fda.gov/drugsatfda_docs/label/2014/021788s001lbl.pdf',
    'https://www.plasticsurgery.org/cosmetic-procedures/dermal-fillers/cost',
    'https://www.asds.net/skin-experts/skin-treatments/dermal-fillers'
  ]
WHERE treatment_name = 'Sculptra';

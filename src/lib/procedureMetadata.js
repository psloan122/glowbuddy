/**
 * Static education metadata for every procedure type.
 *
 * Keys match the canonical `procedure_type` strings in PROCEDURE_TYPES
 * (src/lib/constants.js). Each entry provides user-facing education
 * content displayed in the ProcedureDetailModal.
 *
 * Fields:
 *   name        – clean display name (may differ from the DB key)
 *   category    – parent PROCEDURE_CATEGORIES key
 *   description – 1-2 sentence plain-language overview
 *   howItWorks  – short paragraph on what actually happens
 *   painLevel   – 1-5 scale (1 = painless, 5 = significant discomfort)
 *   painNote    – brief qualifier for the pain rating
 *   recovery    – expected downtime / aftercare summary
 *   duration    – typical session length (e.g. "15-30 min")
 *   results     – when results are visible + how long they last
 *   warnings    – array of key considerations / contraindications
 *   idealFor    – array of short descriptors (e.g. "fine lines", "volume loss")
 *   tags        – searchable keywords for type-ahead matching
 */

const PROCEDURE_METADATA = {
  // ── Neurotoxins ───────────────────────────────────────────────────────
  'Botox / Dysport / Xeomin': {
    name: 'Botox / Dysport / Xeomin',
    category: 'Neurotoxins',
    description:
      'Injectable neurotoxins that temporarily relax facial muscles to smooth wrinkles and prevent new lines from forming.',
    howItWorks:
      'A small amount of botulinum toxin is injected into targeted muscles using a fine needle. The toxin blocks nerve signals, causing the muscle to relax and the overlying skin to smooth out.',
    painLevel: 2,
    painNote: 'Quick pinch; most people tolerate it without numbing',
    recovery: 'No downtime. Mild redness or swelling at injection sites resolves within hours. Avoid rubbing the area for 24 hours.',
    duration: '10-20 min',
    results: 'Visible in 3-7 days, full effect by 2 weeks. Lasts 3-4 months on average.',
    warnings: [
      'Not recommended during pregnancy or breastfeeding',
      'Avoid blood thinners and alcohol 24 hours before treatment',
      'Temporary bruising at injection sites is common',
      'Results are not permanent — maintenance treatments needed every 3-4 months',
    ],
    idealFor: ['Forehead lines', "Crow's feet", 'Frown lines (11s)', 'Preventative anti-aging'],
    tags: ['botox', 'dysport', 'xeomin', 'neurotoxin', 'wrinkles', 'anti-aging', 'injectable'],
  },

  Jeuveau: {
    name: 'Jeuveau',
    category: 'Neurotoxins',
    description:
      'A modern neurotoxin (prabotulinumtoxinA) specifically FDA-approved for frown lines. Often marketed as "Newtox."',
    howItWorks:
      'Works the same way as Botox — blocks nerve signals to relax muscles — but uses a proprietary purification process. Injected into the glabellar (frown line) area.',
    painLevel: 2,
    painNote: 'Comparable to Botox; brief pinch sensation',
    recovery: 'No downtime. Mild redness resolves quickly.',
    duration: '10-15 min',
    results: 'Onset in 2-3 days, full results by day 7. Lasts 3-4 months.',
    warnings: [
      'FDA-approved only for glabellar lines (between eyebrows)',
      'Same contraindications as other neurotoxins',
      'Not interchangeable unit-for-unit with Botox',
    ],
    idealFor: ['Frown lines (11s)', 'Glabellar area'],
    tags: ['jeuveau', 'newtox', 'neurotoxin', 'frown lines'],
  },

  Daxxify: {
    name: 'Daxxify',
    category: 'Neurotoxins',
    description:
      'The first long-lasting neurotoxin (daxibotulinumtoxinA). FDA-approved for frown lines with results that can last 6-9 months.',
    howItWorks:
      'Uses a novel peptide stabilizer instead of human or animal proteins, potentially allowing it to bind longer at the neuromuscular junction.',
    painLevel: 2,
    painNote: 'Similar to standard neurotoxin injections',
    recovery: 'No downtime. Standard post-injection precautions apply.',
    duration: '10-20 min',
    results: 'Onset in 1-2 days (faster than Botox). Results last 6-9 months for many patients.',
    warnings: [
      'Higher per-session cost offset by longer duration',
      'Newer product — long-term data still being collected',
      'Same general contraindications as other neurotoxins',
    ],
    idealFor: ['Frown lines', 'Patients wanting longer-lasting results', 'Fewer maintenance visits'],
    tags: ['daxxify', 'neurotoxin', 'long-lasting', 'frown lines'],
  },

  'Botox Lip Flip': {
    name: 'Botox Lip Flip',
    category: 'Neurotoxins',
    description:
      'A small amount of Botox injected into the upper lip border to relax the muscle and create a subtle "flip" that shows more of the upper lip.',
    howItWorks:
      'Tiny doses (4-8 units) are injected into the orbicularis oris muscle along the upper lip. As the muscle relaxes, the lip rolls slightly outward, creating the appearance of a fuller upper lip.',
    painLevel: 2,
    painNote: 'Quick; the lip area is sensitive but treatment is fast',
    recovery: 'No downtime. Avoid kissing or using straws for a few hours.',
    duration: '5-10 min',
    results: 'Visible in 3-5 days. Lasts 2-3 months (shorter than standard Botox areas).',
    warnings: [
      'Subtle enhancement — not a replacement for lip filler',
      'May temporarily affect ability to drink from a straw',
      'Not ideal for patients wanting significant volume increase',
    ],
    idealFor: ['Subtle lip enhancement', 'Gummy smile correction', 'Natural-looking results'],
    tags: ['lip flip', 'botox', 'lips', 'subtle enhancement'],
  },

  // ── Fillers ───────────────────────────────────────────────────────────
  'Lip Filler': {
    name: 'Lip Filler',
    category: 'Fillers',
    description:
      'Hyaluronic acid (HA) gel injected into the lips to add volume, define shape, and smooth lip lines.',
    howItWorks:
      'A hyaluronic acid filler (like Juvederm or Restylane) is injected using a fine needle or cannula. The gel integrates with tissue to add volume and hydration from within.',
    painLevel: 3,
    painNote: 'Moderate — numbing cream or dental block used; lips are sensitive',
    recovery: 'Swelling peaks at 24-48 hours, resolves in 3-5 days. Bruising possible. Final results visible at 2 weeks.',
    duration: '15-30 min',
    results: 'Immediate volume, final shape at 2 weeks. Lasts 6-12 months.',
    warnings: [
      'Significant swelling is normal for the first 2-3 days',
      'Avoid strenuous exercise for 24 hours',
      'Can be dissolved with hyaluronidase if needed',
      'Risk of vascular occlusion — choose an experienced injector',
    ],
    idealFor: ['Lip volume', 'Lip symmetry', 'Lip lines', 'Cupid\'s bow definition'],
    tags: ['lip filler', 'lips', 'juvederm', 'restylane', 'hyaluronic acid', 'volume'],
  },

  'Cheek Filler': {
    name: 'Cheek Filler',
    category: 'Fillers',
    description:
      'Dermal filler injected into the mid-face to restore cheek volume, lift sagging skin, and improve facial contour.',
    howItWorks:
      'A thicker HA filler (like Juvederm Voluma or Restylane Lyft) is injected deep into the cheek area using a needle or cannula, restoring the youthful "apple" of the cheek.',
    painLevel: 2,
    painNote: 'Less painful than lips; most fillers contain lidocaine',
    recovery: 'Mild swelling for 1-3 days. Bruising possible but less common than lip filler.',
    duration: '20-30 min',
    results: 'Immediate lift, settling over 2 weeks. Lasts 12-24 months depending on product.',
    warnings: [
      'May cause temporary asymmetry during swelling phase',
      'Deep injection technique important — choose experienced injector',
      'Reversible with hyaluronidase',
    ],
    idealFor: ['Volume loss', 'Mid-face lift', 'Under-eye support', 'Facial contouring'],
    tags: ['cheek filler', 'voluma', 'restylane lyft', 'mid-face', 'volume', 'contouring'],
  },

  'Jawline Filler': {
    name: 'Jawline Filler',
    category: 'Fillers',
    description:
      'Dermal filler injected along the jawline to create definition, improve symmetry, and add structure.',
    howItWorks:
      'A firm HA filler (like Juvederm Volux or Restylane Defyne) is injected along the mandible to sharpen the jawline and reduce jowling.',
    painLevel: 2,
    painNote: 'Mild discomfort; the jaw area has less nerve sensitivity than lips',
    recovery: 'Mild swelling and tenderness for 2-3 days. Minimal bruising.',
    duration: '20-40 min',
    results: 'Immediate definition. Lasts 12-18 months.',
    warnings: [
      'Multiple syringes may be needed for dramatic results',
      'Not a substitute for surgical jaw contouring',
      'Can feel firm for the first 1-2 weeks',
    ],
    idealFor: ['Jawline definition', 'Jowl reduction', 'Facial symmetry', 'Non-surgical contouring'],
    tags: ['jawline filler', 'jaw contouring', 'volux', 'defyne', 'definition'],
  },

  'Nasolabial Filler': {
    name: 'Nasolabial Fold Filler',
    category: 'Fillers',
    description:
      'Filler injected into the nasolabial folds (smile lines) to soften the creases running from nose to mouth.',
    howItWorks:
      'A mid-weight HA filler is injected directly into or alongside the fold to plump the area and reduce the depth of the crease.',
    painLevel: 2,
    painNote: 'Mild; most fillers contain built-in lidocaine',
    recovery: 'Mild swelling for 1-2 days. Resume normal activities immediately.',
    duration: '15-20 min',
    results: 'Immediate softening. Lasts 9-12 months.',
    warnings: [
      'Overfilling can look unnatural — conservative approach is best',
      'Addressing mid-face volume loss (cheeks) often reduces folds more naturally',
    ],
    idealFor: ['Smile lines', 'Nasolabial folds', 'Parentheses lines'],
    tags: ['nasolabial filler', 'smile lines', 'parentheses lines', 'folds'],
  },

  'Under Eye Filler': {
    name: 'Under Eye Filler',
    category: 'Fillers',
    description:
      'A thin, smooth filler injected beneath the eyes to reduce dark hollows and tired appearance.',
    howItWorks:
      'A lightweight HA filler (like Restylane or Belotero) is carefully injected into the tear trough using a cannula or needle to fill the hollow and reduce shadowing.',
    painLevel: 2,
    painNote: 'Numbing cream applied; most feel only pressure',
    recovery: 'Swelling and bruising common for 5-7 days. Sleep elevated the first night.',
    duration: '15-30 min',
    results: 'Visible immediately, final result at 2 weeks. Lasts 9-18 months.',
    warnings: [
      'High-skill area — choose an injector experienced with tear troughs',
      'Tyndall effect (bluish discoloration) possible if injected too superficially',
      'Not suitable for all under-eye concerns — puffiness may worsen',
      'Bruising is more common here than other facial areas',
    ],
    idealFor: ['Under-eye hollows', 'Dark circles (from volume loss)', 'Tired appearance'],
    tags: ['under eye filler', 'tear trough', 'dark circles', 'hollows'],
  },

  'Chin Filler': {
    name: 'Chin Filler',
    category: 'Fillers',
    description:
      'Dermal filler injected into the chin to add projection, improve profile balance, and enhance jawline definition.',
    howItWorks:
      'A firm HA filler is injected into the chin area to lengthen, project, or reshape the chin without surgery.',
    painLevel: 2,
    painNote: 'Minimal discomfort due to low nerve density in the area',
    recovery: 'Mild swelling for 2-3 days. Tenderness when touching the chin.',
    duration: '15-20 min',
    results: 'Immediate projection. Lasts 12-18 months.',
    warnings: [
      'May need to be combined with jawline filler for full facial balancing',
      'Can feel firm for the first week',
    ],
    idealFor: ['Weak chin', 'Profile balancing', 'Facial harmony'],
    tags: ['chin filler', 'chin augmentation', 'profile', 'projection'],
  },

  'Nose Filler': {
    name: 'Non-Surgical Nose Job (Nose Filler)',
    category: 'Fillers',
    description:
      'Filler injected into the nose to smooth bumps, lift the tip, or improve symmetry without surgery.',
    howItWorks:
      'Small amounts of HA filler are precisely injected along the bridge or tip of the nose to camouflage bumps, straighten the profile, or refine the tip.',
    painLevel: 3,
    painNote: 'Moderate — the nose is sensitive; numbing cream helps',
    recovery: 'Swelling resolves in 1-3 days. Bruising is uncommon.',
    duration: '15-20 min',
    results: 'Immediate improvement. Lasts 12-18 months.',
    warnings: [
      'High-risk vascular area — choose a highly experienced injector',
      'Cannot reduce nose size — only camouflage and refine shape',
      'Rare but serious risk of vascular compromise if injected incorrectly',
    ],
    idealFor: ['Dorsal bump', 'Crooked nose', 'Tip refinement', 'Non-surgical alternative'],
    tags: ['nose filler', 'non-surgical rhinoplasty', 'liquid nose job', 'nose reshaping'],
  },

  'Hand Filler': {
    name: 'Hand Rejuvenation (Filler)',
    category: 'Fillers',
    description:
      'Filler injected into the backs of the hands to restore lost volume and reduce the visibility of veins and tendons.',
    howItWorks:
      'An HA filler or Radiesse is injected into the back of each hand and massaged to distribute evenly, plumping the skin and concealing underlying structures.',
    painLevel: 3,
    painNote: 'Moderate — hands have many nerve endings; numbing is recommended',
    recovery: 'Swelling and bruising for 3-5 days. Hands may feel stiff initially.',
    duration: '20-30 min',
    results: 'Immediate volume. Lasts 6-12 months (HA) or 12-18 months (Radiesse).',
    warnings: [
      'Avoid gripping heavy objects for 24 hours',
      'Bruising is common due to the vascular nature of the area',
    ],
    idealFor: ['Aging hands', 'Visible veins and tendons', 'Crepey skin on hands'],
    tags: ['hand filler', 'hand rejuvenation', 'radiesse', 'volume loss'],
  },

  'Temple Filler': {
    name: 'Temple Filler',
    category: 'Fillers',
    description:
      'Dermal filler injected into the temples to restore volume lost with aging, creating a smoother, more youthful upper face.',
    howItWorks:
      'Filler is injected deep into the temporal fossa to replace lost fat pad volume, lifting the lateral brow and reducing the hollowed appearance.',
    painLevel: 2,
    painNote: 'Mild; the temple area is less sensitive than lips or nose',
    recovery: 'Mild swelling for 1-2 days. Bruising uncommon.',
    duration: '15-20 min',
    results: 'Immediate volume restoration. Lasts 12-24 months.',
    warnings: [
      'Deep injection technique required — important vascular structures nearby',
      'Often combined with cheek and under-eye filler for full-face rejuvenation',
    ],
    idealFor: ['Temple hollowing', 'Lateral brow lift', 'Full-face rejuvenation'],
    tags: ['temple filler', 'temple hollowing', 'upper face volume'],
  },

  // ── Body ──────────────────────────────────────────────────────────────
  Kybella: {
    name: 'Kybella',
    category: 'Body',
    description:
      'An injectable treatment using synthetic deoxycholic acid to destroy fat cells under the chin (submental fat).',
    howItWorks:
      'Multiple small injections of deoxycholic acid are administered under the chin. The acid destroys fat cell membranes, and the body naturally metabolizes the released fat over the following weeks.',
    painLevel: 4,
    painNote: 'Significant burning and stinging during injection; numbing helps',
    recovery: 'Substantial swelling ("bull frog" look) for 3-7 days. Numbness and firmness for 2-4 weeks. Most people need 2-4 sessions spaced 4-6 weeks apart.',
    duration: '20-30 min',
    results: 'Gradual fat reduction over 4-6 weeks per session. Results are permanent once fat cells are destroyed.',
    warnings: [
      'Swelling is intense — plan for 5-7 days of social downtime',
      'Multiple sessions usually required (2-4 treatments)',
      'Not suitable for significant skin laxity (skin may not retract)',
      'Temporary numbness and hardness in treatment area is normal',
    ],
    idealFor: ['Double chin', 'Submental fat', 'Non-surgical fat reduction'],
    tags: ['kybella', 'double chin', 'chin fat', 'deoxycholic acid'],
  },

  CoolSculpting: {
    name: 'CoolSculpting',
    category: 'Body',
    description:
      'A non-invasive fat-freezing procedure (cryolipolysis) that permanently destroys fat cells in targeted areas.',
    howItWorks:
      'A suction applicator is placed on the treatment area and cools it to a precise temperature that kills fat cells without damaging skin. Dead fat cells are naturally eliminated over 1-3 months.',
    painLevel: 2,
    painNote: 'Cold and tugging sensation; first 10 minutes are the most uncomfortable',
    recovery: 'No downtime. Temporary redness, swelling, and tenderness. Some patients experience a cramping or tingling sensation for up to 2 weeks.',
    duration: '35-60 min per area',
    results: 'Gradual over 1-3 months. 20-25% fat reduction per session. Results are permanent.',
    warnings: [
      'Not a weight loss solution — best for stubborn pockets of fat',
      'Rare risk of paradoxical adipose hyperplasia (fat area grows instead of shrinks)',
      'Results take time — don\'t expect immediate changes',
      'Multiple sessions may be needed for optimal results',
    ],
    idealFor: ['Stubborn belly fat', 'Love handles', 'Thigh fat', 'Back fat', 'Non-surgical body contouring'],
    tags: ['coolsculpting', 'fat freezing', 'cryolipolysis', 'body contouring'],
  },

  'Emsculpt NEO': {
    name: 'Emsculpt NEO',
    category: 'Body',
    description:
      'A non-invasive body contouring device that simultaneously burns fat and builds muscle using radiofrequency and HIFEM technology.',
    howItWorks:
      'The device delivers radiofrequency (RF) to heat and destroy fat cells while high-intensity focused electromagnetic energy (HIFEM) triggers supramaximal muscle contractions — equivalent to 20,000 crunches in 30 minutes.',
    painLevel: 2,
    painNote: 'Intense muscle contractions but not painful; feels like an intense workout',
    recovery: 'No downtime. Mild muscle soreness similar to a hard workout for 1-2 days.',
    duration: '30 min per area',
    results: 'Studies show 25% more muscle and 30% less fat after a series of 4 sessions. Results improve over 2-3 months.',
    warnings: [
      'Requires a series of treatments (typically 4) for best results',
      'Not suitable for people with metal implants, pacemakers, or during pregnancy',
      'Results require maintenance with exercise and healthy lifestyle',
    ],
    idealFor: ['Abdomen toning', 'Buttock lifting', 'Muscle building', 'Fat reduction'],
    tags: ['emsculpt', 'emsculpt neo', 'muscle building', 'body contouring', 'hifem'],
  },

  truSculpt: {
    name: 'truSculpt',
    category: 'Body',
    description:
      'A non-invasive fat reduction treatment using radiofrequency (RF) energy to heat and destroy fat cells.',
    howItWorks:
      'Multiple handpieces deliver monopolar RF energy deep into the fat layer, heating fat cells to the point of apoptosis (cell death). The body naturally eliminates the destroyed cells.',
    painLevel: 2,
    painNote: 'Warm, deep heating sensation; generally comfortable',
    recovery: 'No downtime. Mild tenderness in treated area for a few days.',
    duration: '15-60 min depending on area',
    results: 'Up to 24% fat reduction in the treated area. Results visible at 6-12 weeks.',
    warnings: [
      'Not a substitute for weight loss',
      'Multiple treatment areas can be done in one session',
    ],
    idealFor: ['Stubborn fat', 'Multiple body areas', 'Non-surgical contouring'],
    tags: ['trusculpt', 'rf fat reduction', 'body contouring', 'radiofrequency'],
  },

  SculpSure: {
    name: 'SculpSure',
    category: 'Body',
    description:
      'A non-invasive laser fat reduction system that uses diode laser energy to destroy fat cells.',
    howItWorks:
      'Flat applicator frames are placed on the skin. The laser heats fat cells to 42-47°C, damaging their structural integrity. Destroyed cells are naturally eliminated over 6-12 weeks.',
    painLevel: 2,
    painNote: 'Alternating warm and cool sensations; generally tolerable',
    recovery: 'No downtime. Mild soreness or tenderness for a few days.',
    duration: '25 min per treatment',
    results: 'Up to 24% fat reduction per session. Results visible at 6-12 weeks.',
    warnings: [
      'Best for patients close to their ideal weight',
      'Multiple areas can be treated simultaneously',
    ],
    idealFor: ['Belly fat', 'Love handles', 'Thighs', 'Back fat'],
    tags: ['sculpsure', 'laser fat reduction', 'body contouring', 'diode laser'],
  },

  BodyTite: {
    name: 'BodyTite',
    category: 'Body',
    description:
      'A minimally invasive RF-assisted lipolysis device that melts fat and tightens skin simultaneously through internal and external electrodes.',
    howItWorks:
      'A thin cannula is inserted under the skin delivering RF energy internally while an external electrode provides surface heating. This dual approach melts fat, triggers collagen contraction, and tightens skin.',
    painLevel: 3,
    painNote: 'Performed under local anesthesia; post-procedure soreness expected',
    recovery: '3-7 days of downtime. Compression garment worn for 2-4 weeks. Bruising and swelling typical.',
    duration: '1-3 hours depending on areas treated',
    results: 'Immediate skin tightening with continued improvement over 3-6 months. Long-lasting results.',
    warnings: [
      'Minimally invasive — involves small incisions',
      'More effective than non-invasive options but requires more recovery',
      'Compression garment is essential for optimal results',
    ],
    idealFor: ['Skin laxity + fat reduction', 'Arms', 'Abdomen', 'Thighs', 'Post-weight-loss contouring'],
    tags: ['bodytite', 'rf lipolysis', 'skin tightening', 'minimally invasive'],
  },

  Velashape: {
    name: 'VelaShape',
    category: 'Body',
    description:
      'A non-invasive body contouring treatment combining infrared light, RF energy, vacuum suction, and mechanical massage to reduce cellulite and contour the body.',
    howItWorks:
      'The device head applies IR and RF energy while suctioning and massaging the tissue. This combination heats fat cells, stimulates collagen production, and improves lymphatic drainage.',
    painLevel: 1,
    painNote: 'Feels like a warm deep-tissue massage',
    recovery: 'No downtime. Mild redness resolves within an hour.',
    duration: '30-40 min per area',
    results: 'Gradual smoothing over 3-6 sessions. Results improve with each treatment.',
    warnings: [
      'Multiple sessions required (typically 3-6)',
      'Best results when combined with healthy lifestyle',
      'Temporary results — maintenance sessions recommended',
    ],
    idealFor: ['Cellulite reduction', 'Body contouring', 'Skin smoothing'],
    tags: ['velashape', 'cellulite', 'body contouring', 'skin smoothing'],
  },

  'Cellulite Treatment': {
    name: 'Cellulite Treatment',
    category: 'Body',
    description:
      'Various non-invasive and minimally invasive treatments targeting the structural causes of cellulite.',
    howItWorks:
      'Methods vary — some release the fibrous bands pulling skin down (subcision), others use RF or laser energy to smooth the fat layer and tighten skin. Common devices include QWO, Cellfina, and Aveli.',
    painLevel: 2,
    painNote: 'Varies by treatment type; most are well-tolerated',
    recovery: 'Depends on method. Non-invasive: no downtime. Subcision-based: bruising for 1-3 weeks.',
    duration: '30-60 min',
    results: 'Noticeable smoothing after 1-3 sessions. Some treatments (Cellfina, Aveli) can produce lasting results from a single session.',
    warnings: [
      'Results vary significantly by treatment type',
      'Cellulite is structural — no treatment eliminates it permanently for all patients',
      'Set realistic expectations with your provider',
    ],
    idealFor: ['Thigh cellulite', 'Buttock dimpling', 'Skin texture improvement'],
    tags: ['cellulite', 'cellfina', 'aveli', 'skin smoothing', 'body treatment'],
  },

  // ── Microneedling ─────────────────────────────────────────────────────
  Microneedling: {
    name: 'Microneedling',
    category: 'Microneedling',
    description:
      'A skin rejuvenation treatment that uses fine needles to create controlled micro-injuries, stimulating the body\'s natural collagen production.',
    howItWorks:
      'A device with tiny needles (0.5-2.5mm) is moved across the skin, creating thousands of micro-channels. This triggers the wound-healing response, producing new collagen and elastin for smoother, firmer skin.',
    painLevel: 3,
    painNote: 'Numbing cream applied 30-45 min before; feels like sandpaper being moved across skin',
    recovery: 'Redness like a sunburn for 1-3 days. Skin may feel tight and dry. Avoid sun exposure and active skincare (retinols, acids) for 5-7 days.',
    duration: '30-45 min (plus numbing time)',
    results: 'Gradual improvement over 4-6 weeks as collagen rebuilds. Best results after a series of 3-6 sessions spaced 4-6 weeks apart.',
    warnings: [
      'Not suitable for active acne, eczema, or rosacea flares',
      'Avoid sun exposure for 1 week post-treatment',
      'Use only gentle, hydrating products for 3-5 days after',
      'Multiple sessions needed for significant results',
    ],
    idealFor: ['Fine lines', 'Acne scars', 'Pore size', 'Skin texture', 'Uneven tone'],
    tags: ['microneedling', 'collagen induction', 'skin rejuvenation', 'acne scars'],
  },

  'RF Microneedling': {
    name: 'RF Microneedling',
    category: 'Microneedling',
    description:
      'Combines traditional microneedling with radiofrequency energy delivered through the needle tips for enhanced collagen remodeling and skin tightening.',
    howItWorks:
      'Insulated needles penetrate the skin and deliver RF energy at precise depths. The combination of mechanical micro-injury and thermal energy produces more dramatic collagen stimulation than standard microneedling.',
    painLevel: 3,
    painNote: 'Numbing cream used; deeper treatment than standard microneedling',
    recovery: 'Redness and swelling for 2-4 days. Mild peeling possible. Avoid sun and active ingredients for 5-7 days.',
    duration: '30-60 min (plus numbing)',
    results: 'Noticeable tightening and texture improvement after 1 session. Optimal results after 3 sessions spaced 4-6 weeks apart.',
    warnings: [
      'More expensive than standard microneedling',
      'Not suitable for patients with metal implants in treatment area',
      'Longer recovery than standard microneedling',
    ],
    idealFor: ['Skin tightening', 'Acne scars', 'Wrinkles', 'Enlarged pores', 'Stretch marks'],
    tags: ['rf microneedling', 'radiofrequency microneedling', 'skin tightening', 'acne scars'],
  },

  Morpheus8: {
    name: 'Morpheus8',
    category: 'Microneedling',
    description:
      'A fractional RF microneedling device that penetrates deeper than standard RF microneedling (up to 4mm) to remodel fat and tighten skin.',
    howItWorks:
      'Gold-coated needles penetrate up to 4mm deep and deliver bipolar RF energy. The deep penetration targets not just the dermis but also the subdermal fat layer, allowing contouring effects alongside skin tightening.',
    painLevel: 3,
    painNote: 'Numbing cream essential; deeper treatment but tolerable',
    recovery: 'Redness and swelling for 3-5 days. Pin-point bleeding/scabbing resolves in a week. Skin may look bronzed temporarily.',
    duration: '30-60 min (plus numbing)',
    results: 'Progressive improvement over 3-6 months. 1-3 sessions recommended depending on concerns.',
    warnings: [
      'More aggressive than standard RF microneedling',
      'Sun protection critical for 2 weeks post-treatment',
      'Results continue improving for months after treatment',
      'Higher price point reflects deeper treatment capability',
    ],
    idealFor: ['Deep wrinkles', 'Jowls', 'Acne scars', 'Body skin tightening', 'Subdermal fat remodeling'],
    tags: ['morpheus8', 'deep rf microneedling', 'skin tightening', 'contouring'],
  },

  'PRP Microneedling': {
    name: 'PRP Microneedling',
    category: 'Microneedling',
    description:
      'Microneedling combined with platelet-rich plasma (PRP) drawn from your own blood, applied to boost healing and collagen production.',
    howItWorks:
      'Blood is drawn and spun in a centrifuge to isolate the platelet-rich plasma. This PRP is applied to the skin during or immediately after microneedling, allowing growth factors to penetrate through the micro-channels.',
    painLevel: 3,
    painNote: 'Blood draw plus microneedling; numbing cream used for the face',
    recovery: 'Redness for 2-3 days. PRP may leave a golden residue on skin for a few hours. Standard microneedling aftercare applies.',
    duration: '45-60 min (including blood draw and processing)',
    results: 'Enhanced results compared to microneedling alone. Improvement visible at 4-6 weeks, continuing for months.',
    warnings: [
      'Requires a blood draw — not suitable for blood-phobic patients',
      'Results may be incremental over standard microneedling',
      'PRP quality varies — ask about the centrifuge system used',
    ],
    idealFor: ['Acne scars', 'Anti-aging', 'Skin rejuvenation', 'Enhanced healing'],
    tags: ['prp microneedling', 'vampire facial', 'platelet-rich plasma', 'collagen'],
  },

  'Exosome Microneedling': {
    name: 'Exosome Microneedling',
    category: 'Microneedling',
    description:
      'Microneedling combined with exosome therapy — cell-derived vesicles containing growth factors that accelerate skin regeneration.',
    howItWorks:
      'After microneedling creates micro-channels, exosome serum (derived from stem cells) is applied. Exosomes deliver concentrated growth factors, cytokines, and RNA that signal cells to regenerate faster.',
    painLevel: 3,
    painNote: 'Same as standard microneedling with numbing',
    recovery: 'Similar to standard microneedling. Redness for 1-3 days. Some patients report faster healing with exosomes.',
    duration: '45-60 min',
    results: 'May see faster improvement than standard microneedling. Full results at 4-8 weeks.',
    warnings: [
      'Newer treatment — long-term data still emerging',
      'Higher cost than standard or PRP microneedling',
      'Quality of exosome products varies between providers',
      'FDA regulation of exosome products is evolving',
    ],
    idealFor: ['Accelerated skin rejuvenation', 'Anti-aging', 'Scar treatment', 'Enhanced healing'],
    tags: ['exosome microneedling', 'exosomes', 'stem cell', 'regenerative'],
  },

  // ── Skin ──────────────────────────────────────────────────────────────
  'Chemical Peel': {
    name: 'Chemical Peel',
    category: 'Skin',
    description:
      'A chemical solution applied to the skin that causes controlled exfoliation, revealing smoother, brighter skin underneath.',
    howItWorks:
      'An acid solution (glycolic, salicylic, TCA, or other) is applied to the face. It dissolves the bonds between dead skin cells, causing them to shed over the following days. Depth ranges from superficial (lunchtime peel) to deep.',
    painLevel: 2,
    painNote: 'Superficial peels: mild tingling. Medium peels: burning sensation for 5-10 min. Deep peels: significant — sedation may be used',
    recovery: 'Light peel: 1-3 days of flaking. Medium peel: 5-7 days of peeling and redness. Deep peel: 1-2 weeks of intense peeling and recovery.',
    duration: '15-30 min',
    results: 'Smoother, brighter skin as peeling completes. A series of light peels or a single medium peel can significantly improve texture and tone.',
    warnings: [
      'Sun protection essential — freshly peeled skin burns easily',
      'Deeper peels carry risk of hyperpigmentation, especially for darker skin tones',
      'Avoid retinoids for 5-7 days before and after',
      'Not suitable during active breakouts or on sensitized skin',
    ],
    idealFor: ['Uneven skin tone', 'Fine lines', 'Acne', 'Sun damage', 'Hyperpigmentation', 'Dull skin'],
    tags: ['chemical peel', 'glycolic', 'salicylic', 'tca peel', 'vi peel', 'exfoliation'],
  },

  HydraFacial: {
    name: 'HydraFacial',
    category: 'Skin',
    description:
      'A patented multi-step facial that cleanses, exfoliates, extracts, and hydrates the skin using a vortex suction device.',
    howItWorks:
      'The HydraFacial device uses a spiral tip to create a vortex effect that simultaneously delivers serums and suctions away debris. Steps: cleanse + peel → extract + hydrate → fuse + protect with antioxidants.',
    painLevel: 1,
    painNote: 'Painless and relaxing; often called the "no downtime facial"',
    recovery: 'None. Skin is immediately glowing. Safe to apply makeup right after.',
    duration: '30-45 min',
    results: 'Immediately brighter, hydrated skin. Effects last 5-7 days. Monthly sessions recommended for sustained results.',
    warnings: [
      'Results are temporary — more of a maintenance treatment',
      'Premium add-on serums (boosters) significantly increase cost',
      'Less effective for deep wrinkles or severe acne scarring',
    ],
    idealFor: ['Dehydrated skin', 'Congested pores', 'Dull skin', 'Pre-event glow', 'Sensitive skin'],
    tags: ['hydrafacial', 'facial', 'hydration', 'glow', 'no downtime'],
  },

  Dermaplaning: {
    name: 'Dermaplaning',
    category: 'Skin',
    description:
      'A manual exfoliation technique using a sterile surgical scalpel to gently scrape away dead skin cells and fine vellus hair (peach fuzz).',
    howItWorks:
      'A trained aesthetician holds a #10 surgical blade at a 45-degree angle and makes short, feathering strokes across the skin, removing the top layer of dead cells and fine hair.',
    painLevel: 1,
    painNote: 'Painless — feels like a light scraping sensation',
    recovery: 'None. Skin is immediately smooth and bright. Apply SPF.',
    duration: '20-30 min',
    results: 'Immediately smoother skin and better product absorption. Effects last 3-4 weeks until hair and dead skin regrow.',
    warnings: [
      'Not recommended for active acne (can spread bacteria)',
      'Hair grows back the same — it does NOT grow back thicker',
      'Sun protection important for freshly exfoliated skin',
    ],
    idealFor: ['Peach fuzz removal', 'Smooth makeup application', 'Dull skin', 'Product absorption'],
    tags: ['dermaplaning', 'exfoliation', 'peach fuzz', 'smooth skin'],
  },

  'LED Therapy': {
    name: 'LED Light Therapy',
    category: 'Skin',
    description:
      'Non-invasive treatment using specific wavelengths of light to target skin concerns — red light for anti-aging, blue light for acne.',
    howItWorks:
      'LED panels emit wavelengths that penetrate the skin at different depths. Red light (630-660nm) stimulates collagen and reduces inflammation. Blue light (405-420nm) kills acne-causing bacteria. Near-infrared promotes deep tissue healing.',
    painLevel: 1,
    painNote: 'Completely painless — you lie under the light with goggles on',
    recovery: 'None. No redness, sensitivity, or downtime.',
    duration: '15-30 min',
    results: 'Cumulative effect over multiple sessions. Mild improvement after 4-6 weekly treatments.',
    warnings: [
      'Subtle results — not a standalone solution for significant concerns',
      'Best as an add-on to other treatments',
      'Some medications (like isotretinoin) may make skin photosensitive',
    ],
    idealFor: ['Anti-aging support', 'Acne (blue light)', 'Inflammation', 'Post-procedure healing'],
    tags: ['led therapy', 'light therapy', 'red light', 'blue light', 'phototherapy'],
  },

  'Oxygen Facial': {
    name: 'Oxygen Facial',
    category: 'Skin',
    description:
      'A facial treatment that sprays highly concentrated oxygen molecules with serums directly onto the skin for hydration and a temporary plumping effect.',
    howItWorks:
      'An airbrush-like device delivers pressurized oxygen infused with vitamins, minerals, and hyaluronic acid directly into the epidermis, providing instant hydration and a plumped appearance.',
    painLevel: 1,
    painNote: 'Completely painless — cool, refreshing mist on the skin',
    recovery: 'None. Skin is immediately dewy and plump.',
    duration: '30-45 min',
    results: 'Immediate glow and hydration that lasts a few days. No long-term structural changes.',
    warnings: [
      'Results are very temporary — primarily a cosmetic/event prep treatment',
      'Limited scientific evidence for long-term benefits',
    ],
    idealFor: ['Pre-event prep', 'Dehydrated skin', 'Dull skin', 'Sensitive skin that can\'t tolerate acids'],
    tags: ['oxygen facial', 'hydration', 'glow', 'event prep'],
  },

  Microdermabrasion: {
    name: 'Microdermabrasion',
    category: 'Skin',
    description:
      'A non-invasive exfoliation treatment that uses fine crystals or a diamond-tipped wand to buff away the outer layer of dead skin.',
    howItWorks:
      'A device sprays fine aluminum oxide crystals (or uses a diamond tip) across the skin while simultaneously vacuuming them away along with dead skin cells, stimulating cell turnover.',
    painLevel: 1,
    painNote: 'Mild scratchy sensation; generally comfortable',
    recovery: 'Minimal. Slight pinkness for a few hours. Skin may feel tight.',
    duration: '30-45 min',
    results: 'Immediately smoother skin. Best results from a series of 6-10 sessions every 2-4 weeks.',
    warnings: [
      'Very gentle — may not address deep scarring or wrinkles',
      'Avoid on sunburned, irritated, or rosacea-prone skin',
      'Less effective than chemical peels or microneedling for significant concerns',
    ],
    idealFor: ['Mild sun damage', 'Light acne scars', 'Clogged pores', 'Dull skin'],
    tags: ['microdermabrasion', 'exfoliation', 'crystal peel', 'skin resurfacing'],
  },

  'Vampire Facial': {
    name: 'Vampire Facial (PRP Facial)',
    category: 'Skin',
    description:
      'A combination of microneedling with PRP applied topically, popularized as the "Vampire Facial." Blood is drawn, PRP is isolated, and applied to the face during microneedling.',
    howItWorks:
      'Same as PRP Microneedling — blood is drawn, centrifuged to extract PRP, then applied during or after microneedling. The PRP growth factors penetrate through micro-channels to boost collagen production.',
    painLevel: 3,
    painNote: 'Numbing cream used; blood draw required',
    recovery: 'Face is red and may be covered in PRP residue for 12-24 hours. Redness subsides in 2-3 days. Standard microneedling aftercare.',
    duration: '60-90 min (including blood draw and processing)',
    results: 'Improved texture, tone, and firmness over 4-8 weeks. Series of 3 treatments recommended.',
    warnings: [
      'Your face will look bloody/red immediately after — plan accordingly',
      'Ensure the clinic follows proper blood handling protocols',
      'PRP must be your own blood — reject any "pooled" or non-autologous PRP',
    ],
    idealFor: ['Skin rejuvenation', 'Fine lines', 'Acne scars', 'Overall skin quality'],
    tags: ['vampire facial', 'prp facial', 'prp microneedling', 'rejuvenation'],
  },

  // ── Laser ─────────────────────────────────────────────────────────────
  'Laser Hair Removal': {
    name: 'Laser Hair Removal',
    category: 'Laser',
    description:
      'Uses concentrated light to target and destroy hair follicles, resulting in permanent hair reduction over a series of treatments.',
    howItWorks:
      'A laser emits wavelengths absorbed by melanin in the hair follicle. The light converts to heat, damaging the follicle and inhibiting future growth. Only works on hair in the active growth phase, which is why multiple sessions are needed.',
    painLevel: 3,
    painNote: 'Feels like a rubber band snapping; varies by area (underarms more sensitive than legs)',
    recovery: 'Mild redness for a few hours. Avoid sun exposure and heat (hot tubs, saunas) for 24-48 hours.',
    duration: '15-60 min depending on area size',
    results: '70-90% permanent hair reduction after 6-8 sessions. Maintenance sessions 1-2x/year.',
    warnings: [
      'Best on light skin with dark hair (highest contrast)',
      'Newer lasers (Nd:YAG) can safely treat darker skin tones',
      'Avoid sun exposure and tanning before treatment',
      'Hair must be shaved (not waxed/plucked) before each session',
      'Hormonal hair growth may require ongoing maintenance',
    ],
    idealFor: ['Unwanted body hair', 'Bikini area', 'Underarms', 'Legs', 'Face (women)', 'Back (men)'],
    tags: ['laser hair removal', 'permanent hair reduction', 'ipl', 'nd:yag'],
  },

  'IPL / Photofacial': {
    name: 'IPL Photofacial',
    category: 'Laser',
    description:
      'Intense Pulsed Light (IPL) therapy targets sun damage, redness, brown spots, and broken capillaries using broad-spectrum light.',
    howItWorks:
      'A handheld device flashes intense pulsed light onto the skin. Different wavelengths target melanin (brown spots) and hemoglobin (redness/broken vessels), causing them to break down and be absorbed by the body.',
    painLevel: 2,
    painNote: 'Feels like a warm rubber band snap; protective eyewear required',
    recovery: 'Brown spots darken and flake off over 5-10 days. Redness may temporarily increase before improving. Avoid sun.',
    duration: '20-30 min',
    results: 'Spots darken within days and shed within 1-2 weeks. Best results after 3-5 sessions.',
    warnings: [
      'NOT safe for dark skin tones — high risk of burns and hyperpigmentation',
      'Must avoid sun exposure before and after treatment',
      'Brown spots will temporarily look worse before they improve',
      'Not a true laser — uses broad-spectrum light',
    ],
    idealFor: ['Sun spots', 'Age spots', 'Redness/rosacea', 'Broken capillaries', 'Uneven skin tone'],
    tags: ['ipl', 'photofacial', 'sun damage', 'brown spots', 'redness', 'bbl'],
  },

  'Fractional CO2 Laser': {
    name: 'Fractional CO2 Laser',
    category: 'Laser',
    description:
      'An ablative laser resurfacing treatment that creates microscopic columns of thermal damage to trigger dramatic collagen remodeling. The gold standard for significant skin rejuvenation.',
    howItWorks:
      'The CO2 laser vaporizes tiny columns of skin tissue in a grid pattern (fractional), leaving surrounding tissue intact for faster healing. This triggers a powerful wound-healing response that rebuilds collagen from the inside out.',
    painLevel: 4,
    painNote: 'Topical numbing + nerve blocks typically used; significant heat sensation',
    recovery: '7-14 days of significant downtime. Skin is red, raw, and oozing for the first 3-5 days. Redness can persist for weeks to months. Strict sun avoidance for 3+ months.',
    duration: '30-60 min',
    results: 'Dramatic improvement in wrinkles, scars, and skin quality. Single treatment can produce results equivalent to years of lighter treatments.',
    warnings: [
      'Significant downtime — plan for 7-14 days off work/social activities',
      'High risk of hyperpigmentation for darker skin tones',
      'Requires diligent post-care: ointments, gentle cleansing, strict sun protection',
      'Potential for infection if aftercare is not followed',
      'Most aggressive non-surgical skin treatment available',
    ],
    idealFor: ['Deep wrinkles', 'Severe acne scars', 'Sun damage', 'Skin texture overhaul'],
    tags: ['co2 laser', 'fractional co2', 'laser resurfacing', 'ablative laser', 'skin resurfacing'],
  },

  'Clear + Brilliant': {
    name: 'Clear + Brilliant',
    category: 'Laser',
    description:
      'A gentle fractional laser that creates millions of microscopic treatment zones to improve tone, texture, and pore size with minimal downtime.',
    howItWorks:
      'A non-ablative fractional laser creates micro-injury zones in the upper dermis, stimulating collagen turnover without the intensity of ablative lasers. Often called "baby Fraxel."',
    painLevel: 2,
    painNote: 'Numbing cream applied; feels prickly and warm',
    recovery: 'Rough, sandpaper-like skin for 3-5 days. Mild pinkness. Can wear makeup the next day.',
    duration: '15-20 min',
    results: 'Subtle glow and smoothing after skin sheds in 3-5 days. Best results from a series of 4-6 treatments.',
    warnings: [
      'Subtle results — not for deep wrinkles or significant scarring',
      'A "gateway" laser — great for laser beginners',
      'Requires a series for meaningful results',
    ],
    idealFor: ['Preventative anti-aging', 'Pore refinement', 'Mild sun damage', 'First-time laser patients'],
    tags: ['clear and brilliant', 'baby fraxel', 'fractional laser', 'gentle laser'],
  },

  'Halo Laser': {
    name: 'Halo Laser',
    category: 'Laser',
    description:
      'A hybrid fractional laser by Sciton that delivers both ablative and non-ablative wavelengths simultaneously for dramatic results with less downtime than fully ablative lasers.',
    howItWorks:
      'The Halo device delivers two wavelengths — 1470nm (non-ablative) and 2940nm (ablative) — through the same handpiece. This dual approach resurfaces the top layer while also heating the deeper dermis for collagen stimulation.',
    painLevel: 3,
    painNote: 'Numbing cream + cool air; moderate heat sensation; "hot sandpaper" feeling',
    recovery: '5-7 days of social downtime. Skin is bronzed/dark, rough, and peeling. Swelling for 1-2 days. Redness can persist for 1-2 weeks.',
    duration: '30-60 min',
    results: 'Significant improvement in tone, texture, and sun damage. Results continue improving for months. 1-2 treatments typically sufficient.',
    warnings: [
      'Not suitable for very dark skin tones',
      'The "Halo glow" comes after 5-7 days of looking worse',
      'Sun protection critical for months after treatment',
      'Skin will look bronzed/dirty as it heals — this is normal',
    ],
    idealFor: ['Sun damage', 'Fine lines', 'Enlarged pores', 'Uneven skin tone', 'Melasma (with caution)'],
    tags: ['halo laser', 'hybrid fractional', 'sciton', 'laser resurfacing'],
  },

  'Picosure / Picoway': {
    name: 'PicoSure / PicoWay',
    category: 'Laser',
    description:
      'Ultra-fast picosecond lasers that deliver energy in trillionths of a second, effective for tattoo removal, pigmentation, and skin revitalization.',
    howItWorks:
      'Picosecond lasers deliver energy pulses 100x shorter than traditional nanosecond lasers. This shatters pigment particles into tiny fragments that the body can absorb more efficiently, while also creating LIOB (laser-induced optical breakdown) for collagen stimulation.',
    painLevel: 3,
    painNote: 'Feels like grease spatters or rubber band snaps; varies by treatment area',
    recovery: 'For pigment: darkening then flaking over 5-10 days. For revitalization: mild redness for 24 hours.',
    duration: '15-30 min',
    results: 'Pigment clearance in 2-4 sessions (fewer than older lasers). Skin revitalization after a series of 3-4 treatments.',
    warnings: [
      'Multiple sessions needed for tattoo removal and deep pigmentation',
      'Transient hyperpigmentation possible, especially on darker skin',
      'Specific wavelengths needed for different ink colors (tattoo removal)',
    ],
    idealFor: ['Tattoo removal', 'Brown spots', 'Melasma', 'Skin revitalization', 'Acne scars'],
    tags: ['picosure', 'picoway', 'picosecond laser', 'tattoo removal', 'pigmentation'],
  },

  'Erbium Laser': {
    name: 'Erbium Laser',
    category: 'Laser',
    description:
      'An ablative laser that precisely removes thin layers of skin with less thermal damage than CO2 lasers, allowing faster healing.',
    howItWorks:
      'The erbium:YAG laser (2940nm) is strongly absorbed by water in the skin, vaporizing tissue with minimal heat spread to surrounding areas. This precision makes it gentler than CO2 while still providing resurfacing benefits.',
    painLevel: 3,
    painNote: 'Numbing cream applied; less painful than CO2 laser',
    recovery: '3-7 days depending on depth. Less oozing and redness than CO2. Skin heals faster with lower infection risk.',
    duration: '30-45 min',
    results: 'Smoother, tighter skin. Less dramatic than CO2 but with significantly less downtime.',
    warnings: [
      'Less effective than CO2 for deep wrinkles',
      'Still requires sun protection during healing',
      'Good middle ground between gentle and aggressive resurfacing',
    ],
    idealFor: ['Mild to moderate wrinkles', 'Sun damage', 'Age spots', 'Skin texture', 'Patients wanting less downtime than CO2'],
    tags: ['erbium laser', 'erbium yag', 'laser resurfacing', 'ablative'],
  },

  // ── RF / Tightening ───────────────────────────────────────────────────
  Thermage: {
    name: 'Thermage',
    category: 'RF / Tightening',
    description:
      'A non-invasive radiofrequency treatment that heats deep collagen layers to tighten skin and reduce wrinkles. One of the original non-surgical skin tightening devices.',
    howItWorks:
      'A monopolar RF device delivers bulk heat deep into the dermis and subdermal tissue, causing existing collagen to contract immediately and stimulating new collagen production over months.',
    painLevel: 3,
    painNote: 'Alternating hot and cool sensations; some spots can be uncomfortable',
    recovery: 'No downtime. Mild redness or swelling resolves within hours.',
    duration: '45-90 min',
    results: 'Subtle immediate tightening. Continued improvement over 2-6 months as new collagen forms. Results last 1-2 years.',
    warnings: [
      'Results are subtle — not a facelift alternative for significant laxity',
      'Single treatment protocol (not a series)',
      'Higher cost for a single session',
      'Results vary significantly between patients',
    ],
    idealFor: ['Mild skin laxity', 'Jawline tightening', 'Eye area tightening', 'Preventative aging'],
    tags: ['thermage', 'rf skin tightening', 'radiofrequency', 'collagen', 'non-surgical facelift'],
  },

  Ultherapy: {
    name: 'Ultherapy',
    category: 'RF / Tightening',
    description:
      'The only FDA-cleared non-invasive treatment to lift skin on the neck, chin, and brow using micro-focused ultrasound energy.',
    howItWorks:
      'Micro-focused ultrasound with visualization (MFU-V) delivers concentrated energy to precise depths in the skin\'s foundation layers (SMAS), creating thermal coagulation points that trigger a natural lifting and tightening response.',
    painLevel: 4,
    painNote: 'Can be quite uncomfortable — pain varies by area; some clinics offer pain medication',
    recovery: 'No true downtime, but mild swelling, tingling, or tenderness for a few days. Rare bruising.',
    duration: '60-90 min',
    results: 'Gradual lifting over 2-3 months. Full results at 6 months. Effects last 1-2 years.',
    warnings: [
      'Pain during treatment is the most common complaint',
      'Results are subtle and gradual — not a facelift replacement',
      'Not recommended for very thin skin or significant laxity',
      'Premium pricing for a single-session treatment',
    ],
    idealFor: ['Brow lift', 'Neck tightening', 'Jawline definition', 'Under-chin laxity'],
    tags: ['ultherapy', 'ultrasound lifting', 'non-surgical facelift', 'skin tightening'],
  },

  Sofwave: {
    name: 'Sofwave',
    category: 'RF / Tightening',
    description:
      'A newer non-invasive skin tightening device using proprietary SUPERB (Synchronous Ultrasound Parallel Beam) technology to stimulate collagen at a precise depth of 1.5mm.',
    howItWorks:
      'Seven parallel ultrasound beams heat the mid-dermis at exactly 1.5mm depth with an integrated cooling mechanism to protect the surface. This stimulates collagen and elastin remodeling.',
    painLevel: 2,
    painNote: 'Less painful than Ultherapy; most patients tolerate well with topical numbing',
    recovery: 'No downtime. Mild redness for a few hours.',
    duration: '30-45 min',
    results: 'Visible tightening at 4-8 weeks. Continued improvement for up to 6 months.',
    warnings: [
      'Newer device — long-term data still building',
      'Generally considered less intense (but also less painful) than Ultherapy',
      'Safe for all skin tones',
    ],
    idealFor: ['Fine lines', 'Mild skin laxity', 'Eyebrow lift', 'Jawline tightening'],
    tags: ['sofwave', 'ultrasound tightening', 'skin tightening', 'collagen'],
  },

  Tempsure: {
    name: 'TempSure Envi',
    category: 'RF / Tightening',
    description:
      'A gentle radiofrequency treatment that heats the skin to stimulate collagen production for mild tightening and smoothing.',
    howItWorks:
      'A monopolar RF handpiece delivers controlled heat to the dermal layer, reaching therapeutic temperatures that stimulate collagen remodeling. The treatment is gradual and gentle.',
    painLevel: 1,
    painNote: 'Feels like a hot stone massage; very comfortable',
    recovery: 'No downtime. No redness or peeling.',
    duration: '30-45 min',
    results: 'Subtle tightening over 3-4 sessions. More of a maintenance treatment.',
    warnings: [
      'Very mild results compared to Thermage or Ultherapy',
      'Requires multiple sessions',
      'Best as a maintenance or combination treatment',
    ],
    idealFor: ['Mild skin tightening', 'Fine lines around eyes', 'Jawline maintenance'],
    tags: ['tempsure', 'rf tightening', 'gentle radiofrequency', 'skin tightening'],
  },

  Exilis: {
    name: 'Exilis Ultra',
    category: 'RF / Tightening',
    description:
      'A non-invasive device combining radiofrequency and ultrasound energy to tighten skin and reduce fat on the face and body.',
    howItWorks:
      'The Exilis handpiece delivers simultaneous RF and ultrasound energy with controlled cooling, allowing deep heating of tissue for collagen contraction and fat reduction.',
    painLevel: 1,
    painNote: 'Warm sensation; generally comfortable and relaxing',
    recovery: 'No downtime. May have mild redness for an hour.',
    duration: '30-60 min',
    results: 'Gradual improvement over 2-4 sessions. Tightening and mild contouring visible at 4-8 weeks.',
    warnings: [
      'Mild results — best for early signs of aging or maintenance',
      'Series of 4 treatments typically recommended',
    ],
    idealFor: ['Facial skin tightening', 'Jawline', 'Mild body fat reduction', 'Combination skin + fat concerns'],
    tags: ['exilis', 'rf ultrasound', 'skin tightening', 'fat reduction'],
  },

  // ── Weight Loss / GLP-1 ───────────────────────────────────────────────
  'Semaglutide (Ozempic / Wegovy)': {
    name: 'Semaglutide (Ozempic / Wegovy)',
    category: 'Weight Loss / GLP-1',
    description:
      'A GLP-1 receptor agonist injection that reduces appetite, slows gastric emptying, and promotes significant weight loss. Ozempic is the diabetes formulation; Wegovy is FDA-approved specifically for weight management.',
    howItWorks:
      'Semaglutide mimics the GLP-1 hormone, which signals the brain to feel full, slows food moving through the stomach, and helps regulate blood sugar. Administered as a weekly subcutaneous injection with gradual dose increases.',
    painLevel: 1,
    painNote: 'Small subcutaneous injection — less painful than a blood draw',
    recovery: 'No downtime. GI side effects (nausea, constipation) are common, especially at dose increases.',
    duration: 'Weekly self-injection (takes 1-2 min)',
    results: 'Average weight loss of 15-20% of body weight over 68 weeks (Wegovy clinical trials).',
    warnings: [
      'Nausea is the most common side effect, especially when titrating up',
      'Requires gradual dose escalation over months',
      'Weight regain common if medication is stopped without lifestyle changes',
      'Not recommended for those with personal/family history of medullary thyroid cancer',
      'May cause muscle loss — combine with protein and strength training',
      'Insurance coverage varies; out-of-pocket costs can be significant',
    ],
    idealFor: ['Significant weight loss', 'BMI 27+ with comorbidities', 'BMI 30+', 'Appetite regulation'],
    tags: ['semaglutide', 'ozempic', 'wegovy', 'glp-1', 'weight loss', 'injection'],
  },

  'Tirzepatide (Mounjaro / Zepbound)': {
    name: 'Tirzepatide (Mounjaro / Zepbound)',
    category: 'Weight Loss / GLP-1',
    description:
      'A dual GIP/GLP-1 receptor agonist that produces even greater weight loss than semaglutide alone. Mounjaro for diabetes; Zepbound for weight management.',
    howItWorks:
      'Activates both GLP-1 and GIP receptors, providing a dual mechanism for appetite suppression, blood sugar regulation, and enhanced fat metabolism. Weekly subcutaneous injection.',
    painLevel: 1,
    painNote: 'Small subcutaneous injection',
    recovery: 'No downtime. Similar GI side effects as semaglutide but some patients tolerate better.',
    duration: 'Weekly self-injection',
    results: 'Average weight loss of 20-25% of body weight in clinical trials — highest of any approved weight loss medication.',
    warnings: [
      'Same GI side effects as semaglutide (nausea, diarrhea, constipation)',
      'Gradual dose escalation required',
      'Newer medication — less long-term data than semaglutide',
      'Same thyroid cancer warning as semaglutide',
      'Significant cost without insurance coverage',
    ],
    idealFor: ['Maximum weight loss', 'Patients who didn\'t respond well to semaglutide', 'Type 2 diabetes + weight loss'],
    tags: ['tirzepatide', 'mounjaro', 'zepbound', 'glp-1', 'gip', 'weight loss'],
  },

  'Liraglutide (Saxenda)': {
    name: 'Liraglutide (Saxenda)',
    category: 'Weight Loss / GLP-1',
    description:
      'An older GLP-1 receptor agonist requiring daily injections. FDA-approved for weight management as Saxenda.',
    howItWorks:
      'Similar mechanism to semaglutide but shorter-acting, requiring daily rather than weekly injections. Reduces appetite and slows gastric emptying.',
    painLevel: 1,
    painNote: 'Daily subcutaneous injection with a pen device',
    recovery: 'No downtime. GI side effects similar but daily dosing means more frequent adjustment.',
    duration: 'Daily self-injection',
    results: 'Average weight loss of 5-10% of body weight. Less effective than semaglutide or tirzepatide.',
    warnings: [
      'Daily injection requirement is a significant inconvenience vs weekly options',
      'Less weight loss than newer GLP-1 medications',
      'Same contraindications as other GLP-1 agonists',
    ],
    idealFor: ['Moderate weight loss', 'Patients who prefer daily dosing', 'Established track record'],
    tags: ['liraglutide', 'saxenda', 'victoza', 'glp-1', 'daily injection', 'weight loss'],
  },

  'Compounded Semaglutide': {
    name: 'Compounded Semaglutide',
    category: 'Weight Loss / GLP-1',
    description:
      'Semaglutide prepared by compounding pharmacies, typically at lower cost than brand-name Ozempic/Wegovy. Available during the FDA-declared shortage.',
    howItWorks:
      'Same active ingredient (semaglutide) as brand-name products, prepared as a salt form (semaglutide sodium) by FDA-registered 503B compounding pharmacies. Weekly subcutaneous injection.',
    painLevel: 1,
    painNote: 'Same injection experience as brand-name semaglutide',
    recovery: 'Same side effect profile as brand-name semaglutide.',
    duration: 'Weekly self-injection',
    results: 'Expected to produce similar results when properly compounded.',
    warnings: [
      'Quality varies by compounding pharmacy — ensure they are 503B registered',
      'Availability depends on ongoing FDA shortage declarations',
      'May be semaglutide sodium salt (slightly different formulation)',
      'Not identical to the brand-name autoinjector delivery system',
      'Verify your provider sources from a reputable compounder',
    ],
    idealFor: ['Cost-conscious patients', 'Patients without insurance coverage for brand-name'],
    tags: ['compounded semaglutide', 'glp-1', 'weight loss', 'compounding pharmacy'],
  },

  'Compounded Tirzepatide': {
    name: 'Compounded Tirzepatide',
    category: 'Weight Loss / GLP-1',
    description:
      'Tirzepatide prepared by compounding pharmacies at lower cost than brand-name Mounjaro/Zepbound.',
    howItWorks:
      'Same dual GIP/GLP-1 mechanism as brand-name tirzepatide, prepared by compounding pharmacies during the shortage period.',
    painLevel: 1,
    painNote: 'Same injection experience as brand-name tirzepatide',
    recovery: 'Same side effect profile as brand-name tirzepatide.',
    duration: 'Weekly self-injection',
    results: 'Expected to produce similar results when properly compounded.',
    warnings: [
      'Same quality/sourcing concerns as compounded semaglutide',
      'Ensure 503B registered pharmacy',
      'Shortage-dependent availability',
    ],
    idealFor: ['Cost-conscious patients wanting maximum weight loss efficacy'],
    tags: ['compounded tirzepatide', 'glp-1', 'weight loss', 'compounding pharmacy'],
  },

  'GLP-1 (unspecified)': {
    name: 'GLP-1 Medication',
    category: 'Weight Loss / GLP-1',
    description:
      'A GLP-1 receptor agonist medication for weight loss — specific product not specified. Includes semaglutide, tirzepatide, and liraglutide options.',
    howItWorks:
      'GLP-1 medications mimic the incretin hormone GLP-1, reducing appetite, slowing gastric emptying, and promoting weight loss through reduced caloric intake.',
    painLevel: 1,
    painNote: 'Subcutaneous injection — weekly or daily depending on product',
    recovery: 'No downtime. GI side effects common during titration.',
    duration: 'Weekly or daily self-injection',
    results: 'Varies by specific product. 5-25% body weight loss depending on medication.',
    warnings: [
      'Consult with your provider about which GLP-1 is right for you',
      'All GLP-1s carry similar safety profiles and contraindications',
    ],
    idealFor: ['Weight management', 'Appetite control'],
    tags: ['glp-1', 'weight loss', 'injection', 'appetite suppression'],
  },

  'Semaglutide / Weight Loss': {
    name: 'Semaglutide (Weight Loss)',
    category: 'Weight Loss / GLP-1',
    description:
      'Semaglutide-based weight loss treatment — may be brand-name or compounded.',
    howItWorks:
      'Same mechanism as semaglutide (Ozempic/Wegovy). Reduces appetite via GLP-1 receptor activation.',
    painLevel: 1,
    painNote: 'Weekly subcutaneous injection',
    recovery: 'No downtime. Nausea common during dose titration.',
    duration: 'Weekly self-injection',
    results: '15-20% body weight loss on average.',
    warnings: [
      'Clarify with your provider whether this is brand-name or compounded',
      'Same safety profile as all semaglutide products',
    ],
    idealFor: ['Weight loss', 'Appetite regulation'],
    tags: ['semaglutide', 'weight loss', 'glp-1'],
  },

  'B12 Injection': {
    name: 'Vitamin B12 Injection',
    category: 'Weight Loss / GLP-1',
    description:
      'An intramuscular injection of vitamin B12 (cobalamin) to boost energy, metabolism, and support overall wellness.',
    howItWorks:
      'Concentrated B12 is injected directly into the muscle (usually the deltoid or gluteus), bypassing the digestive system for 100% absorption. Often used alongside weight loss programs.',
    painLevel: 1,
    painNote: 'Quick intramuscular injection — brief sting',
    recovery: 'None. Resume all normal activities immediately.',
    duration: '1-2 min',
    results: 'Energy boost often felt within 24-48 hours. Weekly or bi-weekly injections recommended.',
    warnings: [
      'May not provide noticeable benefit if you\'re not B12 deficient',
      'Limited evidence for weight loss benefit in non-deficient individuals',
      'Very safe with minimal side effects',
    ],
    idealFor: ['Energy boost', 'B12 deficiency', 'Weight loss program add-on', 'Vegans/vegetarians'],
    tags: ['b12', 'vitamin b12', 'energy', 'injection', 'metabolism'],
  },

  'Lipotropic / MIC Injection': {
    name: 'Lipotropic (MIC) Injection',
    category: 'Weight Loss / GLP-1',
    description:
      'An injection containing methionine, inositol, and choline (MIC) — compounds that support fat metabolism and liver function.',
    howItWorks:
      'The MIC complex supports the body\'s fat metabolism pathways: methionine prevents fat buildup, inositol aids fat transport, and choline supports liver processing of fat. Often combined with B12.',
    painLevel: 1,
    painNote: 'Quick intramuscular injection',
    recovery: 'None.',
    duration: '1-2 min',
    results: 'Modest metabolism support when combined with diet and exercise. Weekly injections typical.',
    warnings: [
      'Limited clinical evidence for significant weight loss on their own',
      'Best as part of a comprehensive weight loss program',
      'Not a substitute for GLP-1 medications for significant weight loss',
    ],
    idealFor: ['Metabolism support', 'Weight loss program enhancement', 'Liver support'],
    tags: ['lipotropic', 'mic injection', 'methionine', 'inositol', 'choline', 'fat burning'],
  },

  // ── IV / Wellness ─────────────────────────────────────────────────────
  'IV Therapy': {
    name: 'IV Therapy',
    category: 'IV / Wellness',
    description:
      'Intravenous infusion of fluids, vitamins, minerals, and other nutrients directly into the bloodstream for hydration and wellness.',
    howItWorks:
      'An IV line is placed in your arm and a customized cocktail of saline, vitamins (B-complex, C), minerals (magnesium, zinc), and optional add-ons is dripped directly into your bloodstream.',
    painLevel: 1,
    painNote: 'Brief pinch from the IV needle; otherwise comfortable',
    recovery: 'None. Most people feel energized immediately after.',
    duration: '30-60 min',
    results: 'Immediate hydration. Vitamin benefits may be felt within hours to days.',
    warnings: [
      'Limited scientific evidence for wellness benefits in non-deficient individuals',
      'Ensure a licensed medical professional places the IV',
      'Rare risk of infection, bruising, or vein irritation',
      'Not a substitute for a balanced diet and adequate oral hydration',
    ],
    idealFor: ['Dehydration recovery', 'Hangover relief', 'Jet lag', 'Pre/post-event boost', 'Immune support'],
    tags: ['iv therapy', 'iv drip', 'hydration', 'vitamins', 'wellness'],
  },

  'IV Vitamin Therapy': {
    name: 'IV Vitamin Therapy',
    category: 'IV / Wellness',
    description:
      'Intravenous delivery of high-dose vitamins — most commonly the "Myers Cocktail" (B vitamins, vitamin C, magnesium, calcium).',
    howItWorks:
      'Vitamins are dissolved in saline and delivered directly into the bloodstream via IV, bypassing the GI tract for higher absorption rates than oral supplements.',
    painLevel: 1,
    painNote: 'Brief IV needle insertion; may feel a warm flush from B vitamins',
    recovery: 'None.',
    duration: '30-45 min',
    results: 'Many report an energy boost and improved wellbeing. Effects vary widely between individuals.',
    warnings: [
      'High-dose vitamin C may interact with certain medications',
      'Not suitable for kidney disease patients',
      'Benefits beyond hydration are debated in medical literature',
    ],
    idealFor: ['Fatigue', 'Immune support', 'Athletic recovery', 'Nutrient absorption issues'],
    tags: ['iv vitamins', 'myers cocktail', 'vitamin c iv', 'b vitamins', 'wellness'],
  },

  'IV Drip Therapy': {
    name: 'IV Drip Therapy',
    category: 'IV / Wellness',
    description:
      'Customized IV infusions targeting specific goals — beauty, energy, immunity, athletic recovery, or hangover relief.',
    howItWorks:
      'A tailored IV cocktail is selected based on your goals. Common formulas include "Beauty Drip" (biotin, glutathione), "Energy Drip" (B-complex, taurine), and "Immunity Drip" (vitamin C, zinc).',
    painLevel: 1,
    painNote: 'Brief IV needle insertion',
    recovery: 'None.',
    duration: '30-60 min',
    results: 'Hydration is immediate. Other benefits vary and are largely anecdotal.',
    warnings: [
      'Premium pricing for what is often saline with vitamins',
      'Choose a provider with medical oversight',
    ],
    idealFor: ['Specific wellness goals', 'Customized treatment', 'Recovery and hydration'],
    tags: ['iv drip', 'beauty drip', 'immunity drip', 'hydration', 'wellness'],
  },

  'NAD+ Therapy': {
    name: 'NAD+ Therapy',
    category: 'IV / Wellness',
    description:
      'Intravenous infusion of nicotinamide adenine dinucleotide (NAD+), a coenzyme essential for cellular energy and repair. Positioned as an anti-aging and energy treatment.',
    howItWorks:
      'NAD+ is delivered directly into the bloodstream via slow IV infusion. The coenzyme supports mitochondrial function, DNA repair, and cellular energy production — processes that decline with age.',
    painLevel: 2,
    painNote: 'IV insertion plus a chest-tightening or flushing sensation during infusion (normal)',
    recovery: 'None, but the infusion itself takes 2-4 hours. Some fatigue afterward.',
    duration: '2-4 hours (slow drip required)',
    results: 'Many report improved energy, mental clarity, and sleep. Scientific evidence in humans is still emerging.',
    warnings: [
      'Long infusion time (2-4 hours per session)',
      'Chest tightness, nausea, or cramping during infusion is common and dose-dependent',
      'High cost per session',
      'Research is promising but human clinical data is limited',
    ],
    idealFor: ['Anti-aging', 'Energy and mental clarity', 'Athletic recovery', 'Longevity protocols'],
    tags: ['nad+', 'nad therapy', 'anti-aging', 'longevity', 'cellular repair'],
  },

  'Peptide Therapy': {
    name: 'Peptide Therapy',
    category: 'IV / Wellness',
    description:
      'Targeted peptide treatments (BPC-157, CJC-1295, PT-141, etc.) administered via injection or nasal spray for healing, anti-aging, or performance goals.',
    howItWorks:
      'Short chains of amino acids (peptides) signal specific biological processes — tissue repair (BPC-157), growth hormone release (CJC-1295/Ipamorelin), or libido (PT-141). Typically self-administered via subcutaneous injection.',
    painLevel: 1,
    painNote: 'Subcutaneous self-injection with insulin needle; minimal pain',
    recovery: 'None.',
    duration: 'Daily or periodic self-injection; protocols vary by peptide',
    results: 'Varies widely by peptide and goal. Effects typically noticed over weeks to months.',
    warnings: [
      'FDA regulatory landscape for peptides is evolving',
      'Quality and sourcing are critical — use compounding pharmacies with 503B registration',
      'Some peptides (like BPC-157) lack robust human clinical trial data',
      'Consult with a provider experienced in peptide protocols',
    ],
    idealFor: ['Injury healing', 'Anti-aging', 'Performance optimization', 'Libido', 'Sleep quality'],
    tags: ['peptide therapy', 'bpc-157', 'cjc-1295', 'ipamorelin', 'pt-141', 'regenerative'],
  },

  // ── Hormone ───────────────────────────────────────────────────────────
  'HRT (Hormone Replacement)': {
    name: 'Hormone Replacement Therapy (HRT)',
    category: 'Hormone',
    description:
      'Medically supervised replacement of hormones (estrogen, progesterone, testosterone) to address symptoms of hormonal imbalance or decline.',
    howItWorks:
      'Bioidentical or synthetic hormones are delivered via pellets, creams, patches, or injections to restore hormone levels to an optimal range. Regular blood work monitors levels and guides dosing.',
    painLevel: 1,
    painNote: 'Depends on delivery method — pellet insertion is briefly uncomfortable; creams/patches are painless',
    recovery: 'None for most delivery methods. Pellet insertion site may be sore for a few days.',
    duration: 'Ongoing — blood work every 3-6 months; pellets last 3-6 months; daily for creams/patches',
    results: 'Symptom relief (energy, mood, libido, sleep) typically within 2-4 weeks. Full optimization at 3-6 months.',
    warnings: [
      'Requires ongoing monitoring via blood work',
      'Must be prescribed and supervised by a qualified provider',
      'Potential risks include blood clots, cardiovascular effects — discuss with your doctor',
      'Not appropriate for all patients — screening is essential',
    ],
    idealFor: ['Menopause symptoms', 'Low energy', 'Low libido', 'Mood changes', 'Sleep disruption'],
    tags: ['hrt', 'hormone replacement', 'bioidentical hormones', 'estrogen', 'progesterone', 'menopause'],
  },

  'Testosterone Therapy': {
    name: 'Testosterone Replacement Therapy (TRT)',
    category: 'Hormone',
    description:
      'Medically supervised testosterone supplementation for men and women with clinically low testosterone levels.',
    howItWorks:
      'Testosterone is delivered via injections (weekly/bi-weekly), topical creams/gels, or subcutaneous pellets to restore levels to a healthy range. Dosing is guided by blood work.',
    painLevel: 1,
    painNote: 'Intramuscular injection or painless topical application; pellets require minor procedure',
    recovery: 'None for injections and topicals. Pellet insertion: minor soreness for 2-3 days.',
    duration: 'Ongoing therapy with regular blood work monitoring',
    results: 'Improved energy, mood, and libido within 2-6 weeks. Muscle and body composition changes over months.',
    warnings: [
      'Must confirm low testosterone via blood work before starting',
      'Requires regular monitoring (PSA for men, lipids, CBC)',
      'Potential side effects: acne, hair thinning, mood changes, fertility impact (men)',
      'Women receive much lower doses than men',
    ],
    idealFor: ['Low testosterone symptoms', 'Low energy', 'Low libido', 'Muscle loss', 'Brain fog'],
    tags: ['testosterone', 'trt', 'hormone therapy', 'low t', 'pellets', 'injection'],
  },

  // ── Hair ──────────────────────────────────────────────────────────────
  'PRP Hair Restoration': {
    name: 'PRP Hair Restoration',
    category: 'Hair',
    description:
      'Platelet-rich plasma injections into the scalp to stimulate hair follicles and promote natural hair regrowth.',
    howItWorks:
      'Blood is drawn and centrifuged to concentrate platelets. The PRP is then injected into the scalp at the level of the hair follicles. Growth factors in PRP stimulate dormant follicles and strengthen miniaturizing hair.',
    painLevel: 3,
    painNote: 'Scalp injections with numbing; moderately uncomfortable despite anesthetic',
    recovery: 'Mild scalp soreness for 1-2 days. No visible recovery. Avoid washing hair for 24 hours.',
    duration: '45-60 min (including blood draw)',
    results: 'Reduced shedding at 1-3 months. New growth visible at 4-6 months. Typically 3 initial sessions 1 month apart, then maintenance every 6-12 months.',
    warnings: [
      'Results vary significantly — works better for thinning than complete baldness',
      'Multiple sessions required',
      'Not effective for advanced hair loss with no remaining follicles',
      'Maintenance treatments needed to sustain results',
    ],
    idealFor: ['Early hair thinning', 'Androgenetic alopecia', 'Hair transplant enhancement'],
    tags: ['prp hair', 'hair restoration', 'hair loss', 'platelet-rich plasma', 'scalp'],
  },

  'Hair Loss Treatment': {
    name: 'Hair Loss Treatment',
    category: 'Hair',
    description:
      'Various medical treatments for hair loss — may include oral medications (finasteride, minoxidil), topical treatments, laser caps, or combination protocols.',
    howItWorks:
      'Treatment depends on the specific protocol: finasteride blocks DHT (the hormone causing follicle miniaturization), minoxidil increases blood flow to follicles, and low-level laser therapy stimulates cellular activity.',
    painLevel: 1,
    painNote: 'Most treatments are oral or topical — painless',
    recovery: 'None.',
    duration: 'Ongoing daily medication/topical application',
    results: 'Reduced shedding at 3 months. Visible regrowth at 6-12 months with consistent use.',
    warnings: [
      'Finasteride: may cause sexual side effects in a small percentage of men',
      'Minoxidil: initial shedding phase is normal and temporary',
      'Results require long-term consistency — stopping treatment reverses gains',
    ],
    idealFor: ['Male pattern baldness', 'Female pattern hair loss', 'Thinning hair'],
    tags: ['hair loss', 'finasteride', 'minoxidil', 'laser cap', 'alopecia'],
  },

  'Scalp Micropigmentation': {
    name: 'Scalp Micropigmentation (SMP)',
    category: 'Hair',
    description:
      'A cosmetic tattoo technique that deposits pigment into the scalp to replicate the appearance of hair follicles, creating the illusion of a fuller head of hair or a buzzed look.',
    howItWorks:
      'Specialized needles deposit pigment dots into the dermal layer of the scalp in a pattern that mimics natural hair follicles. Multiple sessions build density and realism.',
    painLevel: 2,
    painNote: 'Feels like light scratching; scalp numbing cream applied',
    recovery: 'Mild redness for 1-2 days. Avoid water, sweating, and sun on the scalp for 5 days after each session.',
    duration: '2-5 hours per session; typically 2-3 sessions',
    results: 'Immediate visual improvement. Final result after 2-3 sessions. Lasts 3-5 years before touch-ups needed.',
    warnings: [
      'Results are cosmetic — does not grow actual hair',
      'Color may fade or change tone over time (especially with sun)',
      'Choose a practitioner who specializes in SMP (not general tattoo artists)',
      'Touch-ups needed every 3-5 years',
    ],
    idealFor: ['Buzzed look coverage', 'Thinning hair camouflage', 'Scar concealment', 'Post-transplant density'],
    tags: ['scalp micropigmentation', 'smp', 'hair tattoo', 'cosmetic tattoo'],
  },

  // ── Specialty ─────────────────────────────────────────────────────────
  'PRP Injections': {
    name: 'PRP Injections',
    category: 'Specialty',
    description:
      'Platelet-rich plasma injected into joints, tendons, or facial areas for healing and regeneration.',
    howItWorks:
      'Blood is drawn and centrifuged to concentrate growth-factor-rich platelets. The PRP is injected into the target area to accelerate natural healing and tissue regeneration.',
    painLevel: 3,
    painNote: 'Varies by injection site; joint injections can be moderately painful',
    recovery: 'Soreness at injection site for 2-5 days. Avoid strenuous activity for 48 hours.',
    duration: '30-45 min including blood draw',
    results: 'Gradual improvement over 4-8 weeks. May need 1-3 sessions.',
    warnings: [
      'Results vary significantly by condition and individual',
      'Not covered by most insurance for aesthetic applications',
      'Ensure sterile blood handling practices',
    ],
    idealFor: ['Joint pain', 'Tendon healing', 'Facial rejuvenation', 'Scar treatment'],
    tags: ['prp', 'platelet-rich plasma', 'regenerative', 'healing', 'injections'],
  },

  'Exosome Therapy': {
    name: 'Exosome Therapy',
    category: 'Specialty',
    description:
      'Cell-derived extracellular vesicles (exosomes) applied topically or injected to promote tissue regeneration, healing, and rejuvenation.',
    howItWorks:
      'Exosomes are nano-sized vesicles derived from stem cells. They carry growth factors, cytokines, and signaling molecules that direct nearby cells to regenerate and repair tissue.',
    painLevel: 2,
    painNote: 'Depends on application — topical (painless) or injection (mild-moderate)',
    recovery: 'Varies by delivery method and treatment area.',
    duration: '30-60 min',
    results: 'Varies — often used as an enhancement to other treatments (microneedling, PRP, hair restoration).',
    warnings: [
      'Regulatory landscape is rapidly evolving — FDA has not approved exosome products for injection',
      'Quality varies significantly between products',
      'Research is early-stage despite marketing claims',
      'Higher cost with limited proven advantages over PRP in some applications',
    ],
    idealFor: ['Enhanced healing', 'Hair restoration adjunct', 'Skin rejuvenation', 'Anti-aging'],
    tags: ['exosome', 'stem cell', 'regenerative medicine', 'anti-aging'],
  },

  Sculptra: {
    name: 'Sculptra',
    category: 'Specialty',
    description:
      'An injectable biostimulator (poly-L-lactic acid) that gradually stimulates your body\'s own collagen production for natural-looking volume restoration over months.',
    howItWorks:
      'PLLA microparticles are injected into the deep dermis. They act as a scaffold that triggers the body\'s own fibroblasts to produce new collagen around the particles, gradually restoring volume as the PLLA is absorbed.',
    painLevel: 2,
    painNote: 'Mixed with lidocaine for comfort; feels like filler injections',
    recovery: 'Swelling from the injection fluid resolves in 1-2 days. Massage treatment area 5 min, 5 times/day for 5 days ("5-5-5 rule").',
    duration: '30-45 min',
    results: 'Gradual — results build over 2-6 months as collagen is produced. Full correction typically requires 2-3 sessions. Effects last 2+ years.',
    warnings: [
      'NOT an instant-result filler — patience required',
      'Must massage as directed to prevent nodule formation',
      'Cannot be dissolved like HA fillers',
      'Not recommended for lips or under eyes',
      'Results are gradual but very long-lasting',
    ],
    idealFor: ['Global volume loss', 'Temple hollowing', 'Cheek volume', 'Jawline', 'Natural-looking rejuvenation'],
    tags: ['sculptra', 'biostimulator', 'plla', 'collagen stimulator', 'volume restoration'],
  },

  'PDO Thread Lift': {
    name: 'PDO Thread Lift',
    category: 'Specialty',
    description:
      'A minimally invasive lifting procedure using dissolvable PDO (polydioxanone) threads inserted under the skin to physically lift sagging tissue and stimulate collagen.',
    howItWorks:
      'Barbed or smooth PDO threads are inserted under the skin using thin needles. Barbed threads physically grab and lift tissue; smooth threads provide collagen stimulation. The threads dissolve over 6-9 months but the collagen framework remains.',
    painLevel: 3,
    painNote: 'Local anesthetic used; pressure and tugging sensation during placement',
    recovery: '3-7 days of swelling, bruising, and tenderness. Avoid wide mouth movements, sleeping on your side, and strenuous exercise for 1-2 weeks.',
    duration: '30-60 min',
    results: 'Immediate lift with continued improvement as collagen builds. Results last 12-18 months.',
    warnings: [
      'Not a replacement for a surgical facelift for significant laxity',
      'Risks include thread migration, dimpling, and infection',
      'Avoid dental work for 2 weeks after facial thread lift',
      'Results depend heavily on provider skill and thread quality',
    ],
    idealFor: ['Mid-face lift', 'Jawline definition', 'Brow lift', 'Neck lift', 'Mild to moderate sagging'],
    tags: ['pdo threads', 'thread lift', 'non-surgical facelift', 'lifting'],
  },

  Sclerotherapy: {
    name: 'Sclerotherapy',
    category: 'Specialty',
    description:
      'An injection treatment for spider veins and small varicose veins. A sclerosing solution is injected directly into the vein, causing it to collapse and fade.',
    howItWorks:
      'A fine needle injects a sclerosant solution (usually hypertonic saline or sotradecol) directly into the unwanted vein. The solution irritates the vein lining, causing it to swell, stick together, and eventually be reabsorbed by the body.',
    painLevel: 2,
    painNote: 'Mild stinging or cramping at each injection site',
    recovery: 'Compression stockings worn for 1-2 weeks. Bruising and temporary darkening of treated veins is normal. Avoid sun exposure on treatment area.',
    duration: '30-45 min',
    results: 'Spider veins fade over 3-6 weeks. Larger veins may take 3-4 months. May need 2-3 sessions.',
    warnings: [
      'Temporary bruising and hyperpigmentation (brown staining) along treated veins is common',
      'Not suitable for large varicose veins (may need surgical intervention)',
      'Compression stockings are essential for optimal results',
      'New spider veins may develop over time — maintenance may be needed',
    ],
    idealFor: ['Spider veins on legs', 'Small varicose veins', 'Reticular veins'],
    tags: ['sclerotherapy', 'spider veins', 'varicose veins', 'vein treatment'],
  },

  'RF Ablation': {
    name: 'RF Ablation (Vein Treatment)',
    category: 'Specialty',
    description:
      'A minimally invasive procedure using radiofrequency energy to close off larger varicose veins from the inside.',
    howItWorks:
      'A thin catheter is inserted into the vein under ultrasound guidance. RF energy heats the vein wall, causing it to collapse and seal shut. Blood is rerouted through healthier veins.',
    painLevel: 2,
    painNote: 'Local anesthesia used; mild discomfort and pressure',
    recovery: 'Walk immediately after. Compression stockings for 1-2 weeks. Avoid prolonged standing and heavy exercise for 1 week.',
    duration: '45-60 min',
    results: 'Vein is closed immediately. Symptom relief (aching, heaviness) within days. Full cosmetic improvement over weeks.',
    warnings: [
      'Requires ultrasound-guided technique — choose a vein specialist',
      'Temporary numbness or tightness along treated vein',
      'Deep vein thrombosis (DVT) is a rare but serious risk',
    ],
    idealFor: ['Symptomatic varicose veins', 'Venous insufficiency', 'Heavy/aching legs'],
    tags: ['rf ablation', 'vein ablation', 'varicose veins', 'venous insufficiency'],
  },

  // ── Beauty ────────────────────────────────────────────────────────────
  'Brow Lamination': {
    name: 'Brow Lamination',
    category: 'Beauty',
    description:
      'A chemical treatment that relaxes and redirects brow hairs to create a uniform, fluffy, brushed-up look that lasts 6-8 weeks.',
    howItWorks:
      'A lifting solution breaks down the bonds in brow hairs, allowing them to be reshaped. A neutralizer then re-sets the bonds in the new position. Optional tint is applied for added definition.',
    painLevel: 1,
    painNote: 'Painless — mild tingling from the chemical solutions',
    recovery: 'Avoid getting brows wet for 24 hours. No rubbing or makeup on brows for 24 hours.',
    duration: '30-45 min',
    results: 'Immediate fluffy, groomed brow look. Lasts 6-8 weeks as hair grows out.',
    warnings: [
      'Not suitable if you have very sparse brows (need enough hair to laminate)',
      'Over-processing can damage brow hairs — don\'t overdo frequency',
      'Patch test recommended for sensitive skin',
    ],
    idealFor: ['Unruly brows', 'Sparse brows that need fullness illusion', 'Fluffy brow trend', 'Low-maintenance grooming'],
    tags: ['brow lamination', 'eyebrows', 'brow styling', 'fluffy brows'],
  },

  'Lash Lift': {
    name: 'Lash Lift',
    category: 'Beauty',
    description:
      'A semi-permanent treatment that curls and lifts natural eyelashes from the root, creating the appearance of longer, more open eyes — like a perm for your lashes.',
    howItWorks:
      'Lashes are adhered to a silicone shield on the eyelid. A lifting solution breaks the bonds in the lash hairs, re-forming them in a curled position. A setting solution locks the new shape. Optional tint darkens the lashes.',
    painLevel: 1,
    painNote: 'Painless — eyes are closed throughout; may feel the shield resting on lids',
    recovery: 'Avoid water, steam, and mascara for 24 hours. Sleep on your back the first night.',
    duration: '45-60 min',
    results: 'Immediately lifted, curled lashes. Effect lasts 6-8 weeks as lashes naturally grow and shed.',
    warnings: [
      'Not suitable during active eye infections or with very short lashes',
      'Over-processing can damage lashes — maintain proper intervals',
      'Results depend on natural lash length and condition',
    ],
    idealFor: ['Straight lashes', 'Natural lash enhancement', 'Mascara alternative', 'Low-maintenance beauty'],
    tags: ['lash lift', 'lash perm', 'eyelash lift', 'natural lashes', 'eye opening'],
  },
};

export default PROCEDURE_METADATA;

/**
 * Look up metadata for a procedure type, with fuzzy matching
 * for slight variations in naming.
 */
export function getProcedureMetadata(procedureType) {
  if (!procedureType) return null;
  // Direct match
  if (PROCEDURE_METADATA[procedureType]) return PROCEDURE_METADATA[procedureType];
  // Case-insensitive match
  const lower = procedureType.toLowerCase();
  const key = Object.keys(PROCEDURE_METADATA).find(
    (k) => k.toLowerCase() === lower
  );
  return key ? PROCEDURE_METADATA[key] : null;
}

/**
 * Get all procedures in a given category.
 */
export function getProceduresByCategory(category) {
  return Object.values(PROCEDURE_METADATA).filter(
    (m) => m.category === category
  );
}

/**
 * Search procedure metadata by keyword (matches name, tags, description).
 */
export function searchProcedures(query) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  return Object.entries(PROCEDURE_METADATA)
    .filter(([key, meta]) => {
      if (key.toLowerCase().includes(q)) return true;
      if (meta.name.toLowerCase().includes(q)) return true;
      if (meta.tags?.some((t) => t.includes(q))) return true;
      if (meta.description.toLowerCase().includes(q)) return true;
      return false;
    })
    .map(([key, meta]) => ({ key, ...meta }));
}

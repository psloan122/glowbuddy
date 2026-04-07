export const PROCEDURE_TYPES = [
  // Neurotoxins
  'Botox / Dysport / Xeomin',
  'Jeuveau',
  'Daxxify',
  'Botox Lip Flip',

  // Fillers
  'Lip Filler',
  'Cheek Filler',
  'Jawline Filler',
  'Nasolabial Filler',
  'Under Eye Filler',
  'Chin Filler',
  'Nose Filler',
  'Hand Filler',
  'Temple Filler',

  // Body
  'Kybella',
  'CoolSculpting',
  'Emsculpt NEO',
  'truSculpt',
  'SculpSure',
  'BodyTite',
  'Velashape',
  'Cellulite Treatment',

  // Microneedling
  'Microneedling',
  'RF Microneedling',
  'Morpheus8',
  'PRP Microneedling',
  'Exosome Microneedling',

  // Skin
  'Chemical Peel',
  'HydraFacial',
  'Dermaplaning',
  'LED Therapy',
  'Oxygen Facial',
  'Microdermabrasion',
  'Vampire Facial',

  // Laser
  'Laser Hair Removal',
  'IPL / Photofacial',
  'Fractional CO2 Laser',
  'Clear + Brilliant',
  'Halo Laser',
  'Picosure / Picoway',
  'Erbium Laser',

  // RF / Tightening
  'Thermage',
  'Ultherapy',
  'Sofwave',
  'Tempsure',
  'Exilis',

  // Weight Loss / GLP-1
  'Semaglutide (Ozempic / Wegovy)',
  'Tirzepatide (Mounjaro / Zepbound)',
  'Liraglutide (Saxenda)',
  'Compounded Semaglutide',
  'Compounded Tirzepatide',
  'GLP-1 (unspecified)',
  'Semaglutide / Weight Loss',
  'B12 Injection',
  'Lipotropic / MIC Injection',

  // IV / Wellness
  'IV Therapy',
  'IV Vitamin Therapy',
  'IV Drip Therapy',
  'NAD+ Therapy',
  'Peptide Therapy',

  // Hormone
  'HRT (Hormone Replacement)',
  'Testosterone Therapy',

  // Hair
  'PRP Hair Restoration',
  'Hair Loss Treatment',
  'Scalp Micropigmentation',

  // Specialty
  'PRP Injections',
  'Exosome Therapy',
  'Sculptra',
  'PDO Thread Lift',
  'Sclerotherapy',
  'RF Ablation',

  // Beauty
  'Brow Lamination',
  'Lash Lift',
];

export const PROCEDURE_CATEGORIES = {
  Neurotoxins: ['Botox / Dysport / Xeomin', 'Jeuveau', 'Daxxify', 'Botox Lip Flip'],
  Fillers: ['Lip Filler', 'Cheek Filler', 'Jawline Filler', 'Nasolabial Filler', 'Under Eye Filler', 'Chin Filler', 'Nose Filler', 'Hand Filler', 'Temple Filler'],
  Body: ['Kybella', 'CoolSculpting', 'Emsculpt NEO', 'truSculpt', 'SculpSure', 'BodyTite', 'Velashape', 'Cellulite Treatment'],
  Microneedling: ['Microneedling', 'RF Microneedling', 'Morpheus8', 'PRP Microneedling', 'Exosome Microneedling'],
  Skin: ['Chemical Peel', 'HydraFacial', 'Dermaplaning', 'LED Therapy', 'Oxygen Facial', 'Microdermabrasion', 'Vampire Facial'],
  Laser: ['Laser Hair Removal', 'IPL / Photofacial', 'Fractional CO2 Laser', 'Clear + Brilliant', 'Halo Laser', 'Picosure / Picoway', 'Erbium Laser'],
  'RF / Tightening': ['Thermage', 'Ultherapy', 'Sofwave', 'Tempsure', 'Exilis'],
  'Weight Loss / GLP-1': ['Semaglutide (Ozempic / Wegovy)', 'Tirzepatide (Mounjaro / Zepbound)', 'Liraglutide (Saxenda)', 'Compounded Semaglutide', 'Compounded Tirzepatide', 'GLP-1 (unspecified)', 'Semaglutide / Weight Loss', 'B12 Injection', 'Lipotropic / MIC Injection'],
  'IV / Wellness': ['IV Therapy', 'IV Vitamin Therapy', 'IV Drip Therapy', 'NAD+ Therapy', 'Peptide Therapy'],
  Hormone: ['HRT (Hormone Replacement)', 'Testosterone Therapy'],
  Hair: ['PRP Hair Restoration', 'Hair Loss Treatment', 'Scalp Micropigmentation'],
  Specialty: ['PRP Injections', 'Exosome Therapy', 'Sculptra', 'PDO Thread Lift', 'Sclerotherapy', 'RF Ablation'],
  Beauty: ['Brow Lamination', 'Lash Lift'],
};

export const TREATMENT_AREAS = [
  'Forehead',
  'Glabella (11s)',
  "Crow's Feet",
  'Bunny Lines',
  'Lips',
  'Cheeks',
  'Jawline',
  'Chin',
  'Under Eyes',
  'Neck',
  'Full Face',
  'Body',
  'Other',
];

export const PROVIDER_TYPES = [
  'Board-Certified Dermatologist',
  'Plastic Surgeon',
  'PA / NP Injector',
  'RN Injector',
  'Med Spa (Physician-Owned)',
  'Med Spa (Non-Physician)',
  'Dentist Injector',
  'Other',
];

export const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
  { value: 'DC', label: 'District of Columbia' },
];

export const DISCOUNT_TYPES = [
  { value: 'percentage', label: 'Percentage Off' },
  { value: 'fixed', label: 'Fixed Price' },
  { value: 'free_add_on', label: 'Free Add-On' },
  { value: 'new_patient', label: 'New Patient Special' },
];

export const PRICE_LABEL_OPTIONS = [
  'per unit',
  'per syringe',
  'per session',
  'per area',
  'per vial',
  'starting from',
  'per month',
  'per week',
  'per injection',
];

export const ONBOARDING_PROVIDER_TYPES = [
  'Board-Certified Dermatologist',
  'Plastic Surgeon',
  'PA / NP Injector Practice',
  'RN Injector Practice',
  'Med Spa (Physician-Owned)',
  'Med Spa (Non-Physician)',
  'Multi-Location Group Practice',
  'Other',
];

export const BADGE_DEFINITIONS = {
  glowgetter: {
    emoji: '🌟',
    label: 'Glowgetter',
    description: 'First submission',
    threshold: 1,
  },
  price_pioneer: {
    emoji: '🔍',
    label: 'Price Pioneer',
    description: '5 submissions',
    threshold: 5,
  },
  club_100: {
    emoji: '💯',
    label: '100 Club',
    description: '100 submissions',
    threshold: 100,
  },
  location_pioneer: {
    emoji: '🏅',
    label: 'Pioneer',
    description: 'First verified price at a location',
    threshold: null,
  },
};

// Procedures that require treatment area selection
export const REQUIRES_TREATMENT_AREA = new Set([
  'Botox / Dysport / Xeomin',
  'Jeuveau',
  'Daxxify',
  'Lip Filler',
  'Cheek Filler',
  'Jawline Filler',
  'Nasolabial Filler',
  'Under Eye Filler',
  'Chin Filler',
  'Nose Filler',
  'Hand Filler',
  'Temple Filler',
  'Kybella',
  'Botox Lip Flip',
  'Laser Hair Removal',
  'CoolSculpting',
  'Emsculpt NEO',
  'truSculpt',
  'SculpSure',
  'BodyTite',
  'Sclerotherapy',
]);

// Dynamic placeholder for "How much?" field
export const UNITS_PLACEHOLDER = {
  'Botox / Dysport / Xeomin': 'e.g. 20 units',
  'Jeuveau': 'e.g. 20 units',
  'Daxxify': 'e.g. 40 units',
  'Lip Filler': 'e.g. 1 syringe',
  'Cheek Filler': 'e.g. 2 syringes',
  'Jawline Filler': 'e.g. 2 syringes',
  'Nasolabial Filler': 'e.g. 1 syringe',
  'Under Eye Filler': 'e.g. 1 syringe',
  'Chin Filler': 'e.g. 1 syringe',
  'Nose Filler': 'e.g. 1 syringe',
  'Hand Filler': 'e.g. 2 syringes',
  'Temple Filler': 'e.g. 1 syringe',
  'Kybella': 'e.g. 2 vials',
  'Botox Lip Flip': 'e.g. 4 units',
  'Sculptra': 'e.g. 2 vials',
  'Semaglutide / Weight Loss': 'e.g. 4-week supply',
  'Semaglutide (Ozempic / Wegovy)': 'e.g. 4-week supply',
  'Tirzepatide (Mounjaro / Zepbound)': 'e.g. 4-week supply',
  'Liraglutide (Saxenda)': 'e.g. 4-week supply',
  'Compounded Semaglutide': 'e.g. 4-week supply',
  'Compounded Tirzepatide': 'e.g. 4-week supply',
  'GLP-1 (unspecified)': 'e.g. 4-week supply',
  'B12 Injection': 'e.g. 1 injection',
  'Lipotropic / MIC Injection': 'e.g. 1 injection',
  'IV Therapy': 'e.g. 1 session',
  'IV Vitamin Therapy': 'e.g. 1 session',
  'IV Drip Therapy': 'e.g. 1 session',
  'NAD+ Therapy': 'e.g. 1 session',
  'Peptide Therapy': 'e.g. 1 session',
  'PRP Injections': 'e.g. 1 session',
  'Exosome Therapy': 'e.g. 1 session',
  'PDO Thread Lift': 'e.g. 1 session',
  'Sclerotherapy': 'e.g. 1 session',
  'RF Ablation': 'e.g. 1 session',
  'PRP Hair Restoration': 'e.g. 1 session',
  'Hair Loss Treatment': 'e.g. 1 session',
  'Scalp Micropigmentation': 'e.g. 1 session',
  'HRT (Hormone Replacement)': 'e.g. 1 month',
  'Testosterone Therapy': 'e.g. 1 month',
  'Morpheus8': 'e.g. 1 session',
  'PRP Microneedling': 'e.g. 1 session',
  'Exosome Microneedling': 'e.g. 1 session',
  'Emsculpt NEO': 'e.g. 1 session',
  'truSculpt': 'e.g. 1 session',
  'SculpSure': 'e.g. 1 session',
  'BodyTite': 'e.g. 1 session',
  'Velashape': 'e.g. 1 session',
  'Cellulite Treatment': 'e.g. 1 session',
  'Thermage': 'e.g. 1 session',
  'Ultherapy': 'e.g. 1 session',
  'Sofwave': 'e.g. 1 session',
  'Tempsure': 'e.g. 1 session',
  'Exilis': 'e.g. 1 session',
  'Fractional CO2 Laser': 'e.g. 1 session',
  'Clear + Brilliant': 'e.g. 1 session',
  'Halo Laser': 'e.g. 1 session',
  'Picosure / Picoway': 'e.g. 1 session',
  'Erbium Laser': 'e.g. 1 session',
  'Dermaplaning': 'e.g. 1 session',
  'LED Therapy': 'e.g. 1 session',
  'Oxygen Facial': 'e.g. 1 session',
  'Microdermabrasion': 'e.g. 1 session',
  'Vampire Facial': 'e.g. 1 session',
};

// Reference average prices (national) for helper text
export const AVG_PRICES = {
  'Botox / Dysport / Xeomin': { avg: 302, unit: '/area' },
  'Jeuveau': { avg: 280, unit: '/area' },
  'Daxxify': { avg: 450, unit: '/area' },
  'Lip Filler': { avg: 672, unit: '/syringe' },
  'Cheek Filler': { avg: 750, unit: '/syringe' },
  'Jawline Filler': { avg: 800, unit: '/syringe' },
  'Nasolabial Filler': { avg: 685, unit: '/syringe' },
  'Under Eye Filler': { avg: 750, unit: '/syringe' },
  'Chin Filler': { avg: 725, unit: '/syringe' },
  'Nose Filler': { avg: 700, unit: '/syringe' },
  'Hand Filler': { avg: 800, unit: '/syringe' },
  'Temple Filler': { avg: 750, unit: '/syringe' },
  'Kybella': { avg: 1200, unit: '/session' },
  'CoolSculpting': { avg: 750, unit: '/area' },
  'Emsculpt NEO': { avg: 1000, unit: '/session' },
  'truSculpt': { avg: 600, unit: '/session' },
  'SculpSure': { avg: 700, unit: '/session' },
  'BodyTite': { avg: 3500, unit: '/session' },
  'Velashape': { avg: 350, unit: '/session' },
  'Cellulite Treatment': { avg: 400, unit: '/session' },
  'Microneedling': { avg: 250, unit: '/session' },
  'RF Microneedling': { avg: 400, unit: '/session' },
  'Morpheus8': { avg: 800, unit: '/session' },
  'PRP Microneedling': { avg: 500, unit: '/session' },
  'Exosome Microneedling': { avg: 600, unit: '/session' },
  'Chemical Peel': { avg: 200, unit: '/session' },
  'HydraFacial': { avg: 200, unit: '/session' },
  'Dermaplaning': { avg: 125, unit: '/session' },
  'LED Therapy': { avg: 75, unit: '/session' },
  'Oxygen Facial': { avg: 150, unit: '/session' },
  'Microdermabrasion': { avg: 150, unit: '/session' },
  'Vampire Facial': { avg: 700, unit: '/session' },
  'Laser Hair Removal': { avg: 285, unit: '/session' },
  'IPL / Photofacial': { avg: 350, unit: '/session' },
  'Fractional CO2 Laser': { avg: 1500, unit: '/session' },
  'Clear + Brilliant': { avg: 400, unit: '/session' },
  'Halo Laser': { avg: 1200, unit: '/session' },
  'Picosure / Picoway': { avg: 500, unit: '/session' },
  'Erbium Laser': { avg: 1000, unit: '/session' },
  'Thermage': { avg: 2500, unit: '/session' },
  'Ultherapy': { avg: 3000, unit: '/session' },
  'Sofwave': { avg: 2500, unit: '/session' },
  'Tempsure': { avg: 600, unit: '/session' },
  'Exilis': { avg: 500, unit: '/session' },
  'Semaglutide (Ozempic / Wegovy)': { avg: 500, unit: '/month' },
  'Tirzepatide (Mounjaro / Zepbound)': { avg: 550, unit: '/month' },
  'Liraglutide (Saxenda)': { avg: 450, unit: '/month' },
  'Compounded Semaglutide': { avg: 300, unit: '/month' },
  'Compounded Tirzepatide': { avg: 350, unit: '/month' },
  'GLP-1 (unspecified)': { avg: 400, unit: '/month' },
  'Semaglutide / Weight Loss': { avg: 400, unit: '/month' },
  'B12 Injection': { avg: 30, unit: '/injection' },
  'Lipotropic / MIC Injection': { avg: 35, unit: '/injection' },
  'IV Therapy': { avg: 175, unit: '/session' },
  'IV Vitamin Therapy': { avg: 200, unit: '/session' },
  'IV Drip Therapy': { avg: 200, unit: '/session' },
  'NAD+ Therapy': { avg: 500, unit: '/session' },
  'Peptide Therapy': { avg: 300, unit: '/month' },
  'HRT (Hormone Replacement)': { avg: 250, unit: '/month' },
  'Testosterone Therapy': { avg: 200, unit: '/month' },
  'PRP Hair Restoration': { avg: 800, unit: '/session' },
  'Hair Loss Treatment': { avg: 400, unit: '/session' },
  'Scalp Micropigmentation': { avg: 1500, unit: '/session' },
  'PRP Injections': { avg: 700, unit: '/session' },
  'Exosome Therapy': { avg: 800, unit: '/session' },
  'Sculptra': { avg: 900, unit: '/vial' },
  'PDO Thread Lift': { avg: 1500, unit: '/session' },
  'Sclerotherapy': { avg: 350, unit: '/session' },
  'RF Ablation': { avg: 600, unit: '/session' },
  'Botox Lip Flip': { avg: 100, unit: '' },
  'Brow Lamination': { avg: 65, unit: '' },
  'Lash Lift': { avg: 85, unit: '' },
};

// Set of valid 2-letter state codes for validation
export const VALID_STATE_CODES = new Set(US_STATES.map((s) => s.value));

// Maps PROCEDURE_CATEGORIES keys to normalized tags stored in providers.procedure_tags
export const CATEGORY_TAG_MAP = {
  Neurotoxins: 'neurotoxin',
  Fillers: 'filler',
  Body: 'body',
  Microneedling: 'microneedling',
  Skin: 'skin',
  Laser: 'laser',
  'RF / Tightening': 'rf-tightening',
  'Weight Loss / GLP-1': 'weight-loss',
  'IV / Wellness': 'iv-wellness',
  Hormone: 'hormone',
  Hair: 'hair',
  Specialty: 'specialty',
  Beauty: 'beauty',
};

// Given a procedure type, return its category tag for Supabase filtering
export function getCategoryTag(procedureType) {
  for (const [category, procedures] of Object.entries(PROCEDURE_CATEGORIES)) {
    if (procedures.includes(procedureType)) {
      return CATEGORY_TAG_MAP[category] || null;
    }
  }
  return null;
}

export function procedureToSlug(name) {
  return name
    .toLowerCase()
    .replace(/\s*\/\s*/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function slugToProcedure(slug) {
  return PROCEDURE_TYPES.find((p) => procedureToSlug(p) === slug) || slug;
}

// ── Procedure pills for the browse/map gate ──────────────────────────────
//
// Each pill maps a friendly label (Botox, Fillers, GLP-1) to a stable URL
// slug, the canonical procedure_type used as the "primary" name (for guides
// and first-timer logic), and the full list of canonical procedure_type
// values that the filter should match in the database.
//
// `fuzzyToken` is the lowercase substring used for ilike() matching against
// provider_pricing.procedure_type, which the scraper stores in lowercase
// (e.g. "botox", "lip filler"). It's the first meaningful word from the
// canonical category.
export const PROCEDURE_PILLS = [
  // Primary row
  {
    label: 'Botox',
    slug: 'neurotoxin',
    primary: 'Botox / Dysport / Xeomin',
    procedureTypes: PROCEDURE_CATEGORIES.Neurotoxins,
    categoryTag: 'neurotoxin',
    fuzzyToken: 'botox',
    isPrimary: true,
  },
  {
    label: 'Fillers',
    slug: 'filler',
    primary: 'Lip Filler',
    procedureTypes: PROCEDURE_CATEGORIES.Fillers,
    categoryTag: 'filler',
    fuzzyToken: 'filler',
    isPrimary: true,
  },
  {
    label: 'Laser',
    slug: 'laser',
    primary: 'Laser Hair Removal',
    procedureTypes: PROCEDURE_CATEGORIES.Laser,
    categoryTag: 'laser',
    fuzzyToken: 'laser',
    isPrimary: true,
  },
  {
    label: 'Microneedling',
    slug: 'microneedling',
    primary: 'Microneedling',
    procedureTypes: PROCEDURE_CATEGORIES.Microneedling,
    categoryTag: 'microneedling',
    fuzzyToken: 'microneedling',
    isPrimary: true,
  },
  {
    label: 'GLP-1',
    slug: 'weight-loss',
    primary: 'Semaglutide (Ozempic / Wegovy)',
    procedureTypes: PROCEDURE_CATEGORIES['Weight Loss / GLP-1'],
    categoryTag: 'weight-loss',
    fuzzyToken: 'semaglutide',
    isPrimary: true,
  },
  {
    label: 'Chemical Peel',
    slug: 'chemical-peel',
    primary: 'Chemical Peel',
    procedureTypes: ['Chemical Peel'],
    categoryTag: 'skin',
    fuzzyToken: 'peel',
    isPrimary: true,
  },
  {
    label: 'HydraFacial',
    slug: 'hydrafacial',
    primary: 'HydraFacial',
    procedureTypes: ['HydraFacial'],
    categoryTag: 'skin',
    fuzzyToken: 'hydrafacial',
    isPrimary: true,
  },
  {
    label: 'CoolSculpting',
    slug: 'coolsculpting',
    primary: 'CoolSculpting',
    procedureTypes: ['CoolSculpting'],
    categoryTag: 'body',
    fuzzyToken: 'coolsculpting',
    isPrimary: true,
  },
  {
    label: 'IV Therapy',
    slug: 'iv-wellness',
    primary: 'IV Therapy',
    procedureTypes: PROCEDURE_CATEGORIES['IV / Wellness'],
    categoryTag: 'iv-wellness',
    fuzzyToken: 'iv',
    isPrimary: true,
  },

  // "More" expansion row
  {
    label: 'RF Microneedling',
    slug: 'rf-tightening',
    primary: 'RF Microneedling',
    procedureTypes: ['RF Microneedling', 'Morpheus8'],
    categoryTag: 'rf-tightening',
    fuzzyToken: 'rf',
    isPrimary: false,
  },
  {
    label: 'PRP',
    slug: 'prp',
    primary: 'PRP Injections',
    procedureTypes: ['PRP Injections', 'PRP Microneedling', 'PRP Hair Restoration'],
    categoryTag: 'specialty',
    fuzzyToken: 'prp',
    isPrimary: false,
  },
  {
    label: 'Thread Lift',
    slug: 'thread-lift',
    primary: 'PDO Thread Lift',
    procedureTypes: ['PDO Thread Lift'],
    categoryTag: 'specialty',
    fuzzyToken: 'thread',
    isPrimary: false,
  },
  {
    label: 'Laser Hair Removal',
    slug: 'laser-hair-removal',
    primary: 'Laser Hair Removal',
    procedureTypes: ['Laser Hair Removal'],
    categoryTag: 'laser',
    fuzzyToken: 'hair removal',
    isPrimary: false,
  },
  {
    label: 'Dermaplaning',
    slug: 'dermaplaning',
    primary: 'Dermaplaning',
    procedureTypes: ['Dermaplaning'],
    categoryTag: 'skin',
    fuzzyToken: 'dermaplan',
    isPrimary: false,
  },
  {
    label: 'Kybella',
    slug: 'kybella',
    primary: 'Kybella',
    procedureTypes: ['Kybella'],
    categoryTag: 'body',
    fuzzyToken: 'kybella',
    isPrimary: false,
  },
  {
    label: 'Emsculpt',
    slug: 'emsculpt',
    primary: 'Emsculpt NEO',
    procedureTypes: ['Emsculpt NEO'],
    categoryTag: 'body',
    fuzzyToken: 'emsculpt',
    isPrimary: false,
  },
];

// Lookups used by the gate / search bar
export function findPillBySlug(slug) {
  if (!slug) return null;
  return PROCEDURE_PILLS.find((p) => p.slug === slug) || null;
}

export function findPillByLabel(label) {
  if (!label) return null;
  const lower = label.toLowerCase().trim();
  return (
    PROCEDURE_PILLS.find((p) => p.label.toLowerCase() === lower) ||
    PROCEDURE_PILLS.find((p) => p.fuzzyToken && lower.includes(p.fuzzyToken)) ||
    null
  );
}

// Resolve the URL ?procedure=... value into a filter object that the
// browse/map page can use directly. Accepts pill slugs first; falls back to
// canonical-procedure slugs (e.g. botox-dysport-xeomin → single-procedure
// filter) for backward compatibility with the existing search dropdown.
export function resolveProcedureFilter(slug) {
  if (!slug) return null;
  const pill = findPillBySlug(slug);
  if (pill) {
    return {
      slug: pill.slug,
      label: pill.label,
      primary: pill.primary,
      procedureTypes: pill.procedureTypes,
      categoryTag: pill.categoryTag,
      fuzzyToken: pill.fuzzyToken,
      isPill: true,
    };
  }
  const canonical = slugToProcedure(slug);
  if (canonical && PROCEDURE_TYPES.includes(canonical)) {
    return {
      slug,
      label: canonical,
      primary: canonical,
      procedureTypes: [canonical],
      categoryTag: getCategoryTag(canonical),
      fuzzyToken: canonical.split(/[\s/]+/).filter(Boolean)[0]?.toLowerCase() || null,
      isPill: false,
    };
  }
  return null;
}

// Build a filter object from a canonical procedure type (when the user
// selects from the search dropdown rather than the gate pills).
export function makeProcedureFilterFromCanonical(canonical) {
  if (!canonical) return null;
  return {
    slug: procedureToSlug(canonical),
    label: canonical,
    primary: canonical,
    procedureTypes: [canonical],
    categoryTag: getCategoryTag(canonical),
    fuzzyToken: canonical.split(/[\s/]+/).filter(Boolean)[0]?.toLowerCase() || null,
    isPill: false,
  };
}

export function makeProcedureFilterFromPill(pill) {
  if (!pill) return null;
  return {
    slug: pill.slug,
    label: pill.label,
    primary: pill.primary,
    procedureTypes: pill.procedureTypes,
    categoryTag: pill.categoryTag,
    fuzzyToken: pill.fuzzyToken,
    isPill: true,
  };
}

// Shared interest options for Onboarding + Settings
export const INTEREST_OPTIONS = [
  { emoji: '💉', label: 'Botox & Dysport' },
  { emoji: '💋', label: 'Lip Filler' },
  { emoji: '✨', label: 'Cheek & Jawline Filler' },
  { emoji: '🔬', label: 'Microneedling' },
  { emoji: '⚡', label: 'Laser Treatments' },
  { emoji: '💆', label: 'HydraFacial' },
  { emoji: '💪', label: 'Body Contouring' },
  { emoji: '⚖️', label: 'Weight Loss (GLP-1)' },
  { emoji: '🫧', label: 'Chemical Peels' },
  { emoji: '👁️', label: 'Under Eye Filler' },
];

// Maps broad interest labels to specific procedure types for tag resolution
export const INTEREST_TO_PROCEDURES = {
  'Botox & Dysport': ['Botox / Dysport / Xeomin', 'Jeuveau', 'Daxxify', 'Botox Lip Flip'],
  'Lip Filler': ['Lip Filler'],
  'Cheek & Jawline Filler': ['Cheek Filler', 'Jawline Filler', 'Chin Filler'],
  'Microneedling': ['Microneedling', 'RF Microneedling', 'Morpheus8', 'PRP Microneedling', 'Exosome Microneedling'],
  'Laser Treatments': ['Laser Hair Removal', 'IPL / Photofacial', 'Fractional CO2 Laser', 'Clear + Brilliant', 'Halo Laser', 'Picosure / Picoway', 'Erbium Laser'],
  'HydraFacial': ['HydraFacial'],
  'Body Contouring': ['CoolSculpting', 'Emsculpt NEO', 'truSculpt', 'SculpSure', 'BodyTite', 'Kybella'],
  'Weight Loss (GLP-1)': ['Semaglutide (Ozempic / Wegovy)', 'Tirzepatide (Mounjaro / Zepbound)', 'Compounded Semaglutide', 'Compounded Tirzepatide', 'GLP-1 (unspecified)', 'Semaglutide / Weight Loss'],
  'Chemical Peels': ['Chemical Peel'],
  'Under Eye Filler': ['Under Eye Filler'],
};

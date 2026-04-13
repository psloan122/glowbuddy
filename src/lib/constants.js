// Top cities by pricing data volume — used for quick-pick chips on the
// browse page when no city is selected.
export const FEATURED_CITIES = [
  { city: 'New York',        state: 'NY' },
  { city: 'Houston',         state: 'TX' },
  { city: 'Las Vegas',       state: 'NV' },
  { city: 'Denver',          state: 'CO' },
  { city: 'Chicago',         state: 'IL' },
  { city: 'Los Angeles',     state: 'CA' },
  { city: 'Phoenix',         state: 'AZ' },
  { city: 'Atlanta',         state: 'GA' },
  { city: 'San Diego',       state: 'CA' },
  { city: 'Dallas',          state: 'TX' },
  { city: 'Charlotte',       state: 'NC' },
  { city: 'Philadelphia',    state: 'PA' },
];

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
    label: 'Glowgetter',
    description: 'First submission',
    threshold: 1,
  },
  price_pioneer: {
    label: 'Price Pioneer',
    description: '5 submissions',
    threshold: 5,
  },
  club_100: {
    label: '100 Club',
    description: '100 submissions',
    threshold: 100,
  },
  location_pioneer: {
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
  // Primary row — neurotoxins are split into 5 brand-specific pills so
  // shoppers can compare across brands. They all map to the same `neurotoxin`
  // category tag/procedureTypes; the `brand` field is what carries through
  // the URL into provider_pricing.brand equality filters.
  {
    label: 'Botox',
    slug: 'neurotoxin',
    brand: 'Botox',
    primary: 'Botox',
    procedureTypes: PROCEDURE_CATEGORIES.Neurotoxins,
    categoryTag: 'neurotoxin',
    fuzzyToken: 'botox',
    isPrimary: true,
  },
  {
    label: 'Dysport',
    slug: 'neurotoxin',
    brand: 'Dysport',
    primary: 'Dysport',
    procedureTypes: PROCEDURE_CATEGORIES.Neurotoxins,
    categoryTag: 'neurotoxin',
    fuzzyToken: 'dysport',
    isPrimary: true,
  },
  {
    label: 'Xeomin',
    slug: 'neurotoxin',
    brand: 'Xeomin',
    primary: 'Xeomin',
    procedureTypes: PROCEDURE_CATEGORIES.Neurotoxins,
    categoryTag: 'neurotoxin',
    fuzzyToken: 'xeomin',
    isPrimary: true,
  },
  {
    label: 'Jeuveau',
    slug: 'neurotoxin',
    brand: 'Jeuveau',
    primary: 'Jeuveau',
    procedureTypes: PROCEDURE_CATEGORIES.Neurotoxins,
    categoryTag: 'neurotoxin',
    fuzzyToken: 'jeuveau',
    isPrimary: true,
  },
  {
    label: 'Daxxify',
    slug: 'neurotoxin',
    brand: 'Daxxify',
    primary: 'Daxxify',
    procedureTypes: PROCEDURE_CATEGORIES.Neurotoxins,
    categoryTag: 'neurotoxin',
    fuzzyToken: 'daxxify',
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

// ── 5 broad category pills for the browse gate ───────────────────────
// These replace the 13+ per-brand/per-treatment pills with 5 high-level
// categories. Each pill maps to the union of all procedure types in its
// category so a single tap loads all related prices.
export const CATEGORY_PILLS = [
  {
    label: 'Botox', emoji: '💉', slug: 'neurotoxin',
    primary: 'Botox',
    procedureTypes: PROCEDURE_CATEGORIES.Neurotoxins,
    categoryTag: 'neurotoxin', fuzzyToken: 'botox',
    description: 'Botox & neurotoxins',
  },
  {
    label: 'Filler', emoji: '✨', slug: 'filler',
    primary: 'Lip Filler',
    procedureTypes: PROCEDURE_CATEGORIES.Fillers,
    categoryTag: 'filler', fuzzyToken: 'filler',
    description: 'Lip, cheek & facial filler',
  },
  {
    label: 'Laser', emoji: '⚡', slug: 'laser',
    primary: 'Laser Hair Removal',
    procedureTypes: PROCEDURE_CATEGORIES.Laser,
    categoryTag: 'laser', fuzzyToken: 'laser',
    description: 'Laser resurfacing & IPL',
  },
  {
    label: 'Body', emoji: '🏃', slug: 'body',
    primary: 'CoolSculpting',
    procedureTypes: [...PROCEDURE_CATEGORIES.Body, ...PROCEDURE_CATEGORIES['Weight Loss / GLP-1']],
    categoryTag: 'body', fuzzyToken: 'body',
    description: 'Body contouring & GLP-1',
  },
  {
    label: 'Skin', emoji: '🌿', slug: 'skin',
    primary: 'HydraFacial',
    procedureTypes: [...PROCEDURE_CATEGORIES.Skin, ...PROCEDURE_CATEGORIES.Microneedling],
    categoryTag: 'skin', fuzzyToken: 'skin',
    description: 'Facials, peels & microneedling',
  },
];

// Generic category labels used when the URL has a procedure slug but no
// brand. These produce the chip / headline / first-timer banner copy
// ("Botox & more" instead of "Botox / Dysport / Xeomin"). When a brand
// IS set the brand string wins everywhere — see callers in FindPrices.jsx
// and FirstTimerModeBanner.jsx.
//
// The neurotoxin label is intentionally "Botox & more" (not the medical
// jargon "Neurotoxin") because that's how real shoppers think and
// search. The "& more" half signals that this view spans every brand
// in the category — Botox, Dysport, Xeomin, Jeuveau, Daxxify — without
// hiding the most-recognized name behind unfamiliar terminology.
//
// Title-case version is used for headlines ("Botox & more prices in ...")
// and the banner ("First time with Botox & more?"). UI that needs the
// uppercase chip form should call .toUpperCase() at the render site.
export const CATEGORY_LABELS = {
  neurotoxin: 'Botox & more',
  filler: 'Fillers',
  laser: 'Laser',
  microneedling: 'Microneedling',
  'rf-tightening': 'RF Microneedling',
  'weight-loss': 'GLP-1',
  'chemical-peel': 'Chemical Peel',
  hydrafacial: 'HydraFacial',
  coolsculpting: 'CoolSculpting',
  'iv-wellness': 'IV Therapy',
  'laser-hair-removal': 'Laser Hair Removal',
  'thread-lift': 'Thread Lift',
  prp: 'PRP',
  kybella: 'Kybella',
  emsculpt: 'Emsculpt',
  dermaplaning: 'Dermaplaning',
};

// ── Sub-type pills for granular filtering ─────────────────────────────
//
// When a user selects a category pill (Fillers, Laser, etc.), these
// sub-type pills appear in the StickyFilterBar so the user can drill
// down to a specific procedure type. Each entry maps a pill slug to
// its sub-type options.
//
// `label` — display text for the pill
// `procedureType` — the canonical PROCEDURE_TYPES value to filter to
//
// Neurotoxins are excluded here because they already use brandPills
// (Botox, Dysport, Xeomin, Jeuveau, Daxxify) with brand-based filtering.
export const CATEGORY_SUB_TYPES = {
  filler: [
    { label: 'Lip', procedureType: 'Lip Filler' },
    { label: 'Cheek', procedureType: 'Cheek Filler' },
    { label: 'Jawline', procedureType: 'Jawline Filler' },
    { label: 'Under Eye', procedureType: 'Under Eye Filler' },
    { label: 'Nasolabial', procedureType: 'Nasolabial Filler' },
    { label: 'Chin', procedureType: 'Chin Filler' },
    { label: 'Nose', procedureType: 'Nose Filler' },
    { label: 'Temple', procedureType: 'Temple Filler' },
    { label: 'Hand', procedureType: 'Hand Filler' },
  ],
  laser: [
    { label: 'Hair Removal', procedureType: 'Laser Hair Removal' },
    { label: 'IPL / BBL', procedureType: 'IPL / Photofacial' },
    { label: 'CO2 Laser', procedureType: 'Fractional CO2 Laser' },
    { label: 'Clear+Brilliant', procedureType: 'Clear + Brilliant' },
    { label: 'Halo', procedureType: 'Halo Laser' },
    { label: 'PicoSure', procedureType: 'Picosure / Picoway' },
    { label: 'Erbium', procedureType: 'Erbium Laser' },
  ],
  microneedling: [
    { label: 'Standard', procedureType: 'Microneedling' },
    { label: 'RF Microneedling', procedureType: 'RF Microneedling' },
    { label: 'Morpheus8', procedureType: 'Morpheus8' },
    { label: 'PRP', procedureType: 'PRP Microneedling' },
    { label: 'Exosome', procedureType: 'Exosome Microneedling' },
  ],
  'weight-loss': [
    { label: 'Ozempic / Wegovy', procedureType: 'Semaglutide (Ozempic / Wegovy)' },
    { label: 'Mounjaro / Zepbound', procedureType: 'Tirzepatide (Mounjaro / Zepbound)' },
    { label: 'Compounded Sema', procedureType: 'Compounded Semaglutide' },
    { label: 'Compounded Tirz', procedureType: 'Compounded Tirzepatide' },
    { label: 'Saxenda', procedureType: 'Liraglutide (Saxenda)' },
    { label: 'B12', procedureType: 'B12 Injection' },
  ],
  'rf-tightening': [
    { label: 'Thermage', procedureType: 'Thermage' },
    { label: 'Ultherapy', procedureType: 'Ultherapy' },
    { label: 'Sofwave', procedureType: 'Sofwave' },
    { label: 'TempSure', procedureType: 'Tempsure' },
    { label: 'Exilis', procedureType: 'Exilis' },
  ],
  'iv-wellness': [
    { label: 'IV Therapy', procedureType: 'IV Therapy' },
    { label: 'IV Vitamins', procedureType: 'IV Vitamin Therapy' },
    { label: 'NAD+', procedureType: 'NAD+ Therapy' },
    { label: 'Peptides', procedureType: 'Peptide Therapy' },
  ],
  body: [
    { label: 'Kybella', procedureType: 'Kybella' },
    { label: 'CoolSculpting', procedureType: 'CoolSculpting' },
    { label: 'Emsculpt', procedureType: 'Emsculpt NEO' },
    { label: 'truSculpt', procedureType: 'truSculpt' },
    { label: 'SculpSure', procedureType: 'SculpSure' },
  ],
  skin: [
    { label: 'HydraFacial', procedureType: 'HydraFacial' },
    { label: 'Chemical Peel', procedureType: 'Chemical Peel' },
    { label: 'Dermaplaning', procedureType: 'Dermaplaning' },
    { label: 'Microderm', procedureType: 'Microdermabrasion' },
    { label: 'LED', procedureType: 'LED Therapy' },
  ],
};

// Resolve a slug + optional brand into a display label.
// Brand always wins over the generic category name.
export function getCategoryLabel(slug, brand = null) {
  if (brand) return brand;
  if (!slug) return '';
  return CATEGORY_LABELS[slug] || slug;
}

// Lookups used by the gate / search bar
//
// `brand` is optional — when provided, prefer the brand-specific pill
// (e.g. Dysport vs the default Botox neurotoxin pill). When omitted,
// the first matching slug wins.
export function findPillBySlug(slug, brand = null) {
  if (!slug) return null;
  if (brand) {
    const exact = PROCEDURE_PILLS.find(
      (p) => p.slug === slug && (p.brand || '').toLowerCase() === brand.toLowerCase()
    );
    if (exact) return exact;
  }
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
export function resolveProcedureFilter(slug, brand = null) {
  if (!slug) return null;
  const pill = findPillBySlug(slug, brand);
  if (pill) {
    // When no brand is requested but the matched pill happens to be a
    // brand-specific entry (e.g. neurotoxin defaults to the Botox pill),
    // override the display label with the generic category name so the
    // chip / headline / banner read "Neurotoxins" instead of "Botox".
    // The procedureTypes / categoryTag / fuzzyToken stay the same so
    // the data fetch still spans every brand in the category.
    const useCategoryLabel = !brand && pill.brand;
    const categoryLabel = useCategoryLabel
      ? CATEGORY_LABELS[pill.slug] || pill.label
      : pill.label;
    return {
      slug: pill.slug,
      label: categoryLabel,
      primary: categoryLabel,
      procedureTypes: pill.procedureTypes,
      categoryTag: pill.categoryTag,
      fuzzyToken: pill.fuzzyToken,
      brand: brand || null,
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
    brand: pill.brand || null,
    isPill: true,
  };
}

// Shared interest options for Onboarding + Settings
export const INTEREST_OPTIONS = [
  { label: 'Botox & Dysport' },
  { label: 'Lip Filler' },
  { label: 'Cheek & Jawline Filler' },
  { label: 'Microneedling' },
  { label: 'Laser Treatments' },
  { label: 'HydraFacial' },
  { label: 'Body Contouring' },
  { label: 'Weight Loss (GLP-1)' },
  { label: 'Chemical Peels' },
  { label: 'Under Eye Filler' },
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

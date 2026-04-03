export const PROCEDURE_TYPES = [
  'Botox / Dysport / Xeomin',
  'Lip Filler',
  'Cheek Filler',
  'Jawline Filler',
  'Nasolabial Filler',
  'Under Eye Filler',
  'Chin Filler',
  'Kybella',
  'RF Microneedling',
  'Microneedling',
  'Chemical Peel',
  'Laser Hair Removal',
  'IPL / Photofacial',
  'CoolSculpting',
  'Semaglutide / Weight Loss',
  'IV Therapy',
  'HydraFacial',
  'Botox Lip Flip',
  'Brow Lamination',
  'Lash Lift',
];

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
};

// Procedures that require treatment area selection
export const REQUIRES_TREATMENT_AREA = new Set([
  'Botox / Dysport / Xeomin',
  'Lip Filler',
  'Cheek Filler',
  'Jawline Filler',
  'Nasolabial Filler',
  'Under Eye Filler',
  'Chin Filler',
  'Kybella',
  'Botox Lip Flip',
  'Laser Hair Removal',
  'CoolSculpting',
]);

// Dynamic placeholder for "How much?" field
export const UNITS_PLACEHOLDER = {
  'Botox / Dysport / Xeomin': 'e.g. 20 units',
  'Lip Filler': 'e.g. 1 syringe',
  'Cheek Filler': 'e.g. 2 syringes',
  'Jawline Filler': 'e.g. 2 syringes',
  'Nasolabial Filler': 'e.g. 1 syringe',
  'Under Eye Filler': 'e.g. 1 syringe',
  'Chin Filler': 'e.g. 1 syringe',
  'Kybella': 'e.g. 2 vials',
  'Botox Lip Flip': 'e.g. 4 units',
  'Semaglutide / Weight Loss': 'e.g. 4-week supply',
  'IV Therapy': 'e.g. 1 session',
};

// Reference average prices (national) for helper text
export const AVG_PRICES = {
  'Botox / Dysport / Xeomin': { avg: 302, unit: '/area' },
  'Lip Filler': { avg: 672, unit: '/syringe' },
  'Cheek Filler': { avg: 750, unit: '/syringe' },
  'Jawline Filler': { avg: 800, unit: '/syringe' },
  'Nasolabial Filler': { avg: 685, unit: '/syringe' },
  'Under Eye Filler': { avg: 750, unit: '/syringe' },
  'Chin Filler': { avg: 725, unit: '/syringe' },
  'Kybella': { avg: 1200, unit: '/session' },
  'RF Microneedling': { avg: 400, unit: '/session' },
  'Microneedling': { avg: 250, unit: '/session' },
  'Chemical Peel': { avg: 200, unit: '/session' },
  'Laser Hair Removal': { avg: 285, unit: '/session' },
  'IPL / Photofacial': { avg: 350, unit: '/session' },
  'CoolSculpting': { avg: 750, unit: '/area' },
  'Semaglutide / Weight Loss': { avg: 400, unit: '/month' },
  'IV Therapy': { avg: 175, unit: '/session' },
  'HydraFacial': { avg: 200, unit: '/session' },
  'Botox Lip Flip': { avg: 100, unit: '' },
  'Brow Lamination': { avg: 65, unit: '' },
  'Lash Lift': { avg: 85, unit: '' },
};

// Set of valid 2-letter state codes for validation
export const VALID_STATE_CODES = new Set(US_STATES.map((s) => s.value));

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

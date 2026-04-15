/**
 * Enriched procedure options for the Log Treatment price-sharing flow.
 *
 * Each entry carries:
 *   value       — matches procedure_type stored in the DB (procedure_type column)
 *   label       — human-readable display name for the dropdown
 *   category    — group heading in the dropdown
 *   defaultUnit — pre-selected price_label when this procedure is chosen
 *   unitOptions — which price_label values make sense for this procedure
 *   unitHint    — placeholder for the "How much?" (units/syringes/sessions) field
 *   avgNational — rough national median, shown as a reference hint in the price field
 *   avgUnit     — unit string appended to avgNational (e.g. '/unit', '/syringe')
 *   popularAreas — pre-populated options for the treatment area dropdown
 */

export const LOG_PROCEDURES = [
  // ── Neurotoxins ──────────────────────────────────────────────────────────
  {
    value: 'Botox',
    label: 'Botox',
    category: 'Neurotoxin',
    defaultUnit: 'per_unit',
    unitOptions: ['per_unit', 'per_area', 'flat_package'],
    unitHint: 'e.g. 20 units',
    avgNational: 13,
    avgUnit: '/unit',
    popularAreas: [
      'Forehead', "Frown Lines (11s)", "Crow's Feet", 'Bunny Lines',
      'Lip Flip', 'Masseter / Jaw', 'Brow Lift', 'Neck Bands',
      'Underarms (Hyperhidrosis)', 'Full Face',
    ],
  },
  {
    value: 'Dysport',
    label: 'Dysport',
    category: 'Neurotoxin',
    defaultUnit: 'per_unit',
    unitOptions: ['per_unit', 'per_area', 'flat_package'],
    unitHint: 'e.g. 50 units (Dysport units ≈ 2.5× Botox)',
    avgNational: 5,
    avgUnit: '/unit',
    popularAreas: [
      'Forehead', "Frown Lines (11s)", "Crow's Feet", 'Full Face',
    ],
  },
  {
    value: 'Xeomin',
    label: 'Xeomin',
    category: 'Neurotoxin',
    defaultUnit: 'per_unit',
    unitOptions: ['per_unit', 'per_area', 'flat_package'],
    unitHint: 'e.g. 20 units',
    avgNational: 12,
    avgUnit: '/unit',
    popularAreas: [
      'Forehead', "Frown Lines (11s)", "Crow's Feet", 'Full Face',
    ],
  },
  {
    value: 'Jeuveau',
    label: 'Jeuveau',
    category: 'Neurotoxin',
    defaultUnit: 'per_unit',
    unitOptions: ['per_unit', 'per_area', 'flat_package'],
    unitHint: 'e.g. 20 units',
    avgNational: 12,
    avgUnit: '/unit',
    popularAreas: [
      'Forehead', "Frown Lines (11s)", "Crow's Feet",
    ],
  },
  {
    value: 'Daxxify',
    label: 'Daxxify',
    category: 'Neurotoxin',
    defaultUnit: 'per_unit',
    unitOptions: ['per_unit', 'per_area', 'flat_package'],
    unitHint: 'e.g. 40 units',
    avgNational: 15,
    avgUnit: '/unit',
    popularAreas: [
      'Forehead', "Frown Lines (11s)", "Crow's Feet", 'Full Face',
    ],
  },
  {
    value: 'Botox Lip Flip',
    label: 'Botox Lip Flip',
    category: 'Neurotoxin',
    defaultUnit: 'per_unit',
    unitOptions: ['per_unit', 'flat_package'],
    unitHint: 'e.g. 4 units',
    avgNational: 13,
    avgUnit: '/unit',
    popularAreas: ['Lip Flip'],
  },
  {
    value: 'Neurotoxin (brand unknown)',
    label: 'Neurotoxin (brand unknown)',
    category: 'Neurotoxin',
    defaultUnit: 'per_unit',
    unitOptions: ['per_unit', 'per_area', 'flat_package'],
    unitHint: 'e.g. 20 units',
    popularAreas: [
      'Forehead', "Frown Lines (11s)", "Crow's Feet", 'Full Face',
    ],
  },

  // ── Dermal Fillers ───────────────────────────────────────────────────────
  {
    value: 'Juvederm',
    label: 'Juvederm (any)',
    category: 'Dermal Filler',
    defaultUnit: 'per_syringe',
    unitOptions: ['per_syringe', 'flat_package'],
    unitHint: 'e.g. 1 syringe',
    avgNational: 650,
    avgUnit: '/syringe',
    popularAreas: ['Lips', 'Cheeks', 'Nasolabial Folds', 'Under Eyes', 'Chin', 'Jawline'],
  },
  {
    value: 'Juvederm Voluma',
    label: 'Juvederm Voluma',
    category: 'Dermal Filler',
    defaultUnit: 'per_syringe',
    unitOptions: ['per_syringe', 'flat_package'],
    unitHint: 'e.g. 2 syringes',
    avgNational: 850,
    avgUnit: '/syringe',
    popularAreas: ['Cheeks', 'Midface', 'Temples'],
  },
  {
    value: 'Juvederm Volbella',
    label: 'Juvederm Volbella',
    category: 'Dermal Filler',
    defaultUnit: 'per_syringe',
    unitOptions: ['per_syringe', 'flat_package'],
    unitHint: 'e.g. 1 syringe',
    avgNational: 650,
    avgUnit: '/syringe',
    popularAreas: ['Lips', 'Lip Lines'],
  },
  {
    value: 'Restylane',
    label: 'Restylane (any)',
    category: 'Dermal Filler',
    defaultUnit: 'per_syringe',
    unitOptions: ['per_syringe', 'flat_package'],
    unitHint: 'e.g. 1 syringe',
    avgNational: 600,
    avgUnit: '/syringe',
    popularAreas: ['Lips', 'Cheeks', 'Nasolabial Folds', 'Under Eyes', 'Chin', 'Jawline'],
  },
  {
    value: 'Restylane Kysse',
    label: 'Restylane Kysse',
    category: 'Dermal Filler',
    defaultUnit: 'per_syringe',
    unitOptions: ['per_syringe', 'flat_package'],
    unitHint: 'e.g. 1 syringe',
    avgNational: 600,
    avgUnit: '/syringe',
    popularAreas: ['Lips'],
  },
  {
    value: 'Restylane Lyft',
    label: 'Restylane Lyft',
    category: 'Dermal Filler',
    defaultUnit: 'per_syringe',
    unitOptions: ['per_syringe', 'flat_package'],
    unitHint: 'e.g. 2 syringes',
    avgNational: 700,
    avgUnit: '/syringe',
    popularAreas: ['Cheeks', 'Midface', 'Hands'],
  },
  {
    value: 'Lip Filler',
    label: 'Lip Filler (brand unknown)',
    category: 'Dermal Filler',
    defaultUnit: 'per_syringe',
    unitOptions: ['per_syringe', 'flat_package'],
    unitHint: 'e.g. 1 syringe',
    avgNational: 550,
    avgUnit: '/syringe',
    popularAreas: ['Lips'],
  },
  {
    value: 'Cheek Filler',
    label: 'Cheek / Midface Filler',
    category: 'Dermal Filler',
    defaultUnit: 'per_syringe',
    unitOptions: ['per_syringe', 'flat_package'],
    unitHint: 'e.g. 2 syringes',
    avgNational: 750,
    avgUnit: '/syringe',
    popularAreas: ['Cheeks', 'Midface', 'Temples'],
  },
  {
    value: 'Jawline Filler',
    label: 'Jawline Filler',
    category: 'Dermal Filler',
    defaultUnit: 'per_syringe',
    unitOptions: ['per_syringe', 'flat_package'],
    unitHint: 'e.g. 2 syringes',
    avgNational: 800,
    avgUnit: '/syringe',
    popularAreas: ['Jawline', 'Chin'],
  },
  {
    value: 'Under Eye Filler',
    label: 'Under Eye / Tear Trough Filler',
    category: 'Dermal Filler',
    defaultUnit: 'per_syringe',
    unitOptions: ['per_syringe', 'flat_package'],
    unitHint: 'e.g. 1 syringe',
    avgNational: 750,
    avgUnit: '/syringe',
    popularAreas: ['Under Eyes'],
  },
  {
    value: 'Nasolabial Filler',
    label: 'Nasolabial Filler',
    category: 'Dermal Filler',
    defaultUnit: 'per_syringe',
    unitOptions: ['per_syringe', 'flat_package'],
    unitHint: 'e.g. 1 syringe',
    avgNational: 685,
    avgUnit: '/syringe',
    popularAreas: ['Nasolabial Folds'],
  },
  {
    value: 'Chin Filler',
    label: 'Chin Filler',
    category: 'Dermal Filler',
    defaultUnit: 'per_syringe',
    unitOptions: ['per_syringe', 'flat_package'],
    unitHint: 'e.g. 1 syringe',
    avgNational: 725,
    avgUnit: '/syringe',
    popularAreas: ['Chin'],
  },
  {
    value: 'Nose Filler',
    label: 'Nose Filler (Non-Surgical Rhinoplasty)',
    category: 'Dermal Filler',
    defaultUnit: 'per_syringe',
    unitOptions: ['per_syringe', 'flat_package'],
    unitHint: 'e.g. 1 syringe',
    avgNational: 700,
    avgUnit: '/syringe',
    popularAreas: ['Nose'],
  },
  {
    value: 'Dermal Filler',
    label: 'Dermal Filler (brand unknown)',
    category: 'Dermal Filler',
    defaultUnit: 'per_syringe',
    unitOptions: ['per_syringe', 'flat_package'],
    unitHint: 'e.g. 1 syringe',
    avgNational: 600,
    avgUnit: '/syringe',
    popularAreas: ['Lips', 'Cheeks', 'Under Eyes', 'Chin', 'Jawline', 'Nasolabial Folds'],
  },

  // ── Biostimulators ───────────────────────────────────────────────────────
  {
    value: 'Sculptra',
    label: 'Sculptra',
    category: 'Biostimulator',
    defaultUnit: 'per_vial',
    unitOptions: ['per_vial', 'flat_package'],
    unitHint: 'e.g. 2 vials',
    avgNational: 800,
    avgUnit: '/vial',
    popularAreas: ['Cheeks', 'Temples', 'Full Face', 'Buttocks'],
  },
  {
    value: 'Radiesse',
    label: 'Radiesse',
    category: 'Biostimulator',
    defaultUnit: 'per_syringe',
    unitOptions: ['per_syringe', 'flat_package'],
    unitHint: 'e.g. 1 syringe',
    avgNational: 700,
    avgUnit: '/syringe',
    popularAreas: ['Cheeks', 'Hands', 'Nasolabial Folds', 'Jawline'],
  },
  {
    value: 'Kybella',
    label: 'Kybella',
    category: 'Injectable',
    defaultUnit: 'per_session',
    unitOptions: ['per_session', 'per_vial', 'flat_package'],
    unitHint: 'sessions or vials',
    avgNational: 1200,
    avgUnit: '/session',
    popularAreas: ['Double Chin', 'Jowls'],
  },

  // ── Skin Treatments ──────────────────────────────────────────────────────
  {
    value: 'Microneedling',
    label: 'Microneedling',
    category: 'Skin Treatment',
    defaultUnit: 'per_session',
    unitOptions: ['per_session', 'flat_package'],
    unitHint: 'sessions',
    avgNational: 350,
    avgUnit: '/session',
    popularAreas: ['Full Face', 'Face + Neck', 'Face + Neck + Décolletage', 'Scalp'],
  },
  {
    value: 'RF Microneedling',
    label: 'RF Microneedling',
    category: 'Skin Treatment',
    defaultUnit: 'per_session',
    unitOptions: ['per_session', 'flat_package'],
    unitHint: 'sessions',
    avgNational: 900,
    avgUnit: '/session',
    popularAreas: ['Full Face', 'Face + Neck', 'Body'],
  },
  {
    value: 'Morpheus8',
    label: 'Morpheus8',
    category: 'Skin Treatment',
    defaultUnit: 'per_session',
    unitOptions: ['per_session', 'flat_package'],
    unitHint: 'sessions',
    avgNational: 1200,
    avgUnit: '/session',
    popularAreas: ['Full Face', 'Face + Neck', 'Body'],
  },
  {
    value: 'HydraFacial',
    label: 'HydraFacial',
    category: 'Skin Treatment',
    defaultUnit: 'per_session',
    unitOptions: ['per_session'],
    unitHint: 'sessions',
    avgNational: 200,
    avgUnit: '/session',
    popularAreas: ['Full Face'],
  },
  {
    value: 'Chemical Peel',
    label: 'Chemical Peel',
    category: 'Skin Treatment',
    defaultUnit: 'per_session',
    unitOptions: ['per_session'],
    unitHint: 'sessions',
    avgNational: 200,
    avgUnit: '/session',
    popularAreas: ['Full Face', 'Face + Neck', 'Back'],
  },
  {
    value: 'Dermaplaning',
    label: 'Dermaplaning',
    category: 'Skin Treatment',
    defaultUnit: 'per_session',
    unitOptions: ['per_session'],
    unitHint: 'sessions',
    avgNational: 150,
    avgUnit: '/session',
    popularAreas: ['Full Face'],
  },

  // ── Laser ────────────────────────────────────────────────────────────────
  {
    value: 'Laser Hair Removal',
    label: 'Laser Hair Removal',
    category: 'Laser',
    defaultUnit: 'per_session',
    unitOptions: ['per_session', 'flat_package'],
    unitHint: 'sessions',
    avgNational: 250,
    avgUnit: '/session',
    popularAreas: [
      'Underarms', 'Brazilian', 'Bikini', 'Full Legs', 'Half Legs',
      'Full Arms', 'Back', 'Chest', 'Face', 'Full Body',
    ],
  },
  {
    value: 'IPL / Photofacial',
    label: 'IPL / Photofacial',
    category: 'Laser',
    defaultUnit: 'per_session',
    unitOptions: ['per_session', 'flat_package'],
    unitHint: 'sessions',
    avgNational: 350,
    avgUnit: '/session',
    popularAreas: ['Full Face', 'Face + Neck', 'Chest', 'Hands'],
  },
  {
    value: 'Clear + Brilliant',
    label: 'Clear + Brilliant',
    category: 'Laser',
    defaultUnit: 'per_session',
    unitOptions: ['per_session', 'flat_package'],
    unitHint: 'sessions',
    avgNational: 450,
    avgUnit: '/session',
    popularAreas: ['Full Face'],
  },
  {
    value: 'Halo Laser',
    label: 'Halo Laser',
    category: 'Laser',
    defaultUnit: 'per_session',
    unitOptions: ['per_session', 'flat_package'],
    unitHint: 'sessions',
    avgNational: 1200,
    avgUnit: '/session',
    popularAreas: ['Full Face', 'Face + Neck'],
  },
  {
    value: 'Fractional CO2 Laser',
    label: 'Fractional CO2 Laser',
    category: 'Laser',
    defaultUnit: 'per_session',
    unitOptions: ['per_session', 'flat_package'],
    unitHint: 'sessions',
    avgNational: 1500,
    avgUnit: '/session',
    popularAreas: ['Full Face', 'Face + Neck'],
  },

  // ── Body Contouring ──────────────────────────────────────────────────────
  {
    value: 'CoolSculpting',
    label: 'CoolSculpting',
    category: 'Body Contouring',
    defaultUnit: 'per_cycle',
    unitOptions: ['per_cycle', 'flat_package'],
    unitHint: 'cycles',
    avgNational: 800,
    avgUnit: '/cycle',
    popularAreas: ['Abdomen', 'Flanks', 'Inner Thighs', 'Arms', 'Double Chin', 'Back Fat'],
  },
  {
    value: 'Emsculpt NEO',
    label: 'Emsculpt NEO',
    category: 'Body Contouring',
    defaultUnit: 'per_session',
    unitOptions: ['per_session', 'flat_package'],
    unitHint: 'sessions',
    avgNational: 1000,
    avgUnit: '/session',
    popularAreas: ['Abdomen', 'Buttocks', 'Arms', 'Legs', 'Calves'],
  },

  // ── Medical Weight Loss ──────────────────────────────────────────────────
  {
    value: 'Semaglutide (Ozempic / Wegovy)',
    label: 'Semaglutide (Ozempic / Wegovy)',
    category: 'Medical Weight Loss',
    defaultUnit: 'per_session',
    unitOptions: ['per_session', 'flat_package'],
    unitHint: 'monthly / per dose',
    avgNational: 300,
    avgUnit: '/month',
    popularAreas: ['Weight Loss Program'],
  },
  {
    value: 'Tirzepatide (Mounjaro / Zepbound)',
    label: 'Tirzepatide (Mounjaro / Zepbound)',
    category: 'Medical Weight Loss',
    defaultUnit: 'per_session',
    unitOptions: ['per_session', 'flat_package'],
    unitHint: 'monthly / per dose',
    avgNational: 400,
    avgUnit: '/month',
    popularAreas: ['Weight Loss Program'],
  },
  {
    value: 'Compounded Semaglutide',
    label: 'Compounded Semaglutide',
    category: 'Medical Weight Loss',
    defaultUnit: 'per_session',
    unitOptions: ['per_session', 'flat_package'],
    unitHint: 'monthly / per dose',
    avgNational: 200,
    avgUnit: '/month',
    popularAreas: ['Weight Loss Program'],
  },

  // ── Wellness ─────────────────────────────────────────────────────────────
  {
    value: 'IV Therapy',
    label: 'IV Therapy / Drip',
    category: 'Wellness',
    defaultUnit: 'per_session',
    unitOptions: ['per_session'],
    unitHint: 'sessions',
    avgNational: 175,
    avgUnit: '/session',
    popularAreas: ["Myers Cocktail", 'NAD+', 'Hydration', 'Immunity', 'Hangover', 'Beauty'],
  },
  {
    value: 'PRP Injections',
    label: 'PRP / PRF Injections',
    category: 'Wellness',
    defaultUnit: 'per_session',
    unitOptions: ['per_session', 'flat_package'],
    unitHint: 'sessions',
    avgNational: 600,
    avgUnit: '/session',
    popularAreas: ['Under Eyes', 'Full Face', 'Scalp', 'Joints'],
  },
];

// Human-readable labels for each unit type (used in the unit selector buttons)
export const LOG_PROC_UNIT_DISPLAY = {
  per_unit:     'per unit',
  per_syringe:  'per syringe',
  per_vial:     'per vial',
  per_session:  'per session',
  per_area:     'per area',
  per_cycle:    'per cycle',
  flat_package: 'flat rate / package',
};

// Build a category→[proc] map for the dropdown grouping.
// Categories appear in the order first seen in LOG_PROCEDURES.
export function getGroupedProcedures(searchTerm = '') {
  const lower = searchTerm.toLowerCase();
  const cats = new Map();

  for (const proc of LOG_PROCEDURES) {
    const matches =
      !lower ||
      proc.label.toLowerCase().includes(lower) ||
      proc.value.toLowerCase().includes(lower) ||
      proc.category.toLowerCase().includes(lower);
    if (!matches) continue;

    if (!cats.has(proc.category)) cats.set(proc.category, []);
    cats.get(proc.category).push(proc);
  }

  return Array.from(cats.entries()).map(([category, items]) => ({ category, items }));
}

export function getProcedureOption(value) {
  if (!value) return null;
  return LOG_PROCEDURES.find((p) => p.value === value) || null;
}

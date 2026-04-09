/**
 * dosingGuidance.js — Comprehensive dosing data for neurotoxins and fillers,
 * plus two pure utility functions used by PriceCard (inline estimates) and
 * DosingCalculatorSheet (full calculator).
 *
 * Sources: FDA prescribing information, published clinical dosing ranges,
 * and consensus guidelines. All ranges are approximations — actual doses
 * vary by anatomy, injector technique, and patient goals.
 */

// ─── Neurotoxin dosing (Botox-baseline units) ─────────────────────────
export const NEUROTOXIN_DOSING = {
  botox: {
    brandName: 'Botox',
    conversionFactor: 1,
    areas: [
      { id: 'forehead',   label: 'Forehead lines',       unitRange: [10, 30], popular: true },
      { id: 'glabella',   label: 'Frown lines (11s)',     unitRange: [20, 40], popular: true },
      { id: 'crowsFeet',  label: "Crow's feet",           unitRange: [12, 30], popular: true },
      { id: 'browLift',   label: 'Brow lift',             unitRange: [4, 10] },
      { id: 'lipFlip',    label: 'Lip flip',              unitRange: [4, 8] },
      { id: 'bunnyLines', label: 'Bunny lines',           unitRange: [4, 10] },
      { id: 'chinDimpling', label: 'Chin dimpling',       unitRange: [4, 8] },
      { id: 'lipLines',   label: 'Lip lines (smoker lines)', unitRange: [4, 10] },
      { id: 'neckLines',  label: 'Neck lines (platysmal bands)', unitRange: [20, 50] },
      { id: 'neckNefertiti', label: 'Nefertiti lift (jawline)', unitRange: [25, 50], specialist: true },
      { id: 'masseter',   label: 'Masseter (jaw slimming)', unitRange: [25, 50], specialist: true,
        note: 'Higher doses common for TMJ — consult your provider' },
      { id: 'underarmsHyperhidrosis', label: 'Underarms (hyperhidrosis)', unitRange: [50, 100], specialist: true,
        note: 'FDA-approved for excessive sweating' },
    ],
  },

  dysport: {
    brandName: 'Dysport',
    conversionFactor: 2.5,
    conversionNote: '1 Botox unit ≈ 2.5 Dysport units',
    areas: [
      { id: 'forehead',   label: 'Forehead lines',       unitRange: [25, 75], popular: true },
      { id: 'glabella',   label: 'Frown lines (11s)',     unitRange: [50, 100], popular: true },
      { id: 'crowsFeet',  label: "Crow's feet",           unitRange: [30, 75], popular: true },
      { id: 'browLift',   label: 'Brow lift',             unitRange: [10, 25] },
      { id: 'lipFlip',    label: 'Lip flip',              unitRange: [10, 20] },
      { id: 'bunnyLines', label: 'Bunny lines',           unitRange: [10, 25] },
      { id: 'chinDimpling', label: 'Chin dimpling',       unitRange: [10, 20] },
      { id: 'lipLines',   label: 'Lip lines (smoker lines)', unitRange: [10, 25] },
      { id: 'neckLines',  label: 'Neck lines (platysmal bands)', unitRange: [50, 125] },
      { id: 'neckNefertiti', label: 'Nefertiti lift (jawline)', unitRange: [63, 125], specialist: true },
      { id: 'masseter',   label: 'Masseter (jaw slimming)', unitRange: [63, 125], specialist: true,
        note: 'Higher doses common for TMJ — consult your provider' },
      { id: 'underarmsHyperhidrosis', label: 'Underarms (hyperhidrosis)', unitRange: [125, 250], specialist: true,
        note: 'Equivalent to 50-100 Botox units' },
    ],
  },

  xeomin: {
    brandName: 'Xeomin',
    conversionFactor: 1,
    conversionNote: '1:1 with Botox units',
    areas: [
      { id: 'forehead',   label: 'Forehead lines',       unitRange: [10, 30], popular: true },
      { id: 'glabella',   label: 'Frown lines (11s)',     unitRange: [20, 40], popular: true },
      { id: 'crowsFeet',  label: "Crow's feet",           unitRange: [12, 30], popular: true },
      { id: 'browLift',   label: 'Brow lift',             unitRange: [4, 10] },
      { id: 'lipFlip',    label: 'Lip flip',              unitRange: [4, 8] },
      { id: 'bunnyLines', label: 'Bunny lines',           unitRange: [4, 10] },
      { id: 'chinDimpling', label: 'Chin dimpling',       unitRange: [4, 8] },
      { id: 'lipLines',   label: 'Lip lines (smoker lines)', unitRange: [4, 10] },
      { id: 'neckLines',  label: 'Neck lines (platysmal bands)', unitRange: [20, 50] },
      { id: 'neckNefertiti', label: 'Nefertiti lift (jawline)', unitRange: [25, 50], specialist: true },
      { id: 'masseter',   label: 'Masseter (jaw slimming)', unitRange: [25, 50], specialist: true,
        note: 'Higher doses common for TMJ — consult your provider' },
      { id: 'underarmsHyperhidrosis', label: 'Underarms (hyperhidrosis)', unitRange: [50, 100], specialist: true,
        note: 'FDA-approved for excessive sweating' },
    ],
  },

  jeuveau: {
    brandName: 'Jeuveau',
    conversionFactor: 1,
    conversionNote: '1:1 with Botox units',
    areas: [
      { id: 'forehead',   label: 'Forehead lines',       unitRange: [10, 30], popular: true },
      { id: 'glabella',   label: 'Frown lines (11s)',     unitRange: [20, 40], popular: true },
      { id: 'crowsFeet',  label: "Crow's feet",           unitRange: [12, 30], popular: true },
      { id: 'browLift',   label: 'Brow lift',             unitRange: [4, 10] },
      { id: 'lipFlip',    label: 'Lip flip',              unitRange: [4, 8] },
      { id: 'bunnyLines', label: 'Bunny lines',           unitRange: [4, 10] },
      { id: 'chinDimpling', label: 'Chin dimpling',       unitRange: [4, 8] },
      { id: 'lipLines',   label: 'Lip lines (smoker lines)', unitRange: [4, 10] },
      { id: 'neckLines',  label: 'Neck lines (platysmal bands)', unitRange: [20, 50] },
      { id: 'neckNefertiti', label: 'Nefertiti lift (jawline)', unitRange: [25, 50], specialist: true },
      { id: 'masseter',   label: 'Masseter (jaw slimming)', unitRange: [25, 50], specialist: true,
        note: 'Higher doses common for TMJ — consult your provider' },
      { id: 'underarmsHyperhidrosis', label: 'Underarms (hyperhidrosis)', unitRange: [50, 100], specialist: true },
    ],
  },

  daxxify: {
    brandName: 'Daxxify',
    conversionFactor: 1,
    conversionNote: 'FDA-approved for glabella only. Doses similar to Botox.',
    areas: [
      { id: 'glabella', label: 'Frown lines (11s)', unitRange: [40, 40], popular: true,
        note: 'FDA-approved dose is 40 units' },
    ],
  },
};

// ─── Filler dosing (syringe-based) ────────────────────────────────────
export const FILLER_DOSING = {
  lipFiller: {
    displayName: 'Lip Filler',
    unit: 'syringe',
    levels: [
      { label: 'Subtle',   amount: 0.5, description: 'Light enhancement, natural look' },
      { label: 'Moderate', amount: 1,   description: 'Noticeable fullness, most popular' },
      { label: 'Full',     amount: 1.5, description: 'Dramatic volume, may need 2 sessions' },
    ],
  },
  cheekFiller: {
    displayName: 'Cheek Filler',
    unit: 'syringe',
    levels: [
      { label: 'Subtle',   amount: 1,   description: 'Mild lift and contour' },
      { label: 'Moderate', amount: 2,   description: 'Visible cheek volume, most popular' },
      { label: 'Full',     amount: 3,   description: 'Significant volume restoration' },
    ],
  },
  jawlineFiller: {
    displayName: 'Jawline Filler',
    unit: 'syringe',
    levels: [
      { label: 'Subtle',   amount: 1,   description: 'Light definition' },
      { label: 'Moderate', amount: 2,   description: 'Noticeable jawline contour' },
      { label: 'Full',     amount: 3,   description: 'Strong jawline sculpting' },
    ],
  },
  underEyeFiller: {
    displayName: 'Under-Eye Filler',
    unit: 'syringe',
    levels: [
      { label: 'Conservative', amount: 0.5, description: 'Minimal correction per side' },
      { label: 'Standard',     amount: 1,   description: '0.5 mL per side, most common' },
    ],
    headsUp: 'Under-eye filler is an advanced technique. Look for an injector with specific under-eye experience.',
  },
  chinFiller: {
    displayName: 'Chin Filler',
    unit: 'syringe',
    levels: [
      { label: 'Subtle',   amount: 1,   description: 'Mild chin projection' },
      { label: 'Moderate', amount: 1.5, description: 'Noticeable chin enhancement' },
      { label: 'Full',     amount: 2,   description: 'Significant chin augmentation' },
    ],
  },
  noseFiller: {
    displayName: 'Non-Surgical Nose Job',
    unit: 'syringe',
    levels: [
      { label: 'Minor',    amount: 0.5, description: 'Small bump correction' },
      { label: 'Standard', amount: 1,   description: 'Bridge smoothing + tip refinement' },
    ],
    headsUp: 'Nose filler carries higher risk than other areas. Choose an experienced, board-certified injector.',
  },
  templeFiller: {
    displayName: 'Temple Filler',
    unit: 'syringe',
    levels: [
      { label: 'Subtle',   amount: 1,   description: 'Mild temple hollowing correction' },
      { label: 'Moderate', amount: 2,   description: 'Visible volume restoration' },
      { label: 'Full',     amount: 3,   description: 'Full temple rejuvenation' },
    ],
  },
  handFiller: {
    displayName: 'Hand Rejuvenation',
    unit: 'syringe',
    levels: [
      { label: 'Per hand', amount: 1, description: '1 syringe per hand, typical starting point' },
      { label: 'Both hands', amount: 2, description: '1 syringe per hand' },
    ],
  },
  sculptra: {
    displayName: 'Sculptra',
    unit: 'vial',
    levels: [
      { label: '1 vial',  amount: 1, description: 'Single session, mild volume' },
      { label: '2 vials', amount: 2, description: 'Standard single-session dose' },
      { label: '3 vials', amount: 3, description: 'Full treatment (may span sessions)' },
    ],
    headsUp: 'Sculptra works gradually — results build over 2-3 sessions spaced 4-6 weeks apart.',
  },
};

// ─── Mapping from procedure_type + brand → dosing key ─────────────────
const PROCEDURE_MAP = {
  'Botox / Dysport / Xeomin': '__neurotoxin_by_brand__',
  'Jeuveau':       { type: 'neurotoxin', key: 'jeuveau' },
  'Daxxify':       { type: 'neurotoxin', key: 'daxxify' },
  'Botox Lip Flip': { type: 'neurotoxin', key: 'botox' },
  'Lip Filler':    { type: 'filler', key: 'lipFiller' },
  'Cheek Filler':  { type: 'filler', key: 'cheekFiller' },
  'Jawline Filler': { type: 'filler', key: 'jawlineFiller' },
  'Under-Eye Filler': { type: 'filler', key: 'underEyeFiller' },
  'Chin Filler':   { type: 'filler', key: 'chinFiller' },
  'Nose Filler':   { type: 'filler', key: 'noseFiller' },
  'Temple Filler': { type: 'filler', key: 'templeFiller' },
  'Hand Filler':   { type: 'filler', key: 'handFiller' },
  'Sculptra':      { type: 'filler', key: 'sculptra' },
};

const BRAND_TO_SLUG = {
  botox:   'botox',
  dysport: 'dysport',
  xeomin:  'xeomin',
};

export function resolveDosingKey(procedureType, brand) {
  if (!procedureType) return null;
  const entry = PROCEDURE_MAP[procedureType];
  if (!entry) return null;

  if (entry === '__neurotoxin_by_brand__') {
    const slug = brand ? BRAND_TO_SLUG[brand.toLowerCase()] : null;
    return slug
      ? { type: 'neurotoxin', key: slug }
      : { type: 'neurotoxin', key: 'botox' }; // default to Botox
  }
  return entry;
}

// ─── Quick inline estimates (2-3 combos for PriceCard) ────────────────
export function getQuickEstimates(dosingKey, dosingType, unitPrice) {
  if (!unitPrice || unitPrice <= 0) return [];

  if (dosingType === 'neurotoxin') {
    const brand = NEUROTOXIN_DOSING[dosingKey];
    if (!brand) return [];
    const areaMap = {};
    for (const a of brand.areas) areaMap[a.id] = a;

    const forehead = areaMap.forehead;
    const glabella = areaMap.glabella;
    const crows    = areaMap.crowsFeet;

    const combos = [];

    if (forehead) {
      combos.push({
        label: 'Forehead only',
        low:  Math.round(forehead.unitRange[0] * unitPrice),
        high: Math.round(forehead.unitRange[1] * unitPrice),
      });
    }

    if (forehead && glabella) {
      combos.push({
        label: 'Forehead + 11s',
        low:  Math.round((forehead.unitRange[0] + glabella.unitRange[0]) * unitPrice),
        high: Math.round((forehead.unitRange[1] + glabella.unitRange[1]) * unitPrice),
        popular: true,
      });
    }

    if (forehead && glabella && crows) {
      combos.push({
        label: 'Full upper face',
        low:  Math.round((forehead.unitRange[0] + glabella.unitRange[0] + crows.unitRange[0]) * unitPrice),
        high: Math.round((forehead.unitRange[1] + glabella.unitRange[1] + crows.unitRange[1]) * unitPrice),
      });
    }

    return combos;
  }

  if (dosingType === 'filler') {
    const filler = FILLER_DOSING[dosingKey];
    if (!filler) return [];
    return filler.levels.map((lvl, i) => ({
      label: `${lvl.label} (${lvl.amount} ${filler.unit}${lvl.amount !== 1 ? 's' : ''})`,
      low:  Math.round(lvl.amount * unitPrice),
      high: Math.round(lvl.amount * unitPrice),
      popular: i === 1, // middle level is "most popular"
    }));
  }

  return [];
}

/**
 * dosingGuidance.js — Comprehensive dosing data for neurotoxins and fillers,
 * plus two pure utility functions used by PriceCard (inline estimates) and
 * DosingCalculatorSheet (full calculator).
 *
 * All ranges are approximations — actual doses vary by anatomy, injector
 * technique, and patient goals.
 *
 * DOSING GUIDANCE SOURCES
 *
 * FDA Package Inserts (primary):
 * - Botox Cosmetic 2024: accessdata.fda.gov/drugsatfda_docs/label/2024/103000s5316...
 * - Platysma approval Oct 2024: prnewswire.com/news-releases/302280924
 * - Xeomin upper facial lines 2026: pharmacytimes.com/view/fda-approves-incobotulinumtoxina
 *
 * Peer-reviewed medical literature:
 * - Scaglione F. Toxins (Basel) 2016;8(3):65 — conversion ratios PMC4810210
 * - JAAD 2010 — Dysport:Botox ratio debate doi:10.1016/j.jaad.2009.11.021
 * - PMC Aesthetic Medicine myths/realities PMC5821482
 *
 * Leading dermatologist / aesthetic industry sources:
 * - Springer Nature: Botulinum Toxin Treatment in Aesthetic Medicine 2024
 *   doi.org/10.1007/978-3-031-54471-2_13
 * - Cleveland Clinic / Dr. Shilpi Khetarpal MD (board-certified dermatologist)
 *   health.clevelandclinic.org/dysport-vs-botox
 * - TRUE Aesthetic complete neuromodulator guide 2026
 *   true-aesthetic.com/post/thecompleteguide
 * - Skin Spa New York clinical guide, reviewed by Daphne Duren DNP 2026
 *   skinspanewyork.com/blogs/news/botox-vs-dysport-vs-xeomin-in-2026
 *
 * Peel / laser / body:
 * - AAD clinical guidelines (aad.org)
 * - ASDS practice guidelines (asds.net)
 * - ASLMS treatment guidelines (aslms.org)
 */

// ─── Key clinical insight (brand-agnostic) ────────────────────────────
export const KEY_INSIGHT = {
  text: 'The injector matters more than the brand. Results depend on anatomical knowledge, technique, and dosing precision \u2014 not product choice. Always verify board certification.',
  source: 'Skin Spa New York clinical guide, medically reviewed by DNP/RN (2026)',
  sourceUrl: 'skinspanewyork.com/blogs/news/botox-vs-dysport-vs-xeomin-in-2026',
};

// ─── Neurotoxin dosing ───────────────────────────────────────────────
//
// Each brand's `areas` is an object keyed by area ID.
// Per-area fields:
//   label        – display name
//   min / max    – clinical dosing range (units)
//   typical      – most common starting dose
//   firstTimer   – conservative first-session dose
//   fdaApproved  – true if FDA-cleared for this specific indication
//   offLabel     – true if commonly used off-label
//   popular      – (optional) marks top-3 areas
//   specialist   – (optional) requires advanced injector training
//   note         – (optional) clinical context with sources

export const NEUROTOXIN_DOSING = {
  botox: {
    brandName: 'Botox',
    genericName: 'onabotulinumtoxinA',
    conversionFactor: 1,
    areas: {
      forehead: {
        label: 'Forehead lines',
        min: 10, max: 20, typical: 15, firstTimer: 10,
        fdaApproved: false,
        offLabel: true,
        popular: true,
        note: `Horizontal forehead lines. FDA approval is for forehead treated simultaneously with glabella (combined 40 units: 20 forehead + 20 glabella). Standalone forehead is off-label but standard practice. Lower doses preserve natural movement \u2014 brow drop risk with over-treatment.\n\nSource: FDA Botox Cosmetic Prescribing Information 2024\naccessdata.fda.gov/drugsatfda_docs/label/2024/103000s5316...lbl.pdf`,
      },
      glabella: {
        label: 'Frown lines (11s)',
        min: 20, max: 30, typical: 20, firstTimer: 20,
        fdaApproved: true,
        offLabel: false,
        popular: true,
        note: `FDA-approved dose: 20 units across 5 injection sites (4 units each). First area approved for Botox Cosmetic (2002). Higher doses (25\u201330) sometimes used for strong corrugator muscles, but 20 units is the evidence-based starting point.\n\nSource: FDA Botox Cosmetic Prescribing Information`,
      },
      crowsFeet: {
        label: "Crow's feet",
        min: 12, max: 24, typical: 24, firstTimer: 12,
        fdaApproved: true,
        offLabel: false,
        popular: true,
        note: `FDA-approved dose: 24 units total (12 per side, 3 injection sites \u00d7 4 units). Treats lateral canthal lines. FDA approved 2013.\n\nSource: FDA Botox Cosmetic Prescribing Information`,
      },
      browLift: {
        label: 'Brow lift',
        min: 2, max: 10, typical: 4, firstTimer: 2,
        fdaApproved: false,
        offLabel: true,
        note: `Chemical brow lift via lateral brow injection. Small doses (2\u20136 units) at the lateral brow tail relax the orbicularis, allowing the frontalis to lift. Subtle effect \u2014 often combined with forehead and glabella treatment.`,
      },
      lipFlip: {
        label: 'Lip flip',
        min: 4, max: 8, typical: 4, firstTimer: 4,
        fdaApproved: false,
        offLabel: true,
        note: `Injected into the orbicularis oris along the upper lip border. Relaxes the muscle so the upper lip gently rolls outward, showing more vermilion. Very low doses \u2014 not a volume treatment. Effect is subtle. Takes 7\u201314 days.`,
      },
      bunnyLines: {
        label: 'Bunny lines',
        min: 4, max: 10, typical: 6, firstTimer: 4,
        fdaApproved: false,
        offLabel: true,
        note: `Lines on the sides of the nose (nasalis muscle). Often treated alongside glabella to prevent compensation scrunching. Low-dose area.`,
      },
      chinDimpling: {
        label: 'Chin dimpling',
        min: 4, max: 8, typical: 6, firstTimer: 4,
        fdaApproved: false,
        offLabel: true,
        note: `"Peau d'orange" or cobblestone chin from mentalis hyperactivity. Small doses smooth the chin pad. Usually 2 injection points.`,
      },
      lipLines: {
        label: 'Lip lines (smoker lines)',
        min: 4, max: 10, typical: 6, firstTimer: 4,
        fdaApproved: false,
        offLabel: true,
        note: `Perioral lines (vertical lip lines). Very conservative dosing required \u2014 over-treatment can affect speech, drinking, and kissing. Often combined with filler or laser for best results.`,
      },
      platysmaBands: {
        label: 'Platysmal bands (neck lines)',
        min: 25, max: 50, typical: 35, firstTimer: 25,
        fdaApproved: true,
        offLabel: false,
        specialist: true,
        note: `FDA-approved Oct 2024 \u2014 first neurotoxin with four aesthetic indications and first to extend beyond the face. Advanced technique \u2014 verify injector experience.\n\nSource: FDA approval announcement, Oct 2024`,
      },
      neckNefertiti: {
        label: 'Nefertiti lift (jawline)',
        min: 25, max: 50, typical: 40, firstTimer: 25,
        fdaApproved: false,
        offLabel: true,
        specialist: true,
        note: `Injections along the jawline and upper neck relax the platysma's downward pull, sharpening the jaw-neck angle. Advanced technique \u2014 results depend heavily on anatomy and injector skill. Not suitable for all patients.`,
      },
      masseter: {
        label: 'Masseter (jaw slimming)',
        min: 25, max: 50, typical: 40, firstTimer: 25,
        fdaApproved: false,
        offLabel: true,
        specialist: true,
        note: `Per-side dosing. Slims the lower face by relaxing the masseter muscle. Also used therapeutically for TMJ/bruxism (typically higher doses, 30\u201350/side). Full effect takes 4\u20136 weeks as muscle gradually atrophies. May need 2\u20133 sessions for optimal slimming.`,
      },
      underarmsHyperhidrosis: {
        label: 'Underarms (hyperhidrosis)',
        min: 50, max: 100, typical: 100, firstTimer: 50,
        fdaApproved: true,
        offLabel: false,
        specialist: true,
        note: `FDA-approved for severe primary axillary hyperhidrosis (excessive sweating). 50 units per axilla (100 total), injected intradermally at 10\u201315 sites per side. May be covered by insurance with prior authorization. Effects last 6\u201312 months.\n\nSource: FDA Botox Prescribing Information (therapeutic)`,
      },
    },
  },

  dysport: {
    brandName: 'Dysport',
    genericName: 'abobotulinumtoxinA',
    conversionFactor: 2.5,
    conversionToBotox: 2.5,
    conversionNote:
      'Dysport requires more units than Botox for the same effect. ' +
      'The aesthetic medicine standard is 2\u20132.5 Dysport units per 1 Botox unit. ' +
      'Medical/neurological literature suggests 3:1 may be more appropriate for ' +
      'therapeutic indications. The true ratio is debated even among experts \u2014 ' +
      'published studies report ranges from 2:1 to 4:1 depending on anatomy, ' +
      'treatment area, and individual response. The FDA explicitly states ' +
      'neurotoxin units cannot be directly compared between products. ' +
      'Your provider determines actual dosing.',
    conversionSources: [
      'Springer Nature, Botulinum Toxin Treatment in Aesthetic Medicine (2024): "Dysport dosing is generally accepted as 2\u20132.5:1 unit of Botox" doi.org/10.1007/978-3-031-54471-2_13',
      'Cleveland Clinic / Dr. Shilpi Khetarpal, board-certified dermatologist: "rule of thumb is 1 Botox unit = 3 Dysport units" health.clevelandclinic.org/dysport-vs-botox',
      'Scaglione F. Toxins (Basel) 2016;8(3):65 PMC4810210: "3:1 or even lower could be appropriate"',
      'JAAD 2010: "more recently published literature suggests 2:1 to 4:1" doi.org/10.1016/j.jaad.2009.11.021',
      'PMC split-face study: 2.5:1 showed no statistically significant difference vs Botox PMC5821482',
    ],
    areas: {
      forehead: {
        label: 'Forehead lines',
        min: 25, max: 50, typical: 38, firstTimer: 25,
        fdaApproved: false,
        offLabel: true,
        popular: true,
        note: `Off-label for standalone forehead. Conversion: ~2.5\u00d7 Botox units. Dysport diffuses more broadly than Botox \u2014 fewer injection points may be needed, but placement must account for spread.`,
      },
      glabella: {
        label: 'Frown lines (11s)',
        min: 50, max: 75, typical: 50, firstTimer: 50,
        fdaApproved: true,
        offLabel: false,
        popular: true,
        note: `FDA-approved dose: 50 units across 5 injection sites (10 units each). The only FDA-approved cosmetic indication for Dysport (2009).\n\nSource: FDA Dysport Prescribing Information`,
      },
      crowsFeet: {
        label: "Crow's feet",
        min: 30, max: 60, typical: 48, firstTimer: 30,
        fdaApproved: false,
        offLabel: true,
        popular: true,
        note: `Off-label for Dysport. Commonly treated using Botox-equivalent dosing (\u00d72.5 conversion). Broader diffusion may require adjusted placement.`,
      },
      browLift: {
        label: 'Brow lift',
        min: 5, max: 25, typical: 10, firstTimer: 5,
        fdaApproved: false,
        offLabel: true,
      },
      lipFlip: {
        label: 'Lip flip',
        min: 10, max: 20, typical: 10, firstTimer: 10,
        fdaApproved: false,
        offLabel: true,
        note: `Some injectors prefer Botox for lip flip due to Dysport's broader diffusion.`,
      },
      bunnyLines: {
        label: 'Bunny lines',
        min: 10, max: 25, typical: 15, firstTimer: 10,
        fdaApproved: false,
        offLabel: true,
      },
      chinDimpling: {
        label: 'Chin dimpling',
        min: 10, max: 20, typical: 15, firstTimer: 10,
        fdaApproved: false,
        offLabel: true,
      },
      lipLines: {
        label: 'Lip lines (smoker lines)',
        min: 10, max: 25, typical: 15, firstTimer: 10,
        fdaApproved: false,
        offLabel: true,
      },
      platysmaBands: {
        label: 'Platysmal bands (neck lines)',
        min: 63, max: 125, typical: 88, firstTimer: 63,
        fdaApproved: false,
        offLabel: true,
        specialist: true,
      },
      neckNefertiti: {
        label: 'Nefertiti lift (jawline)',
        min: 63, max: 125, typical: 100, firstTimer: 63,
        fdaApproved: false,
        offLabel: true,
        specialist: true,
      },
      masseter: {
        label: 'Masseter (jaw slimming)',
        min: 63, max: 125, typical: 100, firstTimer: 63,
        fdaApproved: false,
        offLabel: true,
        specialist: true,
        note: `Per-side dosing. Some providers prefer Dysport for masseter due to broader diffusion covering the muscle more evenly.`,
      },
      underarmsHyperhidrosis: {
        label: 'Underarms (hyperhidrosis)',
        min: 125, max: 250, typical: 250, firstTimer: 125,
        fdaApproved: false,
        offLabel: true,
        specialist: true,
        note: `Off-label for Dysport (only Botox is FDA-approved for hyperhidrosis). Equivalent to 50\u2013100 Botox units.`,
      },
    },
  },

  xeomin: {
    brandName: 'Xeomin',
    genericName: 'incobotulinumtoxinA',
    conversionFactor: 1,
    // 1:1 with Botox confirmed by multiple sources
    // Source: Scaglione F. Toxins 2016 PMC4810210:
    //   "INCO as effective as ONA at clinical conversion ratio of 1:1"
    // Source: Skin Spa New York clinical guide 2026:
    //   "naked toxin, no complexing proteins, 1:1 dosing with Botox"
    // FDA approved for simultaneous upper facial lines April 2026
    //   pharmacytimes.com/view/fda-approves-incobotulinumtoxina...
    conversionNote: '1:1 with Botox units. "Naked" toxin \u2014 no complexing proteins.',
    areas: {
      forehead: {
        label: 'Forehead lines',
        min: 10, max: 20, typical: 15, firstTimer: 10,
        fdaApproved: true,
        offLabel: false,
        popular: true,
        note: `FDA-approved April 2026 for simultaneous treatment of upper facial lines (forehead + glabella + crow's feet). Xeomin is a "naked" toxin \u2014 no complexing proteins \u2014 which may reduce antibody formation with repeated use.\n\nSource: pharmacytimes.com/view/fda-approves-incobotulinumtoxina`,
      },
      glabella: {
        label: 'Frown lines (11s)',
        min: 20, max: 30, typical: 20, firstTimer: 20,
        fdaApproved: true,
        offLabel: false,
        popular: true,
        note: `FDA-approved dose: 20 units (original 2011 approval). Also included in April 2026 simultaneous upper facial lines approval. Same 1:1 dosing as Botox.`,
      },
      crowsFeet: {
        label: "Crow's feet",
        min: 12, max: 24, typical: 24, firstTimer: 12,
        fdaApproved: true,
        offLabel: false,
        popular: true,
        note: `FDA-approved as part of simultaneous upper facial lines (April 2026). Same 1:1 dosing as Botox.`,
      },
      browLift: {
        label: 'Brow lift',
        min: 2, max: 10, typical: 4, firstTimer: 2,
        fdaApproved: false,
        offLabel: true,
      },
      lipFlip: {
        label: 'Lip flip',
        min: 4, max: 8, typical: 4, firstTimer: 4,
        fdaApproved: false,
        offLabel: true,
      },
      bunnyLines: {
        label: 'Bunny lines',
        min: 4, max: 10, typical: 6, firstTimer: 4,
        fdaApproved: false,
        offLabel: true,
      },
      chinDimpling: {
        label: 'Chin dimpling',
        min: 4, max: 8, typical: 6, firstTimer: 4,
        fdaApproved: false,
        offLabel: true,
      },
      lipLines: {
        label: 'Lip lines (smoker lines)',
        min: 4, max: 10, typical: 6, firstTimer: 4,
        fdaApproved: false,
        offLabel: true,
      },
      platysmaBands: {
        label: 'Platysmal bands (neck lines)',
        min: 25, max: 50, typical: 35, firstTimer: 25,
        fdaApproved: false,
        offLabel: true,
        specialist: true,
      },
      neckNefertiti: {
        label: 'Nefertiti lift (jawline)',
        min: 25, max: 50, typical: 40, firstTimer: 25,
        fdaApproved: false,
        offLabel: true,
        specialist: true,
      },
      masseter: {
        label: 'Masseter (jaw slimming)',
        min: 25, max: 50, typical: 40, firstTimer: 25,
        fdaApproved: false,
        offLabel: true,
        specialist: true,
      },
      underarmsHyperhidrosis: {
        label: 'Underarms (hyperhidrosis)',
        min: 50, max: 100, typical: 100, firstTimer: 50,
        fdaApproved: false,
        offLabel: true,
        specialist: true,
        note: `Off-label for Xeomin (only Botox is FDA-approved for hyperhidrosis). Same 1:1 dosing as Botox.`,
      },
    },
  },

  jeuveau: {
    brandName: 'Jeuveau',
    genericName: 'prabotulinumtoxinA',
    conversionFactor: 1,
    // ~1:1 with Botox, aesthetic-only, FDA glabella only
    // Source: TRUE Aesthetic complete guide 2026:
    //   "aesthetic-only brand, fast onset, precision feel, 1:1 dosing"
    //   "2024 phase 2 trial: 40U showed 183-day median duration vs 149 days at 20U"
    // Source: Skin Spa New York 2026:
    //   "highly aesthetic-focused, often favored by younger neuromodulator patients"
    conversionNote: '1:1 with Botox units. Aesthetic-only brand \u2014 fast onset, precision feel.',
    areas: {
      forehead: {
        label: 'Forehead lines',
        min: 10, max: 20, typical: 15, firstTimer: 10,
        fdaApproved: false,
        offLabel: true,
        popular: true,
      },
      glabella: {
        label: 'Frown lines (11s)',
        min: 20, max: 40, typical: 20, firstTimer: 20,
        fdaApproved: true,
        offLabel: false,
        popular: true,
        note: `FDA-approved for glabella (2019). The first neurotoxin developed exclusively for aesthetics ("#NEWTOX"). 2024 phase 2 trial showed 40U dose achieved 183-day median duration vs 149 days at 20U \u2014 higher-dose protocols may offer longer-lasting results.\n\nSource: TRUE Aesthetic complete guide 2026`,
      },
      crowsFeet: {
        label: "Crow's feet",
        min: 12, max: 24, typical: 24, firstTimer: 12,
        fdaApproved: false,
        offLabel: true,
        popular: true,
      },
      browLift: {
        label: 'Brow lift',
        min: 2, max: 10, typical: 4, firstTimer: 2,
        fdaApproved: false,
        offLabel: true,
      },
      lipFlip: {
        label: 'Lip flip',
        min: 4, max: 8, typical: 4, firstTimer: 4,
        fdaApproved: false,
        offLabel: true,
      },
      bunnyLines: {
        label: 'Bunny lines',
        min: 4, max: 10, typical: 6, firstTimer: 4,
        fdaApproved: false,
        offLabel: true,
      },
      chinDimpling: {
        label: 'Chin dimpling',
        min: 4, max: 8, typical: 6, firstTimer: 4,
        fdaApproved: false,
        offLabel: true,
      },
      lipLines: {
        label: 'Lip lines (smoker lines)',
        min: 4, max: 10, typical: 6, firstTimer: 4,
        fdaApproved: false,
        offLabel: true,
      },
      platysmaBands: {
        label: 'Platysmal bands (neck lines)',
        min: 25, max: 50, typical: 35, firstTimer: 25,
        fdaApproved: false,
        offLabel: true,
        specialist: true,
      },
      neckNefertiti: {
        label: 'Nefertiti lift (jawline)',
        min: 25, max: 50, typical: 40, firstTimer: 25,
        fdaApproved: false,
        offLabel: true,
        specialist: true,
      },
      masseter: {
        label: 'Masseter (jaw slimming)',
        min: 25, max: 50, typical: 40, firstTimer: 25,
        fdaApproved: false,
        offLabel: true,
        specialist: true,
      },
      underarmsHyperhidrosis: {
        label: 'Underarms (hyperhidrosis)',
        min: 50, max: 100, typical: 100, firstTimer: 50,
        fdaApproved: false,
        offLabel: true,
        specialist: true,
      },
    },
  },

  daxxify: {
    brandName: 'Daxxify',
    genericName: 'daxibotulinumtoxinA',
    conversionFactor: 1,
    conversionNote: 'FDA-approved for glabella only. Lasts ~6 months (vs ~3 for others).',
    areas: {
      glabella: {
        label: 'Frown lines (11s)',
        min: 40, max: 40, typical: 40, firstTimer: 40,
        fdaApproved: true,
        offLabel: false,
        popular: true,
        note: `FDA-approved dose: 40 units (2022). Uses a novel peptide stabilizer instead of human serum albumin. Key differentiator: duration of ~6 months vs ~3\u20134 months for other neurotoxins.\n\nSource: FDA Daxxify Prescribing Information`,
      },
    },
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
    headsUp: 'Sculptra works gradually \u2014 results build over 2-3 sessions spaced 4-6 weeks apart.',
  },
};

// ─── Goal-based dosing multipliers ────────────────────────────────────
//
// These exports power the 5-step dosing wizard. Each multiplier adjusts
// the base unit ranges from NEUROTOXIN_DOSING above.

export const GOAL_LEVELS = {
  preventative: {
    label: 'Preventative / Baby Botox',
    description: 'Subtle relaxation, full natural movement maintained.',
    multiplier: 0.6,
  },
  natural: {
    label: 'Natural / Softened',
    description: 'Lines noticeably softer, some natural movement preserved.',
    multiplier: 0.85,
  },
  moderate: {
    label: 'Moderate / Balanced',
    description: 'Clear smoothing with limited movement.',
    multiplier: 1.0,
  },
  significant: {
    label: 'Significant / Dramatic',
    description: 'Maximum smoothing, minimal muscle movement.',
    multiplier: 1.35,
  },
};

export const GENDER_MULTIPLIERS = {
  female: { label: 'Female', multiplier: 1.0 },
  male: {
    label: 'Male',
    multiplier: 1.6,
    clinicalNote:
      'Men require ~1.5–2× more units due to larger, stronger facial muscles. ' +
      'Source: APT Injection Training, Dermatology Associates of Rochester',
  },
};

export const EXPERIENCE_MULTIPLIERS = {
  first_time: {
    label: 'First time ever',
    multiplier: 0.8,
    headsUp: 'First-time patients receive conservative doses. You can top up after 2 weeks.',
  },
  some_experience: {
    label: 'Had it before (1–3 times)',
    multiplier: 1.0,
  },
  experienced: {
    label: 'Regular (4+ treatments)',
    multiplier: 1.1,
  },
};

export const MUSCLE_STRENGTH = {
  fine: {
    label: 'Fine / Delicate features',
    description: 'Lines are subtle, face is not very expressive',
    multiplier: 0.85,
  },
  average: {
    label: 'Average',
    description: 'Typical expressiveness, moderate line depth',
    multiplier: 1.0,
  },
  strong: {
    label: 'Strong / Expressive',
    description: 'Very expressive face, deep lines when moving',
    multiplier: 1.25,
  },
};

// Flat list of treatment areas (derived from Botox as baseline) for the
// wizard area-picker step. Each entry mirrors the Botox area data but adds
// a `category` field for grouping in the UI.
export const TREATMENT_AREAS = (() => {
  const botox = NEUROTOXIN_DOSING.botox.areas;
  const cats = {
    forehead: 'upper_face', glabella: 'upper_face', crowsFeet: 'upper_face', browLift: 'upper_face',
    lipFlip: 'mid_face', bunnyLines: 'mid_face', lipLines: 'mid_face',
    chinDimpling: 'lower_face',
    masseter: 'jaw_neck', platysmaBands: 'jaw_neck', neckNefertiti: 'jaw_neck',
    underarmsHyperhidrosis: 'body',
  };
  const result = {};
  for (const [id, area] of Object.entries(botox)) {
    result[id] = { ...area, category: cats[id] || 'other' };
  }
  return result;
})();

export const AREA_CATEGORIES = [
  { key: 'upper_face', label: 'Upper Face' },
  { key: 'mid_face', label: 'Mid Face' },
  { key: 'lower_face', label: 'Lower Face' },
  { key: 'jaw_neck', label: 'Jaw & Neck' },
  { key: 'body', label: 'Body' },
];

export const POPULAR_COMBOS = [
  {
    id: 'upper_face_basics',
    label: '✨ Upper face basics',
    description: "Forehead + 11s + Crow's feet — most popular combination",
    areas: ['forehead', 'glabella', 'crowsFeet'],
  },
  {
    id: 'frown_only',
    label: '😤 11s only',
    description: 'Just the frown lines between the brows',
    areas: ['glabella'],
  },
  {
    id: 'preventative_starter',
    label: '🌱 Preventative starter',
    description: 'Low-dose forehead + 11s to prevent lines from deepening',
    areas: ['forehead', 'glabella'],
    recommendedGoal: 'preventative',
  },
  {
    id: 'jaw_treatment',
    label: '🦷 Jaw & TMJ',
    description: 'Masseter for jaw slimming or teeth grinding relief',
    areas: ['masseter'],
  },
  {
    id: 'full_upper_face',
    label: '💎 Full upper face',
    description: "Forehead + 11s + Crow's feet + Brow lift",
    areas: ['forehead', 'glabella', 'crowsFeet', 'browLift'],
  },
];

// Product list for the wizard product picker (step 1)
export const PRODUCTS = Object.fromEntries(
  Object.entries(NEUROTOXIN_DOSING).map(([key, val]) => [
    key,
    {
      key,
      name: val.brandName,
      genericName: val.genericName,
      conversionFactor: val.conversionFactor,
      conversionNote: val.conversionNote || null,
    },
  ]),
);

// ─── Mapping from procedure_type + brand → dosing key ─────────────────
const PROCEDURE_MAP = {
  'Botox / Dysport / Xeomin': '__neurotoxin_by_brand__', // legacy grouped name — backward compat
  'Botox':         { type: 'neurotoxin', key: 'botox' },
  'Dysport':       { type: 'neurotoxin', key: 'dysport' },
  'Xeomin':        { type: 'neurotoxin', key: 'xeomin' },
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
    const areas = brand.areas;
    const forehead = areas.forehead;
    const glabella = areas.glabella;
    const crows    = areas.crowsFeet;

    const combos = [];

    if (forehead) {
      combos.push({
        label: 'Forehead only',
        low:  Math.round(forehead.min * unitPrice),
        high: Math.round(forehead.max * unitPrice),
        typical: Math.round(forehead.typical * unitPrice),
      });
    }

    if (forehead && glabella) {
      combos.push({
        label: 'Forehead + 11s',
        low:  Math.round((forehead.min + glabella.min) * unitPrice),
        high: Math.round((forehead.max + glabella.max) * unitPrice),
        typical: Math.round((forehead.typical + glabella.typical) * unitPrice),
        popular: true,
      });
    }

    if (forehead && glabella && crows) {
      combos.push({
        label: 'Full upper face',
        low:  Math.round((forehead.min + glabella.min + crows.min) * unitPrice),
        high: Math.round((forehead.max + glabella.max + crows.max) * unitPrice),
        typical: Math.round((forehead.typical + glabella.typical + crows.typical) * unitPrice),
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
      typical: Math.round(lvl.amount * unitPrice),
      popular: i === 1, // middle level is "most popular"
    }));
  }

  return [];
}

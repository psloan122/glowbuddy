/**
 * Price normalization for GlowBuddy.
 *
 * Goal: render apples-to-apples comparisons across providers regardless of
 * how their prices are stored (per-unit, flat-rate area, per-syringe, package).
 * Without this layer a $200 forehead area looks more expensive than a $12/unit
 * price even though it's actually $10/unit equivalent.
 *
 * NOTE on language: this is intentionally plain JavaScript (the project is
 * Vite + JSX, not TypeScript). The shape of the listing argument is documented
 * in the JSDoc below.
 *
 * Schema notes (the actual provider_pricing columns):
 *   price_label    — what the spec calls `price_type`
 *                    ('per_unit' | 'per_syringe' | 'per_session' | 'flat_rate_area' |
 *                     'per_treatment' | 'package' | 'flat' | 'per_month' | 'per_dose' | …)
 *   treatment_area — what the spec calls `area_label` (e.g. 'forehead', '11s', 'lip flip')
 *   units_or_volume — freeform text like '20 units', '2 syringes', '0.5 ml'
 *   price          — integer dollars
 *
 * IMPORTANT RULES enforced here:
 *   1. comparableValue is null when we cannot make a fair comparison
 *   2. isEstimate=true whenever we calculated a per-unit number from a flat
 *      rate; UI must show a (~) prefix and an info icon
 *   3. Per-unit and area-rate prices are NEVER blended
 */

// ── Botox / neurotoxin standard unit counts per treatment area ──
// Sourced from common consumer guidance (Allergan, RealSelf, Clinics).
// These are typical mid-range counts used to estimate per-unit equivalents
// from flat-rate area pricing. Values are intentionally conservative.
export const BOTOX_AREA_UNITS = {
  forehead: 20,
  'forehead lines': 20,
  glabella: 20,
  '11s': 20,
  "11's": 20,
  frown: 20,
  'frown lines': 20,
  'crows feet': 24,
  "crow's feet": 24,
  'crow feet': 24,
  'bunny lines': 10,
  'lip flip': 4,
  'gummy smile': 6,
  'eyebrow lift': 6,
  'brow lift': 6,
  'masseter': 50,
  'jaw': 50,
  'jawline': 50,
  'chin': 8,
  'dimpled chin': 8,
  'neck bands': 30,
  'platysmal bands': 30,
  'underarm': 100,
  'underarms': 100,
  'hyperhidrosis': 100,
  '2 areas': 44,
  'two areas': 44,
  '3 areas': 64,
  'three areas': 64,
  'full face': 64,
};

// Aliases / loose matches checked when an exact lookup misses.
// Each entry: [substring -> standard key].
const BOTOX_AREA_ALIASES = [
  ['forehead', 'forehead'],
  ['glabella', 'glabella'],
  ["11's", '11s'],
  ['11s', '11s'],
  ['frown', 'frown'],
  ['crow', 'crows feet'],
  ['bunny', 'bunny lines'],
  ['lip flip', 'lip flip'],
  ['gummy', 'gummy smile'],
  ['brow lift', 'brow lift'],
  ['eyebrow', 'brow lift'],
  ['masseter', 'masseter'],
  ['jawline', 'jawline'],
  ['jaw', 'jaw'],
  ['chin', 'chin'],
  ['neck band', 'neck bands'],
  ['platysmal', 'platysmal bands'],
  ['underarm', 'underarm'],
  ['hyperhidrosis', 'hyperhidrosis'],
  ['full face', 'full face'],
  ['3 areas', '3 areas'],
  ['three areas', 'three areas'],
  ['2 areas', '2 areas'],
  ['two areas', 'two areas'],
];

// Procedures we recognize as neurotoxins. Loose match against procedure_type.
function isNeurotoxin(procedureType) {
  if (!procedureType) return false;
  const t = String(procedureType).toLowerCase();
  return (
    t.includes('botox') ||
    t.includes('dysport') ||
    t.includes('xeomin') ||
    t.includes('jeuveau') ||
    t.includes('daxxify') ||
    t.includes('neurotoxin') ||
    t.includes('botulinum') ||
    t.includes('neuromodulator')
  );
}

function isFiller(procedureType) {
  if (!procedureType) return false;
  const t = String(procedureType).toLowerCase();
  return (
    t.includes('filler') ||
    t.includes('juvederm') ||
    t.includes('restylane') ||
    t.includes('rha') ||
    t.includes('versa') ||
    t.includes('belotero')
  );
}

function isWeightLoss(procedureType) {
  if (!procedureType) return false;
  const t = String(procedureType).toLowerCase();
  return (
    t.includes('glp') ||
    t.includes('semaglutide') ||
    t.includes('tirzepatide') ||
    t.includes('ozempic') ||
    t.includes('wegovy') ||
    t.includes('mounjaro') ||
    t.includes('weight loss')
  );
}

function isLaser(procedureType) {
  if (!procedureType) return false;
  const t = String(procedureType).toLowerCase();
  return (
    t.includes('laser') ||
    t.includes('ipl') ||
    t.includes('bbl') ||
    t.includes('halo') ||
    t.includes('moxi') ||
    t.includes('clear + brilliant') ||
    t.includes('co2') ||
    t.includes('co₂') ||
    t.includes('resurfacing')
  );
}

// Look up the standard unit count for a Botox treatment area.
// Returns null when we have no confident estimate.
export function lookupBotoxAreaUnits(areaLabel) {
  if (!areaLabel) return null;
  const k = String(areaLabel).toLowerCase().trim();
  if (!k) return null;
  if (BOTOX_AREA_UNITS[k] != null) return BOTOX_AREA_UNITS[k];
  // Fall back to substring aliases
  for (const [needle, std] of BOTOX_AREA_ALIASES) {
    if (k.includes(needle)) return BOTOX_AREA_UNITS[std];
  }
  return null;
}

// Pull "N syringe(s)" or "N units" from freeform units_or_volume text.
// Returns null when nothing parseable.
export function parseUnitsFromText(text) {
  if (!text) return null;
  const t = String(text).toLowerCase();
  const syr = t.match(/(\d+(?:\.\d+)?)\s*(?:syringe|syringes)/);
  if (syr) return { kind: 'syringe', count: Number(syr[1]) };
  const units = t.match(/(\d+(?:\.\d+)?)\s*(?:unit|units|u\b)/);
  if (units) return { kind: 'unit', count: Number(units[1]) };
  const session = t.match(/(\d+)\s*(?:session|sessions|treatment|treatments)/);
  if (session) return { kind: 'session', count: Number(session[1]) };
  const ml = t.match(/(\d+(?:\.\d+)?)\s*ml/);
  if (ml) return { kind: 'ml', count: Number(ml[1]) };
  return null;
}

function fmtMoney(n) {
  if (n == null || !Number.isFinite(n)) return '--';
  if (Number.isInteger(n)) return `$${n.toLocaleString()}`;
  return `$${n.toFixed(2)}`;
}

function roundCents(n) {
  return Math.round(n * 100) / 100;
}

/**
 * @typedef {Object} ProviderPriceListing
 * @property {string} [procedure_type]   - e.g. "Botox / Dysport / Xeomin"
 * @property {number|string} price       - integer dollars
 * @property {string} [price_label]      - per_unit | flat_rate_area | per_syringe | …
 * @property {string} [treatment_area]   - forehead, glabella, 11s, lip flip, …
 * @property {string} [units_or_volume]  - freeform text like "20 units", "2 syringes"
 *
 * @typedef {Object} NormalizedPrice
 * @property {string} displayPrice       - what to show the user
 * @property {number|null} comparableValue - sortable per-unit value, null when uncomparable
 * @property {boolean} isEstimate        - true if comparableValue was calculated
 * @property {string} compareUnit        - "per unit" | "per syringe" | "per session" | "per month" | ""
 * @property {string} tooltip            - explanation on hover
 * @property {('per_unit'|'per_syringe'|'per_session'|'per_month'|'flat_area'|'flat_treatment'|'package'|'unknown')} category - normalized bucket
 */

const NULL_RESULT = (price, label) => ({
  displayPrice: price > 0 ? `${fmtMoney(price)}${label ? ` / ${label}` : ''}` : '--',
  comparableValue: null,
  isEstimate: false,
  compareUnit: '',
  tooltip: 'Price type unspecified — cannot compare to per-unit pricing.',
  category: 'unknown',
});

/**
 * Normalize a single provider_pricing row for display.
 *
 * @param {ProviderPriceListing} listing
 * @returns {NormalizedPrice}
 */
export function normalizePrice(listing) {
  if (!listing) return NULL_RESULT(0, '');
  const price = Number(listing.price);
  if (!Number.isFinite(price) || price <= 0) return NULL_RESULT(0, '');

  const procedureType = listing.procedure_type || '';
  const label = String(listing.price_label || '').toLowerCase().trim();
  const area = listing.treatment_area || null;
  const unitsText = listing.units_or_volume || null;

  // ── BOTOX / NEUROTOXINS ──
  if (isNeurotoxin(procedureType)) {
    if (label === 'per_unit') {
      return {
        displayPrice: `${fmtMoney(price)} / unit`,
        comparableValue: price,
        isEstimate: false,
        compareUnit: 'per unit',
        tooltip: 'Price per unit of Botox/Dysport/Xeomin.',
        category: 'per_unit',
      };
    }
    if (label === 'flat_rate_area' || label === 'per_treatment' || label === 'flat') {
      const stdUnits = lookupBotoxAreaUnits(area);
      if (stdUnits && stdUnits > 0) {
        const estPerUnit = roundCents(price / stdUnits);
        return {
          displayPrice: `${fmtMoney(price)} area (~${fmtMoney(estPerUnit)}/unit est.)`,
          comparableValue: estPerUnit,
          isEstimate: true,
          compareUnit: 'per unit',
          tooltip: `This provider charges ${fmtMoney(price)} for the ${area} area (typically ${stdUnits} units), estimated ${fmtMoney(estPerUnit)}/unit. Actual unit count may vary by provider.`,
          category: 'per_unit',
        };
      }
      // Unknown area — cannot estimate
      const labelText = area ? `${area}` : 'area';
      return {
        displayPrice: `${fmtMoney(price)} / ${labelText}`,
        comparableValue: null,
        isEstimate: false,
        compareUnit: '',
        tooltip:
          'Flat rate for treatment area — units not specified, cannot compare to per-unit pricing.',
        category: 'flat_area',
      };
    }
  }

  // ── FILLERS ──
  if (isFiller(procedureType)) {
    if (label === 'per_syringe') {
      return {
        displayPrice: `${fmtMoney(price)} / syringe`,
        comparableValue: price,
        isEstimate: false,
        compareUnit: 'per syringe',
        tooltip: 'Price per syringe of dermal filler.',
        category: 'per_syringe',
      };
    }
    if (label === 'flat' || label === 'package' || label === 'per_treatment') {
      const parsed = parseUnitsFromText(unitsText);
      if (parsed && parsed.kind === 'syringe' && parsed.count > 0) {
        const perSyringe = roundCents(price / parsed.count);
        return {
          displayPrice: `${fmtMoney(price)} (${parsed.count} syringes)`,
          comparableValue: perSyringe,
          isEstimate: true,
          compareUnit: 'per syringe',
          tooltip: `Package price — ${fmtMoney(perSyringe)} per syringe equivalent.`,
          category: 'per_syringe',
        };
      }
      return {
        displayPrice: `${fmtMoney(price)} / treatment`,
        comparableValue: null,
        isEstimate: false,
        compareUnit: '',
        tooltip:
          'Filler treatment price — syringe count not specified, cannot compare to per-syringe pricing.',
        category: 'flat_treatment',
      };
    }
  }

  // ── GLP-1 / WEIGHT LOSS ──
  if (isWeightLoss(procedureType)) {
    if (label === 'per_month' || label === 'monthly') {
      return {
        displayPrice: `${fmtMoney(price)} / month`,
        comparableValue: price,
        isEstimate: false,
        compareUnit: 'per month',
        tooltip: 'Monthly cost of GLP-1 medication.',
        category: 'per_month',
      };
    }
    if (label === 'per_vial' || label === 'per_dose') {
      return {
        displayPrice: `${fmtMoney(price)} / dose`,
        comparableValue: null,
        isEstimate: false,
        compareUnit: '',
        tooltip:
          'Per-dose price — monthly cost depends on dosing frequency, not directly comparable to monthly plans.',
        category: 'per_month',
      };
    }
  }

  // ── LASER / SESSIONS ──
  if (isLaser(procedureType)) {
    if (label === 'per_session') {
      return {
        displayPrice: `${fmtMoney(price)} / session`,
        comparableValue: price,
        isEstimate: false,
        compareUnit: 'per session',
        tooltip: 'Price per laser session.',
        category: 'per_session',
      };
    }
    if (label === 'package' || label === 'flat') {
      const parsed = parseUnitsFromText(unitsText);
      if (parsed && parsed.kind === 'session' && parsed.count > 0) {
        const perSession = roundCents(price / parsed.count);
        return {
          displayPrice: `${fmtMoney(price)} / ${parsed.count}-session package (~${fmtMoney(perSession)}/session)`,
          comparableValue: perSession,
          isEstimate: true,
          compareUnit: 'per session',
          tooltip: `Package of ${parsed.count} sessions — estimated ${fmtMoney(perSession)} per session.`,
          category: 'per_session',
        };
      }
    }
  }

  // ── GENERIC FALLBACKS by price_label ──
  if (label === 'per_unit') {
    return {
      displayPrice: `${fmtMoney(price)} / unit`,
      comparableValue: price,
      isEstimate: false,
      compareUnit: 'per unit',
      tooltip: 'Per-unit pricing.',
      category: 'per_unit',
    };
  }
  if (label === 'per_syringe') {
    return {
      displayPrice: `${fmtMoney(price)} / syringe`,
      comparableValue: price,
      isEstimate: false,
      compareUnit: 'per syringe',
      tooltip: 'Per-syringe pricing.',
      category: 'per_syringe',
    };
  }
  if (label === 'per_session') {
    return {
      displayPrice: `${fmtMoney(price)} / session`,
      comparableValue: price,
      isEstimate: false,
      compareUnit: 'per session',
      tooltip: 'Per-session pricing.',
      category: 'per_session',
    };
  }
  if (label === 'per_month') {
    return {
      displayPrice: `${fmtMoney(price)} / month`,
      comparableValue: price,
      isEstimate: false,
      compareUnit: 'per month',
      tooltip: 'Monthly pricing.',
      category: 'per_month',
    };
  }
  if (label === 'flat_rate_area') {
    return {
      displayPrice: `${fmtMoney(price)} / area`,
      comparableValue: null,
      isEstimate: false,
      compareUnit: '',
      tooltip:
        'Flat rate for treatment area — units not specified, cannot compare to per-unit pricing.',
      category: 'flat_area',
    };
  }

  // Truly unknown
  return NULL_RESULT(price, label);
}

// Below this per-unit price, the row is almost certainly Dysport or Xeomin
// (both are typically 1/3 the per-unit price of Botox). Used by the
// inferNeurotoxinBrand display helper.
const NEUROTOXIN_BUDGET_THRESHOLD = 8;

/**
 * Decide what brand label to show for a neurotoxin row.
 *
 *   1. If `brand` is set on the row → use it directly (isInferred=false)
 *   2. If no brand AND we have a per-unit comparable value:
 *      - < $8/unit → "Dysport / Xeomin est." (with explanatory tooltip)
 *      - >= $8/unit → "Botox / neurotoxin"
 *   3. If no brand AND no per-unit value → "Botox / neurotoxin" (generic)
 *
 * Returns null when the row isn't a neurotoxin (caller should not render).
 *
 * @param {Object} args
 * @param {string} args.procedureType
 * @param {string|null} args.brand
 * @param {number|null} args.perUnitPrice
 * @returns {{label: string, isInferred: boolean, tooltip: string}|null}
 */
export function inferNeurotoxinBrand({ procedureType, brand, perUnitPrice }) {
  if (!isNeurotoxin(procedureType)) return null;

  if (brand) {
    return {
      label: brand,
      isInferred: false,
      tooltip: `Provider listed this as ${brand}.`,
    };
  }

  const valid =
    perUnitPrice != null && Number.isFinite(perUnitPrice) && perUnitPrice > 0;

  if (valid && perUnitPrice < NEUROTOXIN_BUDGET_THRESHOLD) {
    return {
      label: 'Dysport / Xeomin est.',
      isInferred: true,
      tooltip:
        'This may be Dysport or Xeomin pricing. Botox typically costs more per unit.',
    };
  }

  return {
    label: 'Botox / neurotoxin',
    isInferred: true,
    tooltip:
      'Brand not specified by the provider — most clinics in this price range carry Botox.',
  };
}

/**
 * Map pin label rules:
 *   - Only show a chip when comparableValue is not null AND < 500
 *   - Use tilde prefix when isEstimate is true
 *   - Returns null if no pin label should be shown
 */
export function pinLabelFromNormalized(normalized) {
  if (!normalized) return null;
  const v = normalized.comparableValue;
  if (v == null || !Number.isFinite(v) || v <= 0 || v >= 500) return null;
  const prefix = normalized.isEstimate ? '~' : '';
  // Short suffix for the map pin
  if (normalized.compareUnit === 'per unit') return `${prefix}${fmtMoney(v)}/u`;
  if (normalized.compareUnit === 'per syringe') return `${prefix}${fmtMoney(v)}/syr`;
  if (normalized.compareUnit === 'per session') return `${prefix}${fmtMoney(v)}/sess`;
  if (normalized.compareUnit === 'per month') return `${prefix}${fmtMoney(v)}/mo`;
  return `${prefix}${fmtMoney(v)}`;
}

/**
 * Pick the best per-unit-equivalent listing for map pins from a set of
 * listings for one provider. Prefers direct (non-estimate) per-unit prices,
 * then estimated per-unit prices, then nothing. Always picks the lowest
 * comparableValue within the chosen tier.
 */
export function bestPinListing(listings) {
  if (!Array.isArray(listings) || listings.length === 0) return null;
  let bestDirect = null;
  let bestEstimate = null;
  for (const l of listings) {
    const n = normalizePrice(l);
    const v = n.comparableValue;
    if (v == null || v <= 0 || v >= 500) continue;
    if (!n.isEstimate) {
      if (!bestDirect || v < bestDirect.comparableValue) bestDirect = n;
    } else {
      if (!bestEstimate || v < bestEstimate.comparableValue) bestEstimate = n;
    }
  }
  return bestDirect || bestEstimate || null;
}

/**
 * Group provider_pricing rows for display on a provider profile.
 * Returns:
 *   {
 *     [procedure_type]: {
 *       perUnit: [normalized rows],   // direct per_unit / per_syringe / per_session
 *       area:    [normalized rows],   // flat_rate_area, package, etc.
 *       other:   [normalized rows],   // anything we couldn't categorize
 *     }
 *   }
 */
export function groupForProviderDisplay(listings) {
  const result = {};
  for (const row of listings || []) {
    const proc = row.procedure_type || 'Other';
    if (!result[proc]) result[proc] = { perUnit: [], area: [], other: [] };
    const normalized = normalizePrice(row);
    const enriched = { ...row, normalized };
    if (
      normalized.category === 'per_unit' ||
      normalized.category === 'per_syringe' ||
      normalized.category === 'per_session' ||
      normalized.category === 'per_month'
    ) {
      // Direct per-unit pricing only — estimates from area go in the area bucket
      if (!normalized.isEstimate) {
        result[proc].perUnit.push(enriched);
      } else {
        result[proc].area.push(enriched);
      }
    } else if (normalized.category === 'flat_area' || normalized.category === 'flat_treatment') {
      result[proc].area.push(enriched);
    } else {
      result[proc].other.push(enriched);
    }
  }
  return result;
}

/**
 * Tabulate normalization categories for a set of listings.
 * Used by the summary script to print the requested distribution.
 */
export function tabulateCategories(listings) {
  const stats = {
    'per_unit (direct)': 0,
    'per_unit (estimated from area)': 0,
    'area only (no estimate possible)': 0,
    per_syringe: 0,
    per_session: 0,
    package: 0,
    'cannot display': 0,
  };
  for (const row of listings || []) {
    const n = normalizePrice(row);
    if (n.category === 'per_unit' && !n.isEstimate) stats['per_unit (direct)'] += 1;
    else if (n.category === 'per_unit' && n.isEstimate) stats['per_unit (estimated from area)'] += 1;
    else if (n.category === 'per_syringe' && !n.isEstimate) stats.per_syringe += 1;
    else if (n.category === 'per_syringe' && n.isEstimate) stats.package += 1;
    else if (n.category === 'per_session' && !n.isEstimate) stats.per_session += 1;
    else if (n.category === 'per_session' && n.isEstimate) stats.package += 1;
    else if (n.category === 'flat_area') stats['area only (no estimate possible)'] += 1;
    else if (n.category === 'flat_treatment') stats['area only (no estimate possible)'] += 1;
    else stats['cannot display'] += 1;
  }
  return stats;
}

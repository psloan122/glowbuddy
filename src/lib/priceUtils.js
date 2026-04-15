/**
 * Price display for Know Before You Glow.
 *
 * Simplified for the initial seeded dataset: we only render prices we are
 * certain about. Anything other than a confirmed unit / syringe / session /
 * month row is suppressed — the DB layer hides these via
 * display_suppressed=true (migration 053) and this file returns null for
 * anything that sneaks through.
 *
 * NOTE: this module intentionally no longer estimates per-unit prices from
 * flat-rate area prices (e.g. "$200/forehead" → ~$10/unit). That logic was
 * removed in the April-2026 cleanup pass; any such row now lives behind
 * display_suppressed=true in the DB and never reaches this layer. The
 * `isEstimate` and area-lookup tables were deleted along with it.
 *
 * Schema columns used (from provider_pricing):
 *   price_label    — unit / syringe / session / month enum values
 *   treatment_area — 'forehead', '11s', 'lip flip', … (display label only)
 *   units_or_volume — freeform "20 units", "2 syringes", …
 *   price          — integer dollars
 */

import { UNIT } from '../utils/formatPricingUnit';

// Procedures we recognize as neurotoxins. Kept so callers (e.g.
// inferNeurotoxinBrand) can still identify the category from a freeform
// procedure_type string.
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

function fmtMoney(n) {
  if (n == null || !Number.isFinite(n)) return '--';
  if (Number.isInteger(n)) return `$${n.toLocaleString()}`;
  return `$${n.toFixed(2)}`;
}

/**
 * @typedef {Object} ProviderPriceListing
 * @property {string} [procedure_type]
 * @property {number|string} price         - integer dollars
 * @property {string} [price_label]        - UNIT enum value (unit / syringe / session / month / …)
 * @property {string} [treatment_area]
 * @property {string} [units_or_volume]
 *
 * @typedef {Object} NormalizedPrice
 * @property {string} displayPrice       - what to show the user (e.g. "$12 / unit")
 * @property {number|null} comparableValue - sortable numeric value, null when unshowable
 * @property {string} compareUnit        - "per unit" | "per syringe" | "per session" | "per month" | "per area" | ""
 * @property {string} category - UNIT enum value or 'flat_rate_area' or 'hidden'
 */

// Real-world per-unit ceiling for every neurotoxin brand. Botox is
// typically $12-15/unit, Dysport/Xeomin/Jeuveau/Daxxify all sit
// $8-15/unit. Anything above this on a unit-priced row is almost
// certainly a flat-rate area price (e.g. "$425/forehead") mislabeled.
// We surface those rows as "per area" instead so they don't dominate
// the per-unit comparison.
const NEUROTOXIN_PER_UNIT_MAX = 50;

const HIDDEN = Object.freeze({
  displayPrice: '',
  comparableValue: null,
  compareUnit: '',
  category: 'hidden',
  confidenceTier: null,
  unitSubtext: '',
});

// ── Confidence tier config ──────────────────────────────────────────
// 1=receipt_verified, 2=provider_listed, 3=scraped_unit_verified,
// 4=scraped_unit_inferred, 5=community_submitted
export const CONFIDENCE_TIERS = {
  1: { label: 'Receipt verified',   color: 'green',  showDisclaimer: false },
  2: { label: 'Provider listed',    color: 'green',  showDisclaimer: false },
  3: { label: 'Price on website',   color: 'yellow', showDisclaimer: false },
  4: { label: 'Estimated',          color: 'gray',   showDisclaimer: true  },
  5: { label: 'Community reported', color: 'gray',   showDisclaimer: false },
};

export const TIER_DISCLAIMER =
  "Price scraped from provider\u2019s website. Unit type estimated \u2014 contact provider to confirm exact pricing.";

// ── Display guards (last line of defense) ───────────────────────────
// Per-brand per-unit ceilings. Any per_unit row above these thresholds
// is almost certainly a flat/session price that got mislabeled during
// scraping. We suppress it rather than showing a misleading "/unit".
const UNIT_PRICE_CEILINGS = {
  botox:       25,
  dysport:     12,
  xeomin:      22,
  jeuveau:     20,
  daxxify:     25,
  neurotoxin:  25,
};

// Returns false for prices that are clearly wrong and should not render.
export function shouldDisplayPrice(listing) {
  if (!listing) return false;
  const price = Number(listing.price);
  if (!Number.isFinite(price) || price <= 0) return false;
  const label = String(listing.price_label || '').toLowerCase().trim();
  const proc = String(listing.procedure_type || '').toLowerCase();

  // Neurotoxin per_unit outside real market range — check all brands
  if (label === UNIT.PER_UNIT) {
    for (const [brand, ceiling] of Object.entries(UNIT_PRICE_CEILINGS)) {
      if (proc.includes(brand) && price > ceiling) return false;
    }
  }
  // Filler per_syringe outside real market range
  if (listing.category === 'Dermal Filler' && label === UNIT.PER_SYRINGE) {
    if (price < 200 || price > 2500) return false;
  }
  return true;
}

// ── Unit display map ────────────────────────────────────────────────
const UNIT_DISPLAY = {
  [UNIT.PER_UNIT]:        '/ unit',
  [UNIT.PER_SESSION]:     '/ session',
  [UNIT.PER_SYRINGE]:     '/ syringe',
  [UNIT.PER_VIAL]:        '/ vial',
  [UNIT.PER_AREA]:        '',
  [UNIT.PER_CYCLE]:       '/ cycle',
  [UNIT.PER_MONTH]:       '/ month',
  [UNIT.FLAT_PACKAGE]:    '',
  [UNIT.FLAT_RATE_AREA]:  '',
  'per_ml':               '/ ml',
  'per_month':            '/ month',
  'monthly':              '/ month',
};

// Subtext shown below the price for labels that don't use an inline suffix.
const UNIT_SUBTEXT = {
  [UNIT.PER_AREA]:        'per treatment area',
  [UNIT.FLAT_RATE_AREA]:  'per treatment area',
  [UNIT.FLAT_PACKAGE]:    'package deal',
};

/**
 * Normalize a single provider_pricing row for display.
 * Now handles all 8+ unit types, is_starting_price "From" prefix,
 * and confidence tier passthrough.
 *
 * @param {ProviderPriceListing} listing
 * @returns {NormalizedPrice}
 */
export function normalizePrice(listing) {
  if (!listing) return HIDDEN;
  const price = Number(listing.price);
  if (!Number.isFinite(price) || price <= 0) return HIDDEN;

  const label = String(listing.price_label || '').toLowerCase().trim();
  const tier = listing.confidence_tier != null ? Number(listing.confidence_tier) : null;
  const isStarting = listing.is_starting_price === true;
  const prefix = isStarting ? 'From ' : '';

  // Neurotoxin per_unit sanity check — reclassify as area price
  if (label === UNIT.PER_UNIT) {
    if (
      isNeurotoxin(listing.procedure_type) &&
      price > NEUROTOXIN_PER_UNIT_MAX
    ) {
      return {
        displayPrice: `${prefix}${fmtMoney(price)}`,
        comparableValue: null,
        compareUnit: 'per area',
        category: UNIT.FLAT_RATE_AREA,
        confidenceTier: tier,
        isStartingPrice: isStarting,
        unitSubtext: UNIT_SUBTEXT[UNIT.FLAT_RATE_AREA] || '',
      };
    }
  }

  // Known unit type → display it
  const unitSuffix = UNIT_DISPLAY[label];
  if (unitSuffix !== undefined) {
    const displayUnit = unitSuffix ? ` ${unitSuffix}` : '';
    // Only provide a comparable value for sortable unit types
    const comparable = (label === UNIT.FLAT_PACKAGE || label === UNIT.FLAT_RATE_AREA)
      ? null
      : price;
    return {
      displayPrice: `${prefix}${fmtMoney(price)}${displayUnit}`,
      comparableValue: comparable,
      compareUnit: unitSuffix ? unitSuffix.replace('/ ', 'per ') : '',
      category: label,
      confidenceTier: tier,
      isStartingPrice: isStarting,
      unitSubtext: UNIT_SUBTEXT[label] || '',
    };
  }

  // Legacy monthly label
  if (label === 'per_month' || label === 'monthly') {
    return {
      displayPrice: `${prefix}${fmtMoney(price)} / month`,
      comparableValue: price,
      compareUnit: 'per month',
      category: 'per_month',
      confidenceTier: tier,
      isStartingPrice: isStarting,
      unitSubtext: '',
    };
  }

  return HIDDEN;
}

/**
 * Get price range stats for a set of records, filtered to high-confidence
 * data only (tier ≤ 3). Returns null if not enough data.
 */
export function getPriceRange(records, priceLabelFilter) {
  const verified = (records || []).filter((r) => {
    if (priceLabelFilter && r.price_label !== priceLabelFilter) return false;
    const tier = r.confidence_tier != null ? Number(r.confidence_tier) : 4;
    return tier <= 3;
  });
  if (verified.length < 3) return null;
  const prices = verified.map((r) => Number(r.price)).filter(Number.isFinite).sort((a, b) => a - b);
  if (prices.length < 3) return null;
  return {
    low: prices[Math.floor(prices.length * 0.1)],
    high: prices[Math.floor(prices.length * 0.9)],
    med: prices[Math.floor(prices.length * 0.5)],
    count: prices.length,
  };
}

// Below this per-unit price, the row is almost certainly Dysport (Botox
// never goes below ~$10/unit, while Dysport at $5–9/unit is normal).
// Used by the inferNeurotoxinBrand display helper. Also applies when
// the scraper labeled a row as "Botox" but the price is too low.
const NEUROTOXIN_BUDGET_THRESHOLD = 10;

/**
 * Decide what brand label to show for a neurotoxin row.
 *
 *   1. If `brand` is set to something other than "Botox" → use it directly
 *   2. If brand is null or "Botox" AND per-unit price < $10 →
 *      "Dysport (est.)" — scrapers often mislabel Dysport as Botox
 *   3. If brand is "Botox" AND price >= $10 → trust it
 *   4. If brand is null AND price >= $10 (or no per-unit price) → infer Botox
 *
 * Returns null when the row isn't a neurotoxin (caller should not render).
 * Returns `isDysport: true` when the brand is Dysport (explicit or inferred)
 * so callers can render the Botox-equivalent note.
 */
export function inferNeurotoxinBrand({ procedureType, brand, perUnitPrice }) {
  if (!isNeurotoxin(procedureType)) return null;

  const brandLower = brand ? brand.toLowerCase() : null;

  // Explicit brand that isn't "Botox" — trust it directly
  if (brand && brandLower !== 'botox') {
    return {
      label: brand,
      isInferred: false,
      isDysport: brandLower === 'dysport',
      tooltip: `Provider listed this as ${brand}.`,
    };
  }

  // Brand is null or "Botox" — check if per-unit price suggests Dysport
  const valid =
    perUnitPrice != null && Number.isFinite(perUnitPrice) && perUnitPrice > 0;

  if (valid && perUnitPrice < NEUROTOXIN_BUDGET_THRESHOLD) {
    return {
      label: 'Dysport (est.)',
      isInferred: true,
      isDysport: true,
      tooltip:
        "Price suggests this may be Dysport \u2014 provider hasn\u2019t confirmed brand.",
    };
  }

  // Price >= threshold or no per-unit price
  return {
    label: brand || 'Botox',
    isInferred: !brand,
    isDysport: false,
    tooltip: brand
      ? `Provider listed this as ${brand}.`
      : 'Brand not specified by the provider \u2014 most clinics in this price range carry Botox.',
  };
}

/**
 * Format the `units_or_volume` field for display below a price.
 * Returns null when nothing should be shown.
 *
 *   "2 syringes" → "incl. 2 syringes"
 *   "1 syringe"  → "incl. 1 syringe"
 *   "60"         → null  (plain numbers are likely back-calculated, not real data)
 *   "20 units"   → null  (unit counts without explicit provider source are unreliable)
 *   ""           → null
 */
export function formatUnitsIncluded(unitsOrVolume) {
  if (!unitsOrVolume) return null;
  const s = String(unitsOrVolume).trim();
  if (!s) return null;
  // Raw DB identifiers should never leak into the UI.
  // Catches per_unit, per_syringe, range_low, range_high, flat_package, etc.
  if (/^(per[_ ]\w+|range[_ ](low|high)|flat[_ ]\w+|hidden)$/i.test(s)) return null;
  // Plain numbers or "N units" are likely back-calculated from price / assumed
  // per-unit rate. Suppress them — we'll show real unit counts when providers
  // explicitly list them.
  if (/^\d+$/.test(s)) return null;
  if (/^\d+\s*units?$/i.test(s)) return null;
  return `incl. ${s}`;
}

/**
 * Map pin label rules:
 *   - Only show a chip when comparableValue is not null AND < 500
 *   - Returns null if no pin label should be shown
 */
export function pinLabelFromNormalized(normalized) {
  if (!normalized) return null;
  const v = normalized.comparableValue;
  if (v == null || !Number.isFinite(v) || v <= 0 || v >= 500) return null;
  // Short suffix for the map pin
  if (normalized.compareUnit === 'per unit') return `${fmtMoney(v)}/u`;
  if (normalized.compareUnit === 'per syringe') return `${fmtMoney(v)}/syr`;
  if (normalized.compareUnit === 'per session') return `${fmtMoney(v)}/sess`;
  if (normalized.compareUnit === 'per month') return `${fmtMoney(v)}/mo`;
  return fmtMoney(v);
}

/**
 * Pick the best displayable listing for map pins from a set of listings
 * for one provider. Picks the lowest comparableValue among
 * per-unit / per-syringe / per-session / per-month rows; anything else is
 * ignored.
 */
export function bestPinListing(listings) {
  if (!Array.isArray(listings) || listings.length === 0) return null;
  let best = null;
  for (const l of listings) {
    const n = normalizePrice(l);
    const v = n.comparableValue;
    if (v == null || v <= 0 || v >= 500) continue;
    if (!best || v < best.comparableValue) best = n;
  }
  return best;
}

/**
 * Group provider_pricing rows for display on a provider profile.
 * Suppressed rows (category === 'hidden') are dropped entirely — the
 * provider profile only ever renders confirmed unit / syringe /
 * session / month prices.
 *
 * Returns:
 *   {
 *     [procedure_type]: {
 *       items: [normalized rows]
 *     }
 *   }
 */
export function groupForProviderDisplay(listings) {
  const result = {};
  for (const row of listings || []) {
    const normalized = normalizePrice(row);
    if (normalized.category === 'hidden') continue;
    const proc = row.procedure_type || 'Other';
    if (!result[proc]) result[proc] = { items: [] };
    result[proc].items.push({ ...row, normalized });
  }
  return result;
}

/**
 * Tabulate normalization categories for a set of listings. Used by the
 * summary script to print the post-cleanup distribution.
 */
export function tabulateCategories(listings) {
  const stats = {
    [UNIT.PER_UNIT]: 0,
    [UNIT.PER_SYRINGE]: 0,
    [UNIT.PER_SESSION]: 0,
    [UNIT.PER_MONTH]: 0,
    hidden: 0,
  };
  for (const row of listings || []) {
    const n = normalizePrice(row);
    if (stats[n.category] != null) stats[n.category] += 1;
    else stats.hidden += 1;
  }
  return stats;
}

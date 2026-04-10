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
});

/**
 * Normalize a single provider_pricing row for display.
 * Returns a `hidden` result for anything that isn't one of the four
 * confirmed price types.
 *
 * @param {ProviderPriceListing} listing
 * @returns {NormalizedPrice}
 */
export function normalizePrice(listing) {
  if (!listing) return HIDDEN;
  const price = Number(listing.price);
  if (!Number.isFinite(price) || price <= 0) return HIDDEN;

  const label = String(listing.price_label || '').toLowerCase().trim();

  if (label === UNIT.PER_UNIT) {
    // Neurotoxin sanity check — see NEUROTOXIN_PER_UNIT_MAX above. A
    // mislabeled unit-priced row is a flat-rate area price in disguise;
    // reclassify it so the brand-filter view can hide it (apples-to-
    // apples comparison) and the broader category view renders it as
    // "$425 / area" rather than "$425 / unit".
    if (
      isNeurotoxin(listing.procedure_type) &&
      price > NEUROTOXIN_PER_UNIT_MAX
    ) {
      return {
        displayPrice: `${fmtMoney(price)} / area`,
        comparableValue: null,
        compareUnit: 'per area',
        category: UNIT.FLAT_RATE_AREA,
      };
    }
    return {
      displayPrice: `${fmtMoney(price)} / unit`,
      comparableValue: price,
      compareUnit: 'per unit',
      category: UNIT.PER_UNIT,
    };
  }
  if (label === UNIT.PER_SYRINGE) {
    return {
      displayPrice: `${fmtMoney(price)} / syringe`,
      comparableValue: price,
      compareUnit: 'per syringe',
      category: UNIT.PER_SYRINGE,
    };
  }
  if (label === UNIT.PER_SESSION) {
    return {
      displayPrice: `${fmtMoney(price)} / session`,
      comparableValue: price,
      compareUnit: 'per session',
      category: UNIT.PER_SESSION,
    };
  }
  if (label === 'per_month' || label === 'monthly') {
    return {
      displayPrice: `${fmtMoney(price)} / month`,
      comparableValue: price,
      compareUnit: 'per month',
      category: 'per_month',
    };
  }

  return HIDDEN;
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
 *   "60"        → "incl. 60 units"
 *   "20 units"  → "incl. 20 units"
 *   "1 syringe" → "incl. 1 syringe"
 *   ""          → null
 */
export function formatUnitsIncluded(unitsOrVolume) {
  if (!unitsOrVolume) return null;
  const s = String(unitsOrVolume).trim();
  if (!s) return null;
  // Raw DB compare-unit identifiers should never leak into the UI.
  if (/^per[_ ](unit|syringe|vial|session|area|treatment)$/i.test(s)) return null;
  if (/^\d+$/.test(s)) return `incl. ${s} units`;
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

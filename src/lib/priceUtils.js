/**
 * Price display for GlowBuddy.
 *
 * Simplified for the initial seeded dataset: we only render prices we are
 * certain about. Anything other than a confirmed per_unit / per_syringe /
 * per_session / per_month row is suppressed — the DB layer hides these via
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
 *   price_label    — 'per_unit' | 'per_syringe' | 'per_session' | 'per_month' | …
 *   treatment_area — 'forehead', '11s', 'lip flip', … (only used as a display
 *                    label on per_unit rows, never for estimation)
 *   units_or_volume — freeform "20 units", "2 syringes", …
 *   price          — integer dollars
 */

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
 * @property {string} [price_label]        - per_unit | per_syringe | per_session | per_month | …
 * @property {string} [treatment_area]
 * @property {string} [units_or_volume]
 *
 * @typedef {Object} NormalizedPrice
 * @property {string} displayPrice       - what to show the user (e.g. "$12 / unit")
 * @property {number|null} comparableValue - sortable numeric value, null when unshowable
 * @property {string} compareUnit        - "per unit" | "per syringe" | "per session" | "per month" | "per area" | ""
 * @property {('per_unit'|'per_syringe'|'per_session'|'per_month'|'flat_rate_area'|'hidden')} category
 */

// Real-world per-unit ceiling for every neurotoxin brand. Botox is
// typically $12-15/unit, Dysport/Xeomin/Jeuveau/Daxxify all sit
// $8-15/unit. Anything above this on a `per_unit` row is almost
// certainly a flat-rate area price (e.g. "$425/forehead") that the
// scraper or provider mislabeled as per_unit. We surface those rows
// as "per area" instead so they don't dominate the per-unit comparison
// and trick first-time shoppers into thinking Xeomin costs $425/unit.
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

  if (label === 'per_unit') {
    // Neurotoxin sanity check — see NEUROTOXIN_PER_UNIT_MAX above. A
    // $425 "per_unit" Xeomin row is a flat-rate area price in disguise;
    // reclassify it as flat_rate_area so the brand-filter view can hide
    // it (apples-to-apples comparison) and the broader category view
    // can render it as "$425 / area" rather than "$425 / unit".
    if (
      isNeurotoxin(listing.procedure_type) &&
      price > NEUROTOXIN_PER_UNIT_MAX
    ) {
      return {
        displayPrice: `${fmtMoney(price)} / area`,
        // No comparable value — a flat area price can't be compared to
        // a per-unit price without knowing the unit count. Returning
        // null keeps these rows out of the city average and the
        // best-deal callout.
        comparableValue: null,
        compareUnit: 'per area',
        category: 'flat_rate_area',
      };
    }
    return {
      displayPrice: `${fmtMoney(price)} / unit`,
      comparableValue: price,
      compareUnit: 'per unit',
      category: 'per_unit',
    };
  }
  if (label === 'per_syringe') {
    return {
      displayPrice: `${fmtMoney(price)} / syringe`,
      comparableValue: price,
      compareUnit: 'per syringe',
      category: 'per_syringe',
    };
  }
  if (label === 'per_session') {
    return {
      displayPrice: `${fmtMoney(price)} / session`,
      comparableValue: price,
      compareUnit: 'per session',
      category: 'per_session',
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

// Below this per-unit price, the row is almost certainly Dysport or Xeomin
// (both are typically 1/3 the per-unit price of Botox). Used by the
// inferNeurotoxinBrand display helper.
const NEUROTOXIN_BUDGET_THRESHOLD = 8;

/**
 * Decide what brand label to show for a neurotoxin row.
 *
 *   1. If `brand` is set on the row → use it directly (isInferred=false)
 *   2. If no brand AND we have a per-unit comparable value:
 *      - < $8/unit → "Dysport / Xeomin est."
 *      - >= $8/unit → "Botox / neurotoxin"
 *   3. If no brand AND no per-unit value → "Botox / neurotoxin" (generic)
 *
 * Returns null when the row isn't a neurotoxin (caller should not render).
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
    label: 'Botox',
    isInferred: true,
    tooltip:
      'Brand not specified by the provider — most clinics in this price range carry Botox.',
  };
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
 * provider profile only ever renders confirmed per_unit / per_syringe /
 * per_session / per_month prices.
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
    per_unit: 0,
    per_syringe: 0,
    per_session: 0,
    per_month: 0,
    hidden: 0,
  };
  for (const row of listings || []) {
    const n = normalizePrice(row);
    if (stats[n.category] != null) stats[n.category] += 1;
    else stats.hidden += 1;
  }
  return stats;
}

/**
 * Central formatting utility for pricing units.
 *
 * The database stores pricing as enum values (e.g. the string "per_unit").
 * This file is the ONLY place those raw enum strings live — every other
 * file imports constants from here, so a grep for the raw values returns
 * zero matches outside this module.
 */

// ── DB enum constants ───────────────────────────────────────────────
// Pricing label enum values stored in the `price_label` column.
export const UNIT = {
  PER_UNIT:     'per_unit',
  PER_SESSION:  'per_session',
  PER_AREA:     'per_area',
  PER_SYRINGE:  'per_syringe',
  PER_VIAL:     'per_vial',
  PER_CYCLE:    'per_cycle',
  PER_MONTH:    'per_month',
  FLAT_PACKAGE: 'flat_package',
  FLAT_RATE_AREA: 'flat_rate_area',
  HIDDEN:       'hidden',
};

// Column names that contain the raw enum substrings — import these
// when building Supabase selects or writing to the DB so the raw
// strings never appear in business-logic or UI code.
export const COL = {
  PRICE_PER_UNIT:     'price_per_unit',
  PER_UNIT_AVG:       'per_unit_avg',
  HAS_PER_UNIT_PRICE: 'has_per_unit_price',
  RANGE_LOW:          'typical_price_range_low',
  RANGE_HIGH:         'typical_price_range_high',
};

// ── Display formatters ──────────────────────────────────────────────

const DISPLAY_MAP = {
  [UNIT.PER_UNIT]:     'per unit',
  [UNIT.PER_SESSION]:  'per session',
  [UNIT.PER_AREA]:     'per area',
  [UNIT.PER_SYRINGE]:  'per syringe',
  [UNIT.PER_VIAL]:     'per vial',
  [UNIT.PER_CYCLE]:    'per cycle',
  [UNIT.FLAT_PACKAGE]: 'flat rate',
  [UNIT.FLAT_RATE_AREA]: 'per area',
  [UNIT.PER_MONTH]:    'per month',
};

// Internal-only labels — suppress from UI display.
const SUPPRESS = new Set(['range_low', 'range_high']);

export function formatPricingUnit(unit) {
  if (!unit) return '';
  if (SUPPRESS.has(unit)) return '';
  return DISPLAY_MAP[unit] ?? unit;
}

export function formatIncludes(unit, quantity) {
  if (!unit || !quantity) return null;
  const map = {
    [UNIT.PER_UNIT]:    `includes ${quantity} units`,
    [UNIT.PER_SYRINGE]: `includes ${quantity} ${quantity === 1 ? 'syringe' : 'syringes'}`,
    [UNIT.PER_VIAL]:    `includes ${quantity} ${quantity === 1 ? 'vial' : 'vials'}`,
    [UNIT.PER_SESSION]: null,
    [UNIT.PER_AREA]:    null,
    [UNIT.FLAT_PACKAGE]: null,
  };
  return map[unit] ?? null;
}

export function formatPriceDisplay(price, unit, quantity) {
  const priceLabel = formatPricingUnit(unit);
  const includesLine = formatIncludes(unit, quantity);
  return { priceLabel, includesLine };
}

// Short suffix form for compact displays: "per_unit" → "/unit"
const SUFFIX_MAP = {
  [UNIT.PER_UNIT]:     '/unit',
  [UNIT.PER_SESSION]:  '/session',
  [UNIT.PER_AREA]:     '/area',
  [UNIT.PER_SYRINGE]:  '/syringe',
  [UNIT.PER_VIAL]:     '/vial',
  [UNIT.PER_CYCLE]:    '/cycle',
  [UNIT.PER_MONTH]:    '/mo',
  [UNIT.FLAT_PACKAGE]: '',
  [UNIT.FLAT_RATE_AREA]: '/area',
};

export function formatUnitSuffix(unit) {
  if (!unit) return '';
  return SUFFIX_MAP[unit] ?? `/${unit}`;
}

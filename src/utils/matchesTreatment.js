/**
 * Treatment matching utilities for GlowBuddy.
 *
 * Works with the existing data model: flat `gateProviders` (providers table)
 * + flat `provider_pricing` rows fetched separately. There are no nested
 * procedures on provider objects — matching is done by joining on provider_id.
 *
 * A "pill" is a PROCEDURE_PILLS entry with { label, brand?, fuzzyToken, ... }.
 */

/**
 * Check if a single provider_pricing row matches a pill filter.
 *
 * - Brand-specific pills (Botox, Dysport, etc.): match on the `brand` column.
 * - Category pills (Fillers, Laser, etc.): match on `procedure_type` via fuzzyToken.
 *
 * @param {Object} row   - provider_pricing row with { procedure_type, brand }
 * @param {Object} pill  - PROCEDURE_PILLS entry with { brand?, fuzzyToken }
 * @returns {boolean}
 */
export function matchesTreatment(row, pill) {
  if (!row || !pill) return false;
  if (pill.brand) {
    return !!(row.brand && row.brand.toLowerCase() === pill.brand.toLowerCase());
  }
  if (pill.procedureTypes?.length) {
    const pt = (row.procedure_type || '').toLowerCase();
    return pill.procedureTypes.some(t => t.toLowerCase() === pt);
  }
  const pt = (row.procedure_type || '').toLowerCase();
  return pt.includes(pill.fuzzyToken);
}

/**
 * Filter providers to only those that have at least one matching pricing row.
 *
 * @param {Array} providers   - gateProviders (provider objects with `id`)
 * @param {Array} pricingRows - provider_pricing rows (provider_id, procedure_type, brand)
 * @param {Object|null} pill  - PROCEDURE_PILLS entry, or null for no filter
 * @returns {Array} filtered providers (or all, if pill is null)
 */
export function filterProvidersByTreatment(providers, pricingRows, pill) {
  if (!pill || !pricingRows?.length) return providers || [];
  const matchingIds = new Set();
  for (const row of pricingRows) {
    if (matchesTreatment(row, pill)) {
      matchingIds.add(row.provider_id);
    }
  }
  return (providers || []).filter((p) => matchingIds.has(p.id));
}

/**
 * Count unique providers per treatment pill.
 *
 * Deduplicates per provider — if one provider has three Botox listings,
 * they count as 1 toward the Botox count, not 3.
 *
 * @param {Array} pricingRows - provider_pricing rows
 * @param {Array} pills       - PROCEDURE_PILLS array
 * @returns {Object} { "Botox": 134, "Dysport": 87, ... }
 */
export function countProvidersByTreatment(pricingRows, pills) {
  if (!pricingRows?.length || !pills?.length) return {};
  const counts = {};
  for (const pill of pills) {
    const providerSet = new Set();
    for (const row of pricingRows) {
      if (matchesTreatment(row, pill)) {
        providerSet.add(row.provider_id);
      }
    }
    if (providerSet.size > 0) counts[pill.label] = providerSet.size;
  }
  return counts;
}

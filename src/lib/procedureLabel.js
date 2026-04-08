/**
 * Single source of truth for the short pink procedure label that appears
 * on every price card, browse result, and provider chip.
 *
 * The DB stores `procedure_type` as a freeform display string (e.g.
 * "Botox / Dysport / Xeomin", "Lip Filler", "RF Microneedling"). For the
 * neurotoxin category specifically, that combined string is the wrong
 * thing to show on a card — when no brand is set we want a clean category
 * label ("Neurotoxin") instead of the brand list.
 *
 * Rules:
 *   1. Brand always wins. "Botox" / "Dysport" / "Xeomin" → exactly that.
 *   2. If no brand, fall back to a clean display name for known combined
 *      procedure_type strings.
 *   3. Otherwise return the procedure_type as-is — most procedure_type
 *      values are already clean ("Lip Filler", "HydraFacial", etc).
 *
 * NEVER returns "Botox / Dysport / Xeomin".
 */

// Combined procedure_type strings that should be collapsed to a clean
// category name when no specific brand is known. Keep this list small —
// only add entries for combined strings that look ugly on a card.
export const PROCEDURE_DISPLAY_NAMES = {
  'Botox / Dysport / Xeomin': 'Neurotoxin',
};

/**
 * Get the short display label for a price card.
 *
 * @param {string|null|undefined} procedureType - the row's procedure_type
 * @param {string|null|undefined} brand - the row's brand (most specific)
 * @returns {string} clean label, never the combined brand list
 */
export function getProcedureLabel(procedureType, brand) {
  // Brand ALWAYS wins — most specific.
  if (brand && String(brand).trim()) {
    return String(brand).trim();
  }

  // Fall back to the cleaned-up display name when procedure_type is one
  // of the known combined strings.
  if (procedureType && PROCEDURE_DISPLAY_NAMES[procedureType]) {
    return PROCEDURE_DISPLAY_NAMES[procedureType];
  }

  // Most procedure_type values are already clean (e.g. "Lip Filler",
  // "HydraFacial"); return them as-is.
  return procedureType || 'Treatment';
}

/**
 * Single source of truth for the short pink procedure label that appears
 * on every price card, browse result, and provider chip.
 *
 * The DB stores `procedure_type` as a freeform display string (e.g.
 * "Botox / Dysport / Xeomin", "Lip Filler", "RF Microneedling"). For the
 * neurotoxin category specifically, that combined string is the wrong
 * thing to show on a card — when no brand is set we use the most-
 * recognized brand name ("Botox") instead of the medical jargon
 * "Neurotoxin", which the typical first-time shopper doesn't understand.
 *
 * Rules:
 *   1. Brand always wins. "Botox" / "Dysport" / "Xeomin" → exactly that.
 *   2. If no brand, fall back to a clean display name for known combined
 *      procedure_type strings.
 *   3. Otherwise return the procedure_type as-is — most procedure_type
 *      values are already clean ("Lip Filler", "HydraFacial", etc).
 *
 * NEVER returns "Botox / Dysport / Xeomin" and NEVER returns "Neurotoxin"
 * (which is industry jargon that scares first-timers).
 */

// Combined procedure_type strings that should be collapsed to a clean
// category name when no specific brand is known. Keep this list small —
// only add entries for combined strings that look ugly on a card.
//
// The neurotoxin entry maps to "Botox" (not "Neurotoxin") because
// real-world shoppers search and think in terms of the most-recognized
// brand. Combined with the "& more" suffix in CATEGORY_LABELS for
// headline/banner contexts, this gives us "BOTOX" chips on individual
// price rows and "Botox & more in Mandeville" headlines for the
// multi-brand category view.
export const PROCEDURE_DISPLAY_NAMES = {
  'Botox / Dysport / Xeomin': 'Botox',
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

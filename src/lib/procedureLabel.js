/**
 * Single source of truth for the short pink procedure label that appears
 * on every price card, browse result, and provider chip.
 *
 * The DB stores `procedure_type` as a freeform display string (e.g.
 * "Botox / Dysport / Xeomin", "Lip Filler", "RF Microneedling"). For the
 * neurotoxin category specifically, that combined string is the wrong
 * thing to show on a card — it looks like a database artifact.
 *
 * Rules:
 *   1. Brand always wins. "Botox" / "Dysport" / "Xeomin" → exactly that.
 *   2. Any grouped/slash procedure_type (contains "/" or "·") with no
 *      brand collapses to "Neurotoxin".
 *   3. Known combined strings in PROCEDURE_DISPLAY_NAMES are mapped
 *      explicitly for belt-and-suspenders coverage.
 *   4. Otherwise return the procedure_type as-is — most values are
 *      already clean ("Lip Filler", "HydraFacial", etc).
 *
 * NEVER returns "Botox / Dysport / Xeomin" or any slash-separated string.
 */

// Explicit overrides for known combined/legacy procedure_type strings.
export const PROCEDURE_DISPLAY_NAMES = {
  'Botox / Dysport / Xeomin': 'Neurotoxin',
  'Botox': 'Botox',
  'Dysport': 'Dysport',
  'Xeomin': 'Xeomin',
};

// Neurotoxin brands — when brand matches one of these, return the brand
// as-is without appending the procedure type. For non-neurotoxin brands
// (e.g. "Juvederm" for "Lip Filler"), we append the procedure type for
// specificity: "Juvederm Lip Filler".
const NEUROTOXIN_BRANDS = new Set([
  'botox', 'dysport', 'xeomin', 'jeuveau', 'daxxify',
]);

/**
 * Get the short display label for a price card.
 *
 * @param {string|null|undefined} procedureType - the row's procedure_type
 * @param {string|null|undefined} brand - the row's brand (most specific)
 * @returns {string} clean label, never the combined brand list
 */
export function getProcedureLabel(procedureType, brand) {
  const brandStr = brand && String(brand).trim();

  // Brand ALWAYS wins — most specific.
  if (brandStr) {
    // Neurotoxin brands stand alone: "Botox", "Dysport", etc.
    if (NEUROTOXIN_BRANDS.has(brandStr.toLowerCase())) {
      return brandStr;
    }
    // Non-neurotoxin brands get the procedure type appended for clarity.
    // "Juvederm" + "Lip Filler" → "Juvederm Lip Filler"
    // "Sculptra" + "Sculptra" → just "Sculptra" (avoid duplication)
    if (procedureType && !procedureType.toLowerCase().includes(brandStr.toLowerCase())
        && !brandStr.toLowerCase().includes(procedureType.toLowerCase())) {
      return `${brandStr} ${procedureType}`;
    }
    return brandStr;
  }

  // Explicit map for known combined strings.
  if (procedureType && PROCEDURE_DISPLAY_NAMES[procedureType]) {
    return PROCEDURE_DISPLAY_NAMES[procedureType];
  }

  // General rule: any slash- or mid-dot-separated grouped string is a
  // legacy DB artifact — collapse to "Neurotoxin".
  if (procedureType && (procedureType.includes('/') || procedureType.includes('·'))) {
    return 'Neurotoxin';
  }

  // Most procedure_type values are already clean (e.g. "Lip Filler",
  // "HydraFacial"); return them as-is.
  return procedureType || 'Treatment';
}

/**
 * Get a detailed procedure label including treatment area when available.
 * Used for secondary/subtitle display, not the main pink chip.
 *
 * @param {object} procedure - the procedure row
 * @returns {string|null} detail string like "Full Face" or "Bikini Area", or null
 */
export function getProcedureDetail(procedure) {
  if (!procedure) return null;
  const area = procedure.treatment_area && String(procedure.treatment_area).trim();
  if (area && area !== 'Other') return area;
  return null;
}

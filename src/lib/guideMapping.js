// Maps procedure_type strings (from PROCEDURE_TYPES) to procedure_guides slugs.
// Each guide covers one or more procedure types.
const GUIDE_MAP = {
  'Botox / Dysport / Xeomin': 'botox',
  'Jeuveau': 'botox',
  'Daxxify': 'botox',
  'Botox Lip Flip': 'botox',
  'Lip Filler': 'lip-filler',
  'Cheek Filler': 'cheek-filler',
  'Jawline Filler': 'jawline-filler',
  'Chin Filler': 'jawline-filler',
  'Under Eye Filler': 'undereye-filler',
  'Sculptra': 'sculptra',
  'Kybella': 'kybella',
  'PRP Injections': 'prp-prf',
  'HydraFacial': 'hydrafacial',
  'Chemical Peel': 'chemical-peel',
  'Microneedling': 'microneedling',
  'PRP Microneedling': 'microneedling',
  'Exosome Microneedling': 'microneedling',
  'RF Microneedling': 'rf-microneedling',
  'Morpheus8': 'rf-microneedling',
  'Fractional CO2 Laser': 'laser-resurfacing',
  'IPL / Photofacial': 'ipl',
  'Dermaplaning': 'dermaplaning',
  'Laser Hair Removal': 'laser-hair-removal',
  'CoolSculpting': 'coolsculpting',
  'Emsculpt NEO': 'emsculpt',
  'Ultherapy': 'ultherapy',
  'Sofwave': 'ultherapy',
  'Semaglutide (Ozempic / Wegovy)': 'semaglutide',
  'Compounded Semaglutide': 'semaglutide',
  'Semaglutide / Weight Loss': 'semaglutide',
  'GLP-1 (unspecified)': 'semaglutide',
  'IV Therapy': 'iv-therapy',
  'IV Vitamin Therapy': 'iv-therapy',
  'IV Drip Therapy': 'iv-therapy',
  'HRT (Hormone Replacement)': 'hormone-therapy',
  'Testosterone Therapy': 'hormone-therapy',
  'PRP Hair Restoration': 'hair-restoration',
  'Hair Loss Treatment': 'hair-restoration',
};

export function getGuideSlug(procedureType) {
  return GUIDE_MAP[procedureType] || null;
}

export function getGuideUrl(procedureType) {
  const slug = getGuideSlug(procedureType);
  return slug ? `/guide/${slug}` : null;
}

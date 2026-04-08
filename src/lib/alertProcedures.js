// Structured brand-specific procedure options for the Price Alerts flow.
//
// Each option produces a stable { value, procedureType, brand, label } tuple
// where:
//   value          — the dropdown value, unique across all groups
//   procedureType  — the canonical procedure_type / category pill slug stored
//                    in price_alerts.procedure_type
//   brand          — optional brand filter stored in price_alerts.brand.
//                    When null the alert fires across all brands in the category.
//   label          — human-readable label shown to the user
//
// The grouping below mirrors the PROMPT 6 spec exactly so we don't have to
// maintain two parallel lists in the UI.

export const ALERT_PROCEDURE_GROUPS = [
  {
    label: 'Neurotoxins',
    options: [
      { value: 'neurotoxin:Botox',    procedureType: 'neurotoxin',  brand: 'Botox',    label: 'Botox' },
      { value: 'neurotoxin:Dysport',  procedureType: 'neurotoxin',  brand: 'Dysport',  label: 'Dysport' },
      { value: 'neurotoxin:Xeomin',   procedureType: 'neurotoxin',  brand: 'Xeomin',   label: 'Xeomin' },
      { value: 'neurotoxin:Jeuveau',  procedureType: 'neurotoxin',  brand: 'Jeuveau',  label: 'Jeuveau' },
      { value: 'neurotoxin:Daxxify',  procedureType: 'neurotoxin',  brand: 'Daxxify',  label: 'Daxxify' },
      { value: 'neurotoxin:any',      procedureType: 'neurotoxin',  brand: null,       label: 'Any neurotoxin' },
    ],
  },
  {
    label: 'Fillers',
    options: [
      { value: 'filler:Juvederm',  procedureType: 'filler',  brand: 'Juvederm',  label: 'Juvederm' },
      { value: 'filler:Restylane', procedureType: 'filler',  brand: 'Restylane', label: 'Restylane' },
      { value: 'filler:Sculptra',  procedureType: 'filler',  brand: 'Sculptra',  label: 'Sculptra' },
      { value: 'filler:Radiesse',  procedureType: 'filler',  brand: 'Radiesse',  label: 'Radiesse' },
      { value: 'filler:any',       procedureType: 'filler',  brand: null,        label: 'Any filler' },
    ],
  },
  {
    label: 'Other',
    options: [
      { value: 'laser',          procedureType: 'laser',          brand: null, label: 'Laser' },
      { value: 'microneedling',  procedureType: 'microneedling',  brand: null, label: 'Microneedling' },
      { value: 'rf-tightening',  procedureType: 'rf-tightening',  brand: null, label: 'RF Microneedling' },
      { value: 'weight-loss',    procedureType: 'weight-loss',    brand: null, label: 'GLP-1' },
      { value: 'chemical-peel',  procedureType: 'chemical-peel',  brand: null, label: 'Chemical Peel' },
      { value: 'hydrafacial',    procedureType: 'hydrafacial',    brand: null, label: 'HydraFacial' },
      { value: 'coolsculpting',  procedureType: 'coolsculpting',  brand: null, label: 'CoolSculpting' },
      { value: 'iv-wellness',    procedureType: 'iv-wellness',    brand: null, label: 'IV Therapy' },
    ],
  },
];

// Flatten for quick lookup by value.
export const ALERT_PROCEDURE_OPTIONS = ALERT_PROCEDURE_GROUPS.flatMap((g) => g.options);

export function findAlertOption(value) {
  return ALERT_PROCEDURE_OPTIONS.find((o) => o.value === value) || null;
}

// Build the value string from a stored { procedureType, brand } pair, so an
// existing alert can round-trip back into the dropdown.
export function buildAlertOptionValue(procedureType, brand) {
  if (!procedureType) return '';
  if (brand) return `${procedureType}:${brand}`;
  // Brand-less neurotoxin / filler collapse to "category:any"; everything
  // else is its bare category slug.
  if (procedureType === 'neurotoxin' || procedureType === 'filler') {
    return `${procedureType}:any`;
  }
  return procedureType;
}

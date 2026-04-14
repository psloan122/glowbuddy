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

// Unit options and default unit per procedure category/brand.
// unitOptions lists valid choices for the alert unit selector.
// defaultUnit is pre-selected when the user picks the procedure.
export const ALERT_PROCEDURE_GROUPS = [
  {
    label: 'Botox & more',
    options: [
      { value: 'neurotoxin:Botox',    procedureType: 'neurotoxin',  brand: 'Botox',    label: 'Botox',    defaultUnit: 'per_unit', unitOptions: ['per_unit', 'per_area', 'flat_package'], placeholder: 12 },
      { value: 'neurotoxin:Dysport',  procedureType: 'neurotoxin',  brand: 'Dysport',  label: 'Dysport',  defaultUnit: 'per_unit', unitOptions: ['per_unit', 'per_area', 'flat_package'], placeholder: 4 },
      { value: 'neurotoxin:Xeomin',   procedureType: 'neurotoxin',  brand: 'Xeomin',   label: 'Xeomin',   defaultUnit: 'per_unit', unitOptions: ['per_unit', 'per_area', 'flat_package'], placeholder: 10 },
      { value: 'neurotoxin:Jeuveau',  procedureType: 'neurotoxin',  brand: 'Jeuveau',  label: 'Jeuveau',  defaultUnit: 'per_unit', unitOptions: ['per_unit', 'per_area', 'flat_package'], placeholder: 10 },
      { value: 'neurotoxin:Daxxify',  procedureType: 'neurotoxin',  brand: 'Daxxify',  label: 'Daxxify',  defaultUnit: 'per_unit', unitOptions: ['per_unit', 'per_area', 'flat_package'], placeholder: 12 },
      { value: 'neurotoxin:any',      procedureType: 'neurotoxin',  brand: null,       label: 'Any Botox-type brand', defaultUnit: 'per_unit', unitOptions: ['per_unit', 'per_area', 'flat_package'], placeholder: 12 },
    ],
  },
  {
    label: 'Fillers',
    options: [
      { value: 'filler:Juvederm',  procedureType: 'filler',  brand: 'Juvederm',  label: 'Juvederm',  defaultUnit: 'per_syringe', unitOptions: ['per_syringe', 'flat_package'], placeholder: 600 },
      { value: 'filler:Restylane', procedureType: 'filler',  brand: 'Restylane', label: 'Restylane', defaultUnit: 'per_syringe', unitOptions: ['per_syringe', 'flat_package'], placeholder: 550 },
      { value: 'filler:Sculptra',  procedureType: 'filler',  brand: 'Sculptra',  label: 'Sculptra',  defaultUnit: 'per_vial',    unitOptions: ['per_vial', 'flat_package'],    placeholder: 750 },
      { value: 'filler:Radiesse',  procedureType: 'filler',  brand: 'Radiesse',  label: 'Radiesse',  defaultUnit: 'per_syringe', unitOptions: ['per_syringe', 'flat_package'], placeholder: 650 },
      { value: 'filler:any',       procedureType: 'filler',  brand: null,        label: 'Any filler', defaultUnit: 'per_syringe', unitOptions: ['per_syringe', 'flat_package'], placeholder: 600 },
    ],
  },
  {
    label: 'Other',
    options: [
      { value: 'laser',          procedureType: 'laser',          brand: null, label: 'Laser',           defaultUnit: 'per_session', unitOptions: ['per_session'], placeholder: 200 },
      { value: 'microneedling',  procedureType: 'microneedling',  brand: null, label: 'Microneedling',   defaultUnit: 'per_session', unitOptions: ['per_session'], placeholder: 300 },
      { value: 'rf-tightening',  procedureType: 'rf-tightening',  brand: null, label: 'RF Microneedling', defaultUnit: 'per_session', unitOptions: ['per_session'], placeholder: 400 },
      { value: 'weight-loss',    procedureType: 'weight-loss',    brand: null, label: 'GLP-1',           defaultUnit: 'per_session', unitOptions: ['per_session'], placeholder: 300 },
      { value: 'chemical-peel',  procedureType: 'chemical-peel',  brand: null, label: 'Chemical Peel',   defaultUnit: 'per_session', unitOptions: ['per_session'], placeholder: 150 },
      { value: 'hydrafacial',    procedureType: 'hydrafacial',    brand: null, label: 'HydraFacial',     defaultUnit: 'per_session', unitOptions: ['per_session'], placeholder: 150 },
      { value: 'coolsculpting',  procedureType: 'coolsculpting',  brand: null, label: 'CoolSculpting',   defaultUnit: 'per_cycle',  unitOptions: ['per_cycle', 'flat_package'], placeholder: 700 },
      { value: 'iv-wellness',    procedureType: 'iv-wellness',    brand: null, label: 'IV Therapy',      defaultUnit: 'per_session', unitOptions: ['per_session'], placeholder: 150 },
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

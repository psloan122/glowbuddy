const PROVIDER_TYPE_LABELS = {
  'Med Spa (Non-Physician)': 'Med Spa',
  'Med Spa (Physician-Led)': 'MD Med Spa',
  'Med Spa (Physician-Owned)': 'MD Med Spa',
  'Dermatology Practice': 'Dermatology',
  'Plastic Surgery Practice': 'Plastic Surgery',
  'Primary Care / Family Medicine': 'Primary Care',
};

export default function cleanProviderType(raw) {
  if (!raw) return '';
  return PROVIDER_TYPE_LABELS[raw] || raw;
}

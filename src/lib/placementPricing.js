export const PLACEMENT_PRICING = {
  standard: {
    weeklyRate: 49,
    label: 'Standard',
    description: 'Appears in local market feed above organic submissions',
    features: [
      'Shown in local feed',
      'Subtle "Promoted" badge',
      'Impression & click tracking',
    ],
  },
  featured: {
    weeklyRate: 99,
    label: 'Featured',
    description: 'Pinned to the top of the feed with a gold badge',
    features: [
      'Pinned to top of feed',
      'Gold "Special Offer" badge',
      'Maximum visibility',
      'Impression & click tracking',
    ],
  },
};

export const DURATION_OPTIONS = [
  { weeks: 1, label: '1 week' },
  { weeks: 2, label: '2 weeks', savings: '0%' },
  { weeks: 4, label: '4 weeks', savings: '0%' },
];

export const TREATMENT_NAMES = [
  'Botox',
  'Dysport',
  'Xeomin',
  'Lip Filler',
  'Cheek Filler',
  'Jawline Filler',
  'Sculptra',
  'Kybella',
  'PRP',
  'Microneedling',
  'RF Microneedling',
  'Chemical Peel',
  'HydraFacial',
  'Laser Hair Removal',
  'IPL / Photofacial',
  'CoolSculpting',
  'Semaglutide / Weight Loss',
  'IV Therapy',
];

export const PRICE_UNITS = [
  { value: 'unit', label: 'per unit' },
  { value: 'syringe', label: 'per syringe' },
  { value: 'area', label: 'per area' },
  { value: 'session', label: 'per session' },
];

export function calculateTotal(tier, weeks) {
  const rate = PLACEMENT_PRICING[tier]?.weeklyRate || 49;
  return rate * weeks;
}

export function generateHeadline(treatmentName, promoPrice, priceUnit) {
  if (!treatmentName || !promoPrice) return '';
  const unitLabel = PRICE_UNITS.find((u) => u.value === priceUnit)?.label || priceUnit;
  return `Limited time: $${Number(promoPrice).toFixed(0)} ${unitLabel} ${treatmentName}`;
}

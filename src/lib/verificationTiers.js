export const VERIFICATION_TIERS = {
  self_reported: {
    label: 'Self Reported',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    icon: 'user',
  },
  appointment_confirmed: {
    label: 'Appointment Confirmed',
    color: '#185FA5',
    bgColor: '#E6F1FB',
    icon: 'calendar-check',
  },
  receipt_verified: {
    label: 'Receipt Verified',
    color: '#0F6E56',
    bgColor: '#E1F5EE',
    icon: 'shield-check',
  },
};

export function getVerificationTier(tierKey) {
  return VERIFICATION_TIERS[tierKey] || VERIFICATION_TIERS.self_reported;
}

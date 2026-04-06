import { useState } from 'react';
import { User, CalendarCheck, ShieldCheck } from 'lucide-react';
import { getVerificationTier } from '../lib/verificationTiers';

const ICONS = {
  user: User,
  'calendar-check': CalendarCheck,
  'shield-check': ShieldCheck,
};

export default function VerifiedBadge({ tier, size = 'sm' }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!tier || tier === 'self_reported') return null;

  const tierData = getVerificationTier(tier);
  const Icon = ICONS[tierData.icon] || User;

  const sizeClasses = size === 'sm'
    ? 'text-[11px] px-2 py-0.5'
    : 'text-xs px-2.5 py-1';
  const iconSize = size === 'sm' ? 11 : 14;

  return (
    <span
      className={`relative inline-flex items-center gap-1 font-medium rounded-full whitespace-nowrap cursor-default min-h-[44px] ${sizeClasses}`}
      style={{ backgroundColor: tierData.bgColor, color: tierData.color }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowTooltip((v) => !v);
      }}
    >
      <Icon size={iconSize} />
      {tierData.label}
      {showTooltip && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-gray-900 text-white text-[10px] rounded-lg whitespace-nowrap z-50 shadow-lg">
          {tier === 'appointment_confirmed'
            ? 'Appointment screenshot verified by our team'
            : 'Receipt verified by our team'}
        </span>
      )}
    </span>
  );
}

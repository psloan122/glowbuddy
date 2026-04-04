import { Clock } from 'lucide-react';

export default function SpecialCountdownBadge({ endsAt }) {
  if (!endsAt) return null;

  const now = new Date();
  const end = new Date(endsAt);
  const diffMs = end - now;

  if (diffMs <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-text-secondary">
        <Clock size={12} />
        Expired
      </span>
    );
  }

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  let text;
  let urgencyColor;

  if (diffDays > 7) {
    text = `Ends in ${diffDays} days`;
    urgencyColor = { bg: '#E1F5EE', color: '#0F6E56' };
  } else if (diffDays >= 2) {
    text = `Ends in ${diffDays} days`;
    urgencyColor = { bg: '#FEF3C7', color: '#92400E' };
  } else if (diffHours >= 24) {
    text = 'Ends tomorrow';
    urgencyColor = { bg: '#FEE2E2', color: '#991B1B' };
  } else {
    text = `Ends in ${diffHours}h`;
    urgencyColor = { bg: '#FEE2E2', color: '#991B1B' };
  }

  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: urgencyColor.bg, color: urgencyColor.color }}
    >
      <Clock size={12} />
      {text}
    </span>
  );
}

import { Sparkles } from 'lucide-react';

export default function FirstTimerBadge({ variant = 'pill', onClick, label = 'First Timer' }) {
  const base = 'inline-flex items-center gap-1 text-[11px] font-medium rounded-full';
  const colors = 'bg-[#E0F2FE] text-[#0369A1]';

  if (variant === 'card-link') {
    return (
      <button
        onClick={onClick}
        className={`${base} ${colors} px-3 py-1 hover:bg-sky-200/60 transition`}
      >
        <Sparkles size={12} />
        {label}
      </button>
    );
  }

  if (variant === 'inline') {
    return (
      <button
        onClick={onClick}
        className={`${base} ${colors} px-2 py-0.5 hover:bg-sky-200/60 transition`}
      >
        <Sparkles size={11} />
        {label}
      </button>
    );
  }

  // pill (default)
  return (
    <span className={`${base} ${colors} px-2 py-0.5`}>
      <Sparkles size={11} />
      {label}
    </span>
  );
}

import { Sparkles, X } from 'lucide-react';
import { isFirstTimerMode, getFirstTimerTreatments } from '../lib/firstTimerMode';

export default function FirstTimerModeBanner({ onOpenGuide, onDeactivate }) {
  if (!isFirstTimerMode()) return null;
  const treatments = getFirstTimerTreatments();
  if (treatments.length === 0) return null;

  return (
    <div className="rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3 bg-[#E0F2FE] border border-sky-200">
      <div className="flex items-center gap-2 min-w-0">
        <Sparkles size={16} className="text-[#0369A1] shrink-0" />
        <span className="text-sm text-[#0369A1] truncate">
          <span className="font-medium">First-Timer Mode</span>
          {' \u00b7 '}
          {treatments.join(', ')}
        </span>
        <button
          onClick={onOpenGuide}
          className="text-[11px] font-medium text-[#0369A1] underline underline-offset-2 hover:text-sky-800 transition shrink-0"
        >
          View Guide
        </button>
      </div>
      <button
        onClick={onDeactivate}
        className="shrink-0 text-[#0369A1] hover:text-sky-800 transition"
        aria-label="Close first-timer mode"
      >
        <X size={16} />
      </button>
    </div>
  );
}

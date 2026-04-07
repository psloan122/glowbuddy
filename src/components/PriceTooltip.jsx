import { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';

/**
 * Small (ⓘ) icon that reveals an explanation on hover (desktop) or tap (mobile).
 * Used next to estimated prices and ambiguous price types throughout the app.
 *
 * Props:
 *   text     — tooltip body
 *   size     — icon size in px (default 12)
 *   align    — 'left' | 'right' | 'center' (default 'left')
 *   srLabel  — accessible label for screen readers (default 'More info')
 */
export default function PriceTooltip({ text, size = 12, align = 'left', srLabel = 'More info' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function onAway(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onAway);
    document.addEventListener('touchstart', onAway);
    return () => {
      document.removeEventListener('mousedown', onAway);
      document.removeEventListener('touchstart', onAway);
    };
  }, [open]);

  if (!text) return null;

  const alignClass =
    align === 'right' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0';

  return (
    <span
      ref={ref}
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={srLabel}
        className="inline-flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors focus:outline-none focus:text-text-primary align-middle"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <Info size={size} aria-hidden="true" />
      </button>
      {open && (
        <span
          role="tooltip"
          className={`absolute top-full ${alignClass} mt-1 z-50 w-64 rounded-lg bg-text-primary text-white text-[11px] font-normal leading-snug px-3 py-2 shadow-lg`}
          style={{ pointerEvents: 'none' }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getCategoryLabel } from '../lib/constants';

// FirstTimerModeBanner — compact editorial banner shown between the
// filter bar and the first card on /browse. Gated on a localStorage
// flag so that once the user dismisses it, it never returns. The
// banner is also hidden if no procedure is selected — there's nothing
// meaningful to prompt about on the gate/empty state.
//
// Props:
//   procedure      — the current procedure slug from the URL (e.g. "neurotoxin")
//   brand          — optional brand filter (e.g. "Botox")
//   onOpenGuide    — called when the user clicks the banner / guide link
//   onDeactivate   — called when the user clicks the × button (after dismiss)

const STORAGE_KEY = 'firstTimerSeen';

function displayName(procedure, brand) {
  return getCategoryLabel(procedure, brand) || procedure;
}

export default function FirstTimerModeBanner({
  procedure,
  brand,
  onOpenGuide,
  onDeactivate,
}) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Re-read on mount in case another tab dismissed it.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === 'true') {
        setDismissed(true);
      }
    } catch {
      // Ignore storage errors (private mode, etc.)
    }
  }, []);

  function handleDismiss(e) {
    e.stopPropagation();
    try {
      window.localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // Silent fail — localStorage may be disabled
    }
    setDismissed(true);
    if (onDeactivate) onDeactivate();
  }

  if (!procedure || dismissed) return null;

  const label = displayName(procedure, brand);

  return (
    <div
      className="mb-3 flex items-center justify-between gap-2"
      style={{
        background: '#FBF9F7',
        border: '1px solid #EDE8E3',
        borderRadius: 4,
        padding: '10px 14px',
      }}
    >
      <button
        type="button"
        onClick={onOpenGuide}
        className="flex-1 min-w-0 text-left text-[13px] text-ink hover:opacity-80 transition-opacity truncate"
        style={{ fontFamily: 'var(--font-body)', fontWeight: 400 }}
      >
        First time with {label}?{' '}
        <span style={{ color: '#E8347A', fontWeight: 600 }}>
          Read the guide &rarr;
        </span>
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 transition-colors -mr-1 p-1"
        style={{ color: '#B8A89A' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#111')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#B8A89A')}
        aria-label="Dismiss banner"
      >
        <X size={16} />
      </button>
    </div>
  );
}

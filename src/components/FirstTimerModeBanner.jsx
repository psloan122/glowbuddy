import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

// FirstTimerModeBanner — editorial cream banner shown at the top of the
// browse results for users in First-Timer Mode. Displays a "first time with
// [procedure]?" prompt with a guide link, and tracks per-procedure dismissal
// via sessionStorage so dismissing one procedure doesn't suppress the banner
// for every other procedure the user browses.
//
// Props:
//   procedure      — the current procedure slug from the URL (e.g. "neurotoxin")
//   brand          — optional brand filter (e.g. "Botox")
//   onOpenGuide    — called when the user clicks "Read the guide"
//   onDeactivate   — called when the user clicks the × button
//
// If `procedure` is falsy we hide the banner entirely — there's nothing
// meaningful to prompt about on the gate/empty state.

// Map slug + optional brand to a display label. Brand-specific keywords
// take precedence so a user filtered to Dysport sees "Dysport" rather than
// the generic neurotoxin label.
function displayName(procedure, brand) {
  if (brand) return brand;
  const mapping = {
    neurotoxin: 'Botox / Neurotoxins',
    filler: 'Fillers',
    laser: 'Laser',
    microneedling: 'Microneedling',
    'rf-tightening': 'RF Microneedling',
    'weight-loss': 'GLP-1',
    'chemical-peel': 'Chemical Peel',
    hydrafacial: 'HydraFacial',
    coolsculpting: 'CoolSculpting',
    'iv-wellness': 'IV Therapy',
    'laser-hair-removal': 'Laser Hair Removal',
    'thread-lift': 'Thread Lift',
    prp: 'PRP',
    kybella: 'Kybella',
    emsculpt: 'Emsculpt',
    dermaplaning: 'Dermaplaning',
  };
  return mapping[procedure] || procedure;
}

export default function FirstTimerModeBanner({
  procedure,
  brand,
  onOpenGuide,
  onDeactivate,
}) {
  const storageKey = `firstTimerDismissed_${procedure || ''}_${brand || 'any'}`;
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(storageKey) === 'true';
  });

  // Reset dismissed state when the procedure/brand changes so switching
  // filters doesn't leave the banner permanently hidden.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setDismissed(sessionStorage.getItem(storageKey) === 'true');
  }, [storageKey]);

  function handleDismiss() {
    try {
      sessionStorage.setItem(storageKey, 'true');
    } catch {
      // Silent fail — sessionStorage may be disabled
    }
    setDismissed(true);
    if (onDeactivate) onDeactivate();
  }

  if (!procedure || dismissed) return null;

  const label = displayName(procedure, brand);

  return (
    <div
      className="mb-4 flex items-center justify-between gap-3"
      style={{
        background: '#FBF9F7',
        borderLeft: '3px solid #E8347A',
        borderRadius: 0,
        padding: '10px 16px',
      }}
    >
      <div className="flex-1 min-w-0">
        <p
          className="text-[10px] font-bold uppercase text-hot-pink"
          style={{ letterSpacing: '0.12em', fontFamily: 'var(--font-body)' }}
        >
          First time with {label}?
        </p>
        <button
          type="button"
          onClick={onOpenGuide}
          className="text-[13px] text-ink hover:text-hot-pink transition-colors"
          style={{ fontFamily: 'var(--font-body)', fontWeight: 400 }}
        >
          Read the guide &rarr;
        </button>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 transition-colors"
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

import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { isDismissedFor, dismissFor } from '../lib/firstTimerMode';

export default function FirstTimerOnboardingPrompt({ treatmentName, onActivated, onDismissed }) {
  const [visible, setVisible] = useState(!isDismissedFor(treatmentName));

  if (!visible || !treatmentName) return null;

  function handleYes() {
    onActivated();
  }

  function handleNo() {
    dismissFor(treatmentName);
    setVisible(false);
    onDismissed?.();
  }

  function handleClose() {
    dismissFor(treatmentName);
    setVisible(false);
    onDismissed?.();
  }

  return (
    <div
      className="p-4 mb-4 relative bg-white"
      style={{ borderRadius: '4px', border: '1px solid #EDE8E3' }}
    >
      <button
        onClick={handleClose}
        className="absolute top-3 right-3 transition-colors"
        style={{ color: '#B8A89A' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#111')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#B8A89A')}
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={16} className="text-hot-pink" />
        <p className="text-sm font-semibold text-ink">
          Is this your first time with {treatmentName}?
        </p>
      </div>
      <p className="text-xs text-text-secondary mb-3 font-light">
        We can show you starter doses, fair price ranges, and questions to ask your provider.
      </p>
      <div className="flex items-center gap-2">
        {/* Primary CTA — hot-pink, white text, 2px radius, ALL CAPS, Outfit 700 */}
        <button
          onClick={handleYes}
          className="text-white uppercase transition-colors"
          style={{
            backgroundColor: '#E8347A',
            padding: '10px 18px',
            borderRadius: '2px',
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: '12px',
            letterSpacing: '0.10em',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#C8005A')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#E8347A')}
        >
          Yes, help me
        </button>
        {/* Secondary — ghost: transparent, 1px solid #DDD, #888, Outfit 500 12px */}
        <button
          onClick={handleNo}
          className="transition-colors"
          style={{
            background: 'transparent',
            padding: '10px 18px',
            borderRadius: '2px',
            border: '1px solid #DDD',
            color: '#888',
            fontFamily: 'var(--font-body)',
            fontWeight: 500,
            fontSize: '12px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#E8347A';
            e.currentTarget.style.color = '#E8347A';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#DDD';
            e.currentTarget.style.color = '#888';
          }}
        >
          No, I&apos;m experienced
        </button>
      </div>
    </div>
  );
}

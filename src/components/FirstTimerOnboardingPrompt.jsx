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
    <div className="glow-card p-4 mb-4 border border-sky-200 relative">
      <button
        onClick={handleClose}
        className="absolute top-3 right-3 text-text-secondary hover:text-text-primary transition"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={16} className="text-[#0369A1]" />
        <p className="text-sm font-semibold text-text-primary">
          Is this your first time with {treatmentName}?
        </p>
      </div>
      <p className="text-xs text-text-secondary mb-3">
        We can show you starter doses, fair price ranges, and questions to ask your provider.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={handleYes}
          className="px-4 py-2 rounded-xl text-white text-sm font-semibold transition"
          style={{ backgroundColor: '#0369A1' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#075985')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0369A1')}
        >
          Yes, help me!
        </button>
        <button
          onClick={handleNo}
          className="px-4 py-2 rounded-xl border border-gray-200 text-text-secondary text-sm font-medium hover:bg-warm-gray transition"
        >
          No, I'm experienced
        </button>
      </div>
    </div>
  );
}

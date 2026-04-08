import { useEffect } from 'react';
import { X } from 'lucide-react';
import { PIONEER_TIERS, getPioneerToastMessage } from '../lib/pioneerLogic';

export default function PioneerToast({ providerName, tier, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 8000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const tierInfo = PIONEER_TIERS[tier] || PIONEER_TIERS.pioneer;
  const message = getPioneerToastMessage(providerName, tier);

  return (
    <div className="fixed bottom-20 md:bottom-6 right-6 z-[80] animate-[slideUp_0.4s_ease-out]">
      <div
        className="glow-card p-4 pr-10 max-w-xs shadow-lg"
        style={{ border: '1px solid rgba(251, 191, 36, 0.4)', background: '#FFFBEB' }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-text-secondary hover:text-text-primary"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide mb-0.5" style={{ color: '#B8860B' }}>
            {tierInfo.label}
          </p>
          <p className="text-sm text-text-primary leading-snug">
            {message}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

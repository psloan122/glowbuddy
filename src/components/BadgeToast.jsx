import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function BadgeToast({ badge, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-20 md:bottom-6 right-6 z-[80] animate-[slideUp_0.4s_ease-out]">
      <div className="glow-card p-4 pr-10 max-w-xs shadow-lg border border-rose-accent/20">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-text-secondary hover:text-text-primary"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-rose-accent mb-0.5">
            Badge Earned
          </p>
          <p className="text-sm font-bold text-text-primary">
            {badge.label}
          </p>
          <p className="text-xs text-text-secondary mt-0.5">
            {badge.description}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

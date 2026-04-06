import { Link } from 'react-router-dom';
import { Bell, X } from 'lucide-react';

export default function AlertStrip({ triggers, onDismiss }) {
  if (!triggers || triggers.length === 0) return null;

  if (triggers.length === 1) {
    const t = triggers[0];
    return (
      <div className="bg-rose-light rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
        <Bell size={16} className="text-rose-accent shrink-0" />
        <span className="text-sm text-text-primary flex-1">
          <strong>{t.procedure_type || 'A treatment'}</strong> dropped to{' '}
          <strong>${Number(t.triggered_price || 0).toLocaleString()}</strong> in {t.city || 'your area'}
          {t.max_price ? ` — below your $${Number(t.max_price).toLocaleString()} alert` : ''}
        </span>
        <Link
          to="/alerts"
          className="text-xs font-semibold text-rose-accent hover:text-rose-dark transition-colors"
        >
          View &rarr;
        </Link>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-text-secondary hover:text-text-primary transition-colors p-1"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-rose-light rounded-xl px-4 py-3 flex items-center gap-3">
      <Bell size={16} className="text-rose-accent shrink-0" />
      <span className="text-sm text-text-primary flex-1">
        <strong>{triggers.length} price alerts</strong> triggered this week
      </span>
      <Link
        to="/alerts"
        className="text-xs font-semibold text-rose-accent hover:text-rose-dark transition-colors"
      >
        View all &rarr;
      </Link>
    </div>
  );
}

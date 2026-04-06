import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Plus } from 'lucide-react';
import { toggleAlert } from '../../lib/priceAlerts';
import { fetchCurrentAvg } from '../../lib/priceAlerts';
import { AlertSkeleton } from './DashboardSkeleton';

export default function YourPriceAlerts({ alerts, loading, onCreateAlert }) {
  if (loading) {
    return (
      <div className="glow-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text-primary">Your Price Alerts</h2>
        </div>
        <div className="space-y-3">
          <AlertSkeleton />
          <AlertSkeleton />
        </div>
      </div>
    );
  }

  const displayAlerts = (alerts || []).slice(0, 3);

  return (
    <div className="glow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-text-primary">Your Price Alerts</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={onCreateAlert}
            className="text-xs font-semibold text-rose-accent hover:text-rose-dark transition-colors flex items-center gap-1"
          >
            <Plus size={13} /> Add alert
          </button>
          {alerts && alerts.length > 0 && (
            <Link
              to="/alerts"
              className="text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
            >
              See all &rarr;
            </Link>
          )}
        </div>
      </div>

      {displayAlerts.length === 0 ? (
        <div className="text-center py-6">
          <Bell size={28} className="text-text-secondary/30 mx-auto mb-2" />
          <p className="text-sm text-text-secondary mb-3">
            Set a price alert and we'll email you when Botox drops below your target price.
          </p>
          <button
            onClick={onCreateAlert}
            className="text-sm font-semibold text-rose-accent hover:text-rose-dark transition-colors"
          >
            Set your first alert &rarr;
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {displayAlerts.map((alert) => (
            <AlertRow key={alert.id} alert={alert} />
          ))}
        </div>
      )}
    </div>
  );
}

function AlertRow({ alert }) {
  const [active, setActive] = useState(alert.is_active);
  const [toggling, setToggling] = useState(false);
  const [avg, setAvg] = useState(null);

  useEffect(() => {
    fetchCurrentAvg(alert.procedure_type, alert.city, alert.state).then(setAvg);
  }, [alert.procedure_type, alert.city, alert.state]);

  async function handleToggle() {
    setToggling(true);
    try {
      await toggleAlert(alert.id, !active);
      setActive(!active);
    } catch {
      // ignore
    } finally {
      setToggling(false);
    }
  }

  const belowThreshold = avg != null && alert.max_price && avg <= alert.max_price;

  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary truncate">
          {alert.procedure_type}
        </p>
        <p className="text-xs text-text-secondary">
          {alert.max_price ? `Under $${Number(alert.max_price).toLocaleString()}` : 'Any price'}
          {alert.city && ` in ${alert.city}`}
        </p>
      </div>

      {avg != null && (
        <span className={`text-xs font-medium ${belowThreshold ? 'text-verified' : 'text-text-secondary'}`}>
          Avg ${avg.toLocaleString()}
        </span>
      )}

      <button
        onClick={handleToggle}
        disabled={toggling}
        className={`relative w-10 h-6 rounded-full transition-colors ${active ? 'bg-rose-accent' : 'bg-gray-200'}`}
        aria-label={active ? 'Disable alert' : 'Enable alert'}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            active ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  );
}

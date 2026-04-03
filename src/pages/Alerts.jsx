import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellOff, Trash2, Plus } from 'lucide-react';
import { AuthContext } from '../App';
import { getUserAlerts, deleteAlert, toggleAlert, markTriggersRead } from '../lib/priceAlerts';
import { supabase } from '../lib/supabase';
import PriceAlertModal from '../components/PriceAlertModal';

export default function Alerts() {
  const { user, openAuthModal } = useContext(AuthContext);
  const [alerts, setAlerts] = useState([]);
  const [triggers, setTriggers] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    document.title = 'Price Alerts | GlowBuddy';
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadAlerts();
  }, [user]);

  async function loadAlerts() {
    setLoading(true);
    try {
      const alertList = await getUserAlerts();
      setAlerts(alertList);

      // Load triggers for each alert
      if (alertList.length > 0) {
        const { data: triggerData } = await supabase
          .from('price_alert_triggers')
          .select('*, procedures(procedure_type, price_paid, provider_name, city, state, created_at)')
          .in('alert_id', alertList.map((a) => a.id))
          .order('triggered_at', { ascending: false })
          .limit(50);

        const grouped = {};
        (triggerData || []).forEach((t) => {
          if (!grouped[t.alert_id]) grouped[t.alert_id] = [];
          grouped[t.alert_id].push(t);
        });
        setTriggers(grouped);

        // Mark all as read
        for (const alert of alertList) {
          if (grouped[alert.id]?.some((t) => !t.was_read)) {
            await markTriggersRead(alert.id);
          }
        }
      }
    } catch {
      // Silent fail
    }
    setLoading(false);
  }

  async function handleDelete(alertId) {
    try {
      await deleteAlert(alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch {
      // Silent fail
    }
  }

  async function handleToggle(alertId, currentState) {
    try {
      await toggleAlert(alertId, !currentState);
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId ? { ...a, is_active: !currentState } : a
        )
      );
    } catch {
      // Silent fail
    }
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Bell className="w-12 h-12 text-text-secondary mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-text-primary mb-2">Price Alerts</h1>
        <p className="text-text-secondary mb-6">
          Sign in to set alerts and get notified when new prices are posted.
        </p>
        <button
          onClick={() => openAuthModal('signup')}
          className="px-6 py-3 bg-rose-accent text-white font-medium rounded-xl hover:bg-rose-dark transition-colors"
        >
          Sign Up to Get Alerts
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="animate-pulse text-rose-accent text-center text-lg">
          Loading alerts...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-text-primary flex items-center gap-2">
          <Bell size={28} />
          Price Alerts
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-accent text-white text-sm font-medium rounded-xl hover:bg-rose-dark transition-colors"
        >
          <Plus size={16} />
          New Alert
        </button>
      </div>

      {alerts.length === 0 ? (
        <div className="glow-card p-8 text-center">
          <BellOff className="w-10 h-10 text-text-secondary mx-auto mb-3" />
          <p className="text-text-secondary mb-4">
            No alerts yet. Create one to get notified when new prices are posted.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-6 py-3 bg-rose-accent text-white font-medium rounded-xl hover:bg-rose-dark transition-colors"
          >
            <Plus size={16} />
            Create Your First Alert
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => {
            const alertTriggers = triggers[alert.id] || [];
            return (
              <div key={alert.id} className="glow-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-text-primary">
                        {alert.procedure_type}
                      </span>
                      {!alert.is_active && (
                        <span className="text-xs bg-gray-100 text-text-secondary px-2 py-0.5 rounded-full">
                          Paused
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-text-secondary">
                      {[alert.city, alert.state].filter(Boolean).join(', ') || 'Any location'}
                      {alert.max_price && ` · Under $${Number(alert.max_price).toLocaleString()}`}
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      {alert.frequency === 'instant' ? 'Instant notifications' : alert.frequency}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggle(alert.id, alert.is_active)}
                      className={`p-2 rounded-lg transition-colors ${
                        alert.is_active
                          ? 'bg-green-50 text-green-600 hover:bg-green-100'
                          : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                      }`}
                      title={alert.is_active ? 'Pause alert' : 'Resume alert'}
                    >
                      {alert.is_active ? <Bell size={16} /> : <BellOff size={16} />}
                    </button>
                    <button
                      onClick={() => handleDelete(alert.id)}
                      className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                      title="Delete alert"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Recent triggers */}
                {alertTriggers.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-text-secondary mb-2">
                      Recent matches ({alertTriggers.length})
                    </p>
                    <div className="space-y-1.5">
                      {alertTriggers.slice(0, 3).map((trigger) => (
                        <div
                          key={trigger.id}
                          className="flex items-center justify-between text-sm bg-warm-gray rounded-lg px-3 py-2"
                        >
                          <span className="text-text-primary">
                            {trigger.procedures?.provider_name}
                            {trigger.procedures?.city && (
                              <span className="text-text-secondary">
                                {' '}&middot; {trigger.procedures.city}, {trigger.procedures.state}
                              </span>
                            )}
                          </span>
                          <span className="font-bold text-text-primary">
                            ${Number(trigger.procedures?.price_paid).toLocaleString()}
                          </span>
                        </div>
                      ))}
                      {alertTriggers.length > 3 && (
                        <p className="text-xs text-text-secondary text-center">
                          +{alertTriggers.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <PriceAlertModal onClose={() => { setShowModal(false); loadAlerts(); }} />
      )}
    </div>
  );
}

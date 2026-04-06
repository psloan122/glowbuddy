import { useState, useEffect, useContext } from 'react';
import { Bell, BellOff, Plus, Sparkles } from 'lucide-react';
import { AuthContext } from '../App';
import { getUserAlerts, deleteAlert, toggleAlert, markTriggersRead, fetchCurrentAvg, createAlert } from '../lib/priceAlerts';
import { supabase } from '../lib/supabase';
import AlertCard from '../components/AlertCard';
import CreatePriceAlert from '../components/CreatePriceAlert';
import { AVG_PRICES } from '../lib/constants';
import useUserPreferences from '../hooks/useUserPreferences';

export default function Alerts() {
  const { user, openAuthModal } = useContext(AuthContext);
  const { procedureTags } = useUserPreferences();
  const [alerts, setAlerts] = useState([]);
  const [triggers, setTriggers] = useState({});
  const [currentAvgs, setCurrentAvgs] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    document.title = 'Price Alerts | GlowBuddy';
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadAlerts() {
      setLoading(true);
      try {
        const alertList = await getUserAlerts();
        if (cancelled) return;
        setAlerts(alertList);

        // Load triggers for each alert
        if (alertList.length > 0) {
          const { data: triggerData } = await supabase
            .from('price_alert_triggers')
            .select('*, procedures(procedure_type, price_paid, provider_name, city, state, created_at)')
            .in('alert_id', alertList.map((a) => a.id))
            .order('triggered_at', { ascending: false })
            .limit(50);

          if (cancelled) return;

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

          // Fetch current averages for each alert
          const avgs = {};
          await Promise.all(
            alertList.map(async (alert) => {
              const avg = await fetchCurrentAvg(alert.procedure_type, alert.city, alert.state);
              if (avg !== null) avgs[alert.id] = avg;
            })
          );
          if (cancelled) return;
          setCurrentAvgs(avgs);
        }
      } catch {
        // Silent fail
      }
      if (!cancelled) setLoading(false);
    }

    loadAlerts();

    return () => { cancelled = true; };
  }, [user?.id, refreshKey]);

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

  async function handleQuickCreateAlert(procedureType) {
    try {
      const newAlert = await createAlert({ procedureType });
      setAlerts((prev) => [newAlert, ...prev]);
    } catch {
      // Silent fail
    }
  }

  // Compute suggested procedures: tagged interests without an existing alert
  const existingProcedures = new Set(alerts.map((a) => a.procedure_type));
  const suggestedProcedures = (procedureTags || []).filter((p) => !existingProcedures.has(p));

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Bell className="w-12 h-12 text-text-secondary mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-text-primary mb-2">Price Alerts</h1>
        <p className="text-text-secondary mb-6">
          Sign in to set alerts and get notified when prices drop.
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
            No alerts yet. Set one on any treatment page to get notified when prices drop.
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
          {alerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              triggers={triggers[alert.id] || []}
              currentAvg={currentAvgs[alert.id] ?? null}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Suggested Alerts — based on user's interest tags */}
      {suggestedProcedures.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={18} className="text-rose-accent" />
            <h2 className="text-lg font-bold text-text-primary">Suggested for you</h2>
          </div>
          <p className="text-sm text-text-secondary mb-4">
            Procedures you&apos;re interested in but don&apos;t have alerts for yet.
          </p>
          <div className="space-y-2">
            {suggestedProcedures.slice(0, 6).map((procedureType) => {
              const avg = AVG_PRICES[procedureType];
              return (
                <div
                  key={procedureType}
                  className="glow-card p-4 flex items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">{procedureType}</p>
                    {avg && (
                      <p className="text-xs text-text-secondary mt-0.5">
                        Avg ${avg.avg}{avg.unit}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleQuickCreateAlert(procedureType)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-accent text-white text-xs font-semibold rounded-lg hover:bg-rose-dark transition shrink-0"
                  >
                    <Plus size={14} />
                    Set alert
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showModal && (
        <CreatePriceAlert onClose={() => { setShowModal(false); setRefreshKey((k) => k + 1); }} />
      )}
    </div>
  );
}

import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
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
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = 'Price Alerts | Know Before You Glow';
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadAlerts() {
      setLoading(true);
      setError(null);
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
      } catch (err) {
        console.error('[Alerts] loadAlerts failed:', err);
        if (!cancelled) setError('Something went wrong loading your alerts. Please try again.');
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
    } catch (err) {
      console.error('[Alerts] handleDelete failed:', err);
      setError('Failed to delete alert. Please try again.');
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
    } catch (err) {
      console.error('[Alerts] handleToggle failed:', err);
      setError('Failed to update alert. Please try again.');
    }
  }

  async function handleQuickCreateAlert(procedureType) {
    try {
      const newAlert = await createAlert({ procedureType });
      setAlerts((prev) => [newAlert, ...prev]);
    } catch (err) {
      console.error('[Alerts] handleQuickCreateAlert failed:', err);
      setError('Failed to create alert. Please try again.');
    }
  }

  // Compute suggested procedures: tagged interests without an existing alert
  const existingProcedures = new Set(alerts.map((a) => a.procedure_type));
  const suggestedProcedures = (procedureTags || []).filter((p) => !existingProcedures.has(p));

  if (!user) {
    const mockAlerts = [
      { proc: 'Botox', city: 'New York, NY', target: '$14/unit', current: '$17/unit' },
      { proc: 'Lip Filler', city: 'Austin, TX', target: '$550', current: '$680' },
    ];
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-text-primary mb-6 flex items-center gap-2">
          <Bell size={28} />
          Price Alerts
        </h1>
        <div className="relative">
          <div className="opacity-50 pointer-events-none blur-[2px] space-y-4" aria-hidden="true">
            {mockAlerts.map((item, i) => (
              <div key={i} className="glow-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-text-primary">{item.proc}</p>
                    <p className="text-sm text-text-secondary">{item.city}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-secondary">Alert below</p>
                    <p className="font-bold text-rose-accent">{item.target}</p>
                    <p className="text-xs text-text-secondary">Avg: {item.current}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-xl" style={{ background: 'rgba(255,255,255,0.75)' }}>
            <Bell className="w-10 h-10 text-rose-accent mb-3" />
            <p className="text-lg font-bold text-text-primary mb-1 text-center px-4">Get notified when prices drop</p>
            <p className="text-sm text-text-secondary mb-5 text-center px-8">Set a target price and we'll alert you when it's hit in your city.</p>
            <button
              onClick={() => openAuthModal('signup')}
              className="px-6 py-3 bg-rose-accent text-white font-semibold rounded-xl hover:bg-rose-dark transition-colors"
            >
              Create free account
            </button>
            <button
              onClick={() => openAuthModal('signin')}
              className="mt-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Already have an account? Sign in
            </button>
          </div>
        </div>
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

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-800 font-semibold text-sm shrink-0 hover:opacity-70">
            Dismiss
          </button>
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="glow-card p-8 text-center">
          <BellOff className="w-10 h-10 text-text-secondary mx-auto mb-3" />
          <p className="text-text-secondary mb-2">No alerts yet.</p>
          <p className="text-sm text-text-secondary mb-5">
            Get notified when prices drop at providers near you.{' '}
            <Link to="/browse" className="text-rose-accent font-medium hover:underline">
              Browse providers →
            </Link>
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

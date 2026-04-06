import { useState, useEffect, useContext } from 'react';
import { Bell, BellOff, Plus } from 'lucide-react';
import { AuthContext } from '../App';
import { getUserAlerts, deleteAlert, toggleAlert, markTriggersRead, fetchCurrentAvg } from '../lib/priceAlerts';
import { supabase } from '../lib/supabase';
import AlertCard from '../components/AlertCard';
import CreatePriceAlert from '../components/CreatePriceAlert';

export default function Alerts() {
  const { user, openAuthModal } = useContext(AuthContext);
  const [alerts, setAlerts] = useState([]);
  const [triggers, setTriggers] = useState({});
  const [currentAvgs, setCurrentAvgs] = useState({});
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
  }, [user?.id]);

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

        // Fetch current averages for each alert
        const avgs = {};
        await Promise.all(
          alertList.map(async (alert) => {
            const avg = await fetchCurrentAvg(alert.procedure_type, alert.city, alert.state);
            if (avg !== null) avgs[alert.id] = avg;
          })
        );
        setCurrentAvgs(avgs);
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

      {showModal && (
        <CreatePriceAlert onClose={() => { setShowModal(false); loadAlerts(); }} />
      )}
    </div>
  );
}

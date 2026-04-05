import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Sparkles, CalendarDays, MessageCircle, Bell, TrendingDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';

const TYPE_ICON = {
  moved: Briefcase,
  special: Sparkles,
  availability: CalendarDays,
  announcement: MessageCircle,
};

export default function NotificationFeed({ onClose, onRead }) {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_notifications')
      .select('*, injector_updates(*, injectors(display_name, name, slug)), price_alert_triggers(*, price_alerts(procedure_type, city, state))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setNotifications(data || []);
        setLoading(false);
        const unreadIds = (data || []).filter((n) => !n.is_read).map((n) => n.id);
        if (unreadIds.length > 0) {
          supabase.from('user_notifications').update({ is_read: true }).in('id', unreadIds)
            .then(() => { unreadIds.forEach(() => onRead?.()); });
        }
      });
  }, [user]);

  if (loading) return <div className="p-4 text-center text-text-secondary text-sm animate-pulse">Loading...</div>;

  if (notifications.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-text-secondary text-sm mb-2">No notifications yet</p>
        <p className="text-xs text-text-secondary">Follow injectors or set price alerts to get notified.</p>
      </div>
    );
  }

  const now = Date.now();
  const today = [];
  const thisWeek = [];
  const older = [];
  for (const n of notifications) {
    const age = now - new Date(n.created_at).getTime();
    if (age < 86400000) today.push(n);
    else if (age < 604800000) thisWeek.push(n);
    else older.push(n);
  }

  function renderNotification(n) {
    // Price alert trigger notification
    if (n.price_alert_trigger_id && n.price_alert_triggers) {
      const trigger = n.price_alert_triggers;
      const alert = trigger.price_alerts;
      const treatment = alert?.procedure_type || 'Treatment';
      const price = trigger.price_seen;
      const provider = trigger.provider_name;
      return (
        <Link key={n.id} to="/alerts" onClick={onClose}
          className={`flex items-start gap-3 px-4 py-3 hover:bg-amber-50/50 transition ${!n.is_read ? 'bg-amber-50/30' : ''}`}>
          <TrendingDown size={14} className="text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-primary leading-snug">
              <span className="font-semibold">{treatment}</span> dropped to{' '}
              <span className="font-bold text-rose-accent">${Number(price).toLocaleString()}</span>
              {provider && <> at {provider}</>}
            </p>
            <p className="text-[10px] text-text-secondary mt-0.5">{new Date(n.created_at).toLocaleDateString()}</p>
          </div>
          {!n.is_read && <span className="w-2 h-2 bg-amber-500 rounded-full shrink-0 mt-1.5" />}
        </Link>
      );
    }

    // Injector update notification (existing)
    const update = n.injector_updates;
    const injector = update?.injectors;
    const Icon = TYPE_ICON[update?.update_type] || MessageCircle;
    const injectorName = injector?.display_name || injector?.name || 'Injector';
    return (
      <Link key={n.id} to={injector?.slug ? `/injectors/${injector.slug}` : '/following'} onClick={onClose}
        className={`flex items-start gap-3 px-4 py-3 hover:bg-sky-50/50 transition ${!n.is_read ? 'bg-sky-50/30' : ''}`}>
        <Icon size={14} className="text-[#0369A1] mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-primary leading-snug">
            <span className="font-semibold">{injectorName}</span>{' '}{update?.title || ''}
          </p>
          <p className="text-[10px] text-text-secondary mt-0.5">{new Date(n.created_at).toLocaleDateString()}</p>
        </div>
        {!n.is_read && <span className="w-2 h-2 bg-[#0369A1] rounded-full shrink-0 mt-1.5" />}
      </Link>
    );
  }

  function renderGroup(label, items) {
    if (items.length === 0) return null;
    return (
      <div>
        <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-text-secondary bg-warm-gray">{label}</p>
        {items.map(renderNotification)}
      </div>
    );
  }

  return (
    <div>
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <span className="font-semibold text-sm text-text-primary">Notifications</span>
        <Link to="/alerts" onClick={onClose} className="text-xs text-[#0369A1] hover:text-sky-800 font-medium transition">See all</Link>
      </div>
      {renderGroup('Today', today)}
      {renderGroup('This Week', thisWeek)}
      {renderGroup('Earlier', older)}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Bell, Building2, DollarSign, Star, Check, CheckCheck, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const TYPE_CONFIG = {
  new_provider: { icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
  new_price:    { icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
  new_review:   { icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
};

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AdminNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (filter === 'unread') query = query.eq('is_read', false);

    const { data } = await query;
    setNotifications(data || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  async function markRead(id) {
    await supabase
      .from('admin_notifications')
      .update({ is_read: true })
      .eq('id', id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  }

  async function markAllRead() {
    setMarkingAll(true);
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length > 0) {
      await supabase
        .from('admin_notifications')
        .update({ is_read: true })
        .in('id', unreadIds);
      setNotifications((prev) =>
        prev.map((n) => (unreadIds.includes(n.id) ? { ...n, is_read: true } : n))
      );
    }
    setMarkingAll(false);
  }

  function linkForNotification(n) {
    const slug = n.metadata?.slug;
    if (slug) return `/provider/${slug}`;
    const providerId = n.metadata?.provider_id;
    if (providerId) return `/admin`;
    return null;
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    return (
      <div className="text-center py-12 text-text-secondary animate-pulse">
        Loading notifications...
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-warm-gray rounded-lg p-0.5">
            {['all', 'unread'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  filter === f
                    ? 'bg-white text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {f === 'all' ? 'All' : `Unread (${unreadCount})`}
              </button>
            ))}
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="flex items-center gap-1.5 text-sm font-medium text-rose-accent hover:text-rose-dark transition disabled:opacity-50"
          >
            {markingAll ? <Loader2 size={14} className="animate-spin" /> : <CheckCheck size={14} />}
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="glow-card p-8 text-center text-text-secondary">
          <Bell size={24} className="mx-auto mb-2 opacity-40" />
          {filter === 'unread' ? 'No unread notifications.' : 'No notifications yet.'}
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((n) => {
            const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.new_provider;
            const Icon = config.icon;
            const link = linkForNotification(n);
            const Wrapper = link ? Link : 'div';
            const wrapperProps = link ? { to: link } : {};

            return (
              <Wrapper
                key={n.id}
                {...wrapperProps}
                className={`flex items-start gap-3 px-4 py-3 rounded-xl transition cursor-pointer ${
                  n.is_read
                    ? 'bg-white hover:bg-gray-50'
                    : 'bg-rose-light/30 hover:bg-rose-light/50'
                }`}
                onClick={() => !n.is_read && markRead(n.id)}
              >
                <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-full ${config.bg} flex items-center justify-center`}>
                  <Icon size={15} className={config.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${n.is_read ? 'text-text-secondary' : 'text-text-primary font-medium'}`}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-xs text-text-secondary mt-0.5 truncate">{n.body}</p>
                  )}
                  <p className="text-[11px] text-text-secondary/60 mt-1">
                    {timeAgo(n.created_at)}
                    {n.metadata?.source && (
                      <span className="ml-2 text-[10px] bg-gray-100 text-text-secondary px-1.5 py-0.5 rounded">
                        {n.metadata.source}
                      </span>
                    )}
                  </p>
                </div>
                {!n.is_read && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); markRead(n.id); }}
                    className="mt-1 flex-shrink-0 p-1 text-text-secondary/40 hover:text-verified transition"
                    title="Mark as read"
                  >
                    <Check size={14} />
                  </button>
                )}
              </Wrapper>
            );
          })}
        </div>
      )}
    </div>
  );
}

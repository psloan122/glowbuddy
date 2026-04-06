import { useState, useEffect, useRef, useContext } from 'react';
import { Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';
import NotificationFeed from './NotificationFeed';

export default function NotificationBell() {
  const { user } = useContext(AuthContext);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!user) { setUnread(0); return; }
    async function fetchCount() {
      const { count } = await supabase
        .from('user_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      setUnread(count || 0);
    }
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, [user?.id]);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!user) return null;
  const displayCount = unread > 99 ? '99+' : unread;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="relative p-2 text-text-secondary hover:text-text-primary transition-colors">
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center bg-rose-accent text-white text-[10px] font-bold rounded-full px-1">
            {displayCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-[70vh] overflow-y-auto">
          <NotificationFeed onClose={() => setOpen(false)} onRead={() => setUnread((n) => Math.max(0, n - 1))} />
        </div>
      )}
    </div>
  );
}

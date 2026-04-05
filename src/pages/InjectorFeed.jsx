import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';
import InjectorUpdateCard from '../components/InjectorUpdateCard';

export default function InjectorFeed() {
  const { user, openAuthModal } = useContext(AuthContext);
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Following — GlowBuddy';
  }, []);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    async function load() {
      // Get followed injector IDs
      const { data: follows } = await supabase
        .from('injector_follows')
        .select('injector_id')
        .eq('user_id', user.id);

      if (!follows || follows.length === 0) {
        setUpdates([]);
        setLoading(false);
        return;
      }

      const injectorIds = follows.map((f) => f.injector_id);

      // Fetch updates from followed injectors
      const { data } = await supabase
        .from('injector_updates')
        .select('*, injectors(id, display_name, name, slug, credentials, profile_photo_url)')
        .in('injector_id', injectorIds)
        .order('created_at', { ascending: false })
        .limit(50);

      setUpdates(data || []);
      setLoading(false);
    }
    load();
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <Users size={40} className="text-text-secondary mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-text-primary mb-2">Follow Your Injectors</h1>
        <p className="text-text-secondary mb-6">
          Sign in to follow injectors and get notified when they move, post specials, or have availability.
        </p>
        <button
          onClick={() => openAuthModal('signup')}
          className="inline-block text-white px-6 py-3 rounded-full font-semibold hover:opacity-90 transition"
          style={{ backgroundColor: '#C94F78' }}
        >
          Sign Up
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-text-secondary animate-pulse">Loading your feed...</p>
      </div>
    );
  }

  // Group by time period
  const now = Date.now();
  const today = [];
  const thisWeek = [];
  const thisMonth = [];
  const older = [];

  for (const u of updates) {
    const age = now - new Date(u.created_at).getTime();
    if (age < 86400000) today.push(u);
    else if (age < 604800000) thisWeek.push(u);
    else if (age < 2592000000) thisMonth.push(u);
    else older.push(u);
  }

  function renderGroup(label, items) {
    if (items.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-3">{label}</h3>
        <div className="space-y-3">
          {items.map((u) => (
            <InjectorUpdateCard key={u.id} update={u} injector={u.injectors} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Following</h1>

      {updates.length === 0 ? (
        <div className="glow-card p-8 text-center">
          <p className="text-text-secondary mb-2">No updates from your injectors yet.</p>
          <p className="text-sm text-text-secondary">Find injectors on provider pages to follow them.</p>
        </div>
      ) : (
        <>
          {renderGroup('Today', today)}
          {renderGroup('This Week', thisWeek)}
          {renderGroup('This Month', thisMonth)}
          {renderGroup('Earlier', older)}
        </>
      )}
    </div>
  );
}

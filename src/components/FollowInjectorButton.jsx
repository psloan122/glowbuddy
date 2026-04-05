import { useState, useEffect, useContext, useRef } from 'react';
import { Heart, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';

export default function FollowInjectorButton({ injectorId, injectorName }) {
  const { user, openAuthModal } = useContext(AuthContext);
  const [follow, setFollow] = useState(null);
  const [showSheet, setShowSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!user) { setFollow(false); return; }
    supabase
      .from('injector_follows')
      .select('*')
      .eq('user_id', user.id)
      .eq('injector_id', injectorId)
      .maybeSingle()
      .then(({ data }) => setFollow(data || false));
  }, [user, injectorId]);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setShowSheet(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleFollow() {
    if (!user) { openAuthModal('signup'); return; }
    setSaving(true);
    const { data } = await supabase
      .from('injector_follows')
      .insert({ user_id: user.id, injector_id: injectorId })
      .select()
      .single();
    if (data) setFollow(data);
    supabase.from('injectors').update({ follower_count: undefined }).eq('id', injectorId).catch(() => {});
    setSaving(false);
  }

  async function handleUnfollow() {
    if (!follow || !follow.id) return;
    setSaving(true);
    await supabase.from('injector_follows').delete().eq('id', follow.id);
    setFollow(false);
    setShowSheet(false);
    setSaving(false);
  }

  async function togglePref(key) {
    if (!follow || !follow.id) return;
    const updated = { ...follow, [key]: !follow[key] };
    setFollow(updated);
    await supabase
      .from('injector_follows')
      .update({ [key]: updated[key] })
      .eq('id', follow.id);
  }

  if (follow === null) return null;

  if (!follow) {
    return (
      <button
        onClick={handleFollow}
        disabled={saving}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white transition disabled:opacity-50"
        style={{ backgroundColor: '#0369A1' }}
      >
        <Heart size={14} />
        Follow
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setShowSheet(!showSheet)}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border-2 border-[#0369A1] text-[#0369A1] bg-white hover:bg-sky-50 transition"
      >
        <Heart size={14} className="fill-[#0369A1]" />
        Following
      </button>

      {showSheet && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 z-40 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-text-primary">
              Notifications for {injectorName}
            </span>
            <button onClick={() => setShowSheet(false)} className="text-text-secondary hover:text-text-primary">
              <X size={14} />
            </button>
          </div>

          <div className="space-y-3">
            <PrefToggle label="Notify if they move" checked={follow.notify_on_move} onChange={() => togglePref('notify_on_move')} />
            <PrefToggle label="Notify when they post a special" checked={follow.notify_on_special} onChange={() => togglePref('notify_on_special')} />
            <PrefToggle label="Notify when they have availability" checked={follow.notify_on_availability} onChange={() => togglePref('notify_on_availability')} />
          </div>

          <button
            onClick={handleUnfollow}
            disabled={saving}
            className="w-full mt-4 py-2 text-sm text-red-600 hover:text-red-700 font-medium transition"
          >
            Unfollow
          </button>
        </div>
      )}
    </div>
  );
}

function PrefToggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-text-primary">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onChange}
        className={`relative w-10 h-5 rounded-full transition ${checked ? 'bg-[#0369A1]' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </label>
  );
}

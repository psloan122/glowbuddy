import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Sparkles, AlertTriangle, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';
import { isStale } from '../lib/freshness';
import TreatmentLogEntry from '../components/TreatmentLogEntry';
import MonthlySpendSummary from '../components/MonthlySpendSummary';
import LogTreatmentForm from '../components/LogTreatmentForm';
import PioneerBadge from '../components/PioneerBadge';


export default function MyTreatments() {
  const { user, openAuthModal } = useContext(AuthContext);
  const [entries, setEntries] = useState([]);
  const [cadenceNotes, setCadenceNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [staleProcs, setStaleProcs] = useState([]);
  const [confirming, setConfirming] = useState(null);

  useEffect(() => {
    document.title = 'My Treatments | Know Before You Glow';
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadEntries();
    loadCadence();
    loadStaleSubmissions();
  }, [user?.id]);

  async function loadEntries() {
    setLoading(true);
    const { data } = await supabase
      .from('treatment_log')
      .select('*')
      .eq('user_id', user.id)
      .order('date_received', { ascending: false });
    setEntries(data || []);
    setLoading(false);
  }

  async function loadCadence() {
    const { data } = await supabase
      .from('treatment_cadence')
      .select('treatment_name, notes');
    const map = {};
    (data || []).forEach((c) => { map[c.treatment_name] = c.notes; });
    setCadenceNotes(map);
  }

  async function loadStaleSubmissions() {
    const { data } = await supabase
      .from('procedures')
      .select('id, procedure_type, provider_name, city, state, created_at, freshness_confirmed_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .is('freshness_confirmed_at', null)
      .order('created_at', { ascending: false });
    setStaleProcs((data || []).filter((p) => isStale(p.created_at)));
  }

  async function handleConfirmFresh(procId) {
    setConfirming(procId);
    await supabase
      .from('procedures')
      .update({ freshness_confirmed_at: new Date().toISOString() })
      .eq('id', procId);
    setStaleProcs((prev) => prev.filter((p) => p.id !== procId));
    setConfirming(null);
  }

  async function handleDelete(id) {
    if (!confirm('Delete this treatment entry?')) return;
    const { error } = await supabase.from('treatment_log').delete().eq('id', id);
    if (!error) setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function handleEdit(entry) {
    setEditEntry(entry);
    setShowForm(true);
  }

  function handleFormClose() {
    setShowForm(false);
    setEditEntry(null);
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="glow-card p-8">
          <h1 className="text-2xl font-bold text-text-primary mb-2">My Treatments</h1>
          <p className="text-text-secondary mb-6">
            Sign in to track your treatments and see when you're due for a refresh.
          </p>
          <button
            onClick={() => openAuthModal('signup')}
            className="px-6 py-3 bg-rose-accent text-white font-medium rounded-xl hover:bg-rose-dark transition-colors"
          >
            Sign Up
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="animate-pulse text-rose-accent text-center text-lg">
          Loading your treatments...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-text-primary">My Treatments</h1>
        <div className="flex items-center gap-2">
          <Link
            to="/budget"
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-rose-accent/30 text-rose-accent text-sm font-medium rounded-xl hover:bg-rose-light/50 transition-colors"
          >
            <Sparkles size={14} />
            Budget Planner
          </Link>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-accent text-white text-sm font-medium rounded-xl hover:bg-rose-dark transition-colors"
          >
            <Plus size={16} />
            Log Treatment
          </button>
        </div>
      </div>

      {/* Pioneer badge */}
      <div className="mb-4">
        <PioneerBadge userId={user.id} />
      </div>

      {/* Stale submissions banner */}
      {staleProcs.length > 0 && (
        <div
          className="rounded-xl p-4 mb-4"
          style={{ background: '#FFFBEB', border: '1px solid rgba(217, 119, 6, 0.2)' }}
        >
          <div className="flex items-start gap-2.5 mb-3">
            <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: '#D97706' }} />
            <div>
              <p className="text-sm font-medium text-text-primary">
                {staleProcs.length} price{staleProcs.length === 1 ? '' : 's'} may need updating
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#92400E' }}>
                Confirm or update to help others &mdash; earn bonus giveaway entries!
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {staleProcs.slice(0, 3).map((proc) => (
              <div key={proc.id} className="flex items-center justify-between bg-white/60 rounded-lg px-3 py-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{proc.procedure_type}</p>
                  <p className="text-xs text-text-secondary truncate">
                    {proc.provider_name}{proc.city ? ` \u00B7 ${proc.city}, ${proc.state}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <button
                    onClick={() => handleConfirmFresh(proc.id)}
                    disabled={confirming === proc.id}
                    className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full transition"
                    style={{ color: '#059669', background: '#ECFDF5' }}
                  >
                    <Check size={12} />
                    {confirming === proc.id ? '...' : 'Still Accurate'}
                  </button>
                  <Link
                    to={`/log?procedure=${encodeURIComponent(proc.procedure_type)}&provider=${encodeURIComponent(proc.provider_name || '')}&city=${encodeURIComponent(proc.city || '')}&state=${encodeURIComponent(proc.state || '')}`}
                    className="text-xs font-medium px-2.5 py-1 rounded-full transition"
                    style={{ color: '#C94F78', background: '#FBE8EF' }}
                  >
                    Update
                  </Link>
                </div>
              </div>
            ))}
            {staleProcs.length > 3 && (
              <p className="text-xs text-center" style={{ color: '#92400E' }}>
                + {staleProcs.length - 3} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Monthly spend summary */}
      {entries.length > 0 && (
        <div className="mb-6">
          <MonthlySpendSummary entries={entries} />
        </div>
      )}

      {entries.length === 0 ? (
        <div className="glow-card p-8 text-center">
          <p className="text-text-secondary mb-2">
            Your price history will live here.
          </p>
          <p className="text-sm text-text-secondary mb-4">
            Every treatment you share helps someone in your city know what to expect.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-block px-6 py-3 bg-rose-accent text-white font-medium rounded-xl hover:bg-rose-dark transition-colors"
          >
            Share your first price
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <TreatmentLogEntry
              key={entry.id}
              entry={entry}
              onEdit={handleEdit}
              onDelete={handleDelete}
              cadenceNotes={cadenceNotes}
            />
          ))}
        </div>
      )}

      {showForm && (
        <LogTreatmentForm
          onClose={handleFormClose}
          onSaved={loadEntries}
          editEntry={editEntry}
        />
      )}
    </div>
  );
}

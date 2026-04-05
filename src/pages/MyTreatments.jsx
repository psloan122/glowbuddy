import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';
import TreatmentLogEntry from '../components/TreatmentLogEntry';
import MonthlySpendSummary from '../components/MonthlySpendSummary';
import LogTreatmentForm from '../components/LogTreatmentForm';

export default function MyTreatments() {
  const { user, openAuthModal } = useContext(AuthContext);
  const [entries, setEntries] = useState([]);
  const [cadenceNotes, setCadenceNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState(null);

  useEffect(() => {
    document.title = 'My Treatments | GlowBuddy';
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadEntries();
    loadCadence();
  }, [user]);

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

      {/* Monthly spend summary */}
      {entries.length > 0 && (
        <div className="mb-6">
          <MonthlySpendSummary entries={entries} />
        </div>
      )}

      {entries.length === 0 ? (
        <div className="glow-card p-8 text-center">
          <p className="text-text-secondary mb-4">
            You haven't logged any treatments yet. Start tracking to see when you're due for a refresh.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-block px-6 py-3 bg-rose-accent text-white font-medium rounded-xl hover:bg-rose-dark transition-colors"
          >
            Log Your First Treatment
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

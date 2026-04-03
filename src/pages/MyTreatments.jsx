import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Plus, Mail } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';
import ProcedureCard from '../components/ProcedureCard';

export default function MyTreatments() {
  const { user } = useContext(AuthContext);

  const [treatments, setTreatments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  // Sign-in state (for unauthenticated users)
  const [email, setEmail] = useState('');
  const [signingIn, setSigningIn] = useState(false);
  const [signInMsg, setSignInMsg] = useState('');

  // SEO
  useEffect(() => {
    document.title = 'My Treatments | GlowBuddy';
  }, []);

  // Fetch treatments
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchTreatments() {
      setLoading(true);

      const { data } = await supabase
        .from('procedures')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setTreatments(data || []);
      setLoading(false);
    }

    fetchTreatments();
  }, [user]);

  async function handleSignIn(e) {
    e.preventDefault();
    if (!email) return;
    setSigningIn(true);
    setSignInMsg('');
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      setSignInMsg(error.message);
    } else {
      setSignInMsg('Check your email for a magic link!');
      setEmail('');
    }
    setSigningIn(false);
  }

  async function handleDelete(procedureId) {
    if (!confirm('Are you sure you want to delete this treatment?')) return;

    setDeleting(procedureId);

    const { error } = await supabase
      .from('procedures')
      .delete()
      .eq('id', procedureId);

    if (!error) {
      setTreatments((prev) => prev.filter((t) => t.id !== procedureId));
    }

    setDeleting(null);
  }

  function getStatusBadge(status) {
    switch (status) {
      case 'active':
        return (
          <span className="inline-block px-2 py-0.5 text-xs font-medium text-verified bg-verified/10 rounded-full">
            Active
          </span>
        );
      case 'pending':
        return (
          <span className="inline-block px-2 py-0.5 text-xs font-medium text-yellow-600 bg-yellow-50 rounded-full">
            Pending
          </span>
        );
      case 'flagged':
        return (
          <span className="inline-block px-2 py-0.5 text-xs font-medium text-red-500 bg-red-50 rounded-full">
            Flagged
          </span>
        );
      default:
        return (
          <span className="inline-block px-2 py-0.5 text-xs font-medium text-text-secondary bg-gray-100 rounded-full">
            {status || 'Unknown'}
          </span>
        );
    }
  }

  // Unauthenticated: show sign-in prompt
  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="glow-card p-8 text-center">
          <div className="flex justify-center mb-5">
            <div className="flex items-center justify-center w-14 h-14 bg-rose-light rounded-full">
              <Mail size={24} className="text-rose-accent" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-text-primary mb-2">
            My Treatments
          </h1>
          <p className="text-text-secondary mb-6">
            Sign in to view and manage your logged treatments.
          </p>

          <form onSubmit={handleSignIn} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-accent/50 focus:border-rose-accent"
              required
            />
            <button
              type="submit"
              disabled={signingIn}
              className="w-full py-3 bg-rose-accent text-white font-medium rounded-xl hover:bg-rose-dark transition-colors disabled:opacity-50"
            >
              {signingIn ? 'Sending...' : 'Send Magic Link'}
            </button>
            {signInMsg && (
              <p className="text-sm text-center text-text-secondary">
                {signInMsg}
              </p>
            )}
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse text-rose-accent text-center text-lg">
          Loading your treatments...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-text-primary">
          My Treatments
        </h1>
        <Link
          to="/log"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-accent text-white text-sm font-medium rounded-xl hover:bg-rose-dark transition-colors"
        >
          <Plus size={16} />
          Log Treatment
        </Link>
      </div>

      {treatments.length === 0 ? (
        <div className="glow-card p-8 text-center">
          <p className="text-text-secondary mb-4">
            You haven't logged any treatments yet.
          </p>
          <Link
            to="/log"
            className="inline-block px-6 py-3 bg-rose-accent text-white font-medium rounded-xl hover:bg-rose-dark transition-colors"
          >
            Log Your First Treatment
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {treatments.map((treatment, index) => (
            <div key={treatment.id} className="relative">
              <ProcedureCard procedure={treatment} index={index} />

              {/* Status badge overlay */}
              <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
                {getStatusBadge(treatment.status)}
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDelete(treatment.id);
                }}
                disabled={deleting === treatment.id}
                className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-500 bg-white/90 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                title="Delete treatment"
              >
                <Trash2 size={12} />
                {deleting === treatment.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

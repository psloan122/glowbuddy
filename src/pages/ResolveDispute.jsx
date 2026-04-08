import { useState, useEffect, useContext } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';

import { format } from 'date-fns';

export default function ResolveDispute() {
  const { user, openAuthModal } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const procedureId = searchParams.get('id');
  const action = searchParams.get('action');

  const [status, setStatus] = useState('loading'); // loading | processing | success | error | unauthorized
  const [message, setMessage] = useState('');

  useEffect(() => {
    document.title = 'Resolve Dispute | GlowBuddy';
  }, []);

  useEffect(() => {
    if (!procedureId || !action) {
      setStatus('error');
      setMessage('Invalid link. Missing procedure ID or action.');
      return;
    }

    if (!['confirmed', 'removed'].includes(action)) {
      setStatus('error');
      setMessage('Invalid action. Must be "confirmed" or "removed".');
      return;
    }

    if (!user) {
      setStatus('unauthorized');
      return;
    }

    resolve();
  }, [user, procedureId, action]);

  async function resolve() {
    setStatus('processing');

    try {
      // Verify this user owns the procedure
      const { data: proc, error: fetchError } = await supabase
        .from('procedures')
        .select('id, user_id, dispute_resolution')
        .eq('id', procedureId)
        .single();

      if (fetchError || !proc) {
        setStatus('error');
        setMessage('Submission not found.');
        return;
      }

      if (proc.user_id !== user.id) {
        setStatus('error');
        setMessage('You can only resolve disputes on your own submissions.');
        return;
      }

      if (proc.dispute_resolution) {
        setStatus('success');
        setMessage('This dispute has already been resolved.');
        return;
      }

      if (action === 'confirmed') {
        // Mark as confirmed, clear disputed state
        await supabase
          .from('procedures')
          .update({
            dispute_resolution: 'confirmed',
            is_disputed: false,
            dispute_resolved_at: new Date().toISOString(),
          })
          .eq('id', procedureId);

        // Award 2 bonus giveaway entries
        const month = format(new Date(), 'yyyy-MM');
        await supabase.from('giveaway_entries').insert({
          email: user.email,
          procedure_id: procedureId,
          month,
          user_id: user.id,
          entries: 2,
          has_receipt: false,
        });

        setStatus('success');
        setMessage('Your price has been confirmed as accurate. You earned 2 bonus giveaway entries!');
      } else if (action === 'removed') {
        await supabase
          .from('procedures')
          .update({
            dispute_resolution: 'removed',
            status: 'removed',
            dispute_resolved_at: new Date().toISOString(),
          })
          .eq('id', procedureId);

        setStatus('success');
        setMessage('Your submission has been removed. Thank you for helping keep GlowBuddy accurate.');
      }
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <div className="glow-card p-8 text-center">
        {status === 'loading' || status === 'processing' ? (
          <>
            <Loader2 className="w-10 h-10 text-rose-accent mx-auto mb-4 animate-spin" />
            <p className="text-text-secondary">Processing your response...</p>
          </>
        ) : status === 'unauthorized' ? (
          <>
            <ShieldCheck className="w-10 h-10 text-rose-accent mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Sign in to continue</h2>
            <p className="text-text-secondary mb-6">
              You need to be signed in to resolve a dispute on your submission.
            </p>
            <button
              onClick={() => openAuthModal('signin')}
              className="bg-rose-accent text-white px-6 py-3 rounded-full font-semibold hover:bg-rose-dark transition"
            >
              Sign In
            </button>
          </>
        ) : status === 'success' ? (
          <>
            <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Done!</h2>
            <p className="text-text-secondary mb-6">{message}</p>
            <Link
              to="/my-treatments"
              className="inline-block bg-rose-accent text-white px-6 py-3 rounded-full font-semibold hover:bg-rose-dark transition"
            >
              View My Treatments
            </Link>
          </>
        ) : (
          <>
            <XCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
            <p className="text-text-secondary mb-6">{message}</p>
            <Link
              to="/"
              className="inline-block bg-rose-accent text-white px-6 py-3 rounded-full font-semibold hover:bg-rose-dark transition"
            >
              Go Home
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

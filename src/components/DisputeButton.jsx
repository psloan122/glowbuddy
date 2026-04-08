import { useState, useEffect, useRef, useContext } from 'react';
import { Flag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';
import { isEmailVerified } from '../lib/auth';
import VerifyEmailModal from './VerifyEmailModal';

const REASONS = [
  { value: 'price_wrong', label: 'Price seems too low/high' },
  { value: 'wrong_provider', label: 'Wrong provider' },
  { value: 'wrong_procedure', label: 'Wrong procedure' },
  { value: 'looks_fake', label: 'Looks like a fake submission' },
  { value: 'other', label: 'Other' },
];

export default function DisputeButton({ procedureId, procedureUserId }) {
  const { user, openAuthModal } = useContext(AuthContext);
  const [hasDisputed, setHasDisputed] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const ref = useRef(null);

  // Don't render if user is the submitter
  if (user?.id && user.id === procedureUserId) return null;

  // Check if user already flagged this
  useEffect(() => {
    if (!user?.id || !procedureId) return;
    supabase
      .from('procedure_disputes')
      .select('id')
      .eq('procedure_id', procedureId)
      .eq('disputed_by', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setHasDisputed(true);
      });
  }, [user?.id, procedureId]);

  // Outside-click to close popover
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setPopoverOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleFlagClick(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      openAuthModal('signin');
      return;
    }
    if (!isEmailVerified(user)) {
      setShowVerifyModal(true);
      return;
    }
    if (hasDisputed) return;
    setPopoverOpen(!popoverOpen);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!reason || submitting) return;

    setSubmitting(true);
    try {
      // 1. Insert dispute
      const { error } = await supabase
        .from('procedure_disputes')
        .insert({
          procedure_id: procedureId,
          disputed_by: user.id,
          reason,
          note: note.trim() || null,
        });

      if (error) {
        setSubmitting(false);
        return;
      }

      // 2. Increment dispute_count and check threshold
      const { data: proc } = await supabase
        .from('procedures')
        .select('dispute_count, is_disputed, user_id')
        .eq('id', procedureId)
        .single();

      if (proc) {
        const newCount = (proc.dispute_count || 0) + 1;
        const updates = { dispute_count: newCount };

        if (newCount >= 3 && !proc.is_disputed) {
          updates.is_disputed = true;

          // Send notification email to original submitter
          if (proc.user_id) {
            notifySubmitter(procedureId, proc.user_id);
          }
        }

        await supabase
          .from('procedures')
          .update(updates)
          .eq('id', procedureId);
      }

      setHasDisputed(true);
      setSuccess(true);
      setTimeout(() => {
        setPopoverOpen(false);
        setSuccess(false);
      }, 1500);
    } catch {
      // Dispute submission failed — user can retry
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={handleFlagClick}
        className={`inline-flex items-center justify-center gap-1 text-xs min-w-[44px] min-h-[44px] transition-opacity ${
          hasDisputed
            ? 'text-rose-accent opacity-100 cursor-default'
            : 'text-gray-400 opacity-40 hover:opacity-100'
        }`}
        title={hasDisputed ? 'You flagged this' : 'Flag this price'}
      >
        <Flag size={14} fill={hasDisputed ? 'currentColor' : 'none'} />
        {hasDisputed && <span>You flagged this</span>}
      </button>

      {popoverOpen && !hasDisputed && (
        <div
          className="absolute bottom-full right-0 mb-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 p-4 z-50"
          onClick={(e) => e.stopPropagation()}
        >
          {success ? (
            <p className="text-sm text-green-600 font-medium text-center py-2">
              Thanks for flagging this.
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold text-text-primary mb-3">
                Why does this look wrong?
              </p>
              <div className="space-y-2 mb-3">
                {REASONS.map((r) => (
                  <label
                    key={r.value}
                    className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="dispute-reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      className="accent-rose-accent"
                    />
                    {r.label}
                  </label>
                ))}
              </div>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 140))}
                placeholder="Add a note (optional)"
                maxLength={140}
                className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:border-rose-accent focus:ring-1 focus:ring-rose-accent/20 outline-none mb-3"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={handleSubmit}
                disabled={!reason || submitting}
                className="w-full bg-rose-accent text-white text-xs font-semibold py-3 rounded-lg hover:bg-rose-dark transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Flag'}
              </button>
            </>
          )}
        </div>
      )}

      {showVerifyModal && (
        <VerifyEmailModal
          action="flag a price"
          onClose={() => setShowVerifyModal(false)}
        />
      )}
    </div>
  );
}

// Fire-and-forget email notification when threshold is reached
async function notifySubmitter(procedureId, userId) {
  try {
    // Fetch the procedure details + user email
    const [{ data: proc }, { data: userData }] = await Promise.all([
      supabase
        .from('procedures')
        .select('procedure_type, provider_name, price_paid, city, state')
        .eq('id', procedureId)
        .single(),
      supabase.auth.admin?.getUserById?.(userId),
    ]);

    // We can't call admin.getUserById from client — use edge function instead
    // Fall back to invoking email edge function with the procedure data
    if (proc) {
      await supabase.functions.invoke('send-email', {
        body: {
          template: 'dispute_notification',
          to: null, // Edge function will look up user email from procedure user_id
          data: {
            procedureId,
            userId,
            procedureType: proc.procedure_type,
            providerName: proc.provider_name,
            price: proc.price_paid,
            city: proc.city,
            state: proc.state,
          },
        },
      });
    }
  } catch {
    // Notification is best-effort — dispute already recorded
  }
}

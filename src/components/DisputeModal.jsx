import { useState } from 'react';
import { X, Flag } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function DisputeModal({ procedure, providerId, onClose, onSubmitted }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!reason.trim()) return;

    setSubmitting(true);
    setError('');

    try {
      // Insert dispute record
      const { error: insertError } = await supabase
        .from('disputes')
        .insert({
          procedure_id: procedure.id,
          provider_id: providerId,
          reason: reason.trim(),
        });

      if (insertError) throw insertError;

      // Update procedure status to flagged
      const { error: updateError } = await supabase
        .from('procedures')
        .update({ status: 'flagged' })
        .eq('id', procedure.id);

      if (updateError) throw updateError;

      setSuccess(true);
      onSubmitted();

      // Brief success state, then close
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/40">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 mt-20 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Flag size={18} className="text-rose-accent" />
            <h2 className="text-lg font-bold text-text-primary">
              Flag This Submission
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Context */}
        <div className="bg-rose-light/50 rounded-xl p-3 mb-5">
          <p className="text-sm text-text-primary">
            <span className="font-semibold">{procedure.procedure_type}</span>
            {' '}&middot;{' '}
            <span className="font-bold">${Number(procedure.price).toLocaleString()}</span>
          </p>
        </div>

        {success ? (
          <div className="text-center py-4">
            <p className="text-verified font-medium">
              Thank you! This submission has been flagged for review.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label
              htmlFor="dispute-reason"
              className="block text-sm font-medium text-text-primary mb-2"
            >
              Reason for flagging
            </label>
            <textarea
              id="dispute-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe why you think this submission is inaccurate..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-accent/50 focus:border-rose-accent resize-none mb-4"
              required
            />

            {error && (
              <p className="text-sm text-red-500 mb-3">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-gray-200 text-text-primary font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !reason.trim()}
                className="flex-1 py-2.5 bg-rose-accent text-white font-medium rounded-xl hover:bg-rose-dark transition-colors text-sm disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Flag'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

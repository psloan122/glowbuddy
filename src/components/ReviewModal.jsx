import { useState, useEffect, useContext } from 'react';
import { X, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';
import { PROCEDURE_TYPES } from '../lib/constants';
import { assignTrustTier } from '../lib/trustTiers';
import StarRating from './StarRating';

export default function ReviewModal({ provider, onClose, onSubmitted }) {
  const { user, openAuthModal } = useContext(AuthContext);

  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [procedureType, setProcedureType] = useState('');
  const [wouldReturn, setWouldReturn] = useState(null);
  const [injectorName, setInjectorName] = useState('');
  const [injectorSuggestions, setInjectorSuggestions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [hasVerifiedReceipt, setHasVerifiedReceipt] = useState(false);
  const [verifiedReceiptId, setVerifiedReceiptId] = useState(null);

  // Fetch injectors for autocomplete
  useEffect(() => {
    if (!provider?.id) return;
    async function fetchInjectors() {
      const { data } = await supabase
        .from('injectors')
        .select('name')
        .eq('provider_id', provider.id)
        .eq('is_active', true);
      setInjectorSuggestions((data || []).map((i) => i.name));
    }
    fetchInjectors();
  }, [provider?.id]);

  // Check if user has a verified receipt at this provider
  useEffect(() => {
    if (!user?.id || !provider?.slug) return;
    async function checkReceipt() {
      const { data } = await supabase
        .from('procedures')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider_slug', provider.slug)
        .eq('receipt_verified', true)
        .limit(1);

      if (data && data.length > 0) {
        setHasVerifiedReceipt(true);
        setVerifiedReceiptId(data[0].id);
      }
    }
    checkReceipt();
  }, [user?.id, provider?.slug]);

  // Auto-set would_return based on rating
  useEffect(() => {
    if (rating >= 4) setWouldReturn(true);
    else if (rating <= 2 && rating > 0) setWouldReturn(false);
  }, [rating]);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!user) {
      openAuthModal?.();
      return;
    }

    if (rating === 0) {
      setError('Please select a star rating.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // Check for recent duplicate review
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const { data: existing } = await supabase
        .from('reviews')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider_id', provider.id)
        .gte('created_at', ninetyDaysAgo.toISOString())
        .limit(1);

      if (existing && existing.length > 0) {
        setError('You already reviewed this provider in the last 90 days.');
        setSubmitting(false);
        return;
      }

      // Calculate trust tier
      const trustData = assignTrustTier({
        receipt_verified: hasVerifiedReceipt,
        has_result_photo: false, // no photo upload in modal
      });

      // Insert review
      const { error: insertError } = await supabase.from('reviews').insert({
        user_id: user.id,
        provider_id: provider.id,
        rating,
        title: title.trim() || null,
        body: body.trim() || null,
        procedure_type: procedureType || null,
        would_return: wouldReturn,
        status: 'active',
        receipt_verified: hasVerifiedReceipt,
        has_result_photo: false,
        receipt_id: verifiedReceiptId,
        trust_tier: trustData.trust_tier,
        trust_weight: trustData.trust_weight,
      });

      if (insertError) throw insertError;

      // Recalculate provider avg_rating and review_count (trigger also handles weighted)
      const { data: allReviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('provider_id', provider.id)
        .eq('status', 'active');

      if (allReviews && allReviews.length > 0) {
        const avg =
          allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        await supabase
          .from('providers')
          .update({
            avg_rating: Math.round(avg * 10) / 10,
            review_count: allReviews.length,
          })
          .eq('id', provider.id);
      }

      setSuccess(true);
      onSubmitted?.();
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/40">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 mt-20 shadow-xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-text-primary">
            Write a Review
          </h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="text-center py-4">
            <p className="text-verified font-medium">
              Thank you! Your review has been posted.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Verified receipt banner */}
            {hasVerifiedReceipt && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl" style={{ backgroundColor: '#E1F5EE' }}>
                <CheckCircle size={16} style={{ color: '#0F6E56' }} className="shrink-0 mt-0.5" />
                <p className="text-xs" style={{ color: '#0F6E56' }}>
                  Your receipt for this provider is verified. Your review will be marked as a Verified Purchase.
                </p>
              </div>
            )}

            {/* No receipt nudge */}
            {user && !hasVerifiedReceipt && (
              <div className="px-3 py-2.5 rounded-xl bg-gray-50 text-xs text-text-secondary">
                Upload a receipt for this visit to get a Verified Purchase badge on your review. Verified reviews are shown first and carry more weight.
              </div>
            )}

            {/* Star Rating */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Your rating *
              </label>
              <StarRating
                value={rating}
                onChange={setRating}
                size={28}
                showLabel
              />
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 60))}
                placeholder="Sum it up in one line..."
                maxLength={60}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Your experience
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, 500))}
                placeholder="How was the experience? Skill of the injector, results, value for money..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm resize-none"
              />
              <p className="text-xs text-text-secondary mt-1 text-right">
                {body.length}/500
              </p>
            </div>

            {/* Procedure Type */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Procedure type
              </label>
              <select
                value={procedureType}
                onChange={(e) => setProcedureType(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
              >
                <option value="">Select...</option>
                {PROCEDURE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Would Return Toggle */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-text-primary">
                Would you return?
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={wouldReturn === true}
                onClick={() => setWouldReturn(wouldReturn === true ? false : true)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  wouldReturn === true ? 'bg-verified' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    wouldReturn === true ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Injector Name */}
            {injectorSuggestions.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Injector name
                </label>
                <select
                  value={injectorName}
                  onChange={(e) => setInjectorName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
                >
                  <option value="">Select injector...</option>
                  {injectorSuggestions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-gray-200 text-text-primary font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || rating === 0}
                className="flex-1 py-2.5 bg-rose-accent text-white font-medium rounded-xl hover:bg-rose-dark transition-colors text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Posting...
                  </>
                ) : (
                  'Post Review'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

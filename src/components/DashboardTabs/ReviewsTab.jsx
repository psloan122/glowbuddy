import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import RatingSummary from '../RatingSummary';
import ReviewCard from '../ReviewCard';

export default function DashboardReviewsTab({ reviews, provider, onRefresh }) {
  const [filter, setFilter] = useState('all');
  const [respondingTo, setRespondingTo] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const filtered =
    filter === 'needs_response'
      ? reviews.filter((r) => !r.provider_response)
      : reviews;

  const needsResponseCount = reviews.filter((r) => !r.provider_response).length;

  async function handleSubmitResponse(reviewId) {
    if (!responseText.trim()) return;
    setSaving(true);
    setError('');

    const { error: updateError } = await supabase
      .from('reviews')
      .update({
        provider_response: responseText.trim(),
        provider_responded_at: new Date().toISOString(),
      })
      .eq('id', reviewId);

    if (updateError) {
      setError(`Could not save response. ${updateError.message}`);
      setSaving(false);
      return;
    }

    setRespondingTo(null);
    setResponseText('');
    setSaving(false);
    onRefresh();
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-text-primary mb-6">
        Patient Reviews
      </h2>

      {/* Summary */}
      {reviews.length > 0 && (
        <div className="mb-6">
          <RatingSummary reviews={reviews} provider={provider} />
        </div>
      )}

      {/* Filter bar */}
      {reviews.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-text-primary focus:border-rose-accent outline-none transition"
          >
            <option value="all">All Reviews ({reviews.length})</option>
            <option value="needs_response">
              Needs Response ({needsResponseCount})
            </option>
          </select>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
          {error}
        </div>
      )}

      {/* Reviews list */}
      {filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((review) => (
            <div key={review.id}>
              <ReviewCard review={review} />

              {/* Respond button / form */}
              {!review.provider_response && (
                <div className="mt-2 ml-4">
                  {respondingTo === review.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={responseText}
                        onChange={(e) =>
                          setResponseText(e.target.value.slice(0, 200))
                        }
                        placeholder="Write a response..."
                        rows={2}
                        maxLength={200}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm resize-none"
                      />
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-text-secondary flex-1">
                          {responseText.length}/200
                        </p>
                        <button
                          onClick={() => handleSubmitResponse(review.id)}
                          disabled={saving || !responseText.trim()}
                          className="bg-rose-accent text-white px-4 py-1.5 rounded-full text-xs font-semibold hover:bg-rose-dark transition disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          {saving && <Loader2 size={12} className="animate-spin" />}
                          Post Response
                        </button>
                        <button
                          onClick={() => {
                            setRespondingTo(null);
                            setResponseText('');
                          }}
                          className="text-xs text-text-secondary hover:text-text-primary transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRespondingTo(review.id)}
                      className="text-xs text-rose-accent hover:text-rose-dark transition font-medium"
                    >
                      Respond to this review
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="glow-card p-8 text-center">
          <p className="text-text-secondary">
            {filter === 'needs_response'
              ? 'All reviews have been responded to.'
              : 'No reviews yet.'}
          </p>
        </div>
      )}
    </div>
  );
}

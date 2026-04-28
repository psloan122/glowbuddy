import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import RatingSummary from '../RatingSummary';
import ReviewCard from '../ReviewCard';

const BIZ_FONT = 'system-ui, -apple-system, sans-serif';

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
    <div style={{ fontFamily: BIZ_FONT }}>
      <h2 className="text-[18px] font-semibold text-text-primary mb-6" style={{ fontFamily: BIZ_FONT }}>
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
            className="px-3 py-2 rounded-md border border-gray-200 text-[13px] text-text-primary focus:border-biz-teal outline-none transition"
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
        <div className="mb-4 text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
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
                        className="w-full px-3 py-2 rounded-md border border-gray-200 focus:border-biz-teal focus:ring-2 focus:ring-biz-teal/20 outline-none transition text-[13px] resize-none"
                      />
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] text-text-secondary flex-1">
                          {responseText.length}/200
                        </p>
                        <button
                          onClick={() => handleSubmitResponse(review.id)}
                          disabled={saving || !responseText.trim()}
                          className="text-white px-4 py-1.5 rounded-md text-[12px] font-semibold transition disabled:opacity-50 inline-flex items-center gap-1"
                          style={{ background: 'var(--color-biz-teal)' }}
                        >
                          {saving && <Loader2 size={12} className="animate-spin" />}
                          Post Response
                        </button>
                        <button
                          onClick={() => {
                            setRespondingTo(null);
                            setResponseText('');
                          }}
                          className="text-[12px] text-text-secondary hover:text-text-primary transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRespondingTo(review.id)}
                      className="text-[12px] font-medium transition"
                      style={{ color: 'var(--color-biz-teal)' }}
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
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-[13px] text-text-secondary">
            {filter === 'needs_response'
              ? 'All reviews have been responded to.'
              : 'No reviews yet.'}
          </p>
        </div>
      )}
    </div>
  );
}

import { useState, useContext } from 'react';
import { Star } from 'lucide-react';
import { AuthContext } from '../../App';
import RatingSummary from '../RatingSummary';
import ReviewCard from '../ReviewCard';
import ReviewModal from '../ReviewModal';

export default function ReviewsTab({ reviews, provider, onReviewSubmitted }) {
  const { user } = useContext(AuthContext);
  const [sortBy, setSortBy] = useState('trusted');
  const [showReviewModal, setShowReviewModal] = useState(false);

  const sorted = [...reviews].sort((a, b) => {
    if (sortBy === 'trusted') {
      const wA = a.trust_weight || 0.6;
      const wB = b.trust_weight || 0.6;
      if (wB !== wA) return wB - wA;
      return new Date(b.created_at) - new Date(a.created_at);
    }
    if (sortBy === 'highest') {
      const scoreA = a.rating * (a.trust_weight || 0.6);
      const scoreB = b.rating * (b.trust_weight || 0.6);
      return scoreB - scoreA;
    }
    if (sortBy === 'lowest') {
      const scoreA = a.rating * (a.trust_weight || 0.6);
      const scoreB = b.rating * (b.trust_weight || 0.6);
      return scoreA - scoreB;
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });

  return (
    <div>
      {/* Summary + Write CTA */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-6">
        <div className="flex-1">
          <RatingSummary reviews={reviews} provider={provider} />
        </div>
        <button
          onClick={() => setShowReviewModal(true)}
          className="inline-flex items-center gap-1.5 bg-rose-accent text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-rose-dark transition shrink-0"
        >
          <Star size={16} />
          Write a Review
        </button>
      </div>

      {/* Sort bar */}
      {reviews.length > 1 && (
        <div className="flex items-center gap-3 mb-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-text-primary focus:border-rose-accent outline-none transition"
          >
            <option value="trusted">Most Trusted</option>
            <option value="recent">Most Recent</option>
            <option value="highest">Highest Rated</option>
            <option value="lowest">Lowest Rated</option>
          </select>
        </div>
      )}

      {/* Reviews list */}
      {sorted.length > 0 ? (
        <div className="space-y-4">
          {sorted.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      ) : (
        <div className="glow-card p-8 text-center">
          <p className="text-text-secondary mb-3">
            No reviews yet. Be the first!
          </p>
          <button
            onClick={() => setShowReviewModal(true)}
            className="text-rose-accent font-medium hover:text-rose-dark transition"
          >
            Write a review
          </button>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <ReviewModal
          provider={provider}
          onClose={() => setShowReviewModal(false)}
          onSubmitted={() => {
            onReviewSubmitted?.();
            setShowReviewModal(false);
          }}
        />
      )}
    </div>
  );
}

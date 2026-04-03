import { useState } from 'react';
import { Star, CheckCircle, Camera, Info } from 'lucide-react';
import StarRating from './StarRating';
import { calculateWeightedRating } from '../lib/trustTiers';

export default function RatingSummary({ reviews = [], provider = null }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (reviews.length === 0) return null;

  const count = reviews.length;

  // Use provider-level cached values if available, else compute from reviews
  const weightedAvg = provider?.weighted_rating ?? calculateWeightedRating(reviews);
  const unweightedAvg =
    provider?.unweighted_rating ??
    Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / count) * 10) / 10;

  const verifiedCount =
    provider?.verified_review_count ??
    reviews.filter((r) => r.trust_tier === 'receipt_verified' || r.trust_tier === 'receipt_and_photo').length;
  const photoCount =
    provider?.photo_review_count ??
    reviews.filter((r) => r.trust_tier === 'has_photo' || r.trust_tier === 'receipt_and_photo').length;
  const unverifiedCount =
    provider?.unverified_review_count ??
    reviews.filter((r) => r.trust_tier === 'unverified' || !r.trust_tier).length;

  const wouldReturnCount = reviews.filter((r) => r.would_return).length;
  const wouldReturnPct = Math.round((wouldReturnCount / count) * 100);

  const showUnweighted = Math.abs(weightedAvg - unweightedAvg) > 0.2;

  // Star distribution (5 to 1)
  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const starCount = reviews.filter((r) => r.rating === star).length;
    return { star, count: starCount, pct: Math.round((starCount / count) * 100) };
  });

  return (
    <div className="glow-card p-5">
      <div className="flex flex-col sm:flex-row gap-6">
        {/* Left: large rating */}
        <div className="flex flex-col items-center sm:items-start shrink-0">
          <div className="relative">
            <p className="text-4xl font-bold text-text-primary">
              {weightedAvg.toFixed(1)}
            </p>
            <button
              className="absolute -right-5 top-0 text-text-secondary hover:text-text-primary transition-colors"
              onClick={() => setShowTooltip(!showTooltip)}
              aria-label="Rating info"
            >
              <Info size={14} />
            </button>
            {showTooltip && (
              <div className="absolute top-8 left-0 z-10 w-64 p-3 bg-white rounded-xl shadow-lg border border-gray-100 text-xs text-text-secondary">
                This rating weights verified purchases higher than unverified ones.
                Receipt-verified reviews count most.
                <button
                  onClick={() => setShowTooltip(false)}
                  className="block mt-1 text-rose-accent"
                >
                  Got it
                </button>
              </div>
            )}
          </div>
          <StarRating value={Math.round(weightedAvg)} readOnly size={18} />
          {showUnweighted && (
            <p className="text-xs text-text-secondary mt-0.5">
              ({unweightedAvg.toFixed(1)} unweighted)
            </p>
          )}
          <p className="text-sm text-text-secondary mt-1">
            {count} review{count !== 1 ? 's' : ''}
          </p>
          {wouldReturnCount > 0 && (
            <p className="text-xs text-verified mt-1">
              {wouldReturnPct}% would return
            </p>
          )}

          {/* Trust breakdown */}
          <div className="mt-3 space-y-0.5">
            {verifiedCount > 0 && (
              <p className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle size={11} />
                {verifiedCount} receipt verified
              </p>
            )}
            {photoCount > 0 && (
              <p className="flex items-center gap-1 text-xs text-blue-600">
                <Camera size={11} />
                {photoCount} include photos
              </p>
            )}
            {unverifiedCount > 0 && (
              <p className="text-xs text-text-secondary">
                &middot; {unverifiedCount} unverified visit{unverifiedCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Right: distribution bars */}
        <div className="flex-1 space-y-1.5">
          {distribution.map(({ star, count: starCount, pct }) => (
            <div key={star} className="flex items-center gap-2">
              <span className="text-xs text-text-secondary w-3 text-right">
                {star}
              </span>
              <Star size={12} className="text-amber-400 fill-amber-400 shrink-0" />
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-text-secondary w-8">
                {starCount}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

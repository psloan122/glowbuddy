import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, RotateCcw, Camera } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import StarRating from './StarRating';
import { TRUST_TIERS } from '../lib/trustTiers';

function TrustBadge({ trustTier }) {
  if (!trustTier || trustTier === 'unverified') return null;

  const tier = TRUST_TIERS[trustTier];
  if (!tier) return null;

  if (trustTier === 'receipt_and_photo') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
        style={{ backgroundColor: '#E1F5EE', color: '#0F6E56' }}
      >
        <CheckCircle size={11} />
        Verified &middot; Includes Photos
      </span>
    );
  }

  if (trustTier === 'receipt_verified') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
        style={{ backgroundColor: '#E1F5EE', color: '#0F6E56' }}
      >
        <CheckCircle size={11} />
        Verified Purchase
      </span>
    );
  }

  if (trustTier === 'has_photo') {
    return (
      <span
        className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
        style={{ backgroundColor: '#E6F1FB', color: '#185FA5' }}
      >
        <Camera size={11} />
        Includes result photo
      </span>
    );
  }

  return null;
}

export default function ReviewCard({ review, showProvider = false }) {
  const [expanded, setExpanded] = useState(false);

  const bodyIsLong = review.body && review.body.length > 200;
  const isUnverified = !review.trust_tier || review.trust_tier === 'unverified';
  const isVerifiedTier =
    review.trust_tier === 'receipt_verified' || review.trust_tier === 'receipt_and_photo';

  return (
    <div
      className={`glow-card p-5 ${isVerifiedTier ? 'border border-[#9FE1CB]' : ''}`}
    >
      {/* Header: stars + date */}
      <div className="flex items-center justify-between mb-2">
        <div className={isUnverified ? 'opacity-85' : ''}>
          <StarRating value={review.rating} readOnly size={16} />
        </div>
        {review.created_at && (
          <span className="text-xs text-text-secondary">
            {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
          </span>
        )}
      </div>

      {/* Trust badge */}
      <div className="mb-2">
        <TrustBadge trustTier={review.trust_tier} />
        {isUnverified && (
          <span className="text-[11px] text-text-secondary">Unverified visit</span>
        )}
      </div>

      {/* Title */}
      {review.title && (
        <h4 className="font-bold text-text-primary mb-1">{review.title}</h4>
      )}

      {/* Body */}
      {review.body && (
        <div>
          <p
            className={`text-sm text-text-secondary ${!expanded && bodyIsLong ? 'line-clamp-3' : ''}`}
          >
            {review.body}
          </p>
          {bodyIsLong && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-rose-accent hover:text-rose-dark transition-colors mt-1"
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      {/* Pills row */}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        {review.procedure_type && (
          <span className="text-xs bg-rose-light text-rose-dark px-2 py-0.5 rounded-full">
            {review.procedure_type}
          </span>
        )}
        {review.would_return && (
          <span className="inline-flex items-center gap-1 text-xs bg-verified/10 text-verified px-2 py-0.5 rounded-full">
            <RotateCcw size={10} />
            Would return
          </span>
        )}
      </div>

      {/* Provider link */}
      {showProvider && review.providers && (
        <Link
          to={`/provider/${review.providers.slug}`}
          className="block text-sm text-rose-accent hover:text-rose-dark transition-colors mt-2"
        >
          {review.providers.name}
        </Link>
      )}

      {/* Provider response */}
      {review.provider_response && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs font-medium text-text-secondary mb-1">
            Provider response
          </p>
          <p className="text-sm text-text-secondary bg-warm-gray rounded-lg px-3 py-2">
            {review.provider_response}
          </p>
        </div>
      )}
    </div>
  );
}

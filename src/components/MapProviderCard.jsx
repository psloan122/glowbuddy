import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import ProviderAvatar from './ProviderAvatar';

export default function MapProviderCard({ provider }) {
  const {
    name,
    slug,
    city,
    state,
    avgPrice,
    avg_rating,
    review_count,
    provider_type,
  } = provider;

  return (
    <Link
      to={`/provider/${slug}`}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-warm-gray transition-colors"
    >
      <ProviderAvatar name={name} size={44} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-text-primary truncate">{name}</div>
        <div className="text-xs text-text-secondary truncate">
          {[city, state].filter(Boolean).join(', ')}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {avg_rating > 0 && (
            <span className="flex items-center gap-0.5">
              <Star size={12} className="text-amber-400 fill-amber-400" />
              <span className="text-xs font-medium text-text-primary">
                {avg_rating.toFixed(1)}
              </span>
              {review_count > 0 && (
                <span className="text-xs text-text-secondary">({review_count})</span>
              )}
            </span>
          )}
          {provider_type && (
            <span className="text-xs text-text-secondary bg-warm-gray px-1.5 py-0.5 rounded-full truncate max-w-[140px]">
              {provider_type}
            </span>
          )}
        </div>
      </div>
      {avgPrice != null && (
        <div className="text-right shrink-0">
          <div className="text-base font-bold text-text-primary">${Math.round(avgPrice)}</div>
          <div className="text-xs text-text-secondary">avg</div>
        </div>
      )}
    </Link>
  );
}

import { Link } from 'react-router-dom';
import ProviderAvatar from './ProviderAvatar';
import { providerProfileUrl } from '../lib/slugify';

export default function MapProviderCard({ provider }) {
  const {
    provider_name,
    provider_slug,
    city,
    state,
    avg_price,
    submission_count,
    has_submissions,
    provider_type,
    google_rating,
    google_review_count,
  } = provider;

  const profileUrl = providerProfileUrl(provider_slug, provider_name, city, state);
  const Wrapper = profileUrl ? Link : 'div';
  const wrapperProps = profileUrl ? { to: profileUrl } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-warm-gray transition-colors"
    >
      <ProviderAvatar name={provider_name} size={44} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-text-primary truncate">{provider_name}</div>
        <div className="text-xs text-text-secondary truncate">
          {[city, state].filter(Boolean).join(', ')}
        </div>
        {has_submissions ? (
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-text-secondary">
              {submission_count} {submission_count === 1 ? 'price' : 'prices'}
            </span>
            {provider_type && (
              <span className="text-xs text-text-secondary bg-warm-gray px-1.5 py-0.5 rounded-full truncate max-w-[140px]">
                {provider_type}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-0.5">
            {google_rating && (
              <span className="text-xs text-text-secondary">
                ★ {Number(google_rating).toFixed(1)}
                {google_review_count ? ` (${google_review_count})` : ''}
              </span>
            )}
            <span className="text-xs text-rose-accent font-medium">
              No prices yet
            </span>
          </div>
        )}
      </div>
      {has_submissions && avg_price > 0 ? (
        <div className="text-right shrink-0">
          <div className="text-base font-bold text-text-primary">${avg_price}</div>
          <div className="text-xs text-text-secondary">avg</div>
        </div>
      ) : !has_submissions ? (
        <Link
          to="/log"
          className="shrink-0 text-xs font-semibold text-rose-accent hover:text-rose-dark transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          Be first →
        </Link>
      ) : null}
    </Wrapper>
  );
}

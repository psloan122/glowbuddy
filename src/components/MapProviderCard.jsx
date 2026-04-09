import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import ProviderAvatar from './ProviderAvatar';
import { providerProfileUrl } from '../lib/slugify';

function VsAvgBadge({ bestPrice, cityAvg }) {
  if (bestPrice == null || !cityAvg || cityAvg <= 0) return null;
  const pct = ((bestPrice - cityAvg) / cityAvg) * 100;
  if (Math.abs(pct) < 5) return null; // too close to average, skip
  const isBelow = pct < 0;
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        color: isBelow ? '#1D9E75' : '#C8001A',
        background: isBelow ? '#E8F5E9' : '#FFEBEE',
        padding: '1px 6px',
        borderRadius: 3,
        whiteSpace: 'nowrap',
      }}
    >
      {isBelow ? '' : '+'}{Math.round(pct)}% vs avg
    </span>
  );
}

export default memo(function MapProviderCard({ provider, selected, cityAvg, bestPrice }) {
  const {
    provider_name,
    provider_slug,
    city,
    state,
    avg_price,
    submission_count,
    verified_count,
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
      data-provider-card={provider.provider_id || provider.id || ''}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-warm-gray transition-colors"
      style={selected ? {
        boxShadow: '0 0 0 2px #E8347A',
        borderRadius: 12,
      } : undefined}
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
              {verified_count > 0 && ` · ${verified_count} verified`}
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
        {cityAvg != null && bestPrice != null && (
          <div className="mt-0.5">
            <VsAvgBadge bestPrice={bestPrice} cityAvg={cityAvg} />
          </div>
        )}
      </div>
      {has_submissions && avg_price > 0 ? (
        <div className="text-right shrink-0 flex items-center gap-1.5">
          <div>
            <div className="text-base font-bold text-text-primary">${avg_price}</div>
            <div className="text-xs text-text-secondary">avg</div>
          </div>
          <ChevronRight size={16} color="#CCC" />
        </div>
      ) : !has_submissions ? (
        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            to="/log"
            className="text-xs font-semibold text-rose-accent hover:text-rose-dark transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            Be first →
          </Link>
          <ChevronRight size={16} color="#CCC" />
        </div>
      ) : (
        <ChevronRight size={16} color="#CCC" className="shrink-0" />
      )}
    </Wrapper>
  );
});

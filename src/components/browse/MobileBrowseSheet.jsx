import { useEffect, useState, useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import MapProviderCard from '../MapProviderCard';
import ProviderAvatar from '../ProviderAvatar';
import { CATEGORY_PILLS } from '../../lib/constants';

const ITEMS_PER_PAGE = 20;

export default memo(function MobileBrowseSheet({
  providers,
  mode,
  city,
  state,
  cityAvg,
  selectedProviderId,
  providerCount,
  loading,
  onSelectCategory,
  activeCategorySlug,
  categoryCounts = {},
  onProviderSelect,
  listingCount,
  unpricedProviders = [],
  unpricedTotal = 0,
}) {
  const count = providerCount ?? providers.length;

  // How many provider cards are rendered. Reset whenever the provider list
  // identity changes (new city or filter) so stale cards don't persist.
  const [displayLimit, setDisplayLimit] = useState(ITEMS_PER_PAGE);
  useEffect(() => {
    setDisplayLimit(ITEMS_PER_PAGE);
  }, [providers]);

  const visibleProviders = useMemo(
    () => providers.slice(0, displayLimit),
    [providers, displayLimit],
  );
  const hasMore = providers.length > displayLimit;

  return (
    <>
      {/* Summary line */}
      <p style={{
        fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: '#111',
        margin: 0, padding: '0 16px 8px', textAlign: 'center',
      }}>
        {loading ? 'Finding providers…' : `${count} provider${count !== 1 ? 's' : ''}`}
        {!loading && city && (
          <span style={{ fontWeight: 400, color: '#888' }}>
            {' · '}{city}{state ? `, ${state}` : ''}
          </span>
        )}
      </p>

      {/* Category pills strip — gate mode.
          touchAction: pan-x overrides the sheet scroller's pan-down so that
          horizontal swipes register as pill scrolls, not sheet drags. */}
      {mode === 'gate' && CATEGORY_PILLS.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            padding: '8px 16px 12px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            touchAction: 'pan-x',
          }}
        >
          {CATEGORY_PILLS.map((pill) => {
            const ct = categoryCounts[pill.label];
            const hasCount = ct != null && ct > 1;
            const isActive = activeCategorySlug === pill.slug;
            return (
              <button
                key={`sheet-cat-${pill.slug}`}
                type="button"
                onClick={() => onSelectCategory?.(pill)}
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '7px 14px',
                  borderRadius: 20,
                  border: isActive ? '2px solid #E8347A' : '1.5px solid #e0e0e0',
                  background: isActive ? '#fdf0f5' : 'white',
                  color: isActive ? '#E8347A' : '#555',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                  opacity: hasCount ? 1 : 0.45,
                  touchAction: 'manipulation',
                }}
              >
                <span>{pill.emoji}</span>
                <span>{pill.label}</span>
                {hasCount && (
                  <span style={{ fontWeight: 400, fontSize: 10, color: '#B8A89A' }}>
                    {ct}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Card list — MobileBottomSheet / Sheet.Content owns the scroll container */}
      <div style={{ paddingLeft: 8, paddingRight: 8 }}>
        {loading ? (
          <p style={{
            fontFamily: 'var(--font-body)', fontWeight: 300, fontStyle: 'italic',
            fontSize: 13, color: '#888', padding: '24px 16px', textAlign: 'center',
          }}>
            Finding med spas near you…
          </p>
        ) : providers.length === 0 ? (
          <p style={{
            fontFamily: 'var(--font-body)', fontWeight: 300, fontStyle: 'italic',
            fontSize: 13, color: '#888', padding: '24px 16px', textAlign: 'center',
          }}>
            No providers in this area yet.
          </p>
        ) : (
          <>
            {visibleProviders.map((p) => (
              <div
                key={p.key || p.provider_id || p.id}
                data-provider-card={p.provider_id || p.id}
                onClick={() => onProviderSelect?.(p)}
                style={{ cursor: onProviderSelect ? 'pointer' : undefined, minWidth: 0, overflow: 'hidden' }}
              >
                <MapProviderCard
                  provider={p}
                  selected={
                    selectedProviderId != null &&
                    (p.provider_id === selectedProviderId || p.id === selectedProviderId)
                  }
                  cityAvg={cityAvg}
                  bestPrice={p.bestPrice ?? p.avg_price}
                  bestPriceLabel={p.bestPriceLabel ?? null}
                />
              </div>
            ))}

            {/* Load more — avoids rendering 49+ cards at once */}
            {hasMore && (
              <button
                type="button"
                onClick={() => setDisplayLimit((l) => l + ITEMS_PER_PAGE)}
                style={{
                  width: '100%',
                  padding: '12px 0',
                  marginBottom: 8,
                  background: 'none',
                  border: '1px solid #EDE8E3',
                  borderRadius: 8,
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#888',
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                }}
              >
                Show {Math.min(ITEMS_PER_PAGE, providers.length - displayLimit)} more
                <span style={{ fontWeight: 300 }}>
                  {' '}({providers.length - displayLimit} remaining)
                </span>
              </button>
            )}

            {/* Unpriced providers */}
            {unpricedProviders.length > 0 && (
              <div style={{ padding: '0 4px' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '16px 0 8px', borderTop: '1px dashed #E0D6CE', marginTop: 4,
                }}>
                  <span style={{
                    fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B8A89A',
                  }}>
                    Also in this area — no prices yet
                  </span>
                </div>
                {unpricedProviders.map((up) => (
                  <div
                    key={up.id}
                    style={{
                      border: '1.5px dashed #E0D6CE', borderRadius: 12,
                      padding: '10px 12px', marginBottom: 6,
                      display: 'flex', alignItems: 'center', gap: 10, background: '#FAFAF8',
                    }}
                  >
                    <ProviderAvatar name={up.name || up.provider_name} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12,
                        color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {up.name || up.provider_name}
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: '#999' }}>
                        {up.google_rating ? `★ ${Number(up.google_rating).toFixed(1)}` : 'No reviews'}
                      </div>
                    </div>
                    <Link
                      to={`/log?provider_id=${up.id}&provider=${encodeURIComponent(up.name || up.provider_name || '')}&city=${encodeURIComponent(up.city || '')}&state=${encodeURIComponent(up.state || '')}`}
                      style={{
                        fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600,
                        color: '#E8347A', textDecoration: 'none', whiteSpace: 'nowrap',
                      }}
                    >
                      + Add price
                    </Link>
                  </div>
                ))}
                {unpricedTotal > unpricedProviders.length && (
                  <p style={{
                    fontFamily: 'var(--font-body)', fontSize: 11, color: '#B8A89A',
                    textAlign: 'center', margin: '10px 0 4px',
                  }}>
                    +{unpricedTotal - unpricedProviders.length} more providers nearby without prices yet
                  </p>
                )}
                <p style={{
                  fontFamily: 'var(--font-body)', fontSize: 11, color: '#B8A89A',
                  textAlign: 'center', margin: '10px 0 4px',
                }}>
                  Help women{city ? ` in ${city}` : ''} know what to expect — share what you paid.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
});

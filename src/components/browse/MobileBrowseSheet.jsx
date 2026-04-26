import { useRef, useEffect, useState, useMemo, memo } from 'react';
import { Link } from 'react-router-dom';
import { Drawer } from 'vaul';
import MapProviderCard from '../MapProviderCard';
import ProviderAvatar from '../ProviderAvatar';
import { CATEGORY_PILLS } from '../../lib/constants';

// Snap points:
//   peek  = '120px'  — handle + summary + pills + first card peeking. Maximum map.
//   half  =  0.5     — 50 % of viewport. Shows 3-4 cards; map still visible above.
//   full  =  0.93    — fills to within 60 px of the top (capped by maxHeight on
//                       Drawer.Content) so the search bar is always visible.
//
// Vaul 1.x treats any string snap point as pixels (parseInt). Fractions are
// relative to window.innerHeight. The '120px' value is device-independent.
const SNAP_POINTS = ['120px', 0.5, 0.93];
const ITEMS_PER_PAGE = 20;

// Translate the active Vaul snap value back to the name FindPrices uses for
// mapBottomPadding. Peek is a string ('120px'); half/full are numbers.
function snapName(s) {
  if (typeof s === 'string') return 'full_map'; // '120px' peek → show most of the map
  if (s >= 0.85) return 'full_list';
  if (s >= 0.4) return 'half';
  return 'full_map';
}

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
  onSnapChange,
  listingCount,
  unpricedProviders = [],
  unpricedTotal = 0,
}) {
  const listRef = useRef(null);
  const count = providerCount ?? providers.length;

  // Start at peek so users see most of the map on first open.
  const [snap, setSnap] = useState(SNAP_POINTS[0]);

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

  // Notify parent on snap change so map padding can update.
  useEffect(() => {
    onSnapChange?.(snapName(snap));
  }, [snap, onSnapChange]);

  // Pin-tap: expand to full and scroll the selected card into view.
  useEffect(() => {
    if (selectedProviderId == null) return;
    setSnap(SNAP_POINTS[2]); // full
    const timer = setTimeout(() => {
      const node = document.querySelector(
        `[data-provider-card="${selectedProviderId}"]`,
      );
      node?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 350);
    return () => clearTimeout(timer);
  }, [selectedProviderId]);

  return (
    <Drawer.Root
      open
      modal={false}
      dismissible={false}
      snapPoints={SNAP_POINTS}
      activeSnapPoint={snap}
      setActiveSnapPoint={setSnap}
      handleOnly
    >
      <Drawer.Portal>
        <Drawer.Content
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 35,
            background: 'white',
            borderRadius: '12px 12px 0 0',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
            display: 'flex',
            flexDirection: 'column',
            // Cap at (100dvh - 60px) so the full snap always leaves the
            // search bar visible at the top of the viewport.
            maxHeight: 'calc(100dvh - 60px)',
            outline: 'none',
          }}
        >
          {/* Drag handle — vaul v1 applies its own CSS (height:5px; width:32px)
              to [data-vaul-handle]; keep children minimal. */}
          <Drawer.Handle
            style={{ paddingTop: 10, paddingBottom: 4, cursor: 'grab', flexShrink: 0 }}
          />

          {/* Summary line */}
          <p style={{
            fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: '#111',
            margin: 0, padding: '0 16px 8px', textAlign: 'center', flexShrink: 0,
          }}>
            {loading ? 'Finding providers…' : `${count} provider${count !== 1 ? 's' : ''}`}
            {!loading && city && (
              <span style={{ fontWeight: 400, color: '#888' }}>
                {' · '}{city}{state ? `, ${state}` : ''}
              </span>
            )}
          </p>

          {/* Category pills strip — gate mode */}
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
                flexShrink: 0,
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

          {/* Scrollable card list — capped at ITEMS_PER_PAGE with "Show more" */}
          <div
            ref={listRef}
            style={{
              overflowY: 'auto',
              flex: 1,
              paddingLeft: 8,
              paddingRight: 8,
              paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
              WebkitOverflowScrolling: 'touch',
            }}
          >
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
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
});

import { useRef, useEffect, useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { Drawer } from 'vaul';
import MapProviderCard from '../MapProviderCard';
import ProviderAvatar from '../ProviderAvatar';
import { CATEGORY_PILLS } from '../../lib/constants';

// Snap points map to vaul's fractional snap values (0–1):
//   peek ≈ 25% (handle + summary + pills visible)
//   half ≈ 55% (3–4 cards visible)
//   full ≈ 92% (full scrollable list)
const SNAP_POINTS = [0.25, 0.55, 0.92];

// Map vaul snap fractions back to the names FindPrices expects
function snapName(fraction) {
  if (fraction >= 0.85) return 'full_list';
  if (fraction >= 0.4) return 'half';
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
  const [snap, setSnap] = useState(SNAP_POINTS[1]); // start at half

  // Notify parent on snap change so map padding can update
  useEffect(() => {
    onSnapChange?.(snapName(snap));
  }, [snap, onSnapChange]);

  // Pin-tap reaction: expand to full + scroll to the selected provider card
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
            maxHeight: '92vh',
            outline: 'none',
          }}
        >
          {/* Drag handle + summary line */}
          <Drawer.Handle
            style={{
              paddingTop: 10,
              paddingBottom: 4,
              cursor: 'grab',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: '#D1D5DB' }} />
            </div>
            <p style={{
              fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: '#111',
              margin: 0, padding: '0 16px', textAlign: 'center',
            }}>
              {loading ? 'Finding providers\u2026' : `${count} provider${count !== 1 ? 's' : ''}`}
              {!loading && city && (
                <span style={{ fontWeight: 400, color: '#888' }}>
                  {' \u00b7 '}{city}{state ? `, ${state}` : ''}
                </span>
              )}
            </p>
          </Drawer.Handle>

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

          {/* Scrollable card list */}
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
                Finding med spas near you\u2026
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
                {providers.map((p) => (
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
                            {up.google_rating ? `\u2605 ${Number(up.google_rating).toFixed(1)}` : 'No reviews'}
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

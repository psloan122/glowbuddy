import { useRef, useState, useEffect, useCallback, memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import MapProviderCard from '../MapProviderCard';
import ProviderAvatar from '../ProviderAvatar';
import { CATEGORY_PILLS } from '../../lib/constants';

// Snap positions — dvh from top (used as translateY %).
// Sheet is 100dvh tall, anchored at bottom:0.
const SNAP_FULL_MAP  = 84; // sheet barely visible — handle + summary line showing
const SNAP_HALF      = 50; // half map, half list
const SNAP_FULL_LIST = 8;  // full list, map almost hidden

const DIRECTION_LOCK_PX = 8; // pixels of movement before we commit to drag vs scroll
const SUPPORTS_DVH = typeof CSS !== 'undefined' && CSS.supports?.('height', '1dvh');

const SNAP_POINTS = [
  { name: 'full_list', y: SNAP_FULL_LIST },
  { name: 'half',      y: SNAP_HALF },
  { name: 'full_map',  y: SNAP_FULL_MAP },
];
const SNAP_Y = { full_list: SNAP_FULL_LIST, half: SNAP_HALF, full_map: SNAP_FULL_MAP };

function nearestSnap(y) {
  let best = SNAP_POINTS[0];
  for (const sp of SNAP_POINTS) {
    if (Math.abs(sp.y - y) < Math.abs(best.y - y)) best = sp;
  }
  return best.name;
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
}) {
  const [snap, setSnap] = useState('half'); // 'full_map' | 'half' | 'full_list'
  const [dragY, setDragY] = useState(null); // live translateY during drag
  const startYRef = useRef(null);
  const startSnapRef = useRef(null);
  const listRef = useRef(null);
  const handleRef = useRef(null);
  const sheetRef = useRef(null);

  // Gesture state: 'idle' | 'pending' | 'dragging' | 'scrolling'
  // - pending: touch started, waiting for DIRECTION_LOCK_PX to decide
  // - dragging: committed to sheet drag (preventDefault active)
  // - scrolling: committed to list scroll (browser handles it)
  const gestureRef = useRef('idle');

  const currentTranslateY = SNAP_Y[snap];

  // Notify parent of snap changes so it can adjust map padding
  useEffect(() => {
    onSnapChange?.(snap);
  }, [snap, onSnapChange]);

  // Pin-tap reaction: when selectedProviderId changes, expand to full list + scroll
  useEffect(() => {
    if (selectedProviderId == null) return;
    const raf = requestAnimationFrame(() => {
      setSnap('full_list');
    });
    const timer = setTimeout(() => {
      const node = document.querySelector(
        `[data-provider-card="${selectedProviderId}"]`,
      );
      node?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 350);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [selectedProviderId]);

  // ── Drag handle: ALWAYS drags the sheet ──────────────────────────
  // Registered as non-passive so preventDefault() works on iOS Safari.
  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;

    function onStart(e) {
      startYRef.current = e.touches[0].clientY;
      startSnapRef.current = snap;
      gestureRef.current = 'dragging'; // handle always drags
    }

    function onMove(e) {
      if (gestureRef.current !== 'dragging') return;
      e.preventDefault(); // works because listener is { passive: false }

      const deltaPixels = e.touches[0].clientY - startYRef.current;
      const deltaPct = (deltaPixels / window.innerHeight) * 100;
      const baseY = SNAP_Y[startSnapRef.current];
      const newY = Math.max(SNAP_FULL_LIST - 2, Math.min(SNAP_FULL_MAP + 3, baseY + deltaPct));
      setDragY(newY);
    }

    function onEnd() {
      finishDrag();
    }

    handle.addEventListener('touchstart', onStart, { passive: true });
    handle.addEventListener('touchmove', onMove, { passive: false });
    handle.addEventListener('touchend', onEnd, { passive: true });
    handle.addEventListener('touchcancel', onEnd, { passive: true });

    return () => {
      handle.removeEventListener('touchstart', onStart);
      handle.removeEventListener('touchmove', onMove);
      handle.removeEventListener('touchend', onEnd);
      handle.removeEventListener('touchcancel', onEnd);
    };
  }, [snap]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── List area: scroll vs drag disambiguation ─────────────────────
  // Uses non-passive touchmove so we can preventDefault() when dragging.
  //
  // Rules:
  //   FULL_MAP or HALF → always drag (list shouldn't scroll when partially hidden)
  //   FULL_LIST + scrollTop > 0 → always scroll
  //   FULL_LIST + scrollTop === 0 + swipe DOWN → drag sheet down
  //   FULL_LIST + scrollTop === 0 + swipe UP → scroll list
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    function onStart(e) {
      startYRef.current = e.touches[0].clientY;
      startSnapRef.current = snap;

      if (snap !== 'full_list') {
        // In full_map or half mode, the list shouldn't scroll — always drag
        gestureRef.current = 'dragging';
      } else if (list.scrollTop > 0) {
        // Already scrolled down — let browser handle scroll
        gestureRef.current = 'scrolling';
      } else {
        // At top of list — wait for direction
        gestureRef.current = 'pending';
      }
    }

    function onMove(e) {
      const touchY = e.touches[0].clientY;
      const deltaPixels = touchY - startYRef.current;

      if (gestureRef.current === 'pending') {
        // Haven't committed yet — check if enough movement to decide
        if (Math.abs(deltaPixels) < DIRECTION_LOCK_PX) return;

        if (deltaPixels > 0) {
          // Swiping DOWN from top of list → drag sheet down
          gestureRef.current = 'dragging';
        } else {
          // Swiping UP from top of list → scroll the list
          gestureRef.current = 'scrolling';
          return; // let browser handle this move
        }
      }

      if (gestureRef.current === 'dragging') {
        e.preventDefault(); // works because { passive: false }

        const deltaPct = (deltaPixels / window.innerHeight) * 100;
        const baseY = SNAP_Y[startSnapRef.current];
        const newY = Math.max(SNAP_FULL_LIST - 2, Math.min(SNAP_FULL_MAP + 3, baseY + deltaPct));
        setDragY(newY);
      }

      // gestureRef === 'scrolling' → do nothing, browser scrolls natively
    }

    function onEnd() {
      if (gestureRef.current === 'dragging') {
        finishDrag();
      } else {
        gestureRef.current = 'idle';
        startYRef.current = null;
      }
    }

    list.addEventListener('touchstart', onStart, { passive: true });
    list.addEventListener('touchmove', onMove, { passive: false });
    list.addEventListener('touchend', onEnd, { passive: true });
    list.addEventListener('touchcancel', onEnd, { passive: true });

    return () => {
      list.removeEventListener('touchstart', onStart);
      list.removeEventListener('touchmove', onMove);
      list.removeEventListener('touchend', onEnd);
      list.removeEventListener('touchcancel', onEnd);
    };
  }, [snap]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Shared drag finish logic ─────────────────────────────────────
  // The `dragY` ref trick avoids stale closure — we read it from a ref
  // in finishDrag but setDragY for React re-renders.
  const dragYRef = useRef(null);
  useEffect(() => { dragYRef.current = dragY; }, [dragY]);

  const finishDrag = useCallback(() => {
    gestureRef.current = 'idle';
    const currentDragY = dragYRef.current;

    if (startYRef.current == null || currentDragY == null) {
      setDragY(null);
      startYRef.current = null;
      return;
    }

    // Snap to nearest of the 3 positions
    setSnap(nearestSnap(currentDragY));
    setDragY(null);
    startYRef.current = null;
  }, []);

  // When snap moves away from full_list, reset list scroll so next
  // expansion starts fresh at the top.
  useEffect(() => {
    if (snap !== 'full_list' && listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [snap]);

  const translateY = dragY != null ? dragY : currentTranslateY;
  const isTransitioning = dragY == null; // only animate when not actively dragging
  const allowScroll = snap === 'full_list';

  const count = providerCount ?? providers.length;
  const listings = listingCount ?? count;
  const showListings = listings !== count;

  return (
    <div
      ref={sheetRef}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: SUPPORTS_DVH ? '100dvh' : '100vh',
        transform: `translateY(${translateY}%)`,
        transition: isTransitioning ? 'transform 0.3s ease' : 'none',
        borderRadius: '12px 12px 0 0',
        zIndex: 35,
        background: 'white',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
        willChange: 'transform',
      }}
    >
      {/* Drag handle + summary line */}
      <div ref={handleRef} style={{ touchAction: 'none', paddingTop: 10, paddingBottom: 4, cursor: 'grab' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#D1D5DB' }} />
        </div>
        <p style={{
          fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 14, color: '#111',
          margin: 0, padding: '0 16px', textAlign: 'center',
        }}>
          {loading ? 'Finding providers…' : `${count} provider${count !== 1 ? 's' : ''}`}
          {!loading && city && <span style={{ fontWeight: 400, color: '#888' }}>{' \u00b7 '}{city}{state ? `, ${state}` : ''}</span>}
        </p>
      </div>

      {/* Category pills strip */}
      {CATEGORY_PILLS.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            padding: '0 16px 12px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            touchAction: 'pan-x',
          }}
        >
          {CATEGORY_PILLS.map((pill) => {
            const ct = categoryCounts[pill.label];
            const hasCount = ct != null && ct > 0;
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
                  border: isActive
                    ? '2px solid #E8347A'
                    : '1.5px solid #e0e0e0',
                  background: isActive ? '#fdf0f5' : 'white',
                  color: isActive ? '#E8347A' : '#555',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                  opacity: hasCount ? 1 : 0.45,
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

      {/* Scrollable card list — gesture disambiguation handled via
          non-passive addEventListener in the effect above */}
      <div
        ref={listRef}
        style={{
          overflowY: allowScroll ? 'auto' : 'hidden',
          height: 'calc(100% - 80px)',
          paddingLeft: 8,
          paddingRight: 8,
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {loading ? (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 300,
              fontStyle: 'italic',
              fontSize: 13,
              color: '#888',
              padding: '24px 16px',
              textAlign: 'center',
            }}
          >
            Finding med spas near you…
          </p>
        ) : providers.length === 0 ? (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 300,
              fontStyle: 'italic',
              fontSize: 13,
              color: '#888',
              padding: '24px 16px',
              textAlign: 'center',
            }}
          >
            No providers in this area yet.
          </p>
        ) : (
          <>
          {providers.map((p) => (
            <div
              key={p.key || p.provider_id || p.id}
              onClick={() => onProviderSelect?.(p)}
              style={{ cursor: onProviderSelect ? 'pointer' : undefined }}
            >
              <MapProviderCard
                provider={p}
                selected={
                  selectedProviderId != null &&
                  (p.provider_id === selectedProviderId || p.id === selectedProviderId)
                }
                cityAvg={cityAvg}
                bestPrice={p.bestPrice ?? p.avg_price}
              />
            </div>
          ))}
          {/* Unpriced providers — dashed cards below priced list */}
          {unpricedProviders.length > 0 && (
            <div style={{ padding: '0 4px' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '16px 0 8px', borderTop: '1px dashed #E0D6CE',
                marginTop: 4,
              }}>
                <span style={{
                  fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B8A89A',
                }}>
                  {unpricedProviders.length} more — no prices yet
                </span>
              </div>
              {unpricedProviders.map((p) => (
                <div
                  key={p.id}
                  style={{
                    border: '1.5px dashed #E0D6CE',
                    borderRadius: 12,
                    padding: '10px 12px',
                    marginBottom: 6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: '#FAFAF8',
                  }}
                >
                  <ProviderAvatar name={p.name || p.provider_name} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 12, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name || p.provider_name}
                    </div>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: '#999' }}>
                      {p.google_rating ? `★ ${Number(p.google_rating).toFixed(1)}` : 'No reviews'}
                    </div>
                  </div>
                  <Link
                    to="/log"
                    style={{
                      fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 600,
                      color: '#E8347A', textDecoration: 'none', whiteSpace: 'nowrap',
                    }}
                  >
                    + Add price
                  </Link>
                </div>
              ))}
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
});

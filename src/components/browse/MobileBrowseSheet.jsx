import { useRef, useState, useEffect, useCallback, memo, useMemo } from 'react';
import MapProviderCard from '../MapProviderCard';

// Snap positions — dvh from top (used as translateY %).
// Sheet is 100dvh tall, anchored at bottom:0.
const SNAP_FULL_MAP  = 88; // sheet barely visible — just handle + toggle showing
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
  onSelectPill,
  pills,
  pillCounts = {},
  onProviderSelect,
  onSnapChange,
  listingCount,
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
      {/* Snap toggle buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 12,
          paddingTop: 8,
          paddingBottom: 4,
        }}
      >
        {[
          { label: '\uD83D\uDDFA Map', target: 'full_map' },
          { label: '\u25A0\u25A0 Split', target: 'half' },
          { label: '\u2630 List', target: 'full_list' },
        ].map(({ label, target }) => (
          <button
            key={target}
            type="button"
            onClick={() => setSnap(target)}
            style={{
              padding: '4px 12px',
              borderRadius: 14,
              border: `1px solid ${snap === target ? '#E8347A' : '#EDE8E3'}`,
              background: snap === target ? '#E8347A' : 'white',
              color: snap === target ? '#fff' : '#666',
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              fontSize: 11,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Drag handle — always controls sheet drag */}
      <div
        ref={handleRef}
        style={{
          display: 'flex',
          justifyContent: 'center',
          paddingTop: 6,
          paddingBottom: 6,
          cursor: 'grab',
          touchAction: 'none', // prevent browser scroll on the handle
        }}
      >
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: '#D1D5DB',
          }}
        />
      </div>

      {/* Header */}
      <div style={{ padding: '0 16px 8px' }}>
        <p
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 300,
            fontSize: 13,
            color: '#888',
            margin: 0,
          }}
        >
          {loading
            ? 'Finding providers\u2026'
            : showListings
              ? `${count} ${count === 1 ? 'med spa' : 'med spas'}  \u00b7  ${listings} ${listings === 1 ? 'price' : 'prices'} in ${city || ''}${state ? `, ${state}` : ''}`
              : `${count} provider${count !== 1 ? 's' : ''} in ${city || ''}${state ? `, ${state}` : ''}`}
        </p>
      </div>

      {/* Procedure pills strip (gate mode only) */}
      {mode === 'gate' && pills && pills.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            padding: '0 16px 12px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            touchAction: 'pan-x', // allow horizontal scroll, not vertical
          }}
        >
          {pills.map((pill) => {
            const ct = pillCounts[pill.label];
            const hasCount = ct != null && ct > 0;
            return (
              <button
                key={`sheet-pill-${pill.slug}-${pill.brand || 'base'}`}
                type="button"
                onClick={() => onSelectPill?.(pill)}
                style={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '8px 14px',
                  borderRadius: 2,
                  border: '1px solid #EDE8E3',
                  background: 'white',
                  color: '#555',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 500,
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  opacity: hasCount ? 1 : 0.45,
                }}
              >
                {pill.label}
                {hasCount && (
                  <span style={{ fontWeight: 400, fontSize: 9, color: '#B8A89A', letterSpacing: 0, textTransform: 'none' }}>
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
          paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
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
            Finding med spas near you\u2026
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
          providers.map((p) => (
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
          ))
        )}
      </div>
    </div>
  );
});

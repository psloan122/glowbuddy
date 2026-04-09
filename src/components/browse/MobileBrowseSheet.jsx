import { useRef, useState, useEffect, useCallback, memo } from 'react';
import MapProviderCard from '../MapProviderCard';

const PEEK_Y = 45; // translateY(45%) — map visible in top ~55%
const FULL_Y = 5;  // translateY(5%) — sheet covers ~95%
const SNAP_THRESHOLD = 15; // percentage delta to trigger snap switch
const DIRECTION_LOCK_PX = 8; // pixels of movement before we commit to drag vs scroll
const SUPPORTS_DVH = typeof CSS !== 'undefined' && CSS.supports?.('height', '1dvh');

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
  onProviderSelect,
}) {
  const [snap, setSnap] = useState('peek'); // 'peek' | 'full'
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

  const currentTranslateY = snap === 'peek' ? PEEK_Y : FULL_Y;

  // Pin-tap reaction: when selectedProviderId changes, expand + scroll
  useEffect(() => {
    if (selectedProviderId == null) return;
    const raf = requestAnimationFrame(() => {
      setSnap('full');
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
      const baseY = startSnapRef.current === 'peek' ? PEEK_Y : FULL_Y;
      const newY = Math.max(FULL_Y, Math.min(PEEK_Y + 5, baseY + deltaPct));
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
  //   PEEK mode → always drag (list shouldn't scroll when half-hidden)
  //   FULL mode + scrollTop > 0 → always scroll
  //   FULL mode + scrollTop === 0 + swipe DOWN → drag sheet closed
  //   FULL mode + scrollTop === 0 + swipe UP → scroll list
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    function onStart(e) {
      startYRef.current = e.touches[0].clientY;
      startSnapRef.current = snap;

      if (snap === 'peek') {
        // In peek mode, the list shouldn't scroll — always drag
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
          // Swiping DOWN from top of list → drag sheet closed
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
        const baseY = startSnapRef.current === 'peek' ? PEEK_Y : FULL_Y;
        const newY = Math.max(FULL_Y, Math.min(PEEK_Y + 5, baseY + deltaPct));
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
  // Using useCallback so the effect cleanups don't stale-close over it.
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

    const baseY = startSnapRef.current === 'peek' ? PEEK_Y : FULL_Y;
    const deltaPct = currentDragY - baseY;

    if (Math.abs(deltaPct) > SNAP_THRESHOLD) {
      setSnap(deltaPct > 0 ? 'peek' : 'full');
    }

    setDragY(null);
    startYRef.current = null;
  }, []);

  // When snap changes to peek, reset list scroll so next expansion
  // starts fresh at the top.
  useEffect(() => {
    if (snap === 'peek' && listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [snap]);

  const translateY = dragY != null ? dragY : currentTranslateY;
  const isTransitioning = dragY == null; // only animate when not actively dragging

  const count = providerCount ?? providers.length;

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
      {/* Drag handle — always controls sheet drag */}
      <div
        ref={handleRef}
        style={{
          display: 'flex',
          justifyContent: 'center',
          paddingTop: 10,
          paddingBottom: 6,
          cursor: 'grab',
          touchAction: 'none', // prevent browser scroll on the handle
        }}
      >
        <div
          style={{
            width: 40,
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
            ? 'Finding providers…'
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
          {pills.map((pill) => (
            <button
              key={`sheet-pill-${pill.slug}-${pill.brand || 'base'}`}
              type="button"
              onClick={() => onSelectPill?.(pill)}
              style={{
                flexShrink: 0,
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
              }}
            >
              {pill.label}
            </button>
          ))}
        </div>
      )}

      {/* Scrollable card list — gesture disambiguation handled via
          non-passive addEventListener in the effect above */}
      <div
        ref={listRef}
        style={{
          overflowY: snap === 'peek' ? 'hidden' : 'auto',
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

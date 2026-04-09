import { useRef, useState, useEffect, useCallback, memo } from 'react';
import MapProviderCard from '../MapProviderCard';

const PEEK_Y = 45; // translateY(45%) — map visible in top ~55%
const FULL_Y = 5;  // translateY(5%) — sheet covers ~95%
const SNAP_THRESHOLD = 15; // percentage delta to trigger snap switch

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
  const sheetRef = useRef(null);
  const isDraggingSheet = useRef(false);

  const currentTranslateY = snap === 'peek' ? PEEK_Y : FULL_Y;

  // Pin-tap reaction: when selectedProviderId changes, expand + scroll
  useEffect(() => {
    if (selectedProviderId == null) return;
    // Wrap in rAF so the state update doesn't happen synchronously
    // within the effect (satisfies react-hooks/set-state-in-effect).
    const raf = requestAnimationFrame(() => {
      setSnap('full');
    });
    // Delay scroll to let the sheet animate open
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

  // Touch handlers for drag handle area
  const handleTouchStart = useCallback(
    (e) => {
      // Scroll-vs-drag disambiguation:
      // When FULL and list has scrolled down, let browser handle scroll
      if (snap === 'full' && listRef.current && listRef.current.scrollTop > 0) {
        return; // don't intercept, let native scroll happen
      }
      startYRef.current = e.touches[0].clientY;
      startSnapRef.current = snap;
      isDraggingSheet.current = true;
    },
    [snap],
  );

  const handleTouchMove = useCallback(
    (e) => {
      if (!isDraggingSheet.current || startYRef.current == null) return;

      // If in FULL mode, check if user is scrolling the list
      if (startSnapRef.current === 'full' && listRef.current) {
        if (listRef.current.scrollTop > 0) {
          // User has scrolled the list — release drag, let browser scroll
          isDraggingSheet.current = false;
          setDragY(null);
          return;
        }
      }

      const deltaPixels = e.touches[0].clientY - startYRef.current;
      const deltaPct = (deltaPixels / window.innerHeight) * 100;
      const baseY = startSnapRef.current === 'peek' ? PEEK_Y : FULL_Y;
      const newY = Math.max(FULL_Y, Math.min(PEEK_Y + 5, baseY + deltaPct));
      setDragY(newY);

      // Prevent page scroll while dragging the sheet
      e.preventDefault();
    },
    [],
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDraggingSheet.current) return;
    isDraggingSheet.current = false;

    if (startYRef.current == null || dragY == null) {
      setDragY(null);
      startYRef.current = null;
      return;
    }

    const baseY = startSnapRef.current === 'peek' ? PEEK_Y : FULL_Y;
    const deltaPct = dragY - baseY;

    if (Math.abs(deltaPct) > SNAP_THRESHOLD) {
      // Crossed threshold — switch snap state
      setSnap(deltaPct > 0 ? 'peek' : 'full');
    }
    // else snap back to current position

    setDragY(null);
    startYRef.current = null;
  }, [dragY]);

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
        height: '100dvh',
        transform: `translateY(${translateY}%)`,
        transition: isTransitioning ? 'transform 0.3s ease' : 'none',
        borderRadius: '12px 12px 0 0',
        zIndex: 35,
        background: 'white',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
        willChange: 'transform',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Drag handle */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          paddingTop: 10,
          paddingBottom: 6,
          cursor: 'grab',
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

      {/* Scrollable card list */}
      <div
        ref={listRef}
        style={{
          overflowY: 'auto',
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

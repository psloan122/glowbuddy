import { useRef, useState, useCallback } from 'react';
import MapProviderCard from './MapProviderCard';

const COLLAPSED_HEIGHT = 100;
const SWIPE_THRESHOLD = 50;

export default function MobileSheet({ providers, expanded, onToggle }) {
  const startYRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleTouchStart = useCallback((e) => {
    startYRef.current = e.touches[0].clientY;
    setDragging(true);
  }, []);

  const handleTouchEnd = useCallback(
    (e) => {
      if (startYRef.current == null) return;
      const delta = startYRef.current - e.changedTouches[0].clientY;
      if (Math.abs(delta) > SWIPE_THRESHOLD) {
        onToggle(delta > 0); // swipe up = expand, swipe down = collapse
      }
      startYRef.current = null;
      setDragging(false);
    },
    [onToggle]
  );

  return (
    <div
      className="md:hidden fixed bottom-14 left-0 right-0 bg-white rounded-t-2xl shadow-[0_-4px_24px_rgba(0,0,0,0.1)] z-30 transition-all duration-300 ease-out"
      style={{
        height: expanded ? '60vh' : COLLAPSED_HEIGHT,
        transform: 'translateZ(0)', // GPU layer
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Handle */}
      <div className="flex flex-col items-center pt-2 pb-1 cursor-grab">
        <div className="w-10 h-1 rounded-full bg-gray-300" />
      </div>

      {/* Peek header */}
      <div className="px-4 pb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-text-primary">
          {providers.length} provider{providers.length !== 1 ? 's' : ''} nearby
        </span>
        <button
          onClick={() => onToggle(!expanded)}
          className="text-xs font-medium text-rose-accent min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          {expanded ? 'Collapse' : 'View all'}
        </button>
      </div>

      {/* Scrollable list (only when expanded) */}
      {expanded && (
        <div className="overflow-y-auto px-2 pb-6" style={{ height: 'calc(60vh - 64px)' }}>
          {providers.map((p) => (
            <MapProviderCard key={p.key} provider={p} />
          ))}
          {providers.length === 0 && (
            <p className="text-sm text-text-secondary text-center py-6">
              No providers in this area yet. Know Before You Glow is growing &mdash; your city might be next.
            </p>
          )}
        </div>
      )}

      {/* Peek preview (collapsed — show first 1-2 names) */}
      {!expanded && providers.length > 0 && (
        <div className="px-4">
          <p className="text-xs text-text-secondary truncate">
            {providers
              .slice(0, 2)
              .map((p) => p.provider_name)
              .join(' · ')}
            {providers.length > 2 ? ` +${providers.length - 2} more` : ''}
          </p>
        </div>
      )}
    </div>
  );
}

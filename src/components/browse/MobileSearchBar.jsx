import { Search, SlidersHorizontal } from 'lucide-react';

export default function MobileSearchBar({ procedureLabel, cityLabel, onExpand }) {
  const hasSearch = procedureLabel || cityLabel;

  return (
    <button
      type="button"
      onClick={onExpand}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        height: 52,
        padding: '0 14px',
        background: 'white',
        border: 'none',
        borderRadius: 26,
        boxShadow: '0 2px 10px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
      }}
    >
      {/* Left: search icon + context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <Search size={16} style={{ color: '#888', flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          {hasSearch ? (
            <>
              <p style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: 13,
                color: '#111',
                margin: 0,
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {procedureLabel || 'Any treatment'}
              </p>
              <p style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 400,
                fontSize: 11,
                color: '#888',
                margin: 0,
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {cityLabel || 'Any location'}
              </p>
            </>
          ) : (
            <p style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 500,
              fontSize: 13,
              color: '#888',
              margin: 0,
            }}>
              What are you looking for?
            </p>
          )}
        </div>
      </div>

      {/* Right: filter icon circle */}
      <div style={{
        width: 32,
        height: 32,
        borderRadius: 16,
        border: '1px solid #DDD',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        marginLeft: 8,
      }}>
        <SlidersHorizontal size={13} style={{ color: '#555' }} />
      </div>
    </button>
  );
}

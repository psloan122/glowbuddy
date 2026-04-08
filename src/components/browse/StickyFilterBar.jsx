/*
 * StickyFilterBar — sticks at top below the navbar.
 *
 * Contains:
 *   - Brand pills (only when the active category has multiple brands)
 *   - Has prices toggle
 *   - Verified only toggle
 *   - Sort dropdown (Lowest Price / Highest Rated / Most Recent / Nearest)
 *
 * All controls are controlled — parent owns state and pushes updates to
 * the URL via useSearchParams. The component itself never touches storage.
 *
 * Mobile (< 768px): horizontal scroll, no wrapping. The sticky bar is
 * narrower (top: 56px) so it sits flush under the mobile nav.
 */

import { ChevronDown } from 'lucide-react';

export default function StickyFilterBar({
  brandPills = [],
  activeBrand,
  onBrandChange,
  sortBy,
  onSortChange,
  hasPricesOnly,
  onHasPricesToggle,
  verifiedOnly,
  onVerifiedToggle,
  topOffset = 124, // desktop default (navbar 64 + search header 60)
  mobileTopOffset = 110, // mobile default (navbar 52 + search header 58)
  userHasLocation = false,
}) {
  const togglePillStyle = (active) => ({
    height: 32,
    padding: '0 12px',
    border: `1px solid ${active ? '#E8347A' : '#DDD'}`,
    background: active ? '#E8347A' : 'white',
    color: active ? 'white' : '#111',
    borderRadius: 2,
    fontFamily: 'var(--font-body)',
    fontSize: 11,
    fontWeight: 500,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  });

  const brandPillStyle = (active) => ({
    height: 32,
    padding: '0 14px',
    border: `1px solid ${active ? '#E8347A' : '#EDE8E3'}`,
    background: active ? '#E8347A' : 'white',
    color: active ? 'white' : '#666',
    borderRadius: 2,
    fontFamily: 'var(--font-body)',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    flexShrink: 0,
  });

  return (
    <>
      <style>{`
        .sticky-filter-bar { top: ${topOffset}px; }
        @media (max-width: 767px) {
          .sticky-filter-bar { top: ${mobileTopOffset}px; padding: 8px 12px !important; }
          .sticky-filter-bar-inner { gap: 6px !important; }
        }
        .sticky-filter-bar-inner::-webkit-scrollbar { display: none; }
      `}</style>
      <div
        className="sticky-filter-bar"
        style={{
          position: 'sticky',
          zIndex: 100,
          background: 'white',
          borderBottom: '1px solid #EDE8E3',
          padding: '10px 16px',
        }}
      >
        <div
          className="sticky-filter-bar-inner"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {/* Brand pills (e.g. Botox / Dysport / Xeomin) */}
          {brandPills.length > 0 && (
            <>
              {brandPills.map((p) => {
                const isActive = activeBrand === p.brand;
                return (
                  <button
                    key={p.brand || p.label}
                    type="button"
                    onClick={() => onBrandChange?.(isActive ? null : p.brand)}
                    style={brandPillStyle(isActive)}
                  >
                    {p.label}
                  </button>
                );
              })}
              <span
                aria-hidden="true"
                style={{
                  width: 1,
                  height: 20,
                  background: '#EDE8E3',
                  flexShrink: 0,
                  margin: '0 4px',
                }}
              />
            </>
          )}

          {/* Has prices toggle */}
          <button
            type="button"
            onClick={() => onHasPricesToggle?.(!hasPricesOnly)}
            style={togglePillStyle(hasPricesOnly)}
            aria-pressed={hasPricesOnly}
          >
            {hasPricesOnly && <span style={{ fontSize: 10 }}>&#10003;</span>}
            Has prices
          </button>

          {/* Verified only toggle */}
          <button
            type="button"
            onClick={() => onVerifiedToggle?.(!verifiedOnly)}
            style={togglePillStyle(verifiedOnly)}
            aria-pressed={verifiedOnly}
          >
            {verifiedOnly && <span style={{ fontSize: 10 }}>&#10003;</span>}
            Verified only
          </button>

          {/* Sort dropdown */}
          <div
            style={{
              position: 'relative',
              marginLeft: 'auto',
              flexShrink: 0,
            }}
          >
            <select
              value={sortBy}
              onChange={(e) => onSortChange?.(e.target.value)}
              style={{
                appearance: 'none',
                height: 32,
                padding: '0 32px 0 12px',
                border: '1px solid #DDD',
                background: 'white',
                color: '#111',
                borderRadius: 2,
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="lowest_price">Lowest Price</option>
              <option value="highest_rated">Highest Rated</option>
              <option value="most_recent">Most Recent</option>
              {userHasLocation && <option value="nearest">Nearest</option>}
            </select>
            <ChevronDown
              size={12}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                color: '#666',
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

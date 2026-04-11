/*
 * StickyFilterBar — sticks at top below the navbar.
 *
 * Contains:
 *   - Has prices toggle
 *   - Verified only toggle
 *   - Estimate pill (neurotoxin only — opens dosing calculator dropdown)
 *   - Sort dropdown (Lowest Price / Highest Rated / Most Recent / Nearest)
 *
 * All controls are controlled — parent owns state and pushes updates to
 * the URL via useSearchParams. The component itself never touches storage.
 *
 * Mobile (< 768px): horizontal scroll, no wrapping. The sticky bar is
 * narrower (top: 56px) so it sits flush under the mobile nav.
 */

import { useEffect, useRef, useMemo, memo } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { NEUROTOXIN_DOSING } from '../../data/dosingGuidance';
import useDosingStore from '../../stores/dosingStore';

export default memo(function StickyFilterBar({
  sortBy,
  onSortChange,
  hasPricesOnly,
  onHasPricesToggle,
  verifiedOnly,
  onVerifiedToggle,
  topOffset = 124,
  mobileTopOffset = 110,
  userHasLocation = false,
  isNeurotoxin = false,
  brand = 'botox',
}) {
  // Zustand dosing store
  const selectedAreas = useDosingStore((s) => s.selectedAreas);
  const calculatorOpen = useDosingStore((s) => s.calculatorOpen);
  const toggleCalculator = useDosingStore((s) => s.toggleCalculator);
  const closeCalculator = useDosingStore((s) => s.closeCalculator);
  const toggleArea = useDosingStore((s) => s.toggleArea);
  const clearAreas = useDosingStore((s) => s.clearAreas);
  const estimateUnitRange = useDosingStore((s) => s.estimateUnitRange);
  const estimateUnitsCrossCalc = useDosingStore((s) => s.estimateUnitsCrossCalc);

  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  const hasSelection = isNeurotoxin && selectedAreas.length > 0;

  // Click outside to close
  useEffect(() => {
    if (!calculatorOpen) return;
    function handleClick(e) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        buttonRef.current && !buttonRef.current.contains(e.target)
      ) {
        closeCalculator();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [calculatorOpen, closeCalculator]);

  const brandData = NEUROTOXIN_DOSING[brand];
  const areaEntries = useMemo(
    () => (brandData ? Object.entries(brandData.areas) : []),
    [brandData],
  );
  const range = estimateUnitRange(brand);
  const crossBrand = brand === 'botox' ? 'dysport' : brand === 'dysport' ? 'botox' : null;
  const crossUnits = crossBrand ? estimateUnitsCrossCalc(brand, crossBrand) : null;
  const crossLabel = crossBrand ? NEUROTOXIN_DOSING[crossBrand]?.brandName : null;

  const unitText = range
    ? range.min === range.max ? `${range.min} units` : `${range.min}\u2013${range.max} units`
    : null;

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

  return (
    <>
      <style>{`
        .sticky-filter-bar { top: ${topOffset}px; }
        @media (max-width: 767px) {
          .sticky-filter-bar { top: ${mobileTopOffset}px; padding: 8px 12px !important; }
          .sticky-filter-bar-inner { gap: 6px !important; }
          .sfb-estimate-dropdown { position: fixed !important; top: auto !important; bottom: 64px !important; left: 0 !important; right: 0 !important; width: auto !important; max-width: 100vw !important; border-radius: 16px 16px 0 0 !important; }
        }
        .sticky-filter-bar-inner::-webkit-scrollbar { display: none; }
        .sfb-chip-scroll::-webkit-scrollbar { display: none; }
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

          {/* Estimate pill — neurotoxin only */}
          {isNeurotoxin && (
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button
                ref={buttonRef}
                type="button"
                onClick={toggleCalculator}
                style={{
                  height: 32,
                  padding: '0 12px',
                  border: `1px solid ${hasSelection || calculatorOpen ? '#E8347A' : '#DDD'}`,
                  background: hasSelection ? '#FDF2F7' : calculatorOpen ? '#FDF2F7' : 'white',
                  color: hasSelection || calculatorOpen ? '#E8347A' : '#111',
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
                }}
              >
                {hasSelection
                  ? `\uD83D\uDC89 ${selectedAreas.length} area${selectedAreas.length > 1 ? 's' : ''}`
                  : '\uD83D\uDC89 Estimate'}
              </button>

              {/* Dropdown panel */}
              {calculatorOpen && (
                <div
                  ref={dropdownRef}
                  className="sfb-estimate-dropdown"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    zIndex: 200,
                    background: 'white',
                    border: '1px solid #EDE8E3',
                    borderRadius: 12,
                    padding: 16,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    width: 420,
                    maxWidth: '90vw',
                  }}
                >
                  {/* Dropdown header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 12,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#111',
                      }}
                    >
                      Select treatment areas
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {hasSelection && (
                        <button
                          type="button"
                          onClick={clearAreas}
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontSize: 11,
                            fontWeight: 500,
                            color: '#999',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          Clear
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={closeCalculator}
                        aria-label="Close"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          lineHeight: 0,
                        }}
                      >
                        <X size={14} color="#999" />
                      </button>
                    </div>
                  </div>

                  {/* Horizontally scrollable area chips */}
                  <div
                    className="sfb-chip-scroll"
                    style={{
                      display: 'flex',
                      gap: 6,
                      overflowX: 'auto',
                      scrollbarWidth: 'none',
                      WebkitOverflowScrolling: 'touch',
                      flexWrap: 'nowrap',
                      paddingBottom: 2,
                    }}
                  >
                    {areaEntries.map(([id, area]) => {
                      const active = selectedAreas.includes(id);
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => toggleArea(id)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: 14,
                            border: `1px solid ${active ? '#E8347A' : '#EDE8E3'}`,
                            background: active ? '#FDF2F7' : '#fff',
                            color: active ? '#E8347A' : '#555',
                            fontFamily: 'var(--font-body)',
                            fontSize: 11,
                            fontWeight: active ? 600 : 400,
                            cursor: 'pointer',
                            transition: 'all 80ms',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            lineHeight: 1.3,
                          }}
                        >
                          {area.label}
                          {active && <span style={{ marginLeft: 4 }}>&times;</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Estimate summary */}
                  {hasSelection && unitText && (
                    <p
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: 11,
                        fontWeight: 400,
                        color: '#666',
                        margin: '10px 0 0 0',
                        lineHeight: 1.4,
                      }}
                    >
                      <span style={{ fontWeight: 600, color: '#333' }}>Your estimate:</span>{' '}
                      {unitText}
                      {crossUnits != null && (
                        <span style={{ color: '#999' }}>
                          {'  \u00b7  '}{crossLabel}: ~{crossUnits} units
                          {brand === 'botox' ? ' (2.5:1)' : brand === 'dysport' ? ' (1:2.5)' : ''}
                        </span>
                      )}
                    </p>
                  )}

                  {/* Disclaimer */}
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 9,
                      fontWeight: 300,
                      color: '#CCC',
                      margin: '8px 0 0 0',
                    }}
                  >
                    Based on typical clinical dosing. Actual units determined by your provider.
                  </p>
                </div>
              )}
            </div>
          )}

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
});

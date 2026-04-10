/**
 * DosingCalculator — compact inline area-picker + live unit estimator
 * powered by the Zustand dosing store.
 *
 * Collapsed (default): single 44px row showing selected area chips + unit count.
 * Expanded (on click): horizontal-scrolling area chips + unit summary.
 *
 * Shows UNITS ONLY — no dollar amounts. Each PriceCard computes its own
 * cost estimate using the provider's actual per-unit price × the unit
 * range from this calculator.
 *
 * Props:
 *   brand — 'botox' | 'dysport' | 'xeomin' | 'jeuveau' (default 'botox')
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { Syringe, X } from 'lucide-react';
import { NEUROTOXIN_DOSING } from '../data/dosingGuidance';
import useDosingStore from '../stores/dosingStore';

// Hide scrollbar across browsers
const SCROLL_HIDE_ID = 'dosing-calc-scrollbar-hide';
function ensureScrollbarCSS() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(SCROLL_HIDE_ID)) return;
  const s = document.createElement('style');
  s.id = SCROLL_HIDE_ID;
  s.textContent = `.dosing-chip-scroll::-webkit-scrollbar { display: none; }`;
  document.head.appendChild(s);
}

export default function DosingCalculator({ brand = 'botox' }) {
  const selectedAreas = useDosingStore((s) => s.selectedAreas);
  const toggleArea = useDosingStore((s) => s.toggleArea);
  const clearAreas = useDosingStore((s) => s.clearAreas);
  const estimateUnitRange = useDosingStore((s) => s.estimateUnitRange);
  const estimateUnitsCrossCalc = useDosingStore((s) => s.estimateUnitsCrossCalc);

  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => { ensureScrollbarCSS(); }, []);

  const brandData = NEUROTOXIN_DOSING[brand];
  if (!brandData) return null;

  const areaEntries = useMemo(() => Object.entries(brandData.areas), [brandData.areas]);
  const range = estimateUnitRange(brand);

  // Cross-brand
  const crossBrand = brand === 'botox' ? 'dysport' : brand === 'dysport' ? 'botox' : null;
  const crossUnits = crossBrand ? estimateUnitsCrossCalc(brand, crossBrand) : null;
  const crossLabel = crossBrand ? NEUROTOXIN_DOSING[crossBrand]?.brandName : null;

  const unitText = range
    ? range.min === range.max
      ? `${range.min} units`
      : `${range.min}\u2013${range.max} units`
    : null;

  const hasSelection = selectedAreas.length > 0;

  function handleClear(e) {
    e.stopPropagation();
    clearAreas();
  }

  // ─── Collapsed state ────────────────────────────────────────────
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          height: 44,
          padding: '0 14px',
          background: hasSelection ? '#FDF2F7' : '#F9F7F5',
          border: `1px solid ${hasSelection ? '#F5D0E0' : '#EDE8E3'}`,
          borderRadius: 6,
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          overflow: 'hidden',
        }}
      >
        <Syringe size={13} color="#E8347A" style={{ flexShrink: 0 }} />

        {hasSelection ? (
          <>
            {/* Selected area chips inline */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flex: 1,
                minWidth: 0,
                overflow: 'hidden',
              }}
            >
              {selectedAreas.map((id) => {
                const area = brandData.areas[id];
                if (!area) return null;
                return (
                  <span
                    key={id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      padding: '2px 8px',
                      background: '#fff',
                      border: '1px solid #F5D0E0',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 500,
                      color: '#E8347A',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {area.label}
                    <X
                      size={10}
                      color="#E8347A"
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => { e.stopPropagation(); toggleArea(id); }}
                    />
                  </span>
                );
              })}
              {unitText && (
                <>
                  <span style={{ color: '#D6CFC6', flexShrink: 0 }}>&middot;</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#555',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {unitText}
                  </span>
                </>
              )}
            </div>
            <span
              onClick={handleClear}
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: '#999',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              Clear
            </span>
          </>
        ) : (
          <span style={{ fontSize: 12, fontWeight: 400, color: '#888' }}>
            Estimate your units &mdash; tap to select areas
          </span>
        )}
      </button>
    );
  }

  // ─── Expanded state ─────────────────────────────────────────────
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #EDE8E3',
        borderRadius: 6,
        padding: '10px 14px 12px',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Syringe size={13} color="#E8347A" />
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 12,
              fontWeight: 600,
              color: '#111',
            }}
          >
            Dosing Estimator
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {hasSelection && (
            <button
              type="button"
              onClick={handleClear}
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
            onClick={() => setExpanded(false)}
            aria-label="Collapse estimator"
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

      {/* Horizontal scrollable area chips */}
      <div
        ref={scrollRef}
        className="dosing-chip-scroll"
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
              {active && (
                <span style={{ marginLeft: 4 }}>&times;</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Estimate summary — plain text, no box */}
      {hasSelection && unitText && (
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            fontWeight: 400,
            color: '#666',
            margin: '8px 0 0 0',
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
    </div>
  );
}

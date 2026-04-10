/**
 * DosingCalculator — inline area-picker + live unit estimator powered by
 * the Zustand dosing store.
 *
 * Designed to sit inside the search header (FindPrices) and share selected-
 * area state with price cards. The old DosageCalculator.jsx is still used
 * by the guide pages; this component supersedes it for the browse flow.
 *
 * Shows UNITS ONLY — no dollar amounts. Each PriceCard computes its own
 * cost estimate using the provider's actual per-unit price × the unit
 * range from this calculator.
 *
 * Props:
 *   brand   — 'botox' | 'dysport' | 'xeomin' | 'jeuveau' (default 'botox')
 *   compact — if true, collapses into a single summary line
 */

import { useMemo } from 'react';
import { Calculator, X } from 'lucide-react';
import { NEUROTOXIN_DOSING } from '../data/dosingGuidance';
import useDosingStore from '../stores/dosingStore';

export default function DosingCalculator({ brand = 'botox', compact = false }) {
  const selectedAreas = useDosingStore((s) => s.selectedAreas);
  const toggleArea = useDosingStore((s) => s.toggleArea);
  const clearAreas = useDosingStore((s) => s.clearAreas);
  const estimateUnitRange = useDosingStore((s) => s.estimateUnitRange);
  const estimateUnitsCrossCalc = useDosingStore((s) => s.estimateUnitsCrossCalc);

  const brandData = NEUROTOXIN_DOSING[brand];
  if (!brandData) return null;

  const areaEntries = useMemo(() => Object.entries(brandData.areas), [brandData.areas]);

  const range = estimateUnitRange(brand);

  // Cross-brand: show Dysport equivalent when viewing Botox, and vice versa
  const crossBrand = brand === 'botox' ? 'dysport' : brand === 'dysport' ? 'botox' : null;
  const crossUnits = crossBrand ? estimateUnitsCrossCalc(brand, crossBrand) : null;
  const crossLabel = crossBrand
    ? NEUROTOXIN_DOSING[crossBrand]?.brandName
    : null;

  if (compact) {
    if (selectedAreas.length === 0) return null;
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          background: '#FDF2F7',
          border: '1px solid #F5D0E0',
          borderRadius: 6,
        }}
      >
        <Calculator size={13} color="#E8347A" style={{ flexShrink: 0 }} />
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            fontWeight: 500,
            color: '#333',
          }}
        >
          {range
            ? range.min === range.max
              ? `${range.min} units`
              : `${range.min}\u2013${range.max} units`
            : `${selectedAreas.length} area${selectedAreas.length !== 1 ? 's' : ''}`}
          {crossUnits != null && (
            <span style={{ color: '#888', fontWeight: 400 }}>
              {' '}({crossLabel}: ~{crossUnits}u)
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={clearAreas}
          aria-label="Clear areas"
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 2,
            lineHeight: 0,
          }}
        >
          <X size={13} color="#999" />
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #EDE8E3',
        borderRadius: 8,
        padding: '16px 18px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Calculator size={14} color="#E8347A" />
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: 600,
              color: '#111',
            }}
          >
            Dosing Estimator
          </span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#999',
              background: '#F5F2EE',
              padding: '2px 5px',
              borderRadius: 2,
            }}
          >
            Estimate
          </span>
        </div>
        {selectedAreas.length > 0 && (
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
      </div>

      {/* Area pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {areaEntries.map(([id, area]) => {
          const active = selectedAreas.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => toggleArea(id)}
              style={{
                padding: '6px 12px',
                borderRadius: 20,
                border: `1px solid ${active ? '#E8347A' : '#EDE8E3'}`,
                background: active ? '#FDF2F7' : '#fff',
                color: active ? '#E8347A' : '#555',
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 100ms',
                lineHeight: 1.2,
              }}
            >
              {area.label}
              {area.popular && (
                <span
                  style={{
                    marginLeft: 4,
                    fontSize: 9,
                    fontWeight: 700,
                    color: '#E8347A',
                    verticalAlign: 'super',
                  }}
                >
                  ★
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Units summary — units only, no dollar amounts */}
      {selectedAreas.length > 0 && range && (
        <div
          style={{
            background: '#FDF2F7',
            border: '1px solid #F5D0E0',
            borderRadius: 6,
            padding: '14px 16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <span
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 900,
                fontSize: 24,
                lineHeight: 1,
                color: '#111',
              }}
            >
              {range.min === range.max
                ? `${range.min} units`
                : `${range.min}\u2013${range.max} units`}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                fontWeight: 300,
                color: '#888',
              }}
            >
              {selectedAreas.length} area{selectedAreas.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Cross-brand note */}
          {crossUnits != null && (
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                fontWeight: 300,
                color: '#888',
                margin: '8px 0 0 0',
              }}
            >
              {crossLabel} equivalent: ~{crossUnits} units
              {brand === 'botox' && ' (2.5:1 conversion)'}
              {brand === 'dysport' && ' (1:2.5 conversion)'}
            </p>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 10,
          fontWeight: 300,
          color: '#BBB',
          margin: '10px 0 0 0',
          lineHeight: 1.5,
        }}
      >
        Based on typical clinical dosing. Actual units determined by your provider.
      </p>
    </div>
  );
}

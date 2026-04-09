/**
 * DosingCalculatorSheet — full-screen bottom sheet for estimating treatment
 * cost based on provider-specific pricing + clinical dosing ranges.
 *
 * Two modes:
 *   - Neurotoxin: area checkboxes → live unit + cost totals
 *   - Filler: level selector pills → single cost estimate
 *
 * Uses the same slide-up / backdrop / scroll-lock pattern as
 * ProcedureDetailSheet. z-index 9999 so it stacks above everything.
 */

import { memo, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { X, AlertTriangle, ChevronRight } from 'lucide-react';
import { NEUROTOXIN_DOSING, FILLER_DOSING } from '../data/dosingGuidance';

// ─── Keyframe injection (once per page) ───────────────────────────────
const KF_ID = 'dosing-calculator-sheet-kf';
function ensureKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(KF_ID)) return;
  const s = document.createElement('style');
  s.id = KF_ID;
  s.textContent = `
    @keyframes slideUpSheet {
      from { transform: translateY(100%); }
      to   { transform: translateY(0); }
    }
    @keyframes fadeInBackdrop {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
  `;
  document.head.appendChild(s);
}

// ─── Helpers ──────────────────────────────────────────────────────────
function fmtDollars(n) {
  return `$${Math.round(n).toLocaleString()}`;
}

function mapTreatmentAreaToId(treatmentArea) {
  if (!treatmentArea) return null;
  const lower = treatmentArea.toLowerCase();
  const map = {
    forehead: 'forehead',
    'forehead lines': 'forehead',
    glabella: 'glabella',
    'frown lines': 'glabella',
    '11s': 'glabella',
    "crow's feet": 'crowsFeet',
    'crows feet': 'crowsFeet',
    'brow lift': 'browLift',
    'lip flip': 'lipFlip',
    'bunny lines': 'bunnyLines',
    'chin dimpling': 'chinDimpling',
    'chin': 'chinDimpling',
    'lip lines': 'lipLines',
    'smoker lines': 'lipLines',
    'neck lines': 'neckLines',
    'platysmal bands': 'neckLines',
    'nefertiti': 'neckNefertiti',
    'nefertiti lift': 'neckNefertiti',
    masseter: 'masseter',
    'jaw slimming': 'masseter',
    tmj: 'masseter',
    underarms: 'underarmsHyperhidrosis',
    hyperhidrosis: 'underarmsHyperhidrosis',
    'excessive sweating': 'underarmsHyperhidrosis',
  };
  return map[lower] || null;
}

// Find the cross-brand equivalent key for neurotoxin comparison
function getCrossBrandKeys(currentKey) {
  const all = Object.keys(NEUROTOXIN_DOSING);
  return all.filter((k) => k !== currentKey && NEUROTOXIN_DOSING[k].areas.length > 1);
}

// ─── Neurotoxin Mode ──────────────────────────────────────────────────
function NeurotoxinCalculator({ brandKey, unitPrice, treatmentArea, providerName }) {
  const brand = NEUROTOXIN_DOSING[brandKey];
  const areas = brand.areas;

  // Pre-check the treatment area if it maps
  const preCheckId = mapTreatmentAreaToId(treatmentArea);
  const [checked, setChecked] = useState(() => {
    const init = {};
    for (const a of areas) {
      init[a.id] = a.id === preCheckId;
    }
    return init;
  });
  const [firstTimer, setFirstTimer] = useState(false);

  const toggleArea = useCallback((id) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const selectedAreas = useMemo(
    () => areas.filter((a) => checked[a.id]),
    [areas, checked],
  );

  const totals = useMemo(() => {
    let minUnits = 0, maxUnits = 0;
    for (const a of selectedAreas) {
      minUnits += a.unitRange[0];
      maxUnits += a.unitRange[1];
    }
    if (firstTimer) maxUnits = minUnits; // lock to minimums
    return {
      minUnits,
      maxUnits,
      minCost: Math.round(minUnits * unitPrice),
      maxCost: Math.round(maxUnits * unitPrice),
    };
  }, [selectedAreas, unitPrice, firstTimer]);

  // Cross-brand equivalents
  const crossBrands = useMemo(() => {
    if (selectedAreas.length === 0) return [];
    const others = getCrossBrandKeys(brandKey);
    return others.slice(0, 2).map((key) => {
      const other = NEUROTOXIN_DOSING[key];
      const areaMap = {};
      for (const a of other.areas) areaMap[a.id] = a;
      let min = 0, max = 0;
      for (const sel of selectedAreas) {
        const equiv = areaMap[sel.id];
        if (equiv) {
          min += equiv.unitRange[0];
          max += equiv.unitRange[1];
        }
      }
      if (firstTimer) max = min;
      return { brandName: other.brandName, minUnits: min, maxUnits: max, conversionNote: other.conversionNote };
    });
  }, [brandKey, selectedAreas, firstTimer]);

  return (
    <>
      {/* First timer toggle */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', background: '#F9F7F5', borderRadius: 6, marginBottom: 20,
      }}>
        <div>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: '#111' }}>
            First timer?
          </span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 300, color: '#888', marginLeft: 8 }}>
            Uses conservative (minimum) doses
          </span>
        </div>
        <button
          type="button"
          onClick={() => setFirstTimer((v) => !v)}
          style={{
            width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
            background: firstTimer ? '#E8347A' : '#D6CFC6',
            position: 'relative', transition: 'background 150ms',
          }}
        >
          <span style={{
            position: 'absolute', top: 2, left: firstTimer ? 22 : 2,
            width: 20, height: 20, borderRadius: '50%', background: 'white',
            transition: 'left 150ms', boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          }} />
        </button>
      </div>

      {/* Area checkboxes */}
      <div style={{ marginBottom: 24 }}>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600,
          letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999',
          margin: '0 0 12px 0',
        }}>
          Select treatment areas
        </p>
        {areas.map((area) => (
          <label
            key={area.id}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 12px', marginBottom: 4, borderRadius: 6, cursor: 'pointer',
              background: checked[area.id] ? '#FDF2F7' : 'transparent',
              border: `1px solid ${checked[area.id] ? '#E8347A' : '#EDE8E3'}`,
              transition: 'background 100ms, border-color 100ms',
            }}
          >
            <input
              type="checkbox"
              checked={checked[area.id]}
              onChange={() => toggleArea(area.id)}
              style={{ accentColor: '#E8347A', marginTop: 2, flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: '#111',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {area.label}
                {area.popular && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: '#E8347A', background: '#FDF2F7',
                    padding: '2px 5px', borderRadius: 2,
                  }}>
                    Popular
                  </span>
                )}
                {area.specialist && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: '#B45309', background: '#FFF7ED',
                    padding: '2px 5px', borderRadius: 2,
                  }}>
                    Specialist
                  </span>
                )}
              </span>
              <span style={{
                fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 300, color: '#888',
              }}>
                {firstTimer
                  ? `${area.unitRange[0]} units`
                  : `${area.unitRange[0]}–${area.unitRange[1]} units`}
                {checked[area.id] && unitPrice > 0 && (
                  <span style={{ color: '#666', fontWeight: 500 }}>
                    {' · '}
                    {firstTimer
                      ? fmtDollars(area.unitRange[0] * unitPrice)
                      : `${fmtDollars(area.unitRange[0] * unitPrice)}–${fmtDollars(area.unitRange[1] * unitPrice)}`}
                  </span>
                )}
              </span>
              {area.note && (
                <span style={{
                  fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 400,
                  fontStyle: 'italic', color: '#B45309', display: 'block', marginTop: 2,
                }}>
                  {area.note}
                </span>
              )}
            </div>
          </label>
        ))}
      </div>

      {/* Specialist warning */}
      {selectedAreas.some((a) => a.specialist) && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px',
          background: '#FFF7ED', border: '1px solid #F0D8B8', borderRadius: 6, marginBottom: 20,
        }}>
          <AlertTriangle size={14} style={{ color: '#B45309', flexShrink: 0, marginTop: 2 }} />
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 400,
            color: '#92400E', margin: 0, lineHeight: 1.5,
          }}>
            Some selected areas (masseter, neck, underarms) require specialist experience.
            Confirm your injector has specific training for these areas.
          </p>
        </div>
      )}

      {/* Live total */}
      {selectedAreas.length > 0 && (
        <div style={{
          background: '#111', borderRadius: 8, padding: '20px 24px',
          marginBottom: 20, color: 'white',
        }}>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600,
            letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888',
            margin: '0 0 8px 0',
          }}>
            Estimated total{providerName ? ` at ${providerName}` : ''}
          </p>
          <p style={{
            fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 900,
            fontSize: 32, margin: '0 0 4px 0', lineHeight: 1,
          }}>
            {totals.minCost === totals.maxCost
              ? fmtDollars(totals.minCost)
              : `${fmtDollars(totals.minCost)}–${fmtDollars(totals.maxCost)}`}
          </p>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 300,
            color: '#AAA', margin: 0,
          }}>
            {totals.minUnits === totals.maxUnits
              ? `${totals.minUnits} units`
              : `${totals.minUnits}–${totals.maxUnits} units`}
            {' · '}{fmtDollars(unitPrice)}/unit
          </p>
        </div>
      )}

      {/* Cross-brand equivalents */}
      {crossBrands.length > 0 && selectedAreas.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600,
            letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999',
            margin: '0 0 10px 0',
          }}>
            Same areas in other brands
          </p>
          {crossBrands.map((cb) => (
            <div key={cb.brandName} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 12px', background: '#F9F7F5', borderRadius: 6, marginBottom: 6,
            }}>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: '#111' }}>
                {cb.brandName}
              </span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 300, color: '#666' }}>
                {cb.minUnits === cb.maxUnits
                  ? `${cb.minUnits} units`
                  : `${cb.minUnits}–${cb.maxUnits} units`}
              </span>
            </div>
          ))}
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 300,
            fontStyle: 'italic', color: '#AAA', margin: '4px 0 0 0',
          }}>
            Unit counts differ between brands. Prices not shown — look up each brand for provider-specific pricing.
          </p>
        </div>
      )}
    </>
  );
}

// ─── Filler Mode ──────────────────────────────────────────────────────
function FillerCalculator({ fillerKey, unitPrice, providerName }) {
  const filler = FILLER_DOSING[fillerKey];
  const levels = filler.levels;
  const [selected, setSelected] = useState(levels.length > 1 ? 1 : 0); // default to middle

  const level = levels[selected];
  const cost = Math.round(level.amount * unitPrice);

  return (
    <>
      {/* Level pills */}
      <div style={{ marginBottom: 24 }}>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600,
          letterSpacing: '0.12em', textTransform: 'uppercase', color: '#999',
          margin: '0 0 12px 0',
        }}>
          How much volume?
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {levels.map((lvl, i) => (
            <button
              key={lvl.label}
              type="button"
              onClick={() => setSelected(i)}
              style={{
                padding: '10px 18px', borderRadius: 20, cursor: 'pointer',
                border: `1px solid ${i === selected ? '#E8347A' : '#EDE8E3'}`,
                background: i === selected ? '#FDF2F7' : 'white',
                color: i === selected ? '#E8347A' : '#111',
                fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
                transition: 'all 100ms',
              }}
            >
              {lvl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Level detail */}
      <div style={{
        background: '#F9F7F5', borderRadius: 8, padding: '16px 20px', marginBottom: 20,
      }}>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 400,
          color: '#555', margin: '0 0 4px 0',
        }}>
          {level.description}
        </p>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 300,
          color: '#888', margin: 0,
        }}>
          {level.amount} {filler.unit}{level.amount !== 1 ? 's' : ''}
          {' · '}{fmtDollars(unitPrice)}/{filler.unit}
        </p>
      </div>

      {/* Cost */}
      <div style={{
        background: '#111', borderRadius: 8, padding: '20px 24px',
        marginBottom: 20, color: 'white',
      }}>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600,
          letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888',
          margin: '0 0 8px 0',
        }}>
          Estimated cost{providerName ? ` at ${providerName}` : ''}
        </p>
        <p style={{
          fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 900,
          fontSize: 32, margin: 0, lineHeight: 1,
        }}>
          {fmtDollars(cost)}
        </p>
      </div>

      {/* Heads-up note */}
      {filler.headsUp && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px',
          background: '#FFF7ED', border: '1px solid #F0D8B8', borderRadius: 6, marginBottom: 20,
        }}>
          <AlertTriangle size={14} style={{ color: '#B45309', flexShrink: 0, marginTop: 2 }} />
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 400,
            color: '#92400E', margin: 0, lineHeight: 1.5,
          }}>
            {filler.headsUp}
          </p>
        </div>
      )}
    </>
  );
}

// ─── Main Sheet ───────────────────────────────────────────────────────
const DosingCalculatorSheet = memo(function DosingCalculatorSheet({
  procedureType,
  brand,
  unitPrice,
  providerName,
  treatmentArea,
  dosingType,
  dosingKey,
  onClose,
}) {
  const sheetRef = useRef(null);

  useEffect(() => { ensureKeyframes(); }, []);

  // Body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ESC to close
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isNeuro = dosingType === 'neurotoxin';
  const brandData = isNeuro ? NEUROTOXIN_DOSING[dosingKey] : null;
  const fillerData = !isNeuro ? FILLER_DOSING[dosingKey] : null;

  const title = isNeuro
    ? `${brandData?.brandName || 'Neurotoxin'} Dosing Calculator`
    : `${fillerData?.displayName || 'Filler'} Dosing Calculator`;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.45)',
          animation: 'fadeInBackdrop 200ms ease-out forwards',
        }}
      />
      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-label={title}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          zIndex: 9999, background: 'white',
          borderRadius: '16px 16px 0 0',
          maxHeight: '92vh', display: 'flex', flexDirection: 'column',
          animation: 'slideUpSheet 250ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
        }}
      >
        {/* Sticky header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid #EDE8E3', flexShrink: 0,
        }}>
          <div>
            <h2 style={{
              fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700,
              fontSize: 18, color: '#111', margin: 0,
            }}>
              {title}
            </h2>
            {providerName && (
              <p style={{
                fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 300,
                color: '#888', margin: '2px 0 0 0',
              }}>
                Pricing from {providerName}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close calculator"
            style={{
              width: 32, height: 32, borderRadius: '50%', border: 'none',
              background: '#F5F2EE', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={16} color="#666" />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', padding: '20px 20px 40px 20px', flex: 1 }}>
          {isNeuro ? (
            <NeurotoxinCalculator
              brandKey={dosingKey}
              unitPrice={unitPrice}
              treatmentArea={treatmentArea}
              providerName={providerName}
            />
          ) : (
            <FillerCalculator
              fillerKey={dosingKey}
              unitPrice={unitPrice}
              providerName={providerName}
            />
          )}

          {/* Medical disclaimer */}
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 300,
            color: '#AAA', lineHeight: 1.6, margin: '20px 0 0 0', textAlign: 'center',
          }}>
            Estimates based on typical clinical dosing ranges and this provider's
            published per-unit pricing. Actual doses vary by anatomy, injector
            technique, and treatment goals. Always consult with your provider for
            a personalized treatment plan and final pricing.
          </p>
        </div>
      </div>
    </>
  );
});

export default DosingCalculatorSheet;

/**
 * DosingCalculatorSheet — full-screen bottom sheet for estimating treatment
 * cost based on clinical dosing ranges.
 *
 * Two entry points:
 *   1. **Wizard mode** (no props) — 5-step flow driven by dosingStore:
 *      Product → Goal → Profile → Areas → Results
 *   2. **Direct mode** (dosingType + dosingKey props) — legacy single-page
 *      view for filler level selection (opened from PriceCard)
 *
 * z-index 9999 so it stacks above everything.
 */

import { memo, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { X, AlertTriangle, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import {
  NEUROTOXIN_DOSING, FILLER_DOSING, KEY_INSIGHT,
  GOAL_LEVELS, GENDER_MULTIPLIERS, EXPERIENCE_MULTIPLIERS, MUSCLE_STRENGTH,
  TREATMENT_AREAS, AREA_CATEGORIES, POPULAR_COMBOS, PRODUCTS,
} from '../data/dosingGuidance';
import useDosingStore from '../stores/dosingStore';

// ─── Keyframe injection (once per page) ───────────────────────────────
const KF_ID = 'dosing-calculator-sheet-kf';
function ensureKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(KF_ID)) return;
  const s = document.createElement('style');
  s.id = KF_ID;
  s.textContent = `
    @keyframes slideUpSheet { from { transform: translateY(100%); } to { transform: translateY(0); } }
    @keyframes fadeInBackdrop { from { opacity: 0; } to { opacity: 1; } }
  `;
  document.head.appendChild(s);
}

// ─── Shared styles ────────────────────────────────────────────────────
const labelStyle = { fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-taupe)', margin: '0 0 12px 0' };
const optionBase = { padding: '14px 16px', borderRadius: 10, cursor: 'pointer', border: '1px solid #EDE8E3', background: 'white', fontFamily: 'var(--font-body)', transition: 'all 100ms', textAlign: 'left', width: '100%' };
const optionActive = { border: '2px solid #E8347A', background: 'var(--color-cream)' };

function OptionButton({ selected, onClick, children }) {
  return (
    <button type="button" onClick={onClick} style={{ ...optionBase, ...(selected ? optionActive : {}), marginBottom: 8, display: 'block' }}>
      {children}
    </button>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────
function ProgressBar({ step }) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '0 20px', marginBottom: 16 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? '#E8347A' : '#EDE8E3', transition: 'background 200ms' }} />
      ))}
    </div>
  );
}

// ─── Step 1: Product ──────────────────────────────────────────────────
function StepProduct() {
  const selectedProduct = useDosingStore((s) => s.selectedProduct);
  const setProduct = useDosingStore((s) => s.setProduct);
  const nextStep = useDosingStore((s) => s.nextStep);

  return (
    <div>
      <p style={labelStyle}>Which neurotoxin?</p>
      {Object.entries(PRODUCTS).map(([key, prod]) => (
        <OptionButton key={key} selected={selectedProduct === key} onClick={() => { setProduct(key); nextStep(); }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{prod.name}</span>
          {prod.genericName && <span style={{ display: 'block', fontSize: 11, color: '#888', marginTop: 2 }}>{prod.genericName}</span>}
          {prod.conversionNote && <span style={{ display: 'block', fontSize: 10, color: '#AAA', marginTop: 2 }}>{prod.conversionNote}</span>}
        </OptionButton>
      ))}
    </div>
  );
}

// ─── Step 2: Goal ─────────────────────────────────────────────────────
function StepGoal() {
  const selectedGoal = useDosingStore((s) => s.selectedGoal);
  const setGoal = useDosingStore((s) => s.setGoal);
  const nextStep = useDosingStore((s) => s.nextStep);

  return (
    <div>
      <p style={labelStyle}>What's your goal?</p>
      {Object.entries(GOAL_LEVELS).map(([key, goal]) => (
        <OptionButton key={key} selected={selectedGoal === key} onClick={() => { setGoal(key); nextStep(); }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: selectedGoal === key ? '#E8347A' : '#111' }}>{goal.label}</span>
          <span style={{ display: 'block', fontSize: 12, color: '#888', marginTop: 2 }}>{goal.description}</span>
        </OptionButton>
      ))}
    </div>
  );
}

// ─── Step 3: Profile ──────────────────────────────────────────────────
function StepProfile() {
  const gender = useDosingStore((s) => s.selectedGender);
  const experience = useDosingStore((s) => s.selectedExperience);
  const muscle = useDosingStore((s) => s.selectedMuscleStrength);
  const setGender = useDosingStore((s) => s.setGender);
  const setExperience = useDosingStore((s) => s.setExperience);
  const setMuscle = useDosingStore((s) => s.setMuscleStrength);

  return (
    <div>
      <p style={labelStyle}>Gender</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {Object.entries(GENDER_MULTIPLIERS).map(([key, g]) => (
          <button key={key} type="button" onClick={() => setGender(key)} style={{
            ...optionBase, flex: 1, textAlign: 'center', ...(gender === key ? optionActive : {}),
          }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: gender === key ? '#E8347A' : '#111' }}>{g.label}</span>
          </button>
        ))}
      </div>

      <p style={labelStyle}>Experience</p>
      {Object.entries(EXPERIENCE_MULTIPLIERS).map(([key, e]) => (
        <OptionButton key={key} selected={experience === key} onClick={() => setExperience(key)}>
          <span style={{ fontSize: 13, fontWeight: 500, color: experience === key ? '#E8347A' : '#111' }}>{e.label}</span>
          {e.headsUp && experience === key && <span style={{ display: 'block', fontSize: 11, color: '#E8347A', marginTop: 4 }}>{e.headsUp}</span>}
        </OptionButton>
      ))}

      <p style={{ ...labelStyle, marginTop: 20 }}>Muscle strength</p>
      {Object.entries(MUSCLE_STRENGTH).map(([key, m]) => (
        <OptionButton key={key} selected={muscle === key} onClick={() => setMuscle(key)}>
          <span style={{ fontSize: 13, fontWeight: 500, color: muscle === key ? '#E8347A' : '#111' }}>{m.label}</span>
          <span style={{ display: 'block', fontSize: 11, color: '#888', marginTop: 2 }}>{m.description}</span>
        </OptionButton>
      ))}
    </div>
  );
}

// ─── Step 4: Areas ────────────────────────────────────────────────────
function StepAreas() {
  const selectedAreas = useDosingStore((s) => s.selectedAreas);
  const toggleArea = useDosingStore((s) => s.toggleArea);
  const selectCombo = useDosingStore((s) => s.selectCombo);
  const calculateEstimate = useDosingStore((s) => s.calculateEstimate);
  const estimate = calculateEstimate();

  return (
    <div>
      {/* Quick combos */}
      <p style={labelStyle}>Popular combos</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {POPULAR_COMBOS.map((combo) => {
          const isActive = combo.areas.length === selectedAreas.length && combo.areas.every((a) => selectedAreas.includes(a));
          return (
            <button key={combo.id} type="button" onClick={() => selectCombo(combo.areas, combo.recommendedGoal)} style={{
              padding: '8px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600,
              fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
              border: `1px solid ${isActive ? '#E8347A' : '#EDE8E3'}`,
              background: isActive ? 'var(--color-cream)' : 'white',
              color: isActive ? '#E8347A' : '#555',
            }}>
              {combo.label}
            </button>
          );
        })}
      </div>

      {/* Area checkboxes by category */}
      {AREA_CATEGORIES.map((cat) => {
        const areas = Object.entries(TREATMENT_AREAS).filter(([, a]) => a.category === cat.key);
        if (areas.length === 0) return null;
        return (
          <div key={cat.key} style={{ marginBottom: 16 }}>
            <p style={{ ...labelStyle, margin: '0 0 8px 0' }}>{cat.label}</p>
            {areas.map(([id, area]) => {
              const isChecked = selectedAreas.includes(id);
              return (
                <label key={id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', marginBottom: 4, borderRadius: 6, cursor: 'pointer',
                  background: isChecked ? 'var(--color-cream)' : 'transparent',
                  border: `1px solid ${isChecked ? '#E8347A' : '#EDE8E3'}`,
                  transition: 'background 100ms, border-color 100ms',
                }}>
                  <input type="checkbox" checked={isChecked} onChange={() => toggleArea(id)} style={{ accentColor: '#E8347A', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: '#111', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {area.label}
                      {area.popular && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#E8347A', background: 'var(--color-cream)', padding: '2px 5px', borderRadius: 2 }}>Popular</span>}
                      {area.specialist && <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-warning-text)', background: 'var(--color-warning-bg)', padding: '2px 5px', borderRadius: 2 }}>Specialist</span>}
                    </span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#888' }}>{area.min}–{area.max} units</span>
                  </div>
                </label>
              );
            })}
          </div>
        );
      })}

      {/* Live running total */}
      {estimate && (
        <div style={{
          position: 'sticky', bottom: 0, background: '#FDF2F7', border: '1px solid #F5D0E0',
          borderRadius: 8, padding: '12px 16px', marginTop: 12,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600, color: '#E8347A' }}>
              {estimate.areaBreakdown.length} area{estimate.areaBreakdown.length !== 1 ? 's' : ''}
            </span>
            <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 900, color: '#111' }}>
              {estimate.productMin}–{estimate.productMax} units
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 5: Results ──────────────────────────────────────────────────
function StepResults() {
  const calculateEstimate = useDosingStore((s) => s.calculateEstimate);
  const selectedProduct = useDosingStore((s) => s.selectedProduct);
  const estimate = calculateEstimate();

  if (!estimate) {
    return <p style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: '#888', textAlign: 'center', padding: 24 }}>Select at least one treatment area to see results.</p>;
  }

  // Cross-brand equivalents
  const otherBrands = Object.keys(NEUROTOXIN_DOSING).filter((k) => k !== selectedProduct && Object.keys(NEUROTOXIN_DOSING[k].areas).length > 1);

  return (
    <div>
      {/* Main unit total */}
      <div style={{ background: '#FDF2F7', border: '1px solid #F5D0E0', borderRadius: 12, padding: '24px', marginBottom: 20, textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#E8347A', margin: '0 0 8px' }}>
          Your {estimate.productName} estimate
        </p>
        <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 900, fontSize: 36, margin: '0 0 4px', lineHeight: 1, color: '#111' }}>
          {estimate.productMin === estimate.productMax ? `${estimate.productMin}` : `${estimate.productMin}–${estimate.productMax}`} units
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#888', margin: 0 }}>
          Typical: {estimate.productTypical} units
        </p>
      </div>

      {/* Profile summary */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
        {[estimate.goalLabel, estimate.genderLabel, estimate.experienceLabel, estimate.muscleLabel].map((tag) => (
          <span key={tag} style={{ fontSize: 11, fontWeight: 500, color: '#888', background: '#F5F3F0', padding: '4px 10px', borderRadius: 12, fontFamily: 'var(--font-body)' }}>{tag}</span>
        ))}
      </div>

      {/* Per-area breakdown */}
      <p style={labelStyle}>Breakdown by area</p>
      <div style={{ marginBottom: 20 }}>
        {estimate.areaBreakdown.map((a) => (
          <div key={a.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#F9F7F5', borderRadius: 6, marginBottom: 4 }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: '#111' }}>{a.label}</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#666' }}>{a.min}–{a.max} units</span>
          </div>
        ))}
      </div>

      {/* Cross-brand equivalents */}
      {otherBrands.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={labelStyle}>Same areas in other brands</p>
          {otherBrands.slice(0, 2).map((key) => {
            const other = NEUROTOXIN_DOSING[key];
            const conv = other.conversionFactor || 1;
            const min = Math.round(estimate.botoxMin * conv);
            const max = Math.round(estimate.botoxMax * conv);
            return (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#F9F7F5', borderRadius: 6, marginBottom: 4 }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: '#111' }}>{other.brandName}</span>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#666' }}>{min}–{max} units</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Warnings */}
      {estimate.warnings.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {estimate.warnings.map((w, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, padding: '10px 14px', background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', borderRadius: 6, marginBottom: 6 }}>
              <AlertTriangle size={14} style={{ color: 'var(--color-warning-text)', flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#92400E', margin: 0, lineHeight: 1.5 }}>
                <strong>{w.area}:</strong> {w.warning}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      {estimate.notes.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {estimate.notes.map((n, i) => (
            <p key={i} style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#888', margin: '0 0 4px', lineHeight: 1.5 }}>
              {n}
            </p>
          ))}
        </div>
      )}

      {estimate.conversionNote && (
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 10, color: '#AAA', fontStyle: 'italic', lineHeight: 1.5, margin: '0 0 16px' }}>
          {estimate.conversionNote}
        </p>
      )}

      {/* Key insight */}
      <div style={{ padding: '12px 14px', background: '#F9F7F5', borderLeft: '3px solid #E8347A', borderRadius: '0 6px 6px 0', marginBottom: 16 }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 500, color: '#333', margin: 0, lineHeight: 1.5 }}>{KEY_INSIGHT.text}</p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 9, color: '#AAA', margin: '6px 0 0' }}>Source: {KEY_INSIGHT.source}</p>
      </div>
    </div>
  );
}

// ─── Filler Mode (legacy direct-open) ─────────────────────────────────
function FillerCalculator({ fillerKey }) {
  const filler = FILLER_DOSING[fillerKey];
  const levels = filler.levels;
  const [selected, setSelected] = useState(levels.length > 1 ? 1 : 0);
  const level = levels[selected];

  return (
    <>
      <p style={labelStyle}>How much volume?</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {levels.map((lvl, i) => (
          <button key={lvl.label} type="button" onClick={() => setSelected(i)} style={{
            padding: '10px 18px', borderRadius: 20, cursor: 'pointer',
            border: `1px solid ${i === selected ? '#E8347A' : '#EDE8E3'}`,
            background: i === selected ? 'var(--color-cream)' : 'white',
            color: i === selected ? '#E8347A' : '#111',
            fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600,
          }}>
            {lvl.label}
          </button>
        ))}
      </div>
      <div style={{ background: '#F9F7F5', borderRadius: 8, padding: '16px 20px', marginBottom: 20 }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: '#555', margin: '0 0 4px' }}>{level.description}</p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#888', margin: 0 }}>{level.amount} {filler.unit}{level.amount !== 1 ? 's' : ''}</p>
      </div>
      <div style={{ background: '#FDF2F7', border: '1px solid #F5D0E0', borderRadius: 8, padding: '20px 24px', marginBottom: 20 }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#E8347A', margin: '0 0 8px' }}>Estimated volume</p>
        <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 900, fontSize: 32, margin: 0, lineHeight: 1, color: '#111' }}>{level.amount} {filler.unit}{level.amount !== 1 ? 's' : ''}</p>
      </div>
      {filler.headsUp && (
        <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', borderRadius: 6, marginBottom: 20 }}>
          <AlertTriangle size={14} style={{ color: 'var(--color-warning-text)', flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#92400E', margin: 0, lineHeight: 1.5 }}>{filler.headsUp}</p>
        </div>
      )}
    </>
  );
}

// ─── Wizard step titles ───────────────────────────────────────────────
const STEP_TITLES = ['', 'Product', 'Goal', 'Profile', 'Areas', 'Results'];

// ─── Main Sheet ───────────────────────────────────────────────────────
const DosingCalculatorSheet = memo(function DosingCalculatorSheet({
  procedureType,
  brand,
  providerName,
  treatmentArea,
  dosingType,
  dosingKey,
  onClose,
}) {
  const sheetRef = useRef(null);
  const wizardStep = useDosingStore((s) => s.wizardStep);
  const nextStep = useDosingStore((s) => s.nextStep);
  const prevStep = useDosingStore((s) => s.prevStep);
  const closeWizard = useDosingStore((s) => s.closeWizard);

  // Determine mode: wizard (no dosingType prop) vs direct (has dosingType)
  const isWizard = !dosingType;
  const isFiller = dosingType === 'filler';
  const isNeuro = dosingType === 'neurotoxin';

  useEffect(() => { ensureKeyframes(); }, []);

  // Body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ESC to close
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') handleClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function handleClose() {
    if (isWizard) closeWizard();
    onClose?.();
  }

  const title = isWizard
    ? `Dosing Estimate — ${STEP_TITLES[wizardStep] || ''}`
    : isFiller
      ? `${FILLER_DOSING[dosingKey]?.displayName || 'Filler'} Dosing Calculator`
      : `${NEUROTOXIN_DOSING[dosingKey]?.brandName || 'Neurotoxin'} Dosing Calculator`;

  const currentStep = isWizard ? wizardStep : 0;
  const showBack = isWizard && currentStep > 1;
  const showNext = isWizard && currentStep >= 3 && currentStep < 5;

  return (
    <>
      {/* Backdrop */}
      <div onClick={handleClose} style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(0,0,0,0.45)',
        animation: 'fadeInBackdrop 200ms ease-out forwards',
      }} />

      {/* Sheet */}
      <div ref={sheetRef} role="dialog" aria-label={title} style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        zIndex: 9999, background: 'white',
        borderRadius: '16px 16px 0 0',
        maxHeight: '92dvh', display: 'flex', flexDirection: 'column',
        animation: 'slideUpSheet 250ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid #EDE8E3', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {showBack && (
              <button type="button" onClick={prevStep} aria-label="Back" style={{
                width: 32, height: 32, borderRadius: '50%', border: 'none',
                background: '#F5F2EE', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ChevronLeft size={16} color="#666" />
              </button>
            )}
            <div>
              <h2 style={{
                fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700,
                fontSize: 18, color: '#111', margin: 0,
              }}>
                {title}
              </h2>
              {providerName && !isWizard && (
                <p style={{ fontFamily: 'var(--font-body)', fontSize: 12, color: '#888', margin: '2px 0 0' }}>Pricing from {providerName}</p>
              )}
            </div>
          </div>
          <button type="button" onClick={handleClose} aria-label="Close calculator" style={{
            width: 32, height: 32, borderRadius: '50%', border: 'none',
            background: '#F5F2EE', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={16} color="#666" />
          </button>
        </div>

        {/* Progress bar (wizard only) */}
        {isWizard && <div style={{ paddingTop: 12 }}><ProgressBar step={currentStep} /></div>}

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: '20px 20px 40px', flex: 1 }}>
          {isWizard && currentStep === 1 && <StepProduct />}
          {isWizard && currentStep === 2 && <StepGoal />}
          {isWizard && currentStep === 3 && <StepProfile />}
          {isWizard && currentStep === 4 && <StepAreas />}
          {isWizard && currentStep === 5 && <StepResults />}
          {isFiller && <FillerCalculator fillerKey={dosingKey} />}
          {isNeuro && (
            <LegacyNeurotoxinCalculator brandKey={dosingKey} treatmentArea={treatmentArea} />
          )}

          {/* Disclaimer */}
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: 10, color: '#AAA',
            lineHeight: 1.6, margin: '20px 0 0', textAlign: 'center',
          }}>
            Estimates based on published clinical guidelines. Actual doses vary by anatomy,
            injector technique, and treatment goals. Your provider determines exact dosing.
          </p>
        </div>

        {/* Bottom nav (wizard only) */}
        {showNext && (
          <div style={{
            padding: '12px 20px', borderTop: '1px solid #EDE8E3', flexShrink: 0,
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 36px)',
          }}>
            <button type="button" onClick={nextStep} style={{
              width: '100%', padding: '14px', borderRadius: 12, border: 'none',
              background: '#E8347A', color: 'white', fontFamily: 'var(--font-body)',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              {currentStep === 4 ? 'See Results' : 'Continue'}
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </>
  );
});

// Legacy neurotoxin calculator (for direct-open from PriceCard)
function LegacyNeurotoxinCalculator({ brandKey, treatmentArea }) {
  const brand = NEUROTOXIN_DOSING[brandKey];
  if (!brand) return null;
  const areasObj = brand.areas;
  const areaEntries = useMemo(() => Object.entries(areasObj), [areasObj]);

  const preCheckId = (() => {
    if (!treatmentArea) return null;
    const lower = treatmentArea.toLowerCase();
    const map = { forehead: 'forehead', 'forehead lines': 'forehead', glabella: 'glabella', 'frown lines': 'glabella', '11s': 'glabella', "crow's feet": 'crowsFeet', 'crows feet': 'crowsFeet', 'brow lift': 'browLift', 'lip flip': 'lipFlip', 'bunny lines': 'bunnyLines', 'chin dimpling': 'chinDimpling', chin: 'chinDimpling', 'lip lines': 'lipLines', 'smoker lines': 'lipLines', 'neck lines': 'platysmaBands', 'platysmal bands': 'platysmaBands', nefertiti: 'neckNefertiti', masseter: 'masseter', 'jaw slimming': 'masseter', tmj: 'masseter', underarms: 'underarmsHyperhidrosis', hyperhidrosis: 'underarmsHyperhidrosis' };
    return map[lower] || null;
  })();

  const [checked, setChecked] = useState(() => {
    const init = {};
    for (const [id] of Object.entries(areasObj)) init[id] = id === preCheckId;
    return init;
  });
  const [firstTimer, setFirstTimer] = useState(false);

  const selectedAreas = useMemo(
    () => areaEntries.filter(([id]) => checked[id]).map(([id, area]) => ({ id, ...area })),
    [areaEntries, checked],
  );

  const totals = useMemo(() => {
    let minUnits = 0, maxUnits = 0;
    for (const a of selectedAreas) {
      if (firstTimer) { minUnits += a.firstTimer; maxUnits += a.firstTimer; }
      else { minUnits += a.min; maxUnits += a.max; }
    }
    return { minUnits, maxUnits };
  }, [selectedAreas, firstTimer]);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#F9F7F5', borderRadius: 6, marginBottom: 20 }}>
        <div>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 600, color: '#111' }}>First timer?</span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#888', marginLeft: 8 }}>Uses conservative doses</span>
        </div>
        <button type="button" onClick={() => setFirstTimer((v) => !v)} style={{
          width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
          background: firstTimer ? '#E8347A' : 'var(--color-taupe)', position: 'relative', transition: 'background 150ms',
        }}>
          <span style={{ position: 'absolute', top: 2, left: firstTimer ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 150ms', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
        </button>
      </div>

      <p style={labelStyle}>Select treatment areas</p>
      {areaEntries.map(([id, area]) => (
        <label key={id} style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '10px 12px', marginBottom: 4, borderRadius: 6, cursor: 'pointer',
          background: checked[id] ? 'var(--color-cream)' : 'transparent',
          border: `1px solid ${checked[id] ? '#E8347A' : '#EDE8E3'}`,
        }}>
          <input type="checkbox" checked={checked[id]} onChange={() => setChecked((p) => ({ ...p, [id]: !p[id] }))} style={{ accentColor: '#E8347A', marginTop: 2, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: '#111', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {area.label}
              {area.popular && <span style={{ fontSize: 9, fontWeight: 700, color: '#E8347A', background: 'var(--color-cream)', padding: '2px 5px', borderRadius: 2, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Popular</span>}
              {area.fdaApproved && <span style={{ fontSize: 9, fontWeight: 700, color: '#1A7A3A', background: '#F0FAF5', padding: '2px 5px', borderRadius: 2, letterSpacing: '0.08em', textTransform: 'uppercase' }}>FDA</span>}
              {area.specialist && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-warning-text)', background: 'var(--color-warning-bg)', padding: '2px 5px', borderRadius: 2, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Specialist</span>}
            </span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#888' }}>
              {firstTimer ? `${area.firstTimer} units` : `${area.min}–${area.max} units`}
            </span>
          </div>
        </label>
      ))}

      {selectedAreas.length > 0 && (
        <div style={{ background: '#FDF2F7', border: '1px solid #F5D0E0', borderRadius: 8, padding: '20px 24px', marginTop: 20, marginBottom: 20 }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#E8347A', margin: '0 0 8px' }}>Estimated units</p>
          <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 900, fontSize: 32, margin: 0, lineHeight: 1, color: '#111' }}>
            {totals.minUnits === totals.maxUnits ? `${totals.minUnits} units` : `${totals.minUnits}–${totals.maxUnits} units`}
          </p>
        </div>
      )}
    </>
  );
}

export default DosingCalculatorSheet;

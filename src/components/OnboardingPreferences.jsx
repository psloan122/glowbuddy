import { useState } from 'react';
import { DollarSign, Sparkles } from 'lucide-react';

// Editorial pill / button / row styling for the personalization step.
// Shared across skin concerns and budget so the visual language stays
// consistent: 4px radius, 1px #DDD border, Outfit 500 12px, transparent
// until selected, then hot-pink fill.

const SKIN_CONCERNS = [
  'Acne / Breakouts',
  'Sun Damage / Dark Spots',
  'Fine Lines / Wrinkles',
  'Dryness / Dehydration',
  'Large Pores',
  'Redness / Rosacea',
  'Scarring / Texture',
  'Volume Loss / Sagging',
];

const BUDGET_RANGES = [
  { label: 'Under $250', min: 0, max: 250 },
  { label: '$250 – $500', min: 250, max: 500 },
  { label: '$500 – $1,000', min: 500, max: 1000 },
  { label: '$1,000 – $2,500', min: 1000, max: 2500 },
  { label: '$2,500+', min: 2500, max: null },
  { label: 'No budget in mind', min: null, max: null },
];

const EXPERIENCE_LEVELS = [
  { label: 'First-timer', value: 'first-time', description: 'Never had a cosmetic treatment' },
  { label: 'Occasional', value: 'occasional', description: 'A few treatments here and there' },
  { label: 'Regular', value: 'regular', description: 'I go a few times a year' },
  { label: 'Frequent', value: 'frequent', description: 'Monthly or more' },
];

// ── Shared editorial pill style ─────────────────────────────────────
// Used for both skin concerns and budget buttons. The `selected` flag
// swaps the transparent/gray defaults for a solid hot-pink fill.
function editorialPillStyle(selected) {
  return {
    borderRadius: '4px',
    border: `1px solid ${selected ? '#E8347A' : '#DDD'}`,
    color: selected ? '#fff' : '#888',
    background: selected ? '#E8347A' : 'transparent',
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
    fontSize: '12px',
    padding: '8px 16px',
    transition: 'all 0.15s ease',
    cursor: 'pointer',
    lineHeight: 1.3,
  };
}

export default function OnboardingPreferences({ onNext, onSkip }) {
  const [budget, setBudget] = useState(null);
  const [skinConcerns, setSkinConcerns] = useState([]);
  const [experience, setExperience] = useState(null);

  function toggleConcern(label) {
    setSkinConcerns((prev) =>
      prev.includes(label)
        ? prev.filter((l) => l !== label)
        : [...prev, label]
    );
  }

  function handleContinue() {
    const budgetRange = budget !== null ? BUDGET_RANGES[budget] : null;
    onNext({
      budget_min: budgetRange?.min ?? null,
      budget_max: budgetRange?.max ?? null,
      skin_concerns: skinConcerns,
      treatment_frequency: experience,
      first_timer: experience === 'first-time',
    });
  }

  const hasSelection = budget !== null || skinConcerns.length > 0 || experience !== null;

  return (
    <div>
      <div className="flex items-center justify-center w-12 h-12 bg-rose-light rounded-full mx-auto mb-4">
        <Sparkles size={22} className="text-[#C94F78]" />
      </div>
      <h2 className="text-xl font-bold text-text-primary mb-1 text-center">
        Personalize your experience
      </h2>
      <p className="text-sm text-text-secondary mb-6 text-center">
        Optional — helps us show you relevant results.
      </p>

      {/* Budget Range */}
      <div className="mb-5">
        <div className="flex items-center gap-1.5 mb-2">
          <DollarSign size={14} className="text-text-secondary" />
          <p className="text-sm font-medium text-text-primary">Typical budget per treatment</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {BUDGET_RANGES.map((range, i) => (
            <button
              key={range.label}
              onClick={() => setBudget(i === budget ? null : i)}
              style={editorialPillStyle(budget === i)}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Skin Concerns */}
      <div className="mb-5">
        <p className="text-sm font-medium text-text-primary mb-2">Any skin concerns?</p>
        <div className="flex flex-wrap gap-2">
          {SKIN_CONCERNS.map((label) => {
            const isActive = skinConcerns.includes(label);
            return (
              <button
                key={label}
                onClick={() => toggleConcern(label)}
                style={editorialPillStyle(isActive)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Experience Level */}
      <div className="mb-6">
        <p className="text-sm font-medium text-text-primary mb-2">Treatment experience</p>
        <div className="space-y-2">
          {EXPERIENCE_LEVELS.map((level) => {
            const isActive = experience === level.value;
            return (
              <button
                key={level.value}
                onClick={() => setExperience(isActive ? null : level.value)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '4px',
                  border: '1px solid #DDD',
                  // Always 3px on the left — swap color instead of width
                  // so selecting doesn't shift the row by 2px.
                  borderLeftWidth: '3px',
                  borderLeftColor: isActive ? '#E8347A' : '#DDD',
                  background: isActive ? '#FBF9F7' : '#fff',
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontWeight: 500,
                    fontSize: '14px',
                    color: '#111',
                  }}
                >
                  {level.label}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontWeight: 300,
                    fontSize: '12px',
                    color: '#888',
                  }}
                >
                  {level.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleContinue}
        className="w-full py-3 text-white font-semibold rounded-xl hover:opacity-90 transition"
        style={{ backgroundColor: '#C94F78' }}
      >
        {hasSelection ? 'Continue' : 'Skip'}
      </button>
      {hasSelection && (
        <button
          onClick={onSkip}
          className="w-full mt-2 py-2 text-sm text-text-secondary hover:text-text-primary transition"
        >
          Skip this step
        </button>
      )}
    </div>
  );
}

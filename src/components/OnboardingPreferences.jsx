import { useState } from 'react';
import { DollarSign, Sparkles } from 'lucide-react';

const SKIN_CONCERNS = [
  { emoji: '🔴', label: 'Acne / Breakouts' },
  { emoji: '🌞', label: 'Sun Damage / Dark Spots' },
  { emoji: '📐', label: 'Fine Lines / Wrinkles' },
  { emoji: '💧', label: 'Dryness / Dehydration' },
  { emoji: '🔲', label: 'Large Pores' },
  { emoji: '🟥', label: 'Redness / Rosacea' },
  { emoji: '🎯', label: 'Scarring / Texture' },
  { emoji: '😐', label: 'Volume Loss / Sagging' },
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
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
                budget === i
                  ? 'bg-[#C94F78]/10 border-[#C94F78] text-[#C94F78]'
                  : 'bg-white border-gray-200 text-text-primary hover:border-gray-300'
              }`}
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
          {SKIN_CONCERNS.map(({ emoji, label }) => {
            const isActive = skinConcerns.includes(label);
            return (
              <button
                key={label}
                onClick={() => toggleConcern(label)}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  isActive
                    ? 'bg-[#C94F78]/10 border-[#C94F78] text-[#C94F78]'
                    : 'bg-white border-gray-200 text-text-primary hover:border-gray-300'
                }`}
              >
                <span>{emoji}</span>
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
          {EXPERIENCE_LEVELS.map((level) => (
            <button
              key={level.value}
              onClick={() => setExperience(experience === level.value ? null : level.value)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm border transition ${
                experience === level.value
                  ? 'bg-[#C94F78]/10 border-[#C94F78]'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className={`font-medium ${experience === level.value ? 'text-[#C94F78]' : 'text-text-primary'}`}>
                {level.label}
              </span>
              <span className="text-xs text-text-secondary">{level.description}</span>
            </button>
          ))}
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

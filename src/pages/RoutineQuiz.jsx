import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft, CheckCircle, Sparkles, Loader2, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';
import RoutineVisualizer from '../components/RoutineVisualizer';

const CONCERNS = [
  'Fine lines & wrinkles',
  'Volume loss (cheeks, temples)',
  'Lip enhancement',
  'Skin texture & tone',
  'Acne scarring',
  'Double chin',
  'Pore size',
  'Skin hydration',
  'Anti-aging prevention',
  'Body contouring',
  'Weight loss',
];

const BUDGET_RANGES = [
  { label: 'Under $200/month', value: 'under_200', max: 200 },
  { label: '$200–$500/month', value: '200_500', max: 500 },
  { label: '$500–$1,000/month', value: '500_1000', max: 1000 },
  { label: '$1,000+/month', value: 'over_1000', max: Infinity },
];

const DOWNTIME_OPTIONS = [
  { label: 'None — I need to look normal tomorrow', value: 'none' },
  { label: 'Minimal — a day or two of redness is fine', value: 'minimal' },
  { label: 'Moderate — I can handle a week of recovery', value: 'moderate' },
];

const SKIN_TYPES = [
  'Normal',
  'Oily',
  'Dry',
  'Combination',
  'Sensitive',
];

const TREATMENT_RECS = {
  'Fine lines & wrinkles': ['Botox / Dysport / Xeomin', 'Microneedling', 'Chemical Peel'],
  'Volume loss (cheeks, temples)': ['Cheek Filler', 'Sculptra'],
  'Lip enhancement': ['Lip Filler'],
  'Skin texture & tone': ['Microneedling', 'RF Microneedling', 'Chemical Peel', 'HydraFacial'],
  'Acne scarring': ['RF Microneedling', 'Microneedling', 'PRP/PRF', 'Chemical Peel'],
  'Double chin': ['Kybella'],
  'Pore size': ['HydraFacial', 'Chemical Peel', 'Microneedling'],
  'Skin hydration': ['HydraFacial', 'PRP/PRF'],
  'Anti-aging prevention': ['Botox / Dysport / Xeomin', 'HydraFacial', 'Microneedling'],
  'Body contouring': ['CoolSculpting', 'Emsculpt NEO', 'Kybella'],
  'Weight loss': ['Semaglutide (Ozempic / Wegovy)', 'Tirzepatide (Mounjaro / Zepbound)', 'Compounded Semaglutide', 'GLP-1 (unspecified)'],
};

export default function RoutineQuiz() {
  const { user, showToast } = useContext(AuthContext);
  const [step, setStep] = useState(1);
  const [concerns, setConcerns] = useState([]);
  const [budget, setBudget] = useState(null);
  const [downtime, setDowntime] = useState('');
  const [priorTreatments, setPriorTreatments] = useState([]);
  const [skinType, setSkinType] = useState('');
  const [results, setResults] = useState(null);
  const [stackingData, setStackingData] = useState([]);
  const [localPrices, setLocalPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = 'Build My Routine | GlowBuddy';
  }, []);

  const ALL_TREATMENTS = [
    'Botox / Dysport / Xeomin', 'Lip Filler', 'Cheek Filler',
    'Microneedling', 'RF Microneedling', 'Chemical Peel',
    'HydraFacial', 'PRP/PRF', 'Sculptra', 'Kybella',
    'Semaglutide (Ozempic / Wegovy)', 'Tirzepatide (Mounjaro / Zepbound)',
    'Compounded Semaglutide', 'GLP-1 (unspecified)',
    'CoolSculpting', 'Emsculpt NEO', 'Laser Hair Removal', 'Dermaplaning',
  ];

  function toggleItem(list, setList, item) {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  }

  function monthlyCost(name, avgPrices, cadence) {
    const price = avgPrices[name] || 150;
    const weeks = cadence[name] || 12;
    return price / (weeks / 4.33);
  }

  async function generateRoutine() {
    setLoading(true);

    // Score treatments based on concerns
    const scores = {};
    concerns.forEach((concern) => {
      const recs = TREATMENT_RECS[concern] || [];
      recs.forEach((t, i) => {
        scores[t] = (scores[t] || 0) + (recs.length - i); // Higher score for first-listed
      });
    });

    // Filter by downtime tolerance
    const highDowntime = ['RF Microneedling', 'Chemical Peel', 'Kybella'];
    const moderateDowntime = ['Microneedling', 'PRP/PRF', 'Sculptra'];

    let candidates = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .map(([name]) => name);

    if (downtime === 'none') {
      candidates = candidates.filter((t) => !highDowntime.includes(t) && !moderateDowntime.includes(t));
    } else if (downtime === 'minimal') {
      candidates = candidates.filter((t) => !highDowntime.includes(t));
    }

    // Fetch stacking data
    const { data: rules } = await supabase
      .from('treatment_stacking')
      .select('*');
    setStackingData(rules || []);

    // Check for avoid conflicts and filter
    const avoidPairs = (rules || [])
      .filter((r) => r.compatibility === 'avoid')
      .map((r) => [r.treatment_a, r.treatment_b]);

    const recommended = [];
    for (const treatment of candidates) {
      const hasConflict = recommended.some((existing) =>
        avoidPairs.some(
          ([a, b]) =>
            (a === treatment && b === existing) || (b === treatment && a === existing)
        )
      );
      if (!hasConflict) {
        recommended.push(treatment);
      }
    }

    // Fetch cadence data
    const { data: cadenceRows } = await supabase
      .from('treatment_cadence')
      .select('treatment_name, recommended_weeks_between');
    const cadence = {};
    (cadenceRows || []).forEach((c) => { cadence[c.treatment_name] = c.recommended_weeks_between; });

    // Fetch local prices for all candidates
    const { data: priceData } = await supabase
      .from('procedures')
      .select('procedure_type, price_paid')
      .eq('status', 'active')
      .in('procedure_type', recommended);

    const grouped = {};
    (priceData || []).forEach((p) => {
      if (!grouped[p.procedure_type]) grouped[p.procedure_type] = { total: 0, count: 0 };
      grouped[p.procedure_type].total += Number(p.price_paid) || 0;
      grouped[p.procedure_type].count += 1;
    });

    const avgs = {};
    Object.entries(grouped).forEach(([type, { total, count }]) => {
      avgs[type] = Math.round(total / count);
    });
    setLocalPrices(avgs);

    // Budget-constrained selection
    const budgetRange = BUDGET_RANGES.find((b) => b.value === budget);
    const budgetMax = budgetRange?.max ?? Infinity;

    let runningCost = 0;
    const affordable = [];
    for (const t of recommended) {
      const mc = monthlyCost(t, avgs, cadence);
      if (affordable.length < 6 && (runningCost + mc <= budgetMax || affordable.length === 0)) {
        affordable.push(t);
        runningCost += mc;
      }
    }

    const monthlyEstimate = Math.round(runningCost);
    const overBudget = budgetMax !== Infinity && monthlyEstimate > budgetMax;

    // Get relevant conflicts for selected treatments
    const conflicts = (rules || []).filter(
      (r) =>
        (r.compatibility === 'space_apart' || r.compatibility === 'avoid') &&
        affordable.includes(r.treatment_a) &&
        affordable.includes(r.treatment_b)
    );

    setResults({
      treatments: affordable,
      monthlyEstimate,
      budgetMax: budgetMax === Infinity ? null : budgetMax,
      budgetLabel: budgetRange?.label || '',
      overBudget,
      conflicts,
      cadenceMap: cadence,
      localPrices: avgs,
    });

    setLoading(false);
  }

  async function saveRoutine() {
    if (!user || !results) return;
    setSaving(true);

    const { error } = await supabase.from('user_routines').insert({
      user_id: user.id,
      routine_name: 'My Routine',
      treatments: results.treatments,
      quiz_answers: { concerns, budget, downtime, priorTreatments, skinType },
      cost_estimate_low: results.monthlyEstimate,
      cost_estimate_high: results.monthlyEstimate,
    });

    setSaving(false);
    if (!error) {
      showToast('Routine saved!');
    }
  }

  const totalSteps = 5;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-7 h-7 text-rose-accent" />
          <h1 className="text-3xl font-bold text-text-primary">Build My Routine</h1>
        </div>
        <p className="text-text-secondary">
          Answer 5 questions to get a personalized treatment plan.
        </p>
      </div>

      {/* Progress bar */}
      {!results && (
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-8">
          <div
            className="bg-rose-accent h-1.5 rounded-full transition-all"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      )}

      {/* Step 1: Concerns */}
      {step === 1 && !results && (
        <div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            What are your main concerns?
          </h2>
          <p className="text-sm text-text-secondary mb-6">Select all that apply.</p>
          <div className="grid grid-cols-2 gap-2">
            {CONCERNS.map((concern) => {
              const selected = concerns.includes(concern);
              return (
                <button
                  key={concern}
                  onClick={() => toggleItem(concerns, setConcerns, concern)}
                  className={`p-3 rounded-xl border text-sm font-medium text-left transition-all ${
                    selected
                      ? 'border-rose-accent bg-rose-light text-rose-dark'
                      : 'border-gray-200 bg-white text-text-primary hover:border-rose-accent/50'
                  }`}
                >
                  {selected && <CheckCircle size={14} className="inline mr-1.5 text-rose-accent" />}
                  {concern}
                </button>
              );
            })}
          </div>
          <div className="flex justify-end mt-6">
            <button
              onClick={() => setStep(2)}
              disabled={concerns.length === 0}
              className="inline-flex items-center gap-2 bg-rose-accent text-white px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Next <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Budget */}
      {step === 2 && !results && (
        <div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            What's your monthly beauty budget?
          </h2>
          <p className="text-sm text-text-secondary mb-6">This helps us prioritize recommendations.</p>
          <div className="space-y-2">
            {BUDGET_RANGES.map((b) => (
              <button
                key={b.value}
                onClick={() => setBudget(b.value)}
                className={`w-full p-4 rounded-xl border text-sm font-medium text-left transition-all ${
                  budget === b.value
                    ? 'border-rose-accent bg-rose-light text-rose-dark'
                    : 'border-gray-200 bg-white text-text-primary hover:border-rose-accent/50'
                }`}
              >
                {budget === b.value && <CheckCircle size={14} className="inline mr-1.5 text-rose-accent" />}
                {b.label}
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-6">
            <button onClick={() => setStep(1)} className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary">
              <ArrowLeft size={16} /> Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!budget}
              className="inline-flex items-center gap-2 bg-rose-accent text-white px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Next <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Downtime */}
      {step === 3 && !results && (
        <div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            How much downtime can you handle?
          </h2>
          <p className="text-sm text-text-secondary mb-6">We'll filter out treatments that don't fit your lifestyle.</p>
          <div className="space-y-2">
            {DOWNTIME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDowntime(opt.value)}
                className={`w-full p-4 rounded-xl border text-sm font-medium text-left transition-all ${
                  downtime === opt.value
                    ? 'border-rose-accent bg-rose-light text-rose-dark'
                    : 'border-gray-200 bg-white text-text-primary hover:border-rose-accent/50'
                }`}
              >
                {downtime === opt.value && <CheckCircle size={14} className="inline mr-1.5 text-rose-accent" />}
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-6">
            <button onClick={() => setStep(2)} className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary">
              <ArrowLeft size={16} /> Back
            </button>
            <button
              onClick={() => setStep(4)}
              disabled={!downtime}
              className="inline-flex items-center gap-2 bg-rose-accent text-white px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Next <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Prior Treatments */}
      {step === 4 && !results && (
        <div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Have you had any of these before?
          </h2>
          <p className="text-sm text-text-secondary mb-6">Select any you've tried. Skip if none.</p>
          <div className="grid grid-cols-2 gap-2">
            {ALL_TREATMENTS.map((name) => {
              const selected = priorTreatments.includes(name);
              return (
                <button
                  key={name}
                  onClick={() => toggleItem(priorTreatments, setPriorTreatments, name)}
                  className={`p-3 rounded-xl border text-sm font-medium text-left transition-all ${
                    selected
                      ? 'border-sky-500 bg-sky-50 text-sky-700'
                      : 'border-gray-200 bg-white text-text-primary hover:border-sky-300'
                  }`}
                >
                  {selected && <CheckCircle size={14} className="inline mr-1.5 text-sky-500" />}
                  {name}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between mt-6">
            <button onClick={() => setStep(3)} className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary">
              <ArrowLeft size={16} /> Back
            </button>
            <button
              onClick={() => setStep(5)}
              className="inline-flex items-center gap-2 bg-rose-accent text-white px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              Next <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Skin Type */}
      {step === 5 && !results && (
        <div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            What's your skin type?
          </h2>
          <p className="text-sm text-text-secondary mb-6">This helps us avoid recommending treatments that may not suit your skin.</p>
          <div className="grid grid-cols-2 gap-2">
            {SKIN_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setSkinType(type)}
                className={`p-3 rounded-xl border text-sm font-medium text-left transition-all ${
                  skinType === type
                    ? 'border-rose-accent bg-rose-light text-rose-dark'
                    : 'border-gray-200 bg-white text-text-primary hover:border-rose-accent/50'
                }`}
              >
                {skinType === type && <CheckCircle size={14} className="inline mr-1.5 text-rose-accent" />}
                {type}
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-6">
            <button onClick={() => setStep(4)} className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary">
              <ArrowLeft size={16} /> Back
            </button>
            <button
              onClick={generateRoutine}
              disabled={!skinType || loading}
              className="inline-flex items-center gap-2 bg-rose-accent text-white px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" /> Building...</>
              ) : (
                <><Sparkles size={16} /> Build My Routine</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div>
          <div className="text-center mb-6">
            <Sparkles className="w-10 h-10 text-rose-accent mx-auto mb-2" />
            <h2 className="text-2xl font-bold text-text-primary">Your Recommended Routine</h2>
            <p className="text-text-secondary mt-1">Based on your concerns, budget, and preferences.</p>
          </div>

          {/* Summary card */}
          <div className="glow-card p-5 mb-6 border-l-4" style={{ borderLeftColor: '#C94F78' }}>
            <h3 className="text-lg font-bold text-text-primary">Your Glow Routine</h3>
            <p className="text-sm text-text-secondary mt-1">
              {results.treatments.length} treatment{results.treatments.length !== 1 ? 's' : ''} · ~${results.monthlyEstimate.toLocaleString()}/month
            </p>
            {results.budgetMax && (
              <p className={`text-sm font-medium mt-1.5 ${results.overBudget ? 'text-amber-600' : 'text-emerald-600'}`}>
                {results.overBudget ? '\u26a0 Near budget limit' : '\u2713 Within budget'} — {results.budgetLabel}
              </p>
            )}
            {(() => {
              const next = results.treatments
                .map((name) => ({ name, weeks: results.cadenceMap[name] || 12 }))
                .sort((a, b) => a.weeks - b.weeks)[0];
              return next ? (
                <p className="text-sm text-text-secondary mt-1.5">
                  Next up: <span className="font-medium text-text-primary">{next.name}</span> — in ~{Math.round(next.weeks)} week{Math.round(next.weeks) !== 1 ? 's' : ''}
                </p>
              ) : null;
            })()}
          </div>

          {/* Recommended treatments */}
          <div className="glow-card p-5 mb-6">
            <h3 className="font-bold text-text-primary mb-3">Your Starter Stack</h3>
            <div className="space-y-2">
              {results.treatments.map((name) => (
                <div key={name} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <span className="font-medium text-text-primary">{name}</span>
                  {(results.localPrices[name] || localPrices[name]) && (
                    <span className="text-sm text-text-secondary">
                      ~${(results.localPrices[name] || localPrices[name]).toLocaleString()} avg
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Cost estimate */}
            <div className="mt-4 pt-4 border-t border-gray-100 text-center">
              <p className="text-sm text-text-secondary">Estimated monthly cost</p>
              <p className="text-2xl font-bold text-text-primary">
                ~${results.monthlyEstimate.toLocaleString()}/month
              </p>
              {results.budgetMax && !results.overBudget && (
                <p className="text-sm text-emerald-600 font-medium mt-1">{'\u2713'} Within your {results.budgetLabel} budget</p>
              )}
              {results.overBudget && (
                <p className="text-sm text-amber-600 font-medium mt-1">
                  {'\u26a0'} We couldn't fit a full routine within {results.budgetLabel} — here's the best fit
                </p>
              )}
            </div>
          </div>

          {/* 6-Month Calendar */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-text-primary mb-4">6-Month Schedule</h3>
            <RoutineVisualizer
              treatments={results.treatments}
              conflicts={results.conflicts}
              cadenceMap={results.cadenceMap}
              localPrices={results.localPrices}
            />
          </div>

          {/* Save button */}
          {user && (
            <div className="text-center mb-6">
              <button
                onClick={saveRoutine}
                disabled={saving}
                className="inline-flex items-center gap-2 border-2 border-rose-accent text-rose-accent px-6 py-2.5 rounded-xl font-semibold hover:bg-rose-light transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <><Loader2 size={16} className="animate-spin" /> Saving...</>
                ) : (
                  <><Save size={16} /> Save This Routine</>
                )}
              </button>
            </div>
          )}

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/my-stack"
              className="inline-flex items-center justify-center gap-2 bg-rose-accent text-white px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity"
            >
              Check Compatibility <ArrowRight size={16} />
            </Link>
            <button
              onClick={() => {
                setResults(null);
                setStep(1);
                setConcerns([]);
                setBudget(null);
                setDowntime('');
                setPriorTreatments([]);
                setSkinType('');
              }}
              className="inline-flex items-center justify-center gap-2 border border-gray-200 text-text-secondary px-6 py-2.5 rounded-xl font-medium hover:text-text-primary hover:border-gray-300 transition-colors"
            >
              Retake Quiz
            </button>
          </div>

          <p className="text-xs text-text-secondary italic text-center mt-6">
            This quiz provides general guidance based on common treatment protocols. Always consult a qualified provider for personalized recommendations.
          </p>
        </div>
      )}
    </div>
  );
}

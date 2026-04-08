import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Layers, ArrowRight, ArrowLeft, CheckCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';
import StackCompatibilityCard from '../components/StackCompatibilityCard';
import StackAdvisor from '../components/StackAdvisor';
import RoutineVisualizer from '../components/RoutineVisualizer';
import { getProcedureLabel } from '../lib/procedureLabel';

const TREATMENTS = [
  'Botox / Dysport / Xeomin',
  'Lip Filler',
  'Cheek Filler',
  'Microneedling',
  'RF Microneedling',
  'Morpheus8',
  'PRP Microneedling',
  'Chemical Peel',
  'HydraFacial',
  'Dermaplaning',
  'PRP/PRF',
  'Sculptra',
  'Kybella',
  'CoolSculpting',
  'Laser Hair Removal',
];

export default function StackBuilder() {
  const { user } = useContext(AuthContext);
  const [step, setStep] = useState(1);
  const [currentTreatments, setCurrentTreatments] = useState([]);
  const [consideredTreatments, setConsideredTreatments] = useState([]);
  const [stackingData, setStackingData] = useState([]);
  const [localPrices, setLocalPrices] = useState({});
  const [loading, setLoading] = useState(false);
  const [city, setCity] = useState('');

  useEffect(() => {
    document.title = 'My Stack | GlowBuddy';
  }, []);

  // Pre-fill from treatment_log if user is signed in
  useEffect(() => {
    if (!user) return;

    async function prefill() {
      const { data } = await supabase
        .from('treatment_log')
        .select('treatment_name')
        .eq('user_id', user.id);

      if (data && data.length > 0) {
        const unique = [...new Set(data.map((d) => d.treatment_name))];
        const valid = unique.filter((t) => TREATMENTS.includes(t));
        if (valid.length > 0) setCurrentTreatments(valid);
      }

      // Get city
      const { data: profile } = await supabase
        .from('profiles')
        .select('city')
        .eq('id', user.id)
        .single();
      if (profile?.city) setCity(profile.city);
    }

    prefill();
  }, [user?.id]);

  // Fetch stacking data + prices when moving to results
  useEffect(() => {
    if (step !== 3) return;

    async function fetchResults() {
      setLoading(true);

      // Fetch all relevant stacking rules
      const allSelected = [...currentTreatments, ...consideredTreatments];
      const { data: rules } = await supabase
        .from('treatment_stacking')
        .select('*')
        .or(
          allSelected.map((t) => `treatment_a.eq.${t}`).join(',') + ',' +
          allSelected.map((t) => `treatment_b.eq.${t}`).join(',')
        );

      setStackingData(rules || []);

      // Fetch local average prices
      const { data: priceData } = await supabase
        .from('procedures')
        .select('procedure_type, price_paid')
        .eq('status', 'active')
        .in('procedure_type', allSelected);

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

      setLoading(false);
    }

    fetchResults();
  }, [step, currentTreatments, consideredTreatments]);

  function toggleTreatment(list, setList, name) {
    if (list.includes(name)) {
      setList(list.filter((t) => t !== name));
    } else {
      setList([...list, name]);
    }
  }

  function getRelevantRules(treatment) {
    return stackingData.filter((rule) => {
      const names = [rule.treatment_a, rule.treatment_b];
      return names.includes(treatment) &&
        (currentTreatments.some((t) => names.includes(t)) || consideredTreatments.some((t) => names.includes(t)));
    });
  }

  // Get conflicts for the routine visualizer
  const conflicts = stackingData.filter(
    (r) => r.compatibility === 'space_apart' || r.compatibility === 'avoid'
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Layers className="w-7 h-7 text-rose-accent" />
          <h1 className="text-3xl font-bold text-text-primary">My Stack</h1>
        </div>
        <p className="text-text-secondary">
          I already get Botox — what complements it? Find out what stacks safely.
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step === s
                  ? 'bg-rose-accent text-white'
                  : step > s
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-200 text-text-secondary'
              }`}
            >
              {step > s ? <CheckCircle size={16} /> : s}
            </div>
            {s < 3 && <div className={`w-8 h-0.5 ${step > s ? 'bg-emerald-500' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: What do you currently get? */}
      {step === 1 && (
        <div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            What do you currently get?
          </h2>
          <p className="text-sm text-text-secondary mb-6">
            Select all treatments in your current routine.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {TREATMENTS.map((name) => {
              const selected = currentTreatments.includes(name);
              return (
                <button
                  key={name}
                  onClick={() => toggleTreatment(currentTreatments, setCurrentTreatments, name)}
                  className={`p-3 rounded-xl border text-sm font-medium text-left transition-all ${
                    selected
                      ? 'border-rose-accent bg-rose-light text-rose-dark'
                      : 'border-gray-200 bg-white text-text-primary hover:border-rose-accent/50'
                  }`}
                >
                  {selected && <CheckCircle size={14} className="inline mr-1.5 text-rose-accent" />}
                  {getProcedureLabel(name, null)}
                </button>
              );
            })}
          </div>
          <div className="flex justify-end mt-6">
            <button
              onClick={() => setStep(2)}
              disabled={currentTreatments.length === 0}
              className="inline-flex items-center gap-2 bg-rose-accent text-white px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: What are you considering? */}
      {step === 2 && (
        <div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            What are you thinking of adding?
          </h2>
          <p className="text-sm text-text-secondary mb-6">
            Select treatments you're curious about.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {TREATMENTS.filter((t) => !currentTreatments.includes(t)).map((name) => {
              const selected = consideredTreatments.includes(name);
              return (
                <button
                  key={name}
                  onClick={() => toggleTreatment(consideredTreatments, setConsideredTreatments, name)}
                  className={`p-3 rounded-xl border text-sm font-medium text-left transition-all ${
                    selected
                      ? 'border-sky-500 bg-sky-50 text-sky-700'
                      : 'border-gray-200 bg-white text-text-primary hover:border-sky-300'
                  }`}
                >
                  {selected && <CheckCircle size={14} className="inline mr-1.5 text-sky-500" />}
                  {getProcedureLabel(name, null)}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={consideredTreatments.length === 0}
              className="inline-flex items-center gap-2 bg-rose-accent text-white px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              See Results
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {step === 3 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft size={16} />
              Change selections
            </button>
          </div>

          {/* Current stack */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
              Your current treatments
            </p>
            <div className="flex flex-wrap gap-1.5">
              {currentTreatments.map((t) => (
                <span key={t} className="px-2.5 py-1 bg-rose-light text-rose-dark text-xs font-medium rounded-full border border-rose-accent/20">
                  {getProcedureLabel(t, null)}
                </span>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <p className="text-text-secondary animate-pulse">Analyzing your stack...</p>
            </div>
          ) : (
            <>
              {/* AI Advisor */}
              <div className="mb-6">
                <StackAdvisor
                  currentTreatments={currentTreatments}
                  consideredTreatments={consideredTreatments}
                  stackingData={stackingData}
                  localPrices={localPrices}
                  city={city}
                />
              </div>

              {/* Compatibility results per considered treatment */}
              {consideredTreatments.map((treatment) => {
                const rules = getRelevantRules(treatment);
                if (rules.length === 0) return null;

                return (
                  <div key={treatment} className="mb-8">
                    <h3 className="text-lg font-bold text-text-primary mb-3">
                      Adding {getProcedureLabel(treatment, null)}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {rules.map((rule) => {
                        const other = rule.treatment_a === treatment ? rule.treatment_b : rule.treatment_a;
                        return (
                          <StackCompatibilityCard
                            key={rule.id}
                            rule={rule}
                            otherTreatment={`${treatment} + ${other}`}
                            localPrice={localPrices[treatment]}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* 6-Month Calendar */}
              <div className="mt-8">
                <h3 className="text-lg font-bold text-text-primary mb-4">
                  6-Month Routine Calendar
                </h3>
                <RoutineVisualizer
                  treatments={[...currentTreatments, ...consideredTreatments]}
                  conflicts={conflicts}
                />
              </div>
            </>
          )}

          {/* Build My Routine CTA */}
          <div className="mt-8 text-center">
            <Link
              to="/build-my-routine"
              className="inline-flex items-center gap-2 border-2 border-rose-accent text-rose-accent px-6 py-2.5 rounded-xl font-semibold hover:bg-rose-light transition-colors"
            >
              Take the Routine Quiz
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

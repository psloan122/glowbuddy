import { useState, useContext } from 'react';
import { Sparkles, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';

export default function StackAdvisor({ currentTreatments, consideredTreatments, stackingData, localPrices, city }) {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Fallback: rule-based matching from stacking table
  function getFallbackAdvice() {
    if (!stackingData || stackingData.length === 0) return null;

    const relevant = stackingData.filter((rule) => {
      const names = [rule.treatment_a, rule.treatment_b];
      return currentTreatments.some((t) => names.includes(t)) &&
        consideredTreatments.some((t) => names.includes(t));
    });

    if (relevant.length === 0) return null;

    const cautions = relevant
      .filter((r) => r.compatibility === 'avoid' || r.compatibility === 'space_apart')
      .map((r) => `${r.timing_note || r.why}`);

    const goodCombos = relevant
      .filter((r) => r.compatibility === 'great_combo' || r.compatibility === 'same_day_ok')
      .map((r) => {
        const other = currentTreatments.includes(r.treatment_a) ? r.treatment_b : r.treatment_a;
        return other;
      });

    return {
      recommendation: `Based on your current treatments, ${goodCombos.length > 0 ? `${goodCombos.join(' and ')} may pair well` : 'check the compatibility details below'}. ${cautions.length > 0 ? 'Note some spacing requirements.' : ''}`,
      suggested_additions: [...new Set(goodCombos)].slice(0, 3),
      timing_guidance: cautions.length > 0 ? cautions[0] : 'No specific timing concerns found.',
      cautions: cautions.slice(0, 3),
      estimated_monthly_cost: null,
      sources: relevant
        .filter((r) => r.source_url)
        .map((r) => ({
          label: r.source_type === 'fda_label' ? 'FDA Label' : r.source_type === 'peer_reviewed' ? 'Peer-reviewed' : 'Clinical',
          url: r.source_url,
        })),
    };
  }

  async function getAIAdvice() {
    if (!user) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('stack-advisor', {
        body: {
          currentTreatments,
          consideredTreatments,
          stackingData,
          localPrices,
          city,
        },
      });

      if (fnError) throw fnError;

      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      setResult(parsed);
    } catch (err) {
      console.error('StackAdvisor error:', err);
      // Fallback to rule-based
      const fallback = getFallbackAdvice();
      if (fallback) {
        setResult(fallback);
      } else {
        setError('Unable to generate advice. Check the compatibility cards below for guidance.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="glow-card border border-sky-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={18} className="text-sky-600" />
          <h3 className="font-bold text-text-primary">Stack Advisor</h3>
        </div>

        {result.recommendation && (
          <p className="text-sm text-text-primary mb-3">{result.recommendation}</p>
        )}

        {result.suggested_additions && result.suggested_additions.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">
              Suggested Additions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {result.suggested_additions.map((t) => (
                <span key={t} className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {result.timing_guidance && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">
              Timing Guidance
            </p>
            <p className="text-sm text-text-secondary">{result.timing_guidance}</p>
          </div>
        )}

        {result.cautions && result.cautions.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">
              Watch Out For
            </p>
            <ul className="list-disc list-inside text-sm text-amber-700 space-y-0.5">
              {result.cautions.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        {result.estimated_monthly_cost && (
          <p className="text-sm font-medium text-text-primary">
            Estimated monthly cost: ${result.estimated_monthly_cost.low}–${result.estimated_monthly_cost.high}
          </p>
        )}

        {/* Sources */}
        {result.sources && result.sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-text-secondary mb-1">Sources:</p>
            <div className="flex flex-wrap gap-2">
              {result.sources.map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#0369A1] hover:underline"
                >
                  <ExternalLink size={10} />
                  {s.label}
                </a>
              ))}
            </div>
          </div>
        )}

        <p className="text-[10px] text-text-secondary italic mt-3">
          This is not medical advice. Always consult your provider before combining treatments.
        </p>
      </div>
    );
  }

  return (
    <div className="glow-card border border-sky-200 p-5 text-center">
      <Sparkles size={24} className="text-sky-600 mx-auto mb-2" />
      <h3 className="font-bold text-text-primary mb-1">Stack Advisor</h3>
      <p className="text-sm text-text-secondary mb-4">
        Get AI-powered advice on building a safe treatment routine.
      </p>
      {error && (
        <p className="text-sm text-red-600 mb-3">{error}</p>
      )}
      <button
        onClick={getAIAdvice}
        disabled={loading || !user || currentTreatments.length === 0}
        className="bg-sky-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Sparkles size={16} />
            Get Advice
          </>
        )}
      </button>
      {!user && (
        <p className="text-xs text-text-secondary mt-2">Sign in to use the AI advisor.</p>
      )}
    </div>
  );
}

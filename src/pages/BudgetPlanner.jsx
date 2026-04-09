import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';
import BudgetRecommendationCard from '../components/BudgetRecommendationCard';

export default function BudgetPlanner() {
  const { user, openAuthModal } = useContext(AuthContext);

  const [budget, setBudget] = useState('');
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [totalLow, setTotalLow] = useState(null);
  const [totalHigh, setTotalHigh] = useState(null);
  const [leftoverSuggestion, setLeftoverSuggestion] = useState('');
  const [summary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [cadenceData, setCadenceData] = useState([]);
  const [localPrices, setLocalPrices] = useState([]);
  const [city, setCity] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    document.title = 'Budget Planner | Know Before You Glow';
  }, []);

  useEffect(() => {
    if (!user) {
      setInitialLoading(false);
      return;
    }

    async function fetchUserData() {
      setInitialLoading(true);
      try {
        // Fetch treatment history
        const { data: logData, error: logError } = await supabase
          .from('treatment_log')
          .select('treatment_name, date_received, price_paid, next_recommended_date, satisfaction_rating')
          .eq('user_id', user.id);

        if (logError) throw logError;
        setHistory(logData || []);

        // Fetch treatment cadence data
        const { data: cadence, error: cadenceError } = await supabase
          .from('treatment_cadence')
          .select('*');

        if (cadenceError) throw cadenceError;
        setCadenceData(cadence || []);

        // Get user's state for local pricing
        let userState = '';
        try {
          const stateResult = await supabase.rpc('get_user_state', { uid: user.id });
          if (stateResult.data) {
            userState = stateResult.data;
          }
        } catch {
          // Fallback: try gating metadata
          const { data: profile } = await supabase
            .from('profiles')
            .select('state, city')
            .eq('id', user.id)
            .single();
          if (profile) {
            userState = profile.state || '';
            setCity(profile.city || '');
          }
        }

        // Fetch local average prices from procedures
        if (userState) {
          const { data: priceData, error: priceError } = await supabase
            .from('procedures')
            .select('procedure_type, price_paid')
            .eq('status', 'active')
            .eq('state', userState);

          if (!priceError && priceData) {
            // Group by procedure_type and calculate averages
            const grouped = priceData.reduce((acc, row) => {
              if (!acc[row.procedure_type]) {
                acc[row.procedure_type] = { total: 0, count: 0 };
              }
              acc[row.procedure_type].total += Number(row.price_paid) || 0;
              acc[row.procedure_type].count += 1;
              return acc;
            }, {});

            const averages = Object.entries(grouped).map(([procedure_type, { total, count }]) => ({
              procedure_type,
              avg_price: Math.round(total / count),
            }));

            setLocalPrices(averages);
          }
        }
      } catch {
        setError('Failed to load your treatment data. Please try again.');
      } finally {
        setInitialLoading(false);
      }
    }

    fetchUserData();
  }, [user?.id]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!budget || loading) return;

    setLoading(true);
    setError('');
    setRecommendations([]);
    setTotalLow(null);
    setTotalHigh(null);
    setLeftoverSuggestion('');
    setSummary('');

    try {
      const today = new Date().toISOString().split('T')[0];

      // Calculate overdue treatments
      const overdue = history.filter((entry) => {
        if (!entry.next_recommended_date) return false;
        return today > entry.next_recommended_date;
      });

      const { data, error: fnError } = await supabase.functions.invoke('budget-plan', {
        body: {
          budget: Number(budget),
          history,
          overdue,
          localPrices,
          cadenceData,
          city,
        },
      });

      if (fnError) throw fnError;

      const result = typeof data === 'string' ? JSON.parse(data) : data;

      setRecommendations(result.recommendations || []);
      setTotalLow(result.totalLow ?? null);
      setTotalHigh(result.totalHigh ?? null);
      setLeftoverSuggestion(result.leftoverSuggestion || '');
      setSummary(result.summary || '');
    } catch {
      setError('Something went wrong generating your plan. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Auth gate
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center py-16">
          <Sparkles className="w-12 h-12 text-rose-accent mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text-primary mb-2">Budget Planner</h1>
          <p className="text-text-secondary mb-6">
            Sign in to get AI-powered treatment recommendations based on your budget.
          </p>
          <button
            onClick={openAuthModal}
            className="bg-rose-accent text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            Sign In to Get Started
          </button>
        </div>
      </div>
    );
  }

  if (initialLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-rose-accent mr-3" />
          <span className="text-text-secondary">Loading your treatment data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Sparkles className="w-7 h-7 text-rose-accent" />
          <h1 className="text-3xl font-bold text-text-primary">Budget Planner</h1>
        </div>
        <p className="text-text-secondary text-lg">
          I have $X this month — what should I get?
        </p>
      </div>

      {/* No treatment history callout */}
      {history.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-center">
          <p className="text-amber-800 font-medium mb-2">
            Log some treatments first to get personalized recommendations
          </p>
          <Link
            to="/my-treatments"
            className="text-rose-accent font-semibold hover:underline"
          >
            Go to My Treatments &rarr;
          </Link>
        </div>
      )}

      {/* Budget Input Form */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex items-center justify-center mb-4">
          <div className="relative w-full max-w-xs">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-text-secondary">
              $
            </span>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="Enter your monthly budget"
              autoFocus
              min="0"
              className="w-full pl-10 pr-4 py-4 text-2xl font-bold text-center rounded-xl border-2 border-gray-200 focus:border-rose-accent focus:outline-none focus:ring-2 focus:ring-rose-accent/20 bg-white text-text-primary placeholder:text-sm placeholder:font-normal"
            />
          </div>
        </div>

        <div className="text-center">
          <button
            type="submit"
            disabled={!budget || loading}
            className="bg-rose-accent text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            <DollarSign className="w-5 h-5" />
            Get Recommendations
          </button>
        </div>
      </form>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-center">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Sparkles className="w-10 h-10 text-rose-accent animate-spin mb-4" />
          <p className="text-text-secondary font-medium">
            Analyzing your treatment history...
          </p>
        </div>
      )}

      {/* Results */}
      {!loading && recommendations.length > 0 && (
        <div className="space-y-4">
          {/* Summary */}
          {summary && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 mb-2">
              <p className="text-text-primary font-medium">{summary}</p>
            </div>
          )}

          {/* Recommendation Cards */}
          {recommendations.map((rec, index) => (
            <BudgetRecommendationCard key={index} recommendation={rec} />
          ))}

          {/* Total Estimate */}
          {totalLow != null && totalHigh != null && (
            <div className="bg-white border-2 border-rose-accent/30 rounded-xl p-4 text-center">
              <p className="text-text-secondary text-sm mb-1">Estimated total</p>
              <p className="text-2xl font-bold text-text-primary">
                ${totalLow.toLocaleString()} &ndash; ${totalHigh.toLocaleString()}
              </p>
            </div>
          )}

          {/* Leftover Suggestion */}
          {leftoverSuggestion && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <p className="text-emerald-800 font-medium">{leftoverSuggestion}</p>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-xs text-text-secondary italic text-center mt-6">
            Consult your provider for personalized advice. Timing recommendations are based on
            FDA-approved retreatment intervals.
          </p>
        </div>
      )}

      {/* Empty state — no results yet and not loading */}
      {!loading && recommendations.length === 0 && !error && (
        <div className="bg-gray-50 rounded-xl p-6 text-center">
          <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            How it works
          </h3>
          <ul className="text-text-secondary text-sm space-y-2 max-w-sm mx-auto text-left">
            <li className="flex items-start gap-2">
              <span className="text-rose-accent font-bold mt-0.5">1.</span>
              Enter your monthly beauty budget above
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-accent font-bold mt-0.5">2.</span>
              We analyze your treatment history, upcoming needs, and local pricing
            </li>
            <li className="flex items-start gap-2">
              <span className="text-rose-accent font-bold mt-0.5">3.</span>
              Get a prioritized plan that makes the most of every dollar
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useContext } from 'react';
import { X, Bell, TrendingDown, CheckCircle } from 'lucide-react';
import { AuthContext } from '../App';
import { isEmailVerified } from '../lib/auth';
import { createAlert } from '../lib/priceAlerts';
import { PROCEDURE_TYPES, US_STATES } from '../lib/constants';
import { supabase } from '../lib/supabase';
import VerifyEmailModal from './VerifyEmailModal';

export default function CreatePriceAlert({
  onClose,
  defaultProcedure = '',
  defaultCity = '',
  defaultState = '',
  defaultPrice = '',
}) {
  const { user, openAuthModal } = useContext(AuthContext);

  const [procedureType, setProcedureType] = useState(defaultProcedure);
  const [city, setCity] = useState(defaultCity);
  const [state, setState] = useState(defaultState);
  const [maxPrice, setMaxPrice] = useState(defaultPrice ? String(defaultPrice) : '');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [currentAvg, setCurrentAvg] = useState(null);
  const [avgLoading, setAvgLoading] = useState(false);

  // Fetch current average price when filters change
  useEffect(() => {
    if (!procedureType) {
      setCurrentAvg(null);
      return;
    }

    let cancelled = false;

    async function fetchAverage() {
      setAvgLoading(true);
      try {
        let query = supabase
          .from('procedures')
          .select('price_paid')
          .eq('procedure_type', procedureType)
          .eq('status', 'active');

        if (city) query = query.eq('city', city);
        if (state) query = query.eq('state', state);

        const { data } = await query;

        if (!cancelled && data && data.length > 0) {
          const avg =
            data.reduce((sum, row) => sum + Number(row.price_paid), 0) /
            data.length;
          setCurrentAvg(Math.round(avg));
        } else if (!cancelled) {
          setCurrentAvg(null);
        }
      } catch {
        if (!cancelled) setCurrentAvg(null);
      } finally {
        if (!cancelled) setAvgLoading(false);
      }
    }

    fetchAverage();
    return () => {
      cancelled = true;
    };
  }, [procedureType, city, state]);

  // Auto-close after success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => onClose(), 1500);
      return () => clearTimeout(timer);
    }
  }, [success, onClose]);

  const locationLabel = city || state || 'your area';

  const inputClass =
    'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-accent/50 focus:border-rose-accent';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!procedureType) {
      setError('Please select a procedure type.');
      return;
    }

    if (!user) {
      openAuthModal();
      return;
    }

    const verified = await isEmailVerified(user);
    if (!verified) {
      setShowVerifyModal(true);
      return;
    }

    setSubmitting(true);
    try {
      await createAlert({
        procedureType,
        city,
        state,
        maxPrice: Number(maxPrice),
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[80] flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Success state */}
          {success ? (
            <div className="flex flex-col items-center gap-3 py-12 px-6 text-center">
              <CheckCircle className="w-12 h-12 text-emerald-500" />
              <p className="text-sm text-gray-700">
                We'll notify you when{' '}
                <span className="font-semibold">{procedureType}</span> drops
                below{' '}
                <span className="font-semibold">${maxPrice}</span> in{' '}
                {locationLabel}.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-rose-accent" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Set Price Alert
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 rounded-full hover:bg-gray-100 transition"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="px-5 pb-5 flex flex-col gap-4">
                {/* Procedure type */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Procedure
                  </label>
                  <select
                    value={procedureType}
                    onChange={(e) => setProcedureType(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select a procedure</option>
                    {PROCEDURE_TYPES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Location
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="City or town"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className={inputClass}
                    />
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">State</option>
                      {US_STATES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Target price */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Target Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                      $
                    </span>
                    <input
                      type="number"
                      placeholder="0"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className={`${inputClass} pl-8`}
                    />
                  </div>

                  {/* Current average context */}
                  {currentAvg !== null && !avgLoading && (
                    <div className="mt-2 bg-sky-50 rounded-xl p-3 flex items-center gap-2 text-sm text-sky-700">
                      <TrendingDown className="w-4 h-4 flex-shrink-0" />
                      <span>
                        Current average in {locationLabel}:{' '}
                        <span className="font-semibold">${currentAvg}</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <p className="text-sm text-red-500 -mt-1">{error}</p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-rose-accent text-white text-sm font-medium rounded-xl hover:opacity-90 transition disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Create Alert'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Verify email modal */}
      {showVerifyModal && (
        <VerifyEmailModal onClose={() => setShowVerifyModal(false)} />
      )}
    </>
  );
}

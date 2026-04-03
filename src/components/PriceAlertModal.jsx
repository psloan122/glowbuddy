import { useState, useContext } from 'react';
import { X, Bell } from 'lucide-react';
import { AuthContext } from '../App';
import { isEmailVerified } from '../lib/auth';
import { createAlert } from '../lib/priceAlerts';
import { PROCEDURE_TYPES, US_STATES } from '../lib/constants';
import VerifyEmailModal from './VerifyEmailModal';

export default function PriceAlertModal({ onClose, defaultProcedure, defaultCity, defaultState }) {
  const { user, openAuthModal } = useContext(AuthContext);

  const [procedureType, setProcedureType] = useState(defaultProcedure || '');
  const [city, setCity] = useState(defaultCity || '');
  const [state, setState] = useState(defaultState || '');
  const [maxPrice, setMaxPrice] = useState('');
  const [frequency, setFrequency] = useState('instant');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!procedureType) return;

    if (!user) {
      openAuthModal('signup');
      return;
    }

    if (!isEmailVerified(user)) {
      setShowVerifyModal(true);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await createAlert({
        procedureType,
        city: city.trim() || null,
        state: state || null,
        maxPrice: maxPrice ? Number(maxPrice) : null,
        frequency,
      });

      setSuccess(true);
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/40">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 mt-20 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-rose-accent" />
            <h2 className="text-lg font-bold text-text-primary">
              Set Price Alert
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="text-center py-4">
            <p className="text-verified font-medium">
              Alert created! We&rsquo;ll notify you when new prices are posted.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Procedure Type */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Procedure Type
              </label>
              <select
                value={procedureType}
                onChange={(e) => setProcedureType(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-accent/50 focus:border-rose-accent"
                required
              >
                <option value="">Select a procedure</option>
                {PROCEDURE_TYPES.map((pt) => (
                  <option key={pt} value={pt}>{pt}</option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  City <span className="font-normal text-text-secondary">(optional)</span>
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Austin"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-accent/50 focus:border-rose-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  State <span className="font-normal text-text-secondary">(optional)</span>
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-accent/50 focus:border-rose-accent"
                >
                  <option value="">Any State</option>
                  {US_STATES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Max Price */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Max Price <span className="font-normal text-text-secondary">(optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary text-sm">$</span>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="Any price"
                  min="0"
                  className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-accent/50 focus:border-rose-accent"
                />
              </div>
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Notification Frequency
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setFrequency('instant')}
                  className={`flex-1 py-2 text-sm font-medium rounded-xl transition ${
                    frequency === 'instant'
                      ? 'bg-rose-accent text-white'
                      : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                  }`}
                >
                  Instant
                </button>
                <button
                  type="button"
                  onClick={() => {}}
                  className="flex-1 py-2 text-sm font-medium rounded-xl bg-gray-50 text-text-secondary/50 cursor-not-allowed"
                  title="Coming soon"
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => {}}
                  className="flex-1 py-2 text-sm font-medium rounded-xl bg-gray-50 text-text-secondary/50 cursor-not-allowed"
                  title="Coming soon"
                >
                  Weekly
                </button>
              </div>
              <p className="text-xs text-text-secondary mt-1">
                Daily and weekly digests coming soon.
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 border border-gray-200 text-text-primary font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !procedureType}
                className="flex-1 py-2.5 bg-rose-accent text-white font-medium rounded-xl hover:bg-rose-dark transition-colors text-sm disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Alert'}
              </button>
            </div>
          </form>
        )}
      </div>
      {showVerifyModal && (
        <VerifyEmailModal
          action="set price alerts"
          onClose={() => setShowVerifyModal(false)}
        />
      )}
    </div>
  );
}

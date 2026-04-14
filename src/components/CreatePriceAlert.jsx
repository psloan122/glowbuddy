import { useState, useEffect, useContext } from 'react';
import { X, Bell, CheckCircle } from 'lucide-react';
import { AuthContext } from '../App';
import { isEmailVerified } from '../lib/auth';
import { createAlert } from '../lib/priceAlerts';
import VerifyEmailModal from './VerifyEmailModal';
import LocationRadiusInput from './LocationRadiusInput';
import {
  ALERT_PROCEDURE_GROUPS,
  findAlertOption,
  buildAlertOptionValue,
} from '../lib/alertProcedures';

export default function CreatePriceAlert({
  onClose,
  defaultProcedure = '',
  defaultBrand = '',
  defaultCity = '',
  defaultState = '',
  defaultPrice = '',
}) {
  const { user, openAuthModal } = useContext(AuthContext);

  const UNIT_LABELS = {
    per_unit: 'per unit',
    per_syringe: 'per syringe',
    per_vial: 'per vial',
    per_session: 'per session',
    per_area: 'per area',
    per_cycle: 'per cycle',
    flat_package: 'per package',
  };

  const [optionValue, setOptionValue] = useState(() =>
    buildAlertOptionValue(defaultProcedure, defaultBrand),
  );
  const initialOption = findAlertOption(buildAlertOptionValue(defaultProcedure, defaultBrand));
  const [priceUnit, setPriceUnit] = useState(initialOption?.defaultUnit || 'per_unit');
  const [location, setLocation] = useState(() => {
    if (!defaultCity) return null;
    return { city: defaultCity, state: defaultState || '', zip: '', lat: null, lng: null };
  });
  const [radius, setRadius] = useState(25);
  const [maxPrice, setMaxPrice] = useState(defaultPrice ? String(defaultPrice) : '');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  // Auto-close after success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => onClose(), 1500);
      return () => clearTimeout(timer);
    }
  }, [success, onClose]);

  const selectedOption = findAlertOption(optionValue);

  // Reset unit and threshold when procedure changes
  function handleOptionChange(value) {
    setOptionValue(value);
    const opt = findAlertOption(value);
    if (opt) {
      setPriceUnit(opt.defaultUnit || 'per_unit');
      setMaxPrice('');
    }
  }

  // Live preview line — tells the user exactly what the alert will do.
  const previewText = (() => {
    if (!selectedOption) return null;
    const name = selectedOption.label;
    const unitLabel = UNIT_LABELS[priceUnit] || '';
    const price = maxPrice && Number(maxPrice) > 0
      ? `drops below $${Number(maxPrice).toLocaleString()} ${unitLabel}`
      : 'is posted';
    const where = location
      ? radius > 0
        ? `within ${radius} miles of ${location.city}, ${location.state}`
        : `in ${location.city}, ${location.state}`
      : 'anywhere';
    return `You'll be notified when ${name} ${price} ${where}.`;
  })();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!selectedOption) {
      setError('Please select a procedure.');
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
        procedureType: selectedOption.procedureType,
        brand: selectedOption.brand,
        priceUnit,
        city: location?.city || null,
        state: location?.state || null,
        lat: location?.lat ?? null,
        lng: location?.lng ?? null,
        zip: location?.zip || null,
        radiusMiles: location ? radius : 0,
        maxPrice: Number(maxPrice) || null,
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
      <div
        className="fixed inset-0 bg-black/40 z-[80] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-white w-full max-w-md overflow-hidden"
          style={{ borderTop: '3px solid #E8347A', borderRadius: '2px' }}
          onClick={(e) => e.stopPropagation()}
        >
          {success ? (
            <div className="flex flex-col items-center gap-3 py-12 px-6 text-center">
              <CheckCircle className="w-12 h-12 text-verified" />
              <p className="text-[14px] text-ink" style={{ fontFamily: 'var(--font-body)' }}>
                Alert created. We'll notify you when a match is posted.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: '1px solid #F0F0F0' }}
              >
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-hot-pink" />
                  <h2
                    className="editorial-kicker"
                    style={{ margin: 0 }}
                  >
                    Set price alert
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1 text-text-secondary hover:text-ink transition"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-5 py-5 flex flex-col gap-5">
                {/* Procedure */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">
                    Procedure
                  </label>
                  <select
                    value={optionValue}
                    onChange={(e) => handleOptionChange(e.target.value)}
                    className="w-full px-3 py-3 text-[13px] border border-rule bg-white focus:outline-none focus:border-hot-pink"
                    style={{ borderRadius: '2px', fontFamily: 'var(--font-body)' }}
                  >
                    <option value="">Select a procedure</option>
                    {ALERT_PROCEDURE_GROUPS.map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Unit selector — only show when procedure has multiple unit options */}
                {selectedOption && selectedOption.unitOptions && selectedOption.unitOptions.length > 1 && (
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">
                      Price type
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {selectedOption.unitOptions.map((unit) => (
                        <button
                          key={unit}
                          type="button"
                          onClick={() => { setPriceUnit(unit); setMaxPrice(''); }}
                          className="transition-all"
                          style={{
                            padding: '6px 14px',
                            borderRadius: '2px',
                            border: priceUnit === unit ? '1.5px solid #E8347A' : '1px solid #E0E0E0',
                            background: priceUnit === unit ? '#FDF0F5' : 'white',
                            color: priceUnit === unit ? '#E8347A' : '#666',
                            fontFamily: 'var(--font-body)',
                            fontWeight: priceUnit === unit ? 600 : 400,
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          {UNIT_LABELS[unit] || unit}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Location + radius */}
                <LocationRadiusInput
                  value={location}
                  onChange={setLocation}
                  radius={radius}
                  onRadiusChange={setRadius}
                />

                {/* Target price */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">
                    Alert me when price drops below
                  </label>
                  <div className="relative">
                    <span
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-text-secondary"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      $
                    </span>
                    <input
                      type="number"
                      placeholder={selectedOption?.placeholder ? `e.g. ${selectedOption.placeholder}` : '0 = any price'}
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      min="0"
                      step={priceUnit === 'per_unit' ? 1 : 50}
                      className="w-full pl-7 pr-20 py-3 text-[13px] border border-rule bg-white focus:outline-none focus:border-hot-pink"
                      style={{ borderRadius: '2px', fontFamily: 'var(--font-body)' }}
                    />
                    <span
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-text-secondary"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {UNIT_LABELS[priceUnit] || ''}
                    </span>
                  </div>
                </div>

                {/* Live preview */}
                {previewText && (
                  <p
                    className="italic"
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontWeight: 300,
                      fontSize: '13px',
                      color: '#B8A89A',
                      lineHeight: 1.4,
                    }}
                  >
                    {previewText}
                  </p>
                )}

                {/* Error */}
                {error && (
                  <p className="text-[13px] text-red-500">{error}</p>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 text-[12px] font-bold uppercase text-white bg-hot-pink hover:bg-hot-pink-dark transition disabled:opacity-50"
                  style={{
                    letterSpacing: '0.08em',
                    borderRadius: '2px',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {submitting ? 'Creating…' : 'Create alert'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {showVerifyModal && (
        <VerifyEmailModal onClose={() => setShowVerifyModal(false)} />
      )}
    </>
  );
}

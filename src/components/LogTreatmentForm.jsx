import { useState, useEffect, useContext } from 'react';
import { X, Loader2 } from 'lucide-react';
import { AuthContext } from '../App';
import { supabase } from '../lib/supabase';
import StarRating from './StarRating';
import { getProcedureLabel } from '../lib/procedureLabel';

const TREATMENT_NAMES = [
  'Botox',
  'Dysport',
  'Xeomin',
  'Lip Filler',
  'Cheek Filler',
  'Sculptra',
  'Kybella',
  'Microneedling',
  'RF Microneedling',
  'Morpheus8',
  'Chemical Peel',
  'HydraFacial',
  'Dermaplaning',
  'PRP/PRF',
  'Semaglutide (Ozempic / Wegovy)',
  'Tirzepatide (Mounjaro / Zepbound)',
  'Compounded Semaglutide',
  'GLP-1 (unspecified)',
  'PDO Thread Lift',
  'Laser Hair Removal',
  'CoolSculpting',
  'IV Therapy',
];

const FILLER_TREATMENTS = ['Lip Filler', 'Cheek Filler', 'Sculptra', 'Kybella'];

const INPUT_CLASSES =
  'w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-accent/50 focus:border-rose-accent';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addWeeks(dateStr, weeks) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + weeks * 7);
  return d;
}

export default function LogTreatmentForm({ onClose, onSaved, editEntry }) {
  const { user } = useContext(AuthContext);

  const [treatmentName, setTreatmentName] = useState(editEntry?.treatment_name || '');
  const [dateReceived, setDateReceived] = useState(editEntry?.date_received || todayISO());
  const [providerName, setProviderName] = useState(editEntry?.provider_name || '');
  const [pricePaid, setPricePaid] = useState(editEntry?.price_paid ?? '');
  const [unitsOrSyringes, setUnitsOrSyringes] = useState(editEntry?.units_or_syringes ?? '');
  const [satisfactionRating, setSatisfactionRating] = useState(editEntry?.satisfaction_rating || 3);
  const [notes, setNotes] = useState(editEntry?.notes || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [cadenceNote, setCadenceNote] = useState('');
  const [cadence, setCadence] = useState(null);

  // Fetch cadence whenever treatmentName changes
  useEffect(() => {
    if (!treatmentName) {
      setCadence(null);
      setCadenceNote('');
      return;
    }

    let cancelled = false;

    async function fetchCadence() {
      const { data } = await supabase
        .from('treatment_cadence')
        .select('*')
        .eq('treatment_name', treatmentName)
        .maybeSingle();

      if (!cancelled && data) {
        setCadence(data);
        setCadenceNote(data.notes || '');
      } else if (!cancelled) {
        setCadence(null);
        setCadenceNote('');
      }
    }

    fetchCadence();
    return () => { cancelled = true; };
  }, [treatmentName]);

  const nextRecommendedDate =
    cadence?.recommended_weeks_between && dateReceived
      ? addWeeks(dateReceived, cadence.recommended_weeks_between)
      : null;

  const unitLabel = FILLER_TREATMENTS.includes(treatmentName) ? 'Syringes' : 'Units';

  async function handleSubmit(e) {
    e.preventDefault();
    if (!treatmentName || !dateReceived) return;

    setSubmitting(true);
    setError(null);

    const payload = {
      user_id: user.id,
      treatment_name: treatmentName,
      date_received: dateReceived,
      provider_name: providerName || null,
      price_paid: pricePaid !== '' ? Number(pricePaid) : null,
      units_or_syringes: unitsOrSyringes !== '' ? Number(unitsOrSyringes) : null,
      satisfaction_rating: satisfactionRating,
      notes: notes || null,
      next_recommended_date: nextRecommendedDate
        ? nextRecommendedDate.toISOString().slice(0, 10)
        : null,
    };

    try {
      if (editEntry) {
        const { error: updateErr } = await supabase
          .from('treatment_log')
          .update(payload)
          .eq('id', editEntry.id);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from('treatment_log')
          .insert(payload);
        if (insertErr) throw insertErr;
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90dvh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-lg font-semibold text-gray-900">
            {editEntry ? 'Edit Treatment' : 'Log Treatment'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {/* Treatment Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Treatment <span className="text-rose-500">*</span>
            </label>
            <select
              value={treatmentName}
              onChange={(e) => setTreatmentName(e.target.value)}
              required
              className={INPUT_CLASSES}
            >
              <option value="">Select a treatment…</option>
              {TREATMENT_NAMES.map((name) => (
                <option key={name} value={name}>
                  {getProcedureLabel(name, null)}
                </option>
              ))}
            </select>
          </div>

          {/* Date Received */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date Received <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={dateReceived}
              onChange={(e) => setDateReceived(e.target.value)}
              required
              className={INPUT_CLASSES}
            />

            {/* Cadence info box */}
            {cadence && nextRecommendedDate && (
              <div className="mt-2 rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 text-sm">
                <p className="font-medium text-rose-700">
                  Next recommended:{' '}
                  {nextRecommendedDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
                {cadenceNote && (
                  <p className="text-rose-500 text-xs mt-1">{cadenceNote}</p>
                )}
              </div>
            )}
          </div>

          {/* Provider Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Provider Name
            </label>
            <input
              type="text"
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              placeholder="e.g. Dr. Smith"
              className={INPUT_CLASSES}
            />
          </div>

          {/* Price Paid */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price Paid
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                $
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={pricePaid}
                onChange={(e) => setPricePaid(e.target.value)}
                placeholder="0.00"
                className={`${INPUT_CLASSES} pl-8`}
              />
            </div>
          </div>

          {/* Units or Syringes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {unitLabel}
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={unitsOrSyringes}
              onChange={(e) => setUnitsOrSyringes(e.target.value)}
              placeholder={`Number of ${unitLabel.toLowerCase()}`}
              className={INPUT_CLASSES}
            />
          </div>

          {/* Satisfaction Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Satisfaction
            </label>
            <StarRating value={satisfactionRating} onChange={setSatisfactionRating} />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Any details you want to remember…"
              className={INPUT_CLASSES}
            />
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">
              {error}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-rose-accent text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {editEntry ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

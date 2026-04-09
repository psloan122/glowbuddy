import { useState, useEffect } from 'react';
import { Loader2, Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  TREATMENT_NAMES,
  PRICE_UNITS,
  DURATION_OPTIONS,
  calculateTotal,
  generateHeadline,
} from '../lib/placementPricing';
import { createPlacementCheckout } from '../lib/stripe';
import PlacementPricingSelector from './PlacementPricingSelector';
import SpecialPreview from './SpecialPreview';

const INPUT_CLASS =
  'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm';

export default function CreateSpecialForm({ provider, defaultValues, onComplete, onCancel }) {
  const [treatmentName, setTreatmentName] = useState(defaultValues?.treatmentName ?? '');
  const [customTreatment, setCustomTreatment] = useState('');
  const [promoPrice, setPromoPrice] = useState(defaultValues?.promoPrice ?? '');
  const [priceUnit, setPriceUnit] = useState(defaultValues?.priceUnit ?? 'unit');
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [weeks, setWeeks] = useState(1);
  const [tier, setTier] = useState('featured');
  const [notifyAlerts, setNotifyAlerts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const activeTreatment = treatmentName === '__custom' ? customTreatment : treatmentName;
  const total = calculateTotal(tier, weeks);

  // Auto-generate headline when fields change
  useEffect(() => {
    const auto = generateHeadline(activeTreatment, promoPrice, priceUnit);
    if (auto && !headline) {
      setHeadline(auto);
    }
  }, [activeTreatment, promoPrice, priceUnit]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;

    if (!activeTreatment.trim()) {
      setError('Please select a treatment.');
      return;
    }
    if (!promoPrice || Number(promoPrice) <= 0) {
      setError('Please enter a valid price.');
      return;
    }
    if (!headline.trim()) {
      setError('Please enter a headline.');
      return;
    }

    setSubmitting(true);
    setError('');

    const now = new Date();
    const endsAt = new Date(now.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);

    // 1. Create the provider_special
    const { data: special, error: specialErr } = await supabase
      .from('provider_specials')
      .insert({
        provider_id: provider.id,
        treatment_name: activeTreatment.trim(),
        promo_price: Number(promoPrice),
        price_unit: priceUnit,
        headline: headline.trim().slice(0, 60),
        description: description.trim().slice(0, 140) || null,
        starts_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        placement_tier: tier,
        notify_alerts: notifyAlerts,
        is_active: false, // Activated after payment
      })
      .select()
      .single();

    if (specialErr) {
      setError(specialErr.message);
      setSubmitting(false);
      return;
    }

    // 2. Create the placement record
    const { data: placement, error: placementErr } = await supabase
      .from('special_placements')
      .insert({
        special_id: special.id,
        provider_id: provider.id,
        weeks,
        price_paid: total,
        status: 'pending',
      })
      .select()
      .single();

    if (placementErr) {
      setError(placementErr.message);
      setSubmitting(false);
      return;
    }

    // 3. Attempt Stripe checkout
    const checkoutResult = await createPlacementCheckout({
      specialId: special.id,
      placementId: placement.id,
      tier,
      weeks,
    });

    if (checkoutResult?.simulated) {
      // Dev mode: activate directly without Stripe
      const now2 = new Date();
      const expiresAt = new Date(now2.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);

      await supabase
        .from('special_placements')
        .update({
          status: 'active',
          activated_at: now2.toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .eq('id', placement.id);

      await supabase
        .from('provider_specials')
        .update({
          is_active: true,
          starts_at: now2.toISOString(),
          ends_at: expiresAt.toISOString(),
        })
        .eq('id', special.id);

      // Fire-and-forget: fan out SMS to matching price alerts. The
      // Stripe-paid path triggers the same call from the webhook so
      // we only do it here for the simulated/dev mode.
      if (notifyAlerts) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notify-price-alert`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session?.access_token || ''}`,
              },
              body: JSON.stringify({ special_id: special.id }),
            },
          ).catch((err) => {
            // Don't block special creation on a notification failure.
            console.warn('[CreateSpecialForm] notify-price-alert failed:', err);
          });
        } catch (err) {
          console.warn('[CreateSpecialForm] notify-price-alert dispatch failed:', err);
        }
      }

      onComplete?.();
    } else if (checkoutResult?.error) {
      setError(checkoutResult.error);
    }
    // If checkout redirected, page will navigate away

    setSubmitting(false);
  }

  const previewData = {
    treatmentName: activeTreatment,
    promoPrice,
    priceUnit,
    headline,
    description,
    tier,
    weeks,
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Treatment Name */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Treatment
          </label>
          <select
            value={treatmentName}
            onChange={(e) => setTreatmentName(e.target.value)}
            className={INPUT_CLASS}
            required
          >
            <option value="">Select a treatment...</option>
            {TREATMENT_NAMES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
            <option value="__custom">Other (type your own)</option>
          </select>
          {treatmentName === '__custom' && (
            <input
              type="text"
              value={customTreatment}
              onChange={(e) => setCustomTreatment(e.target.value)}
              placeholder="Enter treatment name"
              className={INPUT_CLASS + ' mt-2'}
              required
            />
          )}
        </div>

        {/* Price + Unit */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Promo Price ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={promoPrice}
              onChange={(e) => setPromoPrice(e.target.value)}
              placeholder="10.00"
              className={INPUT_CLASS}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Price Unit
            </label>
            <select
              value={priceUnit}
              onChange={(e) => setPriceUnit(e.target.value)}
              className={INPUT_CLASS}
            >
              {PRICE_UNITS.map((u) => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Headline */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Headline
            <span className="font-normal text-text-secondary ml-1">
              ({headline.length}/60)
            </span>
          </label>
          <input
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value.slice(0, 60))}
            placeholder="e.g. Limited time: $10/unit Botox"
            maxLength={60}
            className={INPUT_CLASS}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Fine Print
            <span className="font-normal text-text-secondary ml-1">
              (optional, {description.length}/140)
            </span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 140))}
            placeholder="e.g. New patients only. Minimum 20 units."
            maxLength={140}
            rows={2}
            className={INPUT_CLASS + ' resize-none'}
          />
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Duration
          </label>
          <div className="flex gap-2">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.weeks}
                type="button"
                onClick={() => setWeeks(opt.weeks)}
                className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition ${
                  weeks === opt.weeks
                    ? 'bg-rose-accent text-white'
                    : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Placement Tier */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-2">
            Placement Tier
          </label>
          <PlacementPricingSelector
            selected={tier}
            weeks={weeks}
            onChange={setTier}
          />
        </div>

        {/* Notify matching price-alert subscribers */}
        <div className="rounded-xl border border-gray-200 bg-rose-50/40 p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyAlerts}
              onChange={(e) => setNotifyAlerts(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-rose-accent cursor-pointer"
            />
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <Bell size={14} className="text-rose-accent" />
                <span className="text-sm font-medium text-text-primary">
                  Text matching patients
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                When this special goes live, Know Before You Glow will SMS verified
                patients in your city whose price alerts match this
                treatment and price. Each patient is texted at most once
                per special and can reply STOP to opt out.
              </p>
            </div>
          </label>
        </div>

        {/* Total + Submit */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-text-secondary">Total</span>
            <span className="text-2xl font-bold text-text-primary">
              ${total.toFixed(2)}
            </span>
          </div>

          {error && (
            <div
              className="px-4 py-3 rounded-xl mb-4 text-sm"
              style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}
            >
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 border border-gray-200 text-text-primary font-medium rounded-xl hover:bg-gray-50 transition text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 text-white font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-50 text-sm inline-flex items-center justify-center gap-2"
              style={{ backgroundColor: '#C94F78' }}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay $${total.toFixed(2)} & Launch`
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Live Preview */}
      <div>
        <p className="text-sm font-medium text-text-secondary mb-3">
          Live Preview
        </p>
        <SpecialPreview
          formData={previewData}
          providerName={provider?.name}
          providerCity={provider?.city}
          providerState={provider?.state}
        />
      </div>
    </div>
  );
}

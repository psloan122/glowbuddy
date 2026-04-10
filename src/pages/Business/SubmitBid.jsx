import { useContext, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, AlertCircle, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { UNIT, COL } from '../../utils/formatPricingUnit';
import { AuthContext } from '../../App';
import { calculateGlowBuddyScore } from '../../lib/glowbuddyScore';
import { notifyPatientOfNewBid } from '../../lib/bidNotifications';

// Provider bid submission form. Reads the bid_request the provider is
// bidding on, plus the provider's own listing for credentials/brand
// inference, then writes a `provider_bids` row with a freshly computed
// glowbuddy_score and fan-outs a notification to the patient.

const NEUROTOXIN_BRANDS = ['Botox', 'Dysport', 'Xeomin', 'Jeuveau', 'Daxxify'];
const FILLER_BRANDS = ['Juvederm', 'Restylane', 'RHA', 'Versa', 'Belotero'];

const ADD_ON_OPTIONS = [
  { key: 'touch_up', label: 'Free 2-week touch-up' },
  { key: 'consultation', label: 'Complimentary consultation' },
  { key: 'arnica', label: 'Arnica gel for bruising' },
  { key: 'loyalty', label: 'New-patient loyalty discount' },
  { key: 'rewards', label: 'Brand rewards enrollment' },
];

const CREDENTIALS = ['RN', 'NP', 'PA', 'MD', 'DO'];
const PRICING_MODES = [
  { key: UNIT.PER_UNIT, label: 'Per unit' },
  { key: 'flat', label: 'Flat total' },
];

function prettifyProcedure(slug) {
  if (!slug) return 'Treatment';
  return slug
    .split('-')
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

function isNeurotoxin(slug) {
  return ['botox', 'dysport', 'xeomin', 'jeuveau', 'daxxify', 'neurotoxin'].some(
    (k) => (slug || '').toLowerCase().includes(k),
  );
}

function isFiller(slug) {
  return ['filler', 'lip', 'cheek', 'jawline', 'nasolabial'].some((k) =>
    (slug || '').toLowerCase().includes(k),
  );
}

export default function SubmitBid() {
  const { requestId } = useParams();
  const { user, openAuthModal } = useContext(AuthContext);
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [provider, setProvider] = useState(null);
  const [providerBrands, setProviderBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [pricingMode, setPricingMode] = useState(UNIT.PER_UNIT);
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [brandOffered, setBrandOffered] = useState('');
  const [selectedDates, setSelectedDates] = useState([]);
  const [timeSlot, setTimeSlot] = useState('flexible');
  const [injectorName, setInjectorName] = useState('');
  const [injectorCreds, setInjectorCreds] = useState('RN');
  const [injectorYears, setInjectorYears] = useState('');
  const [message, setMessage] = useState('');
  const [addOns, setAddOns] = useState([]);

  useEffect(() => {
    document.title = 'Submit a bid | Know Before You Glow for Providers';
  }, []);

  useEffect(() => {
    if (user === null) {
      openAuthModal('login', `/business/bid-requests/${requestId}/bid`);
      return;
    }
    if (!user?.id || !requestId) return;

    async function load() {
      const { data: p } = await supabase
        .from('providers')
        .select('id, name, city, state, lat, lng, google_rating, owner_user_id')
        .eq('owner_user_id', user.id)
        .maybeSingle();

      if (!p) {
        navigate('/business/onboarding');
        return;
      }
      setProvider(p);

      // Load brands the provider already prices, so the dropdown only
      // shows things they actually offer. Falls back to all brands if
      // they have no menu yet.
      const { data: brandRows } = await supabase
        .from('provider_pricing')
        .select('brand')
        .eq('provider_id', p.id)
        .not('brand', 'is', null);

      const distinct = Array.from(
        new Set((brandRows || []).map((r) => r.brand).filter(Boolean)),
      );
      setProviderBrands(distinct);

      const { data: r, error: rErr } = await supabase
        .from('bid_requests')
        .select('*')
        .eq('id', requestId)
        .maybeSingle();

      if (rErr || !r) {
        setError('That bid request no longer exists.');
        setLoading(false);
        return;
      }
      if (r.status !== 'open' || new Date(r.expires_at) < new Date()) {
        setError('This request has already closed.');
      }
      setRequest(r);

      // Sensible defaults from the request
      if (r.brand_preference && r.brand_preference !== 'any') {
        setBrandOffered(
          r.brand_preference.charAt(0).toUpperCase() + r.brand_preference.slice(1),
        );
      }
      setLoading(false);
    }
    load();
  }, [user?.id, requestId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Brand options: union of provider's own + the canonical list (so they
  // can offer something they haven't priced yet).
  const brandOptions = useMemo(() => {
    const universe = isNeurotoxin(request?.procedure_slug)
      ? NEUROTOXIN_BRANDS
      : isFiller(request?.procedure_slug)
        ? FILLER_BRANDS
        : [];
    const merged = Array.from(new Set([...providerBrands, ...universe]));
    return merged.length > 0 ? merged : ['Other'];
  }, [providerBrands, request?.procedure_slug]);

  // Auto-compute total when in per-unit mode
  const computedTotal = useMemo(() => {
    if (pricingMode !== UNIT.PER_UNIT) return null;
    const ppu = Number(pricePerUnit);
    const units = Number(request?.units_needed);
    if (Number.isFinite(ppu) && Number.isFinite(units) && ppu > 0 && units > 0) {
      return Math.round(ppu * units);
    }
    return null;
  }, [pricingMode, pricePerUnit, request?.units_needed]);

  function toggleDate(iso) {
    setSelectedDates((prev) =>
      prev.includes(iso) ? prev.filter((d) => d !== iso) : [...prev, iso],
    );
  }

  function toggleAddOn(key) {
    setAddOns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!provider || !request || error) return;

    // Resolve effective total
    const total =
      pricingMode === UNIT.PER_UNIT ? computedTotal : Number(totalPrice);
    if (!Number.isFinite(total) || total <= 0) {
      setError('Please enter a valid price.');
      return;
    }
    if (selectedDates.length === 0) {
      setError('Please select at least one date you can offer.');
      return;
    }
    if (!injectorName.trim()) {
      setError('Please enter the injector name.');
      return;
    }

    setSubmitting(true);
    setError('');

    const credsString = injectorYears
      ? `${injectorCreds}, ${injectorYears} yrs`
      : injectorCreds;

    const addOnsString = addOns
      .map((k) => ADD_ON_OPTIONS.find((o) => o.key === k)?.label || k)
      .join(', ');

    // Build the bid object before scoring so glowbuddy_score sees the
    // same values that get persisted.
    const bidPayload = {
      request_id: request.id,
      provider_id: provider.id,
      injector_name: injectorName.trim(),
      injector_credentials: credsString,
      brand_offered: brandOffered || null,
      [COL.PRICE_PER_UNIT]:
        pricingMode === UNIT.PER_UNIT && Number(pricePerUnit) > 0
          ? Number(pricePerUnit)
          : null,
      total_price: total,
      available_slots: { dates: selectedDates, time: timeSlot },
      message_to_patient: message.trim() || null,
      add_ons: addOnsString || null,
    };

    const score = calculateGlowBuddyScore(bidPayload, request, provider);
    bidPayload.glowbuddy_score = score;

    const { data: inserted, error: insertErr } = await supabase
      .from('provider_bids')
      .insert(bidPayload)
      .select()
      .single();

    if (insertErr || !inserted) {
      setError(insertErr?.message || 'Could not submit bid. Please try again.');
      setSubmitting(false);
      return;
    }

    // Best-effort notification to the patient — never block on failure.
    notifyPatientOfNewBid(inserted, request).catch(() => {});

    navigate('/business/my-bids', {
      state: { justSubmittedBidId: inserted.id },
    });
  }

  if (user === null || loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#FBF9F7' }}
      >
        <p className="text-text-secondary text-sm">Loading…</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6"
        style={{ background: '#FBF9F7' }}
      >
        <div className="text-center max-w-md">
          <p
            className="mb-3"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: '24px',
              color: '#111',
            }}
          >
            Request not found
          </p>
          <p
            className="text-[13px] mb-6"
            style={{ fontFamily: 'var(--font-body)', color: '#666' }}
          >
            {error || "We couldn't load that bid request."}
          </p>
          <Link
            to="/business/bid-requests"
            className="inline-flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase"
            style={{
              background: '#E8347A',
              color: '#fff',
              letterSpacing: '0.10em',
              borderRadius: '2px',
              fontFamily: 'var(--font-body)',
            }}
          >
            Back to bid requests
          </Link>
        </div>
      </div>
    );
  }

  const procLabel = prettifyProcedure(request.procedure_slug);
  const closed = request.status !== 'open' || new Date(request.expires_at) < new Date();

  return (
    <div className="min-h-screen" style={{ background: '#FBF9F7' }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <Link
          to="/business/bid-requests"
          className="inline-flex items-center gap-1 mb-6 text-[12px]"
          style={{ fontFamily: 'var(--font-body)', color: '#666' }}
        >
          <ArrowLeft size={13} />
          Back to bid requests
        </Link>

        <p
          className="mb-3"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            color: '#888',
          }}
        >
          PROVIDER DASHBOARD · SUBMIT BID
        </p>
        <h1
          className="mb-2"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: '36px',
            lineHeight: 1.1,
            color: '#111',
          }}
        >
          {procLabel}
          {request.units_needed && ` — ${request.units_needed} units`}
        </h1>
        <p
          className="mb-8 text-[13px]"
          style={{ fontFamily: 'var(--font-body)', color: '#666' }}
        >
          Patient in {request.city}, {request.state} · Budget ${request.budget_min}–${request.budget_max}
        </p>

        {/* Patient summary card */}
        <div
          className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-3"
          style={{
            background: '#fff',
            border: '1px solid #EDE8E3',
            borderTop: '3px solid #E8347A',
            borderRadius: '8px',
            padding: '20px',
          }}
        >
          <SummaryRow label="Treatment" value={procLabel} />
          {request.units_needed && (
            <SummaryRow label="Units needed" value={`${request.units_needed} units`} />
          )}
          {request.brand_preference && (
            <SummaryRow
              label="Brand preference"
              value={
                request.brand_preference === 'any'
                  ? 'Open to any'
                  : request.brand_preference.charAt(0).toUpperCase() +
                    request.brand_preference.slice(1)
              }
            />
          )}
          {request.experience_level && (
            <SummaryRow
              label="Experience"
              value={
                request.experience_level === 'experienced'
                  ? 'Experienced patient'
                  : request.experience_level === 'some_experience'
                    ? 'Some experience'
                    : 'First time'
              }
            />
          )}
          {request.treatment_areas && request.treatment_areas.length > 0 && (
            <SummaryRow
              label="Treatment areas"
              value={request.treatment_areas.join(', ')}
            />
          )}
          {request.available_dates && request.available_dates.length > 0 && (
            <SummaryRow
              label="Available"
              value={request.available_dates
                .map((iso) =>
                  new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  }),
                )
                .join(' · ')}
            />
          )}
          {request.patient_notes && (
            <div className="sm:col-span-2 mt-1 pt-3" style={{ borderTop: '1px solid #F0EBE6' }}>
              <p
                className="text-[10px] uppercase mb-1"
                style={{
                  color: '#888',
                  letterSpacing: '0.10em',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Patient note
              </p>
              <p
                className="text-[13px] italic"
                style={{ fontFamily: 'var(--font-display)', color: '#444' }}
              >
                &ldquo;{request.patient_notes}&rdquo;
              </p>
            </div>
          )}
        </div>

        {closed && (
          <div
            className="mb-6 flex items-start gap-2 text-[12px]"
            style={{
              background: '#FCF6EC',
              border: '1px solid #E8D7B0',
              borderRadius: '4px',
              padding: '12px 14px',
              fontFamily: 'var(--font-body)',
              color: '#7A5A1E',
            }}
          >
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>This request is no longer accepting bids.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-8">
          {/* ── Section: Your offer ─────────────────────────────────── */}
          <Section title="Your offer">
            <Field label="Brand offered">
              <select
                value={brandOffered}
                onChange={(e) => setBrandOffered(e.target.value)}
                className="w-full px-3 py-2 text-[13px]"
                style={{
                  background: '#fff',
                  border: '1px solid #E8E8E8',
                  borderRadius: '2px',
                  fontFamily: 'var(--font-body)',
                  color: '#111',
                }}
              >
                <option value="">Select a brand…</option>
                {brandOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Pricing">
              <div className="flex gap-2 mb-3">
                {PRICING_MODES.map((m) => {
                  const active = pricingMode === m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setPricingMode(m.key)}
                      className="px-3 py-2 text-[11px] font-bold uppercase"
                      style={{
                        background: active ? '#111' : '#fff',
                        color: active ? '#fff' : '#444',
                        border: '1px solid #E8E8E8',
                        letterSpacing: '0.10em',
                        borderRadius: '2px',
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>

              {pricingMode === UNIT.PER_UNIT ? (
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <span
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px]"
                      style={{ color: '#888', fontFamily: 'var(--font-body)' }}
                    >
                      $
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={pricePerUnit}
                      onChange={(e) => setPricePerUnit(e.target.value)}
                      placeholder="12"
                      className="w-full pl-7 pr-3 py-2 text-[13px]"
                      style={{
                        background: '#fff',
                        border: '1px solid #E8E8E8',
                        borderRadius: '2px',
                        fontFamily: 'var(--font-body)',
                        color: '#111',
                      }}
                    />
                  </div>
                  <span
                    className="text-[12px]"
                    style={{ color: '#666', fontFamily: 'var(--font-body)' }}
                  >
                    / unit
                  </span>
                  {computedTotal != null && (
                    <span
                      className="text-[13px] font-semibold"
                      style={{ color: '#111', fontFamily: 'var(--font-body)' }}
                    >
                      = ${computedTotal} total
                    </span>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <span
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px]"
                    style={{ color: '#888', fontFamily: 'var(--font-body)' }}
                  >
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={totalPrice}
                    onChange={(e) => setTotalPrice(e.target.value)}
                    placeholder="450"
                    className="w-full pl-7 pr-3 py-2 text-[13px]"
                    style={{
                      background: '#fff',
                      border: '1px solid #E8E8E8',
                      borderRadius: '2px',
                      fontFamily: 'var(--font-body)',
                      color: '#111',
                    }}
                  />
                </div>
              )}
            </Field>

            <Field label="Available time slots">
              <p
                className="text-[11px] mb-2"
                style={{ color: '#888', fontFamily: 'var(--font-body)' }}
              >
                Pick from the dates the patient is available
              </p>
              {request.available_dates && request.available_dates.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-3">
                  {request.available_dates.map((iso) => {
                    const active = selectedDates.includes(iso);
                    return (
                      <button
                        key={iso}
                        type="button"
                        onClick={() => toggleDate(iso)}
                        className="px-3 py-2 text-[11px] font-semibold"
                        style={{
                          background: active ? '#E8347A' : '#fff',
                          color: active ? '#fff' : '#444',
                          border: `1px solid ${active ? '#E8347A' : '#E8E8E8'}`,
                          borderRadius: '2px',
                          fontFamily: 'var(--font-body)',
                        }}
                      >
                        {new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p
                  className="text-[12px] italic mb-3"
                  style={{ color: '#888', fontFamily: 'var(--font-body)' }}
                >
                  Patient didn&rsquo;t list specific dates — pick a time-of-day below.
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'morning', label: 'Mornings' },
                  { key: 'afternoon', label: 'Afternoons' },
                  { key: 'evening', label: 'Evenings' },
                  { key: 'flexible', label: 'Flexible' },
                ].map((t) => {
                  const active = timeSlot === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setTimeSlot(t.key)}
                      className="px-3 py-2 text-[11px] font-semibold uppercase"
                      style={{
                        background: active ? '#111' : '#fff',
                        color: active ? '#fff' : '#444',
                        border: '1px solid #E8E8E8',
                        letterSpacing: '0.08em',
                        borderRadius: '2px',
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </Field>
          </Section>

          {/* ── Section: Your team ──────────────────────────────────── */}
          <Section title="Your team">
            <Field label="Injector name">
              <input
                type="text"
                value={injectorName}
                onChange={(e) => setInjectorName(e.target.value)}
                placeholder="Dr. Sarah Patel"
                className="w-full px-3 py-2 text-[13px]"
                style={{
                  background: '#fff',
                  border: '1px solid #E8E8E8',
                  borderRadius: '2px',
                  fontFamily: 'var(--font-body)',
                  color: '#111',
                }}
              />
            </Field>

            <Field label="Credentials">
              <div className="flex flex-wrap gap-2">
                {CREDENTIALS.map((c) => {
                  const active = injectorCreds === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setInjectorCreds(c)}
                      className="px-3 py-2 text-[11px] font-bold uppercase"
                      style={{
                        background: active ? '#111' : '#fff',
                        color: active ? '#fff' : '#444',
                        border: '1px solid #E8E8E8',
                        letterSpacing: '0.10em',
                        borderRadius: '2px',
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Years of experience">
              <input
                type="number"
                min="0"
                max="60"
                value={injectorYears}
                onChange={(e) => setInjectorYears(e.target.value)}
                placeholder="8"
                className="w-32 px-3 py-2 text-[13px]"
                style={{
                  background: '#fff',
                  border: '1px solid #E8E8E8',
                  borderRadius: '2px',
                  fontFamily: 'var(--font-body)',
                  color: '#111',
                }}
              />
            </Field>
          </Section>

          {/* ── Section: Your message ──────────────────────────────── */}
          <Section title="Your message to the patient">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 200))}
              placeholder="Hi! I&rsquo;ve been injecting for 8 years and would love to take care of you. I noticed you mentioned…"
              rows={5}
              className="w-full px-3 py-3 text-[13px]"
              style={{
                background: '#fff',
                border: '1px solid #E8E8E8',
                borderRadius: '2px',
                fontFamily: 'var(--font-body)',
                color: '#111',
                resize: 'vertical',
              }}
            />
            <p
              className="mt-2 text-right text-[11px]"
              style={{ color: '#888', fontFamily: 'var(--font-body)' }}
            >
              {message.length} / 200
            </p>
          </Section>

          {/* ── Section: Add-ons ───────────────────────────────────── */}
          <Section title="Add something extra (optional)">
            <p
              className="text-[12px] mb-3"
              style={{ color: '#666', fontFamily: 'var(--font-body)' }}
            >
              Sweeten the offer. Patients see these as part of your bid.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ADD_ON_OPTIONS.map((opt) => {
                const active = addOns.includes(opt.key);
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => toggleAddOn(opt.key)}
                    className="flex items-center gap-2 px-3 py-2 text-left text-[12px]"
                    style={{
                      background: active ? '#FCEEF3' : '#fff',
                      color: active ? '#9E1F58' : '#444',
                      border: `1px solid ${active ? '#E8347A' : '#E8E8E8'}`,
                      borderRadius: '2px',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    <span
                      className="inline-flex items-center justify-center"
                      style={{
                        width: '16px',
                        height: '16px',
                        background: active ? '#E8347A' : '#fff',
                        border: `1px solid ${active ? '#E8347A' : '#D8D8D8'}`,
                        borderRadius: '2px',
                        flexShrink: 0,
                      }}
                    >
                      {active && <Check size={10} color="#fff" strokeWidth={3} />}
                    </span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* ── Lead fee disclosure ─────────────────────────────────── */}
          <div
            style={{
              background: '#FCF6EC',
              border: '1px solid #E8D7B0',
              borderLeft: '3px solid #D98F2B',
              borderRadius: '4px',
              padding: '14px 16px',
            }}
          >
            <p
              className="mb-1 text-[12px]"
              style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                color: '#7A5A1E',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Lead fee disclosure
            </p>
            <p
              className="text-[12px]"
              style={{ fontFamily: 'var(--font-body)', color: '#7A5A1E', lineHeight: 1.5 }}
            >
              Know Before You Glow charges a flat <strong>$35 lead fee</strong> only if this patient
              accepts your bid. Submitting a bid is free. We never charge for bids that
              don&rsquo;t convert.
            </p>
          </div>

          {error && (
            <div
              className="flex items-start gap-2 text-[12px]"
              style={{
                background: '#FDECEC',
                border: '1px solid #F0B2B2',
                borderRadius: '4px',
                padding: '12px 14px',
                fontFamily: 'var(--font-body)',
                color: '#9E1F1F',
              }}
            >
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || closed}
            className="px-6 py-3 font-bold uppercase text-[12px]"
            style={{
              background: submitting || closed ? '#C8C2BC' : '#E8347A',
              color: '#fff',
              letterSpacing: '0.10em',
              borderRadius: '2px',
              fontFamily: 'var(--font-body)',
              cursor: submitting || closed ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Submitting…' : 'Submit bid'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #EDE8E3',
        borderTop: '3px solid #111',
        borderRadius: '8px',
        padding: '24px',
      }}
    >
      <h2
        className="mb-5"
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          fontSize: '20px',
          color: '#111',
        }}
      >
        {title}
      </h2>
      <div className="flex flex-col gap-5">{children}</div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label
        className="block mb-2 text-[10px] uppercase"
        style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 700,
          letterSpacing: '0.10em',
          color: '#666',
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div>
      <p
        className="text-[10px] uppercase mb-1"
        style={{
          color: '#888',
          letterSpacing: '0.10em',
          fontFamily: 'var(--font-body)',
        }}
      >
        {label}
      </p>
      <p
        className="text-[13px]"
        style={{ fontFamily: 'var(--font-body)', color: '#111', fontWeight: 600 }}
      >
        {value}
      </p>
    </div>
  );
}

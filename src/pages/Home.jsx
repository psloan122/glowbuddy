import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Star, TrendingDown, Calculator, Calendar, Layers, ArrowRight, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getCity as getGatingCity, getState as getGatingState } from '../lib/gating';
import FounderStory from '../components/FounderStory';
import DarkPriceCard from '../components/DarkPriceCard';
import SpecialCard from '../components/SpecialCard';
import SpecialOfferCard from '../components/SpecialOfferCard';
import { setPageMeta } from '../lib/seo';
import { AuthContext } from '../App';
import { buildBrowseUrl, parseSearchQuery, parseProcedureFromText } from '../lib/urlParams';
import { getProcedureLabel } from '../lib/procedureLabel';

// ── Placeholder testimonials ──
const PLACEHOLDER_TESTIMONIALS = [
  {
    name: 'Sarah M.',
    city: 'Austin, TX',
    treatment: 'Botox',
    quote: 'I was quoted $14/unit at one place and found $11/unit down the street on Know Before You Glow. Saved over $90 on my forehead alone.',
    savings: '$90',
  },
  {
    name: 'Jessica L.',
    city: 'Nashville, TN',
    treatment: 'Lip Filler',
    quote: 'I always felt like I was overpaying but had no way to compare. Now I check Know Before You Glow before every appointment.',
    savings: '$200',
  },
  {
    name: 'Amanda R.',
    city: 'Denver, CO',
    treatment: 'Microneedling',
    quote: 'Found a receipt-verified provider charging $100 less than my usual place for the exact same RF microneedling treatment.',
    savings: '$100',
  },
];

// Procedure pills shown in hero (editorial pink).
// `slug` MUST be a valid PROCEDURE_PILLS slug from constants.js so the
// /browse page actually filters instead of dropping through to the gate.
// `brand` is optional — when set, the browse page applies an additional
// provider_pricing.brand filter so only that brand's prices show.
//
// Each neurotoxin brand is a separate pill so users can compare across
// Botox / Dysport / Xeomin / Jeuveau / Daxxify without ever seeing them
// blended into a single bucket.
const HERO_PROCS = [
  { label: 'Botox', slug: 'neurotoxin', brand: 'Botox' },
  { label: 'Dysport', slug: 'neurotoxin', brand: 'Dysport' },
  { label: 'Xeomin', slug: 'neurotoxin', brand: 'Xeomin' },
  { label: 'Jeuveau', slug: 'neurotoxin', brand: 'Jeuveau' },
  { label: 'Daxxify', slug: 'neurotoxin', brand: 'Daxxify' },
  { label: 'Fillers', slug: 'filler' },
  { label: 'Laser', slug: 'laser' },
  { label: 'GLP-1', slug: 'weight-loss' },
];

// Sample featured prices for hero right column (cream bg, dark cards)
const HERO_FEATURED = [
  {
    procedureLabel: 'Botox / Per Unit',
    price: 11,
    unit: '/unit',
    brand: 'Botox',
    vsAvg: { type: 'below', label: '15% below avg' },
    source: 'patient',
    providerName: 'Glow Med Spa',
    providerCity: 'Austin',
    providerState: 'TX',
  },
  {
    procedureLabel: 'Lip Filler / Per Syringe',
    price: 680,
    unit: '/syringe',
    brand: 'Juvederm',
    vsAvg: { type: 'below', label: '8% below avg' },
    source: 'website',
    providerName: 'Luxe Aesthetics',
    providerCity: 'Nashville',
    providerState: 'TN',
  },
  {
    procedureLabel: 'RF Microneedling',
    price: 350,
    unit: '/session',
    vsAvg: { type: 'at', label: 'at average' },
    source: 'patient',
    providerName: 'Radiant Skin Co.',
    providerCity: 'Denver',
    providerState: 'CO',
  },
];

// ── CountUpNumber ──
// Animates from 0 → target over 800ms with an ease-out cubic. Handles
// both raw numbers (`1234` → "1,234") and pre-formatted strings like
// "$185" by extracting the numeric portion and re-applying the prefix.
// An optional `prefix` prop (e.g. "$") is prepended to the comma-
// separated output path so Glow Fund totals render as "$1,234".
// Respects prefers-reduced-motion (skips straight to the final value).
function CountUpNumber({ value, formatted, prefix: currencyPrefix = '' }) {
  const initial = formatted ? (typeof value === 'string' ? value : String(value)) : '0';
  const [display, setDisplay] = useState(currencyPrefix ? `${currencyPrefix}0` : initial);

  useEffect(() => {
    let prefix = '';
    let suffix = '';
    let target;

    if (formatted && typeof value === 'string') {
      const match = value.match(/^(\D*)(\d+(?:\.\d+)?)(\D*)$/);
      if (!match) {
        setDisplay(value);
        return;
      }
      prefix = match[1];
      target = parseFloat(match[2]);
      suffix = match[3];
    } else {
      target = Number(value) || 0;
    }

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced || target === 0) {
      if (formatted) {
        setDisplay(`${prefix}${Math.round(target)}${suffix}`);
      } else {
        setDisplay(`${currencyPrefix}${target.toLocaleString()}`);
      }
      return;
    }

    const startTime = performance.now();
    const duration = 800;
    let raf;
    const tick = (now) => {
      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(target * eased);
      if (formatted) {
        setDisplay(`${prefix}${current}${suffix}`);
      } else {
        setDisplay(`${currencyPrefix}${current.toLocaleString()}`);
      }
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => raf && cancelAnimationFrame(raf);
  }, [value, formatted, currencyPrefix]);

  return display;
}

export default function Home() {
  const { user, openAuthModal } = useContext(AuthContext);
  const navigate = useNavigate();

  // Live stats — only show non-zero values
  const [statItems, setStatItems] = useState([]);
  const [patientCount, setPatientCount] = useState(null);
  const [providerCountTotal, setProviderCountTotal] = useState(null);

  // Specials
  const [specials, setSpecials] = useState([]);
  const [promotedSpecials, setPromotedSpecials] = useState([]);

  // User's saved location
  const savedCity = getGatingCity();
  const savedState = getGatingState();

  // Hero search bar queries — split into location + treatment
  const [locationQuery, setLocationQuery] = useState('');
  const [treatmentQuery, setTreatmentQuery] = useState('');

  // "Find Prices" CTA banner (logged-in only, dismissable per session)
  const [findPricesDismissed, setFindPricesDismissed] = useState(
    () => sessionStorage.getItem('gb_find_prices_dismissed') === 'true'
  );

  // Triggered price alerts (logged-in only)
  const [alertTrigger, setAlertTrigger] = useState(null); // single best trigger
  const [triggerCount, setTriggerCount] = useState(0);
  const [alertDismissed, setAlertDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Check if user already dismissed this session's banner
    const dismissedAt = localStorage.getItem('gb_home_alert_dismissed');
    if (dismissedAt) {
      // Don't show again if dismissed less than 24 hours ago
      const elapsed = Date.now() - Number(dismissedAt);
      if (elapsed < 24 * 60 * 60 * 1000) {
        setAlertDismissed(true);
        return;
      }
    }

    supabase
      .from('price_alert_triggers')
      .select('*, price_alerts!inner(user_id, procedure_type, brand, city, state, max_price)')
      .eq('price_alerts.user_id', user.id)
      .eq('was_read', false)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        setTriggerCount(data.length);
        const first = data[0];
        setAlertTrigger({
          procedureType: first.price_alerts?.procedure_type,
          brand: first.price_alerts?.brand,
          city: first.price_alerts?.city,
          price: first.triggered_price,
          unit: first.triggered_unit,
        });
      });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function dismissAlertBanner() {
    setAlertDismissed(true);
    localStorage.setItem('gb_home_alert_dismissed', String(Date.now()));
  }

  // Parse the two search inputs into structured /browse params.
  // Location input → city/state, treatment input → procedure/brand.
  // Falls back to saved city when location input is empty.
  function handleSearch(e) {
    if (e) e.preventDefault();
    // Parse location
    const locText = (locationQuery || '').trim();
    let city = '', state = '';
    if (locText) {
      const parsed = parseSearchQuery(locText);
      city = parsed.city;
      state = parsed.state;
    }
    if (!city && savedCity) city = savedCity;
    if (!state && savedState) state = savedState;
    // Parse treatment
    const treatText = (treatmentQuery || '').trim();
    const match = treatText ? parseProcedureFromText(treatText) : null;
    const procedure = match?.slug || null;
    const brand = match?.brand || null;
    navigate(buildBrowseUrl({ city, state, procedure, brand }));
  }

  // SEO
  useEffect(() => {
    setPageMeta({
      title: 'Know Before You Glow \u2014 Know Before You Glow',
      description: 'Real prices for Botox, lip filler, and med spa treatments reported by patients. See what people actually paid near you.',
      canonical: 'https://knowbeforeyouglow.com/',
    });
  }, []);

  // Fetch live stats — 4 queries, only show non-zero results
  useEffect(() => {
    async function load() {
      const results = [];

      // Total submissions
      const { count: totalPrices } = await supabase
        .from('procedures')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      if (totalPrices > 0) {
        results.push({ value: totalPrices, label: 'Real prices shared' });
        setPatientCount(totalPrices);
      }

      // Cities covered
      const { data: cityRows } = await supabase
        .from('procedures')
        .select('city')
        .eq('status', 'active')
        .not('city', 'is', null);
      const uniqueCities = new Set();
      for (const row of cityRows || []) {
        if (row.city) uniqueCities.add(row.city);
      }
      if (uniqueCities.size > 0) {
        results.push({ value: uniqueCities.size, label: 'Cities covered' });
      }

      // Avg Botox per unit
      const { data: botoxRows } = await supabase
        .from('procedures')
        .select('price_paid')
        .eq('status', 'active')
        .ilike('procedure_type', '%botox%')
        .eq('unit', 'per unit');
      if (botoxRows && botoxRows.length >= 3) {
        const avg = botoxRows.reduce((sum, r) => sum + r.price_paid, 0) / botoxRows.length;
        if (avg > 0) {
          results.push({ value: `$${avg.toFixed(0)}`, label: 'Avg Botox per unit', isFormatted: true });
        }
      }

      // Providers mapped
      const { count: providerCount } = await supabase
        .from('providers')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .not('lat', 'is', null);
      if (providerCount > 0) {
        results.push({ value: providerCount, label: 'Providers mapped' });
        setProviderCountTotal(providerCount);
      }

      // The Glow Fund — always included, even at $0, because the whole
      // point of the homepage counter is to declare the commitment from
      // day one. Links to /glow-fund and renders in hot-pink ink.
      const { data: glowFundRow } = await supabase
        .from('glow_fund')
        .select('total_donated')
        .limit(1)
        .maybeSingle();
      const glowFundTotal = Math.floor(Number(glowFundRow?.total_donated) || 0);
      results.push({
        value: glowFundTotal,
        label: 'Donated to The Glow Fund',
        prefix: '$',
        color: '#E8347A',
        to: '/glow-fund',
      });

      setStatItems(results);
    }
    load();
  }, []);

  // Fetch specials
  useEffect(() => {
    supabase
      .from('specials')
      .select('*, providers(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => setSpecials(data || []));
  }, []);

  useEffect(() => {
    supabase
      .from('provider_specials')
      .select('*, providers(*)')
      .eq('is_active', true)
      .gt('ends_at', new Date().toISOString())
      .order('placement_tier', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => setPromotedSpecials(data || []));
  }, []);

  // Filter specials by user location
  const specialsState = savedState;
  const filteredSpecials = specialsState
    ? specials.filter((s) => s.providers?.state === specialsState)
    : [];
  const displaySpecials = filteredSpecials.length > 0 ? filteredSpecials : specials;
  const filteredPromoted = specialsState
    ? promotedSpecials.filter((s) => s.providers?.state === specialsState)
    : [];
  const displayPromoted = filteredPromoted.length > 0 ? filteredPromoted : promotedSpecials;

  return (
    <div className="bg-cream page-enter">
      {/* ═══════════════════════════════════════════════════════
          0. EDITORIAL EYEBROW STRIP — hot pink declaration bar
          ═══════════════════════════════════════════════════════ */}
      <div className="editorial-eyebrow-strip">
        Price transparency for injectables &middot; Backed by real patient data
      </div>

      {/* ═══════════════════════════════════════════════════════
          0B. FIND PRICES BANNER — logged-in users, dismissable
          ═══════════════════════════════════════════════════════ */}
      {user && !findPricesDismissed && (
        <div
          className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3"
          style={{ background: '#FFF7F9', borderBottom: '0.5px solid #F5D0DC' }}
        >
          <Link
            to={buildBrowseUrl({
              city: savedCity || undefined,
              state: savedState || undefined,
            })}
            className="text-[13px] font-medium"
            style={{ color: '#C8005A' }}
          >
            Ready to find prices? &rarr; Browse prices{savedCity ? ` in ${savedCity}` : ' in your city'}
          </Link>
          <button
            onClick={() => {
              setFindPricesDismissed(true);
              sessionStorage.setItem('gb_find_prices_dismissed', 'true');
            }}
            className="shrink-0 p-1 text-text-secondary/60 hover:text-ink transition-colors"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          1. HERO — full-bleed cream, editorial LEFT-ALIGNED
          ═══════════════════════════════════════════════════════ */}
      <section
        className="bg-cream"
        style={{ borderBottom: '3px solid #E8347A' }}
      >
        <div
          className="pt-16 md:pt-24 pb-14 md:pb-20 text-left"
          style={{
            maxWidth: '720px',
            paddingLeft: 'clamp(24px, 10vw, 160px)',
            paddingRight: '24px',
          }}
        >
          {/* Kicker */}
          <p
            className="text-[11px] font-semibold uppercase text-hot-pink mb-6"
            style={{ letterSpacing: '0.20em' }}
          >
            The Price Report
          </p>

          {/* Massive headline — Playfair 900, ALL CAPS, pink italic GLOW */}
          <h1
            className="font-display text-ink mb-5"
            style={{
              fontWeight: 900,
              fontSize: 'clamp(36px, 10vw, 120px)',
              lineHeight: 0.92,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
            }}
          >
            KNOW BEFORE<br />
            YOU <span className="italic text-hot-pink" style={{ textTransform: 'none' }}>Glow.</span>
          </h1>

          {/* Tagline — warm taupe, single line aspirational */}
          <p
            className="font-display italic mb-4"
            style={{
              color: '#B8A89A',
              fontSize: '20px',
              fontWeight: 400,
              lineHeight: 1.3,
            }}
          >
            Real prices. Real patients. Real receipts.
          </p>

          {/* Subhead — one short line, the headline does the heavy lifting */}
          <p
            className="mb-9"
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 300,
              fontSize: '16px',
              color: '#888',
              lineHeight: 1.5,
              maxWidth: '520px',
            }}
          >
            {user ? 'Welcome back — search what people in your city actually paid.' : 'Search what people in your city actually paid.'}
          </p>

          {/* Search bar — two distinct inputs: location + treatment */}
          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-2 w-full sm:max-w-[600px] mb-7"
          >
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Location input */}
              <div
                className="flex-1 flex items-center gap-2 bg-white px-4 py-3.5"
                style={{ borderRadius: '2px', border: '1px solid #EDE8E3' }}
              >
                <span className="shrink-0 text-text-secondary" style={{ fontSize: 15 }} aria-hidden="true">&#x1F4CD;</span>
                <input
                  type="text"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder={savedCity ? `${savedCity}, ${savedState}` : 'City or area...'}
                  className="flex-1 bg-transparent outline-none text-[13px] text-ink placeholder:text-text-secondary"
                  style={{ fontSize: '16px' }}
                />
              </div>
              {/* Treatment input */}
              <div
                className="flex-1 flex items-center gap-2 bg-white px-4 py-3.5"
                style={{ borderRadius: '2px', border: '1px solid #EDE8E3' }}
              >
                <Search size={15} className="shrink-0 text-text-secondary" />
                <input
                  type="text"
                  value={treatmentQuery}
                  onChange={(e) => setTreatmentQuery(e.target.value)}
                  placeholder="Botox, filler, laser..."
                  className="flex-1 bg-transparent outline-none text-[13px] text-ink placeholder:text-text-secondary"
                  style={{ fontSize: '16px' }}
                />
              </div>
            </div>
            <button type="submit" className="btn-editorial btn-editorial-primary w-full sm:w-auto sm:self-start">
              Find Prices
            </button>
          </form>

          {/* Triggered price alert banner (logged-in, unread triggers) */}
          {user && alertTrigger && !alertDismissed && (
            <div
              className="flex items-center gap-2.5 max-w-xl mb-5 px-3.5 py-2.5"
              style={{
                background: '#FFF7F9',
                border: '1px solid #F5D0DC',
                borderRadius: '2px',
              }}
            >
              <span className="shrink-0 text-[15px]" aria-hidden="true">&#128276;</span>
              <p className="flex-1 text-[13px] text-ink leading-snug">
                <span className="font-medium">
                  {triggerCount} price alert{triggerCount !== 1 ? 's' : ''} matched
                </span>
                {' — '}
                {getProcedureLabel(alertTrigger.procedureType, alertTrigger.brand)}
                {alertTrigger.price != null && (
                  <>
                    {' at '}
                    <span className="font-semibold">
                      ${Number(alertTrigger.price).toLocaleString()}
                      {alertTrigger.unit ? `/${alertTrigger.unit}` : ''}
                    </span>
                  </>
                )}
                {alertTrigger.city && ` in ${alertTrigger.city}`}
              </p>
              <Link
                to="/alerts"
                className="shrink-0 text-[11px] font-semibold uppercase text-hot-pink hover:text-hot-pink-dark transition-colors"
                style={{ letterSpacing: '0.06em' }}
              >
                View &rarr;
              </Link>
              <button
                onClick={dismissAlertBanner}
                className="shrink-0 text-text-secondary/60 hover:text-ink transition-colors p-0.5"
                aria-label="Dismiss alert banner"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Procedure pills — left-aligned. Each pill maps to a real
              PROCEDURE_PILLS slug via buildBrowseUrl, and carries the
              user's saved city forward when present. */}
          <div className="flex md:flex-wrap items-center justify-start gap-1.5 mb-5 overflow-x-auto md:overflow-visible pb-2 md:pb-0 -mx-1 px-1" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            {HERO_PROCS.map((proc) => (
              <Link
                key={proc.label}
                to={buildBrowseUrl({
                  city: savedCity || undefined,
                  state: savedState || undefined,
                  procedure: proc.slug,
                  brand: proc.brand,
                })}
                className="proc-pill proc-pill-inactive-light shrink-0"
              >
                {proc.label}
              </Link>
            ))}
          </div>

          {/* Bid request CTA — waitlist gate while the feature ships */}
          <div className="mb-5">
            <Link
              to="/request-bid"
              className="inline-flex items-center gap-2 text-[12px]"
              style={{
                fontFamily: 'var(--font-body)',
                color: '#666',
                fontWeight: 500,
                letterSpacing: '0.02em',
              }}
            >
              Providers bidding for your appointment — coming soon.
              <span
                style={{
                  background: '#E8347A',
                  color: '#fff',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 700,
                  fontSize: '9px',
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  padding: '3px 7px',
                  borderRadius: '2px',
                }}
              >
                Waitlist Open
              </span>
            </Link>
          </div>

          {/* Recency / data freshness label */}
          {(providerCountTotal || patientCount) && (
            <p
              className="font-light"
              style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 400,
                fontSize: '11px',
                color: '#999',
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
              }}
            >
              Updated today
              {providerCountTotal && ` · ${providerCountTotal.toLocaleString()} providers mapped`}
              {patientCount && ` · ${patientCount.toLocaleString()} patient prices shared`}
            </p>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          1B. HOT-PINK FEATURE SECTION — full bleed, pink IS the drama
          ═══════════════════════════════════════════════════════ */}
      <section style={{ background: '#E8347A' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-16 items-center">
            {/* LEFT — text + CTA */}
            <div>
              <p
                className="text-[11px] font-semibold uppercase mb-5"
                style={{ letterSpacing: '0.20em', color: '#FBE4ED' }}
              >
                Today's Featured Prices
              </p>
              <h2
                className="font-display text-white mb-4"
                style={{
                  fontWeight: 900,
                  fontSize: 'clamp(36px, 5.5vw, 64px)',
                  lineHeight: 0.98,
                  letterSpacing: '-0.015em',
                }}
              >
                What patients<br />
                actually paid<br />
                <span className="italic">this week.</span>
              </h2>
              <p
                className="font-body font-light mb-8 max-w-md"
                style={{ color: 'rgba(255,255,255,0.85)', fontSize: '15px', lineHeight: 1.6 }}
              >
                No consultations. No "starting at." Just receipts from real patients
                in real chairs at real providers. The price report nobody else publishes.
              </p>
              <Link
                to={buildBrowseUrl({
                  city: savedCity || undefined,
                  state: savedState || undefined,
                })}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-hot-pink font-semibold uppercase transition hover:bg-cream"
                style={{
                  fontSize: '11px',
                  letterSpacing: '0.14em',
                  borderRadius: '2px',
                  fontFamily: 'var(--font-body)',
                }}
              >
                See all prices <ArrowRight size={12} />
              </Link>
            </div>

            {/* RIGHT — 3 pink-section price cards */}
            <div className="space-y-3">
              {HERO_FEATURED.map((card, i) => (
                <DarkPriceCard key={i} {...card} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          2. BIG NUMBERS BAR — editorial stats
          ═══════════════════════════════════════════════════════ */}
      {statItems.length > 0 && (
        <section className="bg-white" style={{ borderTop: '1px solid #E8E8E8', borderBottom: '1px solid #E8E8E8' }}>
          <div className="max-w-5xl mx-auto px-4 py-10 overflow-x-auto" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            <div
              className="flex md:grid gap-0"
              style={{ gridTemplateColumns: `repeat(${statItems.length}, 1fr)` }}
            >
              {statItems.map((item, i) => {
                const cellStyle = {
                  borderRight: i < statItems.length - 1 ? '1px solid #E8E8E8' : 'none',
                };
                const body = (
                  <>
                    <p
                      className="font-display"
                      style={{
                        fontWeight: 900,
                        fontSize: 'clamp(32px, 5vw, 56px)',
                        lineHeight: 1,
                        color: item.color || '#111',
                      }}
                    >
                      <CountUpNumber
                        value={item.value}
                        formatted={item.isFormatted}
                        prefix={item.prefix}
                      />
                    </p>
                    <p
                      className="text-[10px] font-semibold uppercase text-text-secondary mt-3"
                      style={{ letterSpacing: '0.12em' }}
                    >
                      {item.label}
                    </p>
                  </>
                );
                return item.to ? (
                  <Link
                    key={i}
                    to={item.to}
                    className="px-4 text-center block transition-opacity hover:opacity-80 shrink-0 min-w-[120px]"
                    style={cellStyle}
                  >
                    {body}
                  </Link>
                ) : (
                  <div key={i} className="px-4 text-center shrink-0 min-w-[120px]" style={cellStyle}>
                    {body}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          3. HOW IT WORKS — editorial
          ═══════════════════════════════════════════════════════ */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <p className="editorial-kicker text-center mb-3">The Method</p>
        <h2 className="editorial-headline text-center mb-2">How it works.</h2>
        <p className="editorial-deck text-center max-w-xl mx-auto mb-12">
          Three steps. No fluff. No hidden menus.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-y border-ink">
          {[
            {
              num: '01',
              title: 'Someone gets a treatment',
              body: 'A patient visits a med spa and gets Botox, filler, or another treatment near you.',
            },
            {
              num: '02',
              title: 'They share what they paid',
              body: 'They log the real price on Know Before You Glow — anonymously and in seconds.',
            },
            {
              num: '03',
              title: 'You know before you book',
              body: 'See real prices in your city so you never overpay again.',
            },
          ].map((step, i, arr) => (
            <div
              key={i}
              className="p-6 md:p-8 border-b md:border-b-0 border-[#E8E8E8] last:border-b-0"
              style={{
                borderRight: i < arr.length - 1 ? '1px solid #E8E8E8' : 'none',
              }}
            >
              <p
                className="font-display text-hot-pink mb-3"
                style={{ fontWeight: 900, fontSize: '42px', lineHeight: 1 }}
              >
                {step.num}
              </p>
              <p
                className="text-[10px] font-semibold uppercase text-ink mb-2"
                style={{ letterSpacing: '0.12em' }}
              >
                {step.title}
              </p>
              <p className="text-[13px] text-text-secondary leading-relaxed font-light">
                {step.body}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link to="/log" className="btn-editorial btn-editorial-primary">
            Share what you paid
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          4. FOUNDER STORY — trust
          ═══════════════════════════════════════════════════════ */}
      <section className="max-w-3xl mx-auto px-4 pb-12">
        <FounderStory />
      </section>

      {/* ═══════════════════════════════════════════════════════
          5. TESTIMONIALS — editorial
          ═══════════════════════════════════════════════════════ */}
      <section className="bg-white py-16" style={{ borderTop: '1px solid #E8E8E8', borderBottom: '1px solid #E8E8E8' }}>
        <div className="max-w-5xl mx-auto px-4">
          <p className="editorial-kicker text-center mb-3">The Chorus</p>
          <h2 className="editorial-headline text-center mb-10">
            What <span className="italic text-hot-pink">patients</span> are saying.
          </h2>
          <div className="flex md:grid md:grid-cols-3 gap-3 overflow-x-auto md:overflow-visible snap-x snap-mandatory pb-2 md:pb-0 -mx-4 px-4 md:mx-0 md:px-0" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
            {PLACEHOLDER_TESTIMONIALS.map((t, i) => (
              <div key={i} className="glow-card p-5 snap-start shrink-0 w-[85vw] sm:w-[320px] md:w-auto">
                <div className="flex items-center gap-0.5 mb-3">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={12} className="text-hot-pink fill-hot-pink" />
                  ))}
                </div>
                <p className="font-display italic text-[15px] text-ink leading-snug mb-4">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #E8E8E8' }}>
                  <div>
                    <p className="text-[11px] font-semibold uppercase text-ink" style={{ letterSpacing: '0.08em' }}>
                      {t.name}
                    </p>
                    <p className="text-[10px] text-text-secondary font-light mt-0.5">{t.city}</p>
                  </div>
                  <span
                    className="text-[10px] font-semibold uppercase px-2 py-0.5"
                    style={{
                      letterSpacing: '0.06em',
                      borderRadius: '4px',
                      background: '#F0FAF5',
                      color: '#1A7A3A',
                      border: '1px solid #1A7A3A',
                    }}
                  >
                    Saved {t.savings}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-6">
            <p className="text-[10px] text-text-secondary/60 font-light uppercase mb-2" style={{ letterSpacing: '0.06em' }}>
              Based on community-reported savings. Individual results vary.
            </p>
            <a
              href="mailto:hello@knowbeforeyouglow.com?subject=My Know Before You Glow Story"
              className="text-[10px] font-semibold uppercase text-hot-pink hover:text-hot-pink-dark transition-colors"
              style={{ letterSpacing: '0.10em' }}
            >
              Share your story &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          6. MAP CTA — stylized mockup
          ═══════════════════════════════════════════════════════ */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <p className="editorial-kicker text-center mb-3">Near You</p>
          <h2 className="editorial-headline text-center mb-10">Find providers near you.</h2>
          <div className="overflow-hidden" style={{ border: '1px solid #E8E8E8', borderRadius: '2px' }}>
            {/* Stylized map mockup */}
            <div
              className="relative h-[280px] md:h-[340px]"
              style={{ backgroundColor: '#F1F0EC' }}
            >
              {/* Fake map grid lines */}
              <div className="absolute inset-0 opacity-[0.08]" style={{
                backgroundImage: 'linear-gradient(#999 1px, transparent 1px), linear-gradient(90deg, #999 1px, transparent 1px)',
                backgroundSize: '60px 60px',
              }} />

              {/* Mock price pills */}
              {[
                { top: '18%', left: '22%', price: '$12/unit' },
                { top: '35%', left: '55%', price: '$680' },
                { top: '55%', left: '30%', price: '$350' },
                { top: '28%', left: '72%', price: '$14/unit' },
                { top: '65%', left: '60%', price: '$425' },
                { top: '45%', left: '15%', price: '$11/unit' },
              ].map((pin, i) => (
                <div
                  key={i}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{ top: pin.top, left: pin.left }}
                >
                  <div
                    className="font-display px-2.5 py-1 bg-white text-ink whitespace-nowrap"
                    style={{
                      fontWeight: 900,
                      fontSize: '12px',
                      border: '1px solid #E8347A',
                      borderRadius: '2px',
                    }}
                  >
                    {pin.price}
                  </div>
                </div>
              ))}

              {/* Center pin */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-4 h-4 rounded-full bg-hot-pink border-2 border-white" />
              </div>
            </div>

            {/* CTA below mock map */}
            <div className="bg-white px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid #E8E8E8' }}>
              <div>
                <p className="editorial-kicker mb-1">On the Map</p>
                <p className="text-[14px] font-display font-bold text-ink">
                  See med spas with real prices from patients
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={buildBrowseUrl({
                    city: savedCity || undefined,
                    state: savedState || undefined,
                  })}
                  className="btn-editorial btn-editorial-primary"
                >
                  <Search size={12} />
                  Find Prices
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          7. TOOLS GRID — editorial
          ═══════════════════════════════════════════════════════ */}
      <section className="max-w-5xl mx-auto px-4 pb-14">
        <p className="editorial-kicker text-center mb-3">The Toolkit</p>
        <h2 className="editorial-headline text-center mb-10">Your glow toolkit.</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { to: '/calculator', icon: Calculator, label: 'Savings Calculator', desc: 'See how much you could save' },
            { to: '/budget', icon: TrendingDown, label: 'Budget Planner', desc: 'Plan your treatment spend' },
            { to: '/build-my-routine', icon: Calendar, label: 'Routine Builder', desc: 'Build your treatment schedule' },
            { to: '/my-stack', icon: Layers, label: 'My Stack', desc: 'Track your treatment stack' },
          ].map(({ to, icon: Icon, label, desc }) => (
            <Link
              key={to}
              to={to}
              className="glow-card p-5 group"
            >
              <Icon size={20} className="text-hot-pink mb-3" />
              <p
                className="text-[10px] font-semibold uppercase text-ink mb-1"
                style={{ letterSpacing: '0.10em' }}
              >
                {label}
              </p>
              <p className="text-[11px] text-text-secondary leading-snug font-light">{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          8. SPECIALS — hidden when empty
          ═══════════════════════════════════════════════════════ */}
      {(displaySpecials.length > 0 || displayPromoted.length > 0) && (
        <section className="bg-white py-16" style={{ borderTop: '1px solid #E8E8E8', borderBottom: '1px solid #E8E8E8' }}>
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="editorial-kicker mb-2">The Deal Sheet</p>
                <h2 className="editorial-headline">
                  Specials {savedCity ? `near ${savedCity}` : 'near you'}.
                </h2>
              </div>
              <Link
                to="/specials"
                className="text-[10px] font-semibold uppercase text-hot-pink hover:text-hot-pink-dark transition-colors flex items-center gap-1"
                style={{ letterSpacing: '0.10em' }}
              >
                View all <ArrowRight size={12} />
              </Link>
            </div>

            {displayPromoted.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {displayPromoted.map((special) => (
                  <SpecialOfferCard key={special.id} special={special} provider={special.providers} />
                ))}
              </div>
            )}
            {displaySpecials.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {displaySpecials.map((special) => (
                  <SpecialCard key={special.id} special={special} provider={special.providers} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          9. BOTTOM CTA — hot-pink full bleed
          ═══════════════════════════════════════════════════════ */}
      <section style={{ background: '#E8347A' }} className="py-20">
        <div className="max-w-2xl mx-auto px-4 text-center">
          {user ? (
            <>
              <p
                className="text-[10px] font-semibold uppercase mb-4"
                style={{ letterSpacing: '0.20em', color: '#FBE4ED' }}
              >
                Welcome Back
              </p>
              <h2
                className="font-display text-white mb-4"
                style={{ fontWeight: 900, fontSize: 'clamp(32px, 4vw, 48px)', lineHeight: 1.05 }}
              >
                Keep the data<br />
                <span className="italic">flowing.</span>
              </h2>
              <p
                className="text-[14px] mb-8 max-w-md mx-auto font-light"
                style={{ color: 'rgba(255,255,255,0.88)' }}
              >
                Every price you share makes the community stronger. Log a treatment or set a price alert.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-2">
                <Link
                  to="/log"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-white text-hot-pink font-semibold uppercase transition hover:bg-cream"
                  style={{
                    fontSize: '11px',
                    letterSpacing: '0.14em',
                    borderRadius: '2px',
                    fontFamily: 'var(--font-body)',
                    minHeight: '48px',
                  }}
                >
                  Log a Treatment
                </Link>
                <Link
                  to="/alerts"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-[10px] font-semibold uppercase text-white transition-colors hover:bg-white hover:text-hot-pink"
                  style={{
                    letterSpacing: '0.14em',
                    border: '1px solid rgba(255,255,255,0.50)',
                    borderRadius: '2px',
                    background: 'transparent',
                    minHeight: '48px',
                  }}
                >
                  Set a Price Alert
                </Link>
              </div>
            </>
          ) : (
            <>
              <p
                className="text-[10px] font-semibold uppercase mb-4"
                style={{ letterSpacing: '0.20em', color: '#FBE4ED' }}
              >
                Join the Movement
              </p>
              <h2
                className="font-display text-white mb-4"
                style={{ fontWeight: 900, fontSize: 'clamp(32px, 4vw, 48px)', lineHeight: 1.05 }}
              >
                Stop overpaying.<br />
                <span className="italic">Start knowing.</span>
              </h2>
              <p
                className="text-[14px] mb-8 max-w-md mx-auto font-light"
                style={{ color: 'rgba(255,255,255,0.88)' }}
              >
                Create a free account to set price alerts, track your treatments, and earn rewards for sharing prices.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-2">
                <button
                  onClick={() => openAuthModal('signup')}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-white text-hot-pink font-semibold uppercase transition hover:bg-cream"
                  style={{
                    fontSize: '11px',
                    letterSpacing: '0.14em',
                    borderRadius: '2px',
                    fontFamily: 'var(--font-body)',
                    minHeight: '48px',
                  }}
                >
                  Sign up free
                </button>
                <Link
                  to={buildBrowseUrl({
                    city: savedCity || undefined,
                    state: savedState || undefined,
                  })}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-[10px] font-semibold uppercase text-white transition-colors hover:bg-white hover:text-hot-pink"
                  style={{
                    letterSpacing: '0.14em',
                    border: '1px solid rgba(255,255,255,0.50)',
                    borderRadius: '2px',
                    background: 'transparent',
                    minHeight: '48px',
                  }}
                >
                  Find prices first
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

    </div>
  );
}

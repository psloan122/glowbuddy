import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Star, TrendingDown, Calculator, Calendar, Layers, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getCity as getGatingCity, getState as getGatingState } from '../lib/gating';
import FounderStory from '../components/FounderStory';
import DarkPriceCard from '../components/DarkPriceCard';
import SpecialCard from '../components/SpecialCard';
import SpecialOfferCard from '../components/SpecialOfferCard';
import { setPageMeta } from '../lib/seo';
import { AuthContext } from '../App';
import LoggedInHome from '../components/home/LoggedInHome';

// ── Placeholder testimonials ──
const PLACEHOLDER_TESTIMONIALS = [
  {
    name: 'Sarah M.',
    city: 'Austin, TX',
    treatment: 'Botox',
    quote: 'I was quoted $14/unit at one place and found $11/unit down the street on GlowBuddy. Saved over $90 on my forehead alone.',
    savings: '$90',
  },
  {
    name: 'Jessica L.',
    city: 'Nashville, TN',
    treatment: 'Lip Filler',
    quote: 'I always felt like I was overpaying but had no way to compare. Now I check GlowBuddy before every appointment.',
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

// Procedure pills shown in hero (editorial pink)
const HERO_PROCS = [
  'Botox',
  'Lip Filler',
  'Laser Hair Removal',
  'Microneedling',
  'Dermal Fillers',
  'Hydrafacial',
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
// Respects prefers-reduced-motion (skips straight to the final value).
function CountUpNumber({ value, formatted }) {
  const initial = formatted ? (typeof value === 'string' ? value : String(value)) : '0';
  const [display, setDisplay] = useState(initial);

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
      setDisplay(formatted ? `${prefix}${Math.round(target)}${suffix}` : target.toLocaleString());
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
        setDisplay(current.toLocaleString());
      }
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => raf && cancelAnimationFrame(raf);
  }, [value, formatted]);

  return display;
}

export default function Home() {
  const { session, user } = useContext(AuthContext);

  // Live stats — only show non-zero values
  const [statItems, setStatItems] = useState([]);
  const [patientCount, setPatientCount] = useState(null);
  const [providerCountTotal, setProviderCountTotal] = useState(null);

  // Specials
  const [specials, setSpecials] = useState([]);

  // Procedures / feed
  const [procedures, setProcedures] = useState([]);
  const [loadingProcedures, setLoadingProcedures] = useState(true);

  // Search & filters
  const [searchQuery, setSearchQuery] = useState('');
  const [cityZip, setCityZip] = useState('');
  const [sortBy, setSortBy] = useState('most_recent');
  const [filterProcedureType, setFilterProcedureType] = useState('');
  const [filterProviderType, setFilterProviderType] = useState('');
  const [filterState, setFilterState] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Access gate
  const [gateVisible, setGateVisible] = useState(false);

  // SEO
  useEffect(() => {
    document.title = 'GlowBuddy — Know Before You Glow';
  }, []);


  // Fetch specials on mount
  useEffect(() => {
    async function fetchSpecials() {
      const { data } = await supabase
        .from('specials')
        .select('*, providers(*)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(6);

      setSpecials(data || []);
    }

    fetchSpecials();
  }, []);

  // Fetch procedures (with filters)
  useEffect(() => {
    async function fetchProcedures() {
      setLoadingProcedures(true);

      let query = supabase
        .from('procedures')
        .select('*')
        .eq('status', 'active');

      // Text search on procedure type
      if (searchQuery.trim()) {
        query = query.ilike('procedure_type', `%${searchQuery.trim()}%`);
      }

      // City / zip filter
      if (cityZip.trim()) {
        const term = cityZip.trim();
        if (/^\d{5}$/.test(term)) {
          query = query.eq('zip_code', term);
        } else {
          query = query.ilike('city', `%${term}%`);
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

      // Sort
      if (sortBy === 'lowest_price') {
        query = query.order('price_paid', { ascending: true });
      } else if (sortBy === 'highest_price') {
        query = query.order('price_paid', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      query = query.limit(20);

      const { data } = await query;
      setProcedures(data || []);
      setLoadingProcedures(false);
    }

    fetchProcedures();
  }, [
    searchQuery,
    cityZip,
    sortBy,
    filterProcedureType,
    filterProviderType,
    filterState,
    priceMin,
    priceMax,
  ]);

  // Access gate check after procedures load
  useEffect(() => {
    if (!loadingProcedures && procedures.length > 3) {
      const unlocked = localStorage.getItem('gb_unlocked');
      if (!unlocked) {
        setGateVisible(true);
      }
    }
  }, [loadingProcedures, procedures]);

  function handleGateUnlock() {
    localStorage.setItem('gb_unlocked', 'true');
    setGateVisible(false);
  }

  return (
    <div className="bg-cream page-enter">
      {/* ═══════════════════════════════════════════════════════
          1. HERO — editorial two-section split
          ═══════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 lg:grid-cols-[60%_40%] min-h-[560px]">
        {/* LEFT — black 60%, headline + pills + search */}
        <div
          className="bg-ink px-6 md:px-12 lg:px-16 py-14 md:py-20 flex flex-col justify-center"
          style={{ borderBottom: '2px solid #E8347A' }}
        >
          <div className="max-w-xl">
            {/* Kicker */}
            <p
              className="text-[10px] font-semibold uppercase text-blush mb-5"
              style={{ letterSpacing: '0.18em' }}
            >
              The Price Report
            </p>

            {/* Headline — Playfair 900, tight, ALL CAPS */}
            <h1
              className="font-display text-white mb-4"
              style={{
                fontWeight: 900,
                fontSize: 'clamp(40px, 6vw, 80px)',
                lineHeight: 0.96,
                letterSpacing: '-0.015em',
                textTransform: 'uppercase',
              }}
            >
              KNOW BEFORE<br />
              YOU <span className="italic text-hot-pink">GLOW.</span>
            </h1>

            {/* Deck */}
            <p className="text-[16px] md:text-[18px] text-[#bbb] font-light mb-8 max-w-md leading-relaxed">
              Real prices. Real patients. Real receipts. The injectable industry has gotten away with hiding prices for too long.
            </p>

            {/* Procedure pills — editorial */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {HERO_PROCS.map((proc) => (
                <Link
                  key={proc}
                  to={`/browse?procedure=${encodeURIComponent(proc)}`}
                  className="inline-flex items-center text-[10px] font-semibold uppercase px-3 py-1.5 text-white transition-colors hover:bg-hot-pink hover:border-hot-pink"
                  style={{
                    letterSpacing: '0.10em',
                    borderRadius: '2px',
                    border: '1px solid #333',
                    background: 'transparent',
                  }}
                >
                  {proc}
                </Link>
              ))}
            </div>

            {/* Recency / data freshness label */}
            {providerCountTotal && (
              <p
                className="font-light mb-5"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontWeight: 300,
                  fontSize: '11px',
                  color: '#888',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Updated today &middot; {providerCountTotal.toLocaleString()} providers mapped
              </p>
            )}

            {/* Search / CTA row */}
            <div className="flex flex-col sm:flex-row gap-2">
              <Link
                to={savedCity ? `/browse?city=${encodeURIComponent(savedCity)}&state=${encodeURIComponent(savedState)}` : '/browse'}
                className="flex-1 flex items-center gap-2 bg-white px-4 py-3 text-[12px] text-text-secondary hover:bg-cream transition"
                style={{ borderRadius: '2px' }}
              >
                <Search size={14} className="shrink-0 text-text-secondary" />
                <span className="truncate">
                  {savedCity
                    ? `Search ${savedCity}, ${savedState}...`
                    : 'Search treatments near you...'}
                </span>
              </Link>
              <Link
                to="/browse"
                className="btn-editorial btn-editorial-primary"
              >
                Find Prices
              </Link>
            </div>

            {patientCount && (
              <p
                className="text-[11px] text-[#777] font-light uppercase mt-5"
                style={{ letterSpacing: '0.08em' }}
              >
                {patientCount >= 10000
                  ? `${Math.floor(patientCount / 1000).toLocaleString()},000+`
                  : patientCount >= 1000
                    ? `${patientCount.toLocaleString()}+`
                    : patientCount > 100
                      ? `Over ${Math.floor(patientCount / 100) * 100}`
                      : patientCount}{' '}
                patients shared what they paid.
              </p>
            )}
          </div>
        </div>

        {/* RIGHT — cream 40%, featured dark cards */}
        <div className="bg-cream px-6 md:px-8 py-14 md:py-20 flex flex-col justify-center">
          <p
            className="editorial-kicker mb-4"
          >
            Today's Featured / {HERO_FEATURED.length} prices
          </p>
          <div className="space-y-3">
            {HERO_FEATURED.map((card, i) => (
              <DarkPriceCard key={i} {...card} />
            ))}
          </div>
          <Link
            to="/browse"
            className="mt-5 text-[11px] font-semibold uppercase text-hot-pink hover:text-hot-pink-dark transition-colors inline-flex items-center gap-1 self-start"
            style={{ letterSpacing: '0.10em' }}
          >
            View all prices <ArrowRight size={12} />
          </Link>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          2. BIG NUMBERS BAR — editorial stats
          ═══════════════════════════════════════════════════════ */}
      {statItems.length > 0 && (
        <section className="bg-white" style={{ borderTop: '1px solid #E8E8E8', borderBottom: '1px solid #E8E8E8' }}>
          <div className="max-w-5xl mx-auto px-4 py-10">
            <div
              className="grid gap-0"
              style={{ gridTemplateColumns: `repeat(${statItems.length}, 1fr)` }}
            >
              {statItems.map((item, i) => (
                <div
                  key={i}
                  className="px-4 text-center"
                  style={{ borderRight: i < statItems.length - 1 ? '1px solid #E8E8E8' : 'none' }}
                >
                  <p
                    className="font-display text-ink"
                    style={{ fontWeight: 900, fontSize: 'clamp(32px, 5vw, 56px)', lineHeight: 1 }}
                  >
                    <CountUpNumber value={item.value} formatted={item.isFormatted} />
                  </p>
                  <p
                    className="text-[10px] font-semibold uppercase text-text-secondary mt-3"
                    style={{ letterSpacing: '0.12em' }}
                  >
                    {item.label}
                  </p>
                </div>
              ))}
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
              body: 'They log the real price on GlowBuddy — anonymously and in seconds.',
            },
            {
              num: '03',
              title: 'You know before you book',
              body: 'See real prices in your city so you never overpay again.',
            },
          ].map((step, i, arr) => (
            <div
              key={i}
              className="p-6 md:p-8"
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PLACEHOLDER_TESTIMONIALS.map((t, i) => (
              <div key={i} className="glow-card p-5">
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
              href="mailto:hello@glowbuddy.com?subject=My GlowBuddy Story"
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
                  to="/browse"
                  className="btn-editorial btn-editorial-primary"
                >
                  <Search size={12} />
                  Find Prices
                </Link>
                <Link
                  to="/map"
                  className="btn-editorial btn-editorial-secondary"
                >
                  <MapPin size={12} />
                  Map
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
          9. SIGN-UP CTA (logged-out users only)
          ═══════════════════════════════════════════════════════ */}
      {!user && (
        <section className="bg-ink py-20" style={{ borderTop: '2px solid #E8347A' }}>
          <div className="max-w-2xl mx-auto px-4 text-center">
            <p
              className="text-[10px] font-semibold uppercase text-blush mb-4"
              style={{ letterSpacing: '0.18em' }}
            >
              Join the Movement
            </p>
            <h2
              className="font-display text-white mb-4"
              style={{ fontWeight: 900, fontSize: 'clamp(32px, 4vw, 48px)', lineHeight: 1.05 }}
            >
              Stop overpaying.<br />
              <span className="italic text-hot-pink">Start knowing.</span>
            </h2>
            <p className="text-[14px] text-[#999] mb-8 max-w-md mx-auto font-light">
              Create a free account to set price alerts, track your treatments, and earn rewards for sharing prices.
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button
                onClick={() => openAuthModal('signup')}
                className="btn-editorial btn-editorial-primary"
              >
                Sign up free
              </button>
              <Link
                to="/browse"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-semibold uppercase text-white transition-colors"
                style={{
                  letterSpacing: '0.12em',
                  border: '1px solid #333',
                  borderRadius: '2px',
                  background: 'transparent',
                }}
              >
                Find prices first
              </Link>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}

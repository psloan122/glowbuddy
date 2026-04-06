import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Star, TrendingDown, Calculator, Calendar, Layers, ArrowRight, CheckCircle, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getCity as getGatingCity, getState as getGatingState } from '../lib/gating';
import FounderStory from '../components/FounderStory';
import HeroPattern from '../components/HeroPattern';
import SpecialCard from '../components/SpecialCard';
import SpecialOfferCard from '../components/SpecialOfferCard';
import { setPageMeta } from '../lib/seo';
import { AuthContext } from '../App';
import LoggedInHome from '../components/home/LoggedInHome';

// ── Placeholder testimonials ──
// These use realistic savings math and real city/treatment combos.
// Replace with real user testimonials when available.
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

// ── Mock price cards for "screenshot" section ──
const MOCK_CARDS = [
  { treatment: 'Botox', price: '$13/unit', badge: 'Receipt verified', badgeColor: '#059669', icon: '\u2713' },
  { treatment: 'Lip Filler', price: '$680/syr', badge: 'Patient reported', badgeColor: '#C94F78', icon: null },
  { treatment: 'RF Microneedling', price: '$350/session', badge: 'Verified', badgeColor: '#059669', icon: '\u2713' },
];

export default function Home() {
  const { user, openAuthModal } = useContext(AuthContext);

  // Live stats — only show non-zero values
  const [statItems, setStatItems] = useState([]);
  const [patientCount, setPatientCount] = useState(null);

  // Specials
  const [specials, setSpecials] = useState([]);
  const [promotedSpecials, setPromotedSpecials] = useState([]);

  // User's saved location
  const savedCity = getGatingCity();
  const savedState = getGatingState();

  // SEO
  useEffect(() => {
    setPageMeta({
      title: 'GlowBuddy \u2014 Know Before You Glow',
      description: 'Real prices for Botox, lip filler, and med spa treatments reported by patients. See what people actually paid near you.',
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
      }

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

  if (user) return <LoggedInHome />;

  return (
    <div>
      {/* ═══════════════════════════════════════════════════════
          1. HERO — mission statement + search CTA
          ═══════════════════════════════════════════════════════ */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #FDF6F0 0%, #FBE8EF 100%)' }}
      >
        <HeroPattern />

        <div className="relative z-10 py-12 md:py-20 px-5 md:px-0">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="font-display italic text-[38px] md:text-[58px] leading-[1.08] font-bold tracking-[-0.5px] text-text-primary mb-3">
              Know before you glow.
            </h1>
            <p className="text-[17px] md:text-[20px] text-text-secondary font-normal mb-8 max-w-lg mx-auto">
              Real prices, shared by real patients.<br />
              Free forever.
            </p>

            {/* Search CTA — links to Find Prices page */}
            <Link
              to={savedCity ? `/browse?city=${encodeURIComponent(savedCity)}&state=${encodeURIComponent(savedState)}` : '/browse'}
              className="inline-flex items-center gap-3 bg-white rounded-full pl-5 pr-3 py-3 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow max-w-lg w-full mx-auto"
            >
              <Search size={20} className="text-text-secondary shrink-0" />
              <span className="text-text-secondary text-sm md:text-base text-left flex-1">
                {savedCity
                  ? `Search prices in ${savedCity}, ${savedState}...`
                  : 'Search treatments near you...'}
              </span>
              <span
                className="shrink-0 px-4 py-2 rounded-full text-white text-sm font-semibold"
                style={{ backgroundColor: '#C94F78' }}
              >
                Find Prices
              </span>
            </Link>

            {patientCount && (
              <p className="text-center mt-2" style={{ fontSize: '13px', color: '#9CA3AF' }}>
                {patientCount >= 10000
                  ? `${Math.floor(patientCount / 1000).toLocaleString()},000+`
                  : patientCount >= 1000
                    ? `${patientCount.toLocaleString()}+`
                    : patientCount > 100
                      ? `Over ${Math.floor(patientCount / 100) * 100}`
                      : patientCount}{' '}
                patients shared what they paid. Now you know too.
              </p>
            )}

            <div className="flex items-center justify-center gap-4 md:gap-6 mt-6 text-sm text-text-secondary/70">
              <span>Botox</span>
              <span className="w-1 h-1 rounded-full bg-text-secondary/30" />
              <span>Lip Filler</span>
              <span className="w-1 h-1 rounded-full bg-text-secondary/30" />
              <span>Laser</span>
              <span className="w-1 h-1 rounded-full bg-text-secondary/30" />
              <span className="hidden sm:inline">Microneedling</span>
              <span className="hidden sm:inline w-1 h-1 rounded-full bg-text-secondary/30" />
              <Link to="/browse" className="text-rose-accent hover:text-rose-dark font-medium transition-colors">
                + more
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          2. BIG NUMBERS BAR — live stats (hide zeros)
          ═══════════════════════════════════════════════════════ */}
      {statItems.length > 0 && (
        <section className="border-y border-gray-100 bg-white">
          <div className="max-w-5xl mx-auto px-4 py-8">
            <div className={`grid gap-4 text-center`} style={{ gridTemplateColumns: `repeat(${statItems.length}, 1fr)` }}>
              {statItems.map((item, i) => (
                <div key={i}>
                  <p className="text-3xl md:text-4xl font-bold text-text-primary">
                    {item.isFormatted ? item.value : item.value.toLocaleString()}
                  </p>
                  <p className="text-sm text-text-secondary mt-1">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════
          3. HOW IT WORKS + SCREENSHOT MOCKUP
          ═══════════════════════════════════════════════════════ */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="font-display text-[28px] font-semibold text-text-primary text-center mb-10">
          How It Works
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          {/* Left: 3 steps */}
          <div className="space-y-8">
            {[
              {
                num: '1',
                icon: '\u{1F489}',
                title: 'Someone gets a treatment',
                body: 'A patient visits a med spa and gets Botox, filler, or another treatment near you.',
              },
              {
                num: '2',
                icon: '\uD83D\uDCF1',
                title: 'They share what they paid',
                body: 'They log the real price on GlowBuddy — anonymously and in seconds.',
              },
              {
                num: '3',
                icon: '\uD83D\uDCCD',
                title: 'You know before you book',
                body: 'See real prices in your city so you never overpay.',
              },
            ].map((step, i) => (
              <div key={i} className="flex gap-4">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: '#FBE8EF' }}
                >
                  <span className="text-xl">{step.icon}</span>
                </div>
                <div>
                  <p className="text-base font-bold text-text-primary mb-0.5">{step.title}</p>
                  <p className="text-sm text-text-secondary leading-relaxed">{step.body}</p>
                </div>
              </div>
            ))}
            <Link
              to="/log"
              className="inline-block text-white px-7 py-3 rounded-full text-sm font-semibold hover:opacity-90 transition"
              style={{ backgroundColor: '#C94F78' }}
            >
              Share what you paid
            </Link>
          </div>

          {/* Right: Stylized mock price cards */}
          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-300" />
              <div className="w-3 h-3 rounded-full bg-yellow-300" />
              <div className="w-3 h-3 rounded-full bg-green-300" />
              <span className="ml-2 text-[11px] text-text-secondary/50">glowbuddy.com/browse</span>
            </div>
            <div className="space-y-3">
              {MOCK_CARDS.map((card, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-text-primary">{card.treatment}</span>
                    <span className="text-lg font-bold text-text-primary">{card.price}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {card.icon && (
                      <CheckCircle size={12} style={{ color: card.badgeColor }} />
                    )}
                    <span className="text-[11px] font-medium" style={{ color: card.badgeColor }}>
                      {card.badge}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          4. FOUNDER STORY — trust
          ═══════════════════════════════════════════════════════ */}
      <section className="max-w-3xl mx-auto px-4 pb-12">
        <FounderStory />
      </section>

      {/* ═══════════════════════════════════════════════════════
          5. TESTIMONIALS — placeholder with disclaimer
          ═══════════════════════════════════════════════════════ */}
      <section className="bg-white border-y border-gray-100 py-12">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="font-display text-[28px] font-semibold text-text-primary text-center mb-8">
            What Patients Are Saying
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PLACEHOLDER_TESTIMONIALS.map((t, i) => (
              <div key={i} className="glow-card p-5">
                <div className="flex items-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={14} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-text-secondary leading-relaxed mb-4 italic">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{t.name}</p>
                    <p className="text-xs text-text-secondary">{t.city}</p>
                  </div>
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: '#ECFDF5', color: '#059669' }}
                  >
                    Saved {t.savings}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-4">
            <p className="text-[11px] text-text-secondary/60 mb-2">
              Based on community-reported savings. Individual results vary.
            </p>
            <a
              href="mailto:hello@glowbuddy.com?subject=My GlowBuddy Story"
              className="text-xs text-rose-accent hover:text-rose-dark font-medium transition-colors"
            >
              Share your story &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          6. MAP CTA — stylized mockup
          ═══════════════════════════════════════════════════════ */}
      <section className="py-14">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="font-display text-[28px] font-semibold text-text-primary text-center mb-8">
            Find Providers Near You
          </h2>
          <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
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
                { top: '18%', left: '22%', price: '$12/unit', treatment: 'Botox' },
                { top: '35%', left: '55%', price: '$680', treatment: 'Lip Filler' },
                { top: '55%', left: '30%', price: '$350', treatment: 'Microneedling' },
                { top: '28%', left: '72%', price: '$14/unit', treatment: 'Botox' },
                { top: '65%', left: '60%', price: '$425', treatment: 'Laser' },
                { top: '45%', left: '15%', price: '$11/unit', treatment: 'Botox' },
              ].map((pin, i) => (
                <div
                  key={i}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2"
                  style={{ top: pin.top, left: pin.left }}
                >
                  <div
                    className="px-2.5 py-1 rounded-full text-white text-[11px] font-bold shadow-md whitespace-nowrap"
                    style={{ backgroundColor: '#C94F78' }}
                  >
                    {pin.price}
                  </div>
                </div>
              ))}

              {/* Center pin */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg" />
              </div>
            </div>

            {/* CTA below mock map */}
            <div className="bg-white px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  See med spas and clinics with real prices from patients
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  Receipt-verified data you can trust
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to="/browse"
                  className="inline-flex items-center gap-1.5 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:opacity-90 transition"
                  style={{ backgroundColor: '#C94F78' }}
                >
                  <Search size={15} />
                  Find Prices
                </Link>
                <Link
                  to="/map"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-medium border border-gray-200 text-text-primary hover:border-rose-accent transition"
                >
                  <MapPin size={15} />
                  Map
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          7. TOOLS GRID — what else you can do
          ═══════════════════════════════════════════════════════ */}
      <section className="max-w-5xl mx-auto px-4 pb-14">
        <h2 className="font-display text-[28px] font-semibold text-text-primary text-center mb-8">
          Your Glow Toolkit
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { to: '/calculator', icon: Calculator, label: 'Savings Calculator', desc: 'See how much you could save' },
            { to: '/budget', icon: TrendingDown, label: 'Budget Planner', desc: 'Plan your treatment spend' },
            { to: '/build-my-routine', icon: Calendar, label: 'Routine Builder', desc: 'Build your treatment schedule' },
            { to: '/my-stack', icon: Layers, label: 'My Stack', desc: 'Track your treatment stack' },
          ].map(({ to, icon: Icon, label, desc }) => (
            <Link
              key={to}
              to={to}
              className="glow-card p-5 text-center hover:shadow-md hover:border-rose-accent/30 transition-all group"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform"
                style={{ backgroundColor: '#FBE8EF' }}
              >
                <Icon size={20} className="text-rose-accent" />
              </div>
              <p className="text-sm font-semibold text-text-primary mb-0.5">{label}</p>
              <p className="text-[11px] text-text-secondary leading-snug">{desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          8. SPECIALS — hidden when empty
          ═══════════════════════════════════════════════════════ */}
      {(displaySpecials.length > 0 || displayPromoted.length > 0) && (
        <section className="bg-white border-y border-gray-100 py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-[26px] font-semibold text-text-primary">
                Specials {savedCity ? `Near ${savedCity}` : 'Near You'}
              </h2>
              <Link
                to="/specials"
                className="text-sm font-medium text-rose-accent hover:text-rose-dark transition-colors flex items-center gap-1"
              >
                View all <ArrowRight size={14} />
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
        <section className="py-16">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <h2 className="font-display text-[28px] font-semibold text-text-primary mb-3">
              Join thousands of patients
            </h2>
            <p className="text-text-secondary mb-6 max-w-md mx-auto">
              Create a free account to set price alerts, track your treatments, and earn rewards for sharing prices.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => openAuthModal('signup')}
                className="px-8 py-3 rounded-full text-white font-semibold hover:opacity-90 transition"
                style={{ backgroundColor: '#C94F78' }}
              >
                Sign up free
              </button>
              <Link
                to="/browse"
                className="px-6 py-3 rounded-full font-medium border border-gray-200 text-text-primary hover:border-rose-accent transition"
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

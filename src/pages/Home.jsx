import { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, ChevronDown, MapPin, SlidersHorizontal, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  getCity as getGatingCity, setCity as persistCity,
  getState as getGatingState, setState as persistState,
  setZip as persistZip,
} from '../lib/gating';
import ProcedureCard from '../components/ProcedureCard';
import SpecialCard from '../components/SpecialCard';
import SpecialOfferCard from '../components/SpecialOfferCard';
import PriceStatsBar from '../components/PriceStatsBar';
import FounderStory from '../components/FounderStory';
import HeroPattern from '../components/HeroPattern';
import FirstTimerBadge from '../components/FirstTimerBadge';
import FirstTimerModeBanner from '../components/FirstTimerModeBanner';
import FirstTimerOnboardingPrompt from '../components/FirstTimerOnboardingPrompt';
import FirstTimerGuideSheet from '../components/FirstTimerGuideSheet';
import DosageCalculator from '../components/DosageCalculator';
import {
  isFirstTimerMode, setFirstTimerMode,
  addFirstTimerTreatment, getFirstTimerTreatments,
  isFirstTimerFor,
} from '../lib/firstTimerMode';
import { PROCEDURE_TYPES, PROVIDER_TYPES } from '../lib/constants';
import { searchCitiesViaGoogle } from '../lib/places';
import { assignTrustTier } from '../lib/trustTiers';
import { setPageMeta } from '../lib/seo';
import { AuthContext } from '../App';
import OutcomeSelector from '../components/OutcomeSelector';
import { getUserActiveAlerts } from '../lib/priceAlerts';
import RetouchReminders from '../components/RetouchReminders';
import SavingsCalculator from '../components/SavingsCalculator';
import { SkeletonGrid } from '../components/SkeletonCard';

function computeTrustWeight(procedure) {
  const { trust_weight } = assignTrustTier({
    receipt_verified: procedure.receipt_verified,
    has_result_photo: !!procedure.result_photo_url,
  });
  let weight = trust_weight;
  if (procedure.rating) weight += 0.1;
  if (procedure.review_body) weight += 0.1;
  if (procedure.has_receipt && !procedure.receipt_verified) weight += 0.1;
  return weight;
}

export default function Home() {
  const { user } = useContext(AuthContext);
  // (stats are now live-queried inside PriceStatsBar)

  // Specials
  const [specials, setSpecials] = useState([]);
  const [promotedSpecials, setPromotedSpecials] = useState([]);

  // Procedures / feed
  const [procedures, setProcedures] = useState([]);
  const [loadingProcedures, setLoadingProcedures] = useState(true);

  // --- Procedure search ---
  const [procQuery, setProcQuery] = useState('');
  const [procOpen, setProcOpen] = useState(false);
  const [selectedProc, setSelectedProc] = useState('');
  const procRef = useRef(null);

  // --- Location search ---
  const [locQuery, setLocQuery] = useState('');
  const [locOpen, setLocOpen] = useState(false);
  const [locResults, setLocResults] = useState([]);
  const [locLoading, setLocLoading] = useState(false);
  const [selectedLoc, setSelectedLoc] = useState(() => {
    const city = getGatingCity();
    const state = getGatingState();
    return (city && state) ? { city, state } : null;
  });
  const locRef = useRef(null);
  const locInputRef = useRef(null);
  const locDebounce = useRef(null);

  // Sort & extra filters
  const [sortBy, setSortBy] = useState('most_verified');
  const [filterProviderType, setFilterProviderType] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [minRating, setMinRating] = useState('');

  // First-timer state
  const [firstTimerActive, setFirstTimerActive] = useState(() => isFirstTimerMode());
  const [showGuideSheet, setShowGuideSheet] = useState(false);
  const [guideSheetTreatment, setGuideSheetTreatment] = useState('');

  // Browse mode: 'treatment' or 'goal'
  const [browseMode, setBrowseMode] = useState('treatment');

  // User's active price alerts (for AlertMatchBadge)
  const [userAlerts, setUserAlerts] = useState([]);

  // Recent reviews
  const [recentReviews, setRecentReviews] = useState([]);

  // Calculator widget
  const [calcOpen, setCalcOpen] = useState(false);

  // Location personalization
  const [fallbackLabel, setFallbackLabel] = useState('');

  // SEO
  useEffect(() => {
    setPageMeta({
      title: 'GlowBuddy \u2014 Know Before You Glow',
      description: 'Real prices for Botox, lip filler, and med spa treatments reported by patients. See what people actually paid near you.',
    });
  }, []);

  // Fetch user's active price alerts for match badges
  useEffect(() => {
    getUserActiveAlerts().then(setUserAlerts);
  }, []);

  // Switch to lowest_price sort when first-timer mode activates
  useEffect(() => {
    if (firstTimerActive && selectedProc && (sortBy === 'most_recent' || sortBy === 'most_verified')) {
      setSortBy('lowest_price');
    }
  }, [firstTimerActive, selectedProc]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (procRef.current && !procRef.current.contains(e.target)) setProcOpen(false);
      if (locRef.current && !locRef.current.contains(e.target)) setLocOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Fetch specials
  useEffect(() => {
    supabase
      .from('specials')
      .select('*, providers(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => setSpecials(data || []));
  }, []);

  // Fetch promoted specials (paid placements)
  useEffect(() => {
    supabase
      .from('provider_specials')
      .select('*, providers(*)')
      .eq('is_active', true)
      .gt('ends_at', new Date().toISOString())
      .order('placement_tier', { ascending: false }) // featured first
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => setPromotedSpecials(data || []));
  }, []);

  // Fetch recent 5-star reviews
  useEffect(() => {
    supabase
      .from('reviews')
      .select('*, providers(name, slug)')
      .eq('status', 'active')
      .eq('rating', 5)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setRecentReviews(data || []));
  }, []);

  // ── Procedure search helpers ──
  const procMatches = procQuery.trim()
    ? PROCEDURE_TYPES.filter((p) =>
        p.toLowerCase().includes(procQuery.trim().toLowerCase())
      )
    : [];

  function selectProcedure(proc) {
    setSelectedProc(proc);
    setProcQuery('');
    setProcOpen(false);
  }

  function clearProcedure() {
    setSelectedProc('');
    setProcQuery('');
  }

  // ── Location search helpers ──
  const searchCities = useCallback(async (q) => {
    const trimmed = q.trim();
    if (!trimmed) { setLocResults([]); return; }

    // Zip code path
    if (/^\d{5}$/.test(trimmed)) {
      setLocLoading(true);
      try {
        const res = await fetch(`https://api.zippopotam.us/us/${trimmed}`);
        if (res.ok) {
          const data = await res.json();
          const place = data.places?.[0];
          if (place) {
            setLocResults([{
              city: place['place name'],
              state: place['state abbreviation'],
              zip: trimmed,
            }]);
          } else {
            setLocResults([]);
          }
        } else {
          setLocResults([]);
        }
      } catch {
        setLocResults([]);
      } finally {
        setLocLoading(false);
      }
      return;
    }

    // City/town name path — query Supabase, fallback to Google Places
    if (trimmed.length < 2) { setLocResults([]); return; }
    setLocLoading(true);
    try {
      const { data } = await supabase
        .from('procedures')
        .select('city, state')
        .eq('status', 'active')
        .ilike('city', `%${trimmed}%`)
        .limit(50);

      // Deduplicate city+state pairs
      const seen = new Set();
      const unique = [];
      for (const row of data || []) {
        if (!row.city) continue;
        const key = `${row.city}|${row.state}`;
        if (!seen.has(key)) {
          seen.add(key);
          unique.push({ city: row.city, state: row.state });
        }
        if (unique.length >= 8) break;
      }

      // If few Supabase results, supplement with Google Places
      if (unique.length < 3) {
        const googleResults = await searchCitiesViaGoogle(trimmed);
        for (const g of googleResults) {
          const key = `${g.city}|${g.state}`;
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(g);
          }
          if (unique.length >= 8) break;
        }
      }

      setLocResults(unique);
    } catch {
      setLocResults([]);
    } finally {
      setLocLoading(false);
    }
  }, []);

  function handleLocInput(val) {
    setLocQuery(val);
    setLocOpen(true);
    if (locDebounce.current) clearTimeout(locDebounce.current);
    locDebounce.current = setTimeout(() => searchCities(val), 300);
  }

  function selectLocation(loc) {
    setSelectedLoc(loc);
    setLocQuery('');
    setLocOpen(false);
    // Persist to localStorage for personalization
    if (loc.city) persistCity(loc.city);
    if (loc.state) persistState(loc.state);
    if (loc.zip) persistZip(loc.zip);
  }

  function clearLocation() {
    setSelectedLoc(null);
    setLocQuery('');
  }

  // ── Derive filter values ──
  const filterProcedureType = selectedProc;
  const filterCity = selectedLoc?.city || '';
  const filterState = selectedLoc?.state || '';
  const filterZip = selectedLoc?.zip || '';

  // Fetch procedures (with filters)
  useEffect(() => {
    async function applySort(query) {
      if (sortBy === 'most_verified') {
        query = query.order('created_at', { ascending: false }).limit(40);
        const { data } = await query;
        return (data || [])
          .sort((a, b) => computeTrustWeight(b) - computeTrustWeight(a))
          .slice(0, 20);
      }
      if (sortBy === 'lowest_price') {
        query = query.order('price_paid', { ascending: true });
      } else if (sortBy === 'highest_price') {
        query = query.order('price_paid', { ascending: false });
      } else if (sortBy === 'highest_rated') {
        query = query.not('rating', 'is', null).order('rating', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }
      query = query.limit(20);
      const { data } = await query;
      return data || [];
    }

    function buildQuery({ city, state, zip }) {
      let query = supabase
        .from('procedures')
        .select('*')
        .eq('status', 'active');

      if (filterProcedureType) query = query.eq('procedure_type', filterProcedureType);
      if (state) query = query.eq('state', state);
      if (city) query = query.ilike('city', `%${city}%`);
      if (zip) query = query.eq('zip_code', zip);
      if (filterProviderType) query = query.eq('provider_type', filterProviderType);
      if (priceMin) query = query.gte('price_paid', parseInt(priceMin, 10));
      if (priceMax) query = query.lte('price_paid', parseInt(priceMax, 10));
      if (minRating) query = query.gte('rating', parseInt(minRating, 10));
      return query;
    }

    async function fetchProcedures() {
      setLoadingProcedures(true);
      setFallbackLabel('');

      const query = buildQuery({ city: filterCity, state: filterState, zip: filterZip });
      const results = await applySort(query);

      // State-level fallback: if city filter produced 0 results, retry with state only
      if (results.length === 0 && filterCity && filterState) {
        const fallbackQuery = buildQuery({ city: '', state: filterState, zip: '' });
        const fallbackResults = await applySort(fallbackQuery);
        if (fallbackResults.length > 0) {
          setFallbackLabel(filterState);
          setProcedures(fallbackResults);
          setLoadingProcedures(false);
          return;
        }
      }

      setProcedures(results);
      setLoadingProcedures(false);
    }

    fetchProcedures();
  }, [
    filterProcedureType,
    filterState,
    filterCity,
    filterZip,
    filterProviderType,
    sortBy,
    priceMin,
    priceMax,
    minRating,
  ]);

  // Filter specials by selected location (reactive) or localStorage fallback
  const specialsState = selectedLoc?.state || getGatingState();
  const filteredSpecials = specialsState
    ? specials.filter((s) => s.providers?.state === specialsState)
    : [];
  const displaySpecials = filteredSpecials.length > 0 ? filteredSpecials : specials;

  // Filter promoted specials by location
  const filteredPromoted = specialsState
    ? promotedSpecials.filter((s) => s.providers?.state === specialsState)
    : [];
  const displayPromoted = filteredPromoted.length > 0 ? filteredPromoted : promotedSpecials;

  const hasActiveFilters = selectedProc || selectedLoc || filterProviderType || priceMin || priceMax || minRating;

  return (
    <div>
      {/* Hero Section */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #FDF6F0 0%, #FBE8EF 100%)' }}
      >
        <HeroPattern />

        <div className="relative z-10 py-16 md:py-[100px] md:pb-[80px] px-5 md:px-0">
          <div className="max-w-[580px] ml-[max(5vw,40px)]">
            <h1 className="font-display italic text-[36px] md:text-[52px] leading-[1.1] font-normal tracking-[-0.5px] text-text-primary mb-1">
              Know before you glow.
            </h1>
            <PriceStatsBar city={selectedLoc?.city} state={selectedLoc?.state} />
            <p className="text-base text-text-secondary max-w-[460px] leading-relaxed mt-5 mb-6">
              Real prices for Botox, fillers, and med spa treatments — reported by
              patients like you.
            </p>

            <ul className="space-y-2.5 mb-6">
              {[
                'Real prices from real patients — not what spas advertise',
                'Search by city, procedure, or zip code',
                'Free forever — no account needed to browse',
              ].map((text) => (
                <li key={text} className="flex items-start gap-2 text-sm text-text-secondary">
                  <span
                    className="mt-[7px] shrink-0 rounded-full"
                    style={{ width: 4, height: 4, backgroundColor: '#C94F78' }}
                  />
                  {text}
                </li>
              ))}
            </ul>

            <Link
              to="/log"
              className="inline-block text-white px-8 py-3.5 rounded-full text-lg font-semibold hover:opacity-90 transition mb-4"
              style={{ backgroundColor: '#C94F78' }}
            >
              Share what you paid
            </Link>

            <p className="text-[13px] italic" style={{ color: '#9CA3AF' }}>
              Real prices from real patients.
            </p>
          </div>
        </div>
      </section>

      {/* Founder Story */}
      <section className="max-w-3xl mx-auto px-4 mt-8">
        <FounderStory />
      </section>

      {/* How It Works */}
      <section className="max-w-4xl mx-auto px-4 mt-12">
        <h2 className="font-display text-[26px] font-semibold text-text-primary text-center mb-8">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: '💉', title: 'Someone pays for Botox', body: 'A patient gets a treatment at a med spa near you.' },
            { icon: '📱', title: 'They share what they paid', body: 'They log the real price on GlowBuddy — anonymously.' },
            { icon: '📍', title: 'You know before you book', body: 'See real prices in your city so you never overpay.' },
          ].map((step, i) => (
            <div key={i} className="glow-card p-6 text-center">
              <span className="text-3xl block mb-3">{step.icon}</span>
              <p className="text-sm font-bold text-text-primary mb-1">{step.title}</p>
              <p className="text-xs text-text-secondary leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Savings Calculator Widget */}
      <section className="max-w-4xl mx-auto px-4 mt-8">
        <div className="glow-card overflow-hidden">
          <button
            onClick={() => setCalcOpen(!calcOpen)}
            className="w-full flex items-center justify-between px-5 py-4 text-left"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-rose-accent text-lg">&#x1F4B0;</span>
              <div>
                <p className="text-sm font-bold text-text-primary">How much could you save?</p>
                <p className="text-xs text-text-secondary">Compare your prices to your city&apos;s average</p>
              </div>
            </div>
            <ChevronDown
              size={18}
              className={`text-text-secondary transition-transform ${calcOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {calcOpen && (
            <div className="px-5 pb-5 border-t border-gray-100 pt-4">
              <SavingsCalculator variant="compact" />
            </div>
          )}
        </div>
      </section>

      {/* What Patients Are Saying */}
      {recentReviews.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 mt-12">
          <h2 className="font-display text-[26px] font-semibold text-text-primary mb-6">
            What Patients Are Saying
          </h2>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {recentReviews.map((review) => (
              <Link
                key={review.id}
                to={review.providers ? `/provider/${review.providers.slug}` : '#'}
                className="block min-w-[280px] max-w-[320px] glow-card p-4 shrink-0 hover:no-underline"
              >
                <div className="flex items-center gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={14}
                      className={
                        s <= review.rating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-gray-300'
                      }
                    />
                  ))}
                </div>
                {review.title && (
                  <h4 className="font-bold text-text-primary text-sm mb-1 line-clamp-1">
                    {review.title}
                  </h4>
                )}
                {review.body && (
                  <p className="text-xs text-text-secondary line-clamp-2 mb-2">
                    {review.body}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  {review.procedure_type && (
                    <span className="text-[10px] bg-rose-light text-rose-dark px-1.5 py-0.5 rounded-full">
                      {review.procedure_type}
                    </span>
                  )}
                  {review.providers?.name && (
                    <span className="text-[10px] text-text-secondary">
                      {review.providers.name}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Specials Near You */}
      <section className="max-w-7xl mx-auto px-4 mt-12">
        <h2 className="font-display text-[26px] font-semibold text-text-primary mb-6">
          Specials Near You
        </h2>

        {/* Promoted specials (paid placements) */}
        {displayPromoted.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {displayPromoted.map((special) => (
              <SpecialOfferCard
                key={special.id}
                special={special}
                provider={special.providers}
              />
            ))}
          </div>
        )}

        {/* Regular specials */}
        {displaySpecials.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displaySpecials.map((special) => (
              <SpecialCard
                key={special.id}
                special={special}
                provider={special.providers}
              />
            ))}
          </div>
        ) : displayPromoted.length === 0 ? (
          <div className="glow-card p-8 text-center">
            <p className="text-text-secondary mb-2">
              No specials near you yet.
            </p>
            <p className="text-sm text-text-secondary mb-3">
              Are you a provider? Post specials to reach patients in your area.
            </p>
            <Link
              to="/business"
              className="text-rose-accent font-medium hover:text-rose-dark transition-colors text-sm"
            >
              See provider plans &rarr;
            </Link>
          </div>
        ) : null}
      </section>

      {/* Retouch Reminders */}
      <div className="max-w-7xl mx-auto px-4 mt-8">
        <RetouchReminders />
      </div>

      {/* Set your city banner */}
      {user && !selectedLoc && (
        <section className="max-w-7xl mx-auto px-4 mt-8">
          <div className="flex items-center justify-between gap-4 px-5 py-4 rounded-xl bg-rose-light border border-rose-accent/20">
            <p className="text-sm text-rose-dark font-medium">
              Set your city to see local prices
            </p>
            <button
              onClick={() => {
                locInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => locInputRef.current?.focus(), 400);
              }}
              className="shrink-0 px-4 py-2 rounded-full text-sm font-semibold text-white bg-rose-accent hover:bg-rose-dark transition"
            >
              Set location
            </button>
          </div>
        </section>
      )}

      {/* Browse Feed */}
      <section className="max-w-7xl mx-auto px-4 mt-12 pb-12">
        <div className="flex items-center gap-6 mb-6">
          <h2 className="font-display text-[26px] font-semibold text-text-primary">
            {browseMode === 'treatment'
              ? (sortBy === 'most_verified'
                  ? `Most Verified Prices${selectedLoc ? ` in ${selectedLoc.city}, ${selectedLoc.state}` : ''}`
                  : `Recent Prices${selectedLoc ? ` in ${selectedLoc.city}, ${selectedLoc.state}` : ''}`)
              : 'Browse by Goal'}
          </h2>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setBrowseMode('treatment')}
              className={`px-3 py-1.5 text-xs font-medium transition ${
                browseMode === 'treatment'
                  ? 'bg-[#0369A1] text-white'
                  : 'bg-white text-text-secondary hover:bg-gray-50'
              }`}
            >
              By Treatment
            </button>
            <button
              onClick={() => setBrowseMode('goal')}
              className={`px-3 py-1.5 text-xs font-medium transition ${
                browseMode === 'goal'
                  ? 'bg-[#0369A1] text-white'
                  : 'bg-white text-text-secondary hover:bg-gray-50'
              }`}
            >
              By Goal
            </button>
          </div>
        </div>

        {browseMode === 'goal' ? (
          <OutcomeSelector />
        ) : (
        <>
        {/* Two search inputs */}
        <div className="flex flex-col md:flex-row gap-2 mb-3">
          {/* Procedure search */}
          <div ref={procRef} className="relative md:w-[60%]">
            {selectedProc ? (
              <div className="flex items-center gap-2 px-3 py-3 rounded-xl border border-gray-200 bg-white">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm bg-rose-light text-rose-dark border border-rose-accent/20">
                  {selectedProc}
                  <button
                    onClick={clearProcedure}
                    className="hover:text-rose-accent transition-colors"
                    aria-label="Clear procedure filter"
                  >
                    <X size={14} />
                  </button>
                </span>
                {firstTimerActive && isFirstTimerFor(selectedProc) && (
                  <FirstTimerBadge
                    variant="inline"
                    label="View Guide"
                    onClick={() => { setGuideSheetTreatment(selectedProc); setShowGuideSheet(true); }}
                  />
                )}
              </div>
            ) : (
              <>
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                />
                <input
                  type="text"
                  placeholder="Search procedures..."
                  value={procQuery}
                  onChange={(e) => {
                    setProcQuery(e.target.value);
                    setProcOpen(true);
                  }}
                  onFocus={() => procQuery.trim() && setProcOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && procMatches.length > 0) selectProcedure(procMatches[0]);
                    if (e.key === 'Escape') setProcOpen(false);
                  }}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
                />
              </>
            )}

            {/* Procedure dropdown */}
            {procOpen && procQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-30 overflow-hidden">
                {procMatches.length > 0 ? (
                  procMatches.map((p) => (
                    <button
                      key={p}
                      onClick={() => selectProcedure(p)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-rose-light/40 transition-colors text-text-primary"
                    >
                      {p}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-text-secondary">
                    No procedures found
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Location search */}
          <div ref={locRef} className="relative md:w-[40%]">
            {selectedLoc ? (
              <div className="flex items-center gap-2 px-3 py-3 rounded-xl border border-gray-200 bg-white">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm bg-rose-light text-rose-dark border border-rose-accent/20">
                  <MapPin size={12} />
                  {selectedLoc.city}{selectedLoc.state ? `, ${selectedLoc.state}` : ''}
                  {selectedLoc.zip ? ` (${selectedLoc.zip})` : ''}
                  <button
                    onClick={clearLocation}
                    className="hover:text-rose-accent transition-colors"
                    aria-label="Clear location filter"
                  >
                    <X size={14} />
                  </button>
                </span>
              </div>
            ) : (
              <>
                <MapPin
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
                />
                <input
                  ref={locInputRef}
                  type="text"
                  placeholder="City, town, or zip code"
                  value={locQuery}
                  onChange={(e) => handleLocInput(e.target.value)}
                  onFocus={() => locQuery.trim() && setLocOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && locResults.length > 0) selectLocation(locResults[0]);
                    if (e.key === 'Escape') setLocOpen(false);
                  }}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
                />
              </>
            )}

            {/* Location dropdown */}
            {locOpen && locQuery.trim() && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-30 overflow-hidden">
                {locLoading ? (
                  <div className="px-4 py-3 text-sm text-text-secondary animate-pulse">
                    Searching...
                  </div>
                ) : locResults.length > 0 ? (
                  locResults.map((loc, i) => (
                    <button
                      key={`${loc.city}-${loc.state}-${i}`}
                      onClick={() => selectLocation(loc)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-rose-light/40 transition-colors flex items-center gap-2 text-text-primary"
                    >
                      <MapPin size={14} className="text-text-secondary shrink-0" />
                      {loc.city}{loc.state ? `, ${loc.state}` : ''}
                      {loc.zip ? ` (${loc.zip})` : ''}
                    </button>
                  ))
                ) : /^\d{5}$/.test(locQuery.trim()) ? (
                  <div className="px-4 py-3 text-sm text-text-secondary">
                    Enter a valid US zip
                  </div>
                ) : locQuery.trim().length >= 2 ? (
                  <div className="px-4 py-3 text-sm text-text-secondary">
                    No locations found
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Sort & more filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 rounded-xl border border-gray-200 bg-white text-sm text-text-primary focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition cursor-pointer"
            >
              <option value="most_verified">Most Verified</option>
              <option value="most_recent">Most Recent</option>
              <option value="lowest_price">Lowest Price</option>
              <option value="highest_price">Highest Price</option>
              <option value="highest_rated">Highest Rated</option>
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
            />
          </div>

          <div className="relative">
            <select
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 rounded-xl border border-gray-200 bg-white text-sm text-text-primary focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition cursor-pointer"
            >
              <option value="">Min Rating</option>
              <option value="3">3+ Stars</option>
              <option value="4">4+ Stars</option>
              <option value="5">5 Stars Only</option>
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
            />
          </div>

          <button
            onClick={() => setShowMoreFilters(!showMoreFilters)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm text-text-secondary hover:text-text-primary hover:border-rose-accent transition"
          >
            <SlidersHorizontal size={16} />
            More filters
          </button>

          {hasActiveFilters && (
            <span className="text-xs text-text-secondary">
              {procedures.length} result{procedures.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Expanded extra filters */}
        {showMoreFilters && (
          <div className="glow-card p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Provider Type
                </label>
                <select
                  value={filterProviderType}
                  onChange={(e) => setFilterProviderType(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
                >
                  <option value="">All Providers</option>
                  {PROVIDER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Min Price
                </label>
                <input
                  type="number"
                  placeholder="$0"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Max Price
                </label>
                <input
                  type="number"
                  placeholder="$10,000"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* First-Timer Mode Banner */}
        {firstTimerActive && (
          <FirstTimerModeBanner
            onOpenGuide={() => {
              const treatments = getFirstTimerTreatments();
              setGuideSheetTreatment(treatments[0] || selectedProc);
              setShowGuideSheet(true);
            }}
            onDeactivate={() => {
              setFirstTimerMode(false);
              setFirstTimerActive(false);
            }}
          />
        )}

        {/* First-Timer Onboarding Prompt */}
        {selectedProc && !firstTimerActive && (
          <FirstTimerOnboardingPrompt
            key={selectedProc}
            treatmentName={selectedProc}
            onActivated={() => {
              addFirstTimerTreatment(selectedProc);
              setFirstTimerMode(true);
              setFirstTimerActive(true);
              setGuideSheetTreatment(selectedProc);
              setShowGuideSheet(true);
            }}
            onDismissed={() => {}}
          />
        )}

        {/* Dosage Calculator */}
        {firstTimerActive && selectedProc && isFirstTimerFor(selectedProc) && (
          <DosageCalculator treatmentName={selectedProc} />
        )}

        {/* Fallback note */}
        {fallbackLabel && (
          <p className="text-sm text-text-secondary mb-4">
            No prices in {filterCity} yet — showing {fallbackLabel} prices
          </p>
        )}

        {/* Procedures grid */}
        {loadingProcedures ? (
          <SkeletonGrid count={6} />
        ) : procedures.length === 0 ? (
          <div className="glow-card p-8 text-center">
            <p className="text-text-secondary mb-2">
              No prices in your area yet.
            </p>
            <p className="text-sm text-text-secondary mb-6">
              Be the first to share what you paid here.
            </p>
            <Link
              to="/log"
              className="inline-block text-white px-6 py-3 rounded-full font-semibold hover:opacity-90 transition"
              style={{ backgroundColor: '#C94F78' }}
            >
              + Share my price
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {procedures.map((proc) => (
              <ProcedureCard key={proc.id} procedure={proc} firstTimerActive={firstTimerActive} userAlerts={userAlerts} />
            ))}
          </div>
        )}
        </>
        )}
      </section>

      {/* First-Timer Guide Sheet */}
      {showGuideSheet && guideSheetTreatment && (
        <FirstTimerGuideSheet
          treatmentName={guideSheetTreatment}
          onClose={() => setShowGuideSheet(false)}
          onActivateMode={() => {
            addFirstTimerTreatment(guideSheetTreatment);
            setFirstTimerMode(true);
            setFirstTimerActive(true);
            setShowGuideSheet(false);
          }}
        />
      )}
    </div>
  );
}

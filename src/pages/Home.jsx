import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, ChevronDown, MapPin, SlidersHorizontal, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  getCity, setCity as persistCity,
  getState as getGatingState, setState as persistState,
  setZip as persistZip,
} from '../lib/gating';
import ProcedureCard from '../components/ProcedureCard';
import SpecialCard from '../components/SpecialCard';
import SpecialOfferCard from '../components/SpecialOfferCard';
import PriceStatsBar from '../components/PriceStatsBar';
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
import OutcomeSelector from '../components/OutcomeSelector';
import { getUserActiveAlerts } from '../lib/priceAlerts';
import RetouchReminders from '../components/RetouchReminders';
import SavingsCalculator from '../components/SavingsCalculator';

export default function Home() {
  // Stats
  const [stats] = useState({
    totalSubmissions: 4821,
    avgBotoxUnit: 13.40,
    avgLipFiller: 672,
    avgRfMicroneedling: 400,
  });

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
  const [selectedLoc, setSelectedLoc] = useState(null); // { city, state, zip? }
  const locRef = useRef(null);
  const locDebounce = useRef(null);

  // Sort & extra filters
  const [sortBy, setSortBy] = useState('most_recent');
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
  const [userCity, setUserCity] = useState(() => getCity());
  const [userState] = useState(() => getGatingState());
  const [localCount, setLocalCount] = useState(null);

  // SEO
  useEffect(() => {
    document.title = 'GlowBuddy \u2014 Know Before You Glow';
  }, []);

  // Fetch user's active price alerts for match badges
  useEffect(() => {
    getUserActiveAlerts().then(setUserAlerts);
  }, []);

  // Switch to lowest_price sort when first-timer mode activates
  useEffect(() => {
    if (firstTimerActive && selectedProc && sortBy === 'most_recent') {
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

  // Fetch local count
  useEffect(() => {
    if (!userState) return;
    supabase
      .from('procedures')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('state', userState)
      .then(({ count }) => setLocalCount(count));
  }, [userState]);

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

    // City name path — query Supabase distinct cities
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
    if (loc.city) { persistCity(loc.city); setUserCity(loc.city); }
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
    async function fetchProcedures() {
      setLoadingProcedures(true);

      let query = supabase
        .from('procedures')
        .select('*')
        .eq('status', 'active');

      if (filterProcedureType) query = query.eq('procedure_type', filterProcedureType);
      if (filterState) query = query.eq('state', filterState);
      if (filterCity) query = query.ilike('city', `%${filterCity}%`);
      if (filterZip) query = query.eq('zip_code', filterZip);
      if (filterProviderType) query = query.eq('provider_type', filterProviderType);
      if (priceMin) query = query.gte('price_paid', parseInt(priceMin, 10));
      if (priceMax) query = query.lte('price_paid', parseInt(priceMax, 10));
      if (minRating) query = query.gte('rating', parseInt(minRating, 10));

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
      setProcedures(data || []);
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

  // Filter specials by user state client-side
  const filteredSpecials = userState
    ? specials.filter((s) => s.providers?.state === userState)
    : [];
  const displaySpecials = filteredSpecials.length > 0 ? filteredSpecials : specials;

  // Filter promoted specials by user state
  const filteredPromoted = userState
    ? promotedSpecials.filter((s) => s.providers?.state === userState)
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
            <h1 className="font-display italic text-[36px] md:text-[56px] leading-[1.1] font-light tracking-[-0.5px] text-text-primary mb-4">
              Know before you glow.
            </h1>
            <p className="text-base text-text-secondary max-w-[460px] leading-relaxed mb-6">
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
              Log Your Treatment
            </Link>

            <p className="text-[13px] italic" style={{ color: '#9CA3AF' }}>
              Join the women who refused to overpay.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="max-w-4xl mx-auto px-4 -mt-6 relative z-10">
        <PriceStatsBar stats={stats} city={userCity} localCount={localCount} />
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

      {/* Browse Feed */}
      <section className="max-w-7xl mx-auto px-4 mt-12 pb-12">
        <div className="flex items-center gap-6 mb-6">
          <h2 className="font-display text-[26px] font-semibold text-text-primary">
            {browseMode === 'treatment' ? 'Recent Prices' : 'Browse by Goal'}
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
                  type="text"
                  placeholder="City or zip code"
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
                    No cities found
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

        {/* Procedures grid */}
        {loadingProcedures ? (
          <div className="text-center py-12">
            <p className="text-text-secondary animate-pulse">
              Loading prices...
            </p>
          </div>
        ) : procedures.length === 0 ? (
          <div className="glow-card p-8 text-center">
            <p className="text-text-secondary mb-4">
              Be the first to log a price in your area.
            </p>
            <p className="text-sm text-text-secondary mb-6">
              Help other women know before they glow.
            </p>
            <Link
              to="/log"
              className="inline-block text-white px-6 py-3 rounded-full font-semibold hover:opacity-90 transition"
              style={{ backgroundColor: '#C94F78' }}
            >
              Log Your Treatment
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

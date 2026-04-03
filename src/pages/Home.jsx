import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, ChevronDown, Lock, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';
import { isUnlocked, isOnboarded, getCity, getState as getGatingState } from '../lib/gating';
import ProcedureCard from '../components/ProcedureCard';
import SpecialCard from '../components/SpecialCard';
import PriceStatsBar from '../components/PriceStatsBar';
import SoftGate from '../components/SoftGate';
import Onboarding from '../components/Onboarding';
import { PROCEDURE_TYPES, PROVIDER_TYPES, US_STATES } from '../lib/constants';

export default function Home() {
  const { session, user } = useContext(AuthContext);

  // Stats — hardcoded until real data exists
  const [stats] = useState({
    totalSubmissions: 4821,
    avgBotoxUnit: 13.40,
    avgLipFiller: 672,
  });

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

  // Onboarding & gating
  const [showOnboarding, setShowOnboarding] = useState(() => !isOnboarded());
  const [unlocked, setUnlocked] = useState(() => isUnlocked());
  const [userCity, setUserCity] = useState(() => getCity());
  const [userState, setUserState] = useState(() => getGatingState());
  const [localCount, setLocalCount] = useState(null);

  // SEO
  useEffect(() => {
    document.title = 'GlowBuddy — Know Before You Glow';
  }, []);

  // Fetch local count when userState is known
  useEffect(() => {
    if (!userState) return;
    async function fetchLocalCount() {
      const { count } = await supabase
        .from('procedures')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('state', userState);
      setLocalCount(count);
    }
    fetchLocalCount();
  }, [userState]);

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

      // Dropdown filters
      if (filterProcedureType) {
        query = query.eq('procedure_type', filterProcedureType);
      }
      if (filterProviderType) {
        query = query.eq('provider_type', filterProviderType);
      }
      if (filterState) {
        query = query.eq('state', filterState);
      }
      if (priceMin) {
        query = query.gte('price_paid', parseInt(priceMin, 10));
      }
      if (priceMax) {
        query = query.lte('price_paid', parseInt(priceMax, 10));
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

  function handleOnboardingComplete() {
    setShowOnboarding(false);
    // Re-read city/state that onboarding may have set
    const city = getCity();
    const state = getGatingState();
    setUserCity(city);
    setUserState(state);
    if (state) {
      setFilterState(state);
    }
  }

  function handleGateUnlock() {
    setUnlocked(true);
  }

  // Filter specials by user state client-side
  const filteredSpecials = userState
    ? specials.filter((s) => s.providers?.state === userState)
    : [];
  const displaySpecials = filteredSpecials.length > 0 ? filteredSpecials : specials;

  // Render procedure grid with inline gate and blur
  function renderProcedureGrid() {
    const items = [];

    procedures.forEach((proc, index) => {
      if (!unlocked && index === 3) {
        // Inject SoftGate after card 2 (at position 3)
        items.push(
          <SoftGate key="soft-gate" onUnlock={handleGateUnlock} city={userCity} />
        );
      }

      if (!unlocked && index >= 3) {
        // Locked cards: blurred with lock overlay
        items.push(
          <div key={proc.id} className="relative">
            <div className="blur-sm opacity-60 pointer-events-none select-none">
              <ProcedureCard procedure={proc} blurProvider />
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-10 h-10 bg-white/80 rounded-full flex items-center justify-center shadow-sm">
                <Lock size={18} className="text-text-secondary" />
              </div>
            </div>
          </div>
        );
      } else {
        // Free cards (0-2) or all cards when unlocked
        items.push(
          <ProcedureCard key={proc.id} procedure={proc} blurProvider />
        );
      }
    });

    return items;
  }

  return (
    <div>
      {/* Onboarding overlay */}
      {showOnboarding && (
        <Onboarding onComplete={handleOnboardingComplete} />
      )}

      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-rose-light/30 to-warm-white py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium text-text-primary mb-4 leading-tight">
            Know before you glow.
          </h1>
          <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-8">
            Real prices for Botox, fillers, and med spa treatments — reported by
            patients like you.
          </p>
          <Link
            to="/log"
            className="inline-block text-white px-8 py-3.5 rounded-full text-lg font-semibold hover:opacity-90 transition"
            style={{ backgroundColor: '#C94F78' }}
          >
            Log Your Treatment
          </Link>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="max-w-4xl mx-auto px-4 -mt-6 relative z-10">
        <PriceStatsBar stats={stats} city={userCity} localCount={localCount} />
      </section>

      {/* Specials Near You */}
      <section className="max-w-7xl mx-auto px-4 mt-12">
        <h2 className="text-2xl font-bold text-text-primary mb-6">
          Specials Near You
        </h2>
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
        ) : (
          <div className="glow-card p-8 text-center">
            <p className="text-text-secondary mb-2">
              No specials posted yet. Are you a provider?{' '}
              <Link
                to="/business"
                className="text-rose-accent font-medium hover:text-rose-dark transition-colors"
              >
                Post yours free.
              </Link>
            </p>
          </div>
        )}
      </section>

      {/* Browse Feed */}
      <section className="max-w-7xl mx-auto px-4 mt-12 pb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-6">
          Recent Prices
        </h2>

        {/* "Showing prices near" banner */}
        {userCity && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-rose-light/40 rounded-xl text-sm text-text-primary">
            <MapPin size={16} className="text-rose-accent flex-shrink-0" />
            Showing prices near <span className="font-medium">{userCity}</span>
          </div>
        )}

        {/* Search bar row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
            />
            <input
              type="text"
              placeholder="Search procedure type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition"
            />
          </div>
          <div className="relative sm:w-48">
            <input
              type="text"
              placeholder="City or zip code"
              value={cityZip}
              onChange={(e) => setCityZip(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition"
            />
          </div>
        </div>

        {/* Sort & filter controls */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Sort dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2 rounded-xl border border-gray-200 bg-white text-sm text-text-primary focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition cursor-pointer"
            >
              <option value="most_recent">Most Recent</option>
              <option value="lowest_price">Lowest Price</option>
              <option value="highest_price">Highest Price</option>
            </select>
            <ChevronDown
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
            />
          </div>

          {/* Toggle filter panel */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm text-text-secondary hover:text-text-primary hover:border-rose-accent transition"
          >
            <SlidersHorizontal size={16} />
            Filters
          </button>
        </div>

        {/* Expanded filter controls */}
        {showFilters && (
          <div className="glow-card p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Procedure type */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Procedure Type
                </label>
                <select
                  value={filterProcedureType}
                  onChange={(e) => setFilterProcedureType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
                >
                  <option value="">All Types</option>
                  {PROCEDURE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Provider type */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Provider Type
                </label>
                <select
                  value={filterProviderType}
                  onChange={(e) => setFilterProviderType(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
                >
                  <option value="">All Providers</option>
                  {PROVIDER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {/* State */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  State
                </label>
                <select
                  value={filterState}
                  onChange={(e) => setFilterState(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
                >
                  <option value="">All States</option>
                  {US_STATES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price range */}
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Price Range
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                    className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
                  />
                  <span className="text-text-secondary text-sm">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                    className="w-full px-3 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
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
            {renderProcedureGrid()}
          </div>
        )}
      </section>
    </div>
  );
}

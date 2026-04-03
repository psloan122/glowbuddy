import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, ChevronDown, MapPin, Crosshair, SlidersHorizontal, Loader2, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getCity, setCity, getState as getGatingState, setState as setGatingState } from '../lib/gating';
import ProcedureCard from '../components/ProcedureCard';
import SpecialCard from '../components/SpecialCard';
import PriceStatsBar from '../components/PriceStatsBar';
import HeroPattern from '../components/HeroPattern';
import StarRating from '../components/StarRating';
import { PROCEDURE_TYPES, PROVIDER_TYPES, US_STATES } from '../lib/constants';

// Build a lookup map for state abbreviations → full names
const STATE_ABBR_MAP = Object.fromEntries(
  US_STATES.map((s) => [s.value.toLowerCase(), s])
);

export default function Home() {
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

  // Smart search
  const [smartQuery, setSmartQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);
  // { type: 'procedure' | 'city' | 'zip' | 'state', value: string, label: string }
  const searchRef = useRef(null);

  // Sort & extra filters
  const [sortBy, setSortBy] = useState('most_recent');
  const [filterProviderType, setFilterProviderType] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // Min rating filter
  const [minRating, setMinRating] = useState('');

  // Recent reviews
  const [recentReviews, setRecentReviews] = useState([]);

  // Near me
  const [locating, setLocating] = useState(false);

  // Location personalization (from localStorage, no account needed)
  const [userCity, setUserCity] = useState(() => getCity());
  const [userState] = useState(() => getGatingState());
  const [localCount, setLocalCount] = useState(null);

  // SEO
  useEffect(() => {
    document.title = 'GlowBuddy \u2014 Know Before You Glow';
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
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

  // Fetch recent 5-star reviews
  useEffect(() => {
    async function fetchRecentReviews() {
      const { data } = await supabase
        .from('reviews')
        .select('*, providers(name, slug)')
        .eq('status', 'active')
        .eq('rating', 5)
        .order('created_at', { ascending: false })
        .limit(5);
      setRecentReviews(data || []);
    }
    fetchRecentReviews();
  }, []);

  // Derive filter values from activeFilters for the query
  const filterProcedureType = activeFilters.find((f) => f.type === 'procedure')?.value || '';
  const filterState = activeFilters.find((f) => f.type === 'state')?.value || '';
  const filterCity = activeFilters.find((f) => f.type === 'city')?.value || '';
  const filterZip = activeFilters.find((f) => f.type === 'zip')?.value || '';

  // Fetch procedures (with filters)
  useEffect(() => {
    async function fetchProcedures() {
      setLoadingProcedures(true);

      let query = supabase
        .from('procedures')
        .select('*')
        .eq('status', 'active');

      // Filter from pills
      if (filterProcedureType) {
        query = query.eq('procedure_type', filterProcedureType);
      }
      if (filterState) {
        query = query.eq('state', filterState);
      }
      if (filterCity) {
        query = query.ilike('city', `%${filterCity}%`);
      }
      if (filterZip) {
        query = query.eq('zip_code', filterZip);
      }

      // Extra dropdown filters
      if (filterProviderType) {
        query = query.eq('provider_type', filterProviderType);
      }
      if (priceMin) {
        query = query.gte('price_paid', parseInt(priceMin, 10));
      }
      if (priceMax) {
        query = query.lte('price_paid', parseInt(priceMax, 10));
      }

      // Min rating filter
      if (minRating) {
        query = query.gte('rating', parseInt(minRating, 10));
      }

      // Sort
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

  // --- Smart search helpers ---
  function getSuggestions(query) {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    const suggestions = [];

    // Match procedure types
    for (const p of PROCEDURE_TYPES) {
      if (p.toLowerCase().includes(q)) {
        suggestions.push({ type: 'procedure', value: p, label: p });
      }
    }

    // Match state names or abbreviations
    if (q.length >= 2) {
      // Check abbreviation first
      if (STATE_ABBR_MAP[q]) {
        const s = STATE_ABBR_MAP[q];
        suggestions.push({ type: 'state', value: s.value, label: s.label });
      }
      // Check state name match
      for (const s of US_STATES) {
        if (s.label.toLowerCase().includes(q) && s.value.toLowerCase() !== q) {
          suggestions.push({ type: 'state', value: s.value, label: s.label });
        }
      }
    }

    // If 5 digits, suggest zip
    if (/^\d{5}$/.test(query.trim())) {
      suggestions.push({ type: 'zip', value: query.trim(), label: `Zip: ${query.trim()}` });
    }

    // City search fallback
    if (query.trim().length >= 2 && !/^\d+$/.test(query.trim()) && suggestions.length < 8) {
      suggestions.push({ type: 'city', value: query.trim(), label: `City: "${query.trim()}"` });
    }

    return suggestions.slice(0, 8);
  }

  function addFilter(filter) {
    setActiveFilters((prev) => [
      ...prev.filter((f) => f.type !== filter.type),
      filter,
    ]);
    setSmartQuery('');
    setShowSuggestions(false);
  }

  function removeFilter(type) {
    setActiveFilters((prev) => prev.filter((f) => f.type !== type));
  }

  function handleSearchKeyDown(e) {
    if (e.key === 'Enter' && smartQuery.trim()) {
      const suggestions = getSuggestions(smartQuery);
      if (suggestions.length > 0) {
        addFilter(suggestions[0]);
      }
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  }

  // Near me — use browser geolocation + Google Maps reverse geocoding
  async function handleNearMe() {
    if (!navigator.geolocation) return;
    setLocating(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          enableHighAccuracy: false,
        });
      });

      const { latitude, longitude } = position.coords;

      // Use Google Maps Geocoder if available
      if (window.google?.maps?.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        const result = await new Promise((resolve, reject) => {
          geocoder.geocode(
            { location: { lat: latitude, lng: longitude } },
            (results, status) => {
              if (status === 'OK' && results?.[0]) resolve(results[0]);
              else reject(new Error('Geocode failed'));
            }
          );
        });

        let city = '';
        let state = '';
        for (const comp of result.address_components) {
          if (comp.types.includes('locality')) city = comp.long_name;
          if (comp.types.includes('administrative_area_level_1')) state = comp.short_name;
        }

        if (city) {
          setCity(city);
          setUserCity(city);
          addFilter({ type: 'city', value: city, label: `Near: ${city}` });
        }
        if (state) {
          setGatingState(state);
          addFilter({ type: 'state', value: state, label: US_STATES.find((s) => s.value === state)?.label || state });
        }
      }
    } catch {
      // Geolocation denied or failed — silently ignore
    } finally {
      setLocating(false);
    }
  }

  const suggestions = getSuggestions(smartQuery);
  const hasActiveFilters = activeFilters.length > 0 || filterProviderType || priceMin || priceMax || minRating;

  return (
    <div>
      {/* Hero Section */}
      <section
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(120deg, #FDF6F0, #FBE8EF)' }}
      >
        <HeroPattern />

        <div className="relative z-10 max-w-[680px] mx-auto px-6 md:px-10 py-16 md:py-20">
          <h1 className="text-4xl md:text-[56px] md:leading-[1.1] font-medium text-text-primary mb-4 leading-tight">
            Know before you glow.
          </h1>
          <p className="text-lg md:text-xl text-text-secondary max-w-[600px] mb-8">
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

      {/* What Patients Are Saying */}
      {recentReviews.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 mt-12">
          <h2 className="text-2xl font-bold text-text-primary mb-6">
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
        )}
      </section>

      {/* Browse Feed */}
      <section className="max-w-7xl mx-auto px-4 mt-12 pb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-6">
          Recent Prices
        </h2>

        {/* "Showing prices near" banner */}
        {userCity && activeFilters.length === 0 && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-gradient-to-r from-rose-light to-warm-gray rounded-xl text-sm text-text-primary">
            <MapPin size={16} className="text-rose-accent flex-shrink-0" />
            Showing prices near <span className="font-medium">{userCity}</span>
            <button
              onClick={() => { setUserCity(null); setCity(''); }}
              className="ml-auto text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Dismiss location banner"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Smart search bar */}
        <div className="flex gap-2 mb-3" ref={searchRef}>
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
            />
            <input
              type="text"
              placeholder="Search Botox, your city, zip, or state..."
              value={smartQuery}
              onChange={(e) => {
                setSmartQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => smartQuery.trim() && setShowSuggestions(true)}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
            />

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-30 overflow-hidden">
                {suggestions.map((s, i) => (
                  <button
                    key={`${s.type}-${s.value}-${i}`}
                    onClick={() => addFilter(s)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-rose-light/40 transition-colors flex items-center gap-2"
                  >
                    <span className="text-xs uppercase tracking-wide text-text-secondary w-16 shrink-0">
                      {s.type}
                    </span>
                    <span className="text-text-primary">{s.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Near me button */}
          <button
            onClick={handleNearMe}
            disabled={locating}
            className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-text-secondary hover:text-rose-accent hover:border-rose-accent/40 transition shrink-0 disabled:opacity-50"
            title="Use my location"
          >
            {locating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Crosshair size={16} />
            )}
            <span className="hidden sm:inline">Near me</span>
          </button>
        </div>

        {/* Active filter pills */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {activeFilters.map((f) => (
              <span
                key={f.type}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm bg-rose-light text-rose-dark border border-rose-accent/20"
              >
                {f.label}
                <button
                  onClick={() => removeFilter(f.type)}
                  className="ml-0.5 hover:text-rose-accent transition-colors"
                  aria-label={`Remove ${f.label} filter`}
                >
                  <X size={14} />
                </button>
              </span>
            ))}
            <button
              onClick={() => setActiveFilters([])}
              className="text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              Clear all
            </button>
          </div>
        )}

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

        {/* Expanded extra filters (provider type + price range) */}
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
              <ProcedureCard key={proc.id} procedure={proc} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

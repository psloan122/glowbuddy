import { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Search, X, ChevronDown, MapPin, SlidersHorizontal, Map, List, TrendingDown, LocateFixed } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  getCity as getGatingCity, setCity as persistCity,
  getState as getGatingState, setState as persistState,
  setZip as persistZip,
} from '../lib/gating';
import ProcedureCard from '../components/ProcedureCard';
import FirstTimerBadge from '../components/FirstTimerBadge';
import FirstTimerModeBanner from '../components/FirstTimerModeBanner';
import FirstTimerOnboardingPrompt from '../components/FirstTimerOnboardingPrompt';
import FirstTimerGuideSheet from '../components/FirstTimerGuideSheet';
import DosageCalculator from '../components/DosageCalculator';
import {
  isFirstTimerMode, setFirstTimerMode as persistFirstTimerMode,
  addFirstTimerTreatment, getFirstTimerTreatments,
  isFirstTimerFor,
} from '../lib/firstTimerMode';
import { PROCEDURE_TYPES, PROVIDER_TYPES } from '../lib/constants';
import { searchCitiesViaGoogle } from '../lib/places';
import { assignTrustTier } from '../lib/trustTiers';
import { AuthContext } from '../App';
import { getUserActiveAlerts } from '../lib/priceAlerts';
import { loadGoogleMaps } from '../lib/loadGoogleMaps';
import { SkeletonGrid } from '../components/SkeletonCard';
import ProviderMap from '../components/ProviderMap';
import { fetchAllProvidersInBounds } from '../lib/autoPopulate';
import { providerProfileUrl } from '../lib/slugify';

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

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

const IS_MOBILE = typeof window !== 'undefined' && window.innerWidth < 768;

export default function FindPrices() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Procedures / feed
  const [procedures, setProcedures] = useState([]);
  const [loadingProcedures, setLoadingProcedures] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // --- Procedure search ---
  const [procQuery, setProcQuery] = useState('');
  const [procOpen, setProcOpen] = useState(false);
  const [selectedProc, setSelectedProc] = useState(() => searchParams.get('procedure') || '');
  const procRef = useRef(null);

  // --- Location search ---
  const [locQuery, setLocQuery] = useState('');
  const [locOpen, setLocOpen] = useState(false);
  const [locResults, setLocResults] = useState([]);
  const [locLoading, setLocLoading] = useState(false);
  const [selectedLoc, setSelectedLoc] = useState(() => {
    const urlCity = searchParams.get('city');
    const urlState = searchParams.get('state');
    if (urlCity && urlState) return { city: urlCity, state: urlState };
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
  const [showFilters, setShowFilters] = useState(false);
  const [minRating, setMinRating] = useState('');

  // First-timer state
  const [firstTimerActive, setFirstTimerActive] = useState(() => isFirstTimerMode());
  const [showGuideSheet, setShowGuideSheet] = useState(false);
  const [guideSheetTreatment, setGuideSheetTreatment] = useState('');

  // User's active price alerts (for AlertMatchBadge)
  const [userAlerts, setUserAlerts] = useState([]);

  // Location personalization
  const [fallbackLabel, setFallbackLabel] = useState('');
  const [fallbackScope, setFallbackScope] = useState(''); // 'state' | 'national'

  // Fair price averages: { [procedure_type]: { avg, scope } }
  const [fairPriceAvgs, setFairPriceAvgs] = useState({});

  // Map/List view toggle
  const [viewMode, setViewMode] = useState('list');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapProviders, setMapProviders] = useState([]);
  const [mapCenter, setMapCenter] = useState({ lat: 39.5, lng: -98.35 });
  const [mapZoom, setMapZoom] = useState(5);
  const [selectedMapProvider, setSelectedMapProvider] = useState(null);
  const mapBoundsRef = useRef(null);
  const [showSearchSheet, setShowSearchSheet] = useState(false);
  const [hasPricesOnly, setHasPricesOnly] = useState(() => searchParams.get('has_prices') === '1');

  // ── SEO meta tags — dynamic per spec ──
  useEffect(() => {
    const procedure = selectedProc;
    const city = selectedLoc?.city;
    const state = selectedLoc?.state;

    let title;
    let desc;

    if (procedure && city) {
      title = `${capitalize(procedure)} prices in ${city}, ${state} | GlowBuddy`;
      desc = `See what patients actually paid for ${procedure} in ${city}, ${state}. Real prices from verified patients. Know before you glow. Free on GlowBuddy.`;
    } else if (city) {
      title = `Med spa prices in ${city}, ${state} | GlowBuddy`;
      desc = `Compare real patient-reported prices for Botox, fillers, and more in ${city}, ${state}. Know before you glow.`;
    } else if (procedure) {
      title = `${capitalize(procedure)} prices near you | GlowBuddy`;
      desc = `See what patients actually paid for ${procedure}. Real prices from verified patients on GlowBuddy.`;
    } else {
      title = 'Find Med Spa Prices Near You | GlowBuddy';
      desc = 'Compare real patient-reported prices for Botox, lip filler, and med spa treatments. See what people actually paid near you.';
    }

    document.title = title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', desc);
  }, [selectedProc, selectedLoc]);

  // Sync filters to URL params (SEO-friendly)
  useEffect(() => {
    const params = {};
    if (selectedProc) params.procedure = selectedProc;
    if (selectedLoc?.city) params.city = selectedLoc.city;
    if (selectedLoc?.state) params.state = selectedLoc.state;
    if (sortBy !== 'most_verified') params.sort = sortBy;
    if (hasPricesOnly) params.has_prices = '1';
    setSearchParams(params, { replace: true });
  }, [selectedProc, selectedLoc, sortBy, hasPricesOnly]);

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

  // ─�� Location search helpers ──
  const searchCities = useCallback(async (q) => {
    const trimmed = q.trim();
    if (!trimmed) { setLocResults([]); return; }

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

    if (trimmed.length < 2) { setLocResults([]); return; }
    setLocLoading(true);
    try {
      const { data } = await supabase
        .from('procedures')
        .select('city, state')
        .eq('status', 'active')
        .ilike('city', `%${trimmed}%`)
        .limit(50);

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

  // ── Fetch procedures with cascading fallback ──
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
        .select('id, procedure_type, price_paid, unit, units_or_volume, provider_name, provider_type, city, state, zip_code, created_at, rating, review_body, receipt_verified, result_photo_url, has_receipt, trust_weight, trust_tier, status, is_anonymous, provider_slug, provider_id')
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
      setFallbackScope('');

      // Get total count
      const countQuery = supabase
        .from('procedures')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');
      if (filterProcedureType) countQuery.eq('procedure_type', filterProcedureType);
      countQuery.then(({ count }) => setTotalCount(count || 0));

      // 1. Try with all filters (city + state)
      const query = buildQuery({ city: filterCity, state: filterState, zip: filterZip });
      let results = await applySort(query);

      // 2. Fallback: state-level (if city had 0 results)
      if (results.length === 0 && filterCity && filterState) {
        const stateQuery = buildQuery({ city: '', state: filterState, zip: '' });
        results = await applySort(stateQuery);
        if (results.length > 0) {
          setFallbackLabel(filterState);
          setFallbackScope('state');
        }
      }

      // 3. Fallback: national (if state also had 0 results)
      if (results.length === 0 && filterState) {
        const nationalQuery = buildQuery({ city: '', state: '', zip: '' });
        results = await applySort(nationalQuery);
        if (results.length > 0) {
          setFallbackLabel('national');
          setFallbackScope('national');
        }
      }

      // 4. Final fallback: no filters at all — show most recent verified
      if (results.length === 0) {
        let fallbackAll = supabase
          .from('procedures')
          .select('id, procedure_type, price_paid, unit, units_or_volume, provider_name, provider_type, city, state, zip_code, created_at, rating, review_body, receipt_verified, result_photo_url, has_receipt, trust_weight, trust_tier, status, is_anonymous, provider_slug, provider_id')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(12);
        const { data } = await fallbackAll;
        results = data || [];
        if (results.length > 0 && (filterCity || filterState)) {
          setFallbackLabel('national');
          setFallbackScope('national');
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

  // ── Fetch fair price averages for comparison ─���
  useEffect(() => {
    if (procedures.length === 0) return;

    // Get unique procedure types from results
    const procTypes = [...new Set(procedures.map((p) => p.procedure_type).filter(Boolean))];
    if (procTypes.length === 0) return;

    async function fetchAvgs() {
      const avgs = {};

      for (const procType of procTypes) {
        // Try city-level first (need >= 3 submissions)
        if (filterCity && filterState) {
          const { data: cityData } = await supabase
            .from('procedures')
            .select('price_paid')
            .eq('status', 'active')
            .eq('procedure_type', procType)
            .ilike('city', `%${filterCity}%`);
          if (cityData && cityData.length >= 3) {
            const avg = cityData.reduce((s, r) => s + r.price_paid, 0) / cityData.length;
            avgs[procType] = { avg: Math.round(avg), scope: filterCity };
            continue;
          }
        }

        // Try state-level (need >= 3)
        const stateToUse = filterState || (selectedLoc?.state);
        if (stateToUse) {
          const { data: stateData } = await supabase
            .from('procedures')
            .select('price_paid')
            .eq('status', 'active')
            .eq('procedure_type', procType)
            .eq('state', stateToUse);
          if (stateData && stateData.length >= 3) {
            const avg = stateData.reduce((s, r) => s + r.price_paid, 0) / stateData.length;
            avgs[procType] = { avg: Math.round(avg), scope: stateToUse };
            continue;
          }
        }

        // National avg
        const { data: natData } = await supabase
          .from('procedures')
          .select('price_paid')
          .eq('status', 'active')
          .eq('procedure_type', procType);
        if (natData && natData.length >= 3) {
          const avg = natData.reduce((s, r) => s + r.price_paid, 0) / natData.length;
          avgs[procType] = { avg: Math.round(avg), scope: 'national' };
        }
      }

      setFairPriceAvgs(avgs);
    }

    fetchAvgs();
  }, [procedures, filterCity, filterState]);

  const hasActiveFilters = selectedProc || selectedLoc || filterProviderType || priceMin || priceMax || minRating || hasPricesOnly;

  // ��─ Map view helpers ──
  function handleSwitchToMap() {
    setMapLoaded(true);
    setViewMode('map');
  }

  useEffect(() => {
    if (!mapLoaded) return;
    if (selectedLoc) {
      const waitAndGeocode = async () => {
        if (!window.google?.maps?.Geocoder) {
          try {
            await loadGoogleMaps();
            await new Promise((r) => {
              const check = () => window.google?.maps?.Geocoder ? r() : setTimeout(check, 100);
              check();
            });
          } catch { return; }
        }
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode(
          { address: `${selectedLoc.city}, ${selectedLoc.state}, USA` },
          (results, status) => {
            if (status === 'OK' && results?.[0]) {
              const loc = results[0].geometry.location;
              setMapCenter({ lat: loc.lat(), lng: loc.lng() });
              setMapZoom(IS_MOBILE ? 12 : 11);
            }
          }
        );
      };
      waitAndGeocode();
    }
  }, [mapLoaded, selectedLoc?.city, selectedLoc?.state]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchMapProviders = useCallback(async (bounds) => {
    const data = await fetchAllProvidersInBounds(bounds, filterProcedureType);
    setMapProviders(data);
  }, [filterProcedureType]);

  function handleMapBoundsChanged(bounds) {
    mapBoundsRef.current = bounds;
    fetchMapProviders(bounds);
  }

  // Recenter map on user's current location
  async function handleRecenterOnUser() {
    if (!navigator.geolocation) return;
    try {
      const coords = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          reject,
          { timeout: 5000 }
        );
      });
      setMapCenter(coords);
      setMapZoom(IS_MOBILE ? 12 : 11);
    } catch {
      // Permission denied or timeout
    }
  }

  function clearAllFilters() {
    setSelectedProc('');
    setProcQuery('');
    setSelectedLoc(null);
    setLocQuery('');
    setFilterProviderType('');
    setPriceMin('');
    setPriceMax('');
    setMinRating('');
    setSortBy('most_verified');
    setHasPricesOnly(false);
  }

  // ── Fair price indicator for a procedure ──
  function getFairPriceIndicator(proc) {
    const avgInfo = fairPriceAvgs[proc.procedure_type];
    if (!avgInfo) return null;
    if (proc.price_paid < avgInfo.avg) {
      const scopeLabel = avgInfo.scope === 'national'
        ? 'national average'
        : `average for ${avgInfo.scope}`;
      return { below: true, label: `Below ${scopeLabel}` };
    }
    return null;
  }

  // ── Filter panel content (shared between desktop inline + mobile sheet) ──
  function renderFilterControls() {
    return (
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Sort by</label>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-gray-200 bg-white text-sm text-text-primary focus:border-rose-accent outline-none transition cursor-pointer"
            >
              <option value="most_verified">Most Verified</option>
              <option value="most_recent">Most Recent</option>
              <option value="lowest_price">Lowest Price</option>
              <option value="highest_price">Highest Price</option>
              <option value="highest_rated">Highest Rated</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Min Rating</label>
          <div className="relative">
            <select
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-gray-200 bg-white text-sm text-text-primary focus:border-rose-accent outline-none transition cursor-pointer"
            >
              <option value="">Any</option>
              <option value="3">3+ Stars</option>
              <option value="4">4+ Stars</option>
              <option value="5">5 Stars Only</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Provider Type</label>
          <div className="relative">
            <select
              value={filterProviderType}
              onChange={(e) => setFilterProviderType(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-gray-200 bg-white text-sm text-text-primary focus:border-rose-accent outline-none transition cursor-pointer"
            >
              <option value="">All Providers</option>
              {PROVIDER_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1">Price Range</label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              placeholder="Min"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              className="w-20 px-2.5 py-2 rounded-lg border border-gray-200 text-sm focus:border-rose-accent outline-none transition"
            />
            <span className="text-text-secondary text-xs">to</span>
            <input
              type="number"
              placeholder="Max"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              className="w-20 px-2.5 py-2 rounded-lg border border-gray-200 text-sm focus:border-rose-accent outline-none transition"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-xs text-rose-accent hover:text-rose-dark transition-colors py-2"
          >
            Clear all
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-white">
      {/* Sticky search header */}
      <div className="sticky top-16 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          {/* Mobile map: collapsed search pill */}
          {IS_MOBILE && viewMode === 'map' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSearchSheet(true)}
                className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-text-secondary truncate"
              >
                <Search size={15} className="shrink-0 text-text-secondary" />
                <span className="truncate">
                  {selectedProc || selectedLoc
                    ? [selectedProc, selectedLoc ? `${selectedLoc.city}, ${selectedLoc.state}` : ''].filter(Boolean).join(' \u00B7 ')
                    : 'Search treatments & location'}
                </span>
              </button>
              <button
                onClick={() => setShowFilters(true)}
                className={`shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl border text-sm transition ${
                  showFilters
                    ? 'border-rose-accent bg-rose-light text-rose-dark'
                    : 'border-gray-200 bg-white text-text-secondary'
                }`}
              >
                <SlidersHorizontal size={16} />
              </button>
              <button
                onClick={() => setHasPricesOnly((prev) => !prev)}
                className="shrink-0"
                style={{
                  padding: '7px 14px',
                  background: hasPricesOnly ? '#FBE8EF' : 'white',
                  border: `1px solid ${hasPricesOnly ? '#C94F78' : '#E5E7EB'}`,
                  borderRadius: '100px',
                  color: hasPricesOnly ? '#C94F78' : '#6B7280',
                  fontSize: '13px',
                  fontWeight: hasPricesOnly ? '500' : '400',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {hasPricesOnly && <span style={{ fontSize: '11px' }}>&#10003;</span>}
                Has prices
              </button>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden shrink-0">
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1 px-2.5 py-2 text-xs font-medium transition ${
                    viewMode === 'list'
                      ? 'bg-rose-accent text-white'
                      : 'bg-white text-text-secondary'
                  }`}
                >
                  <List size={14} />
                </button>
                <button
                  onClick={handleSwitchToMap}
                  className={`flex items-center gap-1 px-2.5 py-2 text-xs font-medium transition border-l border-gray-200 ${
                    viewMode === 'map'
                      ? 'bg-rose-accent text-white'
                      : 'bg-white text-text-secondary'
                  }`}
                >
                  <Map size={14} />
                </button>
              </div>
            </div>
          ) : (
          <>
          <div className="flex flex-col md:flex-row gap-2">
            {/* Procedure search */}
            <div ref={procRef} className="relative md:flex-1">
              {selectedProc ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-white">
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
                    placeholder="Search treatments (Botox, filler, laser...)"
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
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
                  />
                </>
              )}

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
            <div ref={locRef} className="relative md:w-[320px]">
              {selectedLoc ? (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-white">
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
                    placeholder="City or zip code"
                    value={locQuery}
                    onChange={(e) => handleLocInput(e.target.value)}
                    onFocus={() => locQuery.trim() && setLocOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && locResults.length > 0) selectLocation(locResults[0]);
                      if (e.key === 'Escape') setLocOpen(false);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm"
                  />
                </>
              )}

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

            {/* Filter toggle + Has prices chip + view toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition ${
                  showFilters
                    ? 'border-rose-accent bg-rose-light text-rose-dark'
                    : 'border-gray-200 bg-white text-text-secondary hover:border-rose-accent'
                }`}
              >
                <SlidersHorizontal size={16} />
                <span className="hidden sm:inline">Filters</span>
              </button>

              <button
                onClick={() => setHasPricesOnly((prev) => !prev)}
                style={{
                  padding: '7px 14px',
                  background: hasPricesOnly ? '#FBE8EF' : 'white',
                  border: `1px solid ${hasPricesOnly ? '#C94F78' : '#E5E7EB'}`,
                  borderRadius: '100px',
                  color: hasPricesOnly ? '#C94F78' : '#6B7280',
                  fontSize: '13px',
                  fontWeight: hasPricesOnly ? '500' : '400',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {hasPricesOnly && <span style={{ fontSize: '11px' }}>&#10003;</span>}
                Has prices
              </button>

              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1 px-3 py-2 text-xs font-medium transition ${
                    viewMode === 'list'
                      ? 'bg-rose-accent text-white'
                      : 'bg-white text-text-secondary hover:bg-gray-50'
                  }`}
                >
                  <List size={14} />
                  List
                </button>
                <button
                  onClick={handleSwitchToMap}
                  className={`flex items-center gap-1 px-3 py-2 text-xs font-medium transition border-l border-gray-200 ${
                    viewMode === 'map'
                      ? 'bg-rose-accent text-white'
                      : 'bg-white text-text-secondary hover:bg-gray-50'
                  }`}
                >
                  <Map size={14} />
                  Map
                </button>
              </div>
            </div>
          </div>

          {/* Desktop filter panel (hidden on mobile) */}
          {showFilters && (
            <div className="hidden md:block mt-3 pt-3 border-t border-gray-100">
              {renderFilterControls()}
            </div>
          )}
          </>
          )}
        </div>
      </div>

      {/* Mobile search sheet (expands from collapsed pill) */}
      {showSearchSheet && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSearchSheet(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-[85vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">Search</h3>
              <button onClick={() => setShowSearchSheet(false)} className="text-text-secondary hover:text-text-primary">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Procedure search */}
              <div ref={procRef}>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Treatment</label>
                {selectedProc ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-white">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm bg-rose-light text-rose-dark border border-rose-accent/20">
                      {selectedProc}
                      <button onClick={clearProcedure}><X size={14} /></button>
                    </span>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                    <input
                      type="text"
                      placeholder="Search treatments..."
                      value={procQuery}
                      onChange={(e) => { setProcQuery(e.target.value); setProcOpen(true); }}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-rose-accent outline-none text-sm"
                    />
                    {procOpen && procQuery.trim() && procMatches.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-30 overflow-hidden">
                        {procMatches.map((p) => (
                          <button key={p} onClick={() => selectProcedure(p)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-rose-light/40 text-text-primary">
                            {p}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Location search */}
              <div ref={locRef}>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Location</label>
                {selectedLoc ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-white">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm bg-rose-light text-rose-dark border border-rose-accent/20">
                      <MapPin size={12} />
                      {selectedLoc.city}{selectedLoc.state ? `, ${selectedLoc.state}` : ''}
                      <button onClick={clearLocation}><X size={14} /></button>
                    </span>
                  </div>
                ) : (
                  <div className="relative">
                    <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                    <input
                      type="text"
                      placeholder="City or zip code"
                      value={locQuery}
                      onChange={(e) => handleLocInput(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-rose-accent outline-none text-sm"
                    />
                    {locOpen && locQuery.trim() && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-30 overflow-hidden">
                        {locLoading ? (
                          <div className="px-4 py-3 text-sm text-text-secondary animate-pulse">Searching...</div>
                        ) : locResults.length > 0 ? (
                          locResults.map((loc, i) => (
                            <button key={`${loc.city}-${loc.state}-${i}`} onClick={() => selectLocation(loc)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-rose-light/40 flex items-center gap-2 text-text-primary">
                              <MapPin size={14} className="text-text-secondary shrink-0" />
                              {loc.city}{loc.state ? `, ${loc.state}` : ''}{loc.zip ? ` (${loc.zip})` : ''}
                            </button>
                          ))
                        ) : locQuery.trim().length >= 2 ? (
                          <div className="px-4 py-3 text-sm text-text-secondary">No locations found</div>
                        ) : null}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4">
              <button
                onClick={() => setShowSearchSheet(false)}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition"
                style={{ backgroundColor: '#C94F78' }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile filter bottom sheet */}
      {showFilters && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowFilters(false)}
          />
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-[80vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-text-primary">Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-text-secondary hover:text-text-primary"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5">
              {renderFilterControls()}
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4">
              <button
                onClick={() => setShowFilters(false)}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm hover:opacity-90 transition"
                style={{ backgroundColor: '#C94F78' }}
              >
                Apply filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results area */}
      <div className={`max-w-7xl mx-auto ${IS_MOBILE && viewMode === 'map' ? 'px-0 py-0' : 'px-4 py-6'}`}>
        {/* Results header — hidden in mobile map */}
        {!(IS_MOBILE && viewMode === 'map') && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-text-primary">
              {hasPricesOnly
                ? (selectedProc
                    ? `Providers with ${selectedProc} Prices`
                    : 'Providers with Prices')
                : (selectedProc
                    ? `${selectedProc} Prices`
                    : 'All Treatment Prices')}
              {selectedLoc && !fallbackScope ? ` in ${selectedLoc.city}, ${selectedLoc.state}` : ''}
            </h1>
            {!loadingProcedures && (
              <p className="text-sm text-text-secondary mt-0.5">
                {procedures.length}{hasPricesOnly ? ' provider' : ' result'}{procedures.length !== 1 ? 's' : ''}
                {hasPricesOnly ? ' with prices' : ''}
                {totalCount > 0 && !hasActiveFilters && ` of ${totalCount.toLocaleString()} total`}
              </p>
            )}
          </div>
        </div>
        )}

        {/* First-Timer Mode Banner — hidden in map view */}
        {viewMode !== 'map' && firstTimerActive && (
          <FirstTimerModeBanner
            onOpenGuide={() => {
              const treatments = getFirstTimerTreatments();
              setGuideSheetTreatment(treatments[0] || selectedProc);
              setShowGuideSheet(true);
            }}
            onDeactivate={() => {
              persistFirstTimerMode(false);
              setFirstTimerActive(false);
            }}
          />
        )}

        {/* First-Timer Onboarding Prompt — hidden in map view */}
        {viewMode !== 'map' && selectedProc && !firstTimerActive && (
          <FirstTimerOnboardingPrompt
            key={selectedProc}
            treatmentName={selectedProc}
            onActivated={() => {
              addFirstTimerTreatment(selectedProc);
              persistFirstTimerMode(true);
              setFirstTimerActive(true);
              setGuideSheetTreatment(selectedProc);
              setShowGuideSheet(true);
            }}
            onDismissed={() => {}}
          />
        )}

        {/* Dosage Calculator — hidden in map view */}
        {viewMode !== 'map' && firstTimerActive && selectedProc && isFirstTimerFor(selectedProc) && (
          <DosageCalculator treatmentName={selectedProc} />
        )}

        {/* Fallback note */}
        {fallbackLabel && viewMode === 'list' && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-100 mb-4 text-sm" style={{ color: '#92400E' }}>
            {fallbackScope === 'national'
              ? `Showing national prices \u2014 no results found near ${filterCity || filterState}`
              : `No prices in ${filterCity} yet \u2014 showing ${fallbackLabel} prices`}
            <Link to="/log" className="font-medium underline ml-auto shrink-0">Be the first</Link>
          </div>
        )}

        {/* Map view */}
        {mapLoaded && (
          <div
            className={`relative overflow-hidden ${IS_MOBILE ? '' : 'rounded-xl border border-gray-200'}`}
            style={{
              height: IS_MOBILE
                ? 'calc(100dvh - 64px - 60px - 56px - env(safe-area-inset-bottom, 0px))'
                : 'calc(100vh - 220px)',
              minHeight: IS_MOBILE ? 0 : 400,
              display: viewMode === 'map' ? 'block' : 'none',
            }}
          >
            <ProviderMap
              providers={mapProviders}
              center={mapCenter}
              zoom={mapZoom}
              selectedProvider={selectedMapProvider}
              onSelectProvider={setSelectedMapProvider}
              onBoundsChanged={handleMapBoundsChanged}
              procedureFilter={filterProcedureType}
              hasPricesOnly={hasPricesOnly}
            />

            {/* Floating "Has prices" pill on mobile map */}
            {IS_MOBILE && (
              <button
                onClick={() => setHasPricesOnly((prev) => !prev)}
                className="absolute top-3 left-1/2 -translate-x-1/2 z-10"
                style={{
                  padding: '8px 16px',
                  background: hasPricesOnly ? '#C94F78' : 'white',
                  color: hasPricesOnly ? 'white' : '#1A1A1A',
                  border: 'none',
                  borderRadius: '100px',
                  fontSize: '13px',
                  fontWeight: '500',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  cursor: 'pointer',
                }}
              >
                {hasPricesOnly ? '\u2713 Showing prices only' : 'Show spas with prices'}
              </button>
            )}

            {/* Floating locate button */}
            <button
              onClick={handleRecenterOnUser}
              className="absolute bottom-4 right-3 z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white shadow-md border border-gray-200 hover:bg-gray-50 active:scale-95 transition"
              aria-label="Center on my location"
            >
              <LocateFixed size={18} className="text-text-primary" />
            </button>
          </div>
        )}

        {/* Mobile bottom sheet for selected provider */}
        {IS_MOBILE && viewMode === 'map' && selectedMapProvider && (
          <div className="fixed inset-0 z-50" onClick={() => setSelectedMapProvider(null)}>
            <div className="absolute inset-0 bg-black/30" />
            <div
              className="absolute bottom-14 left-0 right-0 bg-white rounded-t-2xl shadow-2xl animate-slide-up"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-300" />
              </div>
              <div className="px-5 pb-5">
                <h3 className="text-base font-bold text-text-primary truncate">
                  {selectedMapProvider.provider_name}
                </h3>
                <p className="text-sm text-text-secondary mt-0.5">
                  {[selectedMapProvider.city, selectedMapProvider.state].filter(Boolean).join(', ')}
                  {selectedMapProvider.google_rating ? ` \u00B7 \u2605 ${Number(selectedMapProvider.google_rating).toFixed(1)}` : ''}
                </p>

                {selectedMapProvider.has_submissions && selectedMapProvider.avg_price > 0 && (
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-2xl font-bold" style={{ color: '#C94F78' }}>
                      ${Math.round(selectedMapProvider.avg_price)}
                    </span>
                    <span className="text-xs text-text-secondary">avg reported price</span>
                    {selectedMapProvider.submission_count > 0 && (
                      <span className="text-xs text-text-secondary">
                        ({selectedMapProvider.submission_count} submission{selectedMapProvider.submission_count !== 1 ? 's' : ''})
                      </span>
                    )}
                  </div>
                )}

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => {
                      setSelectedMapProvider(null);
                      navigate(providerProfileUrl(selectedMapProvider));
                    }}
                    className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition hover:opacity-90"
                    style={{ backgroundColor: '#C94F78' }}
                  >
                    View Profile
                  </button>
                  <Link
                    to={`/log?provider=${encodeURIComponent(selectedMapProvider.provider_name)}`}
                    onClick={() => setSelectedMapProvider(null)}
                    className="flex-1 py-2.5 rounded-xl text-center text-sm font-semibold border border-gray-200 text-text-primary hover:bg-gray-50 transition"
                  >
                    Add Price
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* List view */}
        {viewMode === 'list' && (
          <>
            {loadingProcedures ? (
              <SkeletonGrid count={6} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {procedures.map((proc) => {
                  const indicator = getFairPriceIndicator(proc);
                  return (
                    <div key={proc.id}>
                      <ProcedureCard procedure={proc} firstTimerActive={firstTimerActive} userAlerts={userAlerts} />
                      {indicator && indicator.below && (
                        <div className="flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
                          <TrendingDown size={13} className="text-emerald-600 shrink-0" />
                          <span className="text-[11px] font-medium text-emerald-700">
                            {'\u2193'} {indicator.label}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* First-Timer Guide Sheet */}
      {showGuideSheet && guideSheetTreatment && (
        <FirstTimerGuideSheet
          treatmentName={guideSheetTreatment}
          onClose={() => setShowGuideSheet(false)}
          onActivateMode={() => {
            addFirstTimerTreatment(guideSheetTreatment);
            persistFirstTimerMode(true);
            setFirstTimerActive(true);
            setShowGuideSheet(false);
          }}
        />
      )}
    </div>
  );
}

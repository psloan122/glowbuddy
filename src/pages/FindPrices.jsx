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
import {
  PROCEDURE_TYPES,
  PROVIDER_TYPES,
  resolveProcedureFilter,
  makeProcedureFilterFromCanonical,
  makeProcedureFilterFromPill,
  findPillByLabel,
} from '../lib/constants';
import ProcedureGate from '../components/ProcedureGate';
import { searchCitiesViaGoogle } from '../lib/places';
import { assignTrustTier } from '../lib/trustTiers';
import { AuthContext } from '../App';
import { getUserActiveAlerts } from '../lib/priceAlerts';
import { loadGoogleMaps } from '../lib/loadGoogleMaps';
import { normalizePrice } from '../lib/priceUtils';
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
  // procFilter is the source of truth for what procedure(s) we filter on.
  // It's null when the gate is open. The legacy `selectedProc` string is
  // derived from procFilter.primary so existing UI / first-timer logic
  // keeps working without further refactoring.
  const [procFilter, setProcFilter] = useState(() =>
    resolveProcedureFilter(searchParams.get('procedure'))
  );
  const selectedProc = procFilter?.primary || '';
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
  const [sortBy, setSortBy] = useState('most_recent');
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
    // Prefer the friendly pill label ("Botox") over the canonical
    // procedure name ("Botox / Dysport / Xeomin") so titles read naturally
    // when crawlers / shared links resolve a category slug.
    const procedure = procFilter?.label || selectedProc;
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
  }, [procFilter, selectedLoc]);

  // Sync filters to URL params (SEO-friendly)
  useEffect(() => {
    const params = {};
    if (procFilter) params.procedure = procFilter.slug;
    if (selectedLoc?.city) params.city = selectedLoc.city;
    if (selectedLoc?.state) params.state = selectedLoc.state;
    if (sortBy !== 'most_verified') params.sort = sortBy;
    if (hasPricesOnly) params.has_prices = '1';
    setSearchParams(params, { replace: true });
  }, [procFilter, selectedLoc, sortBy, hasPricesOnly]);

  // Fetch user's active price alerts for match badges
  useEffect(() => {
    getUserActiveAlerts().then(setUserAlerts);
  }, []);

  // Restore procFilter from URL on back/forward navigation
  useEffect(() => {
    const urlSlug = searchParams.get('procedure') || '';
    const currentSlug = procFilter?.slug || '';
    if (urlSlug !== currentSlug) {
      setProcFilter(resolveProcedureFilter(urlSlug));
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setProcFilter(makeProcedureFilterFromCanonical(proc));
    setProcQuery('');
    setProcOpen(false);
  }

  function selectPill(pill) {
    setProcFilter(makeProcedureFilterFromPill(pill));
    setProcQuery('');
    setProcOpen(false);
  }

  function clearProcedure() {
    setProcFilter(null);
    setProcQuery('');
  }

  // If the user types "botox" / "fillers" / "laser" into the search input,
  // resolve to a category pill on Enter so they don't have to click twice.
  function resolveProcedureFromQuery(q) {
    const matchedPill = findPillByLabel(q);
    if (matchedPill) return makeProcedureFilterFromPill(matchedPill);
    if (procMatches.length > 0) return makeProcedureFilterFromCanonical(procMatches[0]);
    return null;
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
  const filterProcedureTypes = procFilter?.procedureTypes || [];
  const filterFuzzyToken = procFilter?.fuzzyToken || null;
  // Legacy single-procedure variable kept for places that need a single
  // canonical name (first-timer mode, guides, dosage calculator).
  const filterProcedureType = selectedProc;
  const filterCity = selectedLoc?.city || '';
  const filterState = selectedLoc?.state || '';
  const filterZip = selectedLoc?.zip || '';

  // ── Fetch procedures + provider_pricing with cascading fallback ──
  // Both sources are merged into a single feed. Patient submissions come from
  // `procedures`; provider-uploaded / scraped rows come from `provider_pricing`
  // joined to `providers`. Each row carries a `data_source` so the card can
  // render a distinct badge ("Patient reported" vs "From provider website").
  useEffect(() => {
    // Fuzzy procedure-type match for provider_pricing, since `procedures` uses
    // canonical names like "Botox / Dysport / Xeomin" but `provider_pricing`
    // stores lowercase strings like "botox" from the scraper.
    function fuzzyProcedureToken(t) {
      if (!t) return null;
      return t.split(/[\s/]+/).filter(Boolean)[0] || null;
    }

    function buildProcedureQuery({ city, state, zip }) {
      let query = supabase
        .from('procedures')
        .select('id, procedure_type, price_paid, unit, units_or_volume, provider_name, provider_type, city, state, zip_code, created_at, rating, review_body, receipt_verified, result_photo_url, has_receipt, trust_weight, trust_tier, status, is_anonymous, provider_slug, provider_id')
        .eq('status', 'active');

      if (filterProcedureTypes.length === 1) {
        query = query.eq('procedure_type', filterProcedureTypes[0]);
      } else if (filterProcedureTypes.length > 1) {
        query = query.in('procedure_type', filterProcedureTypes);
      }
      if (state) query = query.eq('state', state);
      if (city) query = query.ilike('city', `%${city}%`);
      if (zip) query = query.eq('zip_code', zip);
      if (filterProviderType) query = query.eq('provider_type', filterProviderType);
      if (priceMin) query = query.gte('price_paid', parseInt(priceMin, 10));
      if (priceMax) query = query.lte('price_paid', parseInt(priceMax, 10));
      if (minRating) query = query.gte('rating', parseInt(minRating, 10));
      return query;
    }

    async function fetchProcedureRows(filters) {
      const query = buildProcedureQuery(filters)
        .order('created_at', { ascending: false })
        .limit(40);
      const { data, error } = await query;
      if (error) {
        console.warn('procedures fetch failed:', error.message);
        return [];
      }
      return (data || []).map((r) => ({
        ...r,
        data_source: r.data_source || 'patient_reported',
      }));
    }

    async function fetchProviderPricingRows({ city, state }) {
      // provider_pricing has no rating column, so honor a min-rating filter
      // by excluding it from this source entirely.
      if (minRating) return [];

      let query = supabase
        .from('provider_pricing')
        .select(
          'id, provider_id, procedure_type, brand, treatment_area, units_or_volume, price, price_label, notes, source, verified, source_url, scraped_at, created_at, providers!inner(id, name, slug, city, state, zip_code, provider_type)'
        )
        .eq('is_active', true);

      if (state) query = query.eq('providers.state', state);
      if (city) query = query.ilike('providers.city', `%${city}%`);
      if (filterFuzzyToken) {
        query = query.ilike('procedure_type', `%${filterFuzzyToken}%`);
      } else if (filterProcedureType) {
        const token = fuzzyProcedureToken(filterProcedureType);
        if (token) query = query.ilike('procedure_type', `%${token}%`);
      }
      if (filterProviderType) query = query.eq('providers.provider_type', filterProviderType);
      if (priceMin) query = query.gte('price', parseInt(priceMin, 10));
      if (priceMax) query = query.lte('price', parseInt(priceMax, 10));
      query = query
        .order('scraped_at', { ascending: false, nullsFirst: false })
        .limit(40);

      const { data, error } = await query;
      if (error) {
        console.warn('provider_pricing fetch failed:', error.message);
        return [];
      }

      return (data || []).map((row) => {
        const provider = row.providers || {};
        // Normalize the price so search results show "$200 area (~$10/u est.)"
        // instead of just "$200" — keeps shoppers from getting tricked by
        // flat-rate prices that look expensive but aren't.
        const normalized = normalizePrice({
          procedure_type: row.procedure_type,
          price: row.price,
          price_label: row.price_label,
          treatment_area: row.treatment_area,
          units_or_volume: row.units_or_volume,
        });
        return {
          // Prefix the id so it never collides with a procedures.id and so
          // anything that downstream-writes to `procedures` will visibly fail
          // rather than silently corrupt the wrong row.
          id: `pp_${row.id}`,
          procedure_type: row.procedure_type,
          brand: row.brand || null,
          treatment_area: row.treatment_area || null,
          price_paid: Number(row.price) || 0,
          unit: null,
          units_or_volume: row.units_or_volume || row.price_label || null,
          provider_name: provider.name || 'Unknown provider',
          provider_type: provider.provider_type || null,
          city: provider.city || '',
          state: provider.state || '',
          zip_code: provider.zip_code || null,
          created_at: row.scraped_at || row.created_at,
          rating: null,
          review_body: null,
          receipt_verified: false,
          result_photo_url: null,
          has_receipt: false,
          trust_weight: null,
          trust_tier: null,
          status: 'active',
          is_anonymous: false,
          provider_slug: provider.slug || null,
          provider_id: row.provider_id,
          // Defense in depth: never pipe scraped notes into the consumer card.
          // Notes from scraped rows can only have come from internal classifier
          // diagnostics — they are never genuine provider copy.
          notes: row.source === 'scrape' ? null : (row.notes || null),
          data_source: 'provider_website',
          // Normalized fields consumed by ProcedureCard
          normalized_display: normalized.displayPrice,
          normalized_compare_value: normalized.comparableValue,
          normalized_compare_unit: normalized.compareUnit,
          normalized_is_estimate: normalized.isEstimate,
          normalized_tooltip: normalized.tooltip,
          // Internals used by the merge sort, prefixed _ so they're clearly
          // not part of the procedures schema.
          _verified: row.verified === true,
          _source: row.source,
          _source_url: row.source_url,
        };
      });
    }

    function trustWeightForRow(row) {
      if (row.data_source === 'provider_website') {
        // Provider-uploaded + verified outranks scraped public menus.
        return row._verified && row._source === 'manual' ? 1.5 : 0.6;
      }
      return computeTrustWeight(row);
    }

    function mergeAndSort(procRows, provRows) {
      const merged = [...procRows, ...provRows];

      // Sort by the comparable per-unit value when present so that a $200
      // forehead area sits next to a $10/unit price (both represent ~$10/unit),
      // not at the $200 end of the list. Falls back to raw price_paid when
      // there's no per-unit equivalent.
      const sortKey = (r) => {
        const cv = r.normalized_compare_value;
        if (cv != null && Number.isFinite(cv) && cv > 0) return cv;
        return Number(r.price_paid) || 0;
      };

      if (sortBy === 'lowest_price') {
        return merged
          .filter((r) => Number(r.price_paid) > 0)
          .sort((a, b) => sortKey(a) - sortKey(b))
          .slice(0, 20);
      }
      if (sortBy === 'highest_price') {
        return merged
          .filter((r) => Number(r.price_paid) > 0)
          .sort((a, b) => sortKey(b) - sortKey(a))
          .slice(0, 20);
      }
      if (sortBy === 'highest_rated') {
        // Only patient submissions carry ratings.
        return merged
          .filter((r) => r.rating != null)
          .sort((a, b) => Number(b.rating) - Number(a.rating))
          .slice(0, 20);
      }
      if (sortBy === 'most_verified') {
        return merged
          .slice()
          .sort((a, b) => trustWeightForRow(b) - trustWeightForRow(a))
          .slice(0, 20);
      }
      // most_recent (default)
      return merged
        .slice()
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, 20);
    }

    async function fetchAtScope(filters) {
      const [proc, prov] = await Promise.all([
        fetchProcedureRows(filters),
        fetchProviderPricingRows({ city: filters.city, state: filters.state }),
      ]);
      return mergeAndSort(proc, prov);
    }

    async function fetchProcedures() {
      // Gate: if no procedure has been picked yet, don't fetch anything —
      // the UI shows the ProcedureGate prompt instead. This avoids
      // surfacing apples-to-oranges prices and saves a round-trip.
      if (filterProcedureTypes.length === 0) {
        setProcedures([]);
        setLoadingProcedures(false);
        setFallbackLabel('');
        setFallbackScope('');
        return;
      }

      setLoadingProcedures(true);
      setFallbackLabel('');
      setFallbackScope('');

      // Total count = procedures + provider_pricing (both narrowed by
      // procedure_type when set, so the "of N total" copy is meaningful).
      Promise.all([
        (() => {
          let q = supabase
            .from('procedures')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'active');
          if (filterProcedureTypes.length === 1) {
            q = q.eq('procedure_type', filterProcedureTypes[0]);
          } else if (filterProcedureTypes.length > 1) {
            q = q.in('procedure_type', filterProcedureTypes);
          }
          return q;
        })(),
        (() => {
          let q = supabase
            .from('provider_pricing')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true);
          if (filterFuzzyToken) {
            q = q.ilike('procedure_type', `%${filterFuzzyToken}%`);
          }
          return q;
        })(),
      ]).then(([procCnt, provCnt]) =>
        setTotalCount((procCnt.count || 0) + (provCnt.count || 0))
      );

      // 1. City + state
      let results = await fetchAtScope({
        city: filterCity,
        state: filterState,
        zip: filterZip,
      });

      // 2. State-level fallback
      if (results.length === 0 && filterCity && filterState) {
        results = await fetchAtScope({ city: '', state: filterState, zip: '' });
        if (results.length > 0) {
          setFallbackLabel(filterState);
          setFallbackScope('state');
        }
      }

      // 3. National fallback
      if (results.length === 0 && filterState) {
        results = await fetchAtScope({ city: '', state: '', zip: '' });
        if (results.length > 0) {
          setFallbackLabel('national');
          setFallbackScope('national');
        }
      }

      // 4. Catch-all most-recent (no filters at all)
      if (results.length === 0) {
        const [proc, prov] = await Promise.all([
          fetchProcedureRows({ city: '', state: '', zip: '' }),
          fetchProviderPricingRows({ city: '', state: '' }),
        ]);
        results = [...proc, ...prov]
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          .slice(0, 12);
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
    procFilter,
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
    const data = await fetchAllProvidersInBounds(bounds, procFilter);
    // When the gate is open (no procFilter), strip pricing context so the
    // map renders providers as dots only — no price pins until the user
    // commits to a procedure.
    if (!procFilter) {
      setMapProviders(
        data.map((p) => ({
          ...p,
          has_submissions: false,
          has_per_unit_price: false,
          per_unit_avg: 0,
          submission_count: 0,
        }))
      );
      return;
    }
    setMapProviders(data);
  }, [procFilter]);

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
    setProcFilter(null);
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
    const editorialLabel = {
      display: 'block',
      fontSize: '10px',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.10em',
      color: '#666',
      marginBottom: '6px',
      fontFamily: 'var(--font-body)',
    };
    const editorialSelect = {
      appearance: 'none',
      padding: '8px 32px 8px 12px',
      borderRadius: '2px',
      border: '1px solid #333',
      background: '#111',
      color: '#fff',
      fontFamily: 'var(--font-body)',
      fontSize: '11px',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      cursor: 'pointer',
      outline: 'none',
    };
    const editorialInput = {
      width: '88px',
      padding: '8px 12px',
      borderRadius: '2px',
      border: '1px solid #333',
      background: '#fff',
      color: '#111',
      fontFamily: 'var(--font-body)',
      fontSize: '12px',
      outline: 'none',
    };
    return (
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label style={editorialLabel}>Sort by</label>
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={editorialSelect}
            >
              <option value="most_verified">Most Verified</option>
              <option value="most_recent">Most Recent</option>
              <option value="lowest_price">Lowest Price</option>
              <option value="highest_price">Highest Price</option>
              <option value="highest_rated">Highest Rated</option>
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#fff' }} />
          </div>
        </div>

        <div>
          <label style={editorialLabel}>Min Rating</label>
          <div className="relative">
            <select
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              style={editorialSelect}
            >
              <option value="">Any</option>
              <option value="3">3+ Stars</option>
              <option value="4">4+ Stars</option>
              <option value="5">5 Stars Only</option>
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#fff' }} />
          </div>
        </div>

        <div>
          <label style={editorialLabel}>Provider Type</label>
          <div className="relative">
            <select
              value={filterProviderType}
              onChange={(e) => setFilterProviderType(e.target.value)}
              style={editorialSelect}
            >
              <option value="">All Providers</option>
              {PROVIDER_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#fff' }} />
          </div>
        </div>

        <div>
          <label style={editorialLabel}>Price Range</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              style={editorialInput}
            />
            <span style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.08em' }}>to</span>
            <input
              type="number"
              placeholder="Max"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              style={editorialInput}
            />
          </div>
        </div>

        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="hover:text-hot-pink transition-colors py-2"
            style={{
              fontSize: '10px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.10em',
              color: '#E8347A',
              fontFamily: 'var(--font-body)',
              borderBottom: '1px solid #E8347A',
            }}
          >
            Clear all
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream page-enter">
      {/* Sticky search header */}
      <div className="sticky top-16 z-30 bg-white" style={{ borderBottom: '1px solid #E8E8E8' }}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          {/* Mobile map: collapsed search pill */}
          {IS_MOBILE && viewMode === 'map' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSearchSheet(true)}
                className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-white text-sm text-text-secondary truncate"
                style={{ borderRadius: '2px', border: '1px solid #333', fontFamily: 'var(--font-body)' }}
              >
                <Search size={15} className="shrink-0 text-text-secondary" />
                <span className="truncate">
                  {procFilter?.label || selectedLoc
                    ? [procFilter?.label, selectedLoc ? `${selectedLoc.city}, ${selectedLoc.state}` : ''].filter(Boolean).join(' \u00B7 ')
                    : 'Search treatments & location'}
                </span>
              </button>
              <button
                onClick={() => setShowFilters(true)}
                className="shrink-0 inline-flex items-center justify-center w-10 h-10 transition"
                style={{
                  borderRadius: '2px',
                  border: `1px solid ${showFilters ? '#E8347A' : '#333'}`,
                  background: showFilters ? '#E8347A' : '#fff',
                  color: showFilters ? '#fff' : '#666',
                }}
              >
                <SlidersHorizontal size={16} />
              </button>
              <button
                onClick={() => setHasPricesOnly((prev) => !prev)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase whitespace-nowrap transition-colors"
                style={{
                  letterSpacing: '0.08em',
                  borderRadius: '4px',
                  background: hasPricesOnly ? '#E8347A' : 'white',
                  border: `1px solid ${hasPricesOnly ? '#E8347A' : '#E8E8E8'}`,
                  color: hasPricesOnly ? 'white' : '#666',
                }}
              >
                {hasPricesOnly && <span style={{ fontSize: '10px' }}>&#10003;</span>}
                Has prices
              </button>
              <div className="flex border border-rule overflow-hidden shrink-0" style={{ borderRadius: '2px' }}>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1 px-3 py-2 text-[10px] font-semibold uppercase transition ${
                    viewMode === 'list'
                      ? 'bg-hot-pink text-white'
                      : 'bg-white text-text-secondary'
                  }`}
                >
                  <List size={14} />
                </button>
                <button
                  onClick={handleSwitchToMap}
                  className={`flex items-center gap-1 px-3 py-2 text-[10px] font-semibold uppercase transition border-l border-rule ${
                    viewMode === 'map'
                      ? 'bg-hot-pink text-white'
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
                <div
                  className="flex items-center gap-2 px-3 py-2.5 bg-white"
                  style={{ borderRadius: '2px', border: '1px solid #333' }}
                >
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold uppercase text-white"
                    style={{
                      background: '#E8347A',
                      borderRadius: '2px',
                      letterSpacing: '0.10em',
                    }}
                  >
                    {selectedProc}
                    <button
                      onClick={clearProcedure}
                      className="text-white hover:opacity-80 transition-opacity"
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
                      if (e.key === 'Enter') {
                        const next = resolveProcedureFromQuery(procQuery);
                        if (next) {
                          setProcFilter(next);
                          setProcQuery('');
                          setProcOpen(false);
                        }
                      }
                      if (e.key === 'Escape') setProcOpen(false);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 outline-none transition-colors focus:border-hot-pink text-sm"
                    style={{
                      borderRadius: '2px',
                      border: '1px solid #333',
                      background: '#fff',
                      fontFamily: 'var(--font-body)',
                    }}
                  />
                </>
              )}

              {procOpen && procQuery.trim() && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 bg-white z-30 overflow-hidden"
                  style={{
                    borderRadius: '2px',
                    border: '1px solid #E8E8E8',
                    boxShadow: 'none',
                  }}
                >
                  {(() => {
                    const matchedPill = findPillByLabel(procQuery);
                    return (
                      <>
                        {matchedPill && (
                          <button
                            key={`pill-${matchedPill.slug}`}
                            onClick={() => selectPill(matchedPill)}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-cream transition-colors text-ink"
                            style={{ borderBottom: '1px solid #F0F0F0' }}
                          >
                            <span className="inline-flex items-center gap-2">
                              <span
                                className="text-[10px] font-semibold uppercase px-2 py-0.5 text-white"
                                style={{
                                  background: '#E8347A',
                                  borderRadius: '2px',
                                  letterSpacing: '0.08em',
                                }}
                              >
                                {matchedPill.label}
                              </span>
                              <span className="text-xs text-text-secondary font-light">all {matchedPill.label.toLowerCase()} procedures</span>
                            </span>
                          </button>
                        )}
                        {procMatches.length > 0 ? (
                          procMatches.map((p) => (
                            <button
                              key={p}
                              onClick={() => selectProcedure(p)}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-cream transition-colors text-ink"
                            >
                              {p}
                            </button>
                          ))
                        ) : !matchedPill ? (
                          <div className="px-4 py-3 text-sm text-text-secondary">
                            No procedures found
                          </div>
                        ) : null}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Location search */}
            <div ref={locRef} className="relative md:w-[320px]">
              {selectedLoc ? (
                <div
                  className="flex items-center gap-2 px-3 py-2.5 bg-white"
                  style={{ borderRadius: '2px', border: '1px solid #333' }}
                >
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold uppercase text-white"
                    style={{
                      background: '#111',
                      borderRadius: '2px',
                      letterSpacing: '0.08em',
                    }}
                  >
                    <MapPin size={12} />
                    {selectedLoc.city}{selectedLoc.state ? `, ${selectedLoc.state}` : ''}
                    {selectedLoc.zip ? ` (${selectedLoc.zip})` : ''}
                    <button
                      onClick={clearLocation}
                      className="text-white hover:opacity-80 transition-opacity"
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
                    className="w-full pl-10 pr-4 py-2.5 outline-none transition-colors focus:border-hot-pink text-sm"
                    style={{
                      borderRadius: '2px',
                      border: '1px solid #333',
                      background: '#fff',
                      fontFamily: 'var(--font-body)',
                    }}
                  />
                </>
              )}

              {locOpen && locQuery.trim() && (
                <div
                  className="absolute top-full left-0 right-0 mt-1 bg-white z-30 overflow-hidden"
                  style={{
                    borderRadius: '2px',
                    border: '1px solid #E8E8E8',
                    boxShadow: 'none',
                  }}
                >
                  {locLoading ? (
                    <div className="px-4 py-3 text-sm text-text-secondary animate-pulse">
                      Searching...
                    </div>
                  ) : locResults.length > 0 ? (
                    locResults.map((loc, i) => (
                      <button
                        key={`${loc.city}-${loc.state}-${i}`}
                        onClick={() => selectLocation(loc)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-cream transition-colors flex items-center gap-2 text-ink"
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
                className="inline-flex items-center gap-1.5 px-3 py-2.5 text-[10px] font-semibold uppercase transition-colors"
                style={{
                  borderRadius: '2px',
                  border: `1px solid ${showFilters ? '#E8347A' : '#333'}`,
                  background: showFilters ? '#E8347A' : '#fff',
                  color: showFilters ? '#fff' : '#666',
                  letterSpacing: '0.10em',
                  fontFamily: 'var(--font-body)',
                }}
              >
                <SlidersHorizontal size={14} />
                <span className="hidden sm:inline">Filters</span>
              </button>

              <button
                onClick={() => setHasPricesOnly((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold uppercase whitespace-nowrap transition-colors cursor-pointer"
                style={{
                  letterSpacing: '0.08em',
                  borderRadius: '4px',
                  background: hasPricesOnly ? '#E8347A' : 'white',
                  border: `1px solid ${hasPricesOnly ? '#E8347A' : '#E8E8E8'}`,
                  color: hasPricesOnly ? 'white' : '#666',
                }}
              >
                {hasPricesOnly && <span style={{ fontSize: '10px' }}>&#10003;</span>}
                Has prices
              </button>

              <div className="flex border border-rule overflow-hidden" style={{ borderRadius: '2px' }}>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold uppercase transition ${
                    viewMode === 'list'
                      ? 'bg-hot-pink text-white'
                      : 'bg-white text-text-secondary hover:bg-cream'
                  }`}
                  style={{ letterSpacing: '0.08em' }}
                >
                  <List size={14} />
                  List
                </button>
                <button
                  onClick={handleSwitchToMap}
                  className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-semibold uppercase transition border-l border-rule ${
                    viewMode === 'map'
                      ? 'bg-hot-pink text-white'
                      : 'bg-white text-text-secondary hover:bg-cream'
                  }`}
                  style={{ letterSpacing: '0.08em' }}
                >
                  <Map size={14} />
                  Map
                </button>
              </div>
            </div>
          </div>

          {/* Desktop filter panel (hidden on mobile) */}
          {showFilters && (
            <div className="hidden md:block mt-3 pt-3" style={{ borderTop: '1px solid #E8E8E8' }}>
              {renderFilterControls()}
            </div>
          )}
          </>
          )}
        </div>
      </div>

      {/* Mobile search sheet (expands from collapsed pill) — editorial flat */}
      {showSearchSheet && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-ink/60" onClick={() => setShowSearchSheet(false)} />
          <div
            className="absolute bottom-0 left-0 right-0 bg-white max-h-[85vh] overflow-y-auto animate-slide-up"
            style={{ borderTop: '2px solid #E8347A' }}
          >
            <div className="sticky top-0 bg-white border-b border-rule px-5 py-3 flex items-center justify-between">
              <h3 className="editorial-kicker">Search</h3>
              <button onClick={() => setShowSearchSheet(false)} className="text-text-secondary hover:text-ink">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Procedure search */}
              <div ref={procRef}>
                <label
                  className="block text-[10px] font-semibold uppercase text-text-secondary mb-1.5"
                  style={{ letterSpacing: '0.10em' }}
                >
                  Treatment
                </label>
                {selectedProc ? (
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 bg-white"
                    style={{ borderRadius: '2px', border: '1px solid #333' }}
                  >
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold uppercase text-white"
                      style={{
                        background: '#E8347A',
                        borderRadius: '2px',
                        letterSpacing: '0.10em',
                      }}
                    >
                      {selectedProc}
                      <button onClick={clearProcedure} className="text-white"><X size={14} /></button>
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
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-white outline-none transition-colors focus:border-hot-pink"
                      style={{
                        borderRadius: '2px',
                        border: '1px solid #333',
                        fontFamily: 'var(--font-body)',
                      }}
                    />
                    {procOpen && procQuery.trim() && procMatches.length > 0 && (
                      <div
                        className="absolute top-full left-0 right-0 mt-1 bg-white z-30 overflow-hidden"
                        style={{
                          borderRadius: '0 0 2px 2px',
                          border: '1px solid #E8E8E8',
                          borderTop: 'none',
                          boxShadow: 'none',
                        }}
                      >
                        {procMatches.map((p) => (
                          <button
                            key={p}
                            onClick={() => selectProcedure(p)}
                            className="w-full text-left px-4 py-2.5 text-sm text-ink hover:bg-cream transition-colors"
                          >
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
                <label
                  className="block text-[10px] font-semibold uppercase text-text-secondary mb-1.5"
                  style={{ letterSpacing: '0.10em' }}
                >
                  Location
                </label>
                {selectedLoc ? (
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 bg-white"
                    style={{ borderRadius: '2px', border: '1px solid #333' }}
                  >
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold uppercase text-white"
                      style={{
                        background: '#111',
                        borderRadius: '2px',
                        letterSpacing: '0.08em',
                      }}
                    >
                      <MapPin size={12} />
                      {selectedLoc.city}{selectedLoc.state ? `, ${selectedLoc.state}` : ''}
                      <button onClick={clearLocation} className="text-white"><X size={14} /></button>
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
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-white outline-none transition-colors focus:border-hot-pink"
                      style={{
                        borderRadius: '2px',
                        border: '1px solid #333',
                        fontFamily: 'var(--font-body)',
                      }}
                    />
                    {locOpen && locQuery.trim() && (
                      <div
                        className="absolute top-full left-0 right-0 mt-1 bg-white z-30 overflow-hidden"
                        style={{
                          borderRadius: '0 0 2px 2px',
                          border: '1px solid #E8E8E8',
                          borderTop: 'none',
                          boxShadow: 'none',
                        }}
                      >
                        {locLoading ? (
                          <div className="px-4 py-3 text-sm text-text-secondary animate-pulse">Searching...</div>
                        ) : locResults.length > 0 ? (
                          locResults.map((loc, i) => (
                            <button
                              key={`${loc.city}-${loc.state}-${i}`}
                              onClick={() => selectLocation(loc)}
                              className="w-full text-left px-4 py-2.5 text-sm text-ink hover:bg-cream transition-colors flex items-center gap-2"
                            >
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
            <div className="sticky bottom-0 bg-white border-t border-rule p-4">
              <button
                onClick={() => setShowSearchSheet(false)}
                className="btn-editorial btn-editorial-primary w-full"
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
            className="absolute inset-0 bg-ink/60"
            onClick={() => setShowFilters(false)}
          />
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white max-h-[80vh] overflow-y-auto animate-slide-up" style={{ borderTop: '2px solid #111111' }}>
            <div className="sticky top-0 bg-white border-b border-rule px-5 py-3 flex items-center justify-between">
              <h3 className="editorial-kicker">Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-text-secondary hover:text-ink"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5">
              {renderFilterControls()}
            </div>
            <div className="sticky bottom-0 bg-white border-t border-rule p-4">
              <button
                onClick={() => setShowFilters(false)}
                className="btn-editorial btn-editorial-primary w-full"
              >
                Apply filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editorial dark hero header — when procedure selected OR location set */}
      {!(IS_MOBILE && viewMode === 'map') && (procFilter || selectedLoc) && (
        <div className="bg-ink">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
            <p className="editorial-kicker mb-3" style={{ color: '#E8B4C8' }}>
              {hasPricesOnly ? 'Verified providers' : 'Real prices · No consultations'}
            </p>
            <h1
              className="font-display text-white"
              style={{ fontWeight: 900, fontSize: 'clamp(32px, 6vw, 56px)', lineHeight: 1, letterSpacing: '-0.02em' }}
            >
              {(() => {
                const label = procFilter?.label || 'Treatment';
                const loc = selectedLoc && !fallbackScope
                  ? `${selectedLoc.city}, ${selectedLoc.state}`
                  : null;
                return loc
                  ? `${label} prices in ${loc}.`
                  : `${label} prices.`;
              })()}
            </h1>
            {!loadingProcedures && procFilter && (
              <p className="font-body font-light text-[#999] mt-4 text-[15px]">
                {procedures.length}{hasPricesOnly ? ' provider' : ' result'}{procedures.length !== 1 ? 's' : ''}
                {hasPricesOnly ? ' with verified prices' : ''}
                {totalCount > 0 && !hasActiveFilters && ` · of ${totalCount.toLocaleString()} total`}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Results area */}
      <div className={`max-w-7xl mx-auto ${IS_MOBILE && viewMode === 'map' ? 'px-0 py-0' : 'px-4 py-6'}`}>
        {/* Editorial gate state — no procedure picked */}
        {!(IS_MOBILE && viewMode === 'map') && !procFilter && !selectedLoc && (
          <div className="text-center py-12 mb-6">
            <p className="editorial-kicker mb-4">Med spa price transparency</p>
            <h1
              className="font-display text-ink mx-auto max-w-3xl"
              style={{ fontWeight: 900, fontSize: 'clamp(32px, 5vw, 48px)', lineHeight: 1.05, letterSpacing: '-0.02em' }}
            >
              Pick a treatment.<br />
              <span className="italic text-hot-pink">See what people actually paid.</span>
            </h1>
            <p className="font-body font-light text-text-secondary mt-4 text-[15px] max-w-xl mx-auto">
              Real prices from real med spas. Use the search above to start.
            </p>
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
          <div
            className="flex items-center gap-2 px-4 py-3 mb-4 text-[13px] font-light"
            style={{
              background: '#FBF9F7',
              borderLeft: '3px solid #E8347A',
              color: '#111',
              fontFamily: 'var(--font-body)',
            }}
          >
            {fallbackScope === 'national'
              ? `Showing national prices \u2014 no results found near ${filterCity || filterState}`
              : `No prices in ${filterCity} yet \u2014 showing ${fallbackLabel} prices`}
            <Link
              to="/log"
              className="ml-auto shrink-0 text-[10px] font-semibold uppercase hover:opacity-80 transition-opacity"
              style={{ color: '#E8347A', letterSpacing: '0.10em', borderBottom: '1px solid #E8347A' }}
            >
              Be the first
            </Link>
          </div>
        )}

        {/* Map view */}
        {mapLoaded && (
          <div
            className="relative overflow-hidden"
            style={{
              height: IS_MOBILE
                ? 'calc(100dvh - 64px - 60px - 56px - env(safe-area-inset-bottom, 0px))'
                : 'calc(100vh - 220px)',
              minHeight: IS_MOBILE ? 0 : 400,
              display: viewMode === 'map' ? 'block' : 'none',
              borderRadius: IS_MOBILE ? 0 : '2px',
              border: IS_MOBILE ? 'none' : '1px solid #E8E8E8',
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

            {/* Procedure gate overlay — shown until the user picks a treatment */}
            {!procFilter && (
              <ProcedureGate
                variant="overlay"
                onSelect={selectPill}
                cityLabel={selectedLoc?.city || ''}
              />
            )}

            {/* Floating "Has prices" pill on mobile map */}
            {IS_MOBILE && (
              <button
                onClick={() => setHasPricesOnly((prev) => !prev)}
                className="absolute top-3 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1.5 px-4 py-2 text-[10px] font-semibold uppercase transition-colors cursor-pointer"
                style={{
                  letterSpacing: '0.08em',
                  borderRadius: '4px',
                  background: hasPricesOnly ? '#E8347A' : 'white',
                  color: hasPricesOnly ? 'white' : '#111111',
                  border: `1px solid ${hasPricesOnly ? '#E8347A' : '#E8E8E8'}`,
                }}
              >
                {hasPricesOnly ? '\u2713 Showing prices only' : 'Show spas with prices'}
              </button>
            )}

            {/* Floating locate button */}
            <button
              onClick={handleRecenterOnUser}
              className="absolute bottom-4 right-3 z-10 flex items-center justify-center w-10 h-10 bg-white border border-rule hover:bg-cream active:scale-95 transition"
              style={{ borderRadius: '2px' }}
              aria-label="Center on my location"
            >
              <LocateFixed size={18} className="text-ink" />
            </button>
          </div>
        )}

        {/* Mobile bottom sheet for selected provider */}
        {IS_MOBILE && viewMode === 'map' && selectedMapProvider && (
          <div className="fixed inset-0 z-50" onClick={() => setSelectedMapProvider(null)}>
            <div className="absolute inset-0 bg-ink/60" />
            <div
              className="absolute bottom-14 left-0 right-0 bg-white animate-slide-up"
              style={{
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                borderTop: '2px solid #111111',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-10 h-1 bg-rule" />
              </div>
              <div className="px-5 pb-5">
                <p className="editorial-kicker mb-2">
                  Provider
                </p>
                <h3 className="font-display font-bold text-[22px] leading-tight text-ink truncate">
                  {selectedMapProvider.provider_name}
                </h3>
                <p className="text-[12px] text-text-secondary mt-1 font-light">
                  {[selectedMapProvider.city, selectedMapProvider.state].filter(Boolean).join(', ')}
                  {selectedMapProvider.google_rating ? ` \u00B7 \u2605 ${Number(selectedMapProvider.google_rating).toFixed(1)}` : ''}
                </p>

                {selectedMapProvider.has_submissions && selectedMapProvider.avg_price > 0 && (
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="price-display-sm">
                      ${Math.round(selectedMapProvider.avg_price)}
                    </span>
                    <span className="text-[11px] uppercase text-text-secondary font-medium" style={{ letterSpacing: '0.06em' }}>
                      avg reported
                    </span>
                    {selectedMapProvider.submission_count > 0 && (
                      <span className="text-[11px] text-text-secondary font-light">
                        ({selectedMapProvider.submission_count})
                      </span>
                    )}
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => {
                      setSelectedMapProvider(null);
                      navigate(providerProfileUrl(selectedMapProvider));
                    }}
                    className="btn-editorial btn-editorial-primary flex-1"
                  >
                    View Profile
                  </button>
                  <Link
                    to={`/log?provider=${encodeURIComponent(selectedMapProvider.provider_name)}`}
                    onClick={() => setSelectedMapProvider(null)}
                    className="btn-editorial btn-editorial-secondary flex-1 text-center"
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
            {!procFilter ? (
              <div className="py-8">
                <ProcedureGate variant="block" onSelect={selectPill} />
              </div>
            ) : loadingProcedures ? (
              <SkeletonGrid count={6} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {procedures.map((proc) => {
                  const indicator = getFairPriceIndicator(proc);
                  return (
                    <div key={proc.id}>
                      <ProcedureCard procedure={proc} firstTimerActive={firstTimerActive} userAlerts={userAlerts} />
                      {indicator && indicator.below && (
                        <div
                          className="flex items-center gap-1.5 mt-1 px-3 py-2"
                          style={{
                            background: '#FBF9F7',
                            borderLeft: '3px solid #1B7A3E',
                          }}
                        >
                          <TrendingDown size={13} style={{ color: '#1B7A3E' }} className="shrink-0" />
                          <span
                            className="text-[10px] font-semibold uppercase"
                            style={{ color: '#1B7A3E', letterSpacing: '0.08em', fontFamily: 'var(--font-body)' }}
                          >
                            {indicator.label}
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

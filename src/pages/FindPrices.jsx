import { useState, useEffect, useRef, useCallback, useContext, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, X, ChevronDown, MapPin, SlidersHorizontal, TrendingDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PriceContextBar from '../components/browse/PriceContextBar';
import StickyFilterBar from '../components/browse/StickyFilterBar';
import PriceCard from '../components/browse/PriceCard';
import CompareTray from '../components/browse/CompareTray';
import SavingsCallout from '../components/browse/SavingsCallout';
import SmartEmptyState from '../components/browse/SmartEmptyState';
import ResultsCountBar from '../components/browse/ResultsCountBar';
import GlowMap from '../components/browse/GlowMap';
import ProviderBottomSheet from '../components/browse/ProviderBottomSheet';
import useSavedProviders from '../hooks/useSavedProviders';
import AuthModal from '../components/AuthModal';
import { providerSlugFromParts } from '../lib/slugify';
import { haversineMiles } from '../lib/distance';
import {
  getCity as getGatingCity, setCity as persistCity,
  getState as getGatingState, setState as persistState,
  setZip as persistZip,
} from '../lib/gating';
import ProcedureCard from '../components/ProcedureCard';
import BrandGroupCard from '../components/BrandGroupCard';
import MultiProcedureProviderCard from '../components/MultiProcedureProviderCard';
import { groupBrandRows } from '../lib/groupBrandRows';
import useUserPreferences from '../hooks/useUserPreferences';
import useUserLocation from '../hooks/useUserLocation';
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
  findPillBySlug,
} from '../lib/constants';
import ProcedureGate from '../components/ProcedureGate';
import { searchCitiesViaGoogle } from '../lib/places';
import { assignTrustTier } from '../lib/trustTiers';
import { AuthContext } from '../App';
import { getUserActiveAlerts } from '../lib/priceAlerts';
import { setPageMeta } from '../lib/seo';
import { normalizePrice } from '../lib/priceUtils';
import { getProcedureLabel } from '../lib/procedureLabel';
import { SkeletonGrid } from '../components/SkeletonCard';
import { providerProfileUrl } from '../lib/slugify';

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

// sessionStorage key for the most recent /browse filter set. Only used as
// a fallback when the user lands on /browse with no URL params (e.g.
// they navigated away to a provider profile and clicked "Find Prices"
// in the navbar). URL params always win when present.
const BROWSE_FILTERS_KEY = 'glowbuddy.browseFilters.v1';

function readPersistedFilters() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(BROWSE_FILTERS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writePersistedFilters(filters) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(BROWSE_FILTERS_KEY, JSON.stringify(filters));
  } catch {
    // sessionStorage can throw in private mode — fail silently
  }
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
  //
  // Hydration order: URL param → persisted sessionStorage filter → null.
  // URL always wins when present.
  const [procFilter, setProcFilter] = useState(() => {
    const urlSlug = searchParams.get('procedure');
    const urlBrand = searchParams.get('brand');
    if (urlSlug) return resolveProcedureFilter(urlSlug, urlBrand);
    const persisted = readPersistedFilters();
    if (persisted?.procedureSlug) {
      return resolveProcedureFilter(persisted.procedureSlug, persisted.brand || null);
    }
    return null;
  });
  const selectedProc = procFilter?.primary || '';

  // Brand filter (?brand=Botox). Independent from procFilter so "Botox
  // only" can be toggled without changing the category pill. Only applies
  // when procFilter is set (brand makes no sense without a parent category).
  const [brandFilter, setBrandFilter] = useState(() => {
    const urlBrand = searchParams.get('brand');
    if (urlBrand) return urlBrand;
    const persisted = readPersistedFilters();
    return persisted?.brand || null;
  });
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
    // Persisted filter beats raw gating city when both are present, so
    // the user lands on the same city they were last browsing.
    const persisted = readPersistedFilters();
    if (persisted?.city && persisted?.state) {
      return { city: persisted.city, state: persisted.state };
    }
    const city = getGatingCity();
    const state = getGatingState();
    return (city && state) ? { city, state } : null;
  });
  const locRef = useRef(null);
  const locInputRef = useRef(null);
  const locDebounce = useRef(null);

  // Sort & extra filters
  const [sortBy, setSortBy] = useState(() => {
    const urlSort = searchParams.get('sort');
    if (urlSort) return urlSort;
    const persisted = readPersistedFilters();
    return persisted?.sortBy || 'most_recent';
  });
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

  // --- Personalized browse (PROMPT 8) ---
  // Logged-in users with saved procedure_slugs / brands in user_preferences
  // bypass the ProcedureGate on /browse and see a personalized feed grouped
  // by provider. The header + feed still respect `procFilter` / `brandFilter`
  // when they're set — personal mode only kicks in while BOTH are null and
  // the session hasn't dismissed it.
  const { procedureSlugs, brands: userBrands, loading: prefsLoading } = useUserPreferences();
  const [personalDismissed, setPersonalDismissed] = useState(false);
  const hasSavedPrefs = procedureSlugs.length > 0 || userBrands.length > 0;
  const personalizedMode =
    !!user && hasSavedPrefs && !procFilter && !brandFilter && !personalDismissed;
  const [personalProviders, setPersonalProviders] = useState([]);
  const [personalLoading, setPersonalLoading] = useState(false);

  // Location personalization
  const [fallbackLabel, setFallbackLabel] = useState('');
  const [fallbackScope, setFallbackScope] = useState(''); // 'state' | 'national'

  // Fair price averages: { [procedure_type]: { avg, scope } }
  const [fairPriceAvgs, setFairPriceAvgs] = useState({});

  const [showSearchSheet, setShowSearchSheet] = useState(false);
  const [hasPricesOnly, setHasPricesOnly] = useState(() => {
    if (searchParams.get('has_prices') === '1') return true;
    const persisted = readPersistedFilters();
    return persisted?.hasPricesOnly === true;
  });

  // Verified-only filter (provider_pricing.verified === true OR
  // procedures.receipt_verified === true). URL: ?verified=1
  const [verifiedOnly, setVerifiedOnly] = useState(() => {
    if (searchParams.get('verified') === '1') return true;
    const persisted = readPersistedFilters();
    return persisted?.verifiedOnly === true;
  });

  // Compare tray state — at most 3 providers, picked from any card.
  const [comparing, setComparing] = useState([]);

  // Saved-provider hook (Feature 7). useSavedProviders handles auth/loading
  // internally; the toggle below opens the auth modal when not signed in.
  const { isSaved, saveProvider, unsaveProvider } = useSavedProviders();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // ── Map view state ──
  // Mobile: list is the default; user toggles to map.
  // Desktop: split view is always on, viewMode is ignored.
  // hoveredProviderId paints a highlight ring on the map pin when the
  // user mouses over a list card. selectedProviderGroup is set when the
  // user taps a pin on mobile (opens the bottom sheet) or desktop (it
  // just paints the matching list card with a black ring).
  const [viewMode, setViewMode] = useState('list');
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  );
  const [hoveredProviderId, setHoveredProviderId] = useState(null);
  const [selectedProviderGroup, setSelectedProviderGroup] = useState(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    function handleResize() {
      const next = window.innerWidth < 768;
      setIsMobile((prev) => (prev === next ? prev : next));
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Switching from map → list (or unmounting the map for any reason)
  // should clear any open bottom sheet so it doesn't reopen on return.
  useEffect(() => {
    if (viewMode !== 'map') setSelectedProviderGroup(null);
  }, [viewMode]);

  const handlePinClick = useCallback(
    (group) => {
      setSelectedProviderGroup(group);
      // On desktop we don't open a sheet — we just sync the selection
      // so the matching list card lights up. The user can scroll to it.
      if (!isMobile) {
        // Try to scroll the list card into view smoothly.
        if (group?.provider_id != null && typeof document !== 'undefined') {
          const node = document.querySelector(
            `[data-provider-card="${group.provider_id}"]`,
          );
          node?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
    },
    [isMobile],
  );

  const handleCardHover = useCallback((procedure, isEntering) => {
    setHoveredProviderId(isEntering ? procedure.provider_id || null : null);
  }, []);

  // ── SEO meta tags — dynamic per spec ──
  useEffect(() => {
    // When a brand is set, it wins over the category label so titles read
    // "Botox prices in Miami, FL" rather than "Neurotoxin prices in Miami, FL".
    // Prefer the friendly pill label over the canonical procedure name so
    // titles read naturally when crawlers resolve a category slug.
    const procedure = brandFilter || procFilter?.label || selectedProc;
    const city = selectedLoc?.city;
    const state = selectedLoc?.state;

    let title;
    let desc;

    if (procedure && city) {
      title = `${capitalize(procedure)} prices in ${city}, ${state} | GlowBuddy`;
      if (!brandFilter && procFilter?.slug === 'neurotoxin') {
        desc = `Compare Botox, Dysport, and Xeomin prices from med spas in ${city}, ${state}. Real prices from verified patients. Know before you glow.`;
      } else {
        desc = `See what patients actually paid for ${procedure} in ${city}, ${state}. Real prices from verified patients. Know before you glow. Free on GlowBuddy.`;
      }
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

    // Build a clean canonical: /browse with only the indexable filters
    // (procedure, brand, city, state) — drop ephemeral state like sort/page.
    const canonicalParams = new URLSearchParams();
    if (procFilter?.slug) canonicalParams.set('procedure', procFilter.slug);
    if (brandFilter) canonicalParams.set('brand', brandFilter);
    if (selectedLoc?.city) canonicalParams.set('city', selectedLoc.city);
    if (selectedLoc?.state) canonicalParams.set('state', selectedLoc.state);
    const qs = canonicalParams.toString();
    const canonical = `https://glowbuddy.com/browse${qs ? `?${qs}` : ''}`;

    setPageMeta({ title, description: desc, canonical });
  }, [procFilter, brandFilter, selectedLoc]);

  // Sync filters to URL params (SEO-friendly) AND persist to sessionStorage
  // so the user can navigate to a provider profile and click "Find Prices"
  // again without losing their filters.
  useEffect(() => {
    const params = {};
    if (procFilter) params.procedure = procFilter.slug;
    if (brandFilter) params.brand = brandFilter;
    if (selectedLoc?.city) params.city = selectedLoc.city;
    if (selectedLoc?.state) params.state = selectedLoc.state;
    if (sortBy !== 'most_verified') params.sort = sortBy;
    if (hasPricesOnly) params.has_prices = '1';
    if (verifiedOnly) params.verified = '1';
    setSearchParams(params, { replace: true });

    writePersistedFilters({
      procedureSlug: procFilter?.slug || null,
      brand: brandFilter || null,
      city: selectedLoc?.city || null,
      state: selectedLoc?.state || null,
      sortBy,
      hasPricesOnly,
      verifiedOnly,
    });
  }, [procFilter, brandFilter, selectedLoc, sortBy, hasPricesOnly, verifiedOnly]);

  // Fetch user's active price alerts for match badges
  useEffect(() => {
    getUserActiveAlerts().then(setUserAlerts);
  }, []);

  // Restore procFilter + brandFilter from URL on back/forward navigation
  useEffect(() => {
    const urlSlug = searchParams.get('procedure') || '';
    const urlBrand = searchParams.get('brand') || '';
    const currentSlug = procFilter?.slug || '';
    const currentBrand = brandFilter || '';
    if (urlSlug !== currentSlug || urlBrand !== currentBrand) {
      // Pass the brand so neurotoxin&brand=Dysport resolves to the
      // Dysport pill rather than the default Botox one.
      setProcFilter(resolveProcedureFilter(urlSlug, urlBrand || null));
    }
    if (urlBrand !== currentBrand) {
      setBrandFilter(urlBrand || null);
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
    // Brand-specific pills (e.g. Botox / Dysport / Xeomin) carry a brand
    // through the URL so the provider_pricing.brand filter activates.
    // Non-brand pills (Fillers, Laser, ...) clear any stale brand filter.
    setBrandFilter(pill?.brand || null);
    setProcQuery('');
    setProcOpen(false);
  }

  function clearProcedure() {
    setProcFilter(null);
    setBrandFilter(null);
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

  // User coordinates used to render the "· X mi" distance badge on browse
  // cards. Resolution priority lives inside the hook: session cache →
  // explicit filter city/state → profile → gating localStorage. The hook
  // does not prompt for browser geolocation — MapView still owns that flow.
  const { lat: userLat, lng: userLng } = useUserLocation(
    filterCity && filterState ? { city: filterCity, state: filterState } : undefined,
  );

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
      // The `procedures` table has no structured brand column. Patient-
      // reported submissions instead encode the brand inside the freeform
      // `procedure_type` text (e.g. "Daxxify", "Botox / Dysport / Xeomin").
      // When a brand filter is active we ilike-match procedure_type so
      // those rows aren't lost — previously we returned [] here, which
      // meant a user who logged "Daxxify" at a brand-new provider could
      // never see their own submission in the brand-filtered view.
      let query = buildProcedureQuery(filters)
        .order('created_at', { ascending: false })
        .limit(40);
      if (brandFilter) {
        query = query.ilike('procedure_type', `%${brandFilter}%`);
      }
      const { data, error } = await query;
      if (error) {
        return [];
      }
      const activeRows = (data || []).map((r) => ({
        ...r,
        data_source: r.data_source || 'patient_reported',
      }));

      // Also fetch the current user's own *pending* submissions for the
      // same scope so they can see what they just contributed even if it
      // got auto-flagged as an outlier and is awaiting admin review.
      // Without this, users like Julia submit a price, see "Success!",
      // navigate to /browse, and find their row missing — making it
      // appear as if the database lost their work.
      if (!user?.id) return activeRows;

      let pendingQuery = supabase
        .from('procedures')
        .select('id, procedure_type, price_paid, unit, units_or_volume, provider_name, provider_type, city, state, zip_code, created_at, rating, review_body, receipt_verified, result_photo_url, has_receipt, trust_weight, trust_tier, status, is_anonymous, provider_slug, provider_id')
        .eq('user_id', user.id)
        .in('status', ['pending', 'pending_confirmation'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (filterProcedureTypes.length === 1) {
        pendingQuery = pendingQuery.eq('procedure_type', filterProcedureTypes[0]);
      } else if (filterProcedureTypes.length > 1) {
        pendingQuery = pendingQuery.in('procedure_type', filterProcedureTypes);
      }
      if (filters.state) pendingQuery = pendingQuery.eq('state', filters.state);
      if (filters.city) pendingQuery = pendingQuery.ilike('city', `%${filters.city}%`);
      if (brandFilter) {
        pendingQuery = pendingQuery.ilike('procedure_type', `%${brandFilter}%`);
      }

      const { data: pendingData } = await pendingQuery;
      const pendingRows = (pendingData || []).map((r) => ({
        ...r,
        data_source: r.data_source || 'patient_reported',
        _pending_self: true,
      }));

      // De-dupe — pending rows that somehow also matched the active query
      // (shouldn't happen, but be safe) get filtered out.
      const seen = new Set(activeRows.map((r) => r.id));
      const uniquePending = pendingRows.filter((r) => !seen.has(r.id));

      return [...uniquePending, ...activeRows];
    }

    async function fetchProviderPricingRows({ city, state }) {
      // provider_pricing has no rating column, so honor a min-rating filter
      // by excluding it from this source entirely.
      if (minRating) return [];

      let query = supabase
        .from('provider_pricing')
        .select(
          'id, provider_id, procedure_type, brand, treatment_area, units_or_volume, price, price_label, notes, source, verified, source_url, scraped_at, created_at, providers!inner(id, name, slug, city, state, zip_code, provider_type, owner_user_id, active_special, special_expires_at, lat, lng)'
        )
        .eq('is_active', true)
        .eq('display_suppressed', false);

      if (state) query = query.eq('providers.state', state);
      if (city) query = query.ilike('providers.city', `%${city}%`);
      if (filterFuzzyToken) {
        query = query.ilike('procedure_type', `%${filterFuzzyToken}%`);
      } else if (filterProcedureType) {
        const token = fuzzyProcedureToken(filterProcedureType);
        if (token) query = query.ilike('procedure_type', `%${token}%`);
      }
      // Brand filter — strict equality against provider_pricing.brand.
      // provider_pricing is the only source with a brand column; the
      // procedures table can't honor this filter (see note in
      // fetchProcedureRows).
      if (brandFilter) query = query.eq('brand', brandFilter);
      if (filterProviderType) query = query.eq('providers.provider_type', filterProviderType);
      if (priceMin) query = query.gte('price', parseInt(priceMin, 10));
      if (priceMax) query = query.lte('price', parseInt(priceMax, 10));
      query = query
        .order('scraped_at', { ascending: false, nullsFirst: false })
        .limit(40);

      const { data, error } = await query;
      if (error) {
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
          provider_lat: provider.lat ?? null,
          provider_lng: provider.lng ?? null,
          active_special: provider.active_special || null,
          special_expires_at: provider.special_expires_at || null,
          is_claimed: !!provider.owner_user_id,
          // Defense in depth: never pipe scraped notes into the consumer card.
          // Notes from scraped rows can only have come from internal classifier
          // diagnostics — they are never genuine provider copy.
          notes: row.source === 'scrape' ? null : (row.notes || null),
          data_source: 'provider_website',
          // Normalized fields consumed by ProcedureCard
          normalized_display: normalized.displayPrice,
          normalized_compare_value: normalized.comparableValue,
          normalized_compare_unit: normalized.compareUnit,
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

    // Patient-reported rows come from `procedures` which has no join to
    // `providers`, so after a result set is assembled we look up provider
    // specials + claim-state in a single batched query and splice them in.
    async function attachProviderSpecials(rows) {
      if (!Array.isArray(rows) || rows.length === 0) return rows;
      const providerIds = Array.from(
        new Set(rows.map((r) => r.provider_id).filter(Boolean)),
      );
      if (providerIds.length === 0) return rows;
      const { data, error } = await supabase
        .from('providers')
        .select('id, active_special, special_expires_at, owner_user_id, lat, lng')
        .in('id', providerIds);
      if (error || !data) return rows;
      const byId = new Map(data.map((p) => [p.id, p]));
      return rows.map((r) => {
        const p = byId.get(r.provider_id);
        // Always backfill lat/lng from this lookup so patient-submitted rows
        // (which don't join providers in fetchProcedureRows) can render the
        // distance badge on the browse card.
        const withCoords =
          r.provider_lat == null && p
            ? { ...r, provider_lat: p.lat ?? null, provider_lng: p.lng ?? null }
            : r;
        if (withCoords.active_special !== undefined) return withCoords;
        if (!p) return withCoords;
        return {
          ...withCoords,
          active_special: p.active_special || null,
          special_expires_at: p.special_expires_at || null,
          is_claimed: !!p.owner_user_id,
        };
      });
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

      // Safety net: if any of the awaits below throw (network blip,
      // unexpected schema mismatch, attachProviderSpecials failure), the
      // try/finally GUARANTEES the skeleton clears. Otherwise the user
      // is stuck staring at shimmer cards forever.
      try {

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
            .eq('is_active', true)
            .eq('display_suppressed', false);
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

      let resultsWithSpecials = results;
      try {
        resultsWithSpecials = await attachProviderSpecials(results);
      } catch {
        // Fall back to the unannotated results so we still render something.
      }
      setProcedures(resultsWithSpecials);
      } catch {
        setProcedures([]);
      } finally {
        setLoadingProcedures(false);
      }
    }

    // Hard safety timeout — never show the skeleton for more than 8s.
    // If something is genuinely hung (cold cache, slow network) we'd
    // rather render the empty state than leave the user staring at
    // shimmer placeholders.
    const skeletonSafetyTimeout = setTimeout(() => {
      setLoadingProcedures(false);
    }, 8000);

    fetchProcedures().finally(() => clearTimeout(skeletonSafetyTimeout));
  }, [
    procFilter,
    brandFilter,
    filterState,
    filterCity,
    filterZip,
    filterProviderType,
    sortBy,
    priceMin,
    priceMax,
    minRating,
    user?.id,
  ]);

  // ── Personalized fetch: multi-procedure grouped-by-provider ──
  // Runs when the user is in personalizedMode (logged in + has saved prefs
  // + no explicit procFilter/brandFilter). Queries provider_pricing with
  // an .or() across the user's preferred pill tokens and specific brands,
  // then groups the result by provider_id and sorts by match count then
  // lowest price (PROMPT 8 STEP 4).
  useEffect(() => {
    if (!personalizedMode) {
      setPersonalProviders([]);
      setPersonalLoading(false);
      return;
    }

    let cancelled = false;
    setPersonalLoading(true);

    async function runPersonalFetch() {
      const pillTokens = procedureSlugs
        .map((slug) => findPillBySlug(slug))
        .filter(Boolean)
        .map((p) => p.fuzzyToken)
        .filter(Boolean);

      const orClauses = [];
      for (const token of pillTokens) {
        orClauses.push(`procedure_type.ilike.%${token}%`);
      }
      for (const brand of userBrands) {
        orClauses.push(`brand.eq.${brand}`);
      }
      if (orClauses.length === 0) {
        if (!cancelled) {
          setPersonalProviders([]);
          setPersonalLoading(false);
        }
        return;
      }

      let query = supabase
        .from('provider_pricing')
        .select(
          'id, provider_id, procedure_type, brand, price, price_label, units_or_volume, treatment_area, source, verified, scraped_at, created_at, providers!inner(id, name, slug, city, state, provider_type, is_active, active_special, special_expires_at, lat, lng)',
        )
        .eq('is_active', true)
        .eq('display_suppressed', false)
        .eq('providers.is_active', true);

      if (filterState) query = query.eq('providers.state', filterState);
      if (filterCity) query = query.ilike('providers.city', `%${filterCity}%`);
      query = query.or(orClauses.join(','));
      query = query.order('price', { ascending: true }).limit(200);

      const { data, error } = await query;
      if (cancelled) return;
      if (error) {
        setPersonalProviders([]);
        setPersonalLoading(false);
        return;
      }

      const byProvider = new Map();
      for (const row of data || []) {
        const provider = row.providers;
        if (!provider) continue;
        const pid = provider.id;
        if (!byProvider.has(pid)) {
          byProvider.set(pid, { provider, prices: [] });
        }
        byProvider.get(pid).prices.push(row);
      }

      const targetCount = new Set([...procedureSlugs, ...userBrands]).size;

      const grouped = [...byProvider.values()].map((g) => {
        const matched = new Set();
        for (const row of g.prices) {
          if (row.brand && userBrands.includes(row.brand)) {
            matched.add(`brand:${row.brand}`);
          }
          const pt = (row.procedure_type || '').toLowerCase();
          for (const slug of procedureSlugs) {
            const pill = findPillBySlug(slug);
            if (pill?.fuzzyToken && pt.includes(pill.fuzzyToken)) {
              matched.add(`slug:${slug}`);
            }
          }
        }
        const minPrice = Math.min(
          ...g.prices.map((p) => Number(p.price) || Infinity),
        );
        return { ...g, matchCount: matched.size, minPrice, targetCount };
      });

      grouped.sort((a, b) => {
        if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
        return a.minPrice - b.minPrice;
      });

      if (!cancelled) {
        setPersonalProviders(grouped.slice(0, 30));
        setPersonalLoading(false);
      }
    }

    runPersonalFetch();
    return () => {
      cancelled = true;
    };
  }, [personalizedMode, procedureSlugs, userBrands, filterCity, filterState]); // eslint-disable-line react-hooks/exhaustive-deps

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
      border: '1px solid #EDE8E3',
      background: '#fff',
      color: '#111',
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
      border: '1px solid #EDE8E3',
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
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#666' }} />
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
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#666' }} />
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
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#666' }} />
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

  // ── Active filter chips (mobile compact bar) ──
  // Drives the row-1 horizontally scrollable chip strip on mobile.
  const activeChips = [];
  if (procFilter) {
    activeChips.push({
      key: 'procedure',
      label: brandFilter || procFilter.primary || procFilter.label,
      onClear: clearProcedure,
    });
  }
  if (selectedLoc) {
    activeChips.push({
      key: 'location',
      label: `${selectedLoc.city}${selectedLoc.state ? `, ${selectedLoc.state}` : ''}`,
      onClear: clearLocation,
    });
  }
  if (hasPricesOnly) {
    activeChips.push({
      key: 'has-prices',
      label: 'Has prices',
      onClear: () => setHasPricesOnly(false),
    });
  }

  // Whether to show the dosage estimator section in the mobile drawer.
  const dosageEstimatorAvailable =
    !!selectedProc && firstTimerActive && isFirstTimerFor(selectedProc);

  // ── Browse rebuild: brand pills, filters, sorting, city average ──
  // Brand pills only surface for the neurotoxin category right now (Botox,
  // Dysport, Xeomin, Jeuveau, Daxxify). For other categories we pass an
  // empty array so StickyFilterBar hides the pill row.
  const brandPills = useMemo(() => {
    if (procFilter?.slug !== 'neurotoxin') return [];
    return [
      { brand: 'Botox', label: 'Botox' },
      { brand: 'Dysport', label: 'Dysport' },
      { brand: 'Xeomin', label: 'Xeomin' },
      { brand: 'Jeuveau', label: 'Jeuveau' },
      { brand: 'Daxxify', label: 'Daxxify' },
    ];
  }, [procFilter?.slug]);

  // `procedures` already carries the active city/procedure set from the
  // main fetch effect. We layer the verified-only filter and nearest sort
  // on top locally without re-querying Supabase.
  const displayedProcedures = useMemo(() => {
    let rows = procedures || [];
    if (verifiedOnly) {
      rows = rows.filter(
        (p) => p._verified === true || p.receipt_verified === true,
      );
    }
    if (sortBy === 'nearest' && userLat != null && userLng != null) {
      rows = [...rows].sort((a, b) => {
        const da = haversineMiles(userLat, userLng, a.provider_lat, a.provider_lng);
        const db = haversineMiles(userLat, userLng, b.provider_lat, b.provider_lng);
        if (da == null && db == null) return 0;
        if (da == null) return 1;
        if (db == null) return -1;
        return da - db;
      });
    } else if (sortBy === 'lowest_price') {
      rows = [...rows].sort((a, b) => {
        const va = Number(a.normalized_compare_value ?? a.price_paid) || Infinity;
        const vb = Number(b.normalized_compare_value ?? b.price_paid) || Infinity;
        return va - vb;
      });
    } else if (sortBy === 'highest_rated') {
      rows = [...rows].sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    }
    return rows;
  }, [procedures, verifiedOnly, sortBy, userLat, userLng]);

  // City average — unit-normalized when possible so $14/unit and $700/20u
  // sit on the same scale. Used for the vs-average badges + savings callout.
  const cityAvgPrice = useMemo(() => {
    const vals = (displayedProcedures || [])
      .map((p) => {
        const n = Number(
          p.normalized_compare_value != null && Number.isFinite(Number(p.normalized_compare_value))
            ? p.normalized_compare_value
            : p.price_paid,
        );
        return Number.isFinite(n) && n > 0 ? n : null;
      })
      .filter((n) => n != null);
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [displayedProcedures]);

  // Best deal = lowest normalized price in the current result set. We
  // only surface the SavingsCallout when that deal is 20%+ below the
  // city average.
  const bestDealInfo = useMemo(() => {
    if (!cityAvgPrice || !displayedProcedures?.length) return null;
    let best = null;
    let bestVal = Infinity;
    for (const p of displayedProcedures) {
      const v = Number(
        p.normalized_compare_value != null && Number.isFinite(Number(p.normalized_compare_value))
          ? p.normalized_compare_value
          : p.price_paid,
      );
      if (Number.isFinite(v) && v > 0 && v < bestVal) {
        bestVal = v;
        best = p;
      }
    }
    if (!best) return null;
    const savings = cityAvgPrice - bestVal;
    const pct = savings / cityAvgPrice;
    if (pct < 0.2) return null;
    return {
      card: best,
      savings,
      normalizedPrice: bestVal,
      avg: cityAvgPrice,
      units: best.units_or_volume || null,
    };
  }, [displayedProcedures, cityAvgPrice]);

  // Group displayedProcedures by provider so a single provider with
  // multiple matching products (e.g. Saintly Skin offering both Botox
  // and Jeuveau) collapses into ONE card with multiple price rows
  // instead of N separate cards. Within each group, rows are sorted
  // ascending by comparable per-unit price so the cheapest product is
  // the headline. Groups themselves are then sorted by their cheapest
  // row, mirroring the existing "best deal first" sort behavior.
  //
  // Falls back to provider_name+city+state when provider_id is missing
  // (patient submissions sometimes haven't been linked to a provider
  // record yet).
  const groupedProviders = useMemo(() => {
    if (!displayedProcedures || displayedProcedures.length === 0) return [];

    const compareValueOf = (p) => {
      const v = Number(
        p.normalized_compare_value != null && Number.isFinite(Number(p.normalized_compare_value))
          ? p.normalized_compare_value
          : p.price_paid,
      );
      return Number.isFinite(v) && v > 0 ? v : Infinity;
    };

    const map = new Map();
    for (const proc of displayedProcedures) {
      const key =
        proc.provider_id ||
        `${proc.provider_name}|${proc.city}|${proc.state}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          provider_id: proc.provider_id || null,
          procedures: [],
        });
      }
      map.get(key).procedures.push(proc);
    }

    const groups = [...map.values()].map((g) => {
      const sortedProcs = g.procedures
        .slice()
        .sort((a, b) => compareValueOf(a) - compareValueOf(b));
      return {
        ...g,
        procedures: sortedProcs,
        bestPrice: compareValueOf(sortedProcs[0]),
      };
    });

    groups.sort((a, b) => a.bestPrice - b.bestPrice);
    return groups;
  }, [displayedProcedures]);

  // ── Compare tray handlers ──
  const toggleCompare = useCallback((procedure) => {
    setComparing((prev) => {
      const id = procedure.id;
      const exists = prev.some((p) => p.id === id);
      if (exists) return prev.filter((p) => p.id !== id);
      if (prev.length >= 3) return prev; // cap at 3
      return [...prev, procedure];
    });
  }, []);
  const clearCompare = useCallback(() => setComparing([]), []);
  const removeFromCompare = useCallback((procedure) => {
    setComparing((prev) => prev.filter((p) => p.id !== procedure.id));
  }, []);

  // ── Save / bookmark handler (opens auth modal when signed out) ──
  const handleSaveToggle = useCallback(
    (procedure) => {
      if (!user) {
        setShowAuthModal(true);
        return;
      }
      const slug =
        procedure.provider_slug ||
        providerSlugFromParts(procedure.provider_name, procedure.city, procedure.state);
      if (!slug) return;
      if (isSaved(slug)) unsaveProvider(slug);
      else saveProvider(slug, procedure.provider_id || null);
    },
    [user, isSaved, saveProvider, unsaveProvider],
  );

  return (
    <div className="min-h-screen bg-cream page-enter">
      {/* ─── Mobile sticky filter bar (< md) ─── */}
      <div
        className="md:hidden sticky z-30 bg-white"
        style={{
          top: 52,
          borderBottom: '1px solid #EDE8E3',
        }}
      >
        <div className="px-4 pt-2 pb-2 space-y-2">
          {/* Row 1 — active filter chips, scrollable horizontally */}
          <div
            className="flex items-center gap-2 overflow-x-auto"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {activeChips.length === 0 ? (
              <button
                type="button"
                onClick={() => setShowSearchSheet(true)}
                className="inline-flex items-center gap-1.5 whitespace-nowrap"
                style={{
                  height: 32,
                  padding: '0 12px',
                  background: '#FBF9F7',
                  border: '1px dashed #EDE8E3',
                  borderRadius: 2,
                  color: '#888',
                  fontFamily: 'var(--font-body)',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                <Search size={12} />
                Search treatments
              </button>
            ) : (
              activeChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.onClear}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  style={{
                    height: 32,
                    padding: '0 12px',
                    background: '#E8347A',
                    color: 'white',
                    borderRadius: 2,
                    fontFamily: 'var(--font-body)',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  {String(chip.label).toUpperCase()}
                  <X size={12} strokeWidth={3} />
                </button>
              ))
            )}
          </div>

          {/* Row 2 — Filters | Has Prices | List/Map */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilters(true)}
              className="inline-flex items-center gap-1.5"
              style={{
                height: 32,
                padding: '0 12px',
                border: '1px solid #DDD',
                borderRadius: 2,
                background: 'white',
                color: '#111',
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
              }}
            >
              <SlidersHorizontal size={14} />
              Filters
            </button>

            <button
              type="button"
              onClick={() => setHasPricesOnly((p) => !p)}
              className="inline-flex items-center gap-1.5"
              style={{
                height: 32,
                padding: '0 12px',
                border: `1px solid ${hasPricesOnly ? '#E8347A' : '#DDD'}`,
                borderRadius: 2,
                background: hasPricesOnly ? '#E8347A' : 'white',
                color: hasPricesOnly ? 'white' : '#111',
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
              }}
            >
              {hasPricesOnly && <span style={{ fontSize: 10 }}>&#10003;</span>}
              Has prices
            </button>

            {/* List ↔ Map toggle (mobile only — desktop is split view). */}
            <div
              className="ml-auto"
              style={{
                display: 'inline-flex',
                gap: 2,
                background: '#F5F0EC',
                borderRadius: 4,
                padding: 2,
              }}
              role="tablist"
              aria-label="View mode"
            >
              {[
                { mode: 'list', label: '\u2630 List' },
                { mode: 'map', label: '\u229E Map' },
              ].map(({ mode, label }) => (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={viewMode === mode}
                  onClick={() => setViewMode(mode)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 3,
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 600,
                    fontSize: 11,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    background: viewMode === mode ? 'white' : 'transparent',
                    color: viewMode === mode ? '#111' : '#888',
                    transition: 'all 150ms',
                    boxShadow:
                      viewMode === mode ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Inline dosage-estimator hint link — only shown when relevant */}
          {dosageEstimatorAvailable && (
            <button
              type="button"
              onClick={() => setShowFilters(true)}
              className="block text-left"
              style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 300,
                fontSize: 12,
                color: '#E8347A',
              }}
            >
              How many units will I need? &rarr;
            </button>
          )}
        </div>
      </div>

      {/* Sticky search header (desktop only) */}
      <div className="hidden md:block sticky top-16 z-30 bg-white" style={{ borderBottom: '1px solid #E8E8E8' }}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex flex-col md:flex-row gap-2">
            {/* Procedure search */}
            <div ref={procRef} className="relative md:flex-1">
              {selectedProc ? (
                <div
                  className="flex items-center gap-2 px-3 py-2.5 bg-white"
                  style={{ borderRadius: '2px', border: '1px solid #EDE8E3' }}
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
                      border: '1px solid #EDE8E3',
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
                  style={{ borderRadius: '2px', border: '1px solid #EDE8E3' }}
                >
                  <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold uppercase text-white"
                    style={{
                      background: '#E8347A',
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
                      border: '1px solid #EDE8E3',
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
                  border: `1px solid ${showFilters ? '#E8347A' : '#EDE8E3'}`,
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

              {selectedLoc && (
                <a
                  href={`https://www.google.com/maps/search/med+spa+near+${encodeURIComponent(`${selectedLoc.city}, ${selectedLoc.state}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#B8A89A',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    whiteSpace: 'nowrap',
                  }}
                >
                  View area on Google Maps &rarr;
                </a>
              )}
            </div>
          </div>

          {/* Desktop filter panel (hidden on mobile) */}
          {showFilters && (
            <div className="hidden md:block mt-3 pt-3" style={{ borderTop: '1px solid #E8E8E8' }}>
              {renderFilterControls()}
            </div>
          )}
        </div>
      </div>

      {/* Mobile search sheet (expands from collapsed pill) — editorial flat */}
      {showSearchSheet && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-[#1C1410]/45" onClick={() => setShowSearchSheet(false)} />
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
                    style={{ borderRadius: '2px', border: '1px solid #EDE8E3' }}
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
                        border: '1px solid #EDE8E3',
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
                    style={{ borderRadius: '2px', border: '1px solid #EDE8E3' }}
                  >
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold uppercase text-white"
                      style={{
                        background: '#E8347A',
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
                        border: '1px solid #EDE8E3',
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
            className="absolute inset-0 bg-[#1C1410]/45"
            onClick={() => setShowFilters(false)}
          />
          {/* Sheet — slides up with 12px top radius + drag handle */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-white overflow-y-auto animate-slide-up"
            style={{
              maxHeight: '80vh',
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#EDE8E3' }} />
            </div>
            <div className="sticky top-0 bg-white px-5 pt-2 pb-3 flex items-center justify-between" style={{ borderBottom: '1px solid #EDE8E3' }}>
              <h3 className="editorial-kicker">Filters</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-text-secondary hover:text-ink"
                aria-label="Close filters"
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '20px 20px 24px 20px' }}>
              {/* Read the guide link — shown when a procedure is selected */}
              {selectedProc && (
                <button
                  type="button"
                  onClick={() => {
                    setShowFilters(false);
                    setGuideSheetTreatment(selectedProc || procFilter?.label || '');
                    setShowGuideSheet(true);
                  }}
                  className="w-full text-left mb-4"
                  style={{
                    background: '#FBF9F7',
                    border: '1px solid #EDE8E3',
                    borderLeft: '3px solid #E8347A',
                    borderRadius: 2,
                    padding: '12px 14px',
                    fontFamily: 'var(--font-body)',
                    fontSize: 13,
                    color: '#111',
                  }}
                >
                  First time with {brandFilter || procFilter?.label || selectedProc}?{' '}
                  <span style={{ color: '#E8347A', fontWeight: 600 }}>Read the guide &rarr;</span>
                </button>
              )}

              {renderFilterControls()}

              {/* Collapsible dosage estimator — only for first-timer eligible treatments */}
              {firstTimerActive && selectedProc && isFirstTimerFor(selectedProc) && (
                <div
                  className="mt-5"
                  style={{
                    borderTop: '1px solid #EDE8E3',
                    paddingTop: 16,
                  }}
                >
                  <DosageCalculator treatmentName={selectedProc} />
                </div>
              )}
            </div>
            <div className="sticky bottom-0 bg-white p-4" style={{ borderTop: '1px solid #EDE8E3' }}>
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

      {/* Personalized hero header — shown for logged-in users with saved
          treatment preferences, when they haven't picked a specific
          procedure/brand yet. Replaces the gate entirely.
          Hidden on mobile (< md) so the user sees price cards immediately. */}
      {personalizedMode && (
        <div className="hidden md:block bg-cream" style={{ borderBottom: '3px solid #E8347A' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
            <p className="editorial-kicker mb-3" style={{ color: '#E8347A' }}>
              {(() => {
                const loc = selectedLoc
                  ? `${selectedLoc.city}, ${selectedLoc.state}`
                  : null;
                return loc ? `Your treatments · ${loc}` : 'Your treatments';
              })()}
            </p>
            <h1
              className="font-display text-ink"
              style={{ fontWeight: 900, fontSize: 'clamp(28px, 5vw, 48px)', lineHeight: 1.05, letterSpacing: '-0.02em' }}
            >
              {(() => {
                const pillLabels = procedureSlugs
                  .map((s) => findPillBySlug(s)?.label)
                  .filter(Boolean);
                const parts = [...userBrands, ...pillLabels];
                const unique = [...new Set(parts)];
                const joined =
                  unique.length === 0
                    ? 'Your treatments'
                    : unique.length === 1
                    ? unique[0]
                    : unique.length === 2
                    ? `${unique[0]} & ${unique[1]}`
                    : `${unique.slice(0, -1).join(', ')} & ${unique[unique.length - 1]}`;
                const loc = selectedLoc
                  ? ` in ${selectedLoc.city}, ${selectedLoc.state}`
                  : '';
                return `${joined} prices${loc}.`;
              })()}
            </h1>

            {/* Active filter pills — removable per-session */}
            <div className="mt-5 flex items-center gap-2 flex-wrap">
              {procedureSlugs.map((slug) => {
                const pill = findPillBySlug(slug);
                if (!pill) return null;
                return (
                  <button
                    key={`slug-${slug}`}
                    type="button"
                    onClick={() => {
                      // Session-only: pick this pill as the explicit filter
                      // so the user can drill in without touching saved prefs.
                      setProcFilter(makeProcedureFilterFromPill(pill));
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold uppercase text-white transition-colors"
                    style={{
                      letterSpacing: '0.08em',
                      borderRadius: '4px',
                      background: '#E8347A',
                      fontFamily: 'var(--font-body)',
                    }}
                    title={`Drill into ${pill.label}`}
                  >
                    {pill.label.toUpperCase()}
                  </button>
                );
              })}
              {userBrands.map((brand) => (
                <button
                  key={`brand-${brand}`}
                  type="button"
                  onClick={() => setBrandFilter(brand)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold uppercase text-white transition-colors"
                  style={{
                    letterSpacing: '0.08em',
                    borderRadius: '4px',
                    background: '#E8347A',
                    fontFamily: 'var(--font-body)',
                  }}
                  title={`Drill into ${brand}`}
                >
                  {brand.toUpperCase()}
                </button>
              ))}
              <Link
                to="/settings#treatment-preferences"
                className="inline-flex items-center gap-1 px-3 py-1 text-[10px] font-semibold uppercase transition-colors"
                style={{
                  letterSpacing: '0.08em',
                  borderRadius: '4px',
                  border: '1px solid #DDD',
                  background: 'transparent',
                  color: '#888',
                  fontFamily: 'var(--font-body)',
                }}
              >
                + Add
              </Link>
            </div>

            <div className="mt-4 flex items-center gap-4 flex-wrap">
              <Link
                to="/settings#treatment-preferences"
                className="text-[11px] font-medium hover:opacity-70 transition-opacity"
                style={{
                  color: '#E8347A',
                  fontFamily: 'var(--font-body)',
                  borderBottom: '1px solid #E8347A',
                  paddingBottom: '1px',
                }}
              >
                Edit treatment preferences &rarr;
              </Link>
              <button
                type="button"
                onClick={() => setPersonalDismissed(true)}
                className="text-[11px] font-medium text-text-secondary hover:text-ink transition-colors"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Browse all treatments
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editorial cream hero header — when procedure/brand selected OR location set */}
      {!personalizedMode && (procFilter || brandFilter || selectedLoc) && (
        <div className="hidden md:block bg-cream" style={{ borderBottom: '3px solid #E8347A' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
            <p className="editorial-kicker mb-3">
              {hasPricesOnly ? 'Verified providers' : 'Real prices · No consultations'}
            </p>
            <h1
              className="font-display text-ink"
              style={{ fontWeight: 900, fontSize: 'clamp(32px, 6vw, 56px)', lineHeight: 1, letterSpacing: '-0.02em' }}
            >
              {(() => {
                // Brand wins over the category label when set. When the
                // user picks "Botox / Dysport / Xeomin" from the dropdown
                // (no brand), getProcedureLabel collapses that combined
                // string to "Neurotoxin" — we never want the raw combined
                // string in the page headline.
                const label = getProcedureLabel(procFilter?.label, brandFilter) || 'Treatment';
                const loc = selectedLoc && !fallbackScope
                  ? `${selectedLoc.city}, ${selectedLoc.state}`
                  : null;
                return loc
                  ? `${label} prices in ${loc}.`
                  : `${label} prices.`;
              })()}
            </h1>
            {/* Neurotoxin subhead — shown only when on the generic category
                (no brand selected) to make the multi-brand nature explicit. */}
            {!brandFilter && procFilter?.slug === 'neurotoxin' && (
              <p
                className="italic text-text-secondary mt-2"
                style={{ fontFamily: 'var(--font-body)', fontWeight: 300, fontSize: '14px' }}
              >
                Comparing Botox, Dysport, Xeomin, Jeuveau, and Daxxify.
              </p>
            )}
            {/* Active brand chip — removable */}
            {brandFilter && (
              <div className="mt-4 flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setBrandFilter(null)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-[10px] font-semibold uppercase text-white"
                  style={{
                    letterSpacing: '0.08em',
                    borderRadius: '4px',
                    background: '#E8347A',
                    fontFamily: 'var(--font-body)',
                  }}
                  title={`Remove ${brandFilter} filter`}
                >
                  {brandFilter}
                  <X size={12} strokeWidth={3} />
                </button>
              </div>
            )}
            {!loadingProcedures && (procFilter || brandFilter) && (
              <p className="font-body font-light text-text-secondary mt-4 text-[15px]">
                {procedures.length}
                {brandFilter ? ` ${brandFilter}` : ''}
                {hasPricesOnly ? ' provider' : ' price'}{procedures.length !== 1 ? 's' : ''}
                {hasPricesOnly ? ' with verified prices' : ''}
                {totalCount > 0 && !hasActiveFilters && !brandFilter && ` · of ${totalCount.toLocaleString()} total`}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Pre-results area — banners, gates, fallback note. The actual
          results (header chrome + cards + map) live in their own
          full-width section below so the desktop split-view map can
          stretch beyond this 900px clamp.
          When the happy path is active, this container only holds the
          fallback note (if any), so we collapse its padding to avoid
          a visible gap above the split layout. */}
      {(() => {
        const hasResults =
          !personalizedMode &&
          procFilter &&
          !loadingProcedures &&
          displayedProcedures.length > 0;
        return (
      <div
        className="mx-auto px-4"
        style={{
          maxWidth: 900,
          paddingTop: hasResults ? 12 : 24,
          // Clear the fixed mobile bottom nav (56px) + safe-area so the
          // last card is never hidden behind it and its tap zone can't
          // be accidentally contested. The split layout below handles
          // its own bottom padding when results are showing.
          paddingBottom: hasResults
            ? 0
            : IS_MOBILE
            ? 'calc(100px + env(safe-area-inset-bottom, 0px))'
            : 100,
        }}
      >
        {/* "Save your preferences" banner — logged-in users with no saved
            preferences yet. Shown alongside the gate, not replacing it. */}
        {user && !hasSavedPrefs && !prefsLoading && !procFilter && !brandFilter && (
          <div
            className="mb-6 flex items-center justify-between gap-3"
            style={{
              background: '#FBF9F7',
              borderLeft: '3px solid #E8347A',
              borderRadius: 0,
              padding: '12px 18px',
            }}
          >
            <p
              className="text-[13px] text-ink"
              style={{ fontFamily: 'var(--font-body)', fontWeight: 400 }}
            >
              Save your treatment preferences to skip this step next time.
            </p>
            <Link
              to="/settings#treatment-preferences"
              className="shrink-0 text-[10px] font-semibold uppercase transition-opacity hover:opacity-80"
              style={{
                color: '#E8347A',
                letterSpacing: '0.10em',
                borderBottom: '1px solid #E8347A',
                fontFamily: 'var(--font-body)',
              }}
            >
              Set preferences &rarr;
            </Link>
          </div>
        )}

        {/* Editorial gate state — no procedure picked (desktop only; mobile shows prices immediately) */}
        {!personalizedMode && !procFilter && !brandFilter && !selectedLoc && (
          <div className="hidden md:block text-center py-12 mb-6">
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

        {/* First-Timer Mode Banner — gated on firstTimerActive (user opted
            in) AND on there being a procedure in the URL; it reads the
            procedure/brand directly from state (which mirrors the URL) so
            it always matches what the user is actually browsing, not a
            stale onboarding pick. */}
        {firstTimerActive && (
          <FirstTimerModeBanner
            procedure={procFilter?.slug || null}
            brand={brandFilter}
            onOpenGuide={() => {
              setGuideSheetTreatment(selectedProc || procFilter?.label || '');
              setShowGuideSheet(true);
            }}
            onDeactivate={() => {
              // Per-procedure dismissal is handled internally; we keep
              // firstTimerActive on so the banner reappears for other
              // procedures the user browses.
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
              persistFirstTimerMode(true);
              setFirstTimerActive(true);
              setGuideSheetTreatment(selectedProc);
              setShowGuideSheet(true);
            }}
            onDismissed={() => {}}
          />
        )}

        {/* Dosage Calculator — hidden on mobile (moved to filters drawer) */}
        {firstTimerActive && selectedProc && isFirstTimerFor(selectedProc) && (
          <div className="hidden md:block">
            <DosageCalculator treatmentName={selectedProc} />
          </div>
        )}

        {/* Fallback note */}
        {fallbackLabel && (
          <div
            className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-3 mb-4 text-[13px] font-light"
            style={{
              background: '#FBF9F7',
              borderLeft: '3px solid #E8347A',
              color: '#111',
              fontFamily: 'var(--font-body)',
              paddingRight: 16,
            }}
          >
            <span className="flex-1 min-w-0 break-words">
              {fallbackScope === 'national'
                ? `Showing national prices \u2014 no results found near ${filterCity || filterState}`
                : `No prices in ${filterCity} yet \u2014 showing ${fallbackLabel} prices`}
            </span>
            <Link
              to="/log"
              className="self-start sm:self-auto sm:ml-auto shrink-0 text-[10px] font-semibold uppercase hover:opacity-80 transition-opacity"
              style={{ color: '#E8347A', letterSpacing: '0.10em', borderBottom: '1px solid #E8347A' }}
            >
              Be the first
            </Link>
          </div>
        )}

        {/* Unhappy paths only — gate, personalized, loading, empty.
            The happy path (we have results) is rendered OUTSIDE this
            900px container so the desktop split-view map can fill the
            full viewport width. */}
        {personalizedMode ? (
          personalLoading ? (
            <SkeletonGrid count={6} />
          ) : personalProviders.length === 0 ? (
            <div className="text-center py-12">
              <p
                className="font-display text-ink mb-2"
                style={{ fontWeight: 700, fontSize: '20px' }}
              >
                No matches for your treatments{selectedLoc ? ` in ${selectedLoc.city}, ${selectedLoc.state}` : ''} yet.
              </p>
              <p className="text-[13px] text-text-secondary font-light" style={{ fontFamily: 'var(--font-body)' }}>
                Try a different city, or{' '}
                <button
                  type="button"
                  onClick={() => setPersonalDismissed(true)}
                  className="underline hover:opacity-80"
                  style={{ color: '#E8347A' }}
                >
                  browse all treatments
                </button>
                .
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {personalProviders.map((entry) => (
                <MultiProcedureProviderCard
                  key={entry.provider.id}
                  entry={entry}
                  targetCount={entry.targetCount}
                  userLat={userLat}
                  userLng={userLng}
                />
              ))}
            </div>
          )
        ) : !procFilter ? (
          <div className="py-8">
            <ProcedureGate variant="block" onSelect={selectPill} />
          </div>
        ) : loadingProcedures ? (
          <SkeletonGrid count={6} />
        ) : displayedProcedures.length === 0 ? (
          <SmartEmptyState
            procedureLabel={procFilter?.label}
            procedureSlug={procFilter?.slug}
            procedureType={procFilter?.primary || selectedProc}
            procedureTypes={filterProcedureTypes}
            brand={brandFilter}
            city={selectedLoc?.city}
            state={selectedLoc?.state}
          />
        ) : null}
      </div>
        );
      })()}

      {/* ─── Happy path: header chrome + split-view (desktop) /
              toggled view (mobile) ─── */}
      {!personalizedMode && procFilter && !loadingProcedures && displayedProcedures.length > 0 && (
        <div>
          {/* Header chrome — clamped to ~1400 so it doesn't sprawl on
              ultrawide monitors but does extend wider than the prior
              900px so it lines up with the split layout below. */}
          <div className="mx-auto px-4" style={{ maxWidth: 1400 }}>
            <PriceContextBar
              prices={displayedProcedures}
              brandLabel={brandFilter || procFilter?.label}
              city={selectedLoc?.city}
              state={selectedLoc?.state}
            />
            <StickyFilterBar
              brandPills={brandPills}
              activeBrand={brandFilter}
              onBrandChange={(b) => setBrandFilter(b)}
              sortBy={sortBy}
              onSortChange={setSortBy}
              hasPricesOnly={hasPricesOnly}
              onHasPricesToggle={() => setHasPricesOnly((v) => !v)}
              verifiedOnly={verifiedOnly}
              onVerifiedToggle={() => setVerifiedOnly((v) => !v)}
              userHasLocation={userLat != null && userLng != null}
            />
            <ResultsCountBar
              count={displayedProcedures.length}
              brandLabel={brandFilter || procFilter?.label}
              city={selectedLoc?.city}
              state={selectedLoc?.state}
            />
            {bestDealInfo && (
              <SavingsCallout
                city={selectedLoc?.city}
                savings={bestDealInfo.savings}
                units={bestDealInfo.units}
                price={bestDealInfo.normalizedPrice}
                avg={bestDealInfo.avg}
              />
            )}
          </div>

          {/* Split-view body. Desktop: list left + map right. Mobile:
              list-or-map toggle. The split is responsive purely off
              `isMobile` so the desktop map never has to mount on a
              phone. */}
          {isMobile ? (
            viewMode === 'map' ? (
              <div
                style={{
                  position: 'relative',
                  height: 'calc(100vh - 220px)',
                  // Same bottom-padding logic as the list so the
                  // mobile bottom nav never overlaps the map.
                  marginBottom:
                    'calc(80px + env(safe-area-inset-bottom, 0px))',
                }}
              >
                <GlowMap
                  procedures={displayedProcedures}
                  cityAvg={cityAvgPrice}
                  city={selectedLoc?.city}
                  state={selectedLoc?.state}
                  highlightedId={hoveredProviderId}
                  selectedId={selectedProviderGroup?.provider_id || null}
                  onPinClick={handlePinClick}
                />
                {selectedProviderGroup && (
                  <ProviderBottomSheet
                    group={selectedProviderGroup}
                    onClose={() => setSelectedProviderGroup(null)}
                  />
                )}
              </div>
            ) : (
              <div
                className="mx-auto px-4"
                style={{
                  maxWidth: 900,
                  paddingTop: 8,
                  paddingBottom:
                    'calc(100px + env(safe-area-inset-bottom, 0px))',
                }}
              >
                {groupedProviders.map((group) => {
                  const primary = group.procedures[0];
                  const slug =
                    primary.provider_slug ||
                    providerSlugFromParts(
                      primary.provider_name,
                      primary.city,
                      primary.state,
                    );
                  const saved = slug ? isSaved(slug) : false;
                  // Compare state is per-procedure (the cheapest one
                  // is what gets toggled), so reflect that in the
                  // button state too.
                  const isCompared = comparing.some(
                    (p) => p.id === primary.id,
                  );
                  const selected =
                    selectedProviderGroup?.provider_id != null &&
                    selectedProviderGroup.provider_id === group.provider_id;
                  return (
                    <div
                      key={group.key}
                      data-provider-card={group.provider_id || ''}
                    >
                      <PriceCard
                        procedures={group.procedures}
                        cityAvg={cityAvgPrice}
                        userLat={userLat}
                        userLng={userLng}
                        isCompared={isCompared}
                        onCompareToggle={() => toggleCompare(primary)}
                        isSaved={saved}
                        onSaveToggle={() => handleSaveToggle(primary)}
                        comparingFull={comparing.length >= 3 && !isCompared}
                        selected={selected}
                      />
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div
              className="mx-auto"
              style={{
                maxWidth: 1400,
                display: 'flex',
                gap: 0,
                height: 'calc(100vh - 260px)',
                minHeight: 520,
                overflow: 'hidden',
                paddingLeft: 16,
                paddingRight: 16,
              }}
            >
              {/* Left: scrollable list */}
              <div
                style={{
                  width: 460,
                  flexShrink: 0,
                  overflowY: 'auto',
                  paddingRight: 16,
                  paddingBottom: 40,
                  borderRight: '1px solid #EDE8E3',
                }}
              >
                {groupedProviders.map((group) => {
                  const primary = group.procedures[0];
                  const slug =
                    primary.provider_slug ||
                    providerSlugFromParts(
                      primary.provider_name,
                      primary.city,
                      primary.state,
                    );
                  const saved = slug ? isSaved(slug) : false;
                  const isCompared = comparing.some(
                    (p) => p.id === primary.id,
                  );
                  const selected =
                    selectedProviderGroup?.provider_id != null &&
                    selectedProviderGroup.provider_id === group.provider_id;
                  return (
                    <div
                      key={group.key}
                      data-provider-card={group.provider_id || ''}
                    >
                      <PriceCard
                        procedures={group.procedures}
                        cityAvg={cityAvgPrice}
                        userLat={userLat}
                        userLng={userLng}
                        isCompared={isCompared}
                        onCompareToggle={() => toggleCompare(primary)}
                        isSaved={saved}
                        onSaveToggle={() => handleSaveToggle(primary)}
                        comparingFull={comparing.length >= 3 && !isCompared}
                        onHoverChange={handleCardHover}
                        selected={selected}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Right: sticky map filling remaining width */}
              <div
                style={{
                  flex: 1,
                  position: 'relative',
                  paddingLeft: 16,
                }}
              >
                <GlowMap
                  procedures={displayedProcedures}
                  cityAvg={cityAvgPrice}
                  city={selectedLoc?.city}
                  state={selectedLoc?.state}
                  highlightedId={hoveredProviderId}
                  selectedId={selectedProviderGroup?.provider_id || null}
                  onPinClick={handlePinClick}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compare tray slides up when 2+ providers are selected */}
      <CompareTray
        providers={comparing}
        onClear={clearCompare}
        onRemove={removeFromCompare}
        userLat={userLat}
        userLng={userLng}
      />

      {/* Auth modal — opened when signed-out user taps SAVE */}
      {showAuthModal && (
        <AuthModal mode="signin" onClose={() => setShowAuthModal(false)} />
      )}

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

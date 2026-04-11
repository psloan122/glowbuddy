import { useState, useEffect, useRef, useCallback, useContext, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, X, ChevronDown, MapPin, SlidersHorizontal, Link2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PriceContextBar from '../components/browse/PriceContextBar';
import StickyFilterBar from '../components/browse/StickyFilterBar';
import PriceCard from '../components/browse/PriceCard';
import CompareTray from '../components/browse/CompareTray';
import SavingsCallout from '../components/browse/SavingsCallout';
import SmartEmptyState from '../components/browse/SmartEmptyState';
import GlowMap from '../components/browse/GlowMap';
import ProviderBottomSheet from '../components/browse/ProviderBottomSheet';
import ProviderAvatar from '../components/ProviderAvatar';
import ProviderProfileModal from '../components/ProviderProfileModal';
import MobileBrowseSheet from '../components/browse/MobileBrowseSheet';
import MobileMapSearchOverlay from '../components/browse/MobileMapSearchOverlay';
import useSavedProviders from '../hooks/useSavedProviders';
import AuthModal from '../components/AuthModal';
import { providerSlugFromParts } from '../lib/slugify';
import { haversineMiles } from '../lib/distance';
import {
  getCity as getGatingCity, setCity as persistCity,
  getState as getGatingState, setState as persistState,
  setZip as persistZip,
} from '../lib/gating';
import MultiProcedureProviderCard from '../components/MultiProcedureProviderCard';
import useUserPreferences from '../hooks/useUserPreferences';
import useUserLocation from '../hooks/useUserLocation';
import FirstTimerBadge from '../components/FirstTimerBadge';
import FirstTimerModeBanner from '../components/FirstTimerModeBanner';
import FirstTimerOnboardingPrompt from '../components/FirstTimerOnboardingPrompt';
import FirstTimerGuideSheet from '../components/FirstTimerGuideSheet';
import {
  isFirstTimerMode, setFirstTimerMode as persistFirstTimerMode,
  addFirstTimerTreatment, getFirstTimerTreatments,
  isFirstTimerFor,
} from '../lib/firstTimerMode';
import {
  PROCEDURE_TYPES,
  PROVIDER_TYPES,
  PROCEDURE_PILLS,
  CATEGORY_PILLS,
  resolveProcedureFilter,
  makeProcedureFilterFromCanonical,
  makeProcedureFilterFromPill,
  findPillByLabel,
  findPillBySlug,
} from '../lib/constants';
import GateLeftPanel from '../components/browse/GateLeftPanel';
import { searchCitiesViaGoogle } from '../lib/places';
import { lookupZip } from '../lib/zipLookup';
import { assignTrustTier } from '../lib/trustTiers';
import { AuthContext } from '../App';
import ProcedureDetailSheet from '../components/ProcedureDetailSheet';
import DosingCalculatorSheet from '../components/DosingCalculatorSheet';
import AddExperienceSheet from '../components/AddExperienceSheet';
import { setPageMeta } from '../lib/seo';
import { normalizePrice } from '../lib/priceUtils';
import { SkeletonGrid } from '../components/SkeletonCard';
import { filterProvidersByTreatment, countProvidersByTreatment } from '../utils/matchesTreatment';

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

// sessionStorage key for the most recent /browse filter set. Only used as
// a fallback when the user lands on /browse with no URL params (e.g.
// they navigated away to a provider profile and clicked "Find Prices"
// in the navbar). URL params always win when present.
const BROWSE_FILTERS_KEY = 'glowbuddy.browseFilters.v1';
const BROWSE_RESULTS_KEY = 'glowbuddy.browseResults.v1';
const RESULTS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
  const [feedError, setFeedError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);

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

  // Sub-type filter for drilling into a specific procedure type within a
  // category (e.g. "Lip Filler" within Fillers). Independent from brandFilter
  // — neurotoxins use brand, other categories use subType.
  const [subTypeFilter, setSubTypeFilter] = useState(() => {
    const urlSubType = searchParams.get('subtype');
    if (urlSubType) return urlSubType;
    const persisted = readPersistedFilters();
    return persisted?.subType || null;
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
  const mobileLocInputRef = useRef(null);
  const locDebounce = useRef(null);
  const [cityHighlight, setCityHighlight] = useState(false);

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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileSearchFocus, setMobileSearchFocus] = useState('treatment');
  const [detailSheet, setDetailSheet] = useState(null);
  const [experienceSheet, setExperienceSheet] = useState(null);
  const [dosingSheet, setDosingSheet] = useState(null);
  const [minRating, setMinRating] = useState('');

  // First-timer state
  const [firstTimerActive, setFirstTimerActive] = useState(() => isFirstTimerMode());
  const [showGuideSheet, setShowGuideSheet] = useState(false);
  const [guideSheetTreatment, setGuideSheetTreatment] = useState('');

  // --- Personalized browse (PROMPT 8) ---
  // Logged-in users with saved procedure_slugs / brands in user_preferences
  // bypass the ProcedureGate on /browse and see a personalized feed grouped
  // by provider. The header + feed still respect `procFilter` / `brandFilter`
  // when they're set — personal mode only kicks in while BOTH are null and
  // the session hasn't dismissed it.
  const { procedureSlugs, brands: userBrands, loading: prefsLoading } = useUserPreferences();
  const [personalDismissed, setPersonalDismissed] = useState(false);
  const [prefsBannerDismissed, setPrefsBannerDismissed] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem('glow_prefs_banner_dismissed') === '1',
  );
  const hasSavedPrefs = procedureSlugs.length > 0 || userBrands.length > 0;
  const personalizedMode =
    !!user && hasSavedPrefs && !procFilter && !brandFilter && !personalDismissed;
  const [personalProviders, setPersonalProviders] = useState([]);
  const [personalLoading, setPersonalLoading] = useState(false);

  // (No cross-city fallback. When a city has no prices for the chosen
  // treatment we show the empty state with a "Be the first" CTA — we
  // never silently substitute national results under a city headline,
  // because that misleads users into thinking those prices are local.)

  // Fair price averages: { [procedure_type]: { avg, scope } }
  const [fairPriceAvgs, setFairPriceAvgs] = useState({});

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

  // ── Viewport-based filtering state ──
  // mapBounds: the current viewport rectangle reported by GlowMap on idle.
  // showSearchArea: true once the user pans/zooms the map manually.
  // searchAreaBounds: the bounds snapshot used for the last "Search this
  // area" re-query — distinct from mapBounds so the Supabase fetch only
  // fires on explicit button click, never on every pan.
  const [mapBounds, setMapBounds] = useState(null);
  const [showSearchArea, setShowSearchArea] = useState(false);
  const [searchAreaBounds, setSearchAreaBounds] = useState(null);

  // ── Map view state ──
  // hoveredProviderId paints a highlight ring on the map pin when the
  // user mouses over a list card. selectedProviderGroup is set when the
  // user taps a pin on mobile (opens the bottom sheet) or desktop (it
  // just paints the matching list card with a black ring).
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  );
  const [hoveredProviderId, setHoveredProviderId] = useState(null);
  const [selectedProviderGroup, setSelectedProviderGroup] = useState(null);

  // ── City providers (always fetched when there's a city) ────────────
  // Every active med spa in the selected city. This is the source of
  // truth for which pins exist on the map regardless of whether a
  // treatment is selected — when no treatment is picked we show every
  // provider as a gray initials pin (GasBuddy-style discovery), and
  // when a treatment is picked the same pins recolor based on which
  // ones have prices for that treatment. The pins NEVER disappear on
  // procedure selection because the GlowMap reads from this list, not
  // from the priced query. Sorted by google_review_count desc so the
  // most-reviewed med spas surface first in the discovery list.
  // (Variable kept named `gateProviders` to minimize diff churn — its
  // semantics are now "city providers" regardless of gate state.)
  const [gateProviders, setGateProviders] = useState([]);
  const [gateProvidersLoading, setGateProvidersLoading] = useState(false);
  const [gateSelectedProviderGroup, setGateSelectedProviderGroup] = useState(null);

  // Per-pill provider counts + raw pricing rows for filtering.
  // Computed from a lightweight provider_pricing query keyed off gateProviders.
  const [pillCounts, setPillCounts] = useState({});
  const [categoryCounts, setCategoryCounts] = useState({});
  const [treatmentSearch, setTreatmentSearch] = useState('');
  const [cityPricingRows, setCityPricingRows] = useState([]);

  // ── Mobile sheet ↔ map padding sync ──
  // Track the sheet's snap position so we can tell the map which part
  // of the viewport is covered and shouldn't hold centered pins.
  const [mobileSheetSnap, setMobileSheetSnap] = useState('half');
  const mapBottomPadding = useMemo(() => {
    if (!isMobile || !selectedLoc) return 0;
    const h = typeof window !== 'undefined' ? window.innerHeight : 800;
    if (mobileSheetSnap === 'full_map') return Math.round(h * 0.12);
    if (mobileSheetSnap === 'full_list') return Math.round(h * 0.05);
    return Math.round(h * 0.45); // half (default)
  }, [isMobile, selectedLoc, mobileSheetSnap]);

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
    if (!isMobile) setSelectedProviderGroup(null);
  }, [isMobile]);

  // Body scroll lock: when mobile has a city selected, the map fills the
  // viewport and the bottom sheet handles scrolling. Lock the body so the
  // page behind doesn't scroll. Always return a cleanup so overflow is
  // restored on unmount regardless of which branch was active.
  useEffect(() => {
    if (isMobile && selectedLoc) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobile, selectedLoc]);

  // Fetch every active provider in the city. Runs whenever there's a
  // city — including when a procedure/brand filter is active — so the
  // GlowMap always has the full base layer of pins to render. The
  // priced overlay is a separate query (`procedures`) that the map
  // applies on top of these base pins; pins never disappear on
  // procedure selection because they're driven by this list, not
  // the priced query. Skips only in personalized mode (which has its
  // own provider feed) or when there's no city.
  useEffect(() => {
    if (personalizedMode || !selectedLoc) {
      setGateProviders([]);
      return undefined;
    }
    let cancelled = false;
    setGateProvidersLoading(true);
    (async () => {
      try {
        let query = supabase
          .from('providers')
          .select(
            'id, name, slug, city, state, lat, lng, google_rating, google_review_count, provider_type, is_active',
          )
          .eq('is_active', true);
        // When "Search this area" bounds are set, query by lat/lng
        // instead of city/state so pins match the viewport rectangle.
        if (searchAreaBounds) {
          query = query
            .gte('lat', searchAreaBounds.south)
            .lte('lat', searchAreaBounds.north)
            .gte('lng', searchAreaBounds.west)
            .lte('lng', searchAreaBounds.east);
        } else {
          query = query
            .eq('state', selectedLoc.state)
            .ilike('city', `%${selectedLoc.city}%`);
        }
        query = query.limit(200);
        const { data, error } = await query;
        if (cancelled) return;
        if (error) {
          // eslint-disable-next-line no-console
          console.error('[FindPrices] gate providers fetch failed', error);
          setGateProviders([]);
        } else {
          const sorted = (data || []).slice().sort((a, b) => {
            const ac = Number(a.google_review_count) || 0;
            const bc = Number(b.google_review_count) || 0;
            if (bc !== ac) return bc - ac;
            const ar = Number(a.google_rating) || 0;
            const br = Number(b.google_rating) || 0;
            return br - ar;
          });
          setGateProviders(sorted);
        }
      } catch (err) {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.error('[FindPrices] gate providers fetch threw', err);
        setGateProviders([]);
      } finally {
        if (!cancelled) setGateProvidersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [personalizedMode, selectedLoc?.city, selectedLoc?.state, searchAreaBounds]);

  // ── Pill provider counts + city pricing rows ──
  // Lightweight query: fetch procedure_type + brand for all providers in
  // the city. Used for (a) pill badge counts and (b) filtering allProviders
  // down to only those offering the selected treatment on the map.
  useEffect(() => {
    if (!gateProviders?.length) {
      setPillCounts({});
      setCategoryCounts({});
      setCityPricingRows([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const ids = gateProviders.map((p) => p.id);
      const { data, error } = await supabase
        .from('provider_pricing')
        .select('provider_id, procedure_type, brand')
        .in('provider_id', ids)
        .eq('display_suppressed', false);
      if (cancelled || error || !data) return;
      setCityPricingRows(data);
      setPillCounts(countProvidersByTreatment(data, PROCEDURE_PILLS));
      setCategoryCounts(countProvidersByTreatment(data, CATEGORY_PILLS));
    })();
    return () => { cancelled = true; };
  }, [gateProviders]);

  // Clear the gate-mode bottom sheet whenever the underlying gate
  // conditions change, so a stale provider can't stay selected after
  // the user changes cities or picks a treatment.
  useEffect(() => {
    setGateSelectedProviderGroup(null);
  }, [personalizedMode, procFilter, brandFilter, selectedLoc?.city, selectedLoc?.state]);

  const handleGatePinClick = useCallback((group) => {
    setGateSelectedProviderGroup(group);
  }, []);

  const handleGatePillSelect = useCallback(
    (pill) => {
      setGateSelectedProviderGroup(null);
      setProcFilter(makeProcedureFilterFromPill(pill));
      setBrandFilter(pill?.brand || null);
      setProcQuery('');
      setProcOpen(false);
    },
    [],
  );

  const handlePinClick = useCallback(
    (group) => {
      // Enrich with procedures already loaded in memory so the bottom
      // sheet never has to refetch. Fixes provider_id mismatches where
      // the marker group had empty rows despite the list card showing prices.
      const match = groupedProviders.find(
        (g) => g.provider_id && g.provider_id === group.provider_id,
      );
      const enriched = match
        ? { ...group, rows: match.procedures }
        : group;
      setSelectedProviderGroup(enriched);
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
    [isMobile, groupedProviders],
  );

  // Clicking empty map space dismisses the provider profile modal.
  const handleMapClick = useCallback(() => {
    setSelectedProviderGroup(null);
    setGateSelectedProviderGroup(null);
  }, []);

  const handleCardHover = useCallback((procedure, isEntering) => {
    setHoveredProviderId(isEntering ? procedure.provider_id || null : null);
  }, []);

  // ── Viewport callbacks for GlowMap ──
  const handleBoundsChange = useCallback((bounds) => {
    setMapBounds(bounds);
  }, []);

  const handleUserMovedMap = useCallback(() => {
    setShowSearchArea(true);
  }, []);

  const handleSearchAreaClick = useCallback(() => {
    setSearchAreaBounds(mapBounds);
    setShowSearchArea(false);
  }, [mapBounds]);

  // Reset viewport + pricing state when the user changes city.
  // Clearing cityPricingRows is critical: without it, filteredGateProviders
  // tries to match NEW city providers against OLD city pricing rows (zero
  // provider_id overlap) and returns an empty array — the map shows no pins
  // until the cityPricingRows fetch catches up. With the clear,
  // filterProvidersByTreatment's empty-rows fallback returns ALL providers
  // immediately, then narrows once pricing data arrives.
  useEffect(() => {
    setMapBounds(null);
    setShowSearchArea(false);
    setSearchAreaBounds(null);
    setCityPricingRows([]);
    setPillCounts({});
    setCategoryCounts({});
  }, [selectedLoc]);

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
      title = `${capitalize(procedure)} prices in ${city}, ${state} | Know Before You Glow`;
      if (!brandFilter && procFilter?.slug === 'neurotoxin') {
        desc = `Compare Botox, Dysport, and Xeomin prices from med spas in ${city}, ${state}. Real prices from verified patients. Know before you glow.`;
      } else {
        desc = `See what patients actually paid for ${procedure} in ${city}, ${state}. Real prices from verified patients. Know before you glow. Free on Know Before You Glow.`;
      }
    } else if (city) {
      title = `Med spa prices in ${city}, ${state} | Know Before You Glow`;
      desc = `Compare real patient-reported prices for Botox, fillers, and more in ${city}, ${state}. Know before you glow.`;
    } else if (procedure) {
      title = `${capitalize(procedure)} prices near you | Know Before You Glow`;
      desc = `See what patients actually paid for ${procedure}. Real prices from verified patients on Know Before You Glow.`;
    } else {
      title = 'Find Med Spa Prices Near You | Know Before You Glow';
      desc = 'Compare real patient-reported prices for Botox, lip filler, and med spa treatments. See what people actually paid near you.';
    }

    // Build a clean canonical: /browse with only the indexable filters
    // (procedure, brand, city, state) — drop ephemeral state like sort/page.
    const canonicalParams = new URLSearchParams();
    if (procFilter?.slug) canonicalParams.set('procedure', procFilter.slug);
    if (brandFilter) canonicalParams.set('brand', brandFilter);
    if (subTypeFilter) canonicalParams.set('subtype', subTypeFilter);
    if (selectedLoc?.city) canonicalParams.set('city', selectedLoc.city);
    if (selectedLoc?.state) canonicalParams.set('state', selectedLoc.state);
    const qs = canonicalParams.toString();
    const canonical = `https://knowbeforeyouglow.com/browse${qs ? `?${qs}` : ''}`;

    setPageMeta({ title, description: desc, canonical });
  }, [procFilter, brandFilter, subTypeFilter, selectedLoc]);

  // Sync filters to URL params (SEO-friendly) AND persist to sessionStorage
  // so the user can navigate to a provider profile and click "Find Prices"
  // again without losing their filters.
  useEffect(() => {
    const params = {};
    if (procFilter) params.procedure = procFilter.slug;
    if (brandFilter) params.brand = brandFilter;
    if (subTypeFilter) params.subtype = subTypeFilter;
    if (selectedLoc?.city) params.city = selectedLoc.city;
    if (selectedLoc?.state) params.state = selectedLoc.state;
    if (sortBy !== 'most_verified') params.sort = sortBy;
    if (hasPricesOnly) params.has_prices = '1';
    if (verifiedOnly) params.verified = '1';
    setSearchParams(params, { replace: true });

    writePersistedFilters({
      procedureSlug: procFilter?.slug || null,
      brand: brandFilter || null,
      subType: subTypeFilter || null,
      city: selectedLoc?.city || null,
      state: selectedLoc?.state || null,
      sortBy,
      hasPricesOnly,
      verifiedOnly,
    });
  }, [procFilter, brandFilter, subTypeFilter, selectedLoc, sortBy, hasPricesOnly, verifiedOnly]);

  // Restore procFilter + brandFilter + selectedLoc from URL on back/forward
  // navigation AND on in-app navigations that swap URL params via <Link>
  // (e.g. SmartEmptyState's nearby-city rows). Without syncing city/state
  // here, clicking a nearby city link only updates the URL — selectedLoc
  // stays stale and the data fetch (which depends on filterCity/filterState)
  // never re-fires.
  useEffect(() => {
    const urlSlug = searchParams.get('procedure') || '';
    const urlBrand = searchParams.get('brand') || '';
    const urlCity = searchParams.get('city') || '';
    const urlState = searchParams.get('state') || '';
    const currentSlug = procFilter?.slug || '';
    const currentBrand = brandFilter || '';
    const currentCity = selectedLoc?.city || '';
    const currentState = selectedLoc?.state || '';
    if (urlSlug !== currentSlug || urlBrand !== currentBrand) {
      // Pass the brand so neurotoxin&brand=Dysport resolves to the
      // Dysport pill rather than the default Botox one.
      setProcFilter(resolveProcedureFilter(urlSlug, urlBrand || null));
    }
    if (urlBrand !== currentBrand) {
      setBrandFilter(urlBrand || null);
    }
    const urlSubType = searchParams.get('subtype') || '';
    const currentSubType = subTypeFilter || '';
    if (urlSubType !== currentSubType) {
      setSubTypeFilter(urlSubType || null);
    }
    if (urlCity !== currentCity || urlState !== currentState) {
      if (urlCity && urlState) {
        setSelectedLoc({ city: urlCity, state: urlState });
      } else if (!urlCity && !urlState && (currentCity || currentState)) {
        // URL cleared city/state — only clear local state if both gone,
        // so partial param edits don't drop the user's location.
        setSelectedLoc(null);
      }
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
    setSubTypeFilter(null);
    setProcQuery('');
    setProcOpen(false);
  }

  function selectPill(pill) {
    setProcFilter(makeProcedureFilterFromPill(pill));
    // Brand-specific pills (e.g. Botox / Dysport / Xeomin) carry a brand
    // through the URL so the provider_pricing.brand filter activates.
    // Non-brand pills (Fillers, Laser, ...) clear any stale brand filter.
    setBrandFilter(pill?.brand || null);
    setSubTypeFilter(null);
    setTreatmentSearch('');
    setProcQuery('');
    setProcOpen(false);
  }

  function clearProcedure() {
    setProcFilter(null);
    setBrandFilter(null);
    setSubTypeFilter(null);
    setProcQuery('');
    setTreatmentSearch('');
  }

  function handleTreatmentSearch(query) {
    setTreatmentSearch(query);
    if (!query) {
      // Clearing search — reset filters
      setProcFilter(null);
      setBrandFilter(null);
      return;
    }
    // Try to resolve to a known pill/procedure for server-side fetch
    const resolved = resolveProcedureFromQuery(query);
    if (resolved) {
      setProcFilter(resolved);
      setBrandFilter(null);
      setSubTypeFilter(null);
    }
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

    // Phone area-code detection — first-time users sometimes type their
    // 3-digit area code into the location input thinking it's a "city
    // ID". When that happens we used to fall through to the city ilike
    // search, which returned weird matches. Catch the 3-digit case
    // explicitly and surface a friendly hint instead of polluting the
    // dropdown with junk.
    if (/^\d{3}$/.test(trimmed)) {
      setLocResults([{ kind: 'areaCodeHint' }]);
      return;
    }

    // 4-digit numeric is also nonsense for both zips (5 digits) and
    // area codes (3 digits) — surface a "keep typing your zip" hint
    // so the user knows the system is waiting on the full 5 digits.
    if (/^\d{4}$/.test(trimmed)) {
      setLocResults([{ kind: 'partialZipHint' }]);
      return;
    }

    if (/^\d{5}$/.test(trimmed)) {
      setLocLoading(true);
      try {
        // Centralized zipcode resolver — falls through from zippopotam
        // to Google Geocoding so EVERY US zip resolves, not just the
        // ones zippopotam happens to know. Pass persist:false because
        // this is search-as-you-type — the user hasn't committed to
        // anything yet and a typo shouldn't overwrite their saved zip.
        const result = await lookupZip(trimmed, { persist: false });
        if (result) {
          setLocResults([{
            city: result.city,
            state: result.state,
            zip: result.zip,
          }]);
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
    setCityHighlight(false);
    if (loc.city) persistCity(loc.city);
    if (loc.state) persistState(loc.state);
    if (loc.zip) persistZip(loc.zip);
  }

  function clearLocation() {
    setSelectedLoc(null);
    setLocQuery('');
  }

  // ── Derive filter values ──
  // When a sub-type pill is active, narrow the procedure types to just that one.
  const filterProcedureTypes = subTypeFilter
    ? [subTypeFilter]
    : (procFilter?.procedureTypes || []);
  // When a brand pill is active, the StickyFilterBar's onBrandChange only
  // updates `brandFilter` — `procFilter` keeps its stale fuzzy token from
  // the originally-selected pill (e.g. 'botox'). Without this override the
  // provider_pricing query would be `procedure_type ILIKE '%botox%' AND
  // brand='Xeomin'` and return nothing. Lowercasing the brand gives the
  // same token the brand-specific pill uses (Xeomin → 'xeomin', etc), so
  // the query stays symmetric with the initial Botox view.
  const filterFuzzyToken =
    (subTypeFilter && subTypeFilter.split(/[\s/]+/)[0]?.toLowerCase()) ||
    (brandFilter && brandFilter.toLowerCase()) || procFilter?.fuzzyToken || null;
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
    // Cancellation flag: when deps change mid-flight, the stale fetch must
    // not overwrite procedures with data from the previous city/filter combo.
    let cancelled = false;

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
        .select('id, procedure_type, price_paid, units_or_volume, provider_name, provider_type, city, state, zip_code, created_at, rating, review_body, receipt_verified, result_photo_url, has_receipt, status, is_anonymous, provider_slug, notes, discount_type, discount_amount')
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
        // Never swallow schema/RLS errors silently — they hide outages like
        // the 4-column drift that made patient prices invisible for days.
        // eslint-disable-next-line no-console
        console.error('[FindPrices] procedures query failed:', error);
        try {
          await supabase.from('submission_errors').insert({
            error_code: error.code || null,
            error_message: `[FindPrices.fetchProcedureRows] ${error.message || ''}`,
            payload: { filters, brandFilter, filterProcedureTypes },
          });
        } catch {
          // submission_errors may not exist on older deploys — ignore
        }
        setFeedError('Something went wrong loading prices. Please try again.');
        return [];
      }
      // The procedures table has no `brand` column — patient-reported rows
      // come back with brand=undefined. When a brand filter is active we
      // matched these rows via ilike on procedure_type, so we know the row
      // belongs to the active brand. Inject `brand: brandFilter` so the
      // price card's getProcedureLabel(procedure_type, brand) returns the
      // correct chip ("XEOMIN", "DYSPORT", …) instead of falling back to
      // PROCEDURE_DISPLAY_NAMES which collapses "Botox / Dysport / Xeomin"
      // to "Botox" and produces a wrong "BOTOX" chip on every patient row
      // in the brand-filtered view.
      const activeRows = (data || []).map((r) => ({
        ...r,
        brand: r.brand || brandFilter || null,
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
        .select('id, procedure_type, price_paid, units_or_volume, provider_name, provider_type, city, state, zip_code, created_at, rating, review_body, receipt_verified, result_photo_url, has_receipt, status, is_anonymous, provider_slug, notes, discount_type, discount_amount')
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

      const { data: pendingData, error: pendingErr } = await pendingQuery;
      if (pendingErr) {
        // eslint-disable-next-line no-console
        console.error('[FindPrices] pending procedures query failed:', pendingErr);
      }
      const pendingRows = (pendingData || []).map((r) => ({
        ...r,
        // Same brand-injection as activeRows above so the user's own
        // pending submission renders with the correct brand chip on the
        // brand-filtered view.
        brand: r.brand || brandFilter || null,
        data_source: r.data_source || 'patient_reported',
        _pending_self: true,
      }));

      // De-dupe — pending rows that somehow also matched the active query
      // (shouldn't happen, but be safe) get filtered out.
      const seen = new Set(activeRows.map((r) => r.id));
      const uniquePending = pendingRows.filter((r) => !seen.has(r.id));

      return [...uniquePending, ...activeRows];
    }

    async function fetchProviderPricingRows({ city, state, bounds }) {
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

      // When "Search this area" bounds are set, query by lat/lng instead
      // of city/state so the results match the viewport rectangle.
      if (bounds) {
        query = query
          .gte('providers.lat', bounds.south)
          .lte('providers.lat', bounds.north)
          .gte('providers.lng', bounds.west)
          .lte('providers.lng', bounds.east);
      } else {
        if (state) query = query.eq('providers.state', state);
        if (city) query = query.ilike('providers.city', `%${city}%`);
      }
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
        // eslint-disable-next-line no-console
        console.error('[FindPrices] provider_pricing query failed:', error);
        try {
          await supabase.from('submission_errors').insert({
            error_code: error.code || null,
            error_message: `[FindPrices.fetchProviderPricingRows] ${error.message || ''}`,
            payload: { city, state, brandFilter, filterProcedureType },
          });
        } catch {
          // submission_errors may not exist on older deploys — ignore
        }
        setFeedError('Something went wrong loading prices. Please try again.');
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
          // Expose the category so the brand-filter view can drop
          // flat_rate_area rows (e.g. a "$425/unit" Xeomin row that
          // is actually a $425/forehead flat rate). See the filter
          // applied in displayedProcedures.
          normalized_category: normalized.category,
          // Internals used by the merge sort, prefixed _ so they're clearly
          // not part of the procedures schema.
          _verified: row.verified === true,
          _source: row.source,
          _source_url: row.source_url,
        };
      // Filter at the SOURCE: drop rows that normalizePrice flagged as
      // hidden (range_low, range_high, unknown price_label values, etc.).
      // These rows have no displayable price and must never reach the UI.
      }).filter((r) => r.normalized_category !== 'hidden');
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
        fetchProviderPricingRows({
          city: filters.city,
          state: filters.state,
          bounds: searchAreaBounds || null,
        }),
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

    // Build a cache key from the current filter combination
    const cacheKey = JSON.stringify({
      proc: procFilter?.slug, brand: brandFilter, sub: subTypeFilter,
      city: filterCity, state: filterState, zip: filterZip,
      pt: filterProviderType, sort: sortBy, pMin: priceMin, pMax: priceMax,
      mr: minRating, sab: searchAreaBounds,
    });

    async function fetchProcedures() {
      // Gate: if no procedure has been picked yet, don't fetch anything —
      // the UI shows the ProcedureGate prompt instead. This avoids
      // surfacing apples-to-oranges prices and saves a round-trip.
      if (filterProcedureTypes.length === 0) {
        setProcedures([]);
        setLoadingProcedures(false);
        return;
      }

      // Try sessionStorage cache first (instant back-nav restoration)
      try {
        const cached = sessionStorage.getItem(BROWSE_RESULTS_KEY);
        if (cached) {
          const { key, data, ts } = JSON.parse(cached);
          if (key === cacheKey && Date.now() - ts < RESULTS_CACHE_TTL) {
            setProcedures(data);
            setFeedError(null);
            setLoadingProcedures(false);
            return;
          }
        }
      } catch { /* corrupted cache — ignore */ }

      setLoadingProcedures(true);
      setFeedError(null);

      // Safety net: if any of the awaits below throw (network blip,
      // unexpected schema mismatch, attachProviderSpecials failure), the
      // try/finally GUARANTEES the skeleton clears. Otherwise the user
      // is stuck staring at shimmer cards forever.
      try {

      // City + state — strict match only. No state-level or national
      // fallback: silently substituting prices from other cities under
      // a "{city} prices" headline misleads users into thinking those
      // prices are local. When the city has no prices for the chosen
      // treatment, we set results = [] and let SmartEmptyState render
      // the "Be the first to share what you paid" CTA.
      let results = await fetchAtScope({
        city: filterCity,
        state: filterState,
        zip: filterZip,
      });

      // Catch-all most-recent — only when there is no location filter
      // at all (the user has not picked a city or state). This is the
      // "browsing without a city" experience, not a fallback for a
      // missing-city result.
      if (results.length === 0 && !filterCity && !filterState) {
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
      }

      let resultsWithSpecials = results;
      try {
        resultsWithSpecials = await attachProviderSpecials(results);
      } catch {
        // Fall back to the unannotated results so we still render something.
      }
      if (cancelled) return;
      setProcedures(resultsWithSpecials);
      // Cache results for instant back-nav restoration
      try {
        sessionStorage.setItem(BROWSE_RESULTS_KEY, JSON.stringify({
          key: cacheKey, data: resultsWithSpecials, ts: Date.now(),
        }));
      } catch { /* storage full — ignore */ }
      } catch (err) {
        if (cancelled) return;
        console.error('[FindPrices] feed fetch failed:', err);
        setFeedError('Something went wrong loading prices. Please try again.');
        setProcedures([]);
      } finally {
        if (!cancelled) setLoadingProcedures(false);
      }
    }

    // Hard safety timeout — never show the skeleton for more than 8s.
    // If something is genuinely hung (cold cache, slow network) we'd
    // rather render the empty state than leave the user staring at
    // shimmer placeholders.
    const skeletonSafetyTimeout = setTimeout(() => {
      if (!cancelled) setLoadingProcedures(false);
    }, 8000);

    fetchProcedures().finally(() => clearTimeout(skeletonSafetyTimeout));

    return () => {
      cancelled = true;
      clearTimeout(skeletonSafetyTimeout);
    };
  }, [
    procFilter,
    brandFilter,
    subTypeFilter,
    filterState,
    filterCity,
    filterZip,
    filterProviderType,
    sortBy,
    priceMin,
    priceMax,
    minRating,
    user?.id,
    searchAreaBounds,
    retryKey,
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
        // Skip internal-only price_label rows (range_low, range_high)
        // and rows with no displayable price. These rows bypass
        // normalizePrice() in this path, so we filter by price_label.
        const label = (row.price_label || '').toLowerCase();
        if (label === 'range_low' || label === 'range_high') continue;
        if (!Number.isFinite(Number(row.price)) || Number(row.price) <= 0) continue;
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
            .select('price_paid, discount_type')
            .eq('status', 'active')
            .eq('procedure_type', procType)
            .ilike('city', `%${filterCity}%`);
          const cityFiltered = (cityData || []).filter((r) => !r.discount_type);
          if (cityFiltered.length >= 3) {
            const avg = cityFiltered.reduce((s, r) => s + r.price_paid, 0) / cityFiltered.length;
            avgs[procType] = { avg: Math.round(avg), scope: filterCity };
            continue;
          }
        }

        // Try state-level (need >= 3)
        const stateToUse = filterState || (selectedLoc?.state);
        if (stateToUse) {
          const { data: stateData } = await supabase
            .from('procedures')
            .select('price_paid, discount_type')
            .eq('status', 'active')
            .eq('procedure_type', procType)
            .eq('state', stateToUse);
          const stateFiltered = (stateData || []).filter((r) => !r.discount_type);
          if (stateFiltered.length >= 3) {
            const avg = stateFiltered.reduce((s, r) => s + r.price_paid, 0) / stateFiltered.length;
            avgs[procType] = { avg: Math.round(avg), scope: stateToUse };
            continue;
          }
        }

        // National avg
        const { data: natData } = await supabase
          .from('procedures')
          .select('price_paid, discount_type')
          .eq('status', 'active')
          .eq('procedure_type', procType);
        const natFiltered = (natData || []).filter((r) => !r.discount_type);
        if (natFiltered.length >= 3) {
          const avg = natFiltered.reduce((s, r) => s + r.price_paid, 0) / natFiltered.length;
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



  // ── Browse rebuild: sorting, city avg ──

  // `procedures` already carries the active city/procedure set from the
  // main fetch effect. We layer the verified-only filter and nearest sort
  // on top locally without re-querying Supabase.
  const displayedProcedures = useMemo(() => {
    // Drop rows that normalizePrice flagged as hidden. Provider_pricing
    // rows carry normalized_category from normalizePrice(); patient
    // submissions don't have this field (undefined !== 'hidden' → kept).
    let rows = (procedures || []).filter((p) =>
      p.normalized_category !== 'hidden'
    );
    if (verifiedOnly) {
      rows = rows.filter(
        (p) => p._verified === true || p.receipt_verified === true,
      );
    }
    // Brand-filter view = apples-to-apples per-unit comparison. Drop
    // any neurotoxin row that priceUtils flagged as a flat-rate area
    // price (a "$425/unit" Xeomin row that's actually $425/forehead).
    // These can't be compared to a real $14/unit row without misleading
    // the shopper, so they're hidden entirely from the brand view.
    // The broader category view (no brandFilter) still shows them with
    // the "/ area" suffix produced by normalizePrice.
    if (brandFilter) {
      rows = rows.filter((p) => p.normalized_category !== 'flat_rate_area');
    }
    // Client-side treatment search — filters by matching the query
    // against procedure_type, brand, normalized_category, or area_label.
    if (treatmentSearch) {
      const q = treatmentSearch.toLowerCase();
      rows = rows.filter(p =>
        p.procedure_type?.toLowerCase().includes(q) ||
        p.brand?.toLowerCase().includes(q) ||
        p.normalized_category?.toLowerCase().includes(q) ||
        p.area_label?.toLowerCase().includes(q)
      );
    }
    // Filter to providers visible in the current map viewport so the
    // list stays in sync with what's on screen.
    if (mapBounds) {
      rows = rows.filter((p) => {
        const lat = Number(p.provider_lat);
        const lng = Number(p.provider_lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return true;
        return lat >= mapBounds.south && lat <= mapBounds.north &&
               lng >= mapBounds.west  && lng <= mapBounds.east;
      });
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
  }, [procedures, verifiedOnly, sortBy, userLat, userLng, brandFilter, mapBounds, treatmentSearch]);

  // Enrich procedures with provider_id resolved from gateProviders so the
  // GlowMap price index can match patient-submitted rows (which come from
  // the procedures table and lack provider_id) to the correct map pin.
  // Without this, pins stay as gray initials even when cards show prices.
  const proceduresForMap = useMemo(() => {
    if (!displayedProcedures?.length || !gateProviders?.length) return displayedProcedures;
    const normalize = (s) => (s || '').trim().toLowerCase().replace(/\s+(llc|inc|med\s*spa|medical\s*spa|aesthetics|medspa|clinic|center|centre)\.?$/i, '').trim();
    const byKey = new Map();
    for (const p of gateProviders) {
      const key = `${normalize(p.name || p.provider_name)}|${(p.city || '').trim().toLowerCase()}|${(p.state || '').trim().toLowerCase()}`;
      if (key !== '||') byKey.set(key, p);
    }
    return displayedProcedures.map((proc) => {
      if (proc.provider_id) return proc;
      const key = `${normalize(proc.provider_name)}|${(proc.city || '').trim().toLowerCase()}|${(proc.state || '').trim().toLowerCase()}`;
      const match = byKey.get(key);
      if (!match) return proc;
      return { ...proc, provider_id: match.id, provider_lat: proc.provider_lat ?? match.lat ?? null, provider_lng: proc.provider_lng ?? match.lng ?? null };
    });
  }, [displayedProcedures, gateProviders]);

  // City average — ONLY per-unit prices. Per-session ($300), per-syringe,
  // and flat packages must be excluded or they inflate the average by 10-20x
  // (e.g. $211/unit instead of ~$15/unit for Botox in NYC).
  const cityAvgPrice = useMemo(() => {
    const vals = (displayedProcedures || [])
      .filter((p) => !p.discount_type)
      .filter((p) =>
        p.normalized_compare_unit === 'per unit' &&
        p.normalized_compare_value != null &&
        Number.isFinite(Number(p.normalized_compare_value)) &&
        Number(p.normalized_compare_value) > 0,
      )
      .map((p) => Number(p.normalized_compare_value));
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [displayedProcedures]);

  // Best deal = lowest per-unit price in the current result set. We
  // only surface the SavingsCallout when that deal is 20%+ below the
  // per-unit city average. Must be scoped to per-unit rows so a
  // $300/session price doesn't compare against a $15/unit average.
  const bestDealInfo = useMemo(() => {
    if (!cityAvgPrice || !displayedProcedures?.length) return null;
    let best = null;
    let bestVal = Infinity;
    for (const p of displayedProcedures) {
      if (p.normalized_compare_unit !== 'per unit') continue;
      const v = Number(p.normalized_compare_value);
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
      unit: best.normalized_compare_unit || best.normalized_category || null,
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

  // Providers that are in the current city but have NO pricing rows for
  // the selected treatment. Shown as gray pins on the map and in a
  // separate "no prices yet" section below the priced list.
  const unpricedProviders = useMemo(() => {
    if (!procFilter && !brandFilter) return [];
    const pricedIds = new Set(groupedProviders.map((g) => g.provider_id).filter(Boolean));
    return gateProviders.filter((p) => p.id && !pricedIds.has(p.id));
  }, [procFilter, brandFilter, groupedProviders, gateProviders]);

  // Viewport-filtered gate-mode provider count — only counts providers
  // visible in the current map viewport so the "X providers in this
  // area" label stays in sync with the map.
  const viewportProviderCount = useMemo(() => {
    if (!mapBounds) return gateProviders.length;
    return gateProviders.filter((p) => {
      const lat = Number(p.lat);
      const lng = Number(p.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return true;
      return lat >= mapBounds.south && lat <= mapBounds.north &&
             lng >= mapBounds.west  && lng <= mapBounds.east;
    }).length;
  }, [gateProviders, mapBounds]);

  // When a treatment is selected, filter gateProviders to only those
  // that have at least one matching pricing row. This way the map only
  // shows pins for providers that actually offer the selected treatment
  // instead of showing every provider in the city as gray dots.
  const filteredGateProviders = useMemo(() => {
    if (!procFilter && !brandFilter) return gateProviders;
    // Find the active pill — brandFilter pills have an explicit brand,
    // otherwise fall back to the procFilter pill object.
    const activePill = brandFilter
      ? PROCEDURE_PILLS.find((p) => p.brand && p.brand.toLowerCase() === brandFilter.toLowerCase()) || procFilter
      : procFilter;
    return filterProvidersByTreatment(gateProviders, cityPricingRows, activePill);
  }, [gateProviders, cityPricingRows, procFilter, brandFilter]);

  // Filtered count for the map — when a treatment is selected, counts
  // only providers offering that treatment visible in the viewport.
  const filteredViewportCount = useMemo(() => {
    if (!procFilter && !brandFilter) return viewportProviderCount;
    if (!mapBounds) return filteredGateProviders.length;
    return filteredGateProviders.filter((p) => {
      const lat = Number(p.lat);
      const lng = Number(p.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return true;
      return lat >= mapBounds.south && lat <= mapBounds.north &&
             lng >= mapBounds.west  && lng <= mapBounds.east;
    }).length;
  }, [filteredGateProviders, mapBounds, procFilter, brandFilter, viewportProviderCount]);

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

  // ── Share results (copy URL to clipboard) ──
  const [shareCopied, setShareCopied] = useState(false);
  const handleShareResults = useCallback(() => {
    try {
      navigator.clipboard?.writeText(window.location.href);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch { /* noop */ }
  }, []);

  // ── Procedure detail sheet handler ──
  const handleProcedureDetail = useCallback((procedure, provider) => {
    setDetailSheet({
      procedureName: procedure.procedure_type,
      providerName: provider?.provider_name || procedure.provider_name || null,
      providerSlug: provider?.provider_slug || procedure.provider_slug || null,
      price: Number(procedure.price_paid) || null,
      priceUnit: procedure.normalized_compare_unit
        ? `/${procedure.normalized_compare_unit.replace('per ', '')}`
        : null,
    });
  }, []);

  // ── Dosing calculator sheet handler ──
  const handleDosingClick = useCallback((procedure, provider, dosingInfo) => {
    setDosingSheet({
      procedureType: procedure.procedure_type,
      brand: procedure.brand || null,
      providerName: provider?.provider_name || procedure.provider_name || null,
      treatmentArea: procedure.treatment_area || null,
      dosingType: dosingInfo.type,
      dosingKey: dosingInfo.key,
    });
  }, []);

  // ── Mobile compact header content (shared between sticky & full-screen modes) ──
  const renderCompactHeader = () => (
    <>
      <div className="px-3 pt-1.5 pb-0.5">
        <h1
          className="font-display text-ink"
          style={{
            fontWeight: 900, fontSize: 15, lineHeight: 1.2,
            letterSpacing: '-0.02em', textTransform: 'uppercase', margin: 0,
            maxHeight: 32,
          }}
        >
          KNOW BEFORE YOU{' '}
          <span className="italic text-hot-pink" style={{ textTransform: 'none' }}>Glow.</span>
        </h1>
      </div>
      <div className="px-3 pt-1.5 pb-2 space-y-1.5">
        {/* Row 1 — Treatment + Location inputs (side by side) */}
        <div className="flex gap-1.5">
        <div ref={procRef} className="relative" style={{ flex: 1.2 }}>
          {procFilter ? (
            <div
              className="flex items-center gap-2 bg-white px-2"
              style={{ height: 36, borderRadius: 2, border: '1px solid #EDE8E3' }}
            >
              <Search size={14} className="text-text-secondary shrink-0" />
              <span
                className="flex-1 text-[13px] text-ink truncate"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {brandFilter || procFilter.label || procFilter.primary}
              </span>
              <button
                onClick={clearProcedure}
                className="shrink-0 text-text-secondary/60 hover:text-ink p-0.5"
                aria-label="Clear treatment"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div
              className="flex items-center gap-2 bg-white px-2"
              style={{ height: 36, borderRadius: 2, border: '1px solid #EDE8E3' }}
            >
              <Search size={14} className="text-text-secondary shrink-0" />
              <input
                type="text"
                value={procQuery}
                onChange={(e) => { setProcQuery(e.target.value); setProcOpen(true); }}
                onFocus={() => procQuery.trim() && setProcOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const next = resolveProcedureFromQuery(procQuery);
                    if (next) { setProcFilter(next); setProcQuery(''); setProcOpen(false); }
                  }
                  if (e.key === 'Escape') setProcOpen(false);
                }}
                placeholder="Botox, filler, laser..."
                className="flex-1 bg-transparent outline-none text-[13px] text-ink placeholder:text-text-secondary"
                style={{ fontFamily: 'var(--font-body)', fontSize: 16 }}
              />
            </div>
          )}
          {/* Treatment dropdown */}
          {procOpen && procQuery.trim() && (
            <div
              className="absolute top-full left-0 right-0 mt-1 bg-white z-50 overflow-hidden"
              style={{ borderRadius: 2, border: '1px solid #E8E8E8' }}
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
                        {matchedPill.label}
                      </button>
                    )}
                    {procMatches.slice(0, 6).map((p) => (
                      <button
                        key={p}
                        onClick={() => selectProcedure(p)}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-cream transition-colors text-ink"
                      >
                        {p}
                      </button>
                    ))}
                    {!matchedPill && procMatches.length === 0 && (
                      <div className="px-4 py-3 text-sm text-text-secondary">No matches</div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Location input (side by side with treatment) */}
        <div ref={locRef} className="relative" style={{ flex: 1 }}>
          <div
            className="flex items-center gap-2 bg-white px-2"
            style={{
              height: 36,
              borderRadius: 2,
              border: cityHighlight ? '2px solid #E8347A' : '1px solid #EDE8E3',
              transition: 'border-color 0.3s',
            }}
          >
            <span style={{ fontSize: 14 }} aria-hidden="true">&#x1F4CD;</span>
            <input
              ref={mobileLocInputRef}
              type="text"
              value={locQuery || (selectedLoc ? `${selectedLoc.city}${selectedLoc.state ? `, ${selectedLoc.state}` : ''}` : '')}
              onChange={(e) => { setCityHighlight(false); handleLocInput(e.target.value); }}
              onFocus={() => {
                setCityHighlight(false);
                if (selectedLoc && !locQuery) {
                  setLocQuery(`${selectedLoc.city}${selectedLoc.state ? `, ${selectedLoc.state}` : ''}`);
                }
                if (locQuery.trim()) setLocOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && locResults.length > 0 && !locResults[0].kind) {
                  selectLocation(locResults[0]);
                }
                if (e.key === 'Escape') setLocOpen(false);
              }}
              placeholder="City or zip code..."
              className="flex-1 bg-transparent outline-none text-[13px] text-ink placeholder:text-text-secondary"
              style={{ fontFamily: 'var(--font-body)', fontSize: 16 }}
            />
            {selectedLoc && (
              <button
                onClick={clearLocation}
                className="shrink-0 text-text-secondary/60 hover:text-ink p-0.5"
                aria-label="Clear location"
              >
                <X size={14} />
              </button>
            )}
          </div>
          {/* Location dropdown */}
          {locOpen && locQuery.trim() && (
            <div
              className="absolute top-full left-0 right-0 mt-1 bg-white z-50 overflow-hidden"
              style={{ borderRadius: 2, border: '1px solid #E8E8E8' }}
            >
              {locLoading ? (
                <div className="px-4 py-3 text-sm text-text-secondary animate-pulse">Searching...</div>
              ) : locResults.length > 0 && locResults[0].kind === 'areaCodeHint' ? (
                <div className="px-4 py-3 text-sm" style={{ color: '#888' }}>
                  <p style={{ color: '#111', fontWeight: 500, marginBottom: 4 }}>Looks like a phone area code.</p>
                  <p>Try a city name or 5-digit zip.</p>
                </div>
              ) : locResults.length > 0 && locResults[0].kind === 'partialZipHint' ? (
                <div className="px-4 py-3 text-sm" style={{ color: '#888' }}>Keep typing — US zip codes are 5 digits.</div>
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
              ) : locQuery.trim().length >= 2 ? (
                <div className="px-4 py-3 text-sm text-text-secondary">No locations found</div>
              ) : null}
            </div>
          )}
        </div>
        </div>{/* end flex row for inputs */}

        {/* Row 3 — Injectable chips (horizontal scroll) */}
        <div
          className="flex items-center overflow-x-auto -mx-1 px-1"
          style={{ gap: 8, scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
        >
          {CATEGORY_PILLS.map((pill) => {
            const isActive = procFilter?.slug === pill.slug && !brandFilter;
            return (
              <button
                key={`mpill-${pill.slug}`}
                type="button"
                onClick={() => {
                  if (isActive) { clearProcedure(); } else { selectPill(pill); }
                }}
                className="shrink-0"
                style={{
                  height: 36,
                  padding: '0 14px',
                  borderRadius: 18,
                  border: `1px solid ${isActive ? '#E8347A' : '#EDE8E3'}`,
                  background: isActive ? '#E8347A' : 'white',
                  color: isActive ? '#fff' : '#555',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                  fontSize: 12,
                  letterSpacing: '0.06em',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ marginRight: 4 }}>{pill.emoji}</span>{pill.label}
              </button>
            );
          })}
        </div>

        {/* Row 4 — Find Prices CTA */}
        <button
          type="button"
          onClick={() => {
            // 1. If the user typed a treatment query, resolve it now
            //    (whether or not a pill is already active — the new
            //    query overrides the previous selection).
            if (procQuery.trim()) {
              const next = resolveProcedureFromQuery(procQuery);
              if (next) {
                setProcFilter(next);
                setBrandFilter(null);
                setProcQuery('');
              }
            }

            // 2. If no city is entered, highlight and focus the city input
            if (!selectedLoc && !locQuery.trim()) {
              setCityHighlight(true);
              mobileLocInputRef.current?.focus();
              mobileLocInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              return;
            }

            // 3. If the user typed a city but hasn't selected one yet,
            //    resolve it now — pick the first autocomplete result.
            if (locQuery.trim() && !selectedLoc) {
              if (locResults.length > 0 && !locResults[0].kind) {
                selectLocation(locResults[0]);
              } else {
                // Results haven't arrived yet — trigger search immediately
                searchCities(locQuery.trim());
              }
            }

            // 4. Close all dropdowns
            setProcOpen(false);
            setLocOpen(false);
          }}
          className="btn-editorial btn-editorial-primary w-full"
          style={{ height: 44, fontSize: 13, letterSpacing: '0.10em', fontWeight: 700 }}
        >
          FIND PRICES
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-cream page-enter">
      {/* ─── Mobile search + filter bar (< md) — pre-city sticky mode only ─── */}
      {!(isMobile && selectedLoc) && (
      <div
        className="md:hidden bg-white"
        style={{
          position: 'sticky',
          top: 52,
          zIndex: 40,
          borderBottom: '1px solid #EDE8E3',
        }}
      >
        {renderCompactHeader()}
      </div>
      )}

      {/* Sticky search header (desktop only) */}
      <div className="hidden md:block sticky top-16 z-30 bg-white" style={{ borderBottom: '1px solid #E8E8E8' }}>
        <div className="max-w-7xl mx-auto px-4 py-2">
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
                    placeholder="City or zip code (e.g. Miami FL)"
                    value={locQuery}
                    onChange={(e) => handleLocInput(e.target.value)}
                    onFocus={() => locQuery.trim() && setLocOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && locResults.length > 0 && !locResults[0].kind) {
                        selectLocation(locResults[0]);
                      }
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
                  ) : locResults.length > 0 && locResults[0].kind === 'areaCodeHint' ? (
                    <div className="px-4 py-3 text-sm" style={{ color: '#888', lineHeight: 1.5 }}>
                      <p style={{ color: '#111', fontWeight: 500, marginBottom: 4 }}>
                        Looks like a phone area code.
                      </p>
                      <p>
                        Try typing your city name instead — e.g.{' '}
                        <span style={{ color: '#E8347A', fontWeight: 500 }}>Miami FL</span>,{' '}
                        <span style={{ color: '#E8347A', fontWeight: 500 }}>Mandeville LA</span>,{' '}
                        or a full 5-digit zip code.
                      </p>
                    </div>
                  ) : locResults.length > 0 && locResults[0].kind === 'partialZipHint' ? (
                    <div className="px-4 py-3 text-sm" style={{ color: '#888' }}>
                      Keep typing &mdash; US zip codes are 5 digits.
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

              {/* Dosing estimator moved to StickyFilterBar ESTIMATE pill */}
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
        <div className="hidden md:block bg-cream" style={{ borderBottom: '1px solid #EDE8E3' }}>
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

      {/* Editorial cream hero header — REMOVED from desktop to eliminate
          the ~200px gap between the search bar and the split-view map.
          Treatment name + provider count are already visible in the search
          bar pill and the left-pane count bar. The GateLeftPanel still has
          its own Playfair headline for the no-treatment state. */}

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
        // On desktop with a city selected, the split-view owns the layout —
        // collapse this container so it doesn't create a gap above the map.
        const desktopSplitActive = !isMobile && selectedLoc;
        return (
      <div
        className="mx-auto px-4"
        style={{
          maxWidth: 900,
          paddingTop: (hasResults || desktopSplitActive) ? 0 : 24,
          // Clear the fixed mobile bottom nav (56px) + safe-area so the
          // last card is never hidden behind it and its tap zone can't
          // be accidentally contested. The split layout below handles
          // its own bottom padding when results are showing.
          paddingBottom: (hasResults || desktopSplitActive)
            ? 0
            : IS_MOBILE
            ? 'calc(100px + env(safe-area-inset-bottom, 0px))'
            : 100,
        }}
      >
        {/* "Save your preferences" banner — logged-in users with no saved
            preferences yet. Dismissible with X, remembered in localStorage. */}
        {user && !hasSavedPrefs && !prefsLoading && !procFilter && !brandFilter && !prefsBannerDismissed && (
          <div
            className="mb-4 flex items-center justify-between gap-3"
            style={{
              background: '#FBF9F7',
              borderLeft: '3px solid #E8347A',
              borderRadius: 0,
              padding: '10px 14px',
            }}
          >
            <p
              className="text-[13px] text-ink"
              style={{ fontFamily: 'var(--font-body)', fontWeight: 400 }}
            >
              Save your treatment preferences to skip this step next time.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to="/settings#treatment-preferences"
                className="text-[10px] font-semibold uppercase transition-opacity hover:opacity-80"
                style={{
                  color: '#E8347A',
                  letterSpacing: '0.10em',
                  borderBottom: '1px solid #E8347A',
                  fontFamily: 'var(--font-body)',
                }}
              >
                Set preferences
              </Link>
              <button
                type="button"
                onClick={() => {
                  setPrefsBannerDismissed(true);
                  try { localStorage.setItem('glow_prefs_banner_dismissed', '1'); } catch {}
                }}
                aria-label="Dismiss"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 4,
                  color: '#999',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        )}

        {/* No-city editorial hero — shown only when the user has no city
            AND no procedure yet. Once a city is set, the new split-view
            gate takes over with the GateLeftPanel on the left and the
            map on the right. */}
        {!personalizedMode && !procFilter && !brandFilter && !selectedLoc && (
          <div className="hidden md:block text-center py-12 mb-6">
            <p className="editorial-kicker mb-4">Med spa price transparency</p>
            <h1
              className="font-display text-ink mx-auto max-w-3xl"
              style={{ fontWeight: 900, fontSize: 'clamp(32px, 5vw, 48px)', lineHeight: 1.05, letterSpacing: '-0.02em' }}
            >
              Pick a city.<br />
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

        {/* First-Timer Onboarding Prompt — mobile only (desktop renders inside split-view left pane).
            Fixed to the bottom of the viewport on mobile so it isn't clipped
            behind the sticky compact header. */}
        {isMobile && selectedProc && !firstTimerActive && (
          <div style={{
            position: 'fixed',
            bottom: 80,
            left: 16,
            right: 16,
            zIndex: 40,
            borderRadius: 16,
            boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
            overflow: 'hidden',
          }}>
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
          </div>
        )}

        {/* Dosing estimator moved to StickyFilterBar ESTIMATE pill */}

        {/* Feed error banner — suppress when results loaded (e.g. from cache) */}
        {feedError && !loadingProcedures && displayedProcedures.length === 0 && (
          <div
            style={{
              background: '#fff5f5',
              border: '1px solid #fed7d7',
              borderRadius: 8,
              padding: '12px 16px',
              color: '#c53030',
              fontSize: 14,
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            {feedError}
            <button
              onClick={() => { setFeedError(null); setRetryKey((k) => k + 1); }}
              style={{ fontSize: 12, color: '#c53030', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Try again
            </button>
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
          // Gate state — the inline split-view gate (desktop) and the
          // mobile discovery list live outside this 900px container so
          // the map can fill the full viewport width. Nothing to render
          // here, but keep the branch so downstream cases stay correct.
          null
        ) : isMobile && !selectedLoc ? (
          // Treatment selected but no city — prompt the user to enter a
          // location instead of showing random results from other cities.
          <div style={{ textAlign: 'center', padding: '40px 24px' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📍</div>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: 18,
              fontWeight: 700,
              color: '#111',
              marginBottom: 8,
            }}>
              Where are you looking?
            </p>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              color: '#888',
              fontWeight: 400,
              marginBottom: 20,
            }}>
              Enter a city or zip code to see {procFilter?.description || procFilter?.label || 'treatment'} prices near you.
            </p>
            <button
              type="button"
              onClick={() => {
                setCityHighlight(true);
                mobileLocInputRef.current?.focus();
                mobileLocInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }}
              style={{
                padding: '10px 24px',
                borderRadius: 20,
                border: '2px solid #E8347A',
                background: 'white',
                color: '#E8347A',
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: '0.06em',
                cursor: 'pointer',
              }}
            >
              Enter your city
            </button>
          </div>
        ) : loadingProcedures ? (
          // Loading state is owned by the desktop unified split-view
          // on desktop (so the map stays mounted with gray gate pins
          // while procedures load). Only render the inline skeleton
          // here on mobile.
          isMobile ? <SkeletonGrid count={6} /> : null
        ) : displayedProcedures.length === 0 ? (
          // Empty state, same story — desktop puts SmartEmptyState in
          // the left pane of the unified split-view so the map keeps
          // its gate pins visible alongside the empty message.
          isMobile ? (
            <SmartEmptyState
              procedureLabel={procFilter?.label}
              procedureSlug={procFilter?.slug}
              procedureType={procFilter?.primary || selectedProc}
              procedureTypes={filterProcedureTypes}
              brand={brandFilter}
              city={selectedLoc?.city}
              state={selectedLoc?.state}
            />
          ) : null
        ) : null}
      </div>
        );
      })()}

      {/* ─── Mobile full-screen map container ───
          Single fixed container holding map + sheet + header as siblings.
          z-55 covers the global Navbar (z-50); MobileBottomNav (z-100) still above. */}
      {isMobile && selectedLoc && (() => {
        const hasPricedResults = procFilter && !loadingProcedures && displayedProcedures?.length > 0;
        return (
          <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 55 }}>

            {/* Layer 1: Map — fills full screen behind everything */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
              <GlowMap
                allProviders={gateProviders}
                procedures={hasPricedResults ? proceduresForMap : []}
                cityAvg={hasPricedResults ? cityAvgPrice : undefined}
                city={selectedLoc.city}
                state={selectedLoc.state}
                highlightedId={hasPricedResults ? hoveredProviderId : null}
                selectedId={hasPricedResults
                  ? (selectedProviderGroup?.provider_id || null)
                  : (gateSelectedProviderGroup?.provider_id || null)}
                onPinClick={hasPricedResults ? handlePinClick : handleGatePinClick}
                onMapClick={handleMapClick}
                onBoundsChange={handleBoundsChange}
                onUserMovedMap={handleUserMovedMap}
                showSearchArea={showSearchArea}
                onSearchAreaClick={handleSearchAreaClick}
                mobileLegendTop
                bottomPadding={mapBottomPadding}
                isMobile
              />
            </div>

            {/* Layer 2: Bottom sheet — rendered BEFORE header so header's
                z-index wins and autocomplete dropdowns appear above the sheet */}
            {!procFilter && !brandFilter && (
              <MobileBrowseSheet
                providers={gateProviders.map((p) => ({
                  key: p.id,
                  id: p.id,
                  provider_id: p.id,
                  provider_name: p.name || p.provider_name,
                  provider_slug: p.slug || p.provider_slug,
                  city: p.city,
                  state: p.state,
                  google_rating: p.google_rating,
                  google_review_count: p.google_review_count,
                  has_submissions: false,
                }))}
                mode="gate"
                city={selectedLoc.city}
                state={selectedLoc.state}
                selectedProviderId={gateSelectedProviderGroup?.provider_id || null}
                providerCount={gateProviders.length}
                loading={gateProvidersLoading}
                onSelectCategory={selectPill}
                activeCategorySlug={procFilter?.slug}
                categoryCounts={categoryCounts}
                onSnapChange={setMobileSheetSnap}
              />
            )}
            {hasPricedResults && (
              <MobileBrowseSheet
                providers={groupedProviders.map((group) => {
                  const primary = group.procedures[0];
                  return {
                    key: group.key,
                    id: group.provider_id,
                    provider_id: group.provider_id,
                    provider_name: primary.provider_name,
                    provider_slug: primary.provider_slug,
                    city: primary.city,
                    state: primary.state,
                    avg_price: group.bestPrice !== Infinity ? group.bestPrice : null,
                    submission_count: group.procedures.length,
                    verified_count: group.procedures.filter((p) => p.receipt_verified).length,
                    has_submissions: true,
                    provider_type: primary.provider_type,
                    google_rating: primary.google_rating || primary.rating,
                    google_review_count: primary.google_review_count,
                    bestPrice: group.bestPrice !== Infinity ? group.bestPrice : null,
                  };
                })}
                mode="priced"
                city={selectedLoc?.city}
                state={selectedLoc?.state}
                cityAvg={cityAvgPrice}
                selectedProviderId={selectedProviderGroup?.provider_id || null}
                providerCount={groupedProviders.length}
                listingCount={displayedProcedures.length}
                unpricedProviders={unpricedProviders}
                onSnapChange={setMobileSheetSnap}
              />
            )}

            {/* Provider profile card — mobile pin click */}
            {hasPricedResults && selectedProviderGroup && (
              <ProviderProfileModal
                group={selectedProviderGroup}
                onClose={() => setSelectedProviderGroup(null)}
                isMobile
                cityAvg={cityAvgPrice}
                onDosingClick={(row) => {
                  setDosingSheet({
                    procedureType: row.procedure_type,
                    brand: row.brand || null,
                    providerName: selectedProviderGroup.provider_name || null,
                    treatmentArea: row.treatment_area || null,
                    dosingType: 'neurotoxin',
                    dosingKey: (row.brand || 'botox').toLowerCase(),
                  });
                }}
              />
            )}

            {/* Layer 3: Floating search inputs */}
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              zIndex: 40,
              padding: 'calc(env(safe-area-inset-top, 0px) + 8px) 12px 0',
              pointerEvents: 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, pointerEvents: 'auto' }}>
                {/* Treatment input */}
                <button onClick={() => { setMobileSearchFocus('treatment'); setMobileSearchOpen(true); }} style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: 6,
                  height: 44, padding: '0 12px', borderRadius: 22,
                  background: 'white', border: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
                  cursor: 'pointer', minWidth: 0,
                }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }} aria-hidden>💆</span>
                  <span style={{
                    flex: 1, textAlign: 'left', fontSize: 13, fontWeight: 500, color: (brandFilter || procFilter) ? '#111' : '#888',
                    fontFamily: 'var(--font-body)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {brandFilter || procFilter?.label || 'What are you looking for?'}
                  </span>
                </button>
                {/* Location input */}
                <button onClick={() => { setMobileSearchFocus('location'); setMobileSearchOpen(true); }} style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: 6,
                  height: 44, padding: '0 12px', borderRadius: 22,
                  background: 'white', border: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
                  cursor: 'pointer', minWidth: 0,
                }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }} aria-hidden>📍</span>
                  <span style={{
                    flex: 1, textAlign: 'left', fontSize: 13, fontWeight: 500, color: selectedLoc ? '#111' : '#888',
                    fontFamily: 'var(--font-body)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {selectedLoc ? `${selectedLoc.city}${selectedLoc.state ? `, ${selectedLoc.state}` : ''}` : 'City or area...'}
                  </span>
                </button>
                {/* Filter circle */}
                <button onClick={() => setShowFilters(true)} style={{
                  width: 40, height: 40, borderRadius: 20,
                  background: 'white', border: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', flexShrink: 0,
                  pointerEvents: 'auto',
                }}>
                  <SlidersHorizontal size={16} style={{ color: '#555' }} />
                </button>
              </div>
            </div>

            {/* Search overlay */}
            <MobileMapSearchOverlay
              open={mobileSearchOpen}
              onClose={() => setMobileSearchOpen(false)}
              focusField={mobileSearchFocus}
              procRef={procRef}
              procFilter={procFilter}
              brandFilter={brandFilter}
              procQuery={procQuery}
              setProcQuery={setProcQuery}
              procOpen={procOpen}
              setProcOpen={setProcOpen}
              procMatches={procMatches}
              selectProcedure={selectProcedure}
              selectPill={selectPill}
              clearProcedure={clearProcedure}
              resolveProcedureFromQuery={resolveProcedureFromQuery}
              locRef={locRef}
              locQuery={locQuery}
              handleLocInput={handleLocInput}
              locOpen={locOpen}
              setLocOpen={setLocOpen}
              locResults={locResults}
              locLoading={locLoading}
              selectLocation={selectLocation}
              clearLocation={clearLocation}
              selectedLoc={selectedLoc}
            />

          </div>
        );
      })()}

      {/* ─── Priced header chrome ───
          Renders for both mobile and desktop when there are priced
          results. The split-view body diverges below — mobile uses the
          list/map toggle, desktop uses the unified split-view block
          which keeps the GlowMap mounted across the entire gate →
          priced transition. */}
      {!isMobile && !personalizedMode && procFilter && !loadingProcedures && displayedProcedures.length > 0 && (
        <div className="mx-auto px-4" style={{ maxWidth: 1400 }}>
          <PriceContextBar
            prices={displayedProcedures}
            brandLabel={brandFilter || procFilter?.label}
            city={selectedLoc?.city}
            state={selectedLoc?.state}
          />
          <StickyFilterBar
            sortBy={sortBy}
            onSortChange={setSortBy}
            hasPricesOnly={hasPricesOnly}
            onHasPricesToggle={() => setHasPricesOnly((v) => !v)}
            verifiedOnly={verifiedOnly}
            onVerifiedToggle={() => setVerifiedOnly((v) => !v)}
            userHasLocation={userLat != null && userLng != null}
            isNeurotoxin={procFilter?.slug === 'neurotoxin'}
            brand={(brandFilter || 'botox').toLowerCase()}
          />
          {bestDealInfo && (
            <SavingsCallout
              city={selectedLoc?.city}
              savings={bestDealInfo.savings}
              units={bestDealInfo.units}
              price={bestDealInfo.normalizedPrice}
              avg={bestDealInfo.avg}
              unit={bestDealInfo.unit}
            />
          )}
        </div>
      )}

      {/* ─── Desktop cards without map (no city selected) ─── */}
      {!isMobile && !selectedLoc && procFilter && !loadingProcedures && displayedProcedures.length > 0 && (
        <div
          className="mx-auto px-4"
          style={{ maxWidth: 860, paddingBottom: 40 }}
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
            return (
              <div key={group.key}>
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
                  onProcedureDetail={handleProcedureDetail}
                  onDosingClick={handleDosingClick}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Desktop unified split-view ───
          The whole point of this block is that the <GlowMap> below
          stays mounted across the entire gate → loading → priced
          lifecycle. Previously the gate state and the priced state
          each rendered their own <GlowMap> in completely separate JSX
          subtrees, so picking a treatment unmounted the gate map and
          remounted a fresh priced map (with no pins until the priced
          query returned). Now there is exactly one map; only its
          `procedures` overlay changes when the user picks a treatment.
          The left pane swaps content (gate panel / skeleton / empty
          state / price cards) but the map instance is preserved. */}
      {!isMobile && selectedLoc && (() => {
        const hasResults =
          procFilter &&
          !loadingProcedures &&
          displayedProcedures.length > 0;
        return (
          <div
            className="mx-auto"
            style={{
              maxWidth: 1400,
              display: 'flex',
              gap: 0,
              height: hasResults
                ? 'calc(100vh - 130px)'
                : 'calc(100vh - 140px)',
              minHeight: 520,
              overflow: 'hidden',
              paddingLeft: 16,
              paddingRight: 16,
            }}
          >
            {/* Left: scrollable content — content swaps but the pane
                stays mounted so the map's flex sibling never reflows. */}
            <div
              style={{
                width: 460,
                flexShrink: 0,
                overflowY: 'auto',
                paddingRight: !procFilter ? 24 : 16,
                paddingBottom: !procFilter ? 0 : 40,
                borderRight: '1px solid #EDE8E3',
              }}
            >
              {!procFilter ? (
                <GateLeftPanel
                  city={selectedLoc.city}
                  state={selectedLoc.state}
                  providerCount={viewportProviderCount}
                  loading={gateProvidersLoading}
                  onSelectPill={selectPill}
                  pillCounts={categoryCounts}
                  onSearch={handleTreatmentSearch}
                  treatmentSearch={treatmentSearch}
                  activeCategorySlug={procFilter?.slug}
                />
              ) : loadingProcedures ? (
                <div style={{ padding: '24px 8px 40px 8px' }}>
                  <SkeletonGrid count={4} />
                </div>
              ) : displayedProcedures.length === 0 ? (
                <div style={{ padding: '24px 8px 40px 8px' }}>
                  <SmartEmptyState
                    procedureLabel={procFilter?.label}
                    procedureSlug={procFilter?.slug}
                    procedureType={procFilter?.primary || selectedProc}
                    procedureTypes={filterProcedureTypes}
                    brand={brandFilter}
                    city={selectedLoc?.city}
                    state={selectedLoc?.state}
                    unpricedCount={gateProviders.length}
                  />
                </div>
              ) : (
                <>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px 8px 8px', fontFamily: 'var(--font-body)', fontSize: 13, color: '#888' }}>
                  <span>
                    <strong style={{ fontWeight: 600, color: '#555' }}>{groupedProviders.length}</strong>
                    {` ${groupedProviders.length === 1 ? 'provider' : 'providers'} offering `}
                    {treatmentSearch
                      ? `'${treatmentSearch}'`
                      : CATEGORY_PILLS.find(p => p.slug === procFilter?.slug)?.description
                        || brandFilter || procFilter?.label || 'treatments'}
                    {displayedProcedures.length !== groupedProviders.length && (
                      <span style={{ color: '#B8A89A' }}>
                        {' · '}{displayedProcedures.length} {displayedProcedures.length === 1 ? 'price listing' : 'price listings'}
                      </span>
                    )}
                    {searchAreaBounds && (
                      <span style={{ display: 'block', fontSize: 11, color: '#B8A89A', fontStyle: 'italic', marginTop: 2 }}>
                        Viewing results in map area — drag to explore
                      </span>
                    )}
                    <span style={{ display: 'block', fontSize: 11, color: '#aaa', marginTop: 4 }}>
                      Prices are user-reported and may vary. GlowBuddy is independent — no paid placements.
                    </span>
                  </span>
                  <button type="button" onClick={handleShareResults} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', background: shareCopied ? '#1A7A3A' : 'transparent', color: shareCopied ? 'white' : '#888', border: `1px solid ${shareCopied ? '#1A7A3A' : '#DDD'}`, borderRadius: 2, fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', cursor: 'pointer', transition: 'background 150ms, color 150ms', flexShrink: 0 }}>
                    <Link2 size={11} />
                    {shareCopied ? 'Copied!' : 'Share'}
                  </button>
                </div>
                {/* First-Timer Onboarding Prompt — desktop */}
                {selectedProc && !firstTimerActive && (
                  <div style={{ padding: '0 8px' }}>
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
                  </div>
                )}
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
                        onProcedureDetail={handleProcedureDetail}
                        onDosingClick={handleDosingClick}
                      />
                    </div>
                  );
                })}
                {/* ── Unpriced providers — "no prices yet" tier ── */}
                {unpricedProviders.length > 0 && (
                  <div style={{ padding: '0 8px' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '20px 0 10px', borderTop: '1px dashed #E0D6CE',
                      marginTop: 8,
                    }}>
                      <span style={{
                        fontFamily: 'var(--font-body)', fontSize: 10, fontWeight: 700,
                        letterSpacing: '0.12em', textTransform: 'uppercase', color: '#B8A89A',
                      }}>
                        {unpricedProviders.length} more provider{unpricedProviders.length !== 1 ? 's' : ''} — no prices yet
                      </span>
                    </div>
                    {unpricedProviders.map((p) => (
                      <div
                        key={p.id}
                        data-provider-card={p.id}
                        style={{
                          border: '1.5px dashed #E0D6CE',
                          borderRadius: 12,
                          padding: '10px 12px',
                          marginBottom: 6,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          background: '#FAFAF8',
                        }}
                      >
                        <ProviderAvatar name={p.name || p.provider_name} size={36} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 13, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.name || p.provider_name}
                          </div>
                          <div style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: '#999' }}>
                            {p.google_rating ? `★ ${Number(p.google_rating).toFixed(1)}` : ''}
                            {p.google_rating && p.google_review_count ? ` (${p.google_review_count})` : ''}
                            {!p.google_rating && 'No reviews yet'}
                          </div>
                        </div>
                        <Link
                          to="/log"
                          style={{
                            fontFamily: 'var(--font-body)', fontSize: 11, fontWeight: 600,
                            color: '#E8347A', textDecoration: 'none', whiteSpace: 'nowrap',
                          }}
                        >
                          + Add price
                        </Link>
                      </div>
                    ))}
                    <p style={{
                      fontFamily: 'var(--font-body)', fontSize: 12, color: '#B8A89A',
                      textAlign: 'center', margin: '12px 0 4px',
                    }}>
                      Help women{selectedLoc?.city ? ` in ${selectedLoc.city}` : ''} know what to expect — share what you paid.
                    </p>
                  </div>
                )}
                </>
              )}
            </div>

            {/* Right: stable map — same component instance for the
                entire gate → priced lifecycle so markers never get
                wiped. allProviders is the always-fetched base layer
                of city pins (gray); procedures is the priced overlay
                (colored by price tier) and is empty in gate state. */}
            <div
              style={{
                flex: 1,
                position: 'relative',
                paddingLeft: 16,
              }}
            >
              <GlowMap
                allProviders={gateProviders}
                procedures={procFilter ? proceduresForMap : []}
                cityAvg={procFilter ? cityAvgPrice : null}
                city={selectedLoc.city}
                state={selectedLoc.state}
                highlightedId={hoveredProviderId}
                selectedId={
                  procFilter
                    ? selectedProviderGroup?.provider_id || null
                    : gateSelectedProviderGroup?.provider_id || null
                }
                onPinClick={procFilter ? handlePinClick : handleGatePinClick}
                onMapClick={handleMapClick}
                onBoundsChange={handleBoundsChange}
                onUserMovedMap={handleUserMovedMap}
                showSearchArea={showSearchArea}
                onSearchAreaClick={handleSearchAreaClick}
              />
              {!procFilter && gateSelectedProviderGroup && (
                <ProviderBottomSheet
                  group={gateSelectedProviderGroup}
                  gateMode
                  onSelectPill={handleGatePillSelect}
                  onClose={() => setGateSelectedProviderGroup(null)}
                />
              )}
              {procFilter && selectedProviderGroup && (
                <ProviderProfileModal
                  group={selectedProviderGroup}
                  onClose={() => setSelectedProviderGroup(null)}
                  cityAvg={cityAvgPrice}
                  onDosingClick={(row) => {
                    setDosingSheet({
                      procedureType: row.procedure_type,
                      brand: row.brand || null,
                      providerName: selectedProviderGroup.provider_name || null,
                      treatmentArea: row.treatment_area || null,
                      dosingType: 'neurotoxin',
                      dosingKey: (row.brand || 'botox').toLowerCase(),
                    });
                  }}
                />
              )}
            </div>
          </div>
        );
      })()}

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

      {/* ─── Procedure Intelligence Detail Sheet ─── */}
      {detailSheet && (
        <ProcedureDetailSheet
          procedureName={detailSheet.procedureName}
          providerName={detailSheet.providerName}
          providerSlug={detailSheet.providerSlug}
          price={detailSheet.price}
          priceUnit={detailSheet.priceUnit}
          onClose={() => setDetailSheet(null)}
          onAddExperience={() => {
            const name = detailSheet.procedureName;
            setDetailSheet(null);
            setExperienceSheet({ procedureName: name });
          }}
        />
      )}

      {/* ─── Add Experience Sheet ─── */}
      {experienceSheet && (
        <AddExperienceSheet
          procedureName={experienceSheet.procedureName}
          userId={user?.id || null}
          onClose={() => setExperienceSheet(null)}
          onSuccess={() => {}}
        />
      )}

      {/* ─── Dosing Calculator Sheet ─── */}
      {dosingSheet && (
        <DosingCalculatorSheet
          procedureType={dosingSheet.procedureType}
          brand={dosingSheet.brand}
          providerName={dosingSheet.providerName}
          treatmentArea={dosingSheet.treatmentArea}
          dosingType={dosingSheet.dosingType}
          dosingKey={dosingSheet.dosingKey}
          onClose={() => setDosingSheet(null)}
        />
      )}
    </div>
  );
}

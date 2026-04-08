import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Map, List, Plus, X } from 'lucide-react';
import MapFilterBar from '../components/MapFilterBar';
import ProviderMap from '../components/ProviderMap';
import MapProviderCard from '../components/MapProviderCard';
import MobileSheet from '../components/MobileSheet';
import ProcedureGate from '../components/ProcedureGate';
import { fetchAllProvidersInBounds } from '../lib/autoPopulate';
import {
  resolveProcedureFilter,
  makeProcedureFilterFromCanonical,
  makeProcedureFilterFromPill,
} from '../lib/constants';
import { setPageMeta } from '../lib/seo';
import { SkeletonGrid } from '../components/SkeletonCard';
import { getCity as getGatingCity, getState as getGatingState, getZip as getGatingZip } from '../lib/gating';
import { supabase } from '../lib/supabase';
import { loadGoogleMaps } from '../lib/loadGoogleMaps';
import { lookupCityCoords } from '../lib/cityCoords';

const DEFAULT_CENTER = { lat: 39.5, lng: -98.35 };
const DEFAULT_ZOOM = 5;
const LOCATED_ZOOM = 11;
const CITY_ZOOM = 12;
const METRO_ZOOM = 10;
const DEFAULT_BOUNDS = { south: 24.0, north: 49.0, west: -125.0, east: -66.0 };

export default function MapView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState('map');
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);

  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [cityLabel, setCityLabel] = useState(''); // for count display
  const [stateLabel, setStateLabel] = useState('');
  const [mapMoved, setMapMoved] = useState(false);

  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [selectedProvider, setSelectedProvider] = useState(null);

  const [filters, setFilters] = useState({
    cityOrZip: '',
    distance: 25,
  });

  // procFilter is the source of truth for which procedure(s) to show.
  // null = no procedure selected → ProcedureGate shows + map renders dots only
  const [procFilter, setProcFilter] = useState(() =>
    resolveProcedureFilter(
      searchParams.get('procedure') || '',
      searchParams.get('brand') || null,
    ),
  );

  // The legacy MapFilterBar reads filters.procedureType (canonical name).
  // We expose a derived shape so the bar reflects the current procFilter.
  const filtersForBar = { ...filters, procedureType: procFilter?.primary || '' };

  const [sheetExpanded, setSheetExpanded] = useState(false);

  const boundsRef = useRef(DEFAULT_BOUNDS);
  const debounceRef = useRef(null);
  const geocodeRef = useRef(null);

  // SEO
  useEffect(() => {
    const procName = procFilter?.label || 'Botox';
    setPageMeta({
      title: `Find ${procName} Prices Near You | GlowBuddy`,
      description: `Patient-reported prices for ${procName} and other med spa treatments. Real prices. Verified receipts. Know before you glow.`,
    });
  }, [procFilter]);

  // ── Fetch all providers (with and without submissions) ──
  // When the gate is open (no procFilter), we still show the provider dots
  // for context but strip the pricing fields so no $ pins render and the
  // viewer is encouraged to pick a treatment.
  const fetchMarkers = useCallback(async (bounds) => {
    setLoading(true);
    try {
      const merged = await fetchAllProvidersInBounds(bounds, procFilter);
      console.log(`Fetched ${merged.length} providers in viewport`);
      if (!procFilter) {
        setProviders(
          merged.map((p) => ({
            ...p,
            has_submissions: false,
            has_per_unit_price: false,
            per_unit_avg: 0,
            submission_count: 0,
          })),
        );
      } else {
        setProviders(merged);
      }
    } catch (err) {
      console.error('MapView fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [procFilter]);

  // ── Geocode city/zip to pan the map ──
  // Tries the hardcoded cityCoords lookup first (instant), then falls back to
  // the Google geocoder. Metros (NYC, LA, Chicago, etc.) get zoom 10 and
  // regular cities get zoom 12.
  useEffect(() => {
    const cityOrZip = filters.cityOrZip.trim();
    if (!cityOrZip) return;

    // Fast path: hardcoded lookup (no Google call needed)
    if (!/^\d{5}$/.test(cityOrZip)) {
      const known = lookupCityCoords(cityOrZip);
      if (known) {
        setMapCenter({ lat: known.lat, lng: known.lng });
        setMapZoom(known.zoom);
        return;
      }
    }

    // Slow path: Google geocoder (debounced for typed input)
    let cancelled = false;
    if (geocodeRef.current) clearTimeout(geocodeRef.current);
    geocodeRef.current = setTimeout(async () => {
      await waitForGoogleMaps();
      if (cancelled) return;
      const geocoder = new window.google.maps.Geocoder();
      const request = /^\d{5}$/.test(cityOrZip)
        ? { address: cityOrZip, componentRestrictions: { country: 'US' } }
        : { address: `${cityOrZip}, USA`, componentRestrictions: { country: 'US' } };

      geocoder.geocode(request, (results, status) => {
        if (cancelled) return;
        if (status === 'OK' && results?.[0]) {
          const loc = results[0].geometry.location;
          setMapCenter({ lat: loc.lat(), lng: loc.lng() });
          // Pick zoom based on result type — counties / metros are bigger
          const types = results[0].types || [];
          const isMetro =
            types.includes('administrative_area_level_2') ||
            types.includes('administrative_area_level_1');
          setMapZoom(isMetro ? METRO_ZOOM : CITY_ZOOM);
        }
      });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(geocodeRef.current);
    };
  }, [filters.cityOrZip]);

  // ── Initial fetch with US-wide bounds ──
  useEffect(() => {
    fetchMarkers(DEFAULT_BOUNDS);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-fetch when procedure filter changes ──
  // City/zip changes are handled by the geocode effect + onBoundsChanged
  const prevProcKey = useRef(procFilter?.slug || '');
  useEffect(() => {
    const key = procFilter?.slug || '';
    if (prevProcKey.current === key) return;
    prevProcKey.current = key;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchMarkers(boundsRef.current);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [procFilter, fetchMarkers]);

  // ── URL sync: write procedure slug + brand, preserving other params ──
  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (procFilter) {
          next.set('procedure', procFilter.slug);
        } else {
          next.delete('procedure');
        }
        if (procFilter?.brand) {
          next.set('brand', procFilter.brand);
        } else {
          next.delete('brand');
        }
        return next;
      },
      { replace: true },
    );
  }, [procFilter, setSearchParams]);

  // ── Restore procFilter from URL on back/forward navigation ──
  useEffect(() => {
    const urlSlug = searchParams.get('procedure') || '';
    const urlBrand = searchParams.get('brand') || '';
    const currentSlug = procFilter?.slug || '';
    const currentBrand = procFilter?.brand || '';
    if (urlSlug !== currentSlug || urlBrand !== currentBrand) {
      setProcFilter(resolveProcedureFilter(urlSlug, urlBrand || null));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ── Resolve user location on mount ──
  // Priority: 1) URL params → 2) Profile lat/lng → 3) Gating city/zip → 4) Browser geolocation → 5) US center
  useEffect(() => {
    let cancelled = false;

    async function resolveLocation() {
      setLocating(true);

      // 1. URL params
      const urlLat = searchParams.get('lat');
      const urlLng = searchParams.get('lng');
      const urlCity = searchParams.get('city');
      const urlState = searchParams.get('state');

      if (urlLat && urlLng) {
        const loc = { lat: parseFloat(urlLat), lng: parseFloat(urlLng) };
        setUserLocation(loc);
        setMapCenter(loc);
        setMapZoom(LOCATED_ZOOM);
        if (urlCity) {
          setCityLabel(urlCity);
          setStateLabel(urlState || '');
          setFilters((f) => ({ ...f, cityOrZip: urlCity }));
        }
        setLocating(false);
        return;
      }

      if (urlCity && urlState) {
        setCityLabel(urlCity);
        setStateLabel(urlState);
        setFilters((f) => ({ ...f, cityOrZip: `${urlCity}, ${urlState}` }));
        const coords = await geocodeAddress(`${urlCity}, ${urlState}, USA`);
        if (!cancelled && coords) {
          setUserLocation(coords);
          setMapCenter(coords);
          setMapZoom(LOCATED_ZOOM);
        }
        if (!cancelled) setLocating(false);
        return;
      }

      // 2. User's saved profile location
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && !cancelled) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('preferred_lat, preferred_lng, preferred_zip, preferred_city, preferred_state')
            .eq('id', user.id)
            .single();

          if (!cancelled && profile?.preferred_lat && profile?.preferred_lng) {
            const loc = { lat: parseFloat(profile.preferred_lat), lng: parseFloat(profile.preferred_lng) };
            setUserLocation(loc);
            setMapCenter(loc);
            setMapZoom(LOCATED_ZOOM);
            if (profile.preferred_city) {
              setCityLabel(profile.preferred_city);
              setStateLabel(profile.preferred_state || '');
              setFilters((f) => ({ ...f, cityOrZip: profile.preferred_city }));
            }
            setLocating(false);
            return;
          }

          // Profile has city/zip but no coords — geocode it
          if (!cancelled && (profile?.preferred_zip || profile?.preferred_city)) {
            const query = profile.preferred_zip || `${profile.preferred_city}, ${profile.preferred_state}`;
            const coords = await geocodeAddress(query);
            if (!cancelled && coords) {
              setUserLocation(coords);
              setMapCenter(coords);
              setMapZoom(LOCATED_ZOOM);
              setCityLabel(profile.preferred_city || profile.preferred_zip);
              setStateLabel(profile.preferred_state || '');
              setFilters((f) => ({ ...f, cityOrZip: profile.preferred_city || profile.preferred_zip }));
              // Save coords for next time
              supabase.from('profiles').update({ preferred_lat: coords.lat, preferred_lng: coords.lng }).eq('id', user.id).then(() => {});
              setLocating(false);
              return;
            }
          }
        }
      } catch {
        // Profile lookup failed — continue to fallbacks
      }

      if (cancelled) return;

      // 3. Gating (localStorage) city/zip
      const savedCity = getGatingCity();
      const savedState = getGatingState();
      const savedZip = getGatingZip();

      if (savedZip || savedCity) {
        const query = savedZip || `${savedCity}, ${savedState}`;
        setCityLabel(savedCity || savedZip);
        setStateLabel(savedState);
        setFilters((f) => ({ ...f, cityOrZip: savedCity || savedZip }));

        const coords = await geocodeAddress(query);
        if (!cancelled && coords) {
          setUserLocation(coords);
          setMapCenter(coords);
          setMapZoom(LOCATED_ZOOM);
        }
        if (!cancelled) setLocating(false);
        return;
      }

      // 4. Browser geolocation
      if (navigator.geolocation) {
        try {
          const coords = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
              reject,
              { timeout: 3000 }
            );
          });

          if (!cancelled) {
            setUserLocation(coords);
            setMapCenter(coords);
            setMapZoom(LOCATED_ZOOM);

            // Reverse geocode to get city name
            const cityInfo = await reverseGeocode(coords);
            if (!cancelled && cityInfo) {
              setCityLabel(cityInfo.city);
              setStateLabel(cityInfo.state);
              setFilters((f) => ({ ...f, cityOrZip: cityInfo.city }));
            }
          }
        } catch {
          // Permission denied or timeout — use default
        }
      }

      // 5. Final fallback — stays on DEFAULT_CENTER (center of US)
      if (!cancelled) setLocating(false);
    }

    resolveLocation();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Geocode helpers ──
  async function geocodeAddress(address) {
    await waitForGoogleMaps();
    return new Promise((resolve) => {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode(
        { address, componentRestrictions: { country: 'US' } },
        (results, status) => {
          if (status === 'OK' && results?.[0]) {
            resolve({
              lat: results[0].geometry.location.lat(),
              lng: results[0].geometry.location.lng(),
            });
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  async function reverseGeocode(coords) {
    await waitForGoogleMaps();
    return new Promise((resolve) => {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: coords }, (results, status) => {
        if (status !== 'OK' || !results?.[0]) { resolve(null); return; }
        let city = '';
        let state = '';
        for (const comp of results[0].address_components) {
          if (comp.types.includes('locality')) city = comp.long_name;
          if (comp.types.includes('administrative_area_level_1')) state = comp.short_name;
        }
        resolve(city ? { city, state } : null);
      });
    });
  }

  async function waitForGoogleMaps() {
    if (window.google?.maps?.Geocoder) return;
    await loadGoogleMaps();
    // Wait for Geocoder to be available after script loads
    await new Promise((resolve) => {
      const check = () => {
        if (window.google?.maps?.Geocoder) resolve();
        else setTimeout(check, 100);
      };
      check();
    });
  }

  // ── Handlers ──
  function handleFilterChange(patch) {
    if ('procedureType' in patch) {
      // Translate the dropdown's canonical procedure name → procFilter
      const next = patch.procedureType
        ? makeProcedureFilterFromCanonical(patch.procedureType)
        : null;
      setProcFilter(next);
      // eslint-disable-next-line no-unused-vars
      const { procedureType, ...rest } = patch;
      if (Object.keys(rest).length > 0) {
        if ('cityOrZip' in rest) {
          setCityLabel(rest.cityOrZip);
          setMapMoved(false);
        }
        setFilters((f) => ({ ...f, ...rest }));
      }
      return;
    }
    if ('cityOrZip' in patch) {
      setCityLabel(patch.cityOrZip);
      setMapMoved(false);
    }
    setFilters((f) => ({ ...f, ...patch }));
  }

  function selectPill(pill) {
    setProcFilter(makeProcedureFilterFromPill(pill));
  }

  function clearProcedure() {
    setProcFilter(null);
  }

  async function handleLocateMe() {
    if (!navigator.geolocation) return;
    setLocating(true);
    try {
      const coords = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          reject,
          { timeout: 10000, enableHighAccuracy: false }
        );
      });
      setUserLocation(coords);
      setMapCenter(coords);
      setMapZoom(LOCATED_ZOOM);

      const cityInfo = await reverseGeocode(coords);
      if (cityInfo) {
        setCityLabel(cityInfo.city);
        setStateLabel(cityInfo.state);
        setFilters((f) => ({ ...f, cityOrZip: cityInfo.city }));
      }
    } catch {
      // Permission denied or timeout
    }
    setLocating(false);
  }

  function handleBoundsChanged(bounds) {
    boundsRef.current = bounds;
    setMapMoved(true);
    // Re-fetch with new bounds
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchMarkers(bounds), 500);
  }

  // ── Count display text ──
  const withoutData = providers.filter((p) => !p.has_submissions);

  function getCountText() {
    if (loading) return 'Searching...';
    if (!procFilter) return 'Choose a treatment to compare prices';
    const procName = procFilter.label;
    const n = providers.length;
    const area = cityLabel.trim()
      ? ` in ${cityLabel}`
      : mapMoved
      ? ' in this area'
      : ' nationwide';
    if (n === 0) return `No ${procName} providers${area} yet`;
    const totalPrices = providers.reduce((sum, p) => sum + (p.submission_count || 0), 0);
    const totalVerified = providers.reduce((sum, p) => sum + (p.verified_count || 0), 0);
    if (totalPrices > 0) {
      const verifiedPart = totalVerified > 0 ? ` · ${totalVerified} receipt-verified` : '';
      return `${procName} prices${area} — ${n} provider${n !== 1 ? 's' : ''}${verifiedPart}`;
    }
    if (withoutData.length > 0) {
      return `${n} ${procName} provider${n !== 1 ? 's' : ''}${area} — be the first to share prices`;
    }
    return `${procName} · ${n} provider${n !== 1 ? 's' : ''}${area}`;
  }

  const countText = getCountText();

  return (
    <div className="flex flex-col map-container">
      <MapFilterBar
        filters={filtersForBar}
        onFilterChange={handleFilterChange}
        userLocation={userLocation}
        onLocateMe={handleLocateMe}
        locating={locating}
      />

      {/* Active procedure pill — shows current selection with quick clear */}
      {procFilter && (
        <div className="flex items-center gap-2 px-4 py-2 bg-rose-light/30 border-b border-rose-light">
          <span className="text-xs text-text-secondary">Showing:</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-accent text-white px-3 py-1 text-xs font-medium">
            {procFilter.label}
            <button
              type="button"
              onClick={clearProcedure}
              className="inline-flex items-center justify-center hover:bg-white/20 rounded-full p-0.5"
              aria-label={`Clear ${procFilter.label} filter`}
            >
              <X size={12} />
            </button>
          </span>
        </div>
      )}

      {/* View toggle */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
        <div className="flex flex-col">
          <span className="text-sm text-text-secondary">
            {countText || (loading ? 'Searching...' : '')}
          </span>
          {!loading && providers.length === 0 && (
            <span className="text-xs text-text-secondary/70">Zoom out or search a different city</span>
          )}
        </div>
        <div className="flex items-center gap-1 bg-warm-gray rounded-lg p-0.5">
          <button
            onClick={() => setView('map')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              view === 'map'
                ? 'bg-white text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Map size={14} />
            Map
          </button>
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              view === 'list'
                ? 'bg-white text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <List size={14} />
            List
          </button>
        </div>
      </div>

      {/* Pioneer unclaimed locations banner */}
      {!loading && withoutData.length > 0 && (
        <div className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-amber-50 border-b border-amber-100" style={{ color: '#92400E' }}>
          <span role="img" aria-label="Pioneer">🏅</span>
          <span>
            {withoutData.length} unclaimed location{withoutData.length !== 1 ? 's' : ''} near you &mdash; share a price and earn Pioneer status
          </span>
        </div>
      )}

      {/* Main content */}
      {view === 'map' ? (
        <div className="relative flex-1">
          <ProviderMap
            providers={providers}
            center={mapCenter}
            zoom={mapZoom}
            selectedProvider={selectedProvider}
            onSelectProvider={setSelectedProvider}
            onBoundsChanged={handleBoundsChanged}
            procedureFilter={procFilter?.primary || ''}
          />

          {/* Powered by Google attribution */}
          <div className="absolute bottom-2 left-2 bg-white/90 rounded px-2 py-0.5 text-[10px] text-text-secondary z-10">
            Powered by Google
          </div>

          {/* Procedure gate — overlays the map until a treatment is picked */}
          {!procFilter && (
            <ProcedureGate
              variant="overlay"
              onSelect={selectPill}
              cityLabel={cityLabel || ''}
            />
          )}

          {procFilter && (
            <MobileSheet
              providers={providers}
              expanded={sheetExpanded}
              onToggle={setSheetExpanded}
            />
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-warm-white">
          {!procFilter ? (
            <div className="py-8 px-4">
              <ProcedureGate
                variant="block"
                onSelect={selectPill}
                cityLabel={cityLabel || ''}
              />
            </div>
          ) : loading ? (
            <div className="p-4">
              <SkeletonGrid count={4} />
            </div>
          ) : providers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <p className="text-sm font-medium text-text-primary mb-1">
                📍 No providers found in this area yet.
              </p>
              <p className="text-xs text-text-secondary mb-3">
                GlowBuddy is growing — your city might be next.
              </p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto p-4 grid gap-1">
              {providers.map((p) => (
                <MapProviderCard key={p.key} provider={p} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

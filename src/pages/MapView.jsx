import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Map, List, Plus } from 'lucide-react';
import MapFilterBar from '../components/MapFilterBar';
import ProviderMap from '../components/ProviderMap';
import MapProviderCard from '../components/MapProviderCard';
import MobileSheet from '../components/MobileSheet';
import { fetchAllProvidersInBounds } from '../lib/autoPopulate';
import { setPageMeta } from '../lib/seo';
import { SkeletonGrid } from '../components/SkeletonCard';
import { getCity as getGatingCity, getState as getGatingState, getZip as getGatingZip } from '../lib/gating';
import { supabase } from '../lib/supabase';
import { loadGoogleMaps } from '../lib/loadGoogleMaps';

const DEFAULT_CENTER = { lat: 39.5, lng: -98.35 };
const DEFAULT_ZOOM = 5;
const LOCATED_ZOOM = 11;
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
    procedureType: '',
    cityOrZip: '',
    distance: 25,
  });

  const [sheetExpanded, setSheetExpanded] = useState(false);

  const boundsRef = useRef(DEFAULT_BOUNDS);
  const debounceRef = useRef(null);
  const geocodeRef = useRef(null);

  // SEO
  useEffect(() => {
    setPageMeta({
      title: 'Find Botox Prices Near You | GlowBuddy',
      description: 'Patient-reported prices for Botox, fillers, and med spa treatments. Real prices. Verified receipts. Know before you glow.',
    });
  }, []);

  // ── Fetch all providers (with and without submissions) ──
  const fetchMarkers = useCallback(async (bounds) => {
    setLoading(true);
    try {
      const merged = await fetchAllProvidersInBounds(bounds, filters.procedureType);
      console.log(`Fetched ${merged.length} providers in viewport`);
      setProviders(merged);
    } catch (err) {
      console.error('MapView fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters.procedureType]);

  // ── Geocode city/zip to pan the map ──
  useEffect(() => {
    const cityOrZip = filters.cityOrZip.trim();
    if (!cityOrZip) return;

    if (geocodeRef.current) clearTimeout(geocodeRef.current);
    geocodeRef.current = setTimeout(() => {
      if (!window.google?.maps?.Geocoder) return;
      const geocoder = new window.google.maps.Geocoder();
      const request = /^\d{5}$/.test(cityOrZip)
        ? { address: cityOrZip }
        : { address: `${cityOrZip}, USA` };

      geocoder.geocode(request, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          const loc = results[0].geometry.location;
          setMapCenter({ lat: loc.lat(), lng: loc.lng() });
          setMapZoom(LOCATED_ZOOM);
        }
      });
    }, 600);

    return () => clearTimeout(geocodeRef.current);
  }, [filters.cityOrZip]);

  // ── Initial fetch with US-wide bounds ──
  useEffect(() => {
    fetchMarkers(DEFAULT_BOUNDS);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-fetch when procedure filter changes ──
  // City/zip changes are handled by the geocode effect + onBoundsChanged
  const prevProcFilter = useRef(filters.procedureType);
  useEffect(() => {
    if (prevProcFilter.current === filters.procedureType) return;
    prevProcFilter.current = filters.procedureType;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchMarkers(boundsRef.current);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [filters.procedureType, fetchMarkers]);

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
    if ('cityOrZip' in patch) {
      setCityLabel(patch.cityOrZip);
      setMapMoved(false);
    }
    setFilters((f) => ({ ...f, ...patch }));
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
    const n = providers.length;
    if (n === 0) return 'No providers in this area yet';
    const area = cityLabel.trim()
      ? ` in ${cityLabel}`
      : mapMoved
      ? ' in this area'
      : ' nationwide';
    const totalPrices = providers.reduce((sum, p) => sum + (p.submission_count || 0), 0);
    const totalVerified = providers.reduce((sum, p) => sum + (p.verified_count || 0), 0);
    if (totalPrices > 0) {
      const verifiedPart = totalVerified > 0 ? ` · ${totalVerified} receipt-verified` : '';
      return `${totalPrices} price${totalPrices !== 1 ? 's' : ''}${verifiedPart}${area}`;
    }
    if (withoutData.length > 0) {
      return `${n} provider${n !== 1 ? 's' : ''} found${area} — be the first to share prices`;
    }
    return `${n} provider${n !== 1 ? 's' : ''}${area}`;
  }

  const countText = getCountText();

  return (
    <div className="flex flex-col map-container">
      <MapFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        userLocation={userLocation}
        onLocateMe={handleLocateMe}
        locating={locating}
      />

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
            procedureFilter={filters.procedureType}
          />

          {/* Powered by Google attribution */}
          <div className="absolute bottom-2 left-2 bg-white/90 rounded px-2 py-0.5 text-[10px] text-text-secondary z-10">
            Powered by Google
          </div>

          <MobileSheet
            providers={providers}
            expanded={sheetExpanded}
            onToggle={setSheetExpanded}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-warm-white">
          {loading ? (
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

import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Map, List, Plus } from 'lucide-react';
import MapFilterBar from '../components/MapFilterBar';
import ProviderMap from '../components/ProviderMap';
import MapProviderCard from '../components/MapProviderCard';
import MobileSheet from '../components/MobileSheet';
import { fetchAllProvidersInBounds } from '../lib/autoPopulate';
import { setPageMeta } from '../lib/seo';
import { SkeletonGrid } from '../components/SkeletonCard';
import { getCity as getGatingCity, getState as getGatingState, getZip as getGatingZip } from '../lib/gating';

const DEFAULT_CENTER = { lat: 37.0902, lng: -95.7129 };
const DEFAULT_ZOOM = 4;
const LOCATED_ZOOM = 11;
const DEFAULT_BOUNDS = { south: 24.0, north: 49.0, west: -125.0, east: -66.0 };

export default function MapView() {
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
      title: 'Browse Botox Prices Near You | GlowBuddy',
      description: 'Patient-reported prices for Botox, fillers, and med spa treatments. Real prices. Verified receipts. Know before you glow.',
    });
  }, []);

  // ── Fetch all providers (with and without submissions) ──
  const fetchMarkers = useCallback(async (bounds) => {
    setLoading(true);
    try {
      const merged = await fetchAllProvidersInBounds(bounds, filters.procedureType);

      // Apply city/zip filter client-side if set
      let filtered = merged;
      const cityOrZip = filters.cityOrZip.trim();
      if (cityOrZip) {
        if (/^\d{5}$/.test(cityOrZip)) {
          // Zip filter not available on providers table — keep all
          filtered = merged;
        } else {
          filtered = merged.filter((p) =>
            p.city?.toLowerCase().includes(cityOrZip.toLowerCase())
          );
        }
      }

      setProviders(filtered);
    } catch (err) {
      console.error('MapView fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

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

  // ── Re-fetch when filters change ──
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchMarkers(boundsRef.current);
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [filters, fetchMarkers]);

  // ── Resolve user location on mount: saved location → browser geolocation → US center ──
  useEffect(() => {
    const savedCity = getGatingCity();
    const savedState = getGatingState();
    const savedZip = getGatingZip();

    // If user has a saved location from onboarding, geocode it to center the map
    if (savedZip || savedCity) {
      setLocating(true);
      const query = savedZip || `${savedCity}, ${savedState}`;
      const label = savedCity
        ? `${savedCity}${savedState ? `, ${savedState}` : ''}`
        : savedZip;

      // Pre-fill the city input immediately
      setCityLabel(savedCity || savedZip);
      setStateLabel(savedState);
      setFilters((f) => ({ ...f, cityOrZip: label }));

      // Wait for Google Maps to load, then geocode
      const waitAndGeocode = () => {
        if (!window.google?.maps?.Geocoder) {
          // Google Maps not loaded yet — retry briefly
          setTimeout(waitAndGeocode, 200);
          return;
        }
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode(
          { address: query, componentRestrictions: { country: 'US' } },
          (results, status) => {
            if (status === 'OK' && results?.[0]) {
              const loc = {
                lat: results[0].geometry.location.lat(),
                lng: results[0].geometry.location.lng(),
              };
              setUserLocation(loc);
              setMapCenter(loc);
              setMapZoom(LOCATED_ZOOM);
            }
            setLocating(false);
          }
        );
      };
      waitAndGeocode();
      return;
    }

    // No saved location — fall back to browser geolocation
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const loc = { lat: latitude, lng: longitude };
        setUserLocation(loc);
        setMapCenter(loc);
        setMapZoom(LOCATED_ZOOM);

        if (window.google?.maps?.Geocoder) {
          try {
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
            let foundCity = '';
            let foundState = '';
            for (const comp of result.address_components) {
              if (comp.types.includes('locality')) foundCity = comp.long_name;
              if (comp.types.includes('administrative_area_level_1')) foundState = comp.short_name;
            }
            if (foundCity) {
              setCityLabel(foundCity);
              setStateLabel(foundState);
              setFilters((f) => ({ ...f, cityOrZip: foundCity }));
            }
          } catch {
            // silent
          }
        }
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 10000, enableHighAccuracy: false }
    );
  }, []);

  // ── Handlers ──
  function handleFilterChange(patch) {
    if ('cityOrZip' in patch) {
      setCityLabel(patch.cityOrZip);
      setMapMoved(false);
    }
    setFilters((f) => ({ ...f, ...patch }));
  }

  function handleLocateMe() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const loc = { lat: latitude, lng: longitude };
        setUserLocation(loc);
        setMapCenter(loc);
        setMapZoom(LOCATED_ZOOM);

        if (window.google?.maps?.Geocoder) {
          try {
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
            let foundCity = '';
            let foundState = '';
            for (const comp of result.address_components) {
              if (comp.types.includes('locality')) foundCity = comp.long_name;
              if (comp.types.includes('administrative_area_level_1')) foundState = comp.short_name;
            }
            if (foundCity) {
              setCityLabel(foundCity);
              setStateLabel(foundState);
              setFilters((f) => ({ ...f, cityOrZip: foundCity }));
            }
          } catch {
            // silent
          }
        }
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 10000, enableHighAccuracy: false }
    );
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
    if (n === 0) return null;
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
        <span className="text-sm text-text-secondary">
          {countText || (loading ? 'Searching...' : '')}
        </span>
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

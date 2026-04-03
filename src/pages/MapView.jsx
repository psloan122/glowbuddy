import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Map, List, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import MapFilterBar from '../components/MapFilterBar';
import ProviderMap from '../components/ProviderMap';
import MapProviderCard from '../components/MapProviderCard';
import MobileSheet from '../components/MobileSheet';

const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 }; // Center of US
const DEFAULT_ZOOM = 4;
const LOCATED_ZOOM = 11;
const MAX_PROVIDERS = 100;

export default function MapView() {
  // View toggle
  const [view, setView] = useState('map');

  // Provider data
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Location
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);

  // Map state
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [selectedProvider, setSelectedProvider] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    procedureType: '',
    cityOrZip: '',
    distance: 25,
  });

  // Mobile sheet
  const [sheetExpanded, setSheetExpanded] = useState(false);

  // Debounce timer for cityOrZip
  const debounceRef = useRef(null);

  // Track current bounds from map idle
  const boundsRef = useRef(null);

  // ── Geolocation on mount ──
  useEffect(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const loc = { lat: latitude, lng: longitude };
        setUserLocation(loc);
        setMapCenter(loc);
        setMapZoom(LOCATED_ZOOM);

        // Reverse geocode for city name
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
            let city = '';
            for (const comp of result.address_components) {
              if (comp.types.includes('locality')) city = comp.long_name;
            }
            if (city) {
              setFilters((f) => ({ ...f, cityOrZip: city }));
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

  // ── Fetch providers when filters or location change ──
  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('providers')
        .select('slug, name, lat, lng, city, state, weighted_rating, avg_rating, review_count, provider_type')
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .limit(MAX_PROVIDERS);

      // Bounding box filter when we have user location + distance
      if (userLocation && filters.distance) {
        const latDelta = filters.distance / 69.0;
        const lngDelta = filters.distance / (69.0 * Math.cos((userLocation.lat * Math.PI) / 180));
        query = query
          .gte('lat', userLocation.lat - latDelta)
          .lte('lat', userLocation.lat + latDelta)
          .gte('lng', userLocation.lng - lngDelta)
          .lte('lng', userLocation.lng + lngDelta);
      }

      // City or zip filter
      const cityOrZip = filters.cityOrZip.trim();
      if (cityOrZip) {
        if (/^\d{5}$/.test(cityOrZip)) {
          // Zip-based: query procedures table for matching zip, get provider slugs
          // For v1, skip zip join — filter by city ilike only
          query = query.ilike('city', `%${cityOrZip}%`);
        } else {
          query = query.ilike('city', `%${cityOrZip}%`);
        }
      }

      const { data: providerRows, error } = await query;
      if (error) throw error;
      if (!providerRows?.length) {
        setProviders([]);
        setLoading(false);
        return;
      }

      // Fetch avg price per provider from procedures table
      const slugs = providerRows.map((p) => p.slug);
      let procQuery = supabase
        .from('procedures')
        .select('provider_slug, price_paid')
        .in('provider_slug', slugs)
        .eq('status', 'active');

      if (filters.procedureType) {
        procQuery = procQuery.eq('procedure_type', filters.procedureType);
      }

      const { data: procRows } = await procQuery;

      // Compute avg price per slug
      const priceMap = {};
      if (procRows) {
        for (const row of procRows) {
          if (!priceMap[row.provider_slug]) priceMap[row.provider_slug] = [];
          if (row.price_paid != null) priceMap[row.provider_slug].push(row.price_paid);
        }
      }

      let merged = providerRows.map((p) => {
        const prices = priceMap[p.slug];
        return {
          ...p,
          avgPrice: prices?.length
            ? prices.reduce((a, b) => a + b, 0) / prices.length
            : null,
        };
      });

      // If procedure filter is set, only show providers that have matching procedures
      if (filters.procedureType) {
        merged = merged.filter((p) => p.avgPrice != null);
      }

      // Sort by weighted_rating desc
      merged.sort((a, b) => (b.weighted_rating || 0) - (a.weighted_rating || 0));

      setProviders(merged);
    } catch (err) {
      console.error('MapView fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [userLocation, filters]);

  // Debounce fetch on filter changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fetchProviders, 500);
    return () => clearTimeout(debounceRef.current);
  }, [fetchProviders]);

  // ── Handlers ──
  function handleFilterChange(patch) {
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
            let city = '';
            for (const comp of result.address_components) {
              if (comp.types.includes('locality')) city = comp.long_name;
            }
            if (city) {
              setFilters((f) => ({ ...f, cityOrZip: city }));
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
  }

  return (
    <div className="flex flex-col map-container">
      {/* Filter bar */}
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
          {loading ? 'Searching...' : `${providers.length} provider${providers.length !== 1 ? 's' : ''}`}
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
          />

          {/* Empty state overlay */}
          {!loading && providers.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-6 text-center pointer-events-auto max-w-xs">
                <p className="text-sm font-medium text-text-primary mb-1">No prices logged here yet</p>
                <p className="text-xs text-text-secondary mb-3">
                  Be the first to share what you paid in this area.
                </p>
                <Link
                  to="/log"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-rose-accent hover:text-rose-dark transition"
                >
                  <Plus size={14} />
                  Log a Treatment
                </Link>
              </div>
            </div>
          )}

          {/* Mobile bottom sheet */}
          <MobileSheet
            providers={providers}
            expanded={sheetExpanded}
            onToggle={setSheetExpanded}
          />
        </div>
      ) : (
        /* List view */
        <div className="flex-1 overflow-y-auto bg-warm-white">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <span className="text-sm text-text-secondary animate-pulse">Loading providers...</span>
            </div>
          ) : providers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <p className="text-sm font-medium text-text-primary mb-1">No prices logged here yet</p>
              <p className="text-xs text-text-secondary mb-3">
                Be the first to share what you paid in this area.
              </p>
              <Link
                to="/log"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-rose-accent hover:text-rose-dark transition"
              >
                <Plus size={14} />
                Log a Treatment
              </Link>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto p-4 grid gap-1">
              {providers.map((p) => (
                <MapProviderCard key={p.slug} provider={p} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

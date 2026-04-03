import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Map, List, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import MapFilterBar from '../components/MapFilterBar';
import ProviderMap from '../components/ProviderMap';
import MapProviderCard from '../components/MapProviderCard';
import MobileSheet from '../components/MobileSheet';

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

  // ── Fetch markers from procedures table ──
  const fetchMarkers = useCallback(async (bounds) => {
    setLoading(true);
    try {
      let query = supabase
        .from('procedures')
        .select('provider_name, provider_slug, city, state, lat, lng, price_paid, procedure_type, provider_type, units_or_volume')
        .not('lat', 'is', null)
        .not('lng', 'is', null)
        .eq('status', 'active')
        .gte('lat', bounds.south)
        .lte('lat', bounds.north)
        .gte('lng', bounds.west)
        .lte('lng', bounds.east)
        .limit(200);

      if (filters.procedureType) {
        query = query.eq('procedure_type', filters.procedureType);
      }

      const cityOrZip = filters.cityOrZip.trim();
      if (cityOrZip) {
        if (/^\d{5}$/.test(cityOrZip)) {
          query = query.eq('zip_code', cityOrZip);
        } else {
          query = query.ilike('city', `%${cityOrZip}%`);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by provider_name + city → one marker per location
      const grouped = {};
      for (const row of data || []) {
        const key = `${row.provider_name}-${row.city}`;
        if (!grouped[key]) {
          grouped[key] = {
            key,
            provider_name: row.provider_name,
            provider_slug: row.provider_slug,
            city: row.city,
            state: row.state,
            lat: row.lat,
            lng: row.lng,
            provider_type: row.provider_type,
            submissions: [],
          };
        }
        grouped[key].submissions.push(row);
        // Keep first non-null slug
        if (row.provider_slug && !grouped[key].provider_slug) {
          grouped[key].provider_slug = row.provider_slug;
        }
      }

      const markers = Object.values(grouped).map((p) => ({
        ...p,
        submission_count: p.submissions.length,
        avg_price: Math.round(
          p.submissions.reduce((sum, s) => sum + (s.price_paid || 0), 0) /
            p.submissions.length
        ),
      }));

      // Sort by submission count desc
      markers.sort((a, b) => b.submission_count - a.submission_count);

      setProviders(markers);
    } catch (err) {
      console.error('MapView fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

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
            for (const comp of result.address_components) {
              if (comp.types.includes('locality')) {
                setCityLabel(comp.long_name);
                setFilters((f) => ({ ...f, cityOrZip: comp.long_name }));
                break;
              }
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
            for (const comp of result.address_components) {
              if (comp.types.includes('locality')) {
                setCityLabel(comp.long_name);
                setFilters((f) => ({ ...f, cityOrZip: comp.long_name }));
                break;
              }
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
  function getCountText() {
    if (loading) return 'Searching...';
    const n = providers.length;
    if (n === 0) return null; // handled by empty state
    const label = n === 1 ? 'provider' : 'providers';
    if (mapMoved && !filters.cityOrZip.trim()) return `${n} ${label} in this area`;
    if (cityLabel.trim()) return `${n} ${label} in ${cityLabel}`;
    return `${n} ${label} nationwide`;
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

          {/* Empty state overlay */}
          {!loading && providers.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-6 text-center pointer-events-auto max-w-xs">
                <p className="text-sm font-medium text-text-primary mb-1">
                  No prices logged here yet
                </p>
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

          <MobileSheet
            providers={providers}
            expanded={sheetExpanded}
            onToggle={setSheetExpanded}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto bg-warm-white">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <span className="text-sm text-text-secondary animate-pulse">Loading providers...</span>
            </div>
          ) : providers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <p className="text-sm font-medium text-text-primary mb-1">
                No prices logged here yet
              </p>
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
                <MapProviderCard key={p.key} provider={p} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { MapPin, X } from 'lucide-react';
import { loadGoogleMaps } from '../lib/loadGoogleMaps';
import { parseAddressComponents } from '../lib/places';

// LocationRadiusInput — smart location picker + radius selector for Price
// Alerts. Wraps Google Places Autocomplete (cities + ZIP codes only) and a
// pill-style radius selector.
//
// Props:
//   value:      { city, state, zip, lat, lng } | null
//   onChange:   (next) => void
//   radius:     integer (0 = city-only exact match)
//   onRadiusChange: (miles) => void
//
// The `value` object is intentionally the minimal set needed by the
// alert-matching logic — callers persist it directly onto price_alerts.

const RADIUS_OPTIONS = [5, 10, 25, 50];

export default function LocationRadiusInput({ value, onChange, radius, onRadiusChange }) {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const serviceRef = useRef(null);
  const sessionTokenRef = useRef(null);
  const detailsServiceRef = useRef(null);
  const containerRef = useRef(null);

  // Initialize Places services on mount
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled) return;
        const places = window.google?.maps?.places;
        if (!places?.AutocompleteService) return;
        serviceRef.current = new places.AutocompleteService();
        sessionTokenRef.current = new places.AutocompleteSessionToken();
        // PlacesService needs a DOM node to attach to
        const el = document.createElement('div');
        detailsServiceRef.current = new places.PlacesService(el);
        setReady(true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Debounced autocomplete query
  useEffect(() => {
    if (!ready || !query.trim()) {
      setPredictions([]);
      return;
    }
    const timer = setTimeout(() => {
      setLoading(true);
      serviceRef.current.getPlacePredictions(
        {
          input: query,
          types: ['(cities)'],
          componentRestrictions: { country: 'us' },
          sessionToken: sessionTokenRef.current,
        },
        (results, status) => {
          setLoading(false);
          const places = window.google?.maps?.places;
          if (status !== places.PlacesServiceStatus.OK || !results) {
            // Fall back to postal_code search for ZIP inputs
            if (/^\d{3,5}$/.test(query.trim())) {
              serviceRef.current.getPlacePredictions(
                {
                  input: query,
                  types: ['postal_code'],
                  componentRestrictions: { country: 'us' },
                  sessionToken: sessionTokenRef.current,
                },
                (zipResults, zipStatus) => {
                  if (zipStatus === places.PlacesServiceStatus.OK && zipResults) {
                    setPredictions(zipResults.slice(0, 5));
                  } else {
                    setPredictions([]);
                  }
                },
              );
              return;
            }
            setPredictions([]);
            return;
          }
          setPredictions(results.slice(0, 5));
        },
      );
    }, 200);
    return () => clearTimeout(timer);
  }, [query, ready]);

  function handleSelect(prediction) {
    setOpen(false);
    setPredictions([]);
    setQuery('');
    // Fetch full place details to get lat/lng + structured components
    detailsServiceRef.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['address_components', 'geometry', 'formatted_address'],
        sessionToken: sessionTokenRef.current,
      },
      (place, status) => {
        const places = window.google?.maps?.places;
        if (status !== places.PlacesServiceStatus.OK || !place) return;
        const parsed = parseAddressComponents(place.address_components);
        // Start a fresh session token after each selection (Google requirement)
        sessionTokenRef.current = new places.AutocompleteSessionToken();
        onChange({
          city: parsed.city || '',
          state: parsed.state || '',
          zip: parsed.zipCode || '',
          lat: place.geometry?.location?.lat() ?? null,
          lng: place.geometry?.location?.lng() ?? null,
        });
      },
    );
  }

  function handleClear() {
    onChange(null);
    setQuery('');
    setPredictions([]);
  }

  const displayLabel = value
    ? [value.city, value.state].filter(Boolean).join(', ') + (value.zip ? ` ${value.zip}` : '')
    : '';

  return (
    <div ref={containerRef}>
      {/* Location input */}
      <label className="block text-xs font-medium text-text-secondary mb-1 uppercase tracking-wide">
        Location
      </label>
      {value ? (
        <div
          className="flex items-center gap-2 px-3 py-3 border border-rule bg-cream"
          style={{ borderRadius: '2px' }}
        >
          <MapPin size={14} className="text-hot-pink shrink-0" />
          <span
            className="flex-1 text-[13px] text-ink truncate"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {displayLabel}
          </span>
          <button
            type="button"
            onClick={handleClear}
            className="text-text-secondary hover:text-ink shrink-0"
            aria-label="Clear location"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <MapPin
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={ready ? 'City, state or ZIP code' : 'Loading\u2026'}
            disabled={!ready}
            className="w-full pl-9 pr-3 py-3 text-[13px] border border-rule bg-white focus:outline-none focus:border-hot-pink"
            style={{ borderRadius: '2px', fontFamily: 'var(--font-body)' }}
          />
          {open && predictions.length > 0 && (
            <div
              className="absolute top-full left-0 right-0 mt-1 bg-white border border-rule z-50 max-h-60 overflow-y-auto"
              style={{ borderRadius: '2px' }}
            >
              {predictions.map((p) => (
                <button
                  key={p.place_id}
                  type="button"
                  onClick={() => handleSelect(p)}
                  className="w-full text-left px-3 py-2.5 text-[13px] text-ink hover:bg-cream transition-colors flex items-center gap-2"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  <MapPin size={12} className="text-text-secondary shrink-0" />
                  <span className="truncate">{p.description}</span>
                </button>
              ))}
            </div>
          )}
          {open && !loading && query.trim().length >= 2 && predictions.length === 0 && (
            <div
              className="absolute top-full left-0 right-0 mt-1 bg-white border border-rule px-3 py-2.5 text-[13px] text-text-secondary z-50"
              style={{ borderRadius: '2px' }}
            >
              No locations found
            </div>
          )}
        </div>
      )}

      {/* Radius selector */}
      {value && (
        <div className="mt-4">
          <label className="block text-xs font-medium text-text-secondary mb-2 uppercase tracking-wide">
            Alert me within
          </label>
          <div className="flex flex-wrap gap-1.5">
            {RADIUS_OPTIONS.map((miles) => {
              const active = radius === miles;
              return (
                <button
                  key={miles}
                  type="button"
                  onClick={() => onRadiusChange(miles)}
                  className="px-3 py-1.5 text-[11px] font-semibold uppercase transition-colors"
                  style={{
                    letterSpacing: '0.06em',
                    borderRadius: '2px',
                    background: active ? '#E8347A' : 'white',
                    border: `1px solid ${active ? '#E8347A' : '#E8E8E8'}`,
                    color: active ? 'white' : '#666',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {miles} mi
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => onRadiusChange(0)}
              className="px-3 py-1.5 text-[11px] font-semibold uppercase transition-colors"
              style={{
                letterSpacing: '0.06em',
                borderRadius: '2px',
                background: radius === 0 ? '#E8347A' : 'white',
                border: `1px solid ${radius === 0 ? '#E8347A' : '#E8E8E8'}`,
                color: radius === 0 ? 'white' : '#666',
                fontFamily: 'var(--font-body)',
              }}
            >
              City only
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

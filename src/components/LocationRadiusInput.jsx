import { useState, useEffect, useRef } from 'react';
import { MapPin, X } from 'lucide-react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
const RADIUS_OPTIONS = [5, 10, 25, 50];

function parseFeature(feature) {
  const [lng, lat] = feature.center || [];
  if (!lat || !lng) return null;

  const isPostcode = feature.place_type?.includes('postcode');
  const regionCtx = feature.context?.find((c) => c.id?.startsWith('region.'));
  const state = regionCtx?.short_code?.split('-')[1] || '';

  if (isPostcode) {
    const zip = feature.text || '';
    const placeCtx = feature.context?.find((c) => c.id?.startsWith('place.'));
    const city = placeCtx?.text || '';
    return city && state ? { city, state, zip, lat, lng, label: feature.place_name } : null;
  }

  const city = feature.text || '';
  return city && state ? { city, state, zip: '', lat, lng, label: feature.place_name } : null;
}

export default function LocationRadiusInput({ value, onChange, radius, onRadiusChange }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (!query.trim() || !MAPBOX_TOKEN) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
          `?types=place,postcode&country=US&limit=5&access_token=${MAPBOX_TOKEN}`,
        );
        if (!res.ok) { setResults([]); return; }
        const data = await res.json();
        setResults((data.features || []).map(parseFeature).filter(Boolean));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 200);
    return () => { clearTimeout(timer); setSearching(false); };
  }, [query]);

  function handleSelect(item) {
    setOpen(false);
    setResults([]);
    setQuery('');
    onChange({ city: item.city, state: item.state, zip: item.zip, lat: item.lat, lng: item.lng });
  }

  function handleClear() {
    onChange(null);
    setQuery('');
    setResults([]);
  }

  const displayLabel = value
    ? [value.city, value.state].filter(Boolean).join(', ') + (value.zip ? ` ${value.zip}` : '')
    : '';

  return (
    <div ref={containerRef}>
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
            placeholder="City, state or ZIP code"
            className="w-full pl-9 pr-3 py-3 text-[13px] border border-rule bg-white focus:outline-none focus:border-hot-pink"
            style={{ borderRadius: '2px', fontFamily: 'var(--font-body)' }}
          />
          {open && results.length > 0 && (
            <div
              className="absolute top-full left-0 right-0 mt-1 bg-white border border-rule z-50 max-h-60 overflow-y-auto"
              style={{ borderRadius: '2px' }}
            >
              {results.map((r) => (
                <button
                  key={`${r.city}-${r.state}-${r.zip}`}
                  type="button"
                  onClick={() => handleSelect(r)}
                  className="w-full text-left px-3 py-2.5 text-[13px] text-ink hover:bg-cream transition-colors flex items-center gap-2"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  <MapPin size={12} className="text-text-secondary shrink-0" />
                  <span className="truncate">{r.label}</span>
                </button>
              ))}
            </div>
          )}
          {open && !searching && query.trim().length >= 2 && results.length === 0 && (
            <div
              className="absolute top-full left-0 right-0 mt-1 bg-white border border-rule px-3 py-2.5 text-[13px] text-text-secondary z-50"
              style={{ borderRadius: '2px' }}
            >
              No locations found
            </div>
          )}
        </div>
      )}

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

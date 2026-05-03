import { useState, useRef, useEffect } from 'react';
import { MapPin, X, CheckCircle, ExternalLink, Phone, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import AddProviderModal from './AddProviderModal';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const INPUT_CLASSES =
  'w-full px-4 py-3 pl-10 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition';

export default function PlacesSearch({ onSelect, onClear, selectedPlace }) {
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  const [value, setValue] = useState('');
  const [results, setResults] = useState([]);
  const [existingProvider, setExistingProvider] = useState(null);
  const [showNoResults, setShowNoResults] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const noResultsTimerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setResults([]);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!selectedPlace) {
      setExistingProvider(null);
      return;
    }

    async function checkExisting() {
      let provider = null;
      if (selectedPlace._providerSlug) {
        const { data } = await supabase
          .from('providers')
          .select('slug, id')
          .eq('slug', selectedPlace._providerSlug)
          .maybeSingle();
        provider = data;
      } else if (selectedPlace.placeId) {
        const { data } = await supabase
          .from('providers')
          .select('slug, id')
          .eq('google_place_id', selectedPlace.placeId)
          .maybeSingle();
        provider = data;
      }

      if (provider) {
        const { count } = await supabase
          .from('procedures')
          .select('*', { count: 'exact', head: true })
          .eq('provider_slug', provider.slug)
          .eq('status', 'active');

        setExistingProvider({ ...provider, submissionCount: count || 0 });
      } else {
        setExistingProvider(null);
      }
    }

    checkExisting();
  }, [selectedPlace]);

  useEffect(() => {
    if (noResultsTimerRef.current) clearTimeout(noResultsTimerRef.current);

    if (value.length < 3 || results.length > 0) {
      setShowNoResults(false);
      return;
    }

    noResultsTimerRef.current = setTimeout(() => setShowNoResults(true), 600);
    return () => { if (noResultsTimerRef.current) clearTimeout(noResultsTimerRef.current); };
  }, [value, results]);

  function handleInputChange(input) {
    setValue(input);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (input.length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const { data: dbResults } = await supabase
          .from('providers')
          .select('id, name, city, state, slug, google_place_id, address, phone, website, provider_type, lat, lng')
          .ilike('name', `%${input}%`)
          .or('is_active.eq.true,is_active.is.null')
          .order('google_rating', { ascending: false, nullsFirst: false })
          .limit(5);

        let mapboxResults = [];
        if (MAPBOX_TOKEN) {
          try {
            const res = await fetch(
              `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(input)}.json` +
              `?types=poi&country=US&limit=5&access_token=${MAPBOX_TOKEN}`
            );
            if (res.ok) {
              const data = await res.json();
              mapboxResults = (data.features || []).map((f) => ({
                id: null,
                name: f.text || '',
                address: f.properties?.address || f.place_name?.split(',')[0] || '',
                city: f.context?.find((c) => c.id.startsWith('place'))?.text || '',
                state: f.context?.find((c) => c.id.startsWith('region'))?.short_code?.replace('US-', '') || '',
                zip: f.context?.find((c) => c.id.startsWith('postcode'))?.text || '',
                lat: f.center?.[1] || null,
                lng: f.center?.[0] || null,
                phone: null,
                website: null,
                provider_type: null,
                source: 'mapbox',
                _mapboxId: f.id,
              }));
            }
          } catch { /* Mapbox unavailable — DB results only */ }
        }

        const dbNames = new Set((dbResults || []).map((r) => r.name.toLowerCase().trim()));
        const uniqueMapbox = mapboxResults.filter((r) => !dbNames.has(r.name.toLowerCase().trim()));

        const merged = [
          ...(dbResults || []).map((r) => ({ ...r, source: 'database' })),
          ...uniqueMapbox,
        ].slice(0, 8);

        setResults(merged);
      } catch {
        setResults([]);
      }
    }, 200);
  }

  function handleSelect(result) {
    setValue(result.name);
    setResults([]);

    if (result.source === 'database') {
      onSelect({
        name: result.name,
        formattedAddress: result.address || [result.city, result.state].filter(Boolean).join(', '),
        address: result.address || '',
        city: result.city || '',
        state: result.state || '',
        zipCode: result.zip_code || '',
        phone: result.phone || '',
        website: result.website || '',
        placeId: result.google_place_id || '',
        lat: result.lat || null,
        lng: result.lng || null,
        _providerSlug: result.slug,
        _providerId: result.id,
      });
    } else {
      onSelect({
        name: result.name,
        formattedAddress: [result.address, result.city, result.state].filter(Boolean).join(', '),
        address: result.address || '',
        city: result.city || '',
        state: result.state || '',
        zipCode: result.zip || '',
        phone: '',
        website: '',
        placeId: '',
        lat: result.lat || null,
        lng: result.lng || null,
        _source: 'mapbox',
      });
    }
  }

  function handleClear() {
    setValue('');
    setResults([]);
    setExistingProvider(null);
    onClear();
  }

  if (selectedPlace) {
    return (
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Provider / Clinic <span className="text-rose-accent">*</span>
        </label>
        <div className="bg-white border border-verified/30 rounded-xl p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex-shrink-0">
                <CheckCircle size={18} className="text-verified" />
              </div>
              <div>
                <p className="font-semibold text-text-primary text-sm">
                  {selectedPlace.name}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {selectedPlace.formattedAddress}
                </p>
                {selectedPlace.phone && (
                  <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-1">
                    <Phone size={10} />
                    {selectedPlace.phone}
                  </p>
                )}
                {selectedPlace.website && (
                  <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-1">
                    <ExternalLink size={10} />
                    <a
                      href={selectedPlace.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-rose-accent transition-colors truncate max-w-[200px]"
                    >
                      {selectedPlace.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </a>
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-text-secondary hover:text-text-primary rounded-lg hover:bg-gray-100 transition"
              aria-label="Clear selection"
            >
              <X size={16} />
            </button>
          </div>

          {existingProvider && existingProvider.submissionCount > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <Link
                to={`/provider/${existingProvider.slug}`}
                className="text-xs text-rose-accent hover:text-rose-dark transition-colors font-medium"
              >
                {existingProvider.submissionCount} people have logged prices
                here — see what they paid
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-text-primary mb-1.5">
        Provider / Clinic <span className="text-rose-accent">*</span>
      </label>
      <div className="relative">
        <MapPin
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder="Search for your provider..."
          className={INPUT_CLASSES}
        />
        {value.length >= 2 && (
          <button
            type="button"
            onClick={() => {
              setValue('');
              setResults([]);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-0.5"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {results.length > 0 && (
        <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-72 overflow-y-auto">
          {results.map((result, i) => {
            const isDb = result.source === 'database';
            return (
              <li key={isDb ? result.id : `mapbox-${result._mapboxId || i}`}>
                <button
                  type="button"
                  onClick={() => handleSelect(result)}
                  className="w-full text-left px-4 py-3 hover:bg-rose-light/50 transition-colors flex items-start gap-3"
                >
                  <span
                    className={`mt-1.5 flex-shrink-0 block w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${
                      isDb ? 'bg-rose-accent' : 'bg-gray-400'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-text-primary font-medium block truncate">
                      {result.name}
                    </span>
                    <span className="text-xs text-text-secondary block truncate">
                      {isDb
                        ? [result.city, result.state].filter(Boolean).join(', ') +
                          (result.provider_type ? ` · ${result.provider_type}` : '')
                        : result.address || [result.city, result.state].filter(Boolean).join(', ')}
                    </span>
                    <span className={`text-[11px] font-medium mt-0.5 block ${
                      isDb ? 'text-verified' : 'text-text-secondary'
                    }`}>
                      {isDb ? '✓ Already listed' : '+ Add to GlowBuddy'}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {showNoResults && results.length === 0 && (
        <div className="mt-2 px-1">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="w-full text-left text-sm text-text-secondary hover:text-rose-accent transition-colors"
          >
            We don&apos;t have <span className="font-medium text-text-primary">{value.trim()}</span> yet.{' '}
            <span className="text-rose-accent font-medium inline-flex items-center gap-0.5">
              Add it and log your price <Plus size={12} />
            </span>
          </button>
        </div>
      )}

      {showAddModal && (
        <AddProviderModal
          initialName={value.trim()}
          onClose={() => setShowAddModal(false)}
          onSuccess={(provider) => {
            setShowAddModal(false);
            setShowNoResults(false);
            setValue(provider.name);
            onSelect({
              name: provider.name,
              formattedAddress: [provider.city, provider.state].filter(Boolean).join(', '),
              address: '',
              city: provider.city,
              state: provider.state,
              zipCode: '',
              phone: '',
              website: '',
              placeId: '',
              lat: null,
              lng: null,
              _userSubmittedProviderId: provider.id,
            });
          }}
        />
      )}
    </div>
  );
}

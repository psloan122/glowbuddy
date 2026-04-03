import { useState, useRef, useEffect, useCallback } from 'react';
import usePlacesAutocomplete, {
  getDetails,
} from 'use-places-autocomplete';
import { MapPin, X, CheckCircle, ExternalLink, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { extractPlaceData } from '../lib/places';
import { supabase } from '../lib/supabase';

const INPUT_CLASSES =
  'w-full px-4 py-3 pl-10 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition';

export default function PlacesSearch({ onSelect, onClear, selectedPlace }) {
  const wrapperRef = useRef(null);
  const [existingProvider, setExistingProvider] = useState(null);

  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      types: ['establishment'],
      componentRestrictions: { country: 'us' },
    },
    debounce: 300,
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        clearSuggestions();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [clearSuggestions]);

  // Check if selected place already exists in providers table
  useEffect(() => {
    if (!selectedPlace?.placeId) {
      setExistingProvider(null);
      return;
    }

    async function checkExisting() {
      const { data: provider } = await supabase
        .from('providers')
        .select('slug, id')
        .eq('google_place_id', selectedPlace.placeId)
        .maybeSingle();

      if (provider) {
        // Count submissions
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
  }, [selectedPlace?.placeId]);

  const handleSelect = useCallback(
    async (suggestion) => {
      setValue(suggestion.description, false);
      clearSuggestions();

      try {
        const details = await getDetails({
          placeId: suggestion.place_id,
          fields: [
            'name',
            'address_components',
            'formatted_address',
            'formatted_phone_number',
            'website',
            'place_id',
            'geometry',
          ],
        });

        const placeData = extractPlaceData(details);
        onSelect(placeData);
      } catch (err) {
        console.error('Places detail error:', err);
        // Fallback: use what we have from the suggestion
        onSelect({
          name: suggestion.structured_formatting?.main_text || suggestion.description,
          formattedAddress: suggestion.description,
          city: '',
          state: '',
          zipCode: '',
          address: suggestion.description,
          phone: '',
          website: '',
          placeId: suggestion.place_id,
          lat: null,
          lng: null,
        });
      }
    },
    [setValue, clearSuggestions, onSelect]
  );

  function handleClear() {
    setValue('');
    clearSuggestions();
    setExistingProvider(null);
    onClear();
  }

  // If a place is already selected, show the confirmed card
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

          {/* Existing provider banner */}
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

        <p className="text-[10px] text-text-secondary/50 mt-1.5">
          Powered by Google
        </p>
      </div>
    );
  }

  // Search input
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
          onChange={(e) => setValue(e.target.value)}
          disabled={!ready}
          placeholder="Search clinic or spa name..."
          className={INPUT_CLASSES}
        />
        {value.length >= 2 && (
          <button
            type="button"
            onClick={() => {
              setValue('');
              clearSuggestions();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-0.5"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {status === 'OK' && data.length > 0 && (
        <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {data.map((suggestion) => (
            <li key={suggestion.place_id}>
              <button
                type="button"
                onClick={() => handleSelect(suggestion)}
                className="w-full text-left px-4 py-3 hover:bg-rose-light/50 transition-colors flex items-start gap-3"
              >
                <MapPin
                  size={14}
                  className="text-text-secondary mt-0.5 flex-shrink-0"
                />
                <div>
                  <span className="text-sm text-text-primary font-medium block">
                    {suggestion.structured_formatting?.main_text}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {suggestion.structured_formatting?.secondary_text}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[10px] text-text-secondary/50 mt-1.5">
        Powered by Google
      </p>
    </div>
  );
}

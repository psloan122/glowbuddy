import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { PROVIDER_TYPES, US_STATES } from '../../lib/constants';
import PlacesSearch from '../PlacesSearch';

const INPUT_CLASSES =
  'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition';

export default function Step2({ formData, setFormData }) {
  // Reactive check: detect Google Maps even if it loads after mount
  const [hasPlaces, setHasPlaces] = useState(
    () => !!window.google?.maps?.places
  );

  useEffect(() => {
    if (hasPlaces) return;
    const interval = setInterval(() => {
      if (window.google?.maps?.places) {
        setHasPlaces(true);
        clearInterval(interval);
      }
    }, 200);
    return () => clearInterval(interval);
  }, [hasPlaces]);
  const [selectedPlace, setSelectedPlace] = useState(
    formData.googlePlaceId
      ? {
          name: formData.providerName,
          formattedAddress: formData.providerAddress || '',
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          phone: formData.providerPhone || '',
          website: formData.providerWebsite || '',
          placeId: formData.googlePlaceId,
        }
      : null
  );

  // Fallback state for when Places API is not available
  const [providerSuggestions, setProviderSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  // Close dropdown on outside click (fallback mode)
  useEffect(() => {
    if (hasPlaces) return;
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fallback autocomplete from Supabase
  useEffect(() => {
    if (hasPlaces) return;
    async function fetchProviders() {
      if (formData.providerName.length < 2) {
        setProviderSuggestions([]);
        return;
      }

      const { data } = await supabase
        .from('providers')
        .select('name, city, state')
        .ilike('name', `%${formData.providerName}%`)
        .limit(8);

      setProviderSuggestions(data || []);
      setShowSuggestions(true);
    }

    const timeout = setTimeout(fetchProviders, 300);
    return () => clearTimeout(timeout);
  }, [formData.providerName]);

  function selectFallbackProvider(provider) {
    setFormData((prev) => ({
      ...prev,
      providerName: provider.name,
      city: provider.city || prev.city,
      state: provider.state || prev.state,
    }));
    setShowSuggestions(false);
  }

  function handlePlaceSelect(placeData) {
    setSelectedPlace(placeData);
    setFormData((prev) => ({
      ...prev,
      providerName: placeData.name,
      providerAddress: placeData.address || placeData.formattedAddress,
      city: placeData.city || prev.city,
      state: placeData.state || prev.state,
      zipCode: placeData.zipCode || prev.zipCode,
      providerPhone: placeData.phone || '',
      providerWebsite: placeData.website || '',
      googlePlaceId: placeData.placeId || '',
      lat: placeData.lat,
      lng: placeData.lng,
    }));
  }

  function handlePlaceClear() {
    setSelectedPlace(null);
    setFormData((prev) => ({
      ...prev,
      providerName: '',
      providerAddress: '',
      city: '',
      state: '',
      zipCode: '',
      providerPhone: '',
      providerWebsite: '',
      googlePlaceId: '',
      lat: null,
      lng: null,
    }));
  }

  return (
    <div>
      <h2 className="text-xl font-bold text-text-primary mb-1">
        Where did you go?
      </h2>
      <p className="text-sm text-text-secondary mb-6">
        Tell us about the provider.
      </p>

      <div className="space-y-5">
        {/* Provider search — Google Places or fallback */}
        {hasPlaces ? (
          <div className="relative">
            <PlacesSearch
              onSelect={handlePlaceSelect}
              onClear={handlePlaceClear}
              selectedPlace={selectedPlace}
            />
          </div>
        ) : (
          <div ref={wrapperRef} className="relative">
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Provider Name <span className="text-rose-accent">*</span>
            </label>
            <input
              type="text"
              placeholder="Clinic or provider name"
              value={formData.providerName}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  providerName: e.target.value,
                }))
              }
              onFocus={() => {
                if (providerSuggestions.length > 0) setShowSuggestions(true);
              }}
              className={INPUT_CLASSES}
            />
            {showSuggestions && providerSuggestions.length > 0 && (
              <ul className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {providerSuggestions.map((provider, i) => (
                  <li key={`${provider.name}-${i}`}>
                    <button
                      type="button"
                      onClick={() => selectFallbackProvider(provider)}
                      className="w-full text-left px-4 py-2.5 hover:bg-rose-light/50 transition-colors"
                    >
                      <span className="text-sm text-text-primary font-medium">
                        {provider.name}
                      </span>
                      {provider.city && provider.state && (
                        <span className="text-xs text-text-secondary ml-2">
                          {provider.city}, {provider.state}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Provider type — always manual */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Provider Type
          </label>
          <select
            value={formData.providerType}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                providerType: e.target.value,
              }))
            }
            className={INPUT_CLASSES}
          >
            <option value="">Select type (optional)</option>
            {PROVIDER_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* City — auto-filled by Places, editable */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            City <span className="text-rose-accent">*</span>
          </label>
          <input
            type="text"
            placeholder="City or town"
            value={formData.city}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, city: e.target.value }))
            }
            className={INPUT_CLASSES}
          />
        </div>

        {/* State — auto-filled by Places, editable */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            State <span className="text-rose-accent">*</span>
          </label>
          <select
            value={formData.state}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, state: e.target.value }))
            }
            className={INPUT_CLASSES}
          >
            <option value="">Select state</option>
            {US_STATES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Zip code — auto-filled by Places, editable */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Zip Code
          </label>
          <input
            type="text"
            placeholder="12345"
            maxLength={5}
            value={formData.zipCode}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 5);
              setFormData((prev) => ({ ...prev, zipCode: val }));
            }}
            className={INPUT_CLASSES}
          />
        </div>

        {/* Date of treatment */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Date of Treatment
          </label>
          <input
            type="date"
            value={formData.treatmentDate}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                treatmentDate: e.target.value,
              }))
            }
            className={INPUT_CLASSES}
          />
        </div>
      </div>
    </div>
  );
}

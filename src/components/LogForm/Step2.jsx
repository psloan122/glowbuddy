import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { PROVIDER_TYPES, US_STATES } from '../../lib/constants';

const INPUT_CLASSES =
  'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition';

export default function Step2({ formData, setFormData }) {
  const [providerSuggestions, setProviderSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Autocomplete provider name
  useEffect(() => {
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

  function selectProvider(provider) {
    setFormData((prev) => ({
      ...prev,
      providerName: provider.name,
      city: provider.city || prev.city,
      state: provider.state || prev.state,
    }));
    setShowSuggestions(false);
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
        {/* Provider name with autocomplete */}
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
                    onClick={() => selectProvider(provider)}
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

        {/* Provider type */}
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

        {/* City */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            City <span className="text-rose-accent">*</span>
          </label>
          <input
            type="text"
            placeholder="City"
            value={formData.city}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, city: e.target.value }))
            }
            className={INPUT_CLASSES}
          />
        </div>

        {/* State */}
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

        {/* Zip code */}
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

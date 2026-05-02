import { useState } from 'react';
import { PROVIDER_TYPES, US_STATES } from '../../lib/constants';
import PlacesSearch from '../PlacesSearch';

const INPUT_CLASSES =
  'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition';

export default function Step2({ formData, setFormData, prefilledProvider }) {
  const [selectedPlace, setSelectedPlace] = useState(() => {
    if (prefilledProvider) {
      return {
        name: prefilledProvider.name || formData.providerName,
        formattedAddress: prefilledProvider.address || formData.providerAddress || '',
        city: prefilledProvider.city || formData.city,
        state: prefilledProvider.state || formData.state,
        zipCode: prefilledProvider.zip_code || formData.zipCode,
        phone: prefilledProvider.phone || formData.providerPhone || '',
        website: prefilledProvider.website || formData.providerWebsite || '',
        placeId: prefilledProvider.google_place_id || formData.googlePlaceId,
      };
    }
    if (formData.googlePlaceId) {
      return {
        name: formData.providerName,
        formattedAddress: formData.providerAddress || '',
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        phone: formData.providerPhone || '',
        website: formData.providerWebsite || '',
        placeId: formData.googlePlaceId,
      };
    }
    if (formData.providerName && formData.city) {
      return {
        name: formData.providerName,
        formattedAddress: [formData.city, formData.state].filter(Boolean).join(', '),
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        phone: formData.providerPhone || '',
        website: formData.providerWebsite || '',
        placeId: '',
      };
    }
    return null;
  });

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
      userSubmittedProviderId: placeData._userSubmittedProviderId || null,
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
      userSubmittedProviderId: null,
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
        <div className="relative">
          <PlacesSearch
            onSelect={handlePlaceSelect}
            onClear={handlePlaceClear}
            selectedPlace={selectedPlace}
          />
        </div>

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

        {/* City — auto-filled by search, editable */}
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

        {/* State — auto-filled by search, editable */}
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

        {/* Zip code — auto-filled by search, editable */}
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

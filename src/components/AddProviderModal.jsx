import { useState, useEffect, useContext } from 'react';
import { X, Building2, CheckCircle, Loader2, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';
import { US_STATES } from '../lib/constants';
import { providerSlugFromParts } from '../lib/slugify';
import { loadGoogleMaps } from '../lib/loadGoogleMaps';
import { extractPlaceData } from '../lib/places';

const INPUT_CLASS =
  'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm';

export default function AddProviderModal({ initialName = '', onSuccess, onClose }) {
  const { user } = useContext(AuthContext);

  const [name, setName] = useState(initialName);
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [website, setWebsite] = useState('');
  const [googleMapsLink, setGoogleMapsLink] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [selectedFromGoogle, setSelectedFromGoogle] = useState(false);
  const [placeData, setPlaceData] = useState(null);
  const [manualMode, setManualMode] = useState(false);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Google Places Autocomplete — initialized once in the search input
  const searchInputRef = useState(null)[1]; // just need the setter
  const acRef = { current: null };

  function initAutocomplete(inputEl) {
    if (!inputEl || acRef.current) return;
    const places = window.google?.maps?.places;
    if (!places?.Autocomplete) {
      // Try loading if not ready
      loadGoogleMaps().catch(() => {});
      return;
    }
    acRef.current = new places.Autocomplete(inputEl, {
      types: ['establishment'],
      componentRestrictions: { country: 'us' },
      fields: [
        'name', 'formatted_address', 'address_components', 'geometry',
        'place_id', 'formatted_phone_number', 'website', 'rating',
        'user_ratings_total', 'opening_hours', 'url', 'types',
      ],
    });
    acRef.current.addListener('place_changed', () => {
      const place = acRef.current.getPlace();
      if (!place?.geometry?.location) return;
      const data = extractPlaceData(place);
      setPlaceData(data);
      setSelectedFromGoogle(true);
      setName(data.name);
      setCity(data.city);
      setState(data.state);
      setWebsite(data.website || '');
      setGoogleMapsLink(data.googleMapsUrl || '');
    });
  }

  const canSubmit = name.trim().length >= 2 && city.trim().length >= 2 && state;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    setError('');

    try {
      let slug = providerSlugFromParts(name.trim(), city.trim(), state);

      // Check uniqueness
      const { data: existing } = await supabase
        .from('providers')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (existing) {
        slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
      }

      const insertRow = {
        name: name.trim(),
        city: city.trim(),
        state,
        slug,
        website: website.trim() || null,
        google_maps_url: googleMapsLink.trim() || null,
        is_active: true,
        is_claimed: false,
        is_verified: false,
        tier: 'free',
        verification_method: 'user_submitted',
        submitted_by_user: user?.id || null,
        source: selectedFromGoogle ? 'user_suggested_google' : 'user_suggested',
      };

      // Enrich with Google Places data when available
      if (placeData) {
        insertRow.google_place_id = placeData.placeId || null;
        insertRow.address = placeData.address || null;
        insertRow.phone = placeData.phone || null;
        insertRow.lat = placeData.lat;
        insertRow.lng = placeData.lng;
        insertRow.google_rating = placeData.googleRating;
        insertRow.google_review_count = placeData.googleReviewCount;
        insertRow.hours_text = placeData.hoursText || null;

      }

      const { data: provider, error: insertError } = await supabase
        .from('providers')
        .insert(insertRow)
        .select('id, name, city, state, slug')
        .single();

      if (insertError) {
        setError(insertError.message);
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess(provider);
      }, 800);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 mt-20 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-rose-accent" />
            <h2 className="text-lg font-bold text-text-primary">
              Add a Provider
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {success ? (
          <div className="text-center py-6">
            <CheckCircle size={40} className="text-verified mx-auto mb-3" />
            <p className="font-semibold text-text-primary">
              {name.trim()} added!
            </p>
            <p className="text-sm text-text-secondary mt-1">
              Continuing...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-text-secondary -mt-2 mb-1">
              Search for the business to autofill details from Google.
            </p>

            {/* Google Places search input */}
            {!manualMode && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Search for a business <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input
                    ref={(el) => { if (el) initAutocomplete(el); }}
                    type="text"
                    defaultValue={initialName}
                    placeholder="Type a med spa name..."
                    autoFocus
                    autoComplete="off"
                    className={`${INPUT_CLASS} pl-10`}
                  />
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  Select from the dropdown to autofill all details
                </p>
              </div>
            )}

            {/* Autofill badge */}
            {selectedFromGoogle && (
              <div className="flex items-center gap-2 px-3 py-2 bg-verified/10 rounded-lg">
                <CheckCircle size={14} className="text-verified" />
                <span className="text-xs font-medium text-verified">Details filled from Google</span>
              </div>
            )}

            {/* Editable fields — shown after Google select OR in manual mode */}
            {(selectedFromGoogle || manualMode) && (
              <>
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Business Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Glow Aesthetics"
                    required
                    className={INPUT_CLASS}
                  />
                </div>

                {/* City + State row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      City <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Los Angeles"
                      required
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">
                      State <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      required
                      className={INPUT_CLASS}
                    >
                      <option value="">...</option>
                      {US_STATES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.value}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Website (optional) */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Website{' '}
                    <span className="text-text-secondary font-normal">(optional)</span>
                  </label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                    className={INPUT_CLASS}
                  />
                </div>
              </>
            )}

            {/* Manual entry fallback */}
            {!selectedFromGoogle && !manualMode && (
              <button
                type="button"
                onClick={() => setManualMode(true)}
                className="text-sm text-text-secondary underline"
              >
                Can't find them? Enter manually &rarr;
              </button>
            )}

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="w-full bg-rose-accent text-white py-3 rounded-full font-semibold hover:bg-rose-dark transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Adding...
                </>
              ) : (
                'Add & continue logging price \u2192'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

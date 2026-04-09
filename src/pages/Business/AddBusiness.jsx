import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  Star,
  ChevronLeft,
  CheckCircle,
  Loader2,
  Building2,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AuthContext } from '../../App';
import { PROVIDER_TYPES, US_STATES } from '../../lib/constants';
import { providerSlugFromParts } from '../../lib/slugify';
import { loadGoogleMaps } from '../../lib/loadGoogleMaps';
import { extractPlaceData } from '../../lib/places';
import {
  signUpWithPassword,
  signInWithPassword,
  signInWithGoogle,
  getAuthErrorMessage,
} from '../../lib/auth';

const INPUT_CLASS =
  'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition';

export default function AddBusiness() {
  const { user, showToast } = useContext(AuthContext);
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  // Step 1 — Google Places search
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const autocompleteRef = useRef(null);
  const placesServiceRef = useRef(null);
  const debounceRef = useRef(null);

  // Step 2 — Confirm details
  const [details, setDetails] = useState({
    name: '',
    provider_type: 'Med Spa (Physician-Owned)',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    website: '',
    googleMapsUrl: '',
    placeId: '',
    googleRating: null,
    googleReviewCount: null,
    lat: null,
    lng: null,
  });
  const [ownerConfirmed, setOwnerConfirmed] = useState(false);

  // Step 3 — Auth
  const [authMode, setAuthMode] = useState('signup'); // 'signup' | 'signin'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Step 4 — Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.title = 'Add Your Business | GlowBuddy';
  }, []);

  // Load Google Maps on mount
  useEffect(() => {
    loadGoogleMaps()
      .then(() => {
        const mapDiv = document.createElement('div');
        placesServiceRef.current = new window.google.maps.places.PlacesService(mapDiv);
        autocompleteRef.current = new window.google.maps.places.AutocompleteService();
      })
      .catch(() => {});
  }, []);

  // Auto-advance to step 4 if user logs in during step 3
  useEffect(() => {
    if (user && step === 3) {
      setStep(4);
    }
  }, [user, step]);

  // Debounced Google Places autocomplete
  const searchPlaces = useCallback((input) => {
    if (!input.trim() || !autocompleteRef.current) {
      setPredictions([]);
      return;
    }

    setSearching(true);
    autocompleteRef.current.getPlacePredictions(
      {
        input,
        types: ['establishment'],
        componentRestrictions: { country: 'us' },
      },
      (results, status) => {
        setSearching(false);
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          results
        ) {
          setPredictions(results);
        } else {
          setPredictions([]);
        }
      },
    );
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPlaces(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchPlaces]);

  // Select a Places prediction → get full details
  function handleSelectPlace(prediction) {
    if (!placesServiceRef.current) return;

    placesServiceRef.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: [
          'name',
          'formatted_address',
          'address_components',
          'formatted_phone_number',
          'website',
          'geometry',
          'rating',
          'user_ratings_total',
          'url',
          'place_id',
          'types',
        ],
      },
      (place, status) => {
        if (
          status !== window.google.maps.places.PlacesServiceStatus.OK ||
          !place
        )
          return;

        const data = extractPlaceData(place);
        setDetails({
          name: data.name,
          provider_type: 'Med Spa (Physician-Owned)',
          address: data.address,
          city: data.city,
          state: data.state,
          zip: data.zipCode,
          phone: data.phone,
          website: data.website,
          googleMapsUrl: data.googleMapsUrl || '',
          placeId: data.placeId,
          googleRating: data.googleRating,
          googleReviewCount: data.googleReviewCount,
          lat: data.lat,
          lng: data.lng,
        });
        setStep(2);
      },
    );
  }

  // Manual entry → advance to step 2
  function handleManualContinue(e) {
    e.preventDefault();
    setStep(2);
  }

  function updateDetail(field, value) {
    setDetails((prev) => ({ ...prev, [field]: value }));
  }

  // Step 2 → Step 3 or 4
  function handleConfirm() {
    if (user) {
      setStep(4);
    } else {
      setStep(3);
    }
  }

  // Step 3 auth handlers
  async function handleAuthSubmit(e) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    let result;
    if (authMode === 'signup') {
      result = await signUpWithPassword(authEmail, authPassword);
    } else {
      result = await signInWithPassword(authEmail, authPassword);
    }

    if (result.error) {
      setAuthError(getAuthErrorMessage(result.error));
      setAuthLoading(false);
      return;
    }

    setAuthLoading(false);
    // Auth state change listener in App.jsx will update `user`,
    // which triggers the useEffect above to advance to step 4
  }

  async function handleGoogleAuth() {
    setAuthLoading(true);
    setAuthError('');
    // Store intent so we can resume after redirect
    sessionStorage.setItem(
      'gb_pending_action',
      JSON.stringify({ path: '/business/add' }),
    );
    const { error } = await signInWithGoogle();
    if (error) {
      setAuthError(getAuthErrorMessage(error));
      setAuthLoading(false);
    }
  }

  // Step 4 — auto-submit
  useEffect(() => {
    if (step !== 4 || !user || submitting || submitted) return;

    async function submit() {
      setSubmitting(true);
      setSubmitError('');

      try {
        // Generate slug
        let slug = providerSlugFromParts(
          details.name,
          details.city,
          details.state,
        );

        // Check uniqueness
        const { data: existing } = await supabase
          .from('providers')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();

        if (existing) {
          const suffix = Math.random().toString(36).slice(2, 6);
          slug = `${slug}-${suffix}`;
        }

        // Insert provider
        const { error: insertError } = await supabase.from('providers').insert({
          name: details.name,
          provider_type: details.provider_type,
          address: details.address,
          city: details.city,
          state: details.state,
          zip: details.zip,
          phone: details.phone || null,
          website: details.website || null,
          google_maps_url: details.googleMapsUrl || null,
          google_place_id: details.placeId || null,
          google_rating: details.googleRating,
          google_review_count: details.googleReviewCount,
          lat: details.lat,
          lng: details.lng,
          slug,
          owner_user_id: user.id,
          is_active: false,
          is_claimed: true,
          tier: 'free',
          verification_method: 'self_submitted',
        });

        if (insertError) {
          setSubmitError(insertError.message);
          setSubmitting(false);
          return;
        }

        // Sync user role
        await supabase.auth.updateUser({ data: { user_role: 'provider' } });
        await supabase
          .from('profiles')
          .upsert(
            { user_id: user.id, role: 'provider' },
            { onConflict: 'user_id' },
          );

        setSubmitting(false);
        setSubmitted(true);
      } catch (err) {
        setSubmitError('Something went wrong. Please try again.');
        setSubmitting(false);
      }
    }

    submit();
  }, [step, user, submitting, submitted]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Step indicator ──
  function StepIndicator() {
    return (
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${
                n < step
                  ? 'bg-verified text-white'
                  : n === step
                    ? 'bg-rose-accent text-white'
                    : 'bg-gray-100 text-text-secondary'
              }`}
            >
              {n < step ? <CheckCircle size={16} /> : n}
            </div>
            {n < 4 && (
              <div
                className={`w-8 h-0.5 ${
                  n < step ? 'bg-verified' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  // ── Step 1: Google Places Search ──
  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <StepIndicator />

        <div className="text-center mb-8">
          <Building2 size={40} className="text-rose-accent mx-auto mb-3" />
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Add Your Business
          </h1>
          <p className="text-text-secondary">
            Search for your business to get started. We'll pre-fill your details
            from Google.
          </p>
        </div>

        {!showManual ? (
          <>
            <div className="relative mb-4">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
              />
              <input
                type="text"
                placeholder="Search your business name + city..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={INPUT_CLASS + ' pl-10'}
                autoFocus
              />
              {searching && (
                <Loader2
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary animate-spin"
                />
              )}
            </div>

            {predictions.length > 0 && (
              <div className="space-y-2 mb-6">
                {predictions.map((p) => (
                  <button
                    key={p.place_id}
                    onClick={() => handleSelectPlace(p)}
                    className="w-full text-left glow-card p-4 hover:border-rose-accent/40 hover:shadow-sm transition cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <MapPin
                        size={18}
                        className="text-rose-accent mt-0.5 shrink-0"
                      />
                      <div>
                        <p className="font-semibold text-text-primary">
                          {p.structured_formatting?.main_text}
                        </p>
                        <p className="text-sm text-text-secondary">
                          {p.structured_formatting?.secondary_text}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="text-center">
              <button
                onClick={() => setShowManual(true)}
                className="text-sm text-rose-accent hover:text-rose-dark transition font-medium"
              >
                Not finding it? Add manually &rarr;
              </button>
            </div>
          </>
        ) : (
          <div className="glow-card p-6">
            <h2 className="text-lg font-bold text-text-primary mb-4">
              Enter Your Business Details
            </h2>
            <form onSubmit={handleManualContinue} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Business Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={details.name}
                  onChange={(e) => updateDetail('name', e.target.value)}
                  required
                  placeholder="e.g. Glow Aesthetics"
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={details.address}
                  onChange={(e) => updateDetail('address', e.target.value)}
                  required
                  placeholder="123 Main St"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    City <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={details.city}
                    onChange={(e) => updateDetail('city', e.target.value)}
                    required
                    placeholder="Los Angeles"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    State <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={details.state}
                    onChange={(e) => updateDetail('state', e.target.value)}
                    required
                    className={INPUT_CLASS}
                  >
                    <option value="">Select...</option>
                    {US_STATES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Zip <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={details.zip}
                    onChange={(e) => updateDetail('zip', e.target.value)}
                    required
                    placeholder="90001"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Phone{' '}
                    <span className="text-text-secondary font-normal">
                      (optional)
                    </span>
                  </label>
                  <input
                    type="tel"
                    value={details.phone}
                    onChange={(e) => updateDetail('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Website{' '}
                    <span className="text-text-secondary font-normal">
                      (optional)
                    </span>
                  </label>
                  <input
                    type="url"
                    value={details.website}
                    onChange={(e) => updateDetail('website', e.target.value)}
                    placeholder="https://yoursite.com"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="bg-rose-accent text-white px-6 py-3 rounded-full font-semibold hover:bg-rose-dark transition"
                >
                  Continue
                </button>
                <button
                  type="button"
                  onClick={() => setShowManual(false)}
                  className="text-text-secondary hover:text-text-primary transition text-sm"
                >
                  Back to search
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // ── Step 2: Confirm Details ──
  if (step === 2) {
    const canContinue =
      details.name.trim() &&
      details.provider_type &&
      details.city.trim() &&
      details.state &&
      ownerConfirmed;

    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <StepIndicator />

        <button
          onClick={() => setStep(1)}
          className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition mb-6"
        >
          <ChevronLeft size={16} /> Back
        </button>

        <h1 className="text-2xl font-bold text-text-primary mb-1">
          Confirm Your Details
        </h1>
        <p className="text-text-secondary mb-6">
          Review and edit your business information before submitting.
        </p>

        <div className="glow-card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Business Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={details.name}
              onChange={(e) => updateDetail('name', e.target.value)}
              required
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Provider Type <span className="text-red-400">*</span>
            </label>
            <select
              value={details.provider_type}
              onChange={(e) => updateDetail('provider_type', e.target.value)}
              required
              className={INPUT_CLASS}
            >
              <option value="">Select type...</option>
              {PROVIDER_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Address
            </label>
            <input
              type="text"
              value={details.address}
              onChange={(e) => updateDetail('address', e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                City <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={details.city}
                onChange={(e) => updateDetail('city', e.target.value)}
                required
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                State <span className="text-red-400">*</span>
              </label>
              <select
                value={details.state}
                onChange={(e) => updateDetail('state', e.target.value)}
                required
                className={INPUT_CLASS}
              >
                <option value="">Select...</option>
                {US_STATES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Zip
              </label>
              <input
                type="text"
                value={details.zip}
                onChange={(e) => updateDetail('zip', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={details.phone}
                onChange={(e) => updateDetail('phone', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Website
              </label>
              <input
                type="url"
                value={details.website}
                onChange={(e) => updateDetail('website', e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          {details.googleMapsUrl && (
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                Google Maps URL
              </label>
              <input
                type="text"
                value={details.googleMapsUrl}
                readOnly
                className={INPUT_CLASS + ' bg-gray-50 text-text-secondary'}
              />
            </div>
          )}

          {/* Google rating badge */}
          {details.googleRating && (
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Star size={14} className="text-amber-400 fill-amber-400" />
              <span>
                {details.googleRating} ({details.googleReviewCount} reviews on
                Google)
              </span>
            </div>
          )}

          {/* Owner confirmation checkbox */}
          <label className="flex items-start gap-3 pt-4 border-t border-gray-100 cursor-pointer">
            <input
              type="checkbox"
              checked={ownerConfirmed}
              onChange={(e) => setOwnerConfirmed(e.target.checked)}
              className="mt-1 w-4 h-4 text-rose-accent border-gray-300 rounded focus:ring-rose-accent"
            />
            <span className="text-sm text-text-primary">
              I am the owner or authorized representative of this business.
            </span>
          </label>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={handleConfirm}
            disabled={!canContinue}
            className="bg-rose-accent text-white px-8 py-3 rounded-full font-semibold hover:bg-rose-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // ── Step 3: Auth ──
  if (step === 3) {
    return (
      <div className="max-w-md mx-auto px-4 py-12">
        <StepIndicator />

        <button
          onClick={() => setStep(2)}
          className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition mb-6"
        >
          <ChevronLeft size={16} /> Back
        </button>

        <div className="glow-card p-8">
          <h1 className="text-2xl font-bold text-text-primary mb-2 text-center">
            Create Your Account
          </h1>
          <p className="text-text-secondary text-center mb-6">
            Sign up or sign in to submit your listing.
          </p>

          {/* Google OAuth */}
          <button
            onClick={handleGoogleAuth}
            disabled={authLoading}
            className="w-full flex items-center justify-center gap-2 bg-white border-2 border-gray-200 text-text-primary px-6 py-3 rounded-full font-semibold hover:bg-gray-50 transition disabled:opacity-50 mb-4"
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-text-secondary">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Email/password form */}
          <form onSubmit={handleAuthSubmit} className="space-y-3">
            <input
              type="email"
              placeholder="Email address"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              required
              className={INPUT_CLASS}
            />
            <input
              type="password"
              placeholder="Password (min 6 characters)"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              required
              minLength={6}
              className={INPUT_CLASS}
            />

            {authError && (
              <p className="text-red-500 text-sm flex items-center gap-1.5">
                <AlertCircle size={14} />
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-rose-accent text-white px-6 py-3 rounded-full font-semibold hover:bg-rose-dark transition disabled:opacity-50"
            >
              {authLoading
                ? 'Please wait...'
                : authMode === 'signup'
                  ? 'Sign Up'
                  : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-text-secondary mt-4">
            {authMode === 'signup' ? (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => {
                    setAuthMode('signin');
                    setAuthError('');
                  }}
                  className="text-rose-accent font-medium hover:text-rose-dark"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                New to GlowBuddy?{' '}
                <button
                  onClick={() => {
                    setAuthMode('signup');
                    setAuthError('');
                  }}
                  className="text-rose-accent font-medium hover:text-rose-dark"
                >
                  Sign up
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  // ── Step 4: Submit + Success ──
  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <StepIndicator />

      {submitting && (
        <div className="glow-card p-8 text-center">
          <Loader2 size={40} className="text-rose-accent mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Submitting your listing...
          </h2>
          <p className="text-text-secondary">This will only take a moment.</p>
        </div>
      )}

      {submitError && !submitting && (
        <div className="glow-card p-8 text-center">
          <AlertCircle size={40} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Something went wrong
          </h2>
          <p className="text-red-500 text-sm mb-4">{submitError}</p>
          <button
            onClick={() => {
              setSubmitError('');
              setSubmitting(false);
              setSubmitted(false);
            }}
            className="bg-rose-accent text-white px-6 py-3 rounded-full font-semibold hover:bg-rose-dark transition"
          >
            Try Again
          </button>
        </div>
      )}

      {submitted && (
        <div className="glow-card p-8 text-center">
          <CheckCircle size={48} className="text-verified mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-text-primary mb-2">
            You're listed!
          </h2>
          <p className="text-text-secondary mb-6">
            Your listing for <strong>{details.name}</strong> has been submitted
            for review. We'll email you at{' '}
            <strong>{user?.email}</strong> once it's approved and live.
          </p>
          <button
            onClick={() => {
              navigate('/business/dashboard');
              showToast('Listing submitted for review!');
            }}
            className="bg-rose-accent text-white px-8 py-3 rounded-full font-semibold hover:bg-rose-dark transition"
          >
            Add your prices &rarr;
          </button>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Search, Building2, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AuthContext } from '../../App';
import { parseAddressComponents } from '../../lib/places';
import { slugify } from '../../lib/slugify';

const INPUT_CLASS =
  'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition';

export default function Claim() {
  const { session, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Auth state
  const [email, setEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // URL pre-fill params (from provider profile page claim CTA)
  const prefillParams = new URLSearchParams(location.search);
  const prefillId   = prefillParams.get('provider_id') || '';
  const prefillName = prefillParams.get('name') || '';
  const prefillCity = prefillParams.get('city') || '';

  // Search state — seed from URL params when present
  const [searchName, setSearchName] = useState(prefillName);
  const [searchCity, setSearchCity] = useState(prefillCity);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Claim state
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');


  const debounceRef = useRef(null);

  // Tier 2: Google Places fallback (lazy-loaded on demand)
  const [showGoogleSearch, setShowGoogleSearch] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleQuery, setGoogleQuery] = useState('');
  const [googleSuggestions, setGoogleSuggestions] = useState([]);
  const [googleError, setGoogleError] = useState('');
  const googleServiceRef  = useRef(null);
  const googleDetailsRef  = useRef(null);
  const googleTokenRef    = useRef(null);
  const googleDropdownRef = useRef(null);
  const googleDebRef      = useRef(null);

  useEffect(() => {
    document.title = 'Claim Your Listing | Know Before You Glow';
  }, []);

  // When arriving from a provider page with a provider_id param,
  // fetch that provider directly and show it in results so the user
  // doesn't have to search manually.
  useEffect(() => {
    if (!session || !prefillId) return;
    supabase
      .from('providers')
      .select('id, name, city, state, provider_type, google_place_id, is_claimed')
      .eq('id', prefillId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSearchResults([data]);
          setHasSearched(true);
        }
      });
  }, [session, prefillId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close Google suggestions on outside click
  useEffect(() => {
    if (!googleSuggestions.length) return;
    function handleClick(e) {
      if (googleDropdownRef.current && !googleDropdownRef.current.contains(e.target)) {
        setGoogleSuggestions([]);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [googleSuggestions.length]);

  // Debounced search
  const doSearch = useCallback(async (name, city) => {
    if (!name.trim() && !city.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setSearching(true);
    setHasSearched(true);

    let query = supabase
      .from('providers')
      .select('id, name, city, state, provider_type, google_place_id, is_claimed')
      .eq('is_active', true);

    if (name.trim()) {
      query = query.ilike('name', `%${name.trim()}%`);
    }
    if (city.trim()) {
      query = query.ilike('city', `${city.trim()}%`);
    }

    query = query.limit(10);

    const { data, error } = await query;

    if (error) {
      setSearchResults([]);
    } else {
      setSearchResults(data || []);
    }

    setSearching(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      doSearch(searchName, searchCity);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchName, searchCity, doSearch]);

  // Send magic link
  async function handleMagicLink(e) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    // Store destination so App.jsx's onAuthStateChange can redirect back
    // after the magic-link round trip (same tab AND new tab, same origin).
    sessionStorage.setItem('gb_pending_action', JSON.stringify({ path: '/business/claim' }));

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      sessionStorage.removeItem('gb_pending_action');
      setAuthError(error.message);
    } else {
      setMagicLinkSent(true);
    }

    setAuthLoading(false);
  }

  // Claim existing listing
  async function handleClaim(provider) {
    if (!user) return;

    setClaiming(true);
    setClaimError('');

    const { error: updateError } = await supabase
      .from('providers')
      .update({
        owner_user_id: user.id,
        is_claimed: true,
        is_verified: true,
        claimed_at: new Date().toISOString(),
        onboarding_completed: false,
      })
      .eq('id', provider.id);

    if (updateError) {
      setClaimError(updateError.message);
      setClaiming(false);
      return;
    }

    const { error: metaError } = await supabase.auth.updateUser({
      data: { user_role: 'provider' },
    });

    // metaError is non-blocking — role sync below still runs

    // Sync role to profiles table for DB-level checks
    await supabase.from('profiles').update({ role: 'provider' }).eq('user_id', user.id);

    setClaiming(false);
    navigate('/business/dashboard');
  }

  // Tier 2: lazy-load Google Maps SDK only when user explicitly requests it
  async function handleGoogleFallback() {
    setGoogleLoading(true);
    setGoogleError('');
    try {
      const { loadGoogleMaps } = await import('../../lib/loadGoogleMaps');
      await loadGoogleMaps();
      const places = window.google?.maps?.places;
      if (!places?.AutocompleteService) throw new Error('Places unavailable');
      googleServiceRef.current  = new places.AutocompleteService();
      const el = document.createElement('div');
      googleDetailsRef.current  = new places.PlacesService(el);
      googleTokenRef.current    = new places.AutocompleteSessionToken();
      setShowGoogleSearch(true);
    } catch {
      setGoogleError('Could not load Google Places. Try adding your business manually below.');
    }
    setGoogleLoading(false);
  }

  // Debounced Google Places autocomplete for business names
  function handleGoogleInput(input) {
    setGoogleQuery(input);
    if (googleDebRef.current) clearTimeout(googleDebRef.current);
    if (input.length < 2 || !googleServiceRef.current) { setGoogleSuggestions([]); return; }
    googleDebRef.current = setTimeout(() => {
      googleServiceRef.current.getPlacePredictions(
        {
          input,
          types: ['establishment'],
          componentRestrictions: { country: 'us' },
          sessionToken: googleTokenRef.current,
        },
        (predictions, status) => {
          const ok = window.google?.maps?.places?.PlacesServiceStatus?.OK;
          setGoogleSuggestions(status === ok && predictions ? predictions.slice(0, 6) : []);
        }
      );
    }, 300);
  }

  // Fetch full place details, check DB, then claim or create
  async function handleGoogleSelect(prediction) {
    setGoogleSuggestions([]);
    setClaiming(true);
    setClaimError('');

    const placeDetails = await new Promise((resolve) => {
      googleDetailsRef.current.getDetails(
        {
          placeId: prediction.place_id,
          fields: ['name', 'address_components', 'geometry', 'formatted_address', 'formatted_phone_number', 'website'],
          sessionToken: googleTokenRef.current,
        },
        (place, status) => {
          const places = window.google?.maps?.places;
          googleTokenRef.current = new places.AutocompleteSessionToken();
          resolve(status === places.PlacesServiceStatus.OK ? place : null);
        }
      );
    });

    if (!placeDetails) {
      setClaimError('Could not load place details. Please try again.');
      setClaiming(false);
      return;
    }

    const parsed = parseAddressComponents(placeDetails.address_components);

    // Check if this Google Place already exists in our DB
    const { data: existing } = await supabase
      .from('providers')
      .select('id, name, city, state, is_claimed')
      .eq('google_place_id', prediction.place_id)
      .maybeSingle();

    if (existing?.is_claimed) {
      setClaimError('This listing has already been claimed. Contact support if this is your practice.');
      setClaiming(false);
      return;
    }

    if (existing) {
      // Already in DB and unclaimed — use the standard claim flow
      await handleClaim(existing);
      return;
    }

    // Not in DB — create a new provider row from Google data
    const rawSlug = slugify(`${placeDetails.name || ''} ${parsed.city || ''}`);
    const slug = rawSlug || `practice-${Date.now()}`;
    const { error: insertError } = await supabase
      .from('providers')
      .insert({
        name: placeDetails.name,
        slug,
        google_place_id: prediction.place_id,
        city: parsed.city || null,
        state: parsed.state || null,
        zip_code: parsed.zipCode || null,
        address: parsed.address || placeDetails.formatted_address || null,
        phone: placeDetails.formatted_phone_number || null,
        website: placeDetails.website || null,
        lat: placeDetails.geometry?.location?.lat() ?? null,
        lng: placeDetails.geometry?.location?.lng() ?? null,
        owner_user_id: user.id,
        is_claimed: true,
        is_verified: true,
        claimed_at: new Date().toISOString(),
        onboarding_completed: false,
        source: 'provider_claimed',
        is_active: true,
      });

    if (insertError) {
      setClaimError(insertError.message);
      setClaiming(false);
      return;
    }

    await supabase.auth.updateUser({ data: { user_role: 'provider' } });
    await supabase.from('profiles').update({ role: 'provider' }).eq('user_id', user.id);
    setClaiming(false);
    navigate('/business/dashboard');
  }


  // Not signed in: show auth gate
  if (!session) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="glow-card p-8 text-center">
          <Building2 size={40} className="text-rose-accent mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Sign in to claim your listing
          </h1>
          <p className="text-text-secondary mb-6">
            Enter your email and we'll send a magic link to get started.
          </p>

          {magicLinkSent ? (
            <div className="bg-verified/10 text-verified rounded-xl p-4">
              <CheckCircle size={24} className="mx-auto mb-2" />
              <p className="font-medium">Check your email!</p>
              <p className="text-sm mt-1">
                We sent a sign-in link to <strong>{email}</strong>. Click it to
                continue claiming your listing.
              </p>
            </div>
          ) : (
            <form onSubmit={handleMagicLink}>
              <input
                type="email"
                placeholder="you@yourpractice.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={INPUT_CLASS + ' mb-4'}
              />
              {authError && (
                <p className="text-red-500 text-sm mb-3">{authError}</p>
              )}
              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-rose-accent text-white px-6 py-3 rounded-full font-semibold hover:bg-rose-dark transition disabled:opacity-50"
              >
                {authLoading ? 'Sending...' : 'Send Magic Link'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Signed in: show search and claim flow
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-text-primary mb-2">
        Claim Your Practice
      </h1>
      <p className="text-text-secondary mb-8">
        Search for your practice below. If it already exists in our directory,
        you can claim it instantly.
      </p>

      {/* Search inputs */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary"
          />
          <input
            type="text"
            placeholder="Practice name..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className={INPUT_CLASS + ' pl-10'}
          />
        </div>
        <div className="relative sm:w-56">
          <input
            type="text"
            placeholder="City..."
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      {/* Search results */}
      {searching && (
        <div className="flex items-center gap-2 text-text-secondary py-4">
          <Loader2 size={18} className="animate-spin" />
          <span>Searching...</span>
        </div>
      )}

      {!searching && hasSearched && searchResults.length > 0 && (
        <div className="space-y-3 mb-8">
          <p className="text-sm text-text-secondary">
            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}{' '}
            found
          </p>
          {searchResults.map((provider) => (
            <div
              key={provider.id}
              className="glow-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div>
                <h3 className="font-semibold text-text-primary">
                  {provider.name}
                </h3>
                <p className="text-sm text-text-secondary">
                  {provider.city}, {provider.state}{' '}
                  {provider.provider_type && (
                    <span className="ml-1 text-xs bg-warm-gray px-2 py-0.5 rounded-full">
                      {provider.provider_type}
                    </span>
                  )}
                </p>
              </div>
              <div className="shrink-0">
                {provider.is_claimed ? (
                  <span className="inline-flex items-center gap-1.5 text-sm text-text-secondary bg-warm-gray px-4 py-2 rounded-full">
                    <CheckCircle size={16} className="text-verified" />
                    This listing has been claimed
                  </span>
                ) : (
                  <button
                    onClick={() => handleClaim(provider)}
                    disabled={claiming}
                    className="bg-rose-accent text-white px-5 py-2 rounded-full font-semibold text-sm hover:bg-rose-dark transition disabled:opacity-50"
                  >
                    {claiming ? 'Claiming...' : 'Claim This Listing'}
                  </button>
                )}
              </div>
            </div>
          ))}
          {claimError && (
            <div className="flex items-center gap-2 text-red-500 text-sm">
              <XCircle size={16} />
              <span>{claimError}</span>
            </div>
          )}
        </div>
      )}

      {!searching && hasSearched && searchResults.length === 0 && (
        <div className="glow-card p-6 text-center mb-8">
          <p className="text-text-secondary mb-4">
            No matching practices found in our directory.
          </p>

          {/* Tier 2: Google Places fallback — SDK loads only on click */}
          {!showGoogleSearch ? (
            <button
              onClick={handleGoogleFallback}
              disabled={googleLoading}
              className="text-rose-accent font-medium hover:text-rose-dark transition disabled:opacity-50"
            >
              {googleLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Loading Google Places…
                </span>
              ) : (
                'Search Google for your business \u2192'
              )}
            </button>
          ) : (
            <div ref={googleDropdownRef} className="relative mt-2 text-left">
              <input
                autoFocus
                type="text"
                value={googleQuery}
                onChange={(e) => handleGoogleInput(e.target.value)}
                placeholder="Type your business name…"
                className={INPUT_CLASS}
              />
              {googleSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                  {googleSuggestions.map((pred) => (
                    <button
                      key={pred.place_id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); handleGoogleSelect(pred); }}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-warm-gray transition-colors border-b last:border-b-0 border-gray-100"
                    >
                      <span className="font-medium text-text-primary block">{pred.structured_formatting?.main_text}</span>
                      <span className="text-text-secondary text-xs">{pred.structured_formatting?.secondary_text}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {googleError && <p className="text-red-500 text-sm mt-3">{googleError}</p>}
          {claimError && (
            <div className="flex items-center gap-2 text-red-500 text-sm mt-3 justify-center">
              <XCircle size={16} />
              <span>{claimError}</span>
            </div>
          )}
        </div>
      )}

      {/* Create new listing */}
      <div className="border-t border-gray-100 pt-8 text-center">
        <p className="text-text-secondary mb-3">
          Don't see your practice?
        </p>
        <Link
          to="/business/add"
          className="inline-block border-2 border-rose-accent text-rose-accent px-6 py-2.5 rounded-full font-semibold hover:bg-rose-accent hover:text-white transition"
        >
          Add Your Business &rarr;
        </Link>
      </div>
    </div>
  );
}

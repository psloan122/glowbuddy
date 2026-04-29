import { useState, useEffect, useContext, useRef, useCallback, Fragment } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Search, Building2, CheckCircle, XCircle, Loader2,
  Star, ChevronLeft, ArrowRight, Copy, Check, Clock,
  Phone, Globe, MapPin,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AuthContext } from '../../App';
import { parseAddressComponents } from '../../lib/places';
import { slugify } from '../../lib/slugify';
import ProviderAvatar from '../../components/ProviderAvatar';
import { ONBOARDING_PROVIDER_TYPES } from '../../lib/constants';

const INPUT_CLASS =
  'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition text-sm';

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({ step, isNewListing }) {
  const steps = isNewListing
    ? [{ label: 'Find' }, { label: 'Details' }, { label: 'Verify' }, { label: 'Done' }]
    : [{ label: 'Find' }, { label: 'Verify' }, { label: 'Done' }];

  // Map actual step number → visible index
  const vi = isNewListing ? step - 1 : step === 1 ? 0 : step === 3 ? 1 : 2;

  return (
    <div className="flex items-center mb-10">
      {steps.map((s, i) => (
        <Fragment key={s.label}>
          <div className="flex flex-col items-center shrink-0">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                vi > i
                  ? 'bg-verified text-white'
                  : vi === i
                  ? 'bg-rose-accent text-white'
                  : 'bg-white border-2 border-gray-200 text-text-secondary'
              }`}
            >
              {vi > i ? <Check size={13} /> : i + 1}
            </div>
            <span
              className={`text-[9px] font-semibold uppercase tracking-wide mt-1 ${
                vi === i ? 'text-text-primary' : 'text-text-secondary'
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-px mx-2 mb-4 ${vi > i ? 'bg-verified' : 'bg-gray-200'}`} />
          )}
        </Fragment>
      ))}
    </div>
  );
}

// ── Preview panel (desktop right side) ───────────────────────────────────────

function PreviewPanel({ step, provider, newBizForm, claimedProvider }) {
  const active = claimedProvider || provider;
  const displayName = active?.name || newBizForm.name || '';
  const displayCity = active?.city || newBizForm.city || '';
  const displayState = active?.state || newBizForm.state || '';
  const hasData = !!displayName;

  return (
    <div className="w-full max-w-xs">
      <p
        className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary mb-4"
        style={{ letterSpacing: '0.14em' }}
      >
        Your listing preview
      </p>

      <div className="glow-card p-5 mb-3">
        {hasData ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <ProviderAvatar name={displayName} size={48} />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-text-primary text-sm leading-tight truncate">
                  {displayName}
                </p>
                {(displayCity || displayState) && (
                  <p className="text-xs text-text-secondary mt-0.5">
                    {[displayCity, displayState].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            </div>

            {/* Status badge */}
            {step === 4 ? (
              <span className="inline-flex items-center gap-1 text-xs bg-verified/10 text-verified px-2.5 py-1 rounded-full font-medium">
                <CheckCircle size={11} />
                Listing claimed
              </span>
            ) : step === 3 ? (
              <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-medium">
                <Clock size={11} />
                Pending verification
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-text-secondary px-2.5 py-1 rounded-full font-medium">
                <Building2 size={11} />
                {active?.is_claimed ? 'Already claimed' : 'Unclaimed listing'}
              </span>
            )}

            {active?.avg_rating && (
              <div className="flex items-center gap-1 mt-3 text-xs">
                <Star size={12} className="text-amber-400 fill-amber-400" />
                <span className="font-semibold text-text-primary">{active.avg_rating}</span>
                {active.google_review_count ? (
                  <span className="text-text-secondary">({active.google_review_count.toLocaleString()})</span>
                ) : null}
              </div>
            )}
          </>
        ) : (
          <div className="py-10 text-center">
            <Building2 size={28} className="text-gray-200 mx-auto mb-2" />
            <p className="text-xs text-text-secondary">Your listing will appear here</p>
          </div>
        )}
      </div>

      {/* Post-claim next-steps hint */}
      {step === 4 && (
        <div className="space-y-2">
          {[
            { label: 'Prices', done: false },
            { label: 'Hours', done: false },
            { label: 'Photos', done: false },
          ].map(({ label }) => (
            <div key={label} className="glow-card px-4 py-2.5 flex items-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-gray-200 shrink-0" />
              <span className="text-xs text-text-secondary">{label} — not added yet</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-text-secondary mt-5 text-center">
        Powered by{' '}
        <span className="font-semibold" style={{ color: '#E8347A' }}>
          GlowBuddy
        </span>
      </p>
    </div>
  );
}

// ── Main Claim component ──────────────────────────────────────────────────────

export default function Claim() {
  const { session, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // URL pre-fill params (from provider profile page claim CTA)
  const prefillParams = new URLSearchParams(location.search);
  const prefillId   = prefillParams.get('provider_id') || '';
  const prefillName = prefillParams.get('name') || '';
  const prefillCity = prefillParams.get('city') || '';

  // ── Step navigation ───────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [claimedProvider, setClaimedProvider] = useState(null);
  const [isNewListing, setIsNewListing] = useState(false);

  // Step 2 — new listing form
  const [newBizForm, setNewBizForm] = useState({
    name: prefillName || '',
    address: '',
    city: prefillCity || '',
    state: '',
    phone: '',
    website: '',
    providerType: '',
  });
  const [newBizSaving, setNewBizSaving] = useState(false);
  const [newBizError, setNewBizError] = useState('');

  // Step 4 — share link
  const [copySuccess, setCopySuccess] = useState(false);

  // ── Auth / magic link ─────────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // ── Search (Step 1) ───────────────────────────────────────────────────────
  const [searchName, setSearchName] = useState(prefillName);
  const [searchCity, setSearchCity] = useState(prefillCity);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // ── Claim ─────────────────────────────────────────────────────────────────
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');

  const debounceRef = useRef(null);

  // ── Google Places fallback ────────────────────────────────────────────────
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

  // Pre-fill from URL params when arriving from a provider page
  useEffect(() => {
    if (!prefillId) return;
    supabase
      .from('providers')
      .select('id, name, city, state, provider_type, google_place_id, is_claimed, avg_rating, google_review_count')
      .eq('id', prefillId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSearchResults([data]);
          setHasSearched(true);
        }
      });
  }, [prefillId]); // eslint-disable-line react-hooks/exhaustive-deps

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
      .select('id, name, city, state, provider_type, google_place_id, is_claimed, avg_rating, google_review_count')
      .eq('is_active', true);
    if (name.trim()) query = query.ilike('name', `%${name.trim()}%`);
    if (city.trim()) query = query.ilike('city', `${city.trim()}%`);
    query = query.limit(8);

    const { data } = await query;
    setSearchResults(data || []);
    setSearching(false);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(searchName, searchCity), 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchName, searchCity, doSearch]);

  // ── Magic link ────────────────────────────────────────────────────────────
  async function handleMagicLink(e) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    sessionStorage.setItem('gb_pending_action', JSON.stringify({ path: '/business/claim' }));

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      sessionStorage.removeItem('gb_pending_action');
      setAuthError(error.message);
    } else {
      setMagicLinkSent(true);
    }
    setAuthLoading(false);
  }

  // ── Claim existing listing ────────────────────────────────────────────────
  async function handleClaim(provider) {
    if (!user) {
      setSelectedProvider(provider);
      setStep(3);
      return;
    }
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

    await supabase.auth.updateUser({ data: { user_role: 'provider' } });
    await supabase.from('profiles').update({ role: 'provider' }).eq('user_id', user.id);

    setClaiming(false);
    setClaimedProvider(provider);
    setStep(4);
  }

  // ── Create + claim new listing (Step 2) ───────────────────────────────────
  async function handleCreateAndClaim(e) {
    e.preventDefault();
    if (!user) {
      setStep(3);
      return;
    }

    setNewBizSaving(true);
    setNewBizError('');

    const name = newBizForm.name.trim();
    const city = newBizForm.city.trim();
    if (!name) { setNewBizError('Business name is required.'); setNewBizSaving(false); return; }

    // Check for duplicate
    let dupQuery = supabase.from('providers').select('id, is_claimed, owner_user_id').ilike('name', name);
    if (city) dupQuery = dupQuery.ilike('city', city);
    const { data: existing } = await dupQuery.maybeSingle();

    if (existing) {
      if (existing.is_claimed) {
        setNewBizError('A listing with this name already exists and has been claimed. Contact support if this is your practice.');
        setNewBizSaving(false);
        return;
      }
      // Unclaimed → claim it
      await handleClaim(existing);
      setNewBizSaving(false);
      return;
    }

    const rawSlug = slugify(`${name} ${city}`);
    const slug = rawSlug || `practice-${Date.now()}`;

    const { data: inserted, error } = await supabase
      .from('providers')
      .insert({
        name,
        slug,
        city: city || null,
        state: newBizForm.state.trim() || null,
        address: newBizForm.address.trim() || null,
        phone: newBizForm.phone.trim() || null,
        website: newBizForm.website.trim() || null,
        provider_type: newBizForm.providerType || null,
        owner_user_id: user.id,
        is_claimed: true,
        is_verified: true,
        claimed_at: new Date().toISOString(),
        onboarding_completed: false,
        source: 'provider_claimed',
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      setNewBizError(error.message);
      setNewBizSaving(false);
      return;
    }

    await supabase.auth.updateUser({ data: { user_role: 'provider' } });
    await supabase.from('profiles').update({ role: 'provider' }).eq('user_id', user.id);

    setNewBizSaving(false);
    setClaimedProvider(inserted);
    setStep(4);
  }

  // ── Google Places fallback ────────────────────────────────────────────────
  async function handleGoogleFallback() {
    setGoogleLoading(true);
    setGoogleError('');
    try {
      const { loadGoogleMaps } = await import('../../lib/loadGoogleMaps');
      await loadGoogleMaps();
      const places = window.google?.maps?.places;
      if (!places?.AutocompleteService) throw new Error('Places unavailable');
      googleServiceRef.current = new places.AutocompleteService();
      const el = document.createElement('div');
      googleDetailsRef.current = new places.PlacesService(el);
      googleTokenRef.current   = new places.AutocompleteSessionToken();
      setShowGoogleSearch(true);
    } catch {
      setGoogleError('Could not load Google Places. Try adding your business manually.');
    }
    setGoogleLoading(false);
  }

  function handleGoogleInput(input) {
    setGoogleQuery(input);
    clearTimeout(googleDebRef.current);
    if (input.length < 2 || !googleServiceRef.current) { setGoogleSuggestions([]); return; }
    googleDebRef.current = setTimeout(() => {
      googleServiceRef.current.getPlacePredictions(
        { input, types: ['establishment'], componentRestrictions: { country: 'us' }, sessionToken: googleTokenRef.current },
        (predictions, status) => {
          const ok = window.google?.maps?.places?.PlacesServiceStatus?.OK;
          setGoogleSuggestions(status === ok && predictions ? predictions.slice(0, 6) : []);
        }
      );
    }, 300);
  }

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
      await handleClaim(existing);
      return;
    }

    const rawSlug = slugify(`${placeDetails.name || ''} ${parsed.city || ''}`);
    const slug = rawSlug || `practice-${Date.now()}`;
    const { data: inserted, error: insertError } = await supabase
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
      })
      .select()
      .single();

    if (insertError) {
      setClaimError(insertError.message);
      setClaiming(false);
      return;
    }

    await supabase.auth.updateUser({ data: { user_role: 'provider' } });
    await supabase.from('profiles').update({ role: 'provider' }).eq('user_id', user.id);
    setClaiming(false);
    setClaimedProvider(inserted);
    setStep(4);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  async function copyPublicUrl() {
    if (!claimedProvider?.slug) return;
    const url = `${window.location.origin}/provider/${claimedProvider.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      // clipboard not available
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const previewProps = {
    step,
    provider: selectedProvider,
    newBizForm,
    claimedProvider,
  };

  return (
    <div className="flex min-h-[calc(100dvh-64px)]">

      {/* ── Left panel: form ─────────────────────────────────────────── */}
      <div className="flex-1 md:w-1/2 flex flex-col px-6 py-10 md:px-12 md:py-14 max-w-2xl md:max-w-none">

        <StepIndicator step={step} isNewListing={isNewListing} />

        {/* step content animates in on mount via page-enter */}
        <div key={step} className="page-enter flex-1">

          {/* ══ STEP 1: Find your business ══════════════════════════════ */}
          {step === 1 && (
            <div>
              <h1 className="text-2xl font-bold text-text-primary mb-1">
                Let&rsquo;s find your business
              </h1>
              <p className="text-text-secondary mb-8 text-sm">
                Search by name or add a new listing.
              </p>

              {/* Search inputs */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input
                    type="text"
                    placeholder="Business name…"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    autoFocus
                    className={INPUT_CLASS + ' pl-9'}
                  />
                </div>
                <div className="sm:w-44">
                  <input
                    type="text"
                    placeholder="City (optional)"
                    value={searchCity}
                    onChange={(e) => setSearchCity(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              {/* Results */}
              {searching && (
                <div className="flex items-center gap-2 text-text-secondary py-4 text-sm">
                  <Loader2 size={16} className="animate-spin" />
                  Searching…
                </div>
              )}

              {!searching && hasSearched && searchResults.length > 0 && (
                <div className="space-y-2 mb-6">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        if (!p.is_claimed) {
                          setSelectedProvider(p);
                          setIsNewListing(false);
                        }
                      }}
                      disabled={p.is_claimed}
                      className={`w-full glow-card p-4 flex items-center justify-between gap-4 text-left transition hover:shadow-md ${
                        selectedProvider?.id === p.id ? 'ring-2 ring-rose-accent' : ''
                      } ${p.is_claimed ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <ProviderAvatar name={p.name} size={40} />
                        <div className="min-w-0">
                          <p className="font-semibold text-text-primary text-sm truncate">{p.name}</p>
                          <p className="text-xs text-text-secondary mt-0.5">
                            {[p.city, p.state].filter(Boolean).join(', ')}
                            {p.provider_type && (
                              <span className="ml-2 bg-warm-gray px-1.5 py-0.5 rounded-full">{p.provider_type}</span>
                            )}
                          </p>
                          {p.avg_rating && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <Star size={10} className="text-amber-400 fill-amber-400" />
                              <span className="text-xs text-text-secondary">{p.avg_rating}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {p.is_claimed ? (
                          <span className="inline-flex items-center gap-1 text-xs text-text-secondary bg-warm-gray px-3 py-1.5 rounded-full">
                            <CheckCircle size={12} className="text-verified" />
                            Claimed
                          </span>
                        ) : selectedProvider?.id === p.id ? (
                          <span className="inline-flex items-center gap-1 text-xs text-white bg-rose-accent px-3 py-1.5 rounded-full font-medium">
                            <Check size={12} />
                            Selected
                          </span>
                        ) : (
                          <span className="text-xs text-rose-accent font-medium px-2">Select →</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* "Add this name" option */}
              {!searching && searchName.trim().length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setNewBizForm(f => ({ ...f, name: searchName.trim(), city: searchCity.trim() }));
                    setIsNewListing(true);
                    setSelectedProvider(null);
                    setStep(2);
                  }}
                  className="w-full flex items-center gap-3 p-4 border-2 border-dashed border-gray-200 rounded-xl hover:border-rose-accent hover:bg-rose-light/20 transition text-left mb-6"
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-light flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-rose-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">
                      Add &ldquo;{searchName.trim()}&rdquo; as a new listing
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Not in our directory yet? Create a new listing.
                    </p>
                  </div>
                  <ArrowRight size={16} className="text-rose-accent ml-auto shrink-0" />
                </button>
              )}

              {/* CTA when provider selected */}
              {selectedProvider && !selectedProvider.is_claimed && (
                <div>
                  {claimError && (
                    <div className="flex items-center gap-2 text-red-500 text-sm mb-3">
                      <XCircle size={14} />
                      {claimError}
                    </div>
                  )}
                  <button
                    onClick={() => handleClaim(selectedProvider)}
                    disabled={claiming}
                    className="w-full bg-rose-accent text-white py-3 rounded-xl font-semibold hover:bg-rose-dark transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {claiming ? <><Loader2 size={16} className="animate-spin" /> Claiming…</> : 'Claim This Listing →'}
                  </button>
                  {!user && (
                    <p className="text-xs text-text-secondary text-center mt-2">
                      You&rsquo;ll verify your identity in the next step.
                    </p>
                  )}
                </div>
              )}

              {/* Empty state / no results */}
              {!searching && hasSearched && searchResults.length === 0 && searchName.trim().length > 1 && (
                <div className="text-sm text-text-secondary py-2 mb-4">
                  No existing listings match &ldquo;{searchName.trim()}&rdquo;.
                </div>
              )}
            </div>
          )}

          {/* ══ STEP 2: Business details (new listing) ═══════════════════ */}
          {step === 2 && (
            <div>
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition mb-6"
              >
                <ChevronLeft size={16} /> Back
              </button>

              <h1 className="text-2xl font-bold text-text-primary mb-1">
                Tell us about your practice
              </h1>
              <p className="text-text-secondary mb-8 text-sm">
                Fill in your details. You can always update these later.
              </p>

              <form onSubmit={handleCreateAndClaim} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Business name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newBizForm.name}
                    onChange={e => setNewBizForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Glow Aesthetics"
                    required
                    className={INPUT_CLASS}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Address
                  </label>
                  <input
                    type="text"
                    value={newBizForm.address}
                    onChange={e => setNewBizForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="123 Main St"
                    className={INPUT_CLASS}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">City</label>
                    <input
                      type="text"
                      value={newBizForm.city}
                      onChange={e => setNewBizForm(f => ({ ...f, city: e.target.value }))}
                      placeholder="New York"
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">State</label>
                    <input
                      type="text"
                      value={newBizForm.state}
                      onChange={e => setNewBizForm(f => ({ ...f, state: e.target.value }))}
                      placeholder="NY"
                      maxLength={2}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Phone</label>
                    <input
                      type="tel"
                      value={newBizForm.phone}
                      onChange={e => setNewBizForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="(212) 555-0100"
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">Website</label>
                    <input
                      type="url"
                      value={newBizForm.website}
                      onChange={e => setNewBizForm(f => ({ ...f, website: e.target.value }))}
                      placeholder="https://…"
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Practice type
                  </label>
                  <select
                    value={newBizForm.providerType}
                    onChange={e => setNewBizForm(f => ({ ...f, providerType: e.target.value }))}
                    className={INPUT_CLASS}
                  >
                    <option value="">Select…</option>
                    {ONBOARDING_PROVIDER_TYPES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Google Places fallback within Step 2 */}
                {!showGoogleSearch ? (
                  <button
                    type="button"
                    onClick={handleGoogleFallback}
                    disabled={googleLoading}
                    className="text-sm text-rose-accent hover:text-rose-dark transition disabled:opacity-50 flex items-center gap-1"
                  >
                    {googleLoading ? (
                      <><Loader2 size={14} className="animate-spin" /> Loading Google Places…</>
                    ) : (
                      <>Or search Google Places to auto-fill &rarr;</>
                    )}
                  </button>
                ) : (
                  <div ref={googleDropdownRef} className="relative">
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      Search Google Places
                    </label>
                    <input
                      type="text"
                      value={googleQuery}
                      onChange={e => handleGoogleInput(e.target.value)}
                      placeholder="Start typing your business name…"
                      className={INPUT_CLASS}
                    />
                    {googleSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
                        {googleSuggestions.map(pred => (
                          <button
                            key={pred.place_id}
                            type="button"
                            onMouseDown={e => { e.preventDefault(); handleGoogleSelect(pred); }}
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

                {(newBizError || googleError) && (
                  <div className="flex items-center gap-2 text-red-500 text-sm">
                    <XCircle size={14} />
                    {newBizError || googleError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={newBizSaving || !newBizForm.name.trim()}
                  className="w-full bg-rose-accent text-white py-3 rounded-xl font-semibold hover:bg-rose-dark transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                >
                  {newBizSaving ? (
                    <><Loader2 size={16} className="animate-spin" /> Saving…</>
                  ) : !user ? (
                    'Continue — verify your identity →'
                  ) : (
                    'Create listing →'
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ══ STEP 3: Verify identity (auth gate) ═════════════════════ */}
          {step === 3 && (
            <div>
              <button
                onClick={() => setStep(isNewListing ? 2 : 1)}
                className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition mb-6"
              >
                <ChevronLeft size={16} /> Back
              </button>

              <h1 className="text-2xl font-bold text-text-primary mb-1">
                Verify you own this business
              </h1>
              <p className="text-text-secondary mb-8 text-sm">
                We&rsquo;ll send a link to your email to confirm ownership.
              </p>

              {magicLinkSent ? (
                <div className="glow-card p-6 text-center">
                  <CheckCircle size={36} className="text-verified mx-auto mb-3" />
                  <p className="font-semibold text-text-primary mb-1">Check your email!</p>
                  <p className="text-sm text-text-secondary">
                    We sent a sign-in link to <strong>{email}</strong>. Click it to continue.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleMagicLink} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1.5">
                      Business email
                    </label>
                    <input
                      type="email"
                      placeholder="you@yourpractice.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoFocus
                      className={INPUT_CLASS}
                    />
                    <p className="text-xs text-text-secondary mt-1.5">
                      Use your business email to confirm ownership.
                    </p>
                  </div>
                  {authError && <p className="text-red-500 text-sm">{authError}</p>}
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full bg-rose-accent text-white py-3 rounded-xl font-semibold hover:bg-rose-dark transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {authLoading ? (
                      <><Loader2 size={16} className="animate-spin" /> Sending…</>
                    ) : (
                      'Send verification link →'
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* ══ STEP 4: Done ════════════════════════════════════════════ */}
          {step === 4 && (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-verified/10 flex items-center justify-center">
                  <CheckCircle size={24} className="text-verified" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-text-primary">Welcome to GlowBuddy!</h1>
                  <p className="text-sm text-text-secondary">Your listing is live.</p>
                </div>
              </div>

              <p className="text-text-secondary text-sm mt-4 mb-8">
                Here&rsquo;s what to do next to make the most of your profile:
              </p>

              <div className="space-y-3 mb-8">
                <button
                  onClick={() => navigate('/business/dashboard?tab=menu')}
                  className="w-full glow-card p-4 flex items-center gap-4 text-left hover:shadow-md transition group"
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-light flex items-center justify-center shrink-0">
                    <span className="text-rose-accent font-bold text-lg">$</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-text-primary text-sm group-hover:text-rose-accent transition-colors">
                      Add your prices
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Help patients see your real pricing before they book.
                    </p>
                  </div>
                  <ArrowRight size={16} className="text-rose-accent shrink-0" />
                </button>

                <button
                  onClick={() => navigate('/business/dashboard?tab=before-after')}
                  className="w-full glow-card p-4 flex items-center gap-4 text-left hover:shadow-md transition group"
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-light flex items-center justify-center shrink-0">
                    <span className="text-rose-accent font-bold text-lg">📸</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-text-primary text-sm group-hover:text-rose-accent transition-colors">
                      Upload a before &amp; after photo
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Show your work and build trust with new patients.
                    </p>
                  </div>
                  <ArrowRight size={16} className="text-rose-accent shrink-0" />
                </button>

                <button
                  onClick={copyPublicUrl}
                  className="w-full glow-card p-4 flex items-center gap-4 text-left hover:shadow-md transition group"
                >
                  <div className="w-10 h-10 rounded-xl bg-rose-light flex items-center justify-center shrink-0">
                    {copySuccess
                      ? <CheckCircle size={18} className="text-verified" />
                      : <Copy size={18} className="text-rose-accent" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-text-primary text-sm group-hover:text-rose-accent transition-colors">
                      Share your page
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {copySuccess ? 'Link copied to clipboard!' : 'Get your first patient review.'}
                    </p>
                  </div>
                  <ArrowRight size={16} className="text-rose-accent shrink-0" />
                </button>
              </div>

              <button
                onClick={() => navigate('/business/dashboard')}
                className="w-full bg-rose-accent text-white py-3 rounded-xl font-semibold hover:bg-rose-dark transition flex items-center justify-center gap-2"
              >
                Go to Dashboard →
              </button>
            </div>
          )}

        </div>{/* end page-enter div */}
      </div>

      {/* ── Right panel: preview (desktop only) ──────────────────────── */}
      <div className="hidden md:flex md:w-1/2 flex-col items-center justify-start px-8 py-14"
           style={{ background: '#F7F5F3' }}>
        <PreviewPanel {...previewProps} />
      </div>

    </div>
  );
}

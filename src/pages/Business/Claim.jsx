import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Building2, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AuthContext } from '../../App';
import { PROVIDER_TYPES, US_STATES } from '../../lib/constants';
import { slugify } from '../../lib/slugify';

const INPUT_CLASS =
  'w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition';

export default function Claim() {
  const { session, user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Auth state
  const [email, setEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Search state
  const [searchName, setSearchName] = useState('');
  const [searchCity, setSearchCity] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Claim state
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState('');

  // New listing form state
  const [showNewForm, setShowNewForm] = useState(false);
  const [newListing, setNewListing] = useState({
    name: '',
    provider_type: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    phone: '',
    website: '',
    instagram: '',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const debounceRef = useRef(null);

  useEffect(() => {
    document.title = 'Claim Your Listing | GlowBuddy';
  }, []);

  // Debounced search
  const doSearch = useCallback(async (name, city) => {
    if (!name.trim() && !city.trim()) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setSearching(true);
    setHasSearched(true);

    let query = supabase.from('providers').select('*');

    if (name.trim()) {
      query = query.ilike('name', `%${name.trim()}%`);
    }
    if (city.trim()) {
      query = query.ilike('city', `%${city.trim()}%`);
    }

    query = query.limit(10);

    const { data, error } = await query;

    if (error) {
      console.error('Search error:', error);
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

    const { error } = await supabase.auth.signInWithOtp({ email });

    if (error) {
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
      .update({ owner_user_id: user.id, is_claimed: true, is_verified: true })
      .eq('id', provider.id);

    if (updateError) {
      setClaimError(updateError.message);
      setClaiming(false);
      return;
    }

    const { error: metaError } = await supabase.auth.updateUser({
      data: { user_role: 'provider' },
    });

    if (metaError) {
      console.error('Failed to update user role:', metaError);
    }

    // Sync role to profiles table for DB-level checks
    await supabase.from('profiles').update({ role: 'provider' }).eq('user_id', user.id);

    setClaiming(false);
    navigate('/business/dashboard');
  }

  // Create new listing
  async function handleCreateListing(e) {
    e.preventDefault();
    if (!user) return;

    setCreating(true);
    setCreateError('');

    const slug = slugify(newListing.name + ' ' + newListing.city);

    const { error } = await supabase.from('providers').insert({
      name: newListing.name,
      provider_type: newListing.provider_type,
      address: newListing.address,
      city: newListing.city,
      state: newListing.state,
      zip: newListing.zip,
      phone: newListing.phone || null,
      website: newListing.website || null,
      instagram: newListing.instagram || null,
      slug,
      owner_user_id: user.id,
      is_claimed: true,
      is_verified: true,
    });

    if (error) {
      setCreateError(error.message);
      setCreating(false);
      return;
    }

    const { error: metaError } = await supabase.auth.updateUser({
      data: { user_role: 'provider' },
    });

    if (metaError) {
      console.error('Failed to update user role:', metaError);
    }

    // Sync role to profiles table for DB-level checks
    await supabase.from('profiles').update({ role: 'provider' }).eq('user_id', user.id);

    setCreating(false);
    navigate('/business/dashboard');
  }

  function updateNewListing(field, value) {
    setNewListing((prev) => ({ ...prev, [field]: value }));
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
          <p className="text-text-secondary">
            No matching practices found for your search.
          </p>
        </div>
      )}

      {/* Create new listing */}
      <div className="border-t border-gray-100 pt-8">
        {!showNewForm ? (
          <div className="text-center">
            <p className="text-text-secondary mb-3">
              Don't see your practice? Create a new listing.
            </p>
            <button
              onClick={() => setShowNewForm(true)}
              className="inline-block border-2 border-rose-accent text-rose-accent px-6 py-2.5 rounded-full font-semibold hover:bg-rose-accent hover:text-white transition"
            >
              Create New Listing
            </button>
          </div>
        ) : (
          <div className="glow-card p-6">
            <h2 className="text-xl font-bold text-text-primary mb-6">
              Create a New Listing
            </h2>
            <form onSubmit={handleCreateListing} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Practice Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newListing.name}
                  onChange={(e) => updateNewListing('name', e.target.value)}
                  required
                  placeholder="e.g. Glow Aesthetics"
                  className={INPUT_CLASS}
                />
              </div>

              {/* Provider Type */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Provider Type <span className="text-red-400">*</span>
                </label>
                <select
                  value={newListing.provider_type}
                  onChange={(e) =>
                    updateNewListing('provider_type', e.target.value)
                  }
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

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newListing.address}
                  onChange={(e) => updateNewListing('address', e.target.value)}
                  required
                  placeholder="123 Main St"
                  className={INPUT_CLASS}
                />
              </div>

              {/* City, State, Zip row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    City <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newListing.city}
                    onChange={(e) => updateNewListing('city', e.target.value)}
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
                    value={newListing.state}
                    onChange={(e) => updateNewListing('state', e.target.value)}
                    required
                    className={INPUT_CLASS}
                  >
                    <option value="">Select state...</option>
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
                    value={newListing.zip}
                    onChange={(e) => updateNewListing('zip', e.target.value)}
                    required
                    placeholder="90001"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              {/* Optional fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Phone{' '}
                    <span className="text-text-secondary font-normal">
                      (optional)
                    </span>
                  </label>
                  <input
                    type="tel"
                    value={newListing.phone}
                    onChange={(e) => updateNewListing('phone', e.target.value)}
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
                    value={newListing.website}
                    onChange={(e) => updateNewListing('website', e.target.value)}
                    placeholder="https://yoursite.com"
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Instagram{' '}
                    <span className="text-text-secondary font-normal">
                      (optional)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={newListing.instagram}
                    onChange={(e) =>
                      updateNewListing('instagram', e.target.value)
                    }
                    placeholder="@yourpractice"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>

              {createError && (
                <div className="flex items-center gap-2 text-red-500 text-sm">
                  <XCircle size={16} />
                  <span>{createError}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-rose-accent text-white px-8 py-3 rounded-full font-semibold hover:bg-rose-dark transition disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Listing'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewForm(false)}
                  className="text-text-secondary hover:text-text-primary transition text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

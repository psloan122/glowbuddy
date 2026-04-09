import { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Building2, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { AuthContext } from '../../App';

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
    await supabase.from('profiles').update({ role: 'provider' }).eq('id', user.id);

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
          <p className="text-text-secondary">
            No matching practices found.{' '}
            <Link
              to="/business/add"
              className="text-rose-accent font-medium hover:text-rose-dark transition"
            >
              Don't see your business? Add it free &rarr;
            </Link>
          </p>
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

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { US_STATES } from '../lib/constants';
import ProviderAvatar from '../components/ProviderAvatar';
import { providerProfileUrl } from '../lib/slugify';

// Specials — editorial masthead listing of active provider specials.
//
// Data source: `providers.active_special` (text) + `special_expires_at`
// (timestamptz), both added in migration 054 and edited from the business
// dashboard. This is the lightweight "free inline special" flow — NOT the
// older paid `specials` promo table (which is unrelated).
//
// A provider is considered to have an active special when:
//   1. active_special is non-empty, AND
//   2. special_expires_at is null OR in the future
export default function Specials() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');

  // SEO
  useEffect(() => {
    document.title = "This Week's Med Spa Deals & Specials | Know Before You Glow";
    let meta = document.querySelector('meta[name="description"]');
    const content =
      'Browse current med spa specials and promotions from verified providers on Know Before You Glow. New deals added weekly.';
    if (meta) {
      meta.setAttribute('content', content);
    } else {
      meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = content;
      document.head.appendChild(meta);
    }
  }, []);

  useEffect(() => {
    async function fetchProvidersWithSpecials() {
      setLoading(true);
      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('providers')
        .select(
          'id, name, slug, city, state, active_special, special_expires_at, special_added_at, owner_user_id',
        )
        .not('active_special', 'is', null)
        .neq('active_special', '')
        .or(`special_expires_at.is.null,special_expires_at.gt.${nowIso}`)
        .order('special_added_at', { ascending: false, nullsFirst: false });

      if (error) {
        setProviders([]);
      } else {
        setProviders(data || []);
      }
      setLoading(false);
    }
    fetchProvidersWithSpecials();
  }, []);

  // Distinct cities for the filter (derived from the fetched set).
  const cityOptions = useMemo(() => {
    const set = new Set();
    for (const p of providers) {
      if (p.city && p.state) set.add(`${p.city}, ${p.state}`);
    }
    return Array.from(set).sort();
  }, [providers]);

  const filtered = useMemo(() => {
    return providers.filter((p) => {
      if (stateFilter && p.state !== stateFilter) return false;
      if (cityFilter) {
        const label = `${p.city}, ${p.state}`;
        if (label !== cityFilter) return false;
      }
      return true;
    });
  }, [providers, cityFilter, stateFilter]);

  return (
    <div className="bg-white min-h-screen">
      {/* Editorial cream masthead */}
      <div className="bg-cream" style={{ borderBottom: '3px solid #E8347A' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
          <p className="editorial-kicker mb-3">Fresh deals this week</p>
          <h1
            className="font-display text-ink"
            style={{
              fontWeight: 900,
              fontSize: 'clamp(36px, 6vw, 64px)',
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}
          >
            This Week&rsquo;s Deals.
          </h1>
          <p
            className="font-body font-light text-text-secondary mt-4 text-[15px] max-w-2xl"
          >
            Current specials from verified med spas and providers. Claim your
            listing and add a special to appear here.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="px-3 py-2 border border-rule text-sm bg-white"
            style={{ borderRadius: '2px', fontFamily: 'var(--font-body)' }}
          >
            <option value="">All cities</option>
            {cityOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="px-3 py-2 border border-rule text-sm bg-white"
            style={{ borderRadius: '2px', fontFamily: 'var(--font-body)' }}
          >
            <option value="">All states</option>
            {US_STATES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-text-secondary animate-pulse">Loading specials&hellip;</p>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <SpecialRow key={p.id} provider={p} />
            ))}
          </div>
        ) : (
          <div className="glow-card p-8 text-center">
            <p className="text-ink font-body text-[15px] mb-2">
              No specials right now &mdash; check back soon.
            </p>
            <p className="text-text-secondary font-body font-light text-[13px] italic mb-4">
              Are you a provider? Add a special to your listing.
            </p>
            <Link
              to="/business"
              className="btn-editorial btn-editorial-primary inline-block"
            >
              Claim your listing
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function SpecialRow({ provider }) {
  const url = providerProfileUrl(provider.slug, provider.name, provider.city, provider.state);
  const Wrapper = url ? Link : 'div';
  const wrapperProps = url ? { to: url } : {};

  const endsLabel = (() => {
    if (!provider.special_expires_at) return null;
    try {
      return `Ends ${format(new Date(provider.special_expires_at), 'MMM d')}`;
    } catch {
      return null;
    }
  })();

  return (
    <Wrapper
      {...wrapperProps}
      className="group block glow-card p-5 hover:no-underline"
    >
      <div
        className="px-3 py-2 mb-3"
        style={{
          background: '#FBF9F7',
          borderLeft: '3px solid #E8347A',
          borderRadius: '0 4px 4px 0',
        }}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <span
            className="text-[9px] font-bold uppercase text-hot-pink"
            style={{ letterSpacing: '0.12em', fontFamily: 'var(--font-body)' }}
          >
            Special
          </span>
          {endsLabel && (
            <span
              className="text-[10px] font-light text-text-secondary"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {endsLabel}
            </span>
          )}
        </div>
        <p
          className="text-[13px] text-ink"
          style={{ fontFamily: 'var(--font-body)', fontWeight: 400, lineHeight: 1.4 }}
        >
          {provider.active_special}
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <ProviderAvatar name={provider.name} size={32} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-ink truncate">
            {provider.name}
          </p>
          {provider.city && provider.state && (
            <p className="text-[11px] font-light text-text-secondary">
              {provider.city}, {provider.state}
            </p>
          )}
        </div>
      </div>
    </Wrapper>
  );
}

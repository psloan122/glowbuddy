/*
 * SmartEmptyState — shown when a procedure has no prices in the chosen city.
 *
 * Fetches up to 3 nearby cities (same procedure_type ilike) with at least
 * one active price, computes their average, and lets the user jump to
 * those cities. Falls back to the always-helpful "be the first to share"
 * + "set a price alert" CTAs.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function SmartEmptyState({
  procedureLabel,
  procedureSlug,
  procedureType,
  procedureTypes = [],
  brand,
  city,
  state,
}) {
  const [nearby, setNearby] = useState([]);
  const [loading, setLoading] = useState(true);

  const headBrand = brand || procedureLabel || procedureType || 'this treatment';
  const cityLabel = city ? `${city}${state ? `, ${state}` : ''}` : '';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function fetchNearby() {
      // Pull recent active rows for this procedure (or list of canonical
      // names) excluding the current city, then group by city/state and
      // average locally. We pull more than 3 cities up front so the most
      // populated nearby cities tend to win the slice.
      const types = procedureTypes && procedureTypes.length > 0
        ? procedureTypes
        : procedureType
        ? [procedureType]
        : null;

      if (!types) {
        setNearby([]);
        setLoading(false);
        return;
      }

      let q = supabase
        .from('procedures')
        .select('city, state, price_paid')
        .eq('status', 'active');

      if (types.length === 1) q = q.eq('procedure_type', types[0]);
      else q = q.in('procedure_type', types);

      if (state) q = q.eq('state', state);
      if (city) q = q.not('city', 'ilike', city);

      q = q.limit(200);

      const { data } = await q;
      if (cancelled) return;

      const byCity = new Map();
      for (const row of data || []) {
        if (!row.city || !row.state) continue;
        const key = `${row.city}|${row.state}`;
        if (!byCity.has(key)) {
          byCity.set(key, { city: row.city, state: row.state, prices: [] });
        }
        const n = Number(row.price_paid);
        if (Number.isFinite(n) && n > 0) byCity.get(key).prices.push(n);
      }

      const list = [...byCity.values()]
        .filter((c) => c.prices.length > 0)
        .map((c) => ({
          city: c.city,
          state: c.state,
          count: c.prices.length,
          avg: Math.round(c.prices.reduce((a, b) => a + b, 0) / c.prices.length),
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      setNearby(list);
      setLoading(false);
    }

    fetchNearby();
    return () => {
      cancelled = true;
    };
  }, [procedureType, city, state, brand, JSON.stringify(procedureTypes)]); // eslint-disable-line react-hooks/exhaustive-deps

  const buildBrowseUrl = (c) => {
    const params = new URLSearchParams();
    if (procedureSlug) params.set('procedure', procedureSlug);
    if (brand) params.set('brand', brand);
    if (c?.city) params.set('city', c.city);
    if (c?.state) params.set('state', c.state);
    return `/browse?${params.toString()}`;
  };

  const logUrl = (() => {
    const params = new URLSearchParams();
    if (brand) params.set('procedure', brand);
    else if (procedureLabel) params.set('procedure', procedureLabel);
    if (city) params.set('city', city);
    if (state) params.set('state', state);
    const qs = params.toString();
    return qs ? `/log?${qs}` : '/log';
  })();

  const alertUrl = (() => {
    const params = new URLSearchParams();
    if (procedureSlug) params.set('procedure', procedureSlug);
    if (brand) params.set('brand', brand);
    if (city) params.set('city', city);
    if (state) params.set('state', state);
    const qs = params.toString();
    return qs ? `/alerts?${qs}` : '/alerts';
  })();

  return (
    <div
      style={{
        maxWidth: 720,
        margin: '24px auto 32px auto',
        padding: '40px 24px',
        textAlign: 'center',
      }}
    >
      <h2
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontStyle: 'italic',
          fontWeight: 700,
          fontSize: 24,
          color: '#111',
          lineHeight: 1.25,
          margin: '0 0 8px 0',
        }}
      >
        No {headBrand} prices{cityLabel ? ` in ${cityLabel}` : ''} yet.
      </h2>
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 300,
          fontSize: 14,
          color: '#888',
          lineHeight: 1.5,
          maxWidth: 480,
          margin: '0 auto 24px auto',
        }}
      >
        {brand
          ? `${brand} is newer — fewer providers list prices publicly yet.`
          : `Be the first to share what people actually pay near you.`}
      </p>

      {loading ? (
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: '#B8A89A',
            marginBottom: 24,
          }}
        >
          Looking for nearby cities&hellip;
        </p>
      ) : nearby.length > 0 ? (
        <div style={{ marginBottom: 24 }}>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              color: '#888',
              marginBottom: 12,
            }}
          >
            Here&rsquo;s what we know from nearby cities
          </p>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              maxWidth: 480,
              margin: '0 auto',
            }}
          >
            {nearby.map((c) => (
              <Link
                key={`${c.city}-${c.state}`}
                to={buildBrowseUrl(c)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: '#FBF9F7',
                  border: '1px solid #EDE8E3',
                  borderRadius: 4,
                  textDecoration: 'none',
                  color: '#111',
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                <span>
                  {c.city}, {c.state}
                  <span style={{ color: '#888', fontWeight: 300 }}>
                    {' '}&middot; {c.count} {c.count === 1 ? 'price' : 'prices'}
                  </span>
                </span>
                <span
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontWeight: 900,
                    fontSize: 16,
                  }}
                >
                  ${c.avg.toLocaleString()}
                  <ArrowRight
                    size={12}
                    style={{ marginLeft: 6, verticalAlign: 'middle', color: '#888' }}
                  />
                </span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* CTAs */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Link
          to={logUrl}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: '#E8347A',
            color: 'white',
            textDecoration: 'none',
            padding: '12px 20px',
            borderRadius: 2,
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          Be the first to share what you paid
          <ArrowRight size={12} />
        </Link>
        <Link
          to={alertUrl}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'transparent',
            color: '#111',
            textDecoration: 'none',
            padding: '8px 14px',
            border: '1px solid #111',
            borderRadius: 2,
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: 10,
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
          }}
        >
          Set a price alert
          <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}

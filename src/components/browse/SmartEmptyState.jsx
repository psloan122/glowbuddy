/*
 * SmartEmptyState — shown when a procedure has no prices in the chosen city.
 *
 * Fetches up to 3 nearby cities (same procedure_type ilike) with at least
 * one active price, computes their average, and lets the user jump to
 * those cities. Falls back to the always-helpful "be the first to share"
 * + "set a price alert" CTAs.
 *
 * Pulls from BOTH `procedures` (patient submissions) and `provider_pricing`
 * (provider menu prices) so the nearby summary reflects every city that
 * actually has data — matching the same union the city report pages use.
 *
 * For neurotoxin queries we filter out flat-rate-area prices the same way
 * the main brand-filter view does (price < $50 = real per-unit; anything
 * higher is almost certainly a "$425 / forehead" row mislabeled as
 * per_unit). Cities that ONLY have flat-rate prices are still surfaced,
 * but the row labels them "per area" so shoppers don't think Botox costs
 * $425/unit.
 */

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import AddProviderModal from '../AddProviderModal';

// Mirrors NEUROTOXIN_PER_UNIT_MAX in priceUtils.js. Real per-unit Botox /
// Dysport / Xeomin / Jeuveau / Daxxify all sit well under $50/unit; any
// neurotoxin row above that is a flat-rate area price in disguise.
const NEUROTOXIN_PER_UNIT_MAX = 50;

function isNeurotoxinSlug(slug, type) {
  const s = String(slug || '').toLowerCase();
  const t = String(type || '').toLowerCase();
  return (
    s === 'neurotoxin' ||
    t.includes('botox') ||
    t.includes('dysport') ||
    t.includes('xeomin') ||
    t.includes('jeuveau') ||
    t.includes('daxxify') ||
    t.includes('neurotoxin') ||
    t.includes('botulinum') ||
    t.includes('neuromodulator')
  );
}

export default function SmartEmptyState({
  procedureLabel,
  procedureSlug,
  procedureType,
  procedureTypes = [],
  brand,
  city,
  state,
}) {
  const navigate = useNavigate();
  const [nearby, setNearby] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

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

      const isNeuro = isNeurotoxinSlug(procedureSlug, types[0]);

      // ── Source 1: patient-submitted procedures ─────────────────────
      let procQ = supabase
        .from('procedures')
        .select('city, state, price_paid')
        .eq('status', 'active');
      if (types.length === 1) procQ = procQ.eq('procedure_type', types[0]);
      else procQ = procQ.in('procedure_type', types);
      if (state) procQ = procQ.eq('state', state);
      if (city) procQ = procQ.not('city', 'ilike', city);
      procQ = procQ.limit(200);

      // ── Source 2: provider-menu pricing ───────────────────────────
      // We always pull a generous slice and apply the per-unit / per-area
      // sorting locally so we can label cities accurately. brand is
      // applied at the DB layer when present so we don't pull every
      // neurotoxin in the state just to filter to Botox.
      let menuQ = supabase
        .from('provider_pricing')
        .select(
          'price, price_label, procedure_type, providers!inner(city, state)',
        )
        .eq('display_suppressed', false)
        .eq('is_active', true);
      if (types.length === 1) menuQ = menuQ.eq('procedure_type', types[0]);
      else menuQ = menuQ.in('procedure_type', types);
      if (brand) menuQ = menuQ.eq('brand', brand);
      if (state) menuQ = menuQ.eq('providers.state', state);
      if (city) menuQ = menuQ.not('providers.city', 'ilike', city);
      menuQ = menuQ.limit(400);

      const [procRes, menuRes] = await Promise.all([procQ, menuQ]);
      if (cancelled) return;

      // perUnit + perArea live in separate buckets so a city with only
      // flat-rate prices can still surface (labeled "per area"), while
      // cities with real per-unit prices show those preferentially.
      const byCity = new Map();
      function bucket(key, cityName, stateCode) {
        if (!byCity.has(key)) {
          byCity.set(key, {
            city: cityName,
            state: stateCode,
            perUnit: [],
            perArea: [],
          });
        }
        return byCity.get(key);
      }

      // procedures table: patient-reported total they paid.
      // For neurotoxin we only trust rows where price < per-unit ceiling;
      // anything higher is a per-session/visit total that can't be
      // averaged into a per-unit comparison without misleading shoppers.
      for (const row of procRes.data || []) {
        if (!row.city || !row.state) continue;
        const n = Number(row.price_paid);
        if (!Number.isFinite(n) || n <= 0) continue;
        const key = `${row.city}|${row.state}`;
        const b = bucket(key, row.city, row.state);
        if (isNeuro) {
          if (n < NEUROTOXIN_PER_UNIT_MAX) b.perUnit.push(n);
          else b.perArea.push(n);
        } else {
          b.perUnit.push(n);
        }
      }

      // provider_pricing: explicit price_label tells us per_unit vs not.
      // Mirror priceUtils.normalizePrice rules:
      //   per_unit + neurotoxin + price > 50  → flat_rate_area
      //   per_unit otherwise                  → per_unit
      //   anything else                       → ignored (only the
      //   four canonical labels round-trip as comparable values).
      for (const row of menuRes.data || []) {
        const provider = row.providers;
        if (!provider?.city || !provider?.state) continue;
        const n = Number(row.price);
        if (!Number.isFinite(n) || n <= 0) continue;
        const label = String(row.price_label || '').toLowerCase().trim();
        if (label !== 'per_unit') continue;
        const key = `${provider.city}|${provider.state}`;
        const b = bucket(key, provider.city, provider.state);
        if (isNeuro && n > NEUROTOXIN_PER_UNIT_MAX) {
          b.perArea.push(n);
        } else {
          b.perUnit.push(n);
        }
      }

      const list = [...byCity.values()]
        .map((c) => {
          // Prefer per-unit averages so nearby Coral Gables shows real
          // $14/unit data instead of "$408" flat-rate noise. Only fall
          // back to per-area when nothing else exists.
          const usePerUnit = c.perUnit.length > 0;
          const prices = usePerUnit ? c.perUnit : c.perArea;
          if (prices.length === 0) return null;
          const avg = Math.round(
            prices.reduce((a, b) => a + b, 0) / prices.length,
          );
          return {
            city: c.city,
            state: c.state,
            count: prices.length,
            avg,
            perArea: !usePerUnit,
          };
        })
        .filter(Boolean)
        .sort((a, b) => {
          // Per-unit cities always rank above per-area-only cities.
          if (a.perArea !== b.perArea) return a.perArea ? 1 : -1;
          return b.count - a.count;
        })
        .slice(0, 3);

      setNearby(list);
      setLoading(false);
    }

    fetchNearby();
    return () => {
      cancelled = true;
    };
  }, [procedureType, procedureSlug, city, state, brand, JSON.stringify(procedureTypes)]); // eslint-disable-line react-hooks/exhaustive-deps

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
        {cityLabel
          ? `No providers in ${cityLabel} have shared ${headBrand} prices yet.`
          : `No ${headBrand} prices yet — be the first to share what you paid.`}
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
                  {c.perArea && (
                    <span
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontWeight: 400,
                        fontSize: 11,
                        color: '#888',
                        marginLeft: 4,
                      }}
                    >
                      / area
                    </span>
                  )}
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

      {/* Consumer CTA — add a provider */}
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 12,
          color: '#888',
          marginTop: 24,
        }}
      >
        Don&rsquo;t see your provider?{' '}
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: '#C94F78',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 'inherit',
          }}
        >
          Add them so you can log your price &rarr;
        </button>
      </p>

      {/* Provider CTA */}
      <p
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 12,
          color: '#888',
          marginTop: 8,
        }}
      >
        Is this your business?{' '}
        <Link
          to="/business/add"
          style={{ color: '#C94F78', fontWeight: 600, textDecoration: 'none' }}
        >
          Get listed free &rarr;
        </Link>
      </p>

      {/* Add Provider Modal */}
      {showAddModal && (
        <AddProviderModal
          onClose={() => setShowAddModal(false)}
          onSuccess={(provider) => {
            setShowAddModal(false);
            navigate(`/log?provider_id=${provider.id}&provider=${encodeURIComponent(provider.name)}&city=${encodeURIComponent(provider.city)}&state=${encodeURIComponent(provider.state)}`);
          }}
        />
      )}
    </div>
  );
}

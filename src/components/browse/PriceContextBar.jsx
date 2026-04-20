/*
 * PriceContextBar — narrow stat strip rendered above the results list.
 *
 * Format: "{brand} in {city} · ${min}–${max}/unit · Avg ${avg}/unit"
 *         or "… · Not enough data yet" when N < 5.
 *
 * Provider count is the number of *distinct providers*, not the number
 * of price rows — so a single provider with two products (e.g.
 * Botox + Jeuveau) reads "1 provider" and not "2 providers".
 *
 * The avg portion uses Playfair Display 700 16px so it pops against the
 * Outfit 13px gray surrounding text. Renders the location/count line
 * even when no usable per-unit prices exist — that case used to bail
 * silently which made it look like the bar was missing entirely.
 */

import { memo } from 'react';

export default memo(function PriceContextBar({
  prices,
  brandLabel,
  city,
  state,
  cityStats,   // optional — from get_provider_price_summary RPC (trimmed mean, p25/p75, min, max, isReliable)
}) {
  if (!prices || prices.length === 0) return null;

  // Two-gate check: hasRpcStats verifies we have any data at all
  // (sampleSize > 0), isReliable verifies we have enough for an
  // average (N >= 5). Both must be true before showing avgPrice.
  // See docs/data-quality-decisions.md §4.
  const hasRpcStats = cityStats != null && cityStats.sampleSize > 0;

  // isReliable is sent by the RPC (migration 091); fall back to local
  // sampleSize check for older RPC versions that predate the field.
  // trimmedMean being non-null is also required (RPC nulls it at N < 5).
  const isReliable = hasRpcStats &&
    (cityStats.isReliable ?? cityStats.sampleSize >= 5) &&
    cityStats.trimmedMean != null;

  // Only per-unit prices participate in the min/max/avg stats.
  // Including per-session ($300) or flat packages inflates the average
  // by 10-20x (e.g. "$211/unit" instead of ~$15/unit for Botox).
  const numericPrices = hasRpcStats
    ? []   // RPC path skips per-row computation
    : prices
        .filter((p) => p.normalized_compare_unit === 'per unit')
        .map((p) => {
          const n = Number(p.normalized_compare_value);
          return Number.isFinite(n) && n > 0 ? n : null;
        })
        .filter((n) => n != null);

  // Count distinct providers, not rows. Falls back to provider_name+city
  // for the (rare) patient submissions that don't have a provider_id yet.
  const providerKeys = new Set(
    prices
      .map((p) => p.provider_id || `${p.provider_name}|${p.city}|${p.state}`)
      .filter(Boolean),
  );
  const providerCount = providerKeys.size || prices.length;

  const hasNumericPrices = hasRpcStats || numericPrices.length > 0;
  const minPrice = hasRpcStats ? cityStats.min : (numericPrices.length > 0 ? Math.min(...numericPrices) : null);
  const maxPrice = hasRpcStats ? cityStats.max : (numericPrices.length > 0 ? Math.max(...numericPrices) : null);

  // avgPrice is null when N < 5 — the "Not enough data yet" branch renders instead.
  const avgPrice = isReliable
    ? Math.round(cityStats.trimmedMean)
    : (numericPrices.length >= 5
        ? Math.round(numericPrices.reduce((sum, p) => sum + p, 0) / numericPrices.length)
        : null);

  // Stats are per-unit only, so the suffix is always /unit.
  const unitSuffix = '/unit';

  const locationStr = city && state ? `${city}, ${state}` : city || '';
  const headLabel = brandLabel || 'Treatments';

  const fmtMoney = (n) =>
    Number.isInteger(n) || n >= 100
      ? `$${Math.round(n).toLocaleString()}`
      : `$${n.toFixed(2)}`;

  return (
    <div
      style={{
        background: '#FBF9F7',
        borderBottom: '1px solid #EDE8E3',
        padding: '10px 20px',
        fontFamily: 'var(--font-body)',
        fontSize: 13,
        fontWeight: 400,
        color: '#888',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 8,
        lineHeight: 1.4,
      }}
    >
      <span>
        <strong style={{ color: '#111', fontWeight: 600 }}>{headLabel}</strong>
        {locationStr && (
          <>
            {' in '}
            <strong style={{ color: '#111', fontWeight: 600 }}>{locationStr}</strong>
          </>
        )}
      </span>
      {hasNumericPrices && (
        <>
          <span style={{ color: '#D6CFC6' }}>·</span>
          <span>
            {fmtMoney(minPrice)}&ndash;{fmtMoney(maxPrice)}
            {unitSuffix}
          </span>
          <span style={{ color: '#D6CFC6' }}>·</span>
          {avgPrice != null ? (
            <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
              <span>Avg</span>
              <span
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontWeight: 700,
                  fontSize: 16,
                  color: '#111',
                  lineHeight: 1,
                }}
              >
                {fmtMoney(avgPrice)}
              </span>
              <span>{unitSuffix}</span>
            </span>
          ) : (
            <span
              title="We show averages only when we have at least 5 verified prices for a city. Until then, individual provider prices are still visible on the map."
              style={{
                color: '#BBB4AC',
                fontStyle: 'italic',
                cursor: 'help',
                borderBottom: '1px dotted #BBB4AC',
              }}
            >
              Not enough data yet
            </span>
          )}
        </>
      )}
    </div>
  );
});

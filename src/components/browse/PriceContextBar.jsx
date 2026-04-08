/*
 * PriceContextBar — narrow stat strip rendered above the results list.
 *
 * Format: "{brand} in {city} · {count} providers · ${min}–${max}/unit · Avg ${avg}/unit"
 *
 * The avg portion uses Playfair Display 700 16px so it pops against the
 * Outfit 13px gray surrounding text. Hidden when there are zero prices —
 * the SmartEmptyState component handles that case instead.
 */

export default function PriceContextBar({
  prices,
  brandLabel,
  city,
  state,
}) {
  if (!prices || prices.length === 0) return null;

  const numericPrices = prices
    .map((p) => {
      const n = Number(
        p.normalized_compare_value != null && Number.isFinite(Number(p.normalized_compare_value))
          ? p.normalized_compare_value
          : p.price_paid,
      );
      return Number.isFinite(n) && n > 0 ? n : null;
    })
    .filter((n) => n != null);

  if (numericPrices.length === 0) return null;

  const minPrice = Math.min(...numericPrices);
  const maxPrice = Math.max(...numericPrices);
  const avgPrice = Math.round(
    numericPrices.reduce((sum, p) => sum + p, 0) / numericPrices.length,
  );

  // Use the comparable unit from the first row that has one — most rows
  // in a single result set share the same unit (per unit / per syringe /
  // per session). Falls back to "/unit" because that's the most common.
  const sampleUnit =
    prices.find((p) => p.normalized_compare_unit)?.normalized_compare_unit ||
    'per unit';
  const unitSuffix = sampleUnit === 'per unit' ? '/unit' : ` ${sampleUnit}`;

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
      <span style={{ color: '#D6CFC6' }}>·</span>
      <span>
        {prices.length} {prices.length === 1 ? 'provider' : 'providers'}
      </span>
      <span style={{ color: '#D6CFC6' }}>·</span>
      <span>
        {fmtMoney(minPrice)}&ndash;{fmtMoney(maxPrice)}
        {unitSuffix}
      </span>
      <span style={{ color: '#D6CFC6' }}>·</span>
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
    </div>
  );
}

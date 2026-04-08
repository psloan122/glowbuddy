/*
 * SavingsCallout — green "BEST PRICE IN {city}" banner.
 *
 * Only rendered when the lowest price in the result set is 20%+ below
 * the city average. The parent (FindPrices) decides whether to render
 * this and supplies the savings/units/price/avg/city props.
 */

export default function SavingsCallout({
  city,
  savings,
  units,
  price,
  avg,
}) {
  const cityLabel = (city || '').toUpperCase();

  const fmt = (n) => {
    const v = Number(n) || 0;
    if (v >= 100 || Number.isInteger(v)) return `$${Math.round(v).toLocaleString()}`;
    return `$${v.toFixed(2)}`;
  };

  return (
    <div
      role="status"
      style={{
        background: '#E1F5EE',
        border: '1px solid #9FE1CB',
        borderLeft: '4px solid #1D9E75',
        borderRadius: 4,
        padding: '12px 16px',
        marginBottom: 12,
        maxWidth: 860,
        marginLeft: 'auto',
        marginRight: 'auto',
        width: '100%',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontWeight: 700,
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: '#085041',
        }}
      >
        Best price{cityLabel ? ` in ${cityLabel}` : ''}
      </span>
      <div
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 18,
          fontWeight: 900,
          color: '#085041',
          lineHeight: 1.2,
          marginTop: 2,
        }}
      >
        Save {fmt(savings)} vs average
      </div>
      {units != null && price != null && avg != null && (
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: '#1D9E75',
            marginTop: 2,
          }}
        >
          Based on {units} units at {fmt(price)}/unit vs {fmt(avg)}/unit avg
        </div>
      )}
    </div>
  );
}

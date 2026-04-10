import { Link } from 'react-router-dom';
import { providerProfileUrl } from '../lib/slugify';
import { haversineMiles, formatMiles } from '../lib/distance';
import { getProcedureLabel } from '../lib/procedureLabel';

// MultiProcedureProviderCard — one editorial card showing a single provider
// with all the rows that matched the user's treatment preferences on the
// personalized browse view. This is intentionally different from
// ProcedureCard: the provider is the unit of display, and each matched
// procedure becomes a row inside the card (brand, price, subtext).
//
// Props:
//   entry         — { provider, prices, matchCount, minPrice } from
//                   FindPrices.jsx's personalized grouping
//   targetCount   — total number of distinct preferences the user saved
//                   (drives the "OFFERS ALL N" / "OFFERS M OF N" badge)
//
// The card intentionally avoids calling into fairPriceAvgs or the full
// normalizePrice pipeline — the goal here is a fast scannable comparison,
// not the exhaustive per-row analytics the regular ProcedureCard provides.

function formatRowLabel(row) {
  // Brand wins when available ("BOTOX" over "NEUROTOXIN"). Falls back to
  // a clean category label — never the combined "Botox / Dysport /
  // Xeomin" procedure_type string. See src/lib/procedureLabel.js.
  return getProcedureLabel(row.procedure_type, row.brand).toUpperCase();
}

const INTERNAL_LABELS = new Set(['range_low', 'range_high', 'hidden']);

function formatPriceLabel(row) {
  const unitLabel = row.price_label || null;
  if (!unitLabel) return null;
  const lower = unitLabel.toLowerCase();
  // Suppress internal-only labels that should never reach the UI.
  if (INTERNAL_LABELS.has(lower)) return null;
  return lower;
}

function formatPriceDisplay(row) {
  const n = Number(row.price);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return `$${Math.round(n).toLocaleString()}`;
}

export default function MultiProcedureProviderCard({ entry, targetCount, userLat, userLng }) {
  const { provider, prices: rawPrices, matchCount } = entry;
  // Filter out internal-only rows that bypassed normalizePrice().
  const prices = rawPrices.filter((p) => {
    const label = (p.price_label || '').toLowerCase();
    if (INTERNAL_LABELS.has(label)) return false;
    return Number.isFinite(Number(p.price)) && Number(p.price) > 0;
  });

  const badgeLabel = (() => {
    if (!targetCount || targetCount < 2) return null;
    if (matchCount >= targetCount) return `OFFERS ALL ${targetCount}`;
    return `OFFERS ${matchCount} OF ${targetCount}`;
  })();

  const profileHref =
    providerProfileUrl(provider.slug, provider.name, provider.city, provider.state) ||
    '#';

  // Distance badge ("· 4.2 mi") rendered next to the city/state line in
  // the provider header. Resolves to null when either coordinate pair is
  // missing — we never render a broken badge.
  const distanceLabel = formatMiles(
    haversineMiles(userLat, userLng, provider.lat, provider.lng),
  );

  return (
    <div
      className="flex flex-col"
      style={{
        background: '#fff',
        border: '1px solid #EDE8E3',
        borderTop: '3px solid #E8347A',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      {/* Provider header */}
      <div
        className="flex items-start justify-between gap-3"
        style={{ padding: '16px 18px', borderBottom: '1px solid #F0EBE6' }}
      >
        <div className="min-w-0">
          <h3
            className="truncate"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '16px',
              color: '#111',
              lineHeight: 1.2,
            }}
          >
            {provider.name}
          </h3>
          <p
            className="truncate mt-0.5"
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 300,
              fontSize: '12px',
              color: '#B8A89A',
            }}
          >
            {[provider.city, provider.state].filter(Boolean).join(', ')}
            {distanceLabel && (
              <span> &middot; {distanceLabel}</span>
            )}
          </p>
        </div>
        {badgeLabel && (
          <span
            className="shrink-0 inline-flex items-center"
            style={{
              background: '#F0FAF5',
              color: '#1A7A3A',
              padding: '4px 8px',
              borderRadius: '2px',
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
              fontSize: '9px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            {badgeLabel}
          </span>
        )}
      </div>

      {/* Procedure rows */}
      <div>
        {prices.map((row, idx) => {
          const label = formatRowLabel(row);
          const subLabel = formatPriceLabel(row);
          const price = formatPriceDisplay(row);
          return (
            <div
              key={row.id || `${row.provider_id}-${idx}`}
              className="flex items-center justify-between gap-3"
              style={{
                padding: '12px 18px',
                borderBottom: '1px solid #F5F0EC',
              }}
            >
              <div className="min-w-0">
                <p
                  className="truncate"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontWeight: 700,
                    fontSize: '10px',
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase',
                    color: '#E8347A',
                  }}
                >
                  {label}
                </p>
                {subLabel && (
                  <p
                    className="truncate mt-0.5"
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontWeight: 300,
                      fontSize: '11px',
                      color: '#B8A89A',
                    }}
                  >
                    {subLabel}
                  </p>
                )}
              </div>
              <p
                className="shrink-0"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 900,
                  fontSize: '22px',
                  color: '#111',
                  lineHeight: 1,
                }}
              >
                {price}
              </p>
            </div>
          );
        })}
      </div>

      {/* Footer link */}
      <Link
        to={profileHref}
        className="text-center hover:bg-cream transition-colors"
        style={{
          padding: '12px 18px',
          fontFamily: 'var(--font-body)',
          fontWeight: 500,
          fontSize: '12px',
          color: '#E8347A',
          letterSpacing: '0.04em',
          textDecoration: 'none',
        }}
      >
        View full menu &rarr;
      </Link>
    </div>
  );
}

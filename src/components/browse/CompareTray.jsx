/*
 * CompareTray — slides up from the bottom when 2+ providers are selected.
 *
 * Shows a comparison table with one column per provider (max 3) and rows
 * for: price, rating, verified, distance. Each column has a hot-pink BOOK
 * button that links to the provider's profile.
 *
 * Position: fixed, bottom: 80px on mobile (above the bottom nav) and
 * bottom: 24px on desktop. Sliding-up animation handled via CSS keyframe.
 */

import { memo } from 'react';
import { Link } from 'react-router-dom';
import { X, Star, ShieldCheck, ArrowRight } from 'lucide-react';
import { providerProfileUrl } from '../../lib/slugify';
import { haversineMiles, formatMiles } from '../../lib/distance';

function fmtPrice(n) {
  const v = Number(n) || 0;
  return `$${Math.round(v).toLocaleString()}`;
}

export default memo(function CompareTray({
  providers = [],
  onClear,
  onRemove,
  userLat,
  userLng,
}) {
  if (!providers || providers.length < 2) return null;

  return (
    <>
      <style>{`
        @keyframes compare-slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .compare-tray { animation: compare-slide-up 220ms cubic-bezier(.2,.8,.2,1); }
        @media (max-width: 767px) {
          .compare-tray { bottom: 80px !important; left: 8px !important; right: 8px !important; }
          .compare-tray-table th, .compare-tray-table td {
            padding: 8px 6px !important;
            font-size: 11px !important;
          }
        }
      `}</style>
      <div
        className="compare-tray"
        role="region"
        aria-label="Compare providers"
        style={{
          position: 'fixed',
          bottom: 24,
          left: 24,
          right: 24,
          maxWidth: 960,
          marginLeft: 'auto',
          marginRight: 'auto',
          background: 'white',
          borderTop: '3px solid #E8347A',
          border: '1px solid #EDE8E3',
          borderRadius: 4,
          boxShadow: '0 -8px 32px rgba(28, 20, 16, 0.15)',
          padding: '16px 20px',
          zIndex: 200,
          minHeight: 80,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-body)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#E8347A',
            }}
          >
            Comparing {providers.length} providers
          </p>
          <button
            type="button"
            onClick={onClear}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              background: 'transparent',
              border: 'none',
              color: '#888',
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
              padding: 4,
            }}
            aria-label="Clear comparison"
          >
            Clear comparison
            <X size={14} />
          </button>
        </div>

        {/* Comparison table */}
        <div style={{ overflowX: 'auto' }}>
          <table
            className="compare-tray-table"
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontFamily: 'var(--font-body)',
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: 'left',
                    padding: '8px 12px',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#888',
                    borderBottom: '1px solid #EDE8E3',
                    width: 100,
                  }}
                />
                {providers.map((p) => (
                  <th
                    key={p.id}
                    style={{
                      textAlign: 'left',
                      padding: '8px 12px',
                      fontSize: 12,
                      fontWeight: 700,
                      color: '#111',
                      borderBottom: '1px solid #EDE8E3',
                      verticalAlign: 'top',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 6,
                      }}
                    >
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: 180,
                        }}
                      >
                        {p.provider_name}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemove?.(p)}
                        aria-label={`Remove ${p.provider_name} from comparison`}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#B8A89A',
                          cursor: 'pointer',
                          padding: 0,
                          flexShrink: 0,
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td
                  style={{
                    padding: '8px 12px',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#888',
                  }}
                >
                  Price
                </td>
                {providers.map((p) => (
                  <td
                    key={p.id}
                    style={{
                      padding: '8px 12px',
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontWeight: 900,
                      fontSize: 18,
                      color: '#111',
                    }}
                  >
                    {p.normalized_display || fmtPrice(p.price_paid)}
                  </td>
                ))}
              </tr>
              <tr>
                <td
                  style={{
                    padding: '8px 12px',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#888',
                  }}
                >
                  Rating
                </td>
                {providers.map((p) => (
                  <td
                    key={p.id}
                    style={{
                      padding: '8px 12px',
                      fontSize: 12,
                      color: '#111',
                    }}
                  >
                    {p.rating != null ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Star size={12} fill="#F5B301" stroke="#F5B301" />
                        {Number(p.rating).toFixed(1)}
                      </span>
                    ) : (
                      <span style={{ color: '#B8A89A' }}>&mdash;</span>
                    )}
                  </td>
                ))}
              </tr>
              <tr>
                <td
                  style={{
                    padding: '8px 12px',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#888',
                  }}
                >
                  Verified
                </td>
                {providers.map((p) => {
                  const verified = p._verified === true || p.receipt_verified === true;
                  return (
                    <td
                      key={p.id}
                      style={{ padding: '8px 12px', fontSize: 12, color: '#111' }}
                    >
                      {verified ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            color: '#1A7A3A',
                            fontWeight: 600,
                          }}
                        >
                          <ShieldCheck size={12} />
                          Yes
                        </span>
                      ) : (
                        <span style={{ color: '#B8A89A' }}>&mdash;</span>
                      )}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td
                  style={{
                    padding: '8px 12px',
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#888',
                  }}
                >
                  Distance
                </td>
                {providers.map((p) => {
                  const d = formatMiles(
                    haversineMiles(userLat, userLng, p.provider_lat, p.provider_lng),
                  );
                  return (
                    <td
                      key={p.id}
                      style={{ padding: '8px 12px', fontSize: 12, color: '#111' }}
                    >
                      {d || <span style={{ color: '#B8A89A' }}>&mdash;</span>}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <td />
                {providers.map((p) => {
                  const url = providerProfileUrl(
                    p.provider_slug,
                    p.provider_name,
                    p.city,
                    p.state,
                  );
                  return (
                    <td key={p.id} style={{ padding: '12px 12px 0 12px' }}>
                      {url ? (
                        <Link
                          to={url}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '10px 14px',
                            background: '#E8347A',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: 2,
                            fontFamily: 'var(--font-body)',
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: '0.10em',
                            textTransform: 'uppercase',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Book at {p.provider_name?.split(' ')[0] || 'provider'}
                          <ArrowRight size={12} />
                        </Link>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
});

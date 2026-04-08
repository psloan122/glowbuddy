/*
 * ProviderBottomSheet — slides up from the bottom of the map on mobile
 * when a pin is tapped.
 *
 * The point of this component is to keep the user on the map. The old
 * pattern (tap pin → navigate to provider profile → hit back button →
 * map has reset) destroyed map state on every interaction. Now the
 * sheet shows enough info to decide (provider name, rating, top prices,
 * "View full menu" CTA) without leaving the map context.
 *
 * The sheet is `position: absolute` inside the map container so it
 * scrolls/zooms with the map and never escapes its parent. Tapping the
 * backdrop dismisses it.
 */

import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Star, X, ArrowRight } from 'lucide-react';
import { providerProfileUrl } from '../../lib/slugify';
import { getProcedureLabel } from '../../lib/procedureLabel';

function fmtPrice(n) {
  const v = Number(n) || 0;
  if (v >= 100 || Number.isInteger(v)) return `$${Math.round(v).toLocaleString()}`;
  return `$${v.toFixed(2)}`;
}

export default function ProviderBottomSheet({ group, onClose }) {
  // Lock body scroll while the sheet is open so background page swipes
  // don't compete with the sheet's tap targets on iOS.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Esc to close — keyboard parity with the backdrop tap.
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Top 3 price rows for this provider, sorted lowest first.
  const topRows = useMemo(() => {
    const rows = (group?.rows || [])
      .slice()
      .sort((a, b) => {
        const av = Number(a.price_paid) || 0;
        const bv = Number(b.price_paid) || 0;
        return av - bv;
      })
      .slice(0, 3);
    return rows;
  }, [group]);

  if (!group) return null;

  const profileUrl = providerProfileUrl(
    group.provider_slug,
    group.provider_name,
    group.city,
    group.state,
  );

  const logUrl = (() => {
    const params = new URLSearchParams();
    params.set('provider', group.provider_name || '');
    if (group.city) params.set('city', group.city);
    if (group.state) params.set('state', group.state);
    return `/log?${params.toString()}`;
  })();

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 300,
        background: 'rgba(17,17,17,0.20)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Provider details for ${group.provider_name}`}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          background: 'white',
          borderRadius: '12px 12px 0 0',
          borderTop: '3px solid #E8347A',
          padding: '14px 20px calc(28px + env(safe-area-inset-bottom, 0px))',
          zIndex: 301,
          boxShadow: '0 -8px 24px rgba(0,0,0,0.12)',
          animation: 'slideUp 0.22s ease-out',
          maxHeight: '60%',
          overflowY: 'auto',
        }}
      >
        {/* Drag handle */}
        <div
          aria-hidden
          style={{
            width: 40,
            height: 4,
            background: '#EDE8E3',
            borderRadius: 2,
            margin: '0 auto 12px',
          }}
        />

        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 900,
                fontSize: 18,
                color: '#111',
                lineHeight: 1.2,
                marginBottom: 4,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {group.provider_name}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 300,
                fontSize: 12,
                color: '#888',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {group.city && group.state && (
                <span>
                  {group.city}, {group.state}
                </span>
              )}
              {group.rating != null && (
                <>
                  <span style={{ color: '#D6CFC6' }}>·</span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      color: '#111',
                      fontWeight: 600,
                    }}
                  >
                    <Star size={12} fill="#F5B301" stroke="#F5B301" />
                    {Number(group.rating).toFixed(1)}
                  </span>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'none',
              border: 'none',
              padding: 6,
              margin: -6,
              cursor: 'pointer',
              color: '#888',
              display: 'inline-flex',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Prices */}
        {topRows.length > 0 ? (
          <div
            style={{
              borderTop: '1px solid #F0EBE6',
              paddingTop: 12,
              marginBottom: 16,
            }}
          >
            {topRows.map((row, i) => {
              const label = getProcedureLabel(row.procedure_type, row.brand);
              const display = row.normalized_display || fmtPrice(row.price_paid);
              const unit =
                row.units_or_volume ||
                (row.normalized_compare_unit === 'per unit' ? '/unit' : null);
              return (
                <div
                  key={row.id || `${row.procedure_type}-${i}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: 8,
                    marginBottom: i < topRows.length - 1 ? 8 : 0,
                    borderBottom: i < topRows.length - 1 ? '1px solid #F5F0EC' : 'none',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontWeight: 700,
                      fontSize: 10,
                      letterSpacing: '0.10em',
                      textTransform: 'uppercase',
                      color: '#E8347A',
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontWeight: 900,
                      fontSize: 18,
                      color: '#111',
                    }}
                  >
                    {display}
                    {unit && (
                      <span
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontWeight: 300,
                          fontSize: 11,
                          color: '#888',
                          marginLeft: 4,
                        }}
                      >
                        {unit}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              padding: '12px 0 16px',
              fontFamily: 'var(--font-body)',
              fontWeight: 300,
              fontStyle: 'italic',
              fontSize: 13,
              color: '#888',
            }}
          >
            No prices logged here yet.
          </div>
        )}

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 10 }}>
          {profileUrl ? (
            <Link
              to={profileUrl}
              style={{
                flex: 1,
                background: '#E8347A',
                color: 'white',
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '12px',
                borderRadius: 2,
                textDecoration: 'none',
                textAlign: 'center',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              View full menu
              <ArrowRight size={12} />
            </Link>
          ) : (
            <span
              style={{
                flex: 1,
                background: '#F5F2EE',
                color: '#888',
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '12px',
                borderRadius: 2,
                textAlign: 'center',
              }}
            >
              No menu yet
            </span>
          )}

          <Link
            to={logUrl}
            style={{
              flex: 1,
              background: 'transparent',
              color: '#E8347A',
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '12px',
              borderRadius: 2,
              border: '1px solid #E8347A',
              textDecoration: 'none',
              textAlign: 'center',
              display: 'block',
            }}
          >
            Log a price
          </Link>
        </div>
      </div>
    </div>
  );
}

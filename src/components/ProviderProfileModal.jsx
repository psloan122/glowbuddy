/*
 * ProviderProfileModal — Airbnb-style profile card shown when a map pin
 * is clicked in priced mode (treatment selected).
 *
 * Mobile:  slides up from the bottom, max-height 70dvh, full-width.
 * Desktop: positioned bottom-left inside the map container, 380px wide.
 *
 * Receives a `group` object from GlowMap's marker reconciliation —
 * the same shape ProviderBottomSheet uses:
 *   { provider_id, provider_name, provider_slug, city, state,
 *     rating, google_review_count, rows, bestRow, bestPrice }
 */

import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Star, X, ArrowRight, Heart, ChevronRight } from 'lucide-react';
import { providerProfileUrl } from '../lib/slugify';
import { getProcedureLabel, getProcedureDetail } from '../lib/procedureLabel';
import { normalizePrice } from '../lib/priceUtils';

function fmtPrice(n) {
  const v = Number(n) || 0;
  if (v >= 100 || Number.isInteger(v)) return `$${Math.round(v).toLocaleString()}`;
  return `$${v.toFixed(2)}`;
}

function providerInitials(name) {
  if (!name) return '?';
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

function VsAvgBadge({ price, avg }) {
  if (avg == null || price == null || avg <= 0) return null;
  const pct = Math.round(((price - avg) / avg) * 100);
  if (pct === 0) return null;
  const below = pct < 0;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 6px',
        borderRadius: 2,
        background: below ? '#E8F5E9' : '#FFF3E0',
        color: below ? '#2E7D32' : '#E65100',
        fontFamily: 'var(--font-body)',
        fontWeight: 600,
        fontSize: 9,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {below ? `${Math.abs(pct)}% below avg` : `${pct}% above avg`}
    </span>
  );
}

export default function ProviderProfileModal({
  group,
  onClose,
  isMobile = false,
  cityAvg,
  isSaved,
  onToggleSave,
  onDosingClick,
}) {
  // Esc to close
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Top price rows, sorted lowest first, max 6. Each row is enriched
  // with a clean label and optional treatment area subtitle so duplicate
  // treatment names are distinguishable.
  const topRows = useMemo(() => {
    const rows = (group?.rows || [])
      .filter((r) => {
        // Drop rows flagged as hidden by normalizePrice or carrying
        // internal-only price_label values (range_low, range_high).
        if (r.normalized_category === 'hidden') return false;
        const label = (r.price_label || '').toLowerCase();
        return label !== 'range_low' && label !== 'range_high';
      })
      .sort((a, b) => {
        const av = Number(a.normalized_compare_value ?? a.price_paid) || 0;
        const bv = Number(b.normalized_compare_value ?? b.price_paid) || 0;
        return av - bv;
      })
      .slice(0, 6);
    // Enrich each row with display-safe fields
    return rows.map((row) => {
      const label = getProcedureLabel(row.procedure_type, row.brand);
      const area = getProcedureDetail(row);
      const normalized = normalizePrice(row);
      if (normalized.category === 'hidden') return null;
      const display = normalized.displayPrice || row.normalized_display || fmtPrice(row.price_paid);
      const compareValue = normalized.comparableValue ?? Number(row.normalized_compare_value);
      const priceLabel = (row.price_label || row.normalized_compare_unit || '').toLowerCase();
      const isUnitPriced = priceLabel.includes('unit') || priceLabel.includes('syringe') || priceLabel.includes('vial');
      return { ...row, _label: label, _area: area, _display: display, _compareValue: compareValue, _isUnitPriced: isUnitPriced };
    }).filter(Boolean);
  }, [group]);

  // Detect if the same treatment label appears multiple times — if so
  // we'll show a small helper note and use treatment area to distinguish.
  const hasMultipleSameLabel = useMemo(() => {
    const counts = {};
    for (const r of topRows) {
      counts[r._label] = (counts[r._label] || 0) + 1;
    }
    return Object.values(counts).some((c) => c > 1);
  }, [topRows]);

  if (!group) return null;

  const profileUrl = providerProfileUrl(
    group.provider_slug,
    group.provider_name,
    group.city,
    group.state,
  );

  const initials = providerInitials(group.provider_name);

  // Desktop: positioned inside map container. Mobile: fixed bottom.
  const containerStyle = isMobile
    ? {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        maxHeight: '70dvh',
        overflowY: 'auto',
        background: 'white',
        borderRadius: '16px 16px 0 0',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
        animation: 'slideUp 0.25s ease-out',
        padding: '12px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
      }
    : {
        position: 'absolute',
        bottom: 24,
        left: 24,
        width: 380,
        maxHeight: 520,
        overflowY: 'auto',
        zIndex: 50,
        background: 'white',
        borderRadius: 12,
        boxShadow: '0 4px 24px rgba(0,0,0,0.14)',
        animation: 'slideUp 0.25s ease-out',
        padding: '16px 20px 20px',
      };

  return (
    <>
      {/* Backdrop — only on mobile */}
      {isMobile && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 49,
            background: 'rgba(17,17,17,0.15)',
          }}
        />
      )}

      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={`Provider details for ${group.provider_name}`}
        style={containerStyle}
      >
        {/* Drag handle — mobile only */}
        {isMobile && (
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
        )}

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: isMobile ? 14 : 12,
            right: 12,
            background: 'none',
            border: 'none',
            padding: 6,
            cursor: 'pointer',
            color: '#888',
            display: 'inline-flex',
            zIndex: 2,
          }}
        >
          <X size={18} />
        </button>

        {/* Header: Avatar + Name + Location + Rating */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, paddingRight: 28 }}>
          {/* Avatar circle */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: '#F5F0EC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 900,
              fontSize: 16,
              color: '#B8A89A',
              flexShrink: 0,
            }}
          >
            {initials}
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 900,
                fontSize: 17,
                color: '#111',
                lineHeight: 1.2,
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
                marginTop: 2,
              }}
            >
              {group.city && group.state && (
                <span>{group.city}, {group.state}</span>
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
                  {group.google_review_count != null && (
                    <span style={{ color: '#B8A89A', fontWeight: 400 }}>
                      ({group.google_review_count})
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #F0EBE6', margin: '0 0 12px' }} />

        {/* Prices */}
        {topRows.length > 0 ? (
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: 9,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#B8A89A',
                marginBottom: hasMultipleSameLabel ? 4 : 10,
              }}
            >
              Prices
            </div>
            {hasMultipleSameLabel && (
              <div
                style={{
                  fontFamily: 'var(--font-body)',
                  fontWeight: 300,
                  fontStyle: 'italic',
                  fontSize: 11,
                  color: '#B8A89A',
                  marginBottom: 10,
                }}
              >
                Different areas, session types, or package sizes.
              </div>
            )}
            {topRows.map((row, i) => (
              <div
                key={row.id || `${row.procedure_type}-${i}`}
                style={{
                  paddingBottom: 8,
                  marginBottom: i < topRows.length - 1 ? 8 : 0,
                  borderBottom: i < topRows.length - 1 ? '1px solid #F5F0EC' : 'none',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
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
                      {row._label}
                    </span>
                    {row._area && (
                      <span
                        style={{
                          fontFamily: 'var(--font-body)',
                          fontWeight: 400,
                          fontSize: 10,
                          color: '#888',
                          marginLeft: 6,
                          textTransform: 'none',
                          letterSpacing: 0,
                        }}
                      >
                        — {row._area}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <VsAvgBadge price={row._compareValue} avg={cityAvg} />
                    <span
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                        fontWeight: 900,
                        fontSize: 17,
                        color: '#111',
                      }}
                    >
                      {row._display}
                    </span>
                  </div>
                </div>
                {row._isUnitPriced && onDosingClick && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDosingClick(row);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 2,
                      marginTop: 4,
                      padding: 0,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#E8347A',
                    }}
                  >
                    How much will I need? <ChevronRight size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              padding: '8px 0 16px',
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

        {/* Divider */}
        <div style={{ borderTop: '1px solid #F0EBE6', margin: '0 0 14px' }} />

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
              View full profile
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
              No profile yet
            </span>
          )}

          <button
            type="button"
            onClick={() => onToggleSave?.()}
            style={{
              padding: '12px 16px',
              border: '1px solid #EDE8E3',
              borderRadius: 2,
              background: 'white',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              fontSize: 11,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: isSaved ? '#E8347A' : '#888',
            }}
          >
            <Heart size={14} fill={isSaved ? '#E8347A' : 'none'} stroke={isSaved ? '#E8347A' : '#888'} />
            {isSaved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>
    </>
  );
}

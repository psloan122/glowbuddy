/*
 * PriceCard — full-width editorial layout used by the rebuilt /browse page.
 *
 * Sections:
 *   1. Header row: avatar + provider name + city  /  verified + rating + reviews
 *   2. Price row: brand label  /  price + unit  /  vs-average badge
 *      Dysport rows get a one-line equivalency note below.
 *   3. Footer row: distance + open status  /  [COMPARE] [SAVE] [VIEW MENU →]
 *
 * Card width: max 860px, centered. Padding 20px 24px. mb 12px.
 */

import { Link } from 'react-router-dom';
import { Heart, Star, ShieldCheck, ArrowRight } from 'lucide-react';
import ProviderAvatar from '../ProviderAvatar';
import { providerProfileUrl } from '../../lib/slugify';
import { getProcedureLabel } from '../../lib/procedureLabel';
import { haversineMiles, formatMiles } from '../../lib/distance';

function fmtPrice(n) {
  const v = Number(n) || 0;
  return `$${Math.round(v).toLocaleString()}`;
}

// vs-average badge: green if below avg, gray if at avg, amber if above.
function VsAverageBadge({ price, avg }) {
  if (!avg || !price) return null;
  const diff = Math.round(((price - avg) / avg) * 100);
  if (Math.abs(diff) < 5) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          fontFamily: 'var(--font-body)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          padding: '4px 8px',
          borderRadius: 2,
          background: '#F5F2EE',
          color: '#666',
          whiteSpace: 'nowrap',
        }}
      >
        At avg
      </span>
    );
  }
  const below = diff < 0;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: 'var(--font-body)',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        padding: '4px 8px',
        borderRadius: 2,
        background: below ? '#E1F5EE' : '#FFF7ED',
        color: below ? '#085041' : '#B45309',
        whiteSpace: 'nowrap',
      }}
    >
      {below ? `${Math.abs(diff)}% below avg` : `${diff}% above avg`}
    </span>
  );
}

export default function PriceCard({
  procedure,
  cityAvg,
  userLat,
  userLng,
  isCompared = false,
  onCompareToggle,
  isSaved = false,
  onSaveToggle,
  comparingFull = false,
  // List ↔ map hover sync. When the parent passes onHoverChange, the
  // card forwards mouse-enter / mouse-leave so the desktop split view
  // can highlight the matching pin. `selected` paints a stronger
  // border ring when the user has tapped this provider's pin on the map.
  onHoverChange,
  selected = false,
}) {
  const profileUrl = providerProfileUrl(
    procedure.provider_slug,
    procedure.provider_name,
    procedure.city,
    procedure.state,
  );

  const cardLabel = getProcedureLabel(procedure.procedure_type, procedure.brand);
  const isVerified =
    procedure._verified === true || procedure.receipt_verified === true;

  const distanceLabel = formatMiles(
    haversineMiles(userLat, userLng, procedure.provider_lat, procedure.provider_lng),
  );

  const displayPrice = procedure.normalized_display
    ? procedure.normalized_display
    : fmtPrice(procedure.price_paid);
  const unitLabel =
    procedure.units_or_volume ||
    (procedure.normalized_compare_unit === 'per unit' ? '/unit' : null);

  // Per-unit value used for the vs-average comparison and the dysport
  // botox-equivalent calculation. Falls back to the raw price_paid.
  const compareValue =
    procedure.normalized_compare_value &&
    Number.isFinite(Number(procedure.normalized_compare_value))
      ? Number(procedure.normalized_compare_value)
      : Number(procedure.price_paid) || 0;

  const isDysport =
    (procedure.brand && String(procedure.brand).toLowerCase() === 'dysport') ||
    /dysport/i.test(procedure.procedure_type || '');

  const reviewCount = Number(procedure.review_count) || 0;

  // Pending-review state — only shown to the submitter themselves.
  // Set on patient submissions whose status is `pending` or
  // `pending_confirmation`. Visual treatment: amber top stripe instead of
  // pink + a "Pending review" pill so the submitter knows their data is
  // saved but awaiting moderation.
  const isPendingSelf = procedure._pending_self === true;

  function handleCompareClick(e) {
    e.preventDefault();
    e.stopPropagation();
    onCompareToggle?.(procedure);
  }

  function handleSaveClick(e) {
    e.preventDefault();
    e.stopPropagation();
    onSaveToggle?.(procedure);
  }

  // Compute the borders so the selected/hovered states stack cleanly
  // on top of the existing pending-self treatment.
  const ringColor = selected
    ? '#111111'
    : isPendingSelf
    ? '#F0D8B8'
    : '#EDE8E3';
  const ringWidth = selected ? 2 : 1;

  return (
    <div
      onMouseEnter={
        onHoverChange ? () => onHoverChange(procedure, true) : undefined
      }
      onMouseLeave={
        onHoverChange ? () => onHoverChange(procedure, false) : undefined
      }
      style={{
        background: isPendingSelf ? '#FFFBF5' : 'white',
        border: `${ringWidth}px solid ${ringColor}`,
        borderTop: `3px solid ${isPendingSelf ? '#B45309' : '#E8347A'}`,
        borderRadius: 8,
        marginBottom: 12,
        padding: '20px 24px',
        maxWidth: 860,
        marginLeft: 'auto',
        marginRight: 'auto',
        width: '100%',
        boxShadow: selected ? '0 4px 12px rgba(0,0,0,0.10)' : 'none',
        transition: 'box-shadow 150ms, border-color 150ms',
      }}
    >
      {isPendingSelf && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 12,
            padding: '6px 10px',
            background: '#FFF3E0',
            border: '1px solid #F0D8B8',
            borderRadius: 4,
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            fontWeight: 600,
            color: '#92400E',
            lineHeight: 1.4,
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              padding: '2px 6px',
              background: '#B45309',
              color: 'white',
              borderRadius: 2,
            }}
          >
            Pending review
          </span>
          <span style={{ fontWeight: 400 }}>
            Your submission is saved and awaiting moderation. Only you can see it.
          </span>
        </div>
      )}
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            minWidth: 0,
            flex: 1,
          }}
        >
          <ProviderAvatar name={procedure.provider_name} size={44} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                fontSize: 15,
                color: '#111',
                lineHeight: 1.3,
                margin: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {procedure.provider_name || 'Unknown provider'}
            </p>
            {procedure.city && procedure.state && (
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontWeight: 300,
                  fontSize: 12,
                  color: '#888',
                  margin: '2px 0 0 0',
                }}
              >
                {procedure.city}, {procedure.state}
              </p>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
          }}
        >
          {isVerified && (
            <span
              title="Verified provider"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '4px 8px',
                background: '#F0FAF5',
                color: '#1A7A3A',
                border: '1px solid #1A7A3A',
                borderRadius: 2,
                fontFamily: 'var(--font-body)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              <ShieldCheck size={11} />
              Verified
            </span>
          )}
          {procedure.rating != null && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                color: '#111',
                fontWeight: 600,
              }}
            >
              <Star size={13} fill="#F5B301" stroke="#F5B301" />
              {Number(procedure.rating).toFixed(1)}
              {reviewCount > 0 && (
                <span style={{ color: '#888', fontWeight: 400 }}>
                  ({reviewCount})
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Price row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '14px 0',
          borderTop: '1px solid #F4F0EB',
          borderBottom: '1px solid #F4F0EB',
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#E8347A',
            minWidth: 80,
          }}
        >
          {cardLabel}
        </span>
        <span
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontWeight: 900,
            fontSize: 28,
            color: '#111',
            lineHeight: 1,
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: 6,
            flex: 1,
            justifyContent: 'center',
            minWidth: 120,
          }}
        >
          {displayPrice}
          {unitLabel && (
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                fontWeight: 300,
                color: '#888',
              }}
            >
              {unitLabel}
            </span>
          )}
        </span>
        <span style={{ flexShrink: 0 }}>
          <VsAverageBadge price={compareValue} avg={cityAvg} />
        </span>
      </div>

      {/* Dysport equivalency note */}
      {isDysport && (
        <p
          style={{
            margin: '8px 0 0 0',
            fontFamily: 'var(--font-body)',
            fontStyle: 'italic',
            fontWeight: 300,
            fontSize: 11,
            color: '#888',
            lineHeight: 1.4,
          }}
          title="Dysport requires ~2.5× more units than Botox for equivalent effect"
        >
          {compareValue > 0
            ? `\u2248 $${(compareValue * 2.5).toFixed(2)} Botox-equivalent (2.5\u00D7 units)`
            : 'Dysport units \u2260 Botox units. Typically 2.5\u00D7 more units needed.'}
        </p>
      )}

      {/* Footer row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginTop: 16,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            fontWeight: 300,
            color: '#888',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {distanceLabel && <span>{distanceLabel}</span>}
          {distanceLabel && procedure.is_open_now && (
            <span style={{ color: '#D6CFC6' }}>·</span>
          )}
          {procedure.is_open_now && (
            <span style={{ color: '#1A7A3A', fontWeight: 600 }}>Open now</span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* COMPARE button */}
          <button
            type="button"
            onClick={handleCompareClick}
            disabled={comparingFull && !isCompared}
            title={
              comparingFull && !isCompared
                ? 'You can compare up to 3 providers at a time'
                : isCompared
                ? 'Remove from comparison'
                : 'Add to comparison'
            }
            style={{
              padding: '8px 12px',
              border: `1px solid ${isCompared ? '#E8347A' : '#DDD'}`,
              background: isCompared ? '#E8347A' : 'white',
              color: isCompared ? 'white' : '#111',
              borderRadius: 2,
              fontFamily: 'var(--font-body)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.10em',
              textTransform: 'uppercase',
              cursor: comparingFull && !isCompared ? 'not-allowed' : 'pointer',
              opacity: comparingFull && !isCompared ? 0.4 : 1,
            }}
          >
            {isCompared ? 'Comparing' : 'Compare'}
          </button>

          {/* SAVE button */}
          <button
            type="button"
            onClick={handleSaveClick}
            title={isSaved ? 'Remove from saved' : 'Save provider'}
            aria-label={isSaved ? 'Remove from saved' : 'Save provider'}
            aria-pressed={isSaved}
            style={{
              width: 36,
              height: 36,
              border: `1px solid ${isSaved ? '#E8347A' : '#DDD'}`,
              background: 'white',
              borderRadius: 2,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Heart
              size={16}
              fill={isSaved ? '#E8347A' : 'none'}
              stroke={isSaved ? '#E8347A' : '#B8A89A'}
              strokeWidth={2}
            />
          </button>

          {/* VIEW MENU link */}
          {profileUrl ? (
            <Link
              to={profileUrl}
              style={{
                padding: '8px 14px',
                background: '#111',
                color: 'white',
                borderRadius: 2,
                fontFamily: 'var(--font-body)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              View menu
              <ArrowRight size={12} />
            </Link>
          ) : (
            <span
              style={{
                padding: '8px 14px',
                background: '#F5F2EE',
                color: '#888',
                borderRadius: 2,
                fontFamily: 'var(--font-body)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
              }}
            >
              View menu
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

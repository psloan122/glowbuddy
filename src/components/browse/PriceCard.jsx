/*
 * PriceCard — provider-grouped editorial card used by the rebuilt /browse page.
 *
 * Sections:
 *   1. Header row (rendered once per provider): avatar + provider name +
 *      city  /  verified + rating + reviews
 *   2. Price rows (one per procedure for this provider): brand label  /
 *      price + unit  /  vs-average badge. Dysport rows get a one-line
 *      equivalency note below.
 *   3. Footer row (rendered once per provider): distance + open status  /
 *      [COMPARE] [SAVE] [VIEW MENU →]
 *
 * IMPORTANT: This component takes an array of `procedures` for a single
 * provider, NOT a single procedure. The grouping happens upstream in
 * FindPrices.jsx via groupedProviders. The first entry in the array is
 * the "primary" — used for header/footer info — and should already be
 * sorted lowest-price-first by the parent.
 *
 * Card width: max 860px, centered. Padding 20px 24px. mb 12px.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Star, ShieldCheck, ArrowRight, Info, ChevronRight } from 'lucide-react';
import ProviderAvatar from '../ProviderAvatar';
import { providerProfileUrl } from '../../lib/slugify';
import { getProcedureLabel, getProcedureDetail } from '../../lib/procedureLabel';
import { inferNeurotoxinBrand, formatUnitsIncluded } from '../../lib/priceUtils';
import { haversineMiles, formatMiles } from '../../lib/distance';
import { resolveDosingKey, getQuickEstimates } from '../../data/dosingGuidance';

function fmtPrice(n) {
  const v = Number(n) || 0;
  return `$${Math.round(v).toLocaleString()}`;
}

// Pull the comparable per-unit value out of a procedure row, falling
// back to the raw price_paid when normalization is missing. Used for
// vs-average badge math and the dysport botox-equivalent calculation.
function compareValueOf(procedure) {
  return procedure.normalized_compare_value &&
    Number.isFinite(Number(procedure.normalized_compare_value))
    ? Number(procedure.normalized_compare_value)
    : Number(procedure.price_paid) || 0;
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

// One price row inside the multi-price card. Brand label, big editorial
// price, vs-avg badge, and an optional dysport equivalency note.
function PriceRow({ procedure, cityAvg, isFirst, onDetailClick, onDosingClick }) {
  const displayPrice = procedure.normalized_display
    ? procedure.normalized_display
    : fmtPrice(procedure.price_paid);
  // Only show the compare-unit suffix inline — units_or_volume moves below
  const unitLabel =
    procedure.normalized_compare_unit === 'per unit' ? '/unit' : null;
  const compareValue = compareValueOf(procedure);

  // Price-aware brand inference — overrides "Botox" label when price < $10/unit
  const perUnitForBrand =
    procedure.normalized_compare_unit === 'per unit' &&
    Number.isFinite(Number(procedure.normalized_compare_value))
      ? Number(procedure.normalized_compare_value)
      : null;
  const brandInfo = inferNeurotoxinBrand({
    procedureType: procedure.procedure_type,
    brand: procedure.brand || null,
    perUnitPrice: perUnitForBrand,
  });
  const label = brandInfo?.label || getProcedureLabel(procedure.procedure_type, procedure.brand);
  const isDysport = brandInfo?.isDysport || false;
  const unitsLine = formatUnitsIncluded(procedure.units_or_volume);
  const treatmentArea = getProcedureDetail(procedure);

  // Dosing estimates — only for per-unit neurotoxins or per-syringe fillers
  const dosingInfo = useMemo(() => {
    if (compareValue <= 0) return null;
    const resolved = resolveDosingKey(procedure.procedure_type, procedure.brand);
    if (!resolved) return null;
    const unitType = procedure.normalized_compare_unit;
    if (resolved.type === 'neurotoxin' && unitType !== 'per unit') return null;
    if (resolved.type === 'filler' && unitType !== 'per syringe') return null;
    const estimates = getQuickEstimates(resolved.key, resolved.type, compareValue);
    if (estimates.length === 0) return null;
    return { ...resolved, estimates };
  }, [procedure.procedure_type, procedure.brand, procedure.normalized_compare_unit, compareValue]);

  return (
    <div
      style={{
        // The first row's top border is the card-level divider drawn
        // by the parent (so the spacing matches the header). Subsequent
        // rows draw their own thin divider.
        borderTop: isFirst ? 'none' : '1px solid #F4F0EB',
        padding: '14px 0',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 80 }}>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#E8347A',
              display: 'block',
            }}
          >
            {label}
          </span>
          {treatmentArea && (
            <span
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 10,
                fontWeight: 400,
                color: '#999',
                display: 'block',
                marginTop: 1,
              }}
            >
              {treatmentArea}
            </span>
          )}
        </div>
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
        {onDetailClick && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDetailClick(procedure);
            }}
            aria-label={`Details about ${label}`}
            style={{
              flexShrink: 0,
              background: 'none',
              border: '1px solid #EDE8E3',
              borderRadius: 2,
              width: 28,
              height: 28,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#999',
              padding: 0,
            }}
          >
            <Info size={14} />
          </button>
        )}
      </div>

      {unitsLine && (
        <p
          style={{
            margin: '4px 0 0 0',
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            fontWeight: 300,
            color: '#888',
            textAlign: 'center',
          }}
        >
          {unitsLine}
        </p>
      )}

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
          title="Dysport requires roughly 2–2.5× more units than Botox. Published ratios range from 2:1 to 4:1 — the FDA says units are not interchangeable between products."
        >
          {compareValue > 0
            ? `\u2248 $${(compareValue * 2.5).toFixed(2)} Botox-equivalent (at ~2.5\u00D7 ratio \u2014 actual ratio varies)`
            : 'Dysport units \u2260 Botox units. Standard aesthetic ratio is 2\u20132.5\u00D7, but studies range from 2:1 to 4:1.'}
        </p>
      )}

      {/* Inline dosing estimates */}
      {dosingInfo && (
        <div
          style={{
            margin: '10px 0 0 0',
            padding: '10px 14px',
            background: '#FBF9F7',
            borderRadius: 6,
            border: '1px solid #F4F0EB',
          }}
        >
          {dosingInfo.estimates.map((est) => (
            <div
              key={est.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '3px 0',
                fontFamily: 'var(--font-body)',
                fontSize: 11,
                lineHeight: 1.5,
              }}
            >
              <span style={{ color: '#555', fontWeight: 400 }}>
                {est.label}
                {est.popular && (
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: 9,
                      fontWeight: 600,
                      color: '#E8347A',
                    }}
                  >
                    ← most popular
                  </span>
                )}
              </span>
              <span style={{ color: '#111', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {est.low === est.high
                  ? `$${est.low.toLocaleString()}`
                  : `$${est.low.toLocaleString()}–$${est.high.toLocaleString()}`}
              </span>
            </div>
          ))}
          {onDosingClick && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDosingClick(procedure, dosingInfo);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2,
                marginTop: 6,
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
          <p
            style={{
              margin: '4px 0 0 0',
              fontFamily: 'var(--font-body)',
              fontSize: 9,
              fontWeight: 300,
              color: '#BBB',
              lineHeight: 1.4,
            }}
          >
            Estimates based on typical clinical dosing ranges.
          </p>
        </div>
      )}
    </div>
  );
}

export default function PriceCard({
  procedures,
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
  onProcedureDetail,
  onDosingClick,
}) {
  // Defensive: tolerate either an empty array or accidental single-row use.
  const rows = Array.isArray(procedures) ? procedures : [];
  if (rows.length === 0) return null;

  // The "primary" carries provider identity (name, city, slug, distance,
  // rating). It is also what we hand to compare/save/hover callbacks.
  const primary = rows[0];

  const profileUrl = providerProfileUrl(
    primary.provider_slug,
    primary.provider_name,
    primary.city,
    primary.state,
  );

  const isVerified =
    primary._verified === true || primary.receipt_verified === true;

  const distanceLabel = formatMiles(
    haversineMiles(userLat, userLng, primary.provider_lat, primary.provider_lng),
  );

  const reviewCount = Number(primary.review_count) || 0;

  // A provider card is in pending-self mode if ANY of its rows is the
  // current user's own pending submission. The amber treatment then
  // applies to the whole card (since the submitter is allowed to see
  // it but no one else is).
  const isPendingSelf = rows.some((p) => p._pending_self === true);

  function handleCompareClick(e) {
    e.preventDefault();
    e.stopPropagation();
    onCompareToggle?.(primary);
  }

  function handleSaveClick(e) {
    e.preventDefault();
    e.stopPropagation();
    onSaveToggle?.(primary);
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
        onHoverChange ? () => onHoverChange(primary, true) : undefined
      }
      onMouseLeave={
        onHoverChange ? () => onHoverChange(primary, false) : undefined
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
          <ProviderAvatar name={primary.provider_name} size={44} />
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
              {primary.provider_name || 'Unknown provider'}
            </p>
            {primary.city && primary.state && (
              <p
                style={{
                  fontFamily: 'var(--font-body)',
                  fontWeight: 300,
                  fontSize: 12,
                  color: '#888',
                  margin: '2px 0 0 0',
                }}
              >
                {primary.city}, {primary.state}
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
          {primary.rating != null && (
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
              {Number(primary.rating).toFixed(1)}
              {reviewCount > 0 && (
                <span style={{ color: '#888', fontWeight: 400 }}>
                  ({reviewCount})
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Price rows — outer wrapper draws the top + bottom card divider
          that the original single-row layout had, so the multi-row
          version still reads as one editorial block. */}
      <div
        style={{
          borderTop: '1px solid #F4F0EB',
          borderBottom: '1px solid #F4F0EB',
        }}
      >
        {rows.map((proc, i) => (
          <PriceRow
            key={proc.id || `${proc.procedure_type}-${proc.brand || ''}-${i}`}
            procedure={proc}
            cityAvg={cityAvg}
            isFirst={i === 0}
            onDetailClick={onProcedureDetail ? (p) => onProcedureDetail(p, primary) : undefined}
            onDosingClick={onDosingClick ? (p, info) => onDosingClick(p, primary, info) : undefined}
          />
        ))}
      </div>

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
          {distanceLabel && primary.is_open_now && (
            <span style={{ color: '#D6CFC6' }}>·</span>
          )}
          {primary.is_open_now && (
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

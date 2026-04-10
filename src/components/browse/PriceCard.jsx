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
 * Card width: max 860px, centered. Padding 24px 28px. mb 12px.
 */

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Star, ShieldCheck, ArrowRight, Info, ChevronRight, Calculator } from 'lucide-react';
import ProviderAvatar from '../ProviderAvatar';
import { providerProfileUrl } from '../../lib/slugify';
import { getProcedureLabel, getProcedureDetail } from '../../lib/procedureLabel';
import { inferNeurotoxinBrand, formatUnitsIncluded } from '../../lib/priceUtils';
import { haversineMiles, formatMiles } from '../../lib/distance';
import { resolveDosingKey, getQuickEstimates } from '../../data/dosingGuidance';
import useDosingStore from '../../stores/dosingStore';
import { getPriceFreshness, getFreshnessAge } from '../../lib/freshness';
import { assignTrustTier, TRUST_TIERS } from '../../lib/trustTiers';

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

// ---------------------------------------------------------------------------
// Static style objects — defined once, shared across all renders.
// ---------------------------------------------------------------------------

const S = {
  // VsAverageBadge
  badgeBase: {
    display: 'inline-flex',
    alignItems: 'center',
    fontFamily: 'var(--font-body)',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    padding: '4px 8px',
    borderRadius: 2,
    whiteSpace: 'nowrap',
  },
  badgeAtAvg: { background: '#F5F2EE', color: '#666' },
  badgeBelow: { background: '#E1F5EE', color: '#085041' },
  badgeAbove: { background: '#FFF7ED', color: '#B45309' },

  // PriceRow
  priceRowDivider: { borderTop: '1px solid #F4F0EB', padding: '14px 0' },
  priceRowFirst: { borderTop: 'none', padding: '14px 0' },
  priceRowInner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  labelWrap: { minWidth: 80 },
  brandLabel: {
    fontFamily: 'var(--font-body)',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#E8347A',
    display: 'block',
  },
  treatmentArea: {
    fontFamily: 'var(--font-body)',
    fontSize: 10,
    fontWeight: 400,
    color: '#999',
    display: 'block',
    marginTop: 1,
  },
  priceText: {
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
  },
  unitSuffix: {
    fontFamily: 'var(--font-body)',
    fontSize: 12,
    fontWeight: 300,
    color: '#888',
  },
  flexShrink0: { flexShrink: 0 },
  detailBtn: {
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
  },
  unitsLine: {
    margin: '4px 0 0 0',
    fontFamily: 'var(--font-body)',
    fontSize: 11,
    fontWeight: 300,
    color: '#888',
    textAlign: 'center',
  },
  dysportNote: {
    margin: '8px 0 0 0',
    fontFamily: 'var(--font-body)',
    fontStyle: 'italic',
    fontWeight: 300,
    fontSize: 11,
    color: '#888',
    lineHeight: 1.4,
  },
  dosingBox: {
    margin: '10px 0 0 0',
    padding: '10px 14px',
    background: '#FBF9F7',
    borderRadius: 6,
    border: '1px solid #F4F0EB',
  },
  dosingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '3px 0',
    fontFamily: 'var(--font-body)',
    fontSize: 11,
    lineHeight: 1.5,
  },
  dosingLabel: { color: '#555', fontWeight: 400 },
  dosingPopular: { marginLeft: 6, fontSize: 9, fontWeight: 600, color: '#E8347A' },
  dosingValue: { color: '#111', fontWeight: 600, whiteSpace: 'nowrap' },
  dosingLink: {
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
  },
  dosingDisclaimer: {
    margin: '4px 0 0 0',
    fontFamily: 'var(--font-body)',
    fontSize: 9,
    fontWeight: 300,
    color: '#BBB',
    lineHeight: 1.4,
  },
  personalBox: {
    margin: '8px 0 0 0',
    padding: '10px 14px',
    background: '#FDF2F7',
    borderRadius: 6,
    border: '1px solid #F5D0E0',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  personalInner: { flex: 1, minWidth: 0 },
  personalCost: {
    fontFamily: 'var(--font-body)',
    fontSize: 12,
    fontWeight: 600,
    color: '#111',
  },
  personalUnits: {
    fontFamily: 'var(--font-body)',
    fontSize: 11,
    fontWeight: 300,
    color: '#888',
    marginLeft: 6,
  },

  // Trust + freshness row
  trustRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  sourceBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    fontFamily: 'var(--font-body)',
    fontSize: 10,
    fontWeight: 500,
  },
  freshnessLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    fontFamily: 'var(--font-body)',
    fontSize: 10,
    fontWeight: 400,
  },

  // PriceCard header
  headerRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 16,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
    flex: 1,
  },
  nameWrap: { minWidth: 0, flex: 1 },
  providerName: {
    fontFamily: 'var(--font-body)',
    fontWeight: 700,
    fontSize: 15,
    color: '#111',
    lineHeight: 1.3,
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  cityState: {
    fontFamily: 'var(--font-body)',
    fontWeight: 300,
    fontSize: 12,
    color: '#888',
    margin: '2px 0 0 0',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  verifiedBadge: {
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
  },
  ratingWrap: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontFamily: 'var(--font-body)',
    fontSize: 12,
    color: '#111',
    fontWeight: 600,
  },
  reviewCount: { color: '#888', fontWeight: 400 },

  // Price rows wrapper
  priceBlock: {
    borderTop: '1px solid #F4F0EB',
    borderBottom: '1px solid #F4F0EB',
  },

  // Pending self
  pendingBanner: {
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
  },
  pendingTag: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
    padding: '2px 6px',
    background: '#B45309',
    color: 'white',
    borderRadius: 2,
  },
  pendingText: { fontWeight: 400 },

  // Footer
  footerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  footerMeta: {
    fontFamily: 'var(--font-body)',
    fontSize: 12,
    fontWeight: 300,
    color: '#888',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  dot: { color: '#D6CFC6' },
  openNow: { color: '#1A7A3A', fontWeight: 600 },
  footerActions: { display: 'flex', alignItems: 'center', gap: 8 },
  btnBase: {
    borderRadius: 2,
    fontFamily: 'var(--font-body)',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
  },
  viewMenuLink: {
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
  },
  viewMenuDisabled: {
    padding: '8px 14px',
    background: '#F5F2EE',
    color: '#888',
    borderRadius: 2,
    fontFamily: 'var(--font-body)',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.10em',
    textTransform: 'uppercase',
  },
};

// vs-average badge: green if below avg, gray if at avg, amber if above.
function VsAverageBadge({ price, avg }) {
  if (!avg || !price) return null;
  const diff = Math.round(((price - avg) / avg) * 100);
  if (Math.abs(diff) < 5) {
    return (
      <span style={{ ...S.badgeBase, ...S.badgeAtAvg }}>
        At avg
      </span>
    );
  }
  const below = diff < 0;
  return (
    <span style={{ ...S.badgeBase, ...(below ? S.badgeBelow : S.badgeAbove) }}>
      {below ? `${Math.abs(diff)}% below avg` : `${diff}% above avg`}
    </span>
  );
}

// Source trust badge: receipt_verified → green ✓, has_photo → blue ✓,
// self_reported → gray ○. Uses assignTrustTier from lib/trustTiers.js.
function SourceBadge({ procedure }) {
  const tier = assignTrustTier({
    receipt_verified: procedure.receipt_verified || procedure._verified,
    has_result_photo: !!(procedure.result_photo_url || procedure.has_result_photo),
  });
  const info = TRUST_TIERS[tier.trust_tier];
  if (!info) return null;
  const isGreen = tier.trust_tier === 'receipt_verified' || tier.trust_tier === 'receipt_and_photo';
  const isBlue = tier.trust_tier === 'has_photo';
  const color = isGreen ? '#059669' : isBlue ? '#2563EB' : '#999';
  const icon = isGreen || isBlue ? '\u2713' : '\u25CB';
  return (
    <span style={{ ...S.sourceBadge, color }}>
      {icon} {info.label}
    </span>
  );
}

// Freshness label: FRESH → no label, RECENT → "X weeks ago",
// GETTING_STALE → amber warning, STALE → red warning.
function FreshnessTag({ procedure }) {
  const ts = procedure.freshness_confirmed_at || procedure.created_at;
  const freshness = getPriceFreshness(ts);
  if (!freshness) return null;
  // FRESH: no label needed
  if (freshness.tier.key === 'fresh') return null;
  const age = getFreshnessAge(freshness.daysOld);
  const isStale = freshness.tier.key === 'stale';
  const isGettingStale = freshness.tier.key === 'getting_stale';
  return (
    <span style={{ ...S.freshnessLabel, color: freshness.color }}>
      {'\uD83D\uDD50'} {age}
      {isGettingStale && ' \u26A0\uFE0F'}
      {isStale && ' \u2014 verify current price'}
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

  // Discount badge
  const discountType = procedure.discount_type || null;
  const isDiscounted = !!discountType;
  const isMilitary =
    discountType && discountType.toLowerCase().includes('military');

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

  // Zustand dosing store — personalized estimate based on selected areas
  const selectedAreas = useDosingStore((s) => s.selectedAreas);
  const estimateUnitRange = useDosingStore((s) => s.estimateUnitRange);

  const personalEstimate = useMemo(() => {
    if (selectedAreas.length === 0) return null;
    if (!dosingInfo || dosingInfo.type !== 'neurotoxin') return null;
    if (compareValue <= 0) return null;
    const brandKey = dosingInfo.key;
    const range = estimateUnitRange(brandKey);
    if (!range || range.typical === 0) return null;
    return {
      minUnits: range.min,
      maxUnits: range.max,
      minCost: Math.round(range.min * compareValue),
      maxCost: Math.round(range.max * compareValue),
      brandKey,
    };
  }, [selectedAreas, dosingInfo, compareValue, estimateUnitRange]);

  return (
    <div style={isFirst ? S.priceRowFirst : S.priceRowDivider}>
      <div style={S.priceRowInner}>
        <div style={S.labelWrap}>
          <span style={S.brandLabel}>{label}</span>
          {treatmentArea && (
            <span style={S.treatmentArea}>{treatmentArea}</span>
          )}
        </div>
        <span style={S.priceText}>
          {displayPrice}
          {unitLabel && (
            <span style={S.unitSuffix}>{unitLabel}</span>
          )}
        </span>
        {isDiscounted && (
          <span
            style={{
              ...S.badgeBase,
              background: isMilitary ? '#1E3A5F' : '#6B4C9A',
              color: '#fff',
              fontSize: 9,
            }}
          >
            {isMilitary ? '🎖️ MIL' : '🏷️ PROMO'}
          </span>
        )}
        {/* Only compare per-unit prices against the per-unit average.
            A $300/session row compared to a $15/unit avg is meaningless. */}
        {procedure.normalized_compare_unit === 'per unit' && (
          <span style={S.flexShrink0}>
            <VsAverageBadge
              price={
                procedure.normalized_compare_value != null &&
                Number.isFinite(Number(procedure.normalized_compare_value))
                  ? Number(procedure.normalized_compare_value)
                  : null
              }
              avg={cityAvg}
            />
          </span>
        )}
        {onDetailClick && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDetailClick(procedure);
            }}
            aria-label={`Details about ${label}`}
            style={S.detailBtn}
          >
            <Info size={14} />
          </button>
        )}
      </div>

      {unitsLine && (
        <p style={S.unitsLine}>{unitsLine}</p>
      )}

      {/* Trust source + freshness signals */}
      <div style={S.trustRow}>
        <SourceBadge procedure={procedure} />
        <FreshnessTag procedure={procedure} />
      </div>

      {isDiscounted && (
        <p
          style={{
            margin: '4px 0 0 0',
            fontFamily: 'var(--font-body)',
            fontSize: 10,
            fontWeight: 300,
            color: '#999',
            textAlign: 'center',
          }}
        >
          {isMilitary
            ? 'Military discount applied — market rate may differ'
            : 'Promotional price — market rate may differ'}
        </p>
      )}

      {isDysport && (
        <p
          style={S.dysportNote}
          title="Dysport requires roughly 2–2.5× more units than Botox. Published ratios range from 2:1 to 4:1 — the FDA says units are not interchangeable between products."
        >
          {compareValue > 0
            ? `\u2248 $${(compareValue * 2.5).toFixed(2)} Botox-equivalent (at ~2.5\u00D7 ratio \u2014 actual ratio varies)`
            : 'Dysport units \u2260 Botox units. Standard aesthetic ratio is 2\u20132.5\u00D7, but studies range from 2:1 to 4:1.'}
        </p>
      )}

      {/* Inline dosing estimates */}
      {dosingInfo && (
        <div style={S.dosingBox}>
          {dosingInfo.estimates.map((est) => (
            <div key={est.label} style={S.dosingRow}>
              <span style={S.dosingLabel}>
                {est.label}
                {est.popular && (
                  <span style={S.dosingPopular}>← most popular</span>
                )}
              </span>
              <span style={S.dosingValue}>
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
              style={S.dosingLink}
            >
              How much will I need? <ChevronRight size={12} />
            </button>
          )}
          <p style={S.dosingDisclaimer}>
            Estimates based on typical clinical dosing ranges.
          </p>
        </div>
      )}

      {/* Personalized estimate from Zustand dosing calculator */}
      {personalEstimate && (
        <div style={S.personalBox}>
          <Calculator size={13} color="#E8347A" style={S.flexShrink0} />
          <div style={S.personalInner}>
            <span style={S.personalCost}>
              Your estimate:{' '}
              {personalEstimate.minUnits === personalEstimate.maxUnits
                ? `${personalEstimate.minUnits} units \u2192 ${fmtPrice(personalEstimate.minCost)}`
                : `${personalEstimate.minUnits}\u2013${personalEstimate.maxUnits} units \u2192 ${fmtPrice(personalEstimate.minCost)}\u2013${fmtPrice(personalEstimate.maxCost)}`}
            </span>
            <span style={S.personalUnits}>
              {personalEstimate.minUnits === personalEstimate.maxUnits
                ? `${personalEstimate.minUnits} units`
                : `${personalEstimate.minUnits}\u2013${personalEstimate.maxUnits} units`}
              {' \u00d7 '}{fmtPrice(compareValue)}/unit
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function PriceCard({
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
  // Drop rows flagged as hidden by normalizePrice (range_low, range_high, etc.).
  const rows = (Array.isArray(procedures) ? procedures : []).filter((p) =>
    p.normalized_category !== 'hidden'
  );
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
        padding: '24px 28px',
        maxWidth: 860,
        marginLeft: 'auto',
        marginRight: 'auto',
        width: '100%',
        boxShadow: selected ? '0 4px 12px rgba(0,0,0,0.10)' : 'none',
        transition: 'box-shadow 150ms, border-color 150ms',
      }}
    >
      {isPendingSelf && (
        <div style={S.pendingBanner}>
          <span style={S.pendingTag}>Pending review</span>
          <span style={S.pendingText}>
            Your submission is saved and awaiting moderation. Only you can see it.
          </span>
        </div>
      )}

      {/* Header row */}
      <div style={S.headerRow}>
        <div style={S.headerLeft}>
          <ProviderAvatar name={primary.provider_name} size={52} />
          <div style={S.nameWrap}>
            <p style={S.providerName}>
              {primary.provider_name || 'Unknown provider'}
            </p>
            {primary.city && primary.state && (
              <p style={S.cityState}>
                {primary.city}, {primary.state}
              </p>
            )}
          </div>
        </div>

        <div style={S.headerRight}>
          {isVerified && (
            <span title="Verified provider" style={S.verifiedBadge}>
              <ShieldCheck size={11} />
              Verified
            </span>
          )}
          {primary.rating != null && (
            <span style={S.ratingWrap}>
              <Star size={13} fill="#F5B301" stroke="#F5B301" />
              {Number(primary.rating).toFixed(1)}
              {reviewCount > 0 && (
                <span style={S.reviewCount}>({reviewCount})</span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Price rows — outer wrapper draws the top + bottom card divider
          that the original single-row layout had, so the multi-row
          version still reads as one editorial block. */}
      <div style={S.priceBlock}>
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
      <div style={S.footerRow}>
        <div style={S.footerMeta}>
          {distanceLabel && <span>{distanceLabel}</span>}
          {distanceLabel && primary.is_open_now && (
            <span style={S.dot}>·</span>
          )}
          {primary.is_open_now && (
            <span style={S.openNow}>Open now</span>
          )}
        </div>

        <div style={S.footerActions}>
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
            <Link to={profileUrl} style={S.viewMenuLink}>
              View menu
              <ArrowRight size={12} />
            </Link>
          ) : (
            <span style={S.viewMenuDisabled}>
              View menu
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(PriceCard);

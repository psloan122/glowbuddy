import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, FileCheck, RotateCcw, Camera, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ProviderAvatar from './ProviderAvatar';
import StarRating from './StarRating';
import FairPriceBadge from './FairPriceBadge';
import PriceAnnotation from './PriceAnnotation';
import { providerProfileUrl } from '../lib/slugify';
import { getSourceBadge, getQuoteFreshness } from '../lib/dataSource';
import cleanProviderType from '../utils/cleanProviderType';
import { getPriceFreshness, getFreshnessAge } from '../lib/freshness';
import { isFirstTimerFor } from '../lib/firstTimerMode';
import FinancingWidget from './FinancingWidget';
import AlertMatchBadge from './AlertMatchBadge';
import DisputeButton from './DisputeButton';
import { getGuideUrl } from '../lib/guideMapping';
import { inferNeurotoxinBrand, formatUnitsIncluded } from '../lib/priceUtils';
import { getProcedureLabel } from '../lib/procedureLabel';
import SpecialBanner, { hasActiveSpecial, SpecialUpgradeSlot } from './SpecialBanner';
import { haversineMiles, formatMiles } from '../lib/distance';

export default function ProcedureCard({ procedure, firstTimerActive, userAlerts, userLat, userLng }) {
  const [responseExpanded, setResponseExpanded] = useState(false);
  const sourceBadge = getSourceBadge(procedure.data_source);
  const freshness = procedure.data_source === 'provider_quote'
    ? getQuoteFreshness(procedure.quote_date)
    : null;
  const priceFreshness = procedure.data_source !== 'provider_quote'
    ? getPriceFreshness(procedure.freshness_confirmed_at || procedure.created_at)
    : null;

  const profileUrl = providerProfileUrl(
    procedure.provider_slug,
    procedure.provider_name,
    procedure.city,
    procedure.state,
  );
  const Wrapper = profileUrl ? Link : 'div';
  const wrapperProps = profileUrl ? { to: profileUrl } : {};

  // Per-unit equivalent used for brand inference on neurotoxin cards.
  // Only trusts the pre-normalized per-unit value that came from the query
  // layer — no more freeform units_or_volume parsing.
  const perUnitForBrand =
    procedure.normalized_compare_value &&
    procedure.normalized_compare_unit === 'per unit'
      ? Number(procedure.normalized_compare_value)
      : null;
  const brandInfo = inferNeurotoxinBrand({
    procedureType: procedure.procedure_type,
    brand: procedure.brand || null,
    perUnitPrice: perUnitForBrand,
  });

  // Single source of truth for the short pink kicker label. Brand wins
  // when set; otherwise we collapse combined procedure_type strings like
  // "Botox / Dysport / Xeomin" down to a clean category name.
  const cardLabel = getProcedureLabel(procedure.procedure_type, procedure.brand);

  // "· X mi" suffix next to the city/state line. Resolves to null when
  // either side of the coordinate pair is missing, which is the common
  // case (signed-out users with no gating location, rows without
  // provider lat/lng).
  const distanceLabel = formatMiles(
    haversineMiles(userLat, userLng, procedure.provider_lat, procedure.provider_lng),
  );

  // Compact mobile values used in the simplified card layout below md.
  const mobilePrice = procedure.normalized_display
    ? procedure.normalized_display
    : `$${Number(procedure.price_paid).toLocaleString()}`;
  const mobileUnit = formatUnitsIncluded(procedure.units_or_volume);

  return (
    <Wrapper
      {...wrapperProps}
      className="group block hover:no-underline glow-card px-4 py-3.5 md:p-5 rounded-md md:rounded-lg"
    >
      {/* Active special banner — shown at top when provider has an
          unexpired active_special set. Hidden on mobile for compactness;
          the special is still implied by the hot-pink top border. */}
      <div className="hidden md:block">
        <SpecialBanner
          text={procedure.active_special}
          expiresAt={procedure.special_expires_at}
        />
      </div>

      {/* ─── Mobile compact layout (< md) ─── */}
      <div className="md:hidden">
        {/* Row 1: Provider name + price */}
        <div className="flex items-baseline justify-between gap-3">
          <p
            className="text-ink truncate"
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              fontSize: 15,
              maxWidth: '60%',
            }}
          >
            {procedure.provider_name}
          </p>
          <span
            className="font-display text-ink shrink-0 text-right"
            style={{ fontWeight: 900, fontSize: 22, lineHeight: 1 }}
          >
            {mobilePrice}
          </span>
        </div>

        {/* Row 2: City · rating · distance */}
        <p
          className="mt-1"
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 300,
            fontSize: 12,
            color: '#B8A89A',
          }}
        >
          {[
            procedure.city && procedure.state ? `${procedure.city}, ${procedure.state}` : null,
            procedure.rating ? `${'\u2605'} ${Number(procedure.rating).toFixed(1)}` : null,
            distanceLabel || null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>

        {/* Row 3 (conditional): special banner — single line */}
        {procedure.active_special && hasActiveSpecial(procedure.active_special, procedure.special_expires_at) && (
          <div
            className="mt-2 truncate"
            style={{
              borderLeft: '3px solid #E8347A',
              paddingLeft: 8,
              fontFamily: 'var(--font-body)',
              fontWeight: 400,
              fontSize: 12,
              color: '#111',
            }}
          >
            {procedure.active_special}
          </div>
        )}

        {/* Row 4: Label + units + vs-avg badge */}
        <div className="mt-2 flex items-center justify-between gap-2">
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 300,
              fontSize: 11,
              color: '#B8A89A',
            }}
          >
            {cardLabel}
            {mobileUnit && <span> &middot; {mobileUnit}</span>}
            {!mobileUnit && procedure.normalized_unit_subtext && (
              <span> &middot; {procedure.normalized_unit_subtext}</span>
            )}
          </span>
          <FairPriceBadge
            price={procedure.normalized_compare_value || procedure.price_paid}
            procedureType={procedure.procedure_type}
            state={procedure.state}
            city={procedure.city}
          />
        </div>
      </div>

      {/* ─── Desktop layout (md+) ─── */}
      <div className="hidden md:block">

      {/* Kicker — brand-aware label, never the combined "Botox / Dysport
          / Xeomin" string. See src/lib/procedureLabel.js. */}
      <p className="editorial-kicker mb-2">
        {cardLabel}
        {procedure.treatment_area && (
          <span className="text-text-secondary font-normal normal-case tracking-normal">
            {' '}&middot; {procedure.treatment_area}
          </span>
        )}
      </p>

      {/* Layer 1: Price hero — Playfair 900 huge, ink on light */}
      <div className="flex items-baseline gap-2 mb-1 flex-wrap">
        <span className="price-display-light whitespace-normal">
          {procedure.normalized_display || `$${Number(procedure.price_paid).toLocaleString()}`}
        </span>
      </div>
      {formatUnitsIncluded(procedure.units_or_volume) && (
        <p className="text-[11px] font-light text-text-secondary mb-3">
          {formatUnitsIncluded(procedure.units_or_volume)}
        </p>
      )}
      {!formatUnitsIncluded(procedure.units_or_volume) && procedure.normalized_unit_subtext && (
        <p className="text-[11px] font-light text-text-secondary mb-3">
          {procedure.normalized_unit_subtext}
        </p>
      )}
      {!formatUnitsIncluded(procedure.units_or_volume) && !procedure.normalized_unit_subtext && <div className="mb-2" />}

      {/* FairPrice + Brand chips row */}
      <div className="flex items-center gap-1.5 flex-wrap mb-3">
        <FairPriceBadge
          price={procedure.normalized_compare_value || procedure.price_paid}
          procedureType={procedure.procedure_type}
          state={procedure.state}
          city={procedure.city}
        />
        {brandInfo && (
          <span
            className="inline-flex items-center text-[10px] font-medium uppercase text-hot-pink border border-hot-pink/40 px-2 py-0.5"
            style={{ letterSpacing: '0.06em', borderRadius: '4px' }}
            title={brandInfo.tooltip}
          >
            {brandInfo.label}
          </span>
        )}
      </div>

      {/* Brand-specific equivalency/longevity notes.
          Dysport  — show calculated Botox-equivalent unit price (2.5× more
                     Dysport units needed to match 1u of Botox).
          Daxxify  — longevity note (6+ months vs 3–4 for Botox).
          Xeomin / Jeuveau are 1:1 with Botox — no note needed. */}
      {brandInfo?.isDysport && (
        <p
          className="italic mb-3"
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 300,
            fontSize: '11px',
            color: '#B8A89A',
            lineHeight: 1.4,
          }}
          title="Dysport requires approximately 2.5× more units than Botox for equivalent effect"
        >
          {perUnitForBrand
            ? `\u2248 $${(perUnitForBrand * 2.5).toFixed(2)} Botox equivalent (2.5\u00D7 units)`
            : 'Dysport units \u2260 Botox units. Typically 2.5\u00D7 more units needed.'}
        </p>
      )}
      {procedure.brand && procedure.brand.toLowerCase() === 'daxxify' && (
        <p
          className="italic mb-3"
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 300,
            fontSize: '11px',
            color: '#B8A89A',
            lineHeight: 1.4,
          }}
          title="Daxxify is formulated to last longer than traditional neurotoxins"
        >
          Lasts 6+ months vs 3&ndash;4 for Botox.
        </p>
      )}

      {firstTimerActive && isFirstTimerFor(procedure.procedure_type) && (
        <div className="mb-2">
          <PriceAnnotation price={procedure.price_paid} treatmentName={procedure.procedure_type} />
        </div>
      )}

      {/* Guide link */}
      {getGuideUrl(procedure.procedure_type) && (
        <Link
          to={getGuideUrl(procedure.procedure_type)}
          className="text-[10px] font-semibold uppercase text-hot-pink hover:text-hot-pink-dark transition-colors mb-3 inline-block"
          style={{ letterSpacing: '0.08em' }}
          onClick={(e) => e.stopPropagation()}
        >
          First timer? Read the guide &rarr;
        </Link>
      )}

      {/* Provider row — divider above */}
      <div className="pt-3 mt-1" style={{ borderTop: '1px solid #F0F0F0' }}>
        <div className="flex items-center gap-2.5 mb-1">
          <ProviderAvatar name={procedure.provider_name} size={28} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-ink truncate">
              {procedure.provider_name}
            </p>
            {procedure.city && procedure.state && (
              <p className="text-[11px] font-light text-text-secondary">
                {procedure.city}, {procedure.state}
                {distanceLabel && (
                  <span className="text-text-secondary"> &middot; {distanceLabel}</span>
                )}
              </p>
            )}
          </div>
        </div>
        {procedure.injector_name && (
          <p className="ml-[38px] text-[11px] font-light text-text-secondary">
            Injected by {procedure.injector_name}
          </p>
        )}
      </div>

      {/* Badges row — square pills, editorial tracked */}
      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        {/* Source type */}
        <span
          className="inline-flex items-center gap-1 text-[10px] font-medium uppercase px-2 py-0.5"
          style={{
            color: sourceBadge.color,
            backgroundColor: sourceBadge.background,
            borderRadius: '4px',
            letterSpacing: '0.06em',
          }}
          title={sourceBadge.tooltip}
        >
          {sourceBadge.label}
        </span>

        {/* Receipt verified */}
        {procedure.has_receipt && procedure.receipt_verified && (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-medium uppercase px-2 py-0.5"
            style={{
              backgroundColor: '#F0FAF5',
              color: '#1A7A3A',
              border: '1px solid #1A7A3A',
              borderRadius: '4px',
              letterSpacing: '0.06em',
            }}
            title="This price was verified with an uploaded receipt"
          >
            <FileCheck size={10} />
            Receipt
          </span>
        )}

        {/* Disputed */}
        {procedure.is_disputed && (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-medium uppercase px-2 py-0.5"
            style={{
              backgroundColor: '#FFF7ED',
              color: '#B45309',
              borderRadius: '4px',
              letterSpacing: '0.06em',
            }}
            title="Multiple users have flagged this price as potentially inaccurate."
          >
            <AlertTriangle size={10} />
            Disputed
          </span>
        )}

        {/* Result photo */}
        {!procedure.receipt_verified && procedure.result_photo_url && (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-medium uppercase px-2 py-0.5"
            style={{
              backgroundColor: '#F5F2EE',
              color: '#666',
              borderRadius: '4px',
              letterSpacing: '0.06em',
            }}
          >
            <Camera size={10} />
            Photo
          </span>
        )}

        {/* Provider type */}
        {procedure.provider_type && (
          <span
            className="inline-flex items-center text-[10px] font-medium uppercase px-2 py-0.5 text-hot-pink"
            style={{
              backgroundColor: '#FFE8F0',
              borderRadius: '4px',
              letterSpacing: '0.06em',
            }}
          >
            {cleanProviderType(procedure.provider_type)}
          </span>
        )}

        {/* Rating + would return */}
        {procedure.rating && (
          <span className="inline-flex items-center gap-1">
            <StarRating value={procedure.rating} readOnly size={12} />
            {procedure.would_return && (
              <span
                className="inline-flex items-center gap-0.5 text-[10px] font-medium uppercase px-1.5 py-0.5"
                style={{
                  backgroundColor: '#F0FAF5',
                  color: '#1A7A3A',
                  borderRadius: '4px',
                  letterSpacing: '0.06em',
                }}
              >
                <RotateCcw size={9} />
                Would return
              </span>
            )}
          </span>
        )}

        {/* Alert match */}
        {userAlerts && (
          <AlertMatchBadge
            procedureType={procedure.procedure_type}
            price={Number(procedure.price_paid)}
            userAlerts={userAlerts}
            city={procedure.city}
            state={procedure.state}
          />
        )}
      </div>

      {/* Freshness indicators */}
      {priceFreshness && (
        <div className="flex items-center gap-2 mt-3">
          <span
            className="inline-flex items-center gap-1 text-[10px] font-medium uppercase px-2 py-0.5"
            style={{
              color: priceFreshness.color,
              backgroundColor: priceFreshness.bg,
              borderRadius: '4px',
              letterSpacing: '0.06em',
            }}
          >
            {priceFreshness.showWarning && <span>&#9888;</span>}
            {priceFreshness.label} &middot; {getFreshnessAge(priceFreshness.daysOld)}
          </span>
          {priceFreshness.tier.key === 'stale' && (
            <Link
              to={`/log?procedure=${encodeURIComponent(procedure.procedure_type)}&provider=${encodeURIComponent(procedure.provider_name || '')}&city=${encodeURIComponent(procedure.city || '')}&state=${encodeURIComponent(procedure.state || '')}`}
              className="text-[10px] font-semibold uppercase text-hot-pink hover:text-hot-pink-dark transition-colors"
              style={{ letterSpacing: '0.08em' }}
              onClick={(e) => e.stopPropagation()}
            >
              Update price &rarr;
            </Link>
          )}
        </div>
      )}
      {freshness && (
        <span
          className="block text-[10px] mt-2 uppercase font-medium"
          style={{ color: freshness.color, letterSpacing: '0.06em' }}
        >
          {freshness.text}
        </span>
      )}

      {/* Financing */}
      <div className="mt-3">
        <FinancingWidget
          procedureName={procedure.procedure_type}
          estimatedCost={Number(procedure.price_paid)}
          variant="compact"
        />
      </div>

      {/* Review snippet */}
      {procedure.review_body && (
        <p className="font-display italic text-[14px] text-text-secondary mt-3 line-clamp-2 leading-snug">
          &ldquo;{procedure.review_body}&rdquo;
        </p>
      )}

      {/* Notes — only show genuine consumer notes (from real submissions),
          never anything that came from a scraped provider page. */}
      {procedure.notes && procedure.data_source !== 'provider_website' && (
        <p className="text-[12px] text-text-secondary line-clamp-2 mt-2 font-light">
          {procedure.notes}
        </p>
      )}

      {/* Layer 5: Date + dispute */}
      <div className="flex items-center justify-between pt-3 mt-3" style={{ borderTop: '1px solid #F0F0F0' }}>
        {procedure.created_at ? (
          <span
            className="text-[10px] uppercase font-medium text-text-secondary"
            style={{ letterSpacing: '0.06em' }}
          >
            {formatDistanceToNow(new Date(procedure.created_at), {
              addSuffix: true,
            })}
          </span>
        ) : (
          <span />
        )}
        <div className="opacity-40 group-hover:opacity-100 transition-opacity">
          {procedure.data_source !== 'provider_website' && (
            <DisputeButton procedureId={procedure.id} procedureUserId={procedure.user_id} />
          )}
        </div>
      </div>

      {/* Upgrade slot — shown only on unclaimed cards with no active
          special, nudging the provider to claim their listing. */}
      {!hasActiveSpecial(procedure.active_special, procedure.special_expires_at) &&
        procedure.is_claimed === false && <SpecialUpgradeSlot />}

      {/* Provider response (collapsible) */}
      {procedure.provider_response && (
        <div
          className="mt-3 pt-3"
          style={{ borderTop: '1px solid #E8E8E8' }}
          onClick={(e) => e.preventDefault()}
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setResponseExpanded(!responseExpanded);
            }}
            className="flex items-center gap-1 text-[10px] font-semibold uppercase text-hot-pink hover:text-hot-pink-dark transition-colors min-h-[44px]"
            style={{ letterSpacing: '0.08em' }}
          >
            Provider response
            {responseExpanded ? (
              <ChevronUp size={12} />
            ) : (
              <ChevronDown size={12} />
            )}
          </button>
          {responseExpanded && (
            <p className="font-display italic text-[14px] text-ink mt-2 bg-cream px-3 py-2 leading-snug">
              {procedure.provider_response}
            </p>
          )}
        </div>
      )}

      </div>{/* /desktop md+ layout */}
    </Wrapper>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, FileCheck, RotateCcw, Camera, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ProcedureIcon from './ProcedureIcon';
import ProviderAvatar from './ProviderAvatar';
import StarRating from './StarRating';
import FairPriceBadge from './FairPriceBadge';
import PriceAnnotation from './PriceAnnotation';
import { providerProfileUrl } from '../lib/slugify';
import { getSourceBadge, getQuoteFreshness } from '../lib/dataSource';
import { getPriceFreshness, getFreshnessAge } from '../lib/freshness';
import { isFirstTimerFor } from '../lib/firstTimerMode';
import FinancingWidget from './FinancingWidget';
import AlertMatchBadge from './AlertMatchBadge';
import DisputeButton from './DisputeButton';
import { getGuideUrl } from '../lib/guideMapping';
import { inferNeurotoxinBrand, parseUnitsFromText } from '../lib/priceUtils';

export default function ProcedureCard({ procedure, firstTimerActive, userAlerts }) {
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
  // Prefer the normalized comparable value when present (already accounts
  // for area→per-unit estimation); otherwise parse units count from the
  // freeform units_or_volume field and divide.
  const perUnitForBrand = (() => {
    if (
      procedure.normalized_compare_value &&
      procedure.normalized_compare_unit === 'per unit'
    ) {
      return Number(procedure.normalized_compare_value);
    }
    if (procedure.units_or_volume && procedure.price_paid) {
      const parsed = parseUnitsFromText(procedure.units_or_volume);
      if (parsed && parsed.kind === 'unit' && parsed.count > 0) {
        return Math.round((Number(procedure.price_paid) / parsed.count) * 100) / 100;
      }
    }
    return null;
  })();
  const brandInfo = inferNeurotoxinBrand({
    procedureType: procedure.procedure_type,
    brand: procedure.brand || null,
    perUnitPrice: perUnitForBrand,
  });

  return (
    <Wrapper
      {...wrapperProps}
      className="group block glow-card p-4 hover:no-underline"
    >
      {/* Layer 1: Price hero */}
      <div className="flex items-baseline gap-2 mb-1 flex-wrap">
        {procedure.normalized_display ? (
          // Provider-website price — use the normalized display so flat-rate
          // areas show as "$200 area (~$10/u est.)" instead of bare "$200".
          <span className="price-display whitespace-normal">
            {procedure.normalized_display}
          </span>
        ) : (
          <>
            <span className="price-display">
              ${Number(procedure.price_paid).toLocaleString()}
            </span>
            {procedure.units_or_volume && (
              <span className="text-base text-[#6B7280]">{procedure.units_or_volume}</span>
            )}
          </>
        )}
        <FairPriceBadge
          price={procedure.normalized_compare_value || procedure.price_paid}
          procedureType={procedure.procedure_type}
          state={procedure.state}
          city={procedure.city}
        />
      </div>

      {firstTimerActive && isFirstTimerFor(procedure.procedure_type) && (
        <div className="mb-1">
          <PriceAnnotation price={procedure.price_paid} treatmentName={procedure.procedure_type} />
        </div>
      )}

      {/* Procedure type + treatment area */}
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <ProcedureIcon type={procedure.procedure_type} size={22} className="text-rose-dark" />
        <span className="text-[15px] font-semibold text-text-primary">{procedure.procedure_type}</span>
        {procedure.treatment_area && (
          <span className="text-sm text-text-secondary">&middot; {procedure.treatment_area}</span>
        )}
        {brandInfo && (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-dark bg-rose-light/40 px-2 py-0.5 rounded-full"
            title={brandInfo.tooltip}
          >
            {brandInfo.label}
          </span>
        )}
      </div>

      {/* Guide link */}
      {getGuideUrl(procedure.procedure_type) && (
        <Link
          to={getGuideUrl(procedure.procedure_type)}
          className="text-[11px] font-medium text-[#0369A1] hover:text-sky-800 transition-colors mb-2 inline-block"
          onClick={(e) => e.stopPropagation()}
        >
          First timer? Read the guide &rarr;
        </Link>
      )}

      {/* Layer 2: Provider name */}
      <div className="flex items-center gap-2 mb-0.5">
        <ProviderAvatar name={procedure.provider_name} size={24} />
        <span className="text-lg font-semibold text-[#1A1A1A]">
          {procedure.provider_name}
        </span>
      </div>

      {/* Layer 3: Location + injector */}
      {(procedure.city || procedure.injector_name) && (
        <div className="ml-8 mb-3">
          {procedure.city && procedure.state && (
            <p className="text-sm text-[#6B7280]">
              {procedure.city}, {procedure.state}
            </p>
          )}
          {procedure.injector_name && (
            <p className="text-xs text-[#0369A1]">
              Injected by {procedure.injector_name}
            </p>
          )}
        </div>
      )}

      {/* Layer 4: Badges */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {/* Source type */}
        <span
          className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
          style={{ color: sourceBadge.color, backgroundColor: sourceBadge.background }}
          title={sourceBadge.tooltip}
        >
          <span className="text-[11px]">{sourceBadge.icon}</span>
          {sourceBadge.label}
        </span>

        {/* Receipt verified (single instance) */}
        {procedure.has_receipt && procedure.receipt_verified && (
          <span
            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#E1F5EE', color: '#0F6E56', border: '1px solid #0F6E56' }}
            title="This price was verified with an uploaded receipt"
          >
            <FileCheck size={12} />
            Receipt verified
          </span>
        )}

        {/* Disputed */}
        {procedure.is_disputed && (
          <span
            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700"
            title="Multiple users have flagged this price as potentially inaccurate."
          >
            <AlertTriangle size={11} />
            Disputed
          </span>
        )}

        {/* Result photo */}
        {!procedure.receipt_verified && procedure.result_photo_url && (
          <span
            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#E6F1FB', color: '#185FA5' }}
          >
            <Camera size={11} />
            Has photo
          </span>
        )}

        {/* Provider type */}
        {procedure.provider_type && (
          <span className="inline-block bg-rose-light text-rose-dark px-2 py-0.5 text-xs rounded-full">
            {procedure.provider_type}
          </span>
        )}

        {/* Rating + would return */}
        {procedure.rating && (
          <span className="inline-flex items-center gap-1">
            <StarRating value={procedure.rating} readOnly size={12} />
            {procedure.would_return && (
              <span className="inline-flex items-center gap-0.5 text-[10px] bg-verified/10 text-verified px-1.5 py-0.5 rounded-full">
                <RotateCcw size={8} />
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
        <div className="flex items-center gap-2 mb-2">
          <span
            className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{ color: priceFreshness.color, backgroundColor: priceFreshness.bg }}
          >
            {priceFreshness.showWarning && <span>&#9888;</span>}
            {priceFreshness.label} &middot; {getFreshnessAge(priceFreshness.daysOld)}
          </span>
          {priceFreshness.tier.key === 'stale' && (
            <Link
              to={`/log?procedure=${encodeURIComponent(procedure.procedure_type)}&provider=${encodeURIComponent(procedure.provider_name || '')}&city=${encodeURIComponent(procedure.city || '')}&state=${encodeURIComponent(procedure.state || '')}`}
              className="text-[11px] font-medium text-rose-accent hover:text-rose-dark transition-colors py-2 -my-2"
              onClick={(e) => e.stopPropagation()}
            >
              Update this price &rarr;
            </Link>
          )}
        </div>
      )}
      {freshness && (
        <span
          className="block text-[11px] mb-2"
          style={{ color: freshness.color }}
        >
          {freshness.icon} {freshness.text}
        </span>
      )}

      {/* Financing */}
      <FinancingWidget
        procedureName={procedure.procedure_type}
        estimatedCost={Number(procedure.price_paid)}
        variant="compact"
      />

      {/* Review snippet */}
      {procedure.review_body && (
        <p className="text-xs italic text-text-secondary mb-2 line-clamp-1">
          &ldquo;{procedure.review_body}&rdquo;
        </p>
      )}

      {/* Notes — only show genuine consumer notes (from real submissions),
          never anything that came from a scraped provider page. */}
      {procedure.notes && procedure.data_source !== 'provider_website' && (
        <p className="text-sm italic text-text-secondary line-clamp-2 mb-2">
          {procedure.notes}
        </p>
      )}

      {/* Layer 5: Date + dispute */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-1">
        {procedure.created_at ? (
          <span className="text-[11px] text-[#9CA3AF]">
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

      {/* Provider response (collapsible) */}
      {procedure.provider_response && (
        <div
          className="mt-3 pt-3 border-t border-gray-100"
          onClick={(e) => e.preventDefault()}
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setResponseExpanded(!responseExpanded);
            }}
            className="flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors min-h-[44px]"
          >
            Provider response
            {responseExpanded ? (
              <ChevronUp size={12} />
            ) : (
              <ChevronDown size={12} />
            )}
          </button>
          {responseExpanded && (
            <p className="text-xs text-text-secondary mt-1.5 bg-warm-gray rounded-lg px-3 py-2">
              {procedure.provider_response}
            </p>
          )}
        </div>
      )}
    </Wrapper>
  );
}

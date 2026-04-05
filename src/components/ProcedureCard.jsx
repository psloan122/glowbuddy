import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Users, ChevronDown, ChevronUp, FileCheck, RotateCcw, CheckCircle, Camera, AlertTriangle } from 'lucide-react';
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

  return (
    <Wrapper
      {...wrapperProps}
      className="group block glow-card p-5 hover:no-underline"
    >
      {/* Top row: source badge */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ color: sourceBadge.color, backgroundColor: sourceBadge.background }}
              title={sourceBadge.tooltip}
            >
              <span className="text-[11px]">{sourceBadge.icon}</span>
              {sourceBadge.label}
            </span>
            {procedure.is_disputed && (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700"
                title="Multiple users have flagged this price as potentially inaccurate. Use with caution."
              >
                <AlertTriangle size={11} />
                Disputed
              </span>
            )}
          </div>
          {freshness && (
            <span
              className="block text-[11px] mt-1 ml-0.5"
              style={{ color: freshness.color }}
            >
              {freshness.icon} {freshness.text}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {procedure.has_receipt && procedure.receipt_verified && (
            <span
              className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full"
              title="This price was verified with an uploaded receipt"
            >
              <FileCheck size={12} />
              Receipt verified
            </span>
          )}
          {procedure.created_at && (
            <span className="text-xs text-text-secondary">
              {formatDistanceToNow(new Date(procedure.created_at), {
                addSuffix: true,
              })}
            </span>
          )}
        </div>
      </div>

      {/* Procedure type */}
      <h3 className="flex items-center gap-2 text-lg font-bold text-text-primary mb-1">
        <ProcedureIcon type={procedure.procedure_type} size={28} className="text-rose-dark" />
        {procedure.procedure_type}
      </h3>

      {/* Rating + would return */}
      {procedure.rating && (
        <div className="flex items-center gap-2 mb-1">
          <StarRating value={procedure.rating} readOnly size={14} />
          {procedure.would_return && (
            <span className="inline-flex items-center gap-0.5 text-[10px] bg-verified/10 text-verified px-1.5 py-0.5 rounded-full">
              <RotateCcw size={8} />
              Would return
            </span>
          )}
        </div>
      )}

      {/* Review snippet */}
      {procedure.review_body && (
        <p className="text-xs italic text-text-secondary mb-2 line-clamp-1">
          &ldquo;{procedure.review_body}&rdquo;
        </p>
      )}

      {/* Treatment area */}
      {procedure.treatment_area && (
        <p className="text-sm text-text-secondary mb-3">
          {procedure.treatment_area}
        </p>
      )}

      {/* Price */}
      <div className="flex items-center gap-2 mb-2">
        <div className="price-display">
          ${Number(procedure.price_paid).toLocaleString()}
        </div>
        <FairPriceBadge
          price={procedure.price_paid}
          procedureType={procedure.procedure_type}
          state={procedure.state}
          city={procedure.city}
        />
      </div>
      {/* Price freshness indicator */}
      {priceFreshness && (
        <div className="flex items-center gap-2 mb-1">
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
              className="text-[11px] font-medium text-rose-accent hover:text-rose-dark transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Update this price &rarr;
            </Link>
          )}
        </div>
      )}
      {firstTimerActive && isFirstTimerFor(procedure.procedure_type) && (
        <div className="mb-1">
          <PriceAnnotation price={procedure.price_paid} treatmentName={procedure.procedure_type} />
        </div>
      )}
      {userAlerts && (
        <div className="mb-1">
          <AlertMatchBadge
            procedureType={procedure.procedure_type}
            price={Number(procedure.price_paid)}
            userAlerts={userAlerts}
            city={procedure.city}
            state={procedure.state}
          />
        </div>
      )}

      {/* Units / volume */}
      {procedure.units_or_volume && (
        <p className="text-sm text-text-secondary mb-1">
          {procedure.units_or_volume}
        </p>
      )}

      {/* Financing */}
      <FinancingWidget
        procedureName={procedure.procedure_type}
        estimatedCost={Number(procedure.price_paid)}
        variant="compact"
      />

      {/* Provider name + location */}
      <div className="flex items-center gap-2 mb-2">
        <ProviderAvatar name={procedure.provider_name} size={28} />
        <div>
          <p className="text-sm text-text-primary">
            {procedure.provider_name}
            {procedure.city && procedure.state && (
              <span className="text-text-secondary">
                {' '}
                &middot; {procedure.city}, {procedure.state}
              </span>
            )}
          </p>
          {procedure.injector_name && (
            <p className="text-xs text-[#0369A1]">
              Injected by {procedure.injector_name}
            </p>
          )}
        </div>
      </div>

      {/* Provider type badge */}
      {procedure.provider_type && (
        <span className="inline-block bg-rose-light text-rose-dark px-2 py-0.5 text-xs rounded-full mb-3">
          {procedure.provider_type}
        </span>
      )}

      {/* Trust indicators */}
      {procedure.receipt_verified && (
        <span
          className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full mb-2"
          style={{ backgroundColor: '#E1F5EE', color: '#0F6E56' }}
        >
          <CheckCircle size={11} />
          Verified Purchase
        </span>
      )}
      {!procedure.receipt_verified && procedure.result_photo_url && (
        <span
          className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full mb-2"
          style={{ backgroundColor: '#E6F1FB', color: '#185FA5' }}
        >
          <Camera size={11} />
          Has result photo
        </span>
      )}

      {/* Notes */}
      {procedure.notes && (
        <p className="text-sm italic text-text-secondary line-clamp-2 mt-2">
          {procedure.notes}
        </p>
      )}

      {/* Provider response */}
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
            className="flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
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

      {/* Community flag button */}
      <div className="flex justify-end mt-2 opacity-40 group-hover:opacity-100 transition-opacity">
        <DisputeButton procedureId={procedure.id} procedureUserId={procedure.user_id} />
      </div>
    </Wrapper>
  );
}

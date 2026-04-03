import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Users, ChevronDown, ChevronUp, FileCheck, RotateCcw, CheckCircle, Camera } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ProcedureIcon from './ProcedureIcon';
import ProviderAvatar from './ProviderAvatar';
import StarRating from './StarRating';
import FairPriceBadge from './FairPriceBadge';
import { providerProfileUrl } from '../lib/slugify';

export default function ProcedureCard({ procedure }) {
  const isVerified = procedure.source === 'verified';
  const [responseExpanded, setResponseExpanded] = useState(false);

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
      className="block glow-card p-5 hover:no-underline"
    >
      {/* Top row: badge */}
      <div className="flex items-center justify-between mb-3">
        {isVerified ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-verified bg-verified/10 px-2 py-0.5 rounded-full">
            <ShieldCheck size={14} />
            Provider-listed price
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-community bg-community/10 px-2 py-0.5 rounded-full">
            <Users size={14} />
            Patient reported
          </span>
        )}
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

      {/* Units / volume */}
      {procedure.units_or_volume && (
        <p className="text-sm text-text-secondary mb-3">
          {procedure.units_or_volume}
        </p>
      )}

      {/* Provider name + location */}
      <div className="flex items-center gap-2 mb-2">
        <ProviderAvatar name={procedure.provider_name} size={28} />
        <p className="text-sm text-text-primary">
          {procedure.provider_name}
          {procedure.city && procedure.state && (
            <span className="text-text-secondary">
              {' '}
              &middot; {procedure.city}, {procedure.state}
            </span>
          )}
        </p>
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
    </Wrapper>
  );
}

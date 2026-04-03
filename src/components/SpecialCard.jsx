import { Link } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function SpecialCard({ special, provider }) {
  const hasDiscount = special.original_price && special.special_price;
  const isExpired = special.expires_at && new Date(special.expires_at) < new Date();

  return (
    <div className="glow-card p-5 border-l-4 border-rose-accent">
      {/* Provider name */}
      <p className="text-sm font-bold text-text-primary mb-1">
        {provider?.name || special.provider_name || 'Provider'}
      </p>

      {/* Special title */}
      <h3 className="text-lg font-semibold text-text-primary mb-2">
        {special.title}
      </h3>

      {/* Description */}
      {special.description && (
        <p className="text-sm text-text-secondary mb-3">
          {special.description}
        </p>
      )}

      {/* Pricing */}
      {hasDiscount && (
        <div className="flex items-baseline gap-3 mb-3">
          <span className="text-sm text-text-secondary line-through">
            ${Number(special.original_price).toLocaleString()}
          </span>
          <span className="text-xl font-bold text-text-primary">
            ${Number(special.special_price).toLocaleString()}
          </span>
        </div>
      )}

      {/* Expiry */}
      {special.expires_at && (
        <div className="flex items-center gap-1.5 mb-3">
          <Clock size={14} className={isExpired ? 'text-red-400' : 'text-text-secondary'} />
          <span
            className={`text-xs ${isExpired ? 'text-red-400 font-medium' : 'text-text-secondary'}`}
          >
            {isExpired
              ? 'Expired'
              : `Expires ${formatDistanceToNow(new Date(special.expires_at), { addSuffix: true })}`}
          </span>
        </div>
      )}

      {/* Procedure type badge */}
      {special.procedure_type && (
        <span className="inline-block bg-rose-light text-rose-dark px-2 py-0.5 text-xs rounded-full mb-4">
          {special.procedure_type}
        </span>
      )}

      {/* View Provider link */}
      {provider?.slug && (
        <Link
          to={`/provider/${provider.slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-rose-accent hover:text-rose-dark transition-colors mt-1"
        >
          View Provider
          <ArrowRight size={14} />
        </Link>
      )}
    </div>
  );
}

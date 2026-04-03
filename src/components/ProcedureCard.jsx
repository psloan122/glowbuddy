import { Link } from 'react-router-dom';
import { ShieldCheck, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function ProcedureCard({ procedure }) {
  const isVerified = procedure.source === 'verified';

  return (
    <Link
      to={`/provider/${procedure.provider_slug}`}
      className="block glow-card p-5 hover:no-underline"
    >
      {/* Top row: badge */}
      <div className="flex items-center justify-between mb-3">
        {isVerified ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-verified bg-verified/10 px-2 py-0.5 rounded-full">
            <ShieldCheck size={14} />
            Verified
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-community bg-community/10 px-2 py-0.5 rounded-full">
            <Users size={14} />
            Community
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

      {/* Procedure type */}
      <h3 className="text-lg font-bold text-text-primary mb-1">
        {procedure.procedure_type}
      </h3>

      {/* Treatment area */}
      {procedure.treatment_area && (
        <p className="text-sm text-text-secondary mb-3">
          {procedure.treatment_area}
        </p>
      )}

      {/* Price */}
      <div className="price-display mb-2">
        ${Number(procedure.price_paid).toLocaleString()}
      </div>

      {/* Units / volume */}
      {procedure.units_or_volume && (
        <p className="text-sm text-text-secondary mb-3">
          {procedure.units_or_volume}
        </p>
      )}

      {/* Provider name + location */}
      <div className="flex items-center justify-between mb-2">
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

      {/* Notes */}
      {procedure.notes && (
        <p className="text-sm italic text-text-secondary line-clamp-2 mt-2">
          {procedure.notes}
        </p>
      )}
    </Link>
  );
}

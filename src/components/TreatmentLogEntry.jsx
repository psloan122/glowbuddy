import { Trash2, Edit3, AlertCircle, CheckCircle, Clock, Info } from 'lucide-react';
import StarRating from './StarRating';

function getDueStatus(nextRecommendedDate) {
  if (!nextRecommendedDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const next = new Date(nextRecommendedDate);
  next.setHours(0, 0, 0, 0);

  const diffMs = next.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    const overdueDays = Math.abs(diffDays);
    const label =
      overdueDays >= 14
        ? `Overdue by ${Math.floor(overdueDays / 7)} weeks`
        : `Overdue by ${overdueDays} day${overdueDays !== 1 ? 's' : ''}`;
    return {
      type: 'overdue',
      label,
      badge: 'Overdue',
      colorClasses: 'bg-red-100 text-red-700',
      Icon: AlertCircle,
    };
  }

  if (diffDays <= 14) {
    return {
      type: 'due-soon',
      label: `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`,
      badge: 'Due soon',
      colorClasses: 'bg-amber-100 text-amber-700',
      Icon: Clock,
    };
  }

  const formatted = next.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return {
    type: 'on-track',
    label: `Next: ${formatted}`,
    badge: 'On track',
    colorClasses: 'bg-green-100 text-green-700',
    Icon: CheckCircle,
  };
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function TreatmentLogEntry({ entry, onEdit, onDelete, cadenceNotes }) {
  const {
    id,
    treatment_name,
    date_received,
    provider_name,
    price_paid,
    units_or_syringes,
    satisfaction_rating,
    notes,
    next_recommended_date,
  } = entry;

  const dueStatus = getDueStatus(next_recommended_date);
  const cadenceNote = cadenceNotes?.[treatment_name];

  return (
    <div className="glow-card p-4">
      {/* Top row: treatment name + due-for-refresh badge */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold text-text-primary truncate">{treatment_name}</h3>
        {dueStatus && (
          <span
            className={`inline-flex items-center gap-1 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${dueStatus.colorClasses}`}
            title={dueStatus.label}
          >
            <dueStatus.Icon className="w-3 h-3" />
            {dueStatus.badge}
          </span>
        )}
      </div>

      {/* Due status detail text */}
      {dueStatus && (
        <p
          className={`text-xs mt-0.5 ${
            dueStatus.type === 'overdue'
              ? 'text-red-600'
              : dueStatus.type === 'due-soon'
              ? 'text-amber-600'
              : 'text-green-600'
          }`}
        >
          {dueStatus.label}
        </p>
      )}

      {/* Second row: date + provider */}
      <div className="flex items-center gap-2 mt-2 text-sm text-text-secondary">
        <span>{formatDate(date_received)}</span>
        {provider_name && (
          <>
            <span className="text-text-secondary/40">·</span>
            <span>{provider_name}</span>
          </>
        )}
      </div>

      {/* Third row: price + units + satisfaction */}
      <div className="flex items-center gap-3 mt-1.5 text-sm">
        {price_paid != null && (
          <span className="font-medium text-text-primary">${price_paid}</span>
        )}
        {units_or_syringes && (
          <span className="text-text-secondary">{units_or_syringes}</span>
        )}
        {satisfaction_rating != null && (
          <span className="inline-flex items-center">
            <StarRating value={satisfaction_rating} readOnly size={12} />
          </span>
        )}
      </div>

      {/* Notes */}
      {notes && (
        <p className="mt-2 text-sm italic text-text-secondary line-clamp-2">{notes}</p>
      )}

      {/* Cadence source note */}
      {cadenceNote && (
        <div className="flex items-start gap-1.5 mt-2 text-xs text-text-secondary/70">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{cadenceNote}</span>
        </div>
      )}

      {/* Bottom row: Edit + Delete buttons */}
      <div className="flex items-center gap-3 mt-3 pt-2 border-t border-text-secondary/10">
        <button
          type="button"
          onClick={() => onEdit(entry)}
          className="inline-flex items-center gap-1 text-xs text-[#0369A1] hover:text-[#025e8a] transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5" />
          Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(id)}
          className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-600 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}

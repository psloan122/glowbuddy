import { useState } from 'react';
import { CheckCircle, Clock, AlertTriangle, XCircle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { procedureToSlug } from '../lib/constants';

const COMPAT_STYLES = {
  great_combo: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: CheckCircle,
    iconColor: 'text-emerald-600',
    badgeBg: 'bg-emerald-100 text-emerald-700',
    label: 'Great Combo',
  },
  same_day_ok: {
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    icon: CheckCircle,
    iconColor: 'text-sky-600',
    badgeBg: 'bg-sky-100 text-sky-700',
    label: 'Same Day OK',
  },
  space_apart: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: Clock,
    iconColor: 'text-amber-600',
    badgeBg: 'bg-amber-100 text-amber-700',
    label: 'Space Apart',
  },
  avoid: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: XCircle,
    iconColor: 'text-red-600',
    badgeBg: 'bg-red-100 text-red-700',
    label: 'Avoid',
  },
};

export default function StackCompatibilityCard({ rule, otherTreatment, localPrice }) {
  const [expanded, setExpanded] = useState(false);
  const style = COMPAT_STYLES[rule.compatibility] || COMPAT_STYLES.space_apart;
  const Icon = style.icon;

  return (
    <div className={`glow-card border ${style.border} overflow-hidden`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Icon size={20} className={`${style.iconColor} mt-0.5 shrink-0`} />
            <div>
              <h3 className="font-semibold text-text-primary leading-snug">{otherTreatment}</h3>
              {rule.timing_note && (
                <p className="text-sm text-text-secondary mt-1">{rule.timing_note}</p>
              )}
            </div>
          </div>
          <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-semibold ${style.badgeBg}`}>
            {style.label}
          </span>
        </div>

        {/* Pro tip */}
        {rule.pro_tip && (
          <p className="mt-3 text-sm text-text-secondary bg-gray-50 rounded-lg px-3 py-2">
            💡 {rule.pro_tip}
          </p>
        )}

        {/* Local price */}
        {localPrice && (
          <p className="mt-2 text-sm font-medium text-text-primary">
            Avg local price: ${localPrice.toLocaleString()}
          </p>
        )}

        {/* Why / Source toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
        >
          Why?
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {expanded && (
          <div className="mt-2 text-sm text-text-secondary border-t border-gray-100 pt-2">
            <p>{rule.why}</p>
            {rule.source_url && (
              <a
                href={rule.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-[#0369A1] hover:underline"
              >
                <ExternalLink size={12} />
                {rule.source_type === 'fda_label' ? 'FDA Label' : rule.source_type === 'peer_reviewed' ? 'Peer-reviewed source' : 'Clinical source'}
              </a>
            )}
          </div>
        )}

        {/* Browse CTA */}
        <div className="mt-3">
          <Link
            to={`/procedure/${procedureToSlug(otherTreatment)}`}
            className="text-xs font-medium text-[#0369A1] hover:underline"
          >
            Browse {otherTreatment} prices →
          </Link>
        </div>
      </div>
    </div>
  );
}

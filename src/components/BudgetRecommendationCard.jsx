import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const priorityStyles = {
  high: {
    border: "border-l-red-400",
    badge: "bg-red-50 text-red-600 border border-red-200",
    label: "HIGH",
  },
  medium: {
    border: "border-l-amber-400",
    badge: "bg-amber-50 text-amber-600 border border-amber-200",
    label: "MEDIUM",
  },
  low: {
    border: "border-l-green-400",
    badge: "bg-green-50 text-green-600 border border-green-200",
    label: "LOW",
  },
  nice_to_have: {
    border: "border-l-green-400",
    badge: "bg-green-50 text-green-600 border border-green-200",
    label: "NICE TO HAVE",
  },
};

export default function BudgetRecommendationCard({ recommendation }) {
  const {
    treatment,
    reason,
    estimated_cost_low,
    estimated_cost_high,
    priority,
    value_note,
  } = recommendation;

  const style = priorityStyles[priority] || priorityStyles.medium;

  return (
    <div className={`glow-card p-5 border-l-4 ${style.border}`}>
      {/* Top row: treatment name + priority badge */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-bold text-lg leading-snug">{treatment}</h3>
        <span
          className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${style.badge}`}
        >
          {style.label}
        </span>
      </div>

      {/* Reason */}
      <p className="mt-2 text-sm text-text-secondary line-clamp-3">{reason}</p>

      {/* Cost range */}
      <p className="mt-3 font-semibold">
        ${estimated_cost_low} &ndash; ${estimated_cost_high} estimated
      </p>

      {/* Value note */}
      {value_note && (
        <p className="mt-1 text-xs text-text-secondary italic">{value_note}</p>
      )}

      {/* CTA */}
      <Link
        to={`/?procedure=${encodeURIComponent(treatment)}`}
        className="mt-3 inline-flex items-center gap-1 text-[#0369A1] text-sm font-medium"
      >
        Find providers
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, BellOff, Trash2, TrendingDown, Share2 } from "lucide-react";
import { formatUnitSuffix } from '../utils/formatPricingUnit';

export default function AlertCard({ alert, triggers, onToggle, onDelete, currentAvg }) {
  const [copied, setCopied] = useState(null);

  const {
    id,
    procedure_type,
    brand,
    price_unit,
    city,
    state,
    radius_miles,
    max_price,
    is_active,
    trigger_count,
    last_triggered_at,
  } = alert;

  const unitSuffix = price_unit ? formatUnitSuffix(price_unit) : '';

  // Label: prefer the brand (e.g. "Botox") over the generic category slug
  // (e.g. "neurotoxin") so the user sees what they actually signed up for.
  const procedureLabel = brand || procedure_type;

  // Location line: "Within 25 miles of Mandeville, LA" when a radius is set,
  // otherwise just the city/state or "Any location".
  const locationLabel = (() => {
    if (!city && !state) return 'Any location';
    const cityState = [city, state].filter(Boolean).join(', ');
    if (radius_miles && radius_miles > 0) {
      return `Within ${radius_miles} miles of ${cityState}`;
    }
    return cityState;
  })();

  // Simple relative time helper
  const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
  };

  // Progress bar calculations
  const hasProgress = currentAvg != null && max_price != null;
  const targetReached = hasProgress && currentAvg <= max_price;
  const progress = hasProgress
    ? Math.max(0, Math.min(100, ((currentAvg - max_price) / currentAvg) * 100))
    : 0;
  const amountAway = hasProgress ? (currentAvg - max_price).toFixed(2) : null;

  const handleShare = async (trigger) => {
    const price = trigger.price_seen || trigger.procedures?.price_paid;
    const url = `${window.location.origin}/deal?treatment=${encodeURIComponent(
      procedure_type
    )}&price=${price}&city=${encodeURIComponent(city || "")}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(trigger.id || trigger.procedures?.id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Fallback silently
    }
  };

  return (
    <div className="glow-card p-5">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-primary truncate">{procedureLabel}</h3>
            {radius_miles > 0 && (
              <span
                className="text-[10px] font-semibold uppercase text-hot-pink border border-hot-pink/40 px-2 py-0.5"
                style={{ letterSpacing: '0.06em', borderRadius: '4px' }}
              >
                {radius_miles} mi radius
              </span>
            )}
            {!is_active && (
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                Paused
              </span>
            )}
          </div>

          <p className="text-sm text-secondary mt-0.5">
            {locationLabel}
          </p>

          {max_price != null && (
            <p className="text-sm text-secondary mt-0.5">
              Target: <span className="font-medium text-primary">Under ${max_price}{unitSuffix}</span>
            </p>
          )}

          {currentAvg != null && (
            <p className="text-sm text-secondary mt-0.5">
              Current avg: <span className="font-medium">${currentAvg}</span>
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onToggle(id, !is_active)}
            className={`p-2 rounded-lg transition-colors ${
              is_active
                ? "bg-green-50 text-green-600 hover:bg-green-100"
                : "bg-gray-100 text-gray-400 hover:bg-gray-200"
            }`}
            aria-label={is_active ? "Pause alert" : "Activate alert"}
          >
            {is_active ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>

          <button
            onClick={() => onDelete(id)}
            className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
            aria-label="Delete alert"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {hasProgress && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-secondary flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              Progress to target
            </span>
            {targetReached ? (
              <span className="text-green-600 font-medium">Target reached!</span>
            ) : (
              <span className="text-secondary">${amountAway} away</span>
            )}
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-rose-accent rounded-full transition-all duration-500"
              style={{ width: `${100 - progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-3 mt-3 text-xs text-secondary">
        {trigger_count > 0 && <span>{trigger_count} matches so far</span>}
        {last_triggered_at && <span>Last match {timeAgo(last_triggered_at)}</span>}
      </div>

      {/* Recent triggers */}
      {triggers && triggers.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-secondary uppercase tracking-wide">
            Recent matches
          </p>
          {triggers.slice(0, 3).map((trigger, idx) => {
            const providerName =
              trigger.provider_name || trigger.procedures?.provider_name || "Unknown provider";
            const price = trigger.price_seen || trigger.procedures?.price_paid;
            const triggerCity = trigger.city || trigger.procedures?.city;
            const triggerState = trigger.state || trigger.procedures?.state;
            const location =
              triggerCity && triggerState ? `${triggerCity}, ${triggerState}` : null;
            const triggerId = trigger.id || trigger.procedures?.id || idx;

            return (
              <div
                key={triggerId}
                className="flex items-center justify-between bg-warm-gray rounded-lg px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-primary truncate">{providerName}</p>
                  {location && (
                    <p className="text-xs text-secondary">{location}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {price != null && (
                    <span className="text-sm font-semibold text-rose-accent">${price}</span>
                  )}
                  <button
                    onClick={() => handleShare(trigger)}
                    className="p-1.5 rounded-md hover:bg-gray-200 transition-colors text-secondary"
                    aria-label="Share deal"
                  >
                    {copied === triggerId ? (
                      <span className="text-xs text-green-600 font-medium">Copied!</span>
                    ) : (
                      <Share2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

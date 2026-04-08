import { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingDown, TrendingUp } from 'lucide-react';
import { normalizePrice } from '../lib/priceUtils';

export default function ProviderPricingSection({ verifiedPricing, priceComparisons, interestedProcedures }) {
  const [showAll, setShowAll] = useState(false);

  if (!verifiedPricing || verifiedPricing.length === 0) return null;

  // Sort: interested procedures first, then alphabetical
  const interestedSet = new Set(interestedProcedures || []);
  const sorted = [...verifiedPricing].sort((a, b) => {
    const aInterested = interestedSet.has(a.procedure_type);
    const bInterested = interestedSet.has(b.procedure_type);
    if (aInterested && !bInterested) return -1;
    if (!aInterested && bInterested) return 1;
    return (a.procedure_type || '').localeCompare(b.procedure_type || '');
  });

  const interestedCount = sorted.filter((p) => interestedSet.has(p.procedure_type)).length;
  const hasNonInterested = interestedSet.size > 0 && interestedCount < sorted.length;
  const visibleItems = hasNonInterested && !showAll
    ? sorted.slice(0, Math.max(interestedCount, 3))
    : sorted;
  const hiddenCount = sorted.length - visibleItems.length;

  return (
    <div className="glow-card overflow-hidden">
      <div className="divide-y divide-gray-100">
        {visibleItems.map((item) => {
          const comparison = priceComparisons?.[item.procedure_type];
          const normalized = normalizePrice(item);
          if (normalized.category === 'hidden') return null;
          return (
            <div key={item.id} className="flex items-center justify-between p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary">{item.procedure_type}</p>
                {(item.treatment_area || item.units_or_volume) && (
                  <p className="text-xs text-text-secondary mt-0.5">
                    {item.treatment_area || item.units_or_volume}
                  </p>
                )}
              </div>
              <div className="text-right flex items-center gap-2 shrink-0">
                <p className="text-lg font-bold text-text-primary">{normalized.displayPrice}</p>
                {comparison && (
                  <ComparisonBadge pctDiff={comparison.pctDiff} level={comparison.level} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hiddenCount > 0 && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full py-3 text-sm font-medium text-text-secondary hover:text-text-primary border-t border-gray-100 flex items-center justify-center gap-1 transition"
        >
          Show {hiddenCount} more procedure{hiddenCount !== 1 ? 's' : ''}
          <ChevronDown size={14} />
        </button>
      )}
      {showAll && hasNonInterested && (
        <button
          onClick={() => setShowAll(false)}
          className="w-full py-3 text-sm font-medium text-text-secondary hover:text-text-primary border-t border-gray-100 flex items-center justify-center gap-1 transition"
        >
          Show less
          <ChevronUp size={14} />
        </button>
      )}
    </div>
  );
}

function ComparisonBadge({ pctDiff, level }) {
  if (pctDiff === 0) return null;

  const isBelow = pctDiff < 0;
  const absPct = Math.abs(pctDiff);

  return (
    <span
      className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-xs font-medium ${
        isBelow
          ? 'bg-green-50 text-green-700'
          : 'bg-amber-50 text-amber-700'
      }`}
      title={`${absPct}% ${isBelow ? 'below' : 'above'} ${level} average`}
    >
      {isBelow ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
      {absPct}%
    </span>
  );
}

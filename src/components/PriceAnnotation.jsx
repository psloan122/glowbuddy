import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { COL } from '../utils/formatPricingUnit';

// In-memory cache for guide data
const guideCache = new Map();

async function getGuide(treatmentName) {
  if (guideCache.has(treatmentName)) return guideCache.get(treatmentName);
  const { data } = await supabase
    .from('treatment_guides')
    .select(`${COL.RANGE_LOW}, ${COL.RANGE_HIGH}`)
    .eq('treatment_name', treatmentName)
    .single();
  guideCache.set(treatmentName, data || null);
  return data || null;
}

export default function PriceAnnotation({ price, treatmentName }) {
  const [annotation, setAnnotation] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getGuide(treatmentName).then((guide) => {
      if (cancelled || !guide) return;
      const numPrice = Number(price);
      const low = guide[COL.RANGE_LOW];
      const high = guide[COL.RANGE_HIGH];
      if (numPrice <= high && numPrice >= low) {
        setAnnotation({
          label: 'Fair for first-timers',
          color: '#0369A1',
          bg: '#E0F2FE',
          icon: '\u2713',
          tooltip: null,
        });
      } else if (numPrice < low) {
        setAnnotation({
          label: 'Below typical range',
          color: '#92400E',
          bg: '#FEF3C7',
          icon: '\u26A0\uFE0F',
          tooltip: 'Prices significantly below market average may indicate diluted product or an inexperienced provider. The ASPS recommends verifying provider credentials and that products are obtained from authorized distributors.',
        });
      } else {
        setAnnotation(null);
      }
    });
    return () => { cancelled = true; };
  }, [price, treatmentName]);

  if (!annotation) return null;

  return (
    <span className="relative inline-flex items-center">
      <span
        className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full cursor-default"
        style={{ color: annotation.color, backgroundColor: annotation.bg }}
        onMouseEnter={() => annotation.tooltip && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => annotation.tooltip && setShowTooltip(!showTooltip)}
      >
        {annotation.icon} {annotation.label}
      </span>
      {showTooltip && annotation.tooltip && (
        <span className="absolute bottom-full left-0 mb-2 w-64 p-2.5 rounded-lg bg-gray-900 text-white text-[11px] leading-relaxed shadow-lg z-50">
          {annotation.tooltip}
          <span className="absolute top-full left-4 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  );
}

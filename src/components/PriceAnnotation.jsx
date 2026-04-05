import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// In-memory cache for guide data
const guideCache = new Map();

async function getGuide(treatmentName) {
  if (guideCache.has(treatmentName)) return guideCache.get(treatmentName);
  const { data } = await supabase
    .from('treatment_guides')
    .select('typical_price_range_low, typical_price_range_high')
    .eq('treatment_name', treatmentName)
    .single();
  guideCache.set(treatmentName, data || null);
  return data || null;
}

export default function PriceAnnotation({ price, treatmentName }) {
  const [annotation, setAnnotation] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getGuide(treatmentName).then((guide) => {
      if (cancelled || !guide) return;
      const numPrice = Number(price);
      const { typical_price_range_low: low, typical_price_range_high: high } = guide;
      if (numPrice <= high && numPrice >= low) {
        setAnnotation({ label: 'Fair for first-timers', color: '#0369A1', bg: '#E0F2FE', icon: '\u2713' });
      } else if (numPrice < low) {
        setAnnotation({ label: 'Below typical range', color: '#92400E', bg: '#FEF3C7', icon: '\u26A0\uFE0F' });
      } else {
        setAnnotation(null);
      }
    });
    return () => { cancelled = true; };
  }, [price, treatmentName]);

  if (!annotation) return null;

  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
      style={{ color: annotation.color, backgroundColor: annotation.bg }}
    >
      {annotation.icon} {annotation.label}
    </span>
  );
}

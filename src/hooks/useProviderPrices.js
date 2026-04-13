import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AVG_PRICES } from '../lib/constants';

export default function useProviderPrices(providerId, cityState) {
  const [verifiedPricing, setVerifiedPricing] = useState([]);
  const [communityAverages, setCommunityAverages] = useState({});
  const [priceComparisons, setPriceComparisons] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!providerId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);

      // Fetch provider pricing (display_suppressed rows are hidden via migration 053)
      const { data: pricing } = await supabase
        .from('provider_pricing')
        .select('id, provider_id, procedure_type, brand, price, units_or_volume, treatment_area, price_label, notes, source, verified, source_url, scraped_at, created_at, confidence_tier, is_starting_price, category, tags')
        .eq('provider_id', providerId)
        .eq('display_suppressed', false);

      if (cancelled) return;
      setVerifiedPricing(pricing || []);

      // Fetch community averages for comparison
      const city = cityState?.city;
      const state = cityState?.state;
      const avgs = {};
      const comparisons = {};

      if (pricing?.length) {
        // Try city-level averages from materialized view
        if (city && state) {
          const { data: cityAvgs } = await supabase
            .from('procedure_price_averages')
            .select('procedure_type, avg_price, median_price, submission_count')
            .eq('city', city)
            .eq('state', state)
            .in('procedure_type', pricing.map((p) => p.procedure_type));

          if (!cancelled && cityAvgs) {
            for (const row of cityAvgs) {
              avgs[row.procedure_type] = {
                avg: Number(row.avg_price),
                median: Number(row.median_price),
                count: Number(row.submission_count),
                level: 'city',
              };
            }
          }
        }

        // Compute comparisons (city avg > national avg fallback)
        for (const item of pricing) {
          const providerPrice = Number(item.price);
          const cityAvg = avgs[item.procedure_type];
          const nationalAvg = AVG_PRICES[item.procedure_type];

          const refPrice = cityAvg?.avg || nationalAvg?.avg;
          if (refPrice && providerPrice > 0) {
            const pctDiff = Math.round(((providerPrice - refPrice) / refPrice) * 100);
            comparisons[item.procedure_type] = {
              pctDiff,
              refPrice: Math.round(refPrice),
              level: cityAvg ? 'city' : 'national',
            };
          }
        }
      }

      if (!cancelled) {
        setCommunityAverages(avgs);
        setPriceComparisons(comparisons);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [providerId, cityState?.city, cityState?.state]);

  return { verifiedPricing, communityAverages, priceComparisons, loading };
}

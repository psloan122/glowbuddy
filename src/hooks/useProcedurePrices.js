import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

const ADVERTISED_SOURCES = new Set([
  'provider_listed',
  'cheerio_scraper',
  'scrape',
  'csv_import',
]);

/**
 * Fetch all provider_pricing rows for a provider and split by source type.
 *
 * Returns:
 *   advertised       — rows from provider-controlled/scraped sources
 *   communityPricing — rows tagged community_submitted in provider_pricing
 *   avgAdvertisedPrice — per-procedure-type { avg, count } map from advertised rows
 *   avgCommunityPrice  — per-procedure-type { avg, count } map from communityPricing rows
 *   loading
 *
 * Note: patient submissions from the community flow land in the `procedures`
 * table (not provider_pricing). The communityPricing bucket here covers any
 * provider_pricing rows explicitly tagged community_submitted — typically
 * migrated historical data.
 */
export default function useProcedurePrices(providerId) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!providerId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    supabase
      .from('provider_pricing')
      .select(
        'id, provider_id, procedure_type, brand, price, units_or_volume, treatment_area, price_label, notes, source, verified, source_url, scraped_at, created_at, confidence_tier, is_starting_price, category, tags'
      )
      .eq('provider_id', providerId)
      .eq('is_active', true)
      .eq('display_suppressed', false)
      .lt('confidence_tier', 6)
      .then(({ data }) => {
        if (!cancelled) {
          setRows(data || []);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [providerId]);

  const advertised = useMemo(
    () => rows.filter((r) => ADVERTISED_SOURCES.has(r.source)),
    [rows]
  );

  const communityPricing = useMemo(
    () => rows.filter((r) => r.source === 'community_submitted'),
    [rows]
  );

  const avgAdvertisedPrice = useMemo(() => {
    const acc = {};
    for (const row of advertised) {
      const pt = row.procedure_type;
      const p = Number(row.price);
      if (p > 0) {
        if (!acc[pt]) acc[pt] = { sum: 0, count: 0 };
        acc[pt].sum += p;
        acc[pt].count += 1;
        acc[pt].avg = Math.round(acc[pt].sum / acc[pt].count);
      }
    }
    return acc;
  }, [advertised]);

  const avgCommunityPrice = useMemo(() => {
    const acc = {};
    for (const row of communityPricing) {
      const pt = row.procedure_type;
      const p = Number(row.price);
      if (p > 0) {
        if (!acc[pt]) acc[pt] = { sum: 0, count: 0 };
        acc[pt].sum += p;
        acc[pt].count += 1;
        acc[pt].avg = Math.round(acc[pt].sum / acc[pt].count);
      }
    }
    return acc;
  }, [communityPricing]);

  return { advertised, communityPricing, avgAdvertisedPrice, avgCommunityPrice, loading };
}

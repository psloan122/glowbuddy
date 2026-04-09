/**
 * Centralized provider_pricing query layer.
 *
 * IMPORTANT RULE: Never aggregate across `price_label` groups.
 * `per_unit`, `per_area`, `per_syringe`, `per_session`, etc. measure totally
 * different things and must always stay in separate buckets. Every helper here
 * either filters to a single price_label or returns data already grouped by
 * price_label so callers can render each bucket on its own.
 *
 * Other rules enforced (or surfaced) by these helpers:
 *  - Every read path filters `display_suppressed = false` — suppressed rows
 *    (ambiguous area/package prices, misclassified low prices) are hidden
 *    from all consumer-facing surfaces by migration 053.
 *  - "Verified" === verified === true && source === 'manual'
 *  - vs-avg comparisons should be hidden when bucket count < 5
 *    (we still return the average; callers must check `count` themselves)
 *  - 90+ day old rows should show a "May be outdated" warning
 *  - Scraped rows need a "Pulled from public website" disclaimer
 */

import { supabase } from '../supabase';
import { parseCitySlug } from '../slugify';
import { normalizePrice } from '../priceUtils';

const STALE_DAYS = 90;
const MIN_SAMPLES_FOR_VS_AVG = 5;

const PROVIDER_FIELDS = 'id, name, slug, city, state, zip_code';
const PRICING_FIELDS =
  'id, provider_id, procedure_type, price, units_or_volume, treatment_area, price_label, notes, source, verified, source_url, scraped_at, created_at';

function median(arr) {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function average(arr) {
  if (!arr.length) return null;
  return Math.round(arr.reduce((sum, n) => sum + n, 0) / arr.length);
}

function normLabel(label) {
  return (label || 'unspecified').trim().toLowerCase();
}

async function fetchCityRows(citySlug, procedureType) {
  const parsed = parseCitySlug(citySlug);
  if (!parsed) return { rows: [], city: null, state: null };

  let query = supabase
    .from('provider_pricing')
    .select(`${PRICING_FIELDS}, providers!inner(${PROVIDER_FIELDS})`)
    .eq('display_suppressed', false)
    .ilike('providers.city', parsed.city)
    .eq('providers.state', parsed.state);

  if (procedureType) {
    query = query.eq('procedure_type', procedureType);
  }

  const { data, error } = await query;
  if (error || !data) {
    return { rows: [], city: parsed.city, state: parsed.state };
  }
  return { rows: data, city: parsed.city, state: parsed.state };
}

/**
 * Aggregated city data for a single procedure, grouped by price_label.
 * NEVER blends across price_label groups.
 */
export async function getCityPriceData(citySlug, procedureType) {
  const { rows, city, state } = await fetchCityRows(citySlug, procedureType);

  // Group by normalized price_label
  const groups = new Map();
  for (const row of rows) {
    const price = Number(row.price);
    if (!(price > 0)) continue;
    const key = normLabel(row.price_label);
    if (!groups.has(key)) {
      groups.set(key, {
        priceLabel: row.price_label || 'unspecified',
        prices: [],
        verifiedCount: 0,
        scrapedCount: 0,
      });
    }
    const g = groups.get(key);
    g.prices.push(price);
    if (row.verified === true && row.source === 'manual') g.verifiedCount += 1;
    if (row.source === 'scrape') g.scrapedCount += 1;
  }

  const buckets = [...groups.values()]
    .map((g) => ({
      priceLabel: g.priceLabel,
      count: g.prices.length,
      avg: average(g.prices),
      median: median(g.prices),
      min: Math.min(...g.prices),
      max: Math.max(...g.prices),
      verifiedCount: g.verifiedCount,
      scrapedCount: g.scrapedCount,
    }))
    .sort((a, b) => b.count - a.count);

  return { buckets, city, state, procedureType };
}

/**
 * One row per provider for the given procedure, sorted ascending by price.
 * vsCityAvgPct is only set when the row's price_label bucket has >=5 samples.
 */
export async function getProviderPriceComparisons(citySlug, procedureType) {
  const { rows } = await fetchCityRows(citySlug, procedureType);
  if (!rows.length) return [];

  // Normalize every row up front. After migration 053 only confirmed
  // per_unit / per_syringe / per_session / per_month rows survive the
  // display_suppressed filter, so every normalized value is a direct
  // comparable — no more estimates.
  const normalizedRows = rows
    .map((row) => ({ row, normalized: normalizePrice(row) }))
    .filter(
      (item) =>
        Number(item.row.price) > 0 &&
        item.normalized.category !== 'hidden',
    );

  // Per-bucket city averages keyed by the normalized compareUnit
  // ("per unit", "per syringe", "per session", "per month"). We still key on
  // compareUnit rather than raw price_label so "monthly" and "per_month" roll
  // up together.
  const bucketStats = new Map();
  for (const { normalized } of normalizedRows) {
    const v = normalized.comparableValue;
    if (v == null || v <= 0) continue;
    const key = normalized.compareUnit || 'unknown';
    if (!bucketStats.has(key)) bucketStats.set(key, []);
    bucketStats.get(key).push(v);
  }
  const bucketAvg = new Map();
  for (const [key, values] of bucketStats) {
    bucketAvg.set(key, { avg: average(values), count: values.length });
  }

  // Pick the best (lowest comparable value) row per provider.
  const byProvider = new Map();
  for (const { row, normalized } of normalizedRows) {
    const provider = row.providers;
    if (!provider) continue;
    const existing = byProvider.get(provider.id);
    if (!existing) {
      byProvider.set(provider.id, { row, normalized });
      continue;
    }
    const a = normalized.comparableValue ?? Number(row.price);
    const b = existing.normalized.comparableValue ?? Number(existing.row.price);
    if (a < b) byProvider.set(provider.id, { row, normalized });
  }

  const out = [];
  for (const { row, normalized } of byProvider.values()) {
    const provider = row.providers;
    const price = Number(row.price);
    const bucketKey = normalized.compareUnit || 'unknown';
    const stats = bucketAvg.get(bucketKey);
    let vsCityAvgPct = null;
    if (
      normalized.comparableValue != null &&
      stats &&
      stats.count >= MIN_SAMPLES_FOR_VS_AVG &&
      stats.avg > 0
    ) {
      vsCityAvgPct = Math.round(
        ((normalized.comparableValue - stats.avg) / stats.avg) * 100,
      );
    }
    out.push({
      providerId: provider.id,
      providerName: provider.name,
      providerSlug: provider.slug,
      providerCity: provider.city,
      providerState: provider.state,
      price,
      priceLabel: row.price_label || 'unspecified',
      treatmentArea: row.treatment_area || null,
      procedureType: row.procedure_type || null,
      unitsOrVolume: row.units_or_volume || null,
      // Normalized fields for the comparison table
      displayPrice: normalized.displayPrice,
      comparableValue: normalized.comparableValue,
      compareUnit: normalized.compareUnit,
      category: normalized.category,
      source: row.source,
      verified: row.verified,
      sourceUrl: row.source_url,
      scrapedAt: row.scraped_at,
      createdAt: row.created_at,
      vsCityAvgPct,
    });
  }

  // Sort by comparable per-unit value ascending; rows with no comparable
  // value are pushed to the bottom (per spec).
  out.sort((a, b) => {
    if (a.comparableValue == null && b.comparableValue == null) return 0;
    if (a.comparableValue == null) return 1;
    if (b.comparableValue == null) return -1;
    return a.comparableValue - b.comparableValue;
  });
  return out;
}

/**
 * Histogram for the dominant price_label only.
 * Returns 6 bins between min and max of that bucket.
 */
export async function getPriceDistribution(citySlug, procedureType) {
  const { rows } = await fetchCityRows(citySlug, procedureType);
  if (!rows.length) return { buckets: [], priceLabel: null, totalSamples: 0 };

  // Find dominant label
  const labelCounts = new Map();
  for (const row of rows) {
    if (!(Number(row.price) > 0)) continue;
    const key = normLabel(row.price_label);
    labelCounts.set(key, (labelCounts.get(key) || 0) + 1);
  }
  if (!labelCounts.size) return { buckets: [], priceLabel: null, totalSamples: 0 };

  let dominantKey = null;
  let dominantCount = -1;
  for (const [key, count] of labelCounts) {
    if (count > dominantCount) {
      dominantKey = key;
      dominantCount = count;
    }
  }

  const dominantRows = rows.filter(
    (r) => normLabel(r.price_label) === dominantKey && Number(r.price) > 0,
  );
  const dominantLabel =
    dominantRows[0]?.price_label || (dominantKey === 'unspecified' ? 'unspecified' : dominantKey);

  const prices = dominantRows.map((r) => Number(r.price));
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  const BIN_COUNT = 6;
  if (min === max) {
    return {
      buckets: [{ label: `$${min.toLocaleString()}`, min, max, count: prices.length }],
      priceLabel: dominantLabel,
      totalSamples: prices.length,
    };
  }
  const span = max - min;
  const step = span / BIN_COUNT;
  const buckets = [];
  for (let i = 0; i < BIN_COUNT; i += 1) {
    const lo = Math.round(min + step * i);
    const hi = Math.round(min + step * (i + 1));
    buckets.push({
      label: `$${lo.toLocaleString()}–$${hi.toLocaleString()}`,
      min: lo,
      max: hi,
      count: 0,
    });
  }
  for (const p of prices) {
    let idx = Math.floor((p - min) / step);
    if (idx >= BIN_COUNT) idx = BIN_COUNT - 1;
    if (idx < 0) idx = 0;
    buckets[idx].count += 1;
  }

  return { buckets, priceLabel: dominantLabel, totalSamples: prices.length };
}

/**
 * Recency + volume metrics used by the data freshness banner.
 */
export async function getDataFreshness(citySlug) {
  const { rows } = await fetchCityRows(citySlug, null);
  if (!rows.length) {
    return {
      mostRecent: null,
      daysSinceMostRecent: null,
      totalDataPoints: 0,
      distinctProviders: 0,
      verifiedDataPoints: 0,
      scrapedDataPoints: 0,
    };
  }

  let mostRecent = null;
  const providerIds = new Set();
  let verifiedCount = 0;
  let scrapedCount = 0;

  for (const row of rows) {
    const ts = row.scraped_at || row.created_at;
    if (ts) {
      const d = new Date(ts);
      if (!mostRecent || d > mostRecent) mostRecent = d;
    }
    if (row.providers?.id) providerIds.add(row.providers.id);
    if (row.verified === true && row.source === 'manual') verifiedCount += 1;
    if (row.source === 'scrape') scrapedCount += 1;
  }

  let daysSinceMostRecent = null;
  if (mostRecent) {
    daysSinceMostRecent = Math.floor((Date.now() - mostRecent.getTime()) / (1000 * 60 * 60 * 24));
  }

  return {
    mostRecent: mostRecent ? mostRecent.toISOString() : null,
    daysSinceMostRecent,
    totalDataPoints: rows.length,
    distinctProviders: providerIds.size,
    verifiedDataPoints: verifiedCount,
    scrapedDataPoints: scrapedCount,
  };
}

/**
 * ZIP-code grouping for the requested procedure (best available proxy for
 * neighborhood until we add a real `neighborhood` column to providers).
 */
export async function getNeighborhoodBreakdown(citySlug, procedureType) {
  const { rows } = await fetchCityRows(citySlug, procedureType);
  if (!rows.length) return [];

  // Group by ZIP, but never blend across price_label — pick the dominant
  // bucket so the average means something.
  const byZipBucket = new Map();
  for (const row of rows) {
    const price = Number(row.price);
    if (!(price > 0)) continue;
    const zip = row.providers?.zip_code;
    if (!zip) continue;
    const key = `${zip}|${normLabel(row.price_label)}`;
    if (!byZipBucket.has(key)) {
      byZipBucket.set(key, { zip, prices: [] });
    }
    byZipBucket.get(key).prices.push(price);
  }

  // Collapse to one row per ZIP (keep largest bucket)
  const byZip = new Map();
  for (const { zip, prices } of byZipBucket.values()) {
    const existing = byZip.get(zip);
    if (!existing || prices.length > existing.prices.length) {
      byZip.set(zip, { zip, prices });
    }
  }

  return [...byZip.values()]
    .filter((r) => r.prices.length >= 2)
    .map((r) => ({
      zip: r.zip,
      avg: average(r.prices),
      count: r.prices.length,
      min: Math.min(...r.prices),
      max: Math.max(...r.prices),
    }))
    .sort((a, b) => a.avg - b.avg);
}

/**
 * Lightweight summary for the CityPriceIndex hero. Single round trip,
 * head-counts only — no rows pulled.
 *
 * `totalCities` is the union of:
 *   • cities with patient submissions (from procedure_price_averages)
 *   • cities with non-suppressed provider menu prices (from
 *     provider_pricing JOIN providers)
 *
 * Without that union we'd undercount drastically — there are far more cities
 * with scraped menus than with patient submissions.
 */
export async function getGlobalPricingSummary() {
  const [verifiedRes, scrapedRes, totalRes, providerRes, mvRes, menuCityRes] =
    await Promise.all([
      supabase
        .from('provider_pricing')
        .select('id', { count: 'exact', head: true })
        .eq('display_suppressed', false)
        .eq('source', 'manual')
        .eq('verified', true),
      supabase
        .from('provider_pricing')
        .select('id', { count: 'exact', head: true })
        .eq('display_suppressed', false)
        .eq('source', 'scrape'),
      supabase
        .from('provider_pricing')
        .select('id', { count: 'exact', head: true })
        .eq('display_suppressed', false),
      supabase
        .from('providers')
        .select('id', { count: 'exact', head: true }),
      supabase
        .from('procedure_price_averages')
        .select('city, state'),
      supabase
        .from('provider_pricing')
        .select('providers!inner(city, state)')
        .eq('display_suppressed', false)
        .not('providers.city', 'is', null)
        .not('providers.state', 'is', null),
    ]);

  const cityKeys = new Set();
  if (mvRes.data) {
    for (const row of mvRes.data) {
      if (!row.city || !row.state) continue;
      cityKeys.add(`${row.city.toLowerCase()}|${row.state.toUpperCase()}`);
    }
  }
  if (menuCityRes.data) {
    for (const row of menuCityRes.data) {
      const p = row.providers;
      if (!p?.city || !p?.state) continue;
      cityKeys.add(`${p.city.toLowerCase()}|${p.state.toUpperCase()}`);
    }
  }

  return {
    totalCities: cityKeys.size,
    totalSubmissions: totalRes.count || 0,
    totalVerifiedPrices: verifiedRes.count || 0,
    totalScrapedPrices: scrapedRes.count || 0,
    totalProviders: providerRes.count || 0,
  };
}

/**
 * Per-city verified provider_pricing counts in a single round trip.
 * Used by CityPriceIndex to render a "Verified prices: N" badge per card.
 */
export async function fetchVerifiedPriceCountsByCity() {
  const { data, error } = await supabase
    .from('provider_pricing')
    .select('providers!inner(city, state)')
    .eq('display_suppressed', false)
    .eq('source', 'manual')
    .eq('verified', true);

  if (error || !data) return {};

  const counts = {};
  for (const row of data) {
    const provider = row.providers;
    if (!provider?.city || !provider?.state) continue;
    const key = `${provider.city.toLowerCase()}|${provider.state.toUpperCase()}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

export const PRICE_QUERY_CONSTANTS = {
  STALE_DAYS,
  MIN_SAMPLES_FOR_VS_AVG,
};

import { supabase } from './supabase';
import { citySlug } from './slugify';

const MIN_SUBMISSIONS = 5;

/**
 * Fetch list of cities with enough data for a report page.
 * Returns [{ city, state, slug, count }] sorted by count desc.
 */
export async function fetchCityList() {
  const { data, error } = await supabase
    .from('procedures')
    .select('city, state')
    .eq('status', 'active')
    .not('city', 'is', null)
    .not('state', 'is', null)
    .limit(5000);

  if (error || !data) return [];

  const counts = {};
  for (const row of data) {
    const key = `${row.city}|${row.state}`;
    counts[key] = (counts[key] || 0) + 1;
  }

  return Object.entries(counts)
    .filter(([, count]) => count >= MIN_SUBMISSIONS)
    .map(([key, count]) => {
      const [city, state] = key.split('|');
      return { city, state, slug: citySlug(city, state), count };
    })
    .sort((a, b) => b.count - a.count);
}

/**
 * Compute median of a numeric array.
 */
export function computeMedian(arr) {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

/**
 * Compute trend direction and percentage.
 */
export function computeTrend(currentAvg, previousAvg) {
  if (!currentAvg || !previousAvg) return { direction: 'flat', pct: 0 };
  const pct = Math.round(((currentAvg - previousAvg) / previousAvg) * 100);
  if (pct > 2) return { direction: 'up', pct };
  if (pct < -2) return { direction: 'down', pct: Math.abs(pct) };
  return { direction: 'flat', pct: 0 };
}

/**
 * Main report data for a single city.
 * If yearMonth (e.g. "2026-03") is provided, scopes data to that month.
 * Otherwise uses current month with fallback to all-time if too few rows.
 */
export async function fetchCityReport(city, state, yearMonth) {
  // Determine date range
  let dateFrom = null;
  let dateTo = null;
  let isMonthScoped = false;

  if (yearMonth) {
    const [y, m] = yearMonth.split('-').map(Number);
    dateFrom = new Date(y, m - 1, 1).toISOString();
    dateTo = new Date(y, m, 1).toISOString();
    isMonthScoped = true;
  } else {
    const now = new Date();
    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    isMonthScoped = true;
  }

  // Fetch scoped data
  let query = supabase
    .from('procedures')
    .select('id, procedure_type, price_paid, units_or_volume, provider_name, city, state, created_at, trust_tier')
    .eq('status', 'active')
    .ilike('city', city)
    .eq('state', state);

  if (isMonthScoped) {
    query = query.gte('created_at', dateFrom).lt('created_at', dateTo);
  }

  let { data: rows } = await query;
  rows = rows || [];

  // Fallback to all-time if current/specified month has too few
  let usingAllTime = false;
  if (rows.length < MIN_SUBMISSIONS && !yearMonth) {
    const { data: allRows } = await supabase
      .from('procedures')
      .select('id, procedure_type, price_paid, units_or_volume, provider_name, city, state, created_at, trust_tier')
      .eq('status', 'active')
      .ilike('city', city)
      .eq('state', state);
    rows = allRows || [];
    usingAllTime = true;
  }

  if (!rows.length) {
    return { priceTable: [], providers: [], affordable: [], recent: [], archiveMonths: [], usingAllTime, totalSubmissions: 0 };
  }

  // ── 1. Price table by procedure type ──
  const byProcedure = {};
  for (const r of rows) {
    const pt = r.procedure_type;
    if (!pt) continue;
    if (!byProcedure[pt]) byProcedure[pt] = [];
    const price = Number(r.price_paid);
    if (price > 0) byProcedure[pt].push(price);
  }

  // Fetch prior month data for trend calculation
  let priorAvgs = {};
  if (isMonthScoped) {
    const priorFrom = yearMonth
      ? new Date(Number(yearMonth.split('-')[0]), Number(yearMonth.split('-')[1]) - 2, 1)
      : new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
    const priorTo = yearMonth
      ? new Date(Number(yearMonth.split('-')[0]), Number(yearMonth.split('-')[1]) - 1, 1)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    const { data: priorRows } = await supabase
      .from('procedures')
      .select('procedure_type, price_paid')
      .eq('status', 'active')
      .ilike('city', city)
      .eq('state', state)
      .gte('created_at', priorFrom.toISOString())
      .lt('created_at', priorTo.toISOString());

    if (priorRows) {
      const grouped = {};
      for (const r of priorRows) {
        if (!r.procedure_type) continue;
        if (!grouped[r.procedure_type]) grouped[r.procedure_type] = [];
        const p = Number(r.price_paid);
        if (p > 0) grouped[r.procedure_type].push(p);
      }
      for (const [pt, prices] of Object.entries(grouped)) {
        priorAvgs[pt] = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
      }
    }
  }

  const priceTable = Object.entries(byProcedure)
    .map(([procedure, prices]) => {
      const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
      return {
        procedure,
        avg,
        median: computeMedian(prices),
        min: Math.min(...prices),
        max: Math.max(...prices),
        sampleSize: prices.length,
        trend: computeTrend(avg, priorAvgs[procedure]),
      };
    })
    .sort((a, b) => b.sampleSize - a.sampleSize);

  // ── 2. Top providers (neighborhood breakdown) ──
  const byProvider = {};
  for (const r of rows) {
    const name = r.provider_name || 'Unknown';
    const price = Number(r.price_paid);
    if (price <= 0) continue;
    if (!byProvider[name]) byProvider[name] = [];
    byProvider[name].push(price);
  }

  const providers = Object.entries(byProvider)
    .filter(([, prices]) => prices.length >= 2)
    .map(([name, prices]) => ({
      name,
      avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      count: prices.length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // ── 3-5. Parallel: providers, recent submissions, archive months ──
  const [providerRes, recentRes, archiveRes] = await Promise.all([
    supabase
      .from('providers')
      .select('name, slug, verified')
      .ilike('city', city)
      .eq('state', state),
    supabase
      .from('procedures')
      .select('id, procedure_type, price_paid, units_or_volume, created_at, trust_tier')
      .eq('status', 'active')
      .ilike('city', city)
      .eq('state', state)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('procedures')
      .select('created_at')
      .eq('status', 'active')
      .ilike('city', city)
      .eq('state', state)
      .order('created_at', { ascending: false })
      .limit(500),
  ]);

  // Most affordable providers
  const providerRows = providerRes.data;
  const verifiedMap = {};
  if (providerRows) {
    for (const p of providerRows) {
      verifiedMap[p.name.toLowerCase()] = { verified: p.verified, slug: p.slug };
    }
  }

  const affordable = Object.entries(byProvider)
    .filter(([, prices]) => prices.length >= 2)
    .map(([name, prices]) => {
      const info = verifiedMap[name.toLowerCase()] || {};
      return {
        name,
        avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
        count: prices.length,
        verified: info.verified || false,
        slug: info.slug || null,
        city,
        state,
      };
    })
    .sort((a, b) => a.avgPrice - b.avgPrice)
    .slice(0, 5);

  // Recent submissions
  const recent = (recentRes.data || []).map((r) => ({
    id: r.id,
    procedure: r.procedure_type,
    price: Number(r.price_paid),
    units: r.units_or_volume,
    date: r.created_at,
    trustTier: r.trust_tier,
  }));

  // Archive months
  const monthSet = new Set();
  if (archiveRes.data) {
    for (const r of archiveRes.data) {
      const d = new Date(r.created_at);
      monthSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
  }
  const archiveMonths = [...monthSet].sort().reverse();

  return {
    priceTable,
    providers,
    affordable,
    recent,
    archiveMonths,
    usingAllTime,
    totalSubmissions: rows.length,
  };
}

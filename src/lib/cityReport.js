import { supabase } from './supabase';
import { citySlug } from './slugify';

// Cities show up in the index if they have at least one price from any source
// (patient submission OR provider menu). Tiny cities are still useful when the
// only data we have is a single scraped menu.
const MIN_TOTAL_PRICES = 1;

/**
 * Fetch list of cities with at least one price (patient-reported OR
 * provider-menu) for the report index.
 *
 * Returns:
 *   [{
 *     city, state, slug,
 *     count,           // total prices across both sources
 *     patientCount,    // rows from `procedures` (patient submissions)
 *     menuCount,       // rows from `provider_pricing` (scraped/provider menus)
 *   }]
 *
 * Sorted by total count desc.
 */
export async function fetchCityList() {
  const [proceduresRes, providerPricingRes] = await Promise.all([
    supabase
      .from('procedures')
      .select('city, state')
      .eq('status', 'active')
      .not('city', 'is', null)
      .not('state', 'is', null)
      .limit(5000),
    supabase
      .from('provider_pricing')
      .select('providers!inner(city, state)')
      .eq('display_suppressed', false)
      .lt('confidence_tier', 6)
      .not('providers.city', 'is', null)
      .not('providers.state', 'is', null)
      .limit(50000),
  ]);

  // Normalize to { displayCity, displayState, key } so the two sources fold
  // together regardless of casing differences.
  const cities = new Map(); // key -> { city, state, patientCount, menuCount }

  function bump(rawCity, rawState, source) {
    if (!rawCity || !rawState) return;
    const key = `${rawCity.toLowerCase()}|${rawState.toUpperCase()}`;
    let entry = cities.get(key);
    if (!entry) {
      entry = {
        city: rawCity,
        state: rawState.toUpperCase(),
        patientCount: 0,
        menuCount: 0,
      };
      cities.set(key, entry);
    }
    if (source === 'patient') entry.patientCount += 1;
    else if (source === 'menu') entry.menuCount += 1;
  }

  if (proceduresRes.data) {
    for (const row of proceduresRes.data) {
      bump(row.city, row.state, 'patient');
    }
  }
  if (providerPricingRes.data) {
    for (const row of providerPricingRes.data) {
      const provider = row.providers;
      if (!provider) continue;
      bump(provider.city, provider.state, 'menu');
    }
  }

  return [...cities.values()]
    .map((entry) => ({
      city: entry.city,
      state: entry.state,
      slug: citySlug(entry.city, entry.state),
      count: entry.patientCount + entry.menuCount,
      patientCount: entry.patientCount,
      menuCount: entry.menuCount,
    }))
    .filter((c) => c.count >= MIN_TOTAL_PRICES)
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

// Procedures fall back to all-time when the current month has fewer than this
// many patient submissions AND no explicit month is requested.
const MIN_PATIENT_SUBMISSIONS = 5;

const PROCEDURES_FIELDS =
  'id, procedure_type, price_paid, units_or_volume, provider_name, city, state, created_at, trust_tier';
const PROVIDER_PRICING_FIELDS =
  'id, procedure_type, price, price_label, units_or_volume, treatment_area, brand, category, source, verified, scraped_at, created_at, confidence_tier, is_starting_price, providers!inner(id, name, slug, verified, city, state)';

/**
 * Main report data for a single city, sourced from BOTH:
 *
 *   • `procedures`        — patient-submitted prices (date-scoped)
 *   • `provider_pricing`  — scraped + provider-submitted menu prices
 *                            (ambient state, not month-scoped)
 *
 * If yearMonth (e.g. "2026-03") is provided, the *patient* slice is scoped to
 * that month. Provider menu prices are always included as a snapshot.
 *
 * Returns:
 *   {
 *     priceTable, providers, affordable, recent, archiveMonths,
 *     usingAllTime,
 *     totalSubmissions, // patientCount + menuCount
 *     patientCount,     // rows from `procedures`
 *     menuCount,        // rows from `provider_pricing`
 *   }
 */
export async function fetchCityReport(city, state, yearMonth) {
  // Date range only applies to the patient submissions slice. Provider menu
  // prices are included unconditionally — they describe what providers are
  // currently advertising, not events tied to a calendar month.
  let dateFrom;
  let dateTo;
  if (yearMonth) {
    const [y, m] = yearMonth.split('-').map(Number);
    dateFrom = new Date(y, m - 1, 1).toISOString();
    dateTo = new Date(y, m, 1).toISOString();
  } else {
    const now = new Date();
    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
  }

  const [scopedProceduresRes, providerPricingRes, providersDirectoryRes, archiveRes] =
    await Promise.all([
      supabase
        .from('procedures')
        .select(PROCEDURES_FIELDS)
        .eq('status', 'active')
        .ilike('city', city)
        .eq('state', state)
        .gte('created_at', dateFrom)
        .lt('created_at', dateTo)
        .limit(50000),
      supabase
        .from('provider_pricing')
        .select(PROVIDER_PRICING_FIELDS)
        .eq('display_suppressed', false)
        .lt('confidence_tier', 6)
        .ilike('providers.city', city)
        .eq('providers.state', state)
        .limit(50000),
      supabase
        .from('providers')
        .select('name, slug, verified')
        .ilike('city', city)
        .eq('state', state),
      supabase
        .from('procedures')
        .select('created_at')
        .eq('status', 'active')
        .ilike('city', city)
        .eq('state', state)
        .order('created_at', { ascending: false })
        .limit(500),
    ]);

  let procedureRows = scopedProceduresRes.data || [];
  const menuRows = providerPricingRes.data || [];
  const providerDirectoryRows = providersDirectoryRes.data || [];

  // Fall back to all-time procedures only when the default (current month)
  // view has too few patient rows. Honor an explicit yearMonth as-is.
  let usingAllTime = false;
  if (procedureRows.length < MIN_PATIENT_SUBMISSIONS && !yearMonth) {
    const { data: allRows } = await supabase
      .from('procedures')
      .select(PROCEDURES_FIELDS)
      .eq('status', 'active')
      .ilike('city', city)
      .eq('state', state)
      .limit(50000);
    procedureRows = allRows || [];
    usingAllTime = true;
  }

  const patientCount = procedureRows.length;
  const menuCount = menuRows.length;
  const totalSubmissions = patientCount + menuCount;

  if (!totalSubmissions) {
    return {
      priceTable: [],
      providers: [],
      affordable: [],
      recent: [],
      archiveMonths: [],
      usingAllTime,
      totalSubmissions: 0,
      patientCount: 0,
      menuCount: 0,
    };
  }

  // ── 1. Price table by procedure type (UNION both sources) ──
  const byProcedure = {};
  for (const r of procedureRows) {
    const pt = r.procedure_type;
    const price = Number(r.price_paid);
    if (!pt || !(price > 0)) continue;
    if (!byProcedure[pt]) byProcedure[pt] = [];
    byProcedure[pt].push(price);
  }
  for (const r of menuRows) {
    const pt = r.procedure_type;
    const price = Number(r.price);
    if (!pt || !(price > 0)) continue;
    if (!byProcedure[pt]) byProcedure[pt] = [];
    byProcedure[pt].push(price);
  }

  // ── 2. Prior-month avgs for trend chips (procedures only — menus aren't
  //       tied to a calendar month) ──
  const priorAvgs = {};
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

  // ── 3. Providers (UNION both sources, keyed by lowercase name) ──
  const byProvider = new Map(); // lowerName -> { displayName, prices, slug, verified }
  function addToProvider(name, price, slug, verified) {
    if (!name || !(price > 0)) return;
    const key = name.toLowerCase();
    let entry = byProvider.get(key);
    if (!entry) {
      entry = { displayName: name, prices: [], slug: slug || null, verified: !!verified };
      byProvider.set(key, entry);
    }
    entry.prices.push(price);
    if (slug && !entry.slug) entry.slug = slug;
    if (verified) entry.verified = true;
  }
  for (const r of procedureRows) {
    addToProvider(r.provider_name || 'Unknown', Number(r.price_paid));
  }
  for (const r of menuRows) {
    const p = r.providers;
    if (!p) continue;
    addToProvider(p.name, Number(r.price), p.slug, p.verified);
  }

  // Backfill slug + verified for providers we only know by name (i.e., the
  // freeform `procedures.provider_name` text).
  for (const dir of providerDirectoryRows) {
    if (!dir?.name) continue;
    const entry = byProvider.get(dir.name.toLowerCase());
    if (!entry) continue;
    if (!entry.slug && dir.slug) entry.slug = dir.slug;
    if (dir.verified) entry.verified = true;
  }

  const providers = [...byProvider.values()]
    .filter((p) => p.prices.length >= 2)
    .map((p) => ({
      name: p.displayName,
      avgPrice: Math.round(p.prices.reduce((a, b) => a + b, 0) / p.prices.length),
      count: p.prices.length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const affordable = [...byProvider.values()]
    .filter((p) => p.prices.length >= 2)
    .map((p) => ({
      name: p.displayName,
      avgPrice: Math.round(p.prices.reduce((a, b) => a + b, 0) / p.prices.length),
      count: p.prices.length,
      verified: p.verified,
      slug: p.slug,
      city,
      state,
    }))
    .sort((a, b) => a.avgPrice - b.avgPrice)
    .slice(0, 5);

  // ── 4. Recent submissions (UNION; sorted by date desc) ──
  const recent = [
    ...procedureRows.map((r) => ({
      id: `proc-${r.id}`,
      procedure: r.procedure_type,
      price: Number(r.price_paid),
      units: r.units_or_volume,
      date: r.created_at,
      trustTier: r.trust_tier,
      source: 'patient',
    })),
    ...menuRows.map((r) => ({
      id: `menu-${r.id}`,
      procedure: r.procedure_type,
      price: Number(r.price),
      priceLabel: r.price_label,
      units: r.units_or_volume || r.treatment_area,
      date: r.scraped_at || r.created_at,
      trustTier: r.verified === true && r.source === 'manual' ? 'verified' : null,
      confidenceTier: r.confidence_tier,
      isStartingPrice: r.is_starting_price,
      source: 'menu',
    })),
  ]
    .filter((r) => r.procedure && r.price > 0)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  // ── 5. Archive months (procedures only — menus aren't archived) ──
  const monthSet = new Set();
  if (archiveRes.data) {
    for (const r of archiveRes.data) {
      if (!r.created_at) continue;
      const d = new Date(r.created_at);
      monthSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
  }
  const archiveMonths = [...monthSet].sort().reverse();

  // Confidence tier stats for the menu data
  const verifiedMenuCount = menuRows.filter(
    (r) => r.confidence_tier != null && r.confidence_tier <= 2
  ).length;

  return {
    priceTable,
    providers,
    affordable,
    recent,
    archiveMonths,
    usingAllTime,
    totalSubmissions,
    patientCount,
    menuCount,
    verifiedMenuCount,
  };
}

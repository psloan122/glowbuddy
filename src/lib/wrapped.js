import { supabase } from './supabase';
import { fetchBenchmark } from './priceBenchmark';

const TYPICAL_UNITS = {
  'Botox / Dysport / Xeomin': 28,
  'Lip Filler': 1,
  'Cheek Filler': 1,
  'HydraFacial': 1,
};

function getUnits(proc) {
  if (proc.units_or_volume) {
    const num = parseFloat(proc.units_or_volume);
    if (!isNaN(num) && num > 0) return num;
  }
  return TYPICAL_UNITS[proc.procedure_type] || 1;
}

export async function fetchWrappedData(userId, year) {
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31T23:59:59`;

  // Parallel queries
  const [procsResult, pioneerResult, entriesResult, profileResult] = await Promise.all([
    supabase
      .from('procedures')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gte('created_at', startDate)
      .lte('created_at', endDate),
    supabase
      .from('pioneer_records')
      .select('id')
      .eq('user_id', userId)
      .gte('earned_at', startDate)
      .lte('earned_at', endDate),
    supabase
      .from('giveaway_entries')
      .select('entries')
      .eq('user_id', userId)
      .gte('month', `${year}-01`)
      .lte('month', `${year}-12`),
    supabase
      .from('profiles')
      .select('display_name, city, state')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  const procs = procsResult.data || [];
  const profile = profileResult.data;

  if (procs.length === 0) {
    return {
      year,
      displayName: profile?.display_name || '',
      city: profile?.city || '',
      state: profile?.state || '',
      hasData: false,
    };
  }

  // Basic stats
  const treatmentsLogged = procs.length;
  const totalSpend = procs.reduce((sum, p) => sum + Number(p.price_paid || 0), 0);
  const providersVisited = new Set(procs.map((p) => p.provider_name)).size;
  const citiesExplored = new Set(procs.map((p) => p.city).filter(Boolean)).size;

  // Top procedure (most frequent)
  const procCounts = {};
  const providerCounts = {};
  for (const p of procs) {
    procCounts[p.procedure_type] = (procCounts[p.procedure_type] || 0) + 1;
    providerCounts[p.provider_name] = (providerCounts[p.provider_name] || 0) + 1;
  }
  const topProcedure = Object.entries(procCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  const favoriteProvider = Object.entries(providerCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

  // Fetch benchmarks for savings
  const seen = new Set();
  const benchmarkMap = {};
  for (const p of procs) {
    const key = `${p.procedure_type}|${p.state}|${p.city}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const bm = await fetchBenchmark(p.procedure_type, p.state, p.city);
    if (bm) benchmarkMap[key] = bm;
  }

  let totalSavings = 0;
  let bestDeal = null;
  let bestDealSavings = 0;

  for (const p of procs) {
    const key = `${p.procedure_type}|${p.state}|${p.city}`;
    const bm = benchmarkMap[key];
    if (!bm) continue;
    const units = getUnits(p);
    const savings = (Number(bm.avg_price) - Number(p.price_paid)) * units;
    if (savings > 0) {
      totalSavings += savings;
      if (savings > bestDealSavings) {
        bestDealSavings = savings;
        const pctBelow = Math.round(((Number(bm.avg_price) - Number(p.price_paid)) / Number(bm.avg_price)) * 100);
        bestDeal = {
          procedureType: p.procedure_type,
          providerName: p.provider_name,
          pricePaid: Number(p.price_paid),
          savings: Math.round(savings),
          pctBelow,
        };
      }
    }
  }

  // City rank — percentile among users in same city/state
  const userCity = profile?.city || procs[0]?.city || '';
  const userState = profile?.state || procs[0]?.state || '';
  let cityRank = null;

  if (userCity && userState) {
    const { data: cityProcs } = await supabase
      .from('procedures')
      .select('user_id, price_paid')
      .eq('status', 'active')
      .eq('city', userCity)
      .eq('state', userState)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (cityProcs && cityProcs.length > 0) {
      const userAvgs = {};
      for (const cp of cityProcs) {
        if (!userAvgs[cp.user_id]) userAvgs[cp.user_id] = { total: 0, count: 0 };
        userAvgs[cp.user_id].total += Number(cp.price_paid);
        userAvgs[cp.user_id].count += 1;
      }

      const avgList = Object.entries(userAvgs).map(([uid, { total, count }]) => ({
        userId: uid,
        avg: total / count,
      }));

      const myAvg = avgList.find((u) => u.userId === userId)?.avg;
      if (myAvg != null && avgList.length > 1) {
        const higherCount = avgList.filter((u) => u.avg > myAvg && u.userId !== userId).length;
        cityRank = Math.round((higherCount / (avgList.length - 1)) * 100);
      }
    }
  }

  // Pioneer badges
  const pioneerBadges = pioneerResult.data?.length || 0;

  // Giveaway entries
  const totalEntries = (entriesResult.data || []).reduce((s, r) => s + (r.entries || 0), 0);

  // Fun stat
  let funStat = null;
  if (totalSavings > 0) {
    const coffees = Math.floor(totalSavings / 6.5);
    const hydrafacials = Math.floor(totalSavings / 175);
    if (hydrafacials >= 2) {
      funStat = { label: 'HydraFacials', value: hydrafacials };
    } else if (coffees >= 2) {
      funStat = { label: 'fancy lattes', value: coffees };
    }
  }

  return {
    year,
    displayName: profile?.display_name || '',
    city: userCity,
    state: userState,
    treatmentsLogged,
    totalSpend: Math.round(totalSpend),
    totalSavings: Math.round(totalSavings),
    providersVisited,
    topProcedure,
    favoriteProvider,
    bestDeal,
    cityRank,
    pioneerBadges,
    totalEntries,
    citiesExplored,
    funStat,
    hasData: true,
  };
}

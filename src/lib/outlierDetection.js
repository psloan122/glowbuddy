import { supabase } from './supabase';

// Outlier detection — intentionally lenient.
//
// Goal: only flag prices that are *clearly* impossible (off by 3x+),
// never flag plausible variation. Small markets like Mandeville LA had
// the previous (min 3 samples, ±40%) thresholds firing on legitimate
// real-world prices, marking them `pending` and hiding them from /browse.
//
// New rules:
//   - Need at least 10 active samples in the same procedure_type+state
//     before we trust the average enough to flag anything
//   - Anything within 0.3x .. 3.0x of that average is considered fine
export async function checkOutlier(procedureType, state, pricePaid) {
  const { data, error } = await supabase
    .from('procedures')
    .select('price_paid')
    .eq('procedure_type', procedureType)
    .eq('state', state)
    .eq('status', 'active');

  if (error || !data || data.length < 10) {
    return false;
  }

  const avg =
    data.reduce((sum, row) => sum + row.price_paid, 0) / data.length;

  if (avg <= 0) return false;

  return pricePaid < avg * 0.3 || pricePaid > avg * 3.0;
}

export async function getAverages(procedureType, state) {
  const { data: stateData } = await supabase
    .from('procedures')
    .select('price_paid')
    .eq('procedure_type', procedureType)
    .eq('state', state)
    .eq('status', 'active');

  const { data: nationalData } = await supabase
    .from('procedures')
    .select('price_paid')
    .eq('procedure_type', procedureType)
    .eq('status', 'active');

  const calcAvg = (rows) => {
    if (!rows || rows.length === 0) return null;
    return Math.round(
      rows.reduce((sum, r) => sum + r.price_paid, 0) / rows.length
    );
  };

  return {
    stateAvg: calcAvg(stateData),
    nationalAvg: calcAvg(nationalData),
    stateCount: stateData?.length || 0,
    nationalCount: nationalData?.length || 0,
  };
}

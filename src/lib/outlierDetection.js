import { supabase } from './supabase';

export async function checkOutlier(procedureType, state, pricePaid) {
  const { data, error } = await supabase
    .from('procedures')
    .select('price_paid')
    .eq('procedure_type', procedureType)
    .eq('state', state)
    .eq('status', 'active');

  if (error || !data || data.length < 3) {
    return false;
  }

  const avg =
    data.reduce((sum, row) => sum + row.price_paid, 0) / data.length;

  return pricePaid < avg * 0.6 || pricePaid > avg * 1.4;
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

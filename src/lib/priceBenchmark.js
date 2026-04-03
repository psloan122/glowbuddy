import { supabase } from './supabase';

// In-memory cache with 5-minute TTL
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function cacheKey(procedureType, state, city) {
  return `${procedureType}|${state}|${city || ''}`;
}

export async function fetchBenchmark(procedureType, state, city) {
  if (!procedureType || !state) return null;

  const key = cacheKey(procedureType, state, city);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const { data, error } = await supabase.rpc('get_price_benchmark', {
    p_procedure_type: procedureType,
    p_state: state,
    p_city: city || null,
  });

  if (error || !data || data.length === 0) {
    cache.set(key, { data: null, ts: Date.now() });
    return null;
  }

  const result = data[0];
  cache.set(key, { data: result, ts: Date.now() });
  return result;
}

export function getBenchmarkLabel(price, avgPrice) {
  if (!price || !avgPrice) return null;

  const ratio = (price - avgPrice) / avgPrice;

  if (ratio < -0.30) {
    return { label: 'Great Deal', color: '#5B21B6', bgColor: '#EDE9FE', icon: 'sparkles' };
  }
  if (ratio < -0.15) {
    return { label: 'Below Average', color: '#185FA5', bgColor: '#E6F1FB', icon: 'trending-down' };
  }
  if (ratio <= 0.15) {
    return { label: 'Fair Price', color: '#0F6E56', bgColor: '#E1F5EE', icon: 'check' };
  }
  if (ratio <= 0.30) {
    return { label: 'Above Average', color: '#92400E', bgColor: '#FEF3C7', icon: 'trending-up' };
  }
  return { label: 'Premium Price', color: '#991B1B', bgColor: '#FEE2E2', icon: 'trending-up' };
}

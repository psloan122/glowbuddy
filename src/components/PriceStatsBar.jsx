import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function PriceStatsBar({ city, state }) {
  const [stats, setStats] = useState(null);
  const [localCount, setLocalCount] = useState(null);

  useEffect(() => {
    async function load() {
      const [pricesRes, citiesRes, verifiedRes] = await Promise.all([
        supabase
          .from('procedures')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active'),
        supabase
          .from('procedures')
          .select('city')
          .eq('status', 'active')
          .not('city', 'is', null),
        supabase
          .from('procedures')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
          .eq('receipt_verified', true),
      ]);

      const uniqueCities = new Set();
      for (const row of citiesRes.data || []) {
        if (row.city) uniqueCities.add(row.city);
      }

      setStats({
        prices: pricesRes.count || 0,
        cities: uniqueCities.size,
        verified: verifiedRes.count || 0,
      });
    }
    load();
  }, []);

  // Fetch local count when city/state props are provided
  useEffect(() => {
    if (!city || !state) {
      setLocalCount(null);
      return;
    }
    supabase
      .from('procedures')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .ilike('city', `%${city}%`)
      .eq('state', state)
      .then(({ count }) => setLocalCount(count || 0));
  }, [city, state]);

  if (!stats) return null;

  return (
    <p className="text-[13px] text-text-secondary/60 mt-3 tracking-wide">
      {localCount !== null && (
        <>
          <span className="font-semibold text-text-secondary">{localCount.toLocaleString()}</span>{' '}in {city}
          {' \u00B7 '}
        </>
      )}
      <span className="font-semibold text-text-secondary">{stats.prices.toLocaleString()}</span>{' '}real prices
      {' \u00B7 '}
      <span className="font-semibold text-text-secondary">{stats.cities.toLocaleString()}</span>{' '}cities
      {' \u00B7 '}
      <span className="font-semibold text-text-secondary">{stats.verified.toLocaleString()}</span>{' '}verified
    </p>
  );
}

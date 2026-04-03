import { useState, useEffect } from 'react';
import { TrendingDown, TrendingUp, Check, Sparkles } from 'lucide-react';
import { fetchBenchmark, getBenchmarkLabel } from '../lib/priceBenchmark';

const ICONS = {
  'trending-down': TrendingDown,
  'trending-up': TrendingUp,
  check: Check,
  sparkles: Sparkles,
};

export default function FairPriceBadge({ price, procedureType, state, city }) {
  const [label, setLabel] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!price || !procedureType || !state) return;

      const benchmark = await fetchBenchmark(procedureType, state, city);
      if (cancelled || !benchmark) return;

      const result = getBenchmarkLabel(Number(price), Number(benchmark.avg_price));
      if (!cancelled && result) {
        setLabel(result);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [price, procedureType, state, city]);

  if (!label) return null;

  const Icon = ICONS[label.icon] || Check;

  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ backgroundColor: label.bgColor, color: label.color }}
    >
      <Icon size={11} />
      {label.label}
    </span>
  );
}

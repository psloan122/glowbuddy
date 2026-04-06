import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, TrendingDown, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function NationalTrends() {
  const [open, setOpen] = useState(false);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open || loaded) return;
    loadTrends();
  }, [open, loaded]);

  async function loadTrends() {
    setLoading(true);
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    const { data: rows } = await supabase
      .from('procedures')
      .select('procedure_type, price_paid, created_at')
      .eq('status', 'active')
      .gte('created_at', twoMonthsAgo.toISOString());

    if (!rows || rows.length === 0) {
      setLoading(false);
      setLoaded(true);
      return;
    }

    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonth = now.getMonth() === 0
      ? `${now.getFullYear() - 1}-12`
      : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;

    const byType = {};
    for (const r of rows) {
      if (!r.procedure_type) continue;
      const d = new Date(r.created_at);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!byType[r.procedure_type]) byType[r.procedure_type] = { this: [], last: [], allPrices: [] };
      const price = Number(r.price_paid);
      byType[r.procedure_type].allPrices.push(price);
      if (monthKey === thisMonth) byType[r.procedure_type].this.push(price);
      else if (monthKey === lastMonth) byType[r.procedure_type].last.push(price);
    }

    const results = [];
    for (const [type, data] of Object.entries(byType)) {
      if (data.this.length < 2 || data.last.length < 2) continue;
      const thisAvg = data.this.reduce((a, b) => a + b, 0) / data.this.length;
      const lastAvg = data.last.reduce((a, b) => a + b, 0) / data.last.length;
      const pct = Math.round(((thisAvg - lastAvg) / lastAvg) * 100);
      if (Math.abs(pct) < 3) continue;
      results.push({
        type,
        pct,
        avg: Math.round(thisAvg),
        reports: data.allPrices.length,
      });
    }

    results.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));
    setTrends(results.slice(0, 3));
    setLoading(false);
    setLoaded(true);
  }

  // Hide entirely if loaded and no trends
  if (loaded && trends.length === 0) return null;

  return (
    <div className="glow-card">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <h2 className="text-lg font-bold text-text-primary">What's trending nationally</h2>
        {open ? (
          <ChevronUp size={18} className="text-text-secondary" />
        ) : (
          <ChevronDown size={18} className="text-text-secondary" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3">
          {loading ? (
            <p className="text-sm text-text-secondary py-2">Loading trends...</p>
          ) : trends.length === 0 ? (
            <p className="text-sm text-text-secondary py-2">Not enough data yet</p>
          ) : (
            trends.map((t) => (
              <div key={t.type} className="flex items-center gap-3">
                {t.pct < 0 ? (
                  <TrendingDown size={16} className="text-verified shrink-0" />
                ) : (
                  <TrendingUp size={16} className="text-amber-600 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary">
                    {t.type}{' '}
                    <span className={t.pct < 0 ? 'text-verified' : 'text-amber-600'}>
                      {t.pct > 0 ? '+' : ''}{t.pct}% this month
                    </span>
                  </p>
                  <p className="text-xs text-text-secondary">
                    Avg: ${t.avg.toLocaleString()} &middot; {t.reports} reports
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

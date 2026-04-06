import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Sparkline from './Sparkline';
import { SectionSkeleton } from './DashboardSkeleton';

const TABS = [
  { key: 'Botox', label: 'Botox' },
  { key: 'Lip Filler', label: 'Lip Filler' },
  { key: 'RF Microneedling', label: 'RF Micro' },
  { key: 'Semaglutide / GLP-1', label: 'GLP-1' },
];

export default function PriceTrends({ userCity, userState }) {
  const [activeTab, setActiveTab] = useState('Botox');
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrends();
  }, []);

  async function loadTrends() {
    setLoading(true);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: rows } = await supabase
      .from('procedures')
      .select('procedure_type, price_paid, city, state, created_at')
      .eq('status', 'active')
      .gte('created_at', sixMonthsAgo.toISOString())
      .in('procedure_type', TABS.map((t) => t.key));

    if (!rows) {
      setLoading(false);
      return;
    }

    const grouped = {};
    for (const tab of TABS) {
      const tabRows = rows.filter((r) => r.procedure_type === tab.key);
      if (tabRows.length === 0) continue;

      // Group by month
      const byMonth = {};
      const byCity = {};
      for (const r of tabRows) {
        const d = new Date(r.created_at);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!byMonth[monthKey]) byMonth[monthKey] = [];
        byMonth[monthKey].push(Number(r.price_paid));

        // By city
        if (r.city && r.state) {
          const cityKey = `${r.city}, ${r.state}`;
          if (!byCity[cityKey]) byCity[cityKey] = [];
          byCity[cityKey].push(Number(r.price_paid));
        }
      }

      const months = Object.keys(byMonth).sort();
      const monthlyAvgs = months.map((m) => {
        const prices = byMonth[m];
        return Math.round(prices.reduce((a, b) => a + b, 0) / prices.length * 100) / 100;
      });

      // City averages for high/low
      const cityAvgs = Object.entries(byCity)
        .filter(([, prices]) => prices.length >= 2)
        .map(([city, prices]) => ({
          city,
          avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length * 100) / 100,
        }))
        .sort((a, b) => a.avg - b.avg);

      // User's city avg
      let userCityAvg = null;
      if (userCity && userState) {
        const userKey = `${userCity}, ${userState}`;
        const found = cityAvgs.find((c) => c.city.toLowerCase() === userKey.toLowerCase());
        if (found) userCityAvg = found.avg;
      }

      // Current avg (latest month)
      const currentAvg = monthlyAvgs.length > 0 ? monthlyAvgs[monthlyAvgs.length - 1] : null;
      const prevAvg = monthlyAvgs.length > 1 ? monthlyAvgs[monthlyAvgs.length - 2] : null;
      let pctChange = null;
      if (currentAvg && prevAvg) {
        pctChange = Math.round(((currentAvg - prevAvg) / prevAvg) * 100);
      }

      grouped[tab.key] = {
        currentAvg,
        pctChange,
        sparkData: monthlyAvgs,
        lowest: cityAvgs.length > 0 ? cityAvgs[0] : null,
        highest: cityAvgs.length > 0 ? cityAvgs[cityAvgs.length - 1] : null,
        userCityAvg,
        hasEnoughData: months.length >= 2,
      };
    }

    setData(grouped);
    setLoading(false);
  }

  if (loading) return <SectionSkeleton lines={4} />;

  const tabData = data[activeTab];

  return (
    <div className="glow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-text-primary">Price Trends</h2>
        <Link
          to="/browse"
          className="text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
        >
          View all &rarr;
        </Link>
      </div>

      {/* Tab pills */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-rose-accent text-white'
                : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {!tabData ? (
        <p className="text-sm text-text-secondary py-4 text-center">No data available yet</p>
      ) : !tabData.hasEnoughData ? (
        <div className="py-4 text-center">
          <p className="text-sm text-text-secondary mb-1">Not enough data for a trend yet</p>
          {tabData.currentAvg && (
            <p className="text-lg font-bold text-text-primary">${tabData.currentAvg.toFixed(2)}</p>
          )}
        </div>
      ) : (
        <>
          {/* Current avg + change */}
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-2xl font-bold text-text-primary">
              ${tabData.currentAvg?.toFixed(2)}
            </span>
            {activeTab === 'Botox' && (
              <span className="text-sm text-text-secondary">/unit</span>
            )}
            {tabData.pctChange != null && tabData.pctChange !== 0 && (
              <span className={`flex items-center gap-0.5 text-sm font-medium ${
                tabData.pctChange < 0 ? 'text-verified' : 'text-amber-600'
              }`}>
                {tabData.pctChange < 0 ? (
                  <TrendingDown size={14} />
                ) : (
                  <TrendingUp size={14} />
                )}
                {Math.abs(tabData.pctChange)}% vs last month
              </span>
            )}
          </div>

          {/* Sparkline */}
          <div className="mb-3">
            <Sparkline data={tabData.sparkData} width={280} height={48} />
          </div>

          {/* High / Low cities */}
          <div className="space-y-1 text-xs text-text-secondary">
            {tabData.lowest && (
              <p>
                <span className="text-verified font-medium">Lowest:</span>{' '}
                {tabData.lowest.city} — ${tabData.lowest.avg.toFixed(2)}
              </p>
            )}
            {tabData.highest && (
              <p>
                <span className="text-amber-600 font-medium">Highest:</span>{' '}
                {tabData.highest.city} — ${tabData.highest.avg.toFixed(2)}
              </p>
            )}
            {tabData.userCityAvg != null ? (
              <p className="font-medium text-text-primary">
                Your city: ${tabData.userCityAvg.toFixed(2)}
              </p>
            ) : userCity ? (
              <p className="italic">No data yet in {userCity}</p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { DollarSign } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { FINANCING_PARTNERS } from '../lib/financingPartners';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export default function AdminFinancingReport() {
  const [clicks, setClicks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClicks();
  }, []);

  async function fetchClicks() {
    setLoading(true);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('financing_clicks')
      .select('*')
      .gte('clicked_at', thirtyDaysAgo)
      .order('clicked_at', { ascending: true });
    setClicks(data || []);
    setLoading(false);
  }

  const carecreditClicks = clicks.filter(c => c.financing_partner === 'carecredit').length;
  const cherryClicks = clicks.filter(c => c.financing_partner === 'cherry').length;

  const estRevenue =
    carecreditClicks * FINANCING_PARTNERS.carecredit.estimatedPayoutPerApproval +
    cherryClicks * FINANCING_PARTNERS.cherry.estimatedPayoutPerApproval;

  // Top procedures
  const procCounts = {};
  clicks.forEach(c => {
    if (c.procedure_name) {
      procCounts[c.procedure_name] = (procCounts[c.procedure_name] || 0) + 1;
    }
  });
  const topProcedures = Object.entries(procCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Top providers
  const provCounts = {};
  clicks.forEach(c => {
    if (c.provider_id) {
      provCounts[c.provider_id] = (provCounts[c.provider_id] || 0) + 1;
    }
  });

  // Clicks by day chart
  const dailyMap = {};
  clicks.forEach(c => {
    const day = c.clicked_at.slice(0, 10);
    if (!dailyMap[day]) dailyMap[day] = { carecredit: 0, cherry: 0 };
    dailyMap[day][c.financing_partner]++;
  });

  const dailyData = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dailyData.push({
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      CareCredit: dailyMap[key]?.carecredit || 0,
      Cherry: dailyMap[key]?.cherry || 0,
    });
  }

  if (loading) {
    return <div className="py-12 text-center text-text-secondary">Loading financing data...</div>;
  }

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="glow-card p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: FINANCING_PARTNERS.carecredit.color }}>
            {carecreditClicks}
          </p>
          <p className="text-xs text-text-secondary">CareCredit Clicks</p>
        </div>
        <div className="glow-card p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: FINANCING_PARTNERS.cherry.color }}>
            {cherryClicks}
          </p>
          <p className="text-xs text-text-secondary">Cherry Clicks</p>
        </div>
        <div className="glow-card p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">{clicks.length}</p>
          <p className="text-xs text-text-secondary">Total Clicks</p>
        </div>
        <div className="glow-card p-4 text-center">
          <p className="text-2xl font-bold text-green-600">${estRevenue.toLocaleString()}</p>
          <p className="text-xs text-text-secondary">Est. Revenue*</p>
        </div>
      </div>

      <p className="text-[10px] text-text-secondary mb-6">
        * Estimated — verify against partner dashboards. Assumes all clicks convert.
      </p>

      {/* Chart */}
      <div className="glow-card p-6 mb-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Clicks by Day (Last 30 Days)</h3>
        {clicks.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="CareCredit" stroke={FINANCING_PARTNERS.carecredit.color} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Cherry" stroke={FINANCING_PARTNERS.cherry.color} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-text-secondary text-sm">No clicks yet</div>
        )}
      </div>

      {/* Top procedures */}
      {topProcedures.length > 0 && (
        <div className="glow-card p-6 mb-6">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Top Procedures Driving Financing Clicks</h3>
          <div className="space-y-2">
            {topProcedures.map(([proc, count], i) => (
              <div key={proc} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-text-primary">{i + 1}. {proc}</span>
                <span className="text-sm font-bold text-text-primary">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

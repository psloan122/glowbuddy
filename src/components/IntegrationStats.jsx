import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * Booking referral stats for provider dashboard (below VagaroConnectFlow).
 */
export default function IntegrationStats({ providerId }) {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!providerId) return;
    fetchReferrals();
  }, [providerId]);

  async function fetchReferrals() {
    setLoading(true);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('booking_referrals')
      .select('*')
      .eq('provider_id', providerId)
      .gte('clicked_at', thirtyDaysAgo)
      .order('clicked_at', { ascending: false });
    setReferrals(data || []);
    setLoading(false);
  }

  const thisMonth = referrals.length;

  // Top procedures
  const procCounts = {};
  referrals.forEach(r => {
    if (r.procedure_name) {
      procCounts[r.procedure_name] = (procCounts[r.procedure_name] || 0) + 1;
    }
  });
  const topProcedures = Object.entries(procCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Weekly chart
  const weeklyData = (() => {
    const weeks = {};
    const now = new Date();
    for (let i = 3; i >= 0; i--) {
      const start = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const label = `Week ${4 - i}`;
      weeks[label] = { label, clicks: 0, start, end };
    }
    for (const r of referrals) {
      const d = new Date(r.clicked_at);
      for (const week of Object.values(weeks)) {
        if (d >= week.start && d < week.end) {
          week.clicks++;
          break;
        }
      }
    }
    return Object.values(weeks).map(({ label, clicks }) => ({ label, clicks }));
  })();

  // Estimated revenue
  const estValue = referrals
    .filter(r => r.estimated_value)
    .reduce((sum, r) => sum + Number(r.estimated_value), 0);

  if (loading) {
    return <div className="py-4 text-sm text-text-secondary">Loading booking stats...</div>;
  }

  if (thisMonth === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-text-primary mb-4">Booking Referral Stats (Last 30 Days)</h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="glow-card p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">{thisMonth}</p>
          <p className="text-xs text-text-secondary">Booking Clicks</p>
        </div>
        <div className="glow-card p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">{topProcedures[0]?.[0] || '—'}</p>
          <p className="text-xs text-text-secondary">Top Procedure</p>
        </div>
        {estValue > 0 && (
          <div className="glow-card p-4 text-center">
            <p className="text-2xl font-bold text-green-600">${estValue.toLocaleString()}</p>
            <p className="text-xs text-text-secondary">Est. Revenue*</p>
          </div>
        )}
      </div>

      <div className="glow-card p-6 mb-4">
        <h4 className="text-xs font-semibold text-text-secondary mb-3">Booking Clicks by Week</h4>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={weeklyData}>
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="clicks" fill="#C94F78" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {estValue > 0 && (
        <p className="text-[10px] text-text-secondary">
          * Estimated based on procedure values. Actual revenue depends on completed bookings.
        </p>
      )}
    </div>
  );
}

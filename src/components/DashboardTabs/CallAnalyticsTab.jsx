import { useState, useEffect } from 'react';
import { Phone, PhoneIncoming, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import CallVolumeChart from '../CallVolumeChart';

const BIZ_FONT = 'system-ui, -apple-system, sans-serif';

export default function CallAnalyticsTab({ providerId }) {
  const [callLogs, setCallLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!providerId) return;
    fetchCalls();
  }, [providerId]);

  async function fetchCalls() {
    setLoading(true);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('call_logs')
      .select('*')
      .eq('provider_id', providerId)
      .gte('called_at', thirtyDaysAgo)
      .order('called_at', { ascending: false });
    setCallLogs(data || []);
    setLoading(false);
  }

  const totalCalls = callLogs.length;
  const completedCalls = callLogs.filter(c => c.status === 'completed').length;
  const answerRate = totalCalls > 0 ? Math.round((completedCalls / totalCalls) * 100) : 0;
  const avgDuration = completedCalls > 0
    ? Math.round(
        callLogs
          .filter(c => c.status === 'completed' && c.duration_seconds)
          .reduce((sum, c) => sum + c.duration_seconds, 0) /
        Math.max(callLogs.filter(c => c.status === 'completed' && c.duration_seconds).length, 1)
      )
    : 0;

  const weeklyData = (() => {
    const weeks = {};
    const now = new Date();
    for (let i = 3; i >= 0; i--) {
      const start = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const label = `Week ${4 - i}`;
      weeks[label] = { label, calls: 0, start, end };
    }
    for (const call of callLogs) {
      const callDate = new Date(call.called_at);
      for (const week of Object.values(weeks)) {
        if (callDate >= week.start && callDate < week.end) {
          week.calls++;
          break;
        }
      }
    }
    return Object.values(weeks).map(({ label, calls }) => ({ label, calls }));
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-text-secondary text-[13px]">
        Loading call analytics...
      </div>
    );
  }

  const KPI_CARDS = [
    { label: 'Total Calls', value: totalCalls, icon: <PhoneIncoming size={16} />, color: '#0D9488' },
    { label: 'Answer Rate', value: `${answerRate}%`, icon: <CheckCircle size={16} />, color: '#059669' },
    {
      label: 'Avg Duration',
      value: avgDuration > 60 ? `${Math.floor(avgDuration / 60)}m ${avgDuration % 60}s` : `${avgDuration}s`,
      icon: <Clock size={16} />,
      color: '#2563EB',
    },
    { label: 'Completed', value: completedCalls, icon: <Phone size={16} />, color: '#D97706' },
  ];

  return (
    <div style={{ fontFamily: BIZ_FONT }}>
      <div className="mb-6">
        <h2 className="text-[18px] font-semibold text-text-primary mb-1" style={{ fontFamily: BIZ_FONT }}>
          Call Analytics
        </h2>
        <p className="text-[13px] text-text-secondary">
          Calls from patients who found you on Know Before You Glow this month.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {KPI_CARDS.map(kpi => (
          <div key={kpi.label} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <span style={{ color: kpi.color }}>{kpi.icon}</span>
              <span className="text-[11px] font-medium text-text-secondary uppercase tracking-wide">{kpi.label}</span>
            </div>
            <p className="text-[28px] font-bold text-text-primary leading-none" style={{ fontFamily: BIZ_FONT }}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 mb-6">
        <h3 className="text-[13px] font-semibold text-text-primary uppercase tracking-wide mb-4" style={{ fontFamily: BIZ_FONT }}>
          Calls by Week
        </h3>
        <CallVolumeChart data={weeklyData} chart="bar" />
      </div>

      {totalCalls === 0 && (
        <div className="text-center py-8 text-text-secondary">
          <Phone size={28} className="mx-auto mb-3 opacity-30" />
          <p className="text-[13px]">No calls recorded yet. Once patients start calling through Know Before You Glow, analytics will appear here.</p>
        </div>
      )}
    </div>
  );
}

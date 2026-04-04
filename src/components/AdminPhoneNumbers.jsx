import { useState, useEffect } from 'react';
import { Phone, PhoneOff, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import CallVolumeChart from './CallVolumeChart';

const ESTIMATED_REVENUE_PER_CALL = 25;

export default function AdminPhoneNumbers() {
  const [providers, setProviders] = useState([]);
  const [phoneMap, setPhoneMap] = useState({});
  const [callCounts, setCallCounts] = useState({});
  const [dailyCalls, setDailyCalls] = useState([]);
  const [totalCallsMonth, setTotalCallsMonth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [provRes, phoneRes, callRes] = await Promise.all([
      supabase
        .from('providers')
        .select('id, name, slug, phone, city, state, is_claimed')
        .eq('is_claimed', true)
        .order('name'),
      supabase
        .from('provider_phone_numbers')
        .select('*')
        .eq('is_active', true),
      supabase
        .from('call_logs')
        .select('provider_id, called_at')
        .gte('called_at', thirtyDaysAgo),
    ]);

    setProviders(provRes.data || []);

    // Build phone map: provider_id -> phone record
    const pMap = {};
    for (const phone of (phoneRes.data || [])) {
      pMap[phone.provider_id] = phone;
    }
    setPhoneMap(pMap);

    // Build call counts per provider
    const cCounts = {};
    let total = 0;
    const dailyMap = {};
    for (const call of (callRes.data || [])) {
      cCounts[call.provider_id] = (cCounts[call.provider_id] || 0) + 1;
      total++;
      const day = call.called_at.slice(0, 10);
      dailyMap[day] = (dailyMap[day] || 0) + 1;
    }
    setCallCounts(cCounts);
    setTotalCallsMonth(total);

    // Build daily chart data (last 30 days)
    const daily = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      daily.push({
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        calls: dailyMap[key] || 0,
      });
    }
    setDailyCalls(daily);
    setLoading(false);
  }

  async function handleAssign(providerId) {
    setActionLoading(providerId);
    try {
      const res = await supabase.functions.invoke('provision-twilio-number', {
        body: { provider_id: providerId },
      });
      if (res.error) throw res.error;
      await fetchData();
    } catch (err) {
      alert(`Failed to assign: ${err.message || 'Unknown error'}`);
    }
    setActionLoading(null);
  }

  async function handleRelease(providerId) {
    if (!confirm('Release this Twilio number? Calls will no longer be tracked.')) return;
    setActionLoading(providerId);
    try {
      const res = await supabase.functions.invoke('release-twilio-number', {
        body: { provider_id: providerId },
      });
      if (res.error) throw res.error;
      await fetchData();
    } catch (err) {
      alert(`Failed to release: ${err.message || 'Unknown error'}`);
    }
    setActionLoading(null);
  }

  // Top 10 by call volume
  const topProviders = [...providers]
    .filter(p => callCounts[p.id] > 0)
    .sort((a, b) => (callCounts[b.id] || 0) - (callCounts[a.id] || 0))
    .slice(0, 10);

  if (loading) {
    return <div className="py-12 text-center text-text-secondary">Loading phone numbers...</div>;
  }

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="glow-card p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">{totalCallsMonth}</p>
          <p className="text-xs text-text-secondary">Calls This Month</p>
        </div>
        <div className="glow-card p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">{Object.keys(phoneMap).length}</p>
          <p className="text-xs text-text-secondary">Assigned Numbers</p>
        </div>
        <div className="glow-card p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">
            ${(totalCallsMonth * ESTIMATED_REVENUE_PER_CALL).toLocaleString()}
          </p>
          <p className="text-xs text-text-secondary">Est. Revenue</p>
        </div>
        <div className="glow-card p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">{providers.length}</p>
          <p className="text-xs text-text-secondary">Total Providers</p>
        </div>
      </div>

      {/* Calls by day chart */}
      <div className="glow-card p-6 mb-6">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Calls by Day (Last 30 Days)</h3>
        <CallVolumeChart data={dailyCalls} chart="line" />
      </div>

      {/* Top 10 */}
      {topProviders.length > 0 && (
        <div className="glow-card p-6 mb-6">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Top 10 Providers by Call Volume</h3>
          <div className="space-y-2">
            {topProviders.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-text-secondary w-6">{i + 1}.</span>
                  <span className="text-sm font-medium text-text-primary">{p.name}</span>
                </div>
                <span className="text-sm font-bold text-text-primary">{callCounts[p.id]} calls</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Provider table */}
      <div className="glow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Provider</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Twilio Number</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Real Number</th>
                <th className="text-right px-4 py-3 font-medium text-text-secondary">Calls (30d)</th>
                <th className="text-right px-4 py-3 font-medium text-text-secondary">Action</th>
              </tr>
            </thead>
            <tbody>
              {providers.map(p => {
                const phone = phoneMap[p.id];
                const calls = callCounts[p.id] || 0;
                const isLoading = actionLoading === p.id;

                return (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-text-primary">{p.name}</p>
                      <p className="text-xs text-text-secondary">{p.city}, {p.state}</p>
                    </td>
                    <td className="px-4 py-3">
                      {phone ? (
                        <span className="text-green-600 font-mono text-xs">{phone.twilio_number}</span>
                      ) : (
                        <span className="text-text-secondary">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-text-secondary">
                      {p.phone || '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{calls}</td>
                    <td className="px-4 py-3 text-right">
                      {isLoading ? (
                        <Loader2 size={16} className="animate-spin ml-auto" />
                      ) : phone ? (
                        <button
                          onClick={() => handleRelease(p.id)}
                          className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition"
                        >
                          <PhoneOff size={12} />
                          Release
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAssign(p.id)}
                          disabled={!p.phone}
                          className="inline-flex items-center gap-1 text-xs text-rose-accent hover:text-rose-dark transition disabled:opacity-40"
                          title={!p.phone ? 'Provider has no phone number' : ''}
                        >
                          <Phone size={12} />
                          Assign
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

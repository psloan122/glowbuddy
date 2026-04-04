import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ConnectionStatusBadge from './ConnectionStatusBadge';

export default function AdminIntegrationsTab() {
  const [integrations, setIntegrations] = useState([]);
  const [referralCounts, setReferralCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [intRes, refRes] = await Promise.all([
      supabase
        .from('provider_integrations')
        .select('*, providers(name, slug, city, state)')
        .order('connected_at', { ascending: false }),
      supabase
        .from('booking_referrals')
        .select('provider_id')
        .gte('clicked_at', thirtyDaysAgo),
    ]);

    setIntegrations(intRes.data || []);

    const counts = {};
    (refRes.data || []).forEach(r => {
      counts[r.provider_id] = (counts[r.provider_id] || 0) + 1;
    });
    setReferralCounts(counts);
    setLoading(false);
  }

  const totalConnected = integrations.filter(i => i.connection_status === 'active').length;
  const totalErrors = integrations.filter(i => i.connection_status === 'error').length;
  const totalReferrals = Object.values(referralCounts).reduce((sum, c) => sum + c, 0);

  if (loading) {
    return <div className="py-12 text-center text-text-secondary">Loading integrations...</div>;
  }

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="glow-card p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">{totalConnected}</p>
          <p className="text-xs text-text-secondary">Connected (Vagaro)</p>
        </div>
        <div className="glow-card p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">{totalReferrals}</p>
          <p className="text-xs text-text-secondary">Referrals (30d)</p>
        </div>
        <div className="glow-card p-4 text-center">
          <p className="text-2xl font-bold text-text-primary">{integrations.length}</p>
          <p className="text-xs text-text-secondary">Total Integrations</p>
        </div>
        {totalErrors > 0 && (
          <div className="glow-card p-4 text-center border border-red-200">
            <p className="text-2xl font-bold text-red-500">{totalErrors}</p>
            <p className="text-xs text-red-500 flex items-center justify-center gap-1">
              <AlertTriangle size={10} />
              Errors
            </p>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="glow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Provider</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Platform</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Status</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Connected</th>
                <th className="text-right px-4 py-3 font-medium text-text-secondary">Referrals (30d)</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Last Verified</th>
              </tr>
            </thead>
            <tbody>
              {integrations.map(int => {
                const provider = int.providers;
                return (
                  <tr key={int.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-text-primary">{provider?.name || '—'}</p>
                      <p className="text-xs text-text-secondary">{provider?.city}, {provider?.state}</p>
                    </td>
                    <td className="px-4 py-3 capitalize">{int.platform}</td>
                    <td className="px-4 py-3">
                      <ConnectionStatusBadge status={int.connection_status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">
                      {int.connected_at ? new Date(int.connected_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {referralCounts[int.provider_id] || 0}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">
                      {int.last_verified_at ? new Date(int.last_verified_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                );
              })}
              {integrations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-text-secondary">
                    No integrations yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

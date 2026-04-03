import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Shield,
  Check,
  X,
  AlertTriangle,
  Eye,
  Zap,
  ShieldAlert,
  Copy,
} from 'lucide-react';

const TABS = [
  { key: 'pending', label: 'Pending Review', icon: AlertTriangle },
  { key: 'disputes', label: 'Disputes', icon: Eye },
  { key: 'velocity', label: 'Velocity Flagged', icon: Zap },
  { key: 'lowTrust', label: 'Low Trust', icon: ShieldAlert },
  { key: 'duplicates', label: 'Duplicate Clusters', icon: Copy },
];

export default function Admin() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [data, setData] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Admin | GlowBuddy';
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchData();
    }
  }, [authenticated, activeTab]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'glowadmin2026') {
      setAuthenticated(true);
    } else {
      alert('Incorrect password');
    }
  };

  async function fetchData() {
    setLoading(true);

    if (activeTab === 'pending') {
      const { data: rows } = await supabase
        .from('procedures')
        .select('*')
        .in('status', ['pending', 'flagged'])
        .is('flagged_reason', null)
        .order('created_at', { ascending: false });
      setData(rows || []);
    } else if (activeTab === 'disputes') {
      const { data: rows } = await supabase
        .from('disputes')
        .select('*, procedures(*), providers(*)')
        .order('created_at', { ascending: false });
      setData(rows || []);
    } else if (activeTab === 'velocity') {
      const { data: rows } = await supabase
        .from('procedures')
        .select('*')
        .eq('flagged_reason', 'velocity_check')
        .order('provider_name', { ascending: true })
        .order('created_at', { ascending: false });
      setData(rows || []);
    } else if (activeTab === 'lowTrust') {
      const { data: rows } = await supabase
        .from('procedures')
        .select('*')
        .lt('trust_score', 30)
        .neq('status', 'removed')
        .order('trust_score', { ascending: true });
      setData(rows || []);
    } else if (activeTab === 'duplicates') {
      // Fetch recent submissions from new accounts (< 7 days old)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const { data: rows } = await supabase
        .from('procedures')
        .select('*')
        .gte('created_at', sevenDaysAgo.toISOString())
        .neq('status', 'removed')
        .order('provider_name', { ascending: true })
        .order('created_at', { ascending: false });

      // Group by provider and filter to clusters of 3+
      const grouped = {};
      (rows || []).forEach((row) => {
        const key = row.provider_name?.toLowerCase();
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(row);
      });
      const clusters = Object.values(grouped)
        .filter((group) => group.length >= 3)
        .flat();
      setData(clusters);
    }

    // Fetch counts for all tabs (lightweight)
    fetchCounts();
    setLoading(false);
  }

  async function fetchCounts() {
    const [pending, disputes, velocity, lowTrust] = await Promise.all([
      supabase
        .from('procedures')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'flagged'])
        .is('flagged_reason', null),
      supabase
        .from('disputes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('procedures')
        .select('*', { count: 'exact', head: true })
        .eq('flagged_reason', 'velocity_check'),
      supabase
        .from('procedures')
        .select('*', { count: 'exact', head: true })
        .lt('trust_score', 30)
        .neq('status', 'removed'),
    ]);
    setCounts({
      pending: pending.count || 0,
      disputes: disputes.count || 0,
      velocity: velocity.count || 0,
      lowTrust: lowTrust.count || 0,
    });
  }

  async function approveProcedure(id) {
    await supabase
      .from('procedures')
      .update({ status: 'active', outlier_flagged: false, flagged_reason: null })
      .eq('id', id);
    fetchData();
  }

  async function removeProcedure(id) {
    await supabase
      .from('procedures')
      .update({ status: 'removed' })
      .eq('id', id);
    fetchData();
  }

  async function approveAll(ids) {
    await supabase
      .from('procedures')
      .update({ status: 'active', flagged_reason: null })
      .in('id', ids);
    fetchData();
  }

  async function removeAll(ids) {
    await supabase
      .from('procedures')
      .update({ status: 'removed' })
      .in('id', ids);
    fetchData();
  }

  async function resolveDispute(disputeId, procedureId, action) {
    if (action === 'approve') {
      await supabase
        .from('procedures')
        .update({ status: 'active' })
        .eq('id', procedureId);
      await supabase
        .from('disputes')
        .update({ status: 'resolved' })
        .eq('id', disputeId);
    } else if (action === 'remove') {
      await supabase
        .from('procedures')
        .update({ status: 'removed' })
        .eq('id', procedureId);
      await supabase
        .from('disputes')
        .update({ status: 'resolved' })
        .eq('id', disputeId);
    } else if (action === 'dismiss') {
      await supabase
        .from('disputes')
        .update({ status: 'dismissed' })
        .eq('id', disputeId);
      await supabase
        .from('procedures')
        .update({ status: 'active' })
        .eq('id', procedureId);
    }
    fetchData();
  }

  // --- Login screen ---
  if (!authenticated) {
    return (
      <div className="max-w-md mx-auto px-4 pt-24">
        <div className="glow-card p-8 text-center">
          <Shield className="w-12 h-12 text-rose-accent mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Admin Access</h1>
          <p className="text-text-secondary mb-6">
            Enter the admin password to continue.
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-rose-accent focus:ring-2 focus:ring-rose-accent/20 outline-none transition"
            />
            <button
              type="submit"
              className="w-full bg-rose-accent text-white py-3 rounded-xl font-semibold hover:bg-rose-dark transition"
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Procedure row (reused across tabs) ---
  function ProcedureRow({ proc, showTrust = false }) {
    return (
      <div className="glow-card p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-bold text-lg">{proc.procedure_type}</span>
              {proc.outlier_flagged && (
                <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">
                  Outlier
                </span>
              )}
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  proc.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-700'
                    : proc.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                }`}
              >
                {proc.status}
              </span>
              {showTrust && proc.trust_score != null && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    proc.trust_score < 30
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Trust: {proc.trust_score}
                </span>
              )}
            </div>
            <p className="text-text-secondary text-sm">
              {proc.treatment_area}
              {proc.units_or_volume && <> &middot; {proc.units_or_volume}</>}
            </p>
            <p className="text-2xl font-bold mt-1">
              ${Number(proc.price_paid).toLocaleString()}
            </p>
            <p className="text-sm text-text-secondary mt-1">
              {proc.provider_name} &middot; {proc.city}, {proc.state}
            </p>
            <p className="text-sm text-text-secondary">
              {proc.provider_type}
              {proc.date_of_treatment && (
                <>
                  {' '}
                  &middot; {new Date(proc.date_of_treatment).toLocaleDateString()}
                </>
              )}
            </p>
            {proc.notes && (
              <p className="text-sm italic text-text-secondary mt-2">
                &ldquo;{proc.notes}&rdquo;
              </p>
            )}
            {proc.flagged_reason && (
              <p className="text-sm text-red-600 mt-1">
                Flagged: {proc.flagged_reason}
              </p>
            )}
            {proc.user_id && (
              <p className="text-xs text-text-secondary mt-1 font-mono">
                User: {proc.user_id.slice(0, 8)}...
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => approveProcedure(proc.id)}
              className="flex items-center gap-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition font-medium text-sm"
            >
              <Check className="w-4 h-4" /> Approve
            </button>
            <button
              onClick={() => removeProcedure(proc.id)}
              className="flex items-center gap-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition font-medium text-sm"
            >
              <X className="w-4 h-4" /> Remove
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Group procedures by provider (for velocity + duplicates) ---
  function groupByProvider(items) {
    const groups = {};
    items.forEach((item) => {
      const key = item.provider_name?.toLowerCase() || 'unknown';
      if (!groups[key]) groups[key] = { name: item.provider_name, items: [] };
      groups[key].items.push(item);
    });
    return Object.values(groups);
  }

  // --- Render grouped view ---
  function renderGrouped(items, showTrust = false) {
    const groups = groupByProvider(items);
    if (groups.length === 0) {
      return (
        <div className="glow-card p-8 text-center text-text-secondary">
          No items to review.
        </div>
      );
    }
    return groups.map((group) => (
      <div key={group.name} className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-text-primary">
            {group.name}{' '}
            <span className="text-text-secondary font-normal">
              ({group.items.length} submissions)
            </span>
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => approveAll(group.items.map((i) => i.id))}
              className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 transition font-medium"
            >
              Approve All
            </button>
            <button
              onClick={() => removeAll(group.items.map((i) => i.id))}
              className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition font-medium"
            >
              Remove All
            </button>
          </div>
        </div>
        {group.items.map((proc) => (
          <ProcedureRow key={proc.id} proc={proc} showTrust={showTrust} />
        ))}
      </div>
    ));
  }

  // --- Tab content ---
  function renderContent() {
    if (loading) {
      return (
        <div className="text-center py-12 text-text-secondary animate-pulse">
          Loading...
        </div>
      );
    }

    if (activeTab === 'pending') {
      if (data.length === 0) {
        return (
          <div className="glow-card p-8 text-center text-text-secondary">
            No pending submissions to review.
          </div>
        );
      }
      return (
        <div className="space-y-4">
          {data.map((proc) => (
            <ProcedureRow key={proc.id} proc={proc} />
          ))}
        </div>
      );
    }

    if (activeTab === 'disputes') {
      if (data.length === 0) {
        return (
          <div className="glow-card p-8 text-center text-text-secondary">
            No disputes to review.
          </div>
        );
      }
      return (
        <div className="space-y-4">
          {data.map((dispute) => (
            <div key={dispute.id} className="glow-card p-5">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        dispute.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : dispute.status === 'resolved'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {dispute.status}
                    </span>
                    <span className="text-xs text-text-secondary">
                      {new Date(dispute.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {dispute.procedures && (
                    <div className="mb-3">
                      <p className="font-bold">
                        {dispute.procedures.procedure_type} — $
                        {dispute.procedures.price_paid}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {dispute.procedures.provider_name} &middot;{' '}
                        {dispute.procedures.city}, {dispute.procedures.state}
                      </p>
                    </div>
                  )}
                  {dispute.providers && (
                    <p className="text-sm text-text-secondary mb-2">
                      Disputed by: {dispute.providers.name}
                    </p>
                  )}
                  <div className="bg-red-50 p-3 rounded-lg mb-2">
                    <p className="text-sm font-medium text-red-800">Reason:</p>
                    <p className="text-sm text-red-700">{dispute.reason}</p>
                  </div>
                  {dispute.provider_response && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-blue-800">
                        Provider response:
                      </p>
                      <p className="text-sm text-blue-700">
                        {dispute.provider_response}
                      </p>
                    </div>
                  )}
                </div>
                {dispute.status === 'pending' && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() =>
                        resolveDispute(
                          dispute.id,
                          dispute.procedure_id,
                          'approve'
                        )
                      }
                      className="flex items-center gap-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition font-medium text-sm"
                    >
                      <Check className="w-4 h-4" /> Restore Submission
                    </button>
                    <button
                      onClick={() =>
                        resolveDispute(
                          dispute.id,
                          dispute.procedure_id,
                          'remove'
                        )
                      }
                      className="flex items-center gap-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition font-medium text-sm"
                    >
                      <X className="w-4 h-4" /> Remove Submission
                    </button>
                    <button
                      onClick={() =>
                        resolveDispute(
                          dispute.id,
                          dispute.procedure_id,
                          'dismiss'
                        )
                      }
                      className="flex items-center gap-1 bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition font-medium text-sm"
                    >
                      Dismiss Dispute
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (activeTab === 'velocity') {
      return <div className="space-y-6">{renderGrouped(data)}</div>;
    }

    if (activeTab === 'lowTrust') {
      if (data.length === 0) {
        return (
          <div className="glow-card p-8 text-center text-text-secondary">
            No low-trust submissions.
          </div>
        );
      }
      return (
        <div className="space-y-4">
          {data.map((proc) => (
            <ProcedureRow key={proc.id} proc={proc} showTrust />
          ))}
        </div>
      );
    }

    if (activeTab === 'duplicates') {
      return <div className="space-y-6">{renderGrouped(data, true)}</div>;
    }

    return null;
  }

  // --- Main dashboard ---
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-8 h-8 text-rose-accent" />
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-8 bg-warm-gray rounded-xl p-1 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const count = counts[tab.key];
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 py-3 px-3 rounded-lg font-medium transition whitespace-nowrap text-sm ${
                activeTab === tab.key
                  ? 'bg-white text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {count != null && count > 0 && (
                <span className="bg-rose-accent/10 text-rose-accent text-xs px-1.5 py-0.5 rounded-full ml-0.5">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {renderContent()}
    </div>
  );
}

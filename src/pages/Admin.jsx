import { useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../App';
import { Shield, Check, X, AlertTriangle, Eye } from 'lucide-react';

export default function Admin() {
  const { user } = useContext(AuthContext);
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingProcedures, setPendingProcedures] = useState([]);
  const [disputes, setDisputes] = useState([]);
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
      const { data } = await supabase
        .from('procedures')
        .select('*')
        .in('status', ['pending', 'flagged'])
        .order('created_at', { ascending: false });
      setPendingProcedures(data || []);
    } else {
      const { data } = await supabase
        .from('disputes')
        .select('*, procedures(*), providers(*)')
        .order('created_at', { ascending: false });
      setDisputes(data || []);
    }
    setLoading(false);
  }

  async function approveProcedure(id) {
    await supabase
      .from('procedures')
      .update({ status: 'active', outlier_flagged: false })
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

  if (!authenticated) {
    return (
      <div className="max-w-md mx-auto px-4 pt-24">
        <div className="glow-card p-8 text-center">
          <Shield className="w-12 h-12 text-rose-accent mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Admin Access</h1>
          <p className="text-text-secondary mb-6">Enter the admin password to continue.</p>
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="w-8 h-8 text-rose-accent" />
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      </div>

      <div className="flex gap-1 mb-8 bg-warm-gray rounded-xl p-1">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
            activeTab === 'pending'
              ? 'bg-white text-text-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          Pending Review ({pendingProcedures.length})
        </button>
        <button
          onClick={() => setActiveTab('disputes')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
            activeTab === 'disputes'
              ? 'bg-white text-text-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Eye className="w-4 h-4 inline mr-2" />
          Disputes ({disputes.length})
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-text-secondary animate-pulse">
          Loading...
        </div>
      ) : activeTab === 'pending' ? (
        <div className="space-y-4">
          {pendingProcedures.length === 0 ? (
            <div className="glow-card p-8 text-center text-text-secondary">
              No pending submissions to review.
            </div>
          ) : (
            pendingProcedures.map((proc) => (
              <div key={proc.id} className="glow-card p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
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
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {proc.status}
                      </span>
                    </div>
                    <p className="text-text-secondary text-sm">
                      {proc.treatment_area} &middot; {proc.units_or_volume}
                    </p>
                    <p className="text-2xl font-bold mt-1">${proc.price_paid}</p>
                    <p className="text-sm text-text-secondary mt-1">
                      {proc.provider_name} &middot; {proc.city}, {proc.state}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {proc.provider_type} &middot;{' '}
                      {new Date(proc.date_of_treatment).toLocaleDateString()}
                    </p>
                    {proc.notes && (
                      <p className="text-sm italic text-text-secondary mt-2">
                        "{proc.notes}"
                      </p>
                    )}
                    {proc.flagged_reason && (
                      <p className="text-sm text-red-600 mt-1">
                        Flagged: {proc.flagged_reason}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => approveProcedure(proc.id)}
                      className="flex items-center gap-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition font-medium"
                    >
                      <Check className="w-4 h-4" /> Approve
                    </button>
                    <button
                      onClick={() => removeProcedure(proc.id)}
                      className="flex items-center gap-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition font-medium"
                    >
                      <X className="w-4 h-4" /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.length === 0 ? (
            <div className="glow-card p-8 text-center text-text-secondary">
              No disputes to review.
            </div>
          ) : (
            disputes.map((dispute) => (
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
                          {dispute.procedures.procedure_type} — ${dispute.procedures.price_paid}
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
                    <div className="bg-red-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-red-800">Reason:</p>
                      <p className="text-sm text-red-700">{dispute.reason}</p>
                    </div>
                  </div>
                  {dispute.status === 'pending' && (
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() =>
                          resolveDispute(dispute.id, dispute.procedure_id, 'approve')
                        }
                        className="flex items-center gap-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition font-medium text-sm"
                      >
                        <Check className="w-4 h-4" /> Restore Submission
                      </button>
                      <button
                        onClick={() =>
                          resolveDispute(dispute.id, dispute.procedure_id, 'remove')
                        }
                        className="flex items-center gap-1 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition font-medium text-sm"
                      >
                        <X className="w-4 h-4" /> Remove Submission
                      </button>
                      <button
                        onClick={() =>
                          resolveDispute(dispute.id, dispute.procedure_id, 'dismiss')
                        }
                        className="flex items-center gap-1 bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition font-medium text-sm"
                      >
                        Dismiss Dispute
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

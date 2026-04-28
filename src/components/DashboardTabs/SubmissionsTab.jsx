import { useState, useMemo } from 'react';
import { DollarSign, Star, Users, MessageSquare, Check, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import StarRating from '../StarRating';
import { getProcedureLabel } from '../../lib/procedureLabel';

const BIZ_FONT = 'system-ui, -apple-system, sans-serif';

export default function SubmissionsTab({ communityProcedures: rawCommunityProcedures, pricing, providerId, onRefresh }) {
  const communityProcedures = (rawCommunityProcedures || []).filter((p) =>
    p.normalized_category !== 'hidden'
  );
  const [actionLoading, setActionLoading] = useState(null);
  const [actionError, setActionError] = useState('');

  async function handleConfirm(procId) {
    setActionLoading(procId);
    setActionError('');
    const { error } = await supabase
      .from('procedures')
      .update({ provider_confirmed: true, provider_confirmed_at: new Date().toISOString() })
      .eq('id', procId);
    if (error) {
      setActionError(`Could not confirm. ${error.message}`);
    } else if (onRefresh) {
      onRefresh();
    }
    setActionLoading(null);
  }

  async function handleFlag(procId, procedureType) {
    if (!window.confirm('Flag this submission as inaccurate? This will create a dispute for review.')) return;
    setActionLoading(procId);
    setActionError('');
    const { error } = await supabase.from('disputes').insert({
      procedure_id: procId,
      provider_id: providerId,
      reason: 'Provider flagged as inaccurate',
      status: 'pending',
    });
    if (error) {
      setActionError(`Could not flag. ${error.message}`);
    } else if (onRefresh) {
      onRefresh();
    }
    setActionLoading(null);
  }
  const [filterType, setFilterType] = useState('all');
  const [sort, setSort] = useState('newest');

  const procedureTypes = useMemo(() => {
    const types = new Set(communityProcedures.map((p) => p.procedure_type).filter(Boolean));
    return [...types].sort();
  }, [communityProcedures]);

  const totalSubmissions = communityProcedures.length;

  const avgReportedPrice =
    totalSubmissions > 0
      ? Math.round(
          communityProcedures.reduce((sum, p) => sum + (p.price_paid || 0), 0) /
            totalSubmissions
        )
      : 0;

  const withRatings = communityProcedures.filter((p) => p.rating);
  const avgRating =
    withRatings.length > 0
      ? (withRatings.reduce((sum, p) => sum + p.rating, 0) / withRatings.length).toFixed(1)
      : null;

  const withReviews = communityProcedures.filter(
    (p) => p.review_body && p.review_body.trim()
  ).length;

  const filtered = useMemo(() => {
    let list =
      filterType === 'all'
        ? communityProcedures
        : communityProcedures.filter((p) => p.procedure_type === filterType);

    switch (sort) {
      case 'oldest':
        list = [...list].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'price_high':
        list = [...list].sort((a, b) => (b.price_paid || 0) - (a.price_paid || 0));
        break;
      case 'price_low':
        list = [...list].sort((a, b) => (a.price_paid || 0) - (b.price_paid || 0));
        break;
      default:
        list = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return list;
  }, [communityProcedures, filterType, sort]);

  function getMenuPrice(proc) {
    const match = pricing.find(
      (p) =>
        p.procedure_type === proc.procedure_type &&
        (!proc.treatment_area || p.treatment_area === proc.treatment_area)
    );
    return match ? match.price : null;
  }

  if (totalSubmissions === 0) {
    return (
      <div style={{ fontFamily: BIZ_FONT }}>
        <h2 className="text-[18px] font-semibold text-text-primary mb-6">
          Patient Submissions
        </h2>
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-[13px] text-text-secondary">No patient submissions yet.</p>
        </div>
      </div>
    );
  }

  const KPI_CARDS = [
    { label: 'Total', value: totalSubmissions, icon: <Users size={16} />, color: '#7C3AED' },
    { label: 'Avg Price', value: `$${avgReportedPrice}`, icon: <DollarSign size={16} />, color: '#0D9488' },
    { label: 'Avg Rating', value: avgRating || '--', icon: <Star size={16} />, color: '#D97706' },
    { label: 'With Reviews', value: withReviews, icon: <MessageSquare size={16} />, color: '#2563EB' },
  ];

  return (
    <div style={{ fontFamily: BIZ_FONT }}>
      <h2 className="text-[18px] font-semibold text-text-primary mb-6">
        Patient Submissions
      </h2>

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

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 rounded-md border border-gray-200 text-[13px] text-text-primary focus:border-biz-teal outline-none transition"
        >
          <option value="all">All Procedures ({totalSubmissions})</option>
          {procedureTypes.map((type) => (
            <option key={type} value={type}>
              {getProcedureLabel(type, null)} ({communityProcedures.filter((p) => p.procedure_type === type).length})
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="px-3 py-2 rounded-md border border-gray-200 text-[13px] text-text-primary focus:border-biz-teal outline-none transition"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="price_high">Price: High to Low</option>
          <option value="price_low">Price: Low to High</option>
        </select>
      </div>

      {actionError && (
        <div className="mb-4 text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-md px-4 py-3">
          {actionError}
        </div>
      )}

      {/* Submission cards */}
      <div className="space-y-3">
        {filtered.map((proc) => {
          const menuPrice = getMenuPrice(proc);
          return (
            <div key={proc.id} className="rounded-lg border border-gray-200 bg-white p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-[14px] font-semibold text-text-primary">
                      {getProcedureLabel(proc.procedure_type, proc.brand) || 'Unknown'}
                    </span>
                    {proc.treatment_area && (
                      <span className="text-[11px] bg-gray-100 text-text-secondary px-2 py-0.5 rounded">
                        {proc.treatment_area}
                      </span>
                    )}
                    <span className="text-[10px] bg-gray-100 text-text-secondary px-2 py-0.5 rounded">
                      Anonymous
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px]">
                    <div>
                      <span className="text-text-secondary">Reported price:</span>{' '}
                      <span className="font-medium text-text-primary">${proc.price_paid || '--'}</span>
                    </div>
                    <div>
                      <span className="text-text-secondary">Your menu price:</span>{' '}
                      <span className="font-medium text-text-primary">
                        {menuPrice !== null ? `$${menuPrice}` : 'Not listed'}
                      </span>
                    </div>
                    {proc.units_or_volume && (
                      <div>
                        <span className="text-text-secondary">Units/Volume:</span>{' '}
                        <span className="text-text-primary">{proc.units_or_volume}</span>
                      </div>
                    )}
                    {proc.treatment_date && (
                      <div>
                        <span className="text-text-secondary">Treatment date:</span>{' '}
                        <span className="text-text-primary">{new Date(proc.treatment_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {proc.city && (
                      <div>
                        <span className="text-text-secondary">City:</span>{' '}
                        <span className="text-text-primary">{proc.city}</span>
                      </div>
                    )}
                  </div>

                  {proc.rating && (
                    <div className="flex items-center gap-3 mt-2">
                      <StarRating value={proc.rating} readOnly size={16} />
                      {proc.would_return !== null && proc.would_return !== undefined && (
                        <span className="text-[11px] text-text-secondary">
                          {proc.would_return ? 'Would return' : 'Would not return'}
                        </span>
                      )}
                    </div>
                  )}

                  {proc.review_body && proc.review_body.trim() && (
                    <div className="mt-2 bg-gray-50 rounded-md px-3 py-2">
                      <p className="text-[13px] text-text-primary">{proc.review_body}</p>
                    </div>
                  )}

                  {(!proc.review_body || !proc.review_body.trim()) && proc.notes && (
                    <p className="mt-2 text-[13px] text-text-secondary italic">{proc.notes}</p>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-[11px] text-text-secondary whitespace-nowrap">
                    {new Date(proc.created_at).toLocaleDateString()}
                  </span>
                  {proc.provider_confirmed ? (
                    <span className="text-[11px] font-medium inline-flex items-center gap-1" style={{ color: 'var(--color-biz-teal)' }}>
                      <Check size={12} /> Confirmed
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleConfirm(proc.id)}
                        disabled={actionLoading === proc.id}
                        className="text-[11px] px-2.5 py-1 rounded-md font-medium bg-green-50 text-green-700 hover:bg-green-100 transition disabled:opacity-50"
                        title="Confirm this price is accurate"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => handleFlag(proc.id, proc.procedure_type)}
                        disabled={actionLoading === proc.id}
                        className="text-[11px] px-2.5 py-1 rounded-md font-medium bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50"
                        title="Flag as inaccurate"
                      >
                        Flag
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

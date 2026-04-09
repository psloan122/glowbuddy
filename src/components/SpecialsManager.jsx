import { useState, useEffect, useCallback } from 'react';
import { Plus, Eye, MousePointerClick, RefreshCw, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import SpecialCountdownBadge from './SpecialCountdownBadge';
import CreateSpecialForm from './CreateSpecialForm';

export default function SpecialsManager({ provider, prefill }) {
  const [specials, setSpecials] = useState([]);
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Auto-open the create form when the parent passes a prefill payload
  // (e.g. from the Demand Intel "Post a $X special" handoff).
  useEffect(() => {
    if (prefill) {
      setShowCreate(true);
    }
  }, [prefill]);

  const fetchData = useCallback(async () => {
    if (!provider) return;
    setLoading(true);

    const [specialsRes, placementsRes] = await Promise.all([
      supabase
        .from('provider_specials')
        .select('*')
        .eq('provider_id', provider.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('special_placements')
        .select('*')
        .eq('provider_id', provider.id)
        .order('purchased_at', { ascending: false }),
    ]);

    setSpecials(specialsRes.data || []);
    setPlacements(placementsRes.data || []);
    setLoading(false);
  }, [provider]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function getPlacement(specialId) {
    return placements.find((p) => p.special_id === specialId);
  }

  async function handleCancel(special) {
    if (!window.confirm('Are you sure you want to cancel this special? No refund will be issued.')) return;

    await supabase
      .from('provider_specials')
      .update({ is_active: false })
      .eq('id', special.id);

    const placement = getPlacement(special.id);
    if (placement) {
      await supabase
        .from('special_placements')
        .update({ status: 'cancelled' })
        .eq('id', placement.id);
    }

    fetchData();
  }

  async function handleBoost(special) {
    // Pre-fill the create form with the old special's data
    // For MVP, just open the create form (user will re-enter)
    setShowCreate(true);
  }

  function handleCreateComplete() {
    setShowCreate(false);
    fetchData();
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <Loader2 size={24} className="animate-spin text-rose-accent mx-auto" />
      </div>
    );
  }

  if (showCreate) {
    return (
      <div>
        <h2 className="text-xl font-bold text-text-primary mb-6">
          Create Promoted Special
        </h2>
        <CreateSpecialForm
          provider={provider}
          defaultValues={prefill}
          onComplete={handleCreateComplete}
          onCancel={() => setShowCreate(false)}
        />
      </div>
    );
  }

  const now = new Date();
  const activeSpecials = specials.filter(
    (s) => s.is_active && new Date(s.ends_at) > now
  );
  const pastSpecials = specials.filter(
    (s) => !s.is_active || new Date(s.ends_at) <= now
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-text-primary">
          Promoted Specials
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 bg-rose-accent text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-rose-dark transition"
        >
          <Plus size={16} /> Create Special
        </button>
      </div>

      {/* Active Specials */}
      {activeSpecials.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
            Active ({activeSpecials.length})
          </h3>
          <div className="space-y-3">
            {activeSpecials.map((special) => {
              const placement = getPlacement(special.id);
              const ctr = special.impressions > 0
                ? ((special.clicks / special.impressions) * 100).toFixed(1)
                : '0.0';

              return (
                <div key={special.id} className="glow-card p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-semibold text-text-primary">
                          {special.headline}
                        </h4>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                            special.placement_tier === 'featured'
                              ? 'text-white'
                              : 'bg-gray-100 text-text-secondary'
                          }`}
                          style={
                            special.placement_tier === 'featured'
                              ? { backgroundColor: '#D4A017' }
                              : undefined
                          }
                        >
                          {special.placement_tier}
                        </span>
                        <SpecialCountdownBadge endsAt={special.ends_at} />
                      </div>

                      <p className="text-sm text-text-secondary mb-2">
                        {special.treatment_name} — ${Number(special.promo_price).toFixed(2)}/{special.price_unit}
                      </p>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-xs text-text-secondary">
                        <span className="inline-flex items-center gap-1">
                          <Eye size={12} />
                          {special.impressions.toLocaleString()} impressions
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MousePointerClick size={12} />
                          {special.clicks.toLocaleString()} clicks
                        </span>
                        <span className="font-medium text-text-primary">
                          {ctr}% CTR
                        </span>
                        {placement && (
                          <span className="text-text-secondary">
                            Paid ${Number(placement.price_paid).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleCancel(special)}
                      className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full bg-gray-100 text-text-secondary hover:bg-red-50 hover:text-red-500 transition shrink-0"
                    >
                      <XCircle size={12} />
                      Cancel
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Past Specials */}
      {pastSpecials.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
            Past ({pastSpecials.length})
          </h3>
          <div className="space-y-3">
            {pastSpecials.map((special) => {
              const ctr = special.impressions > 0
                ? ((special.clicks / special.impressions) * 100).toFixed(1)
                : '0.0';

              return (
                <div key={special.id} className="glow-card p-4 opacity-70">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-text-primary mb-1">
                        {special.headline}
                      </h4>
                      <p className="text-sm text-text-secondary mb-2">
                        {special.treatment_name} — ${Number(special.promo_price).toFixed(2)}/{special.price_unit}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-text-secondary">
                        <span className="inline-flex items-center gap-1">
                          <Eye size={12} />
                          {special.impressions.toLocaleString()} imp
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MousePointerClick size={12} />
                          {special.clicks.toLocaleString()} clicks
                        </span>
                        <span className="font-medium">{ctr}% CTR</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleBoost(special)}
                      className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full bg-rose-light text-rose-dark hover:bg-rose-accent hover:text-white transition shrink-0"
                    >
                      <RefreshCw size={12} />
                      Boost Again
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {specials.length === 0 && (
        <div className="glow-card p-10 text-center">
          <h3 className="text-lg font-bold text-text-primary mb-2">
            Promote your first special
          </h3>
          <p className="text-sm text-text-secondary mb-6 max-w-md mx-auto">
            Get your best offer in front of patients searching in your area. Starting at $49/week.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 bg-rose-accent text-white px-6 py-3 rounded-full font-semibold hover:bg-rose-dark transition"
          >
            <Plus size={16} /> Create Your First Special
          </button>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { confirmRedemption } from '../lib/creditLogic';

export default function RedemptionConfirmCard({ providerId }) {
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(null);

  useEffect(() => {
    if (!providerId) return;
    supabase
      .from('credit_redemptions')
      .select('*')
      .eq('provider_id', providerId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setRedemptions(data || []);
        setLoading(false);
      });
  }, [providerId]);

  async function handleConfirm(code) {
    setConfirming(code);
    const result = await confirmRedemption(code, providerId);
    if (result.success) {
      setRedemptions((prev) => prev.filter((r) => r.redemption_code !== code));
    }
    setConfirming(null);
  }

  if (loading || redemptions.length === 0) return null;

  return (
    <div className="glow-card p-5 mb-6">
      <h3 className="font-semibold text-text-primary mb-3 flex items-center gap-2">
        <span style={{ color: '#D97706' }}>&#10022;</span>
        Pending GlowRewards Redemptions
      </h3>
      <div className="space-y-3">
        {redemptions.map((r) => (
          <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-warm-gray">
            <div>
              <p className="text-sm font-mono font-bold tracking-wider text-text-primary">
                {r.redemption_code}
              </p>
              <p className="text-xs text-text-secondary">
                {r.redemption_type === 'treatment_credit' ? '$25 Treatment Credit' : '$10 Provider Special'}
                {r.expires_at && (
                  <> &middot; Expires {new Date(r.expires_at).toLocaleDateString()}</>
                )}
              </p>
            </div>
            <button
              onClick={() => handleConfirm(r.redemption_code)}
              disabled={confirming === r.redemption_code}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-full transition disabled:opacity-50"
              style={{ background: '#16A34A' }}
            >
              {confirming === r.redemption_code ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
              Confirm
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

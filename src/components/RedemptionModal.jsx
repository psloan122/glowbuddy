import { useState } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { REDEMPTION_TIERS, redeemForEntry, redeemForSpecial, redeemForTreatment } from '../lib/creditLogic';

export default function RedemptionModal({ tier, userId, specialId, providerId, onClose, onSuccess }) {
  const [step, setStep] = useState('confirm'); // confirm | success | error
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const tierConfig = REDEMPTION_TIERS[tier];
  if (!tierConfig) return null;

  async function handleRedeem() {
    setLoading(true);
    setErrorMsg('');

    let res;
    if (tier === 'giveaway_entry') {
      res = await redeemForEntry(userId);
    } else if (tier === 'provider_special') {
      res = await redeemForSpecial(userId, specialId);
    } else if (tier === 'treatment_credit') {
      res = await redeemForTreatment(userId, providerId);
    }

    setLoading(false);

    if (res?.success) {
      setResult(res);
      setStep('success');
      onSuccess?.(res);
    } else {
      setErrorMsg(res?.error || 'Something went wrong');
      setStep('error');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <button onClick={onClose} className="absolute top-4 right-4 text-text-secondary hover:text-text-primary">
          <X size={20} />
        </button>

        {step === 'confirm' && (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: '#FEF3C7' }}
            >
              <span className="text-2xl" style={{ color: '#D97706' }}>&#10022;</span>
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">
              Redeem {tierConfig.credits.toLocaleString()} Credits
            </h3>
            <p className="text-sm text-text-secondary mb-6">
              {tierConfig.label}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary transition rounded-full border border-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleRedeem}
                disabled={loading}
                className="px-5 py-2.5 text-sm font-semibold text-white rounded-full transition disabled:opacity-50"
                style={{ background: '#D97706' }}
              >
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 size={14} className="animate-spin" /> Redeeming...
                  </span>
                ) : (
                  'Confirm Redemption'
                )}
              </button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 bg-green-100">
              <Check size={28} className="text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">
              Redeemed!
            </h3>
            {result?.code ? (
              <>
                <p className="text-sm text-text-secondary mb-3">
                  Show this code to the provider:
                </p>
                <div className="inline-block px-6 py-3 rounded-xl text-2xl font-mono font-bold tracking-widest mb-3"
                  style={{ background: '#FEF3C7', color: '#92400E' }}
                >
                  {result.code}
                </div>
                <p className="text-xs text-text-secondary">
                  Expires {new Date(result.expiresAt).toLocaleDateString()} at{' '}
                  {new Date(result.expiresAt).toLocaleTimeString()}
                </p>
              </>
            ) : (
              <p className="text-sm text-text-secondary">
                Your extra giveaway entry has been added!
              </p>
            )}
            <button
              onClick={onClose}
              className="mt-6 px-5 py-2.5 text-sm font-semibold text-white rounded-full"
              style={{ background: '#D97706' }}
            >
              Done
            </button>
          </div>
        )}

        {step === 'error' && (
          <div className="text-center">
            <h3 className="text-lg font-bold text-text-primary mb-2">
              Unable to Redeem
            </h3>
            <p className="text-sm text-red-600 mb-4">{errorMsg}</p>
            <button
              onClick={() => setStep('confirm')}
              className="px-5 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary transition rounded-full border border-gray-200"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

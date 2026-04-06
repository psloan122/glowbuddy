import { useState, useEffect, useContext } from 'react';
import { X, Wallet, Check } from 'lucide-react';
import { AuthContext } from '../App';
import { getWalletBalance, getWalletCredits, redeemWalletCredit } from '../lib/referral';

/**
 * Modal for applying wallet credit to a specific special.
 * Shows original price, credit amount, and final price.
 */
export default function WalletRedeemModal({ special, onClose, onSuccess }) {
  const { user } = useContext(AuthContext);
  const [balanceCents, setBalanceCents] = useState(0);
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      getWalletBalance(user.id),
      getWalletCredits(user.id),
    ]).then(([balance, creds]) => {
      setBalanceCents(balance);
      setCredits(creds.filter((c) => !c.redeemed_at && (!c.expires_at || new Date(c.expires_at) > new Date())));
      setLoading(false);
    });
  }, [user?.id]);

  const specialPrice = Number(special.special_price || special.original_price || 0);
  const creditToApply = Math.min(balanceCents, 1000); // max $10 per redemption
  const finalPrice = Math.max(0, specialPrice * 100 - creditToApply) / 100;

  async function handleApply() {
    if (!credits.length || applying) return;
    setApplying(true);
    setError(null);

    // Use the first available credit
    const credit = credits[0];
    const result = await redeemWalletCredit(user.id, credit.id, special.id);

    if (result.success) {
      setApplied(true);
      if (onSuccess) onSuccess();
    } else {
      setError(result.error);
    }
    setApplying(false);
  }

  if (applied) {
    return (
      <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
            <Check size={24} className="text-emerald-600" />
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-2">Credit Applied!</h3>
          <p className="text-sm text-text-secondary mb-4">
            ${(creditToApply / 100).toFixed(2)} has been applied to this special. The provider will see your full booking intent — GlowBuddy covers the discount.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-sm font-medium text-white rounded-xl transition-colors"
            style={{ backgroundColor: '#C94F78' }}
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <Wallet size={18} className="text-emerald-600" /> Apply Credit
          </h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="animate-pulse text-rose-accent text-center py-8">Loading...</div>
        ) : balanceCents <= 0 ? (
          <p className="text-sm text-text-secondary text-center py-4">No wallet credit available.</p>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Special price</span>
                <span className="font-semibold text-text-primary">${specialPrice.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-600 font-medium">Your credit</span>
                <span className="font-semibold text-emerald-600">-${(creditToApply / 100).toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-text-primary">You pay</span>
                <span className="text-xl font-bold text-text-primary">${finalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 mb-3">{error}</p>
            )}

            <button
              onClick={handleApply}
              disabled={applying}
              className="w-full py-2.5 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#C94F78' }}
            >
              {applying ? 'Applying...' : `Apply $${(creditToApply / 100).toFixed(2)} Credit`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

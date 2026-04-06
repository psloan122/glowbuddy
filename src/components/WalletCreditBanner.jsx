import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, X } from 'lucide-react';
import { AuthContext } from '../App';
import { getWalletBalance } from '../lib/referral';

/**
 * Shown on the Specials page when user has wallet credit.
 * Informs them they can apply credit to specials.
 */
export default function WalletCreditBanner() {
  const { user } = useContext(AuthContext);
  const [balanceCents, setBalanceCents] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;
    getWalletBalance(user.id).then(setBalanceCents);
  }, [user?.id]);

  if (!user || balanceCents <= 0 || dismissed) return null;

  return (
    <div className="glow-card p-4 mb-6 flex items-center justify-between" style={{ background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
      <div className="flex items-center gap-3">
        <Wallet size={20} className="text-emerald-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-text-primary">
            You have ${(balanceCents / 100).toFixed(2)} in wallet credit
          </p>
          <p className="text-xs text-text-secondary">
            Apply it to any special below. <Link to="/refer" className="text-emerald-600 font-medium">Earn more &rarr;</Link>
          </p>
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-text-secondary hover:text-text-primary transition-colors shrink-0 ml-2"
      >
        <X size={16} />
      </button>
    </div>
  );
}

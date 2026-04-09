import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Check, Share2, Gift, Clock, Users, Wallet } from 'lucide-react';
import { AuthContext } from '../App';
import { ensureReferralCode, getReferralStats, getWalletBalance, getWalletCredits } from '../lib/referral';
import { getCity } from '../lib/gating';

const STEPS = [
  { icon: '1', title: 'Share your link', desc: 'Send your unique referral link to a friend.' },
  { icon: '2', title: 'They sign up & submit', desc: 'Your friend creates an account and logs a treatment with a receipt.' },
  { icon: '3', title: 'You both get $10', desc: 'Once their receipt is verified, you both get $10 in wallet credit.' },
];

function StatusBadge({ status }) {
  if (status === 'rewarded') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
        <Check size={10} /> Rewarded
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
      <Clock size={10} /> Pending verification
    </span>
  );
}

export default function Refer() {
  const { user, openAuthModal } = useContext(AuthContext);
  const [code, setCode] = useState('');
  const [referrals, setReferrals] = useState([]);
  const [walletCents, setWalletCents] = useState(0);
  const [walletCredits, setWalletCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    document.title = 'Give $10, Get $10 — Refer a Friend | Know Before You Glow';
  }, []);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadData();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    setLoading(true);
    const [refCode, stats, balance, credits] = await Promise.all([
      ensureReferralCode(user.id),
      getReferralStats(user.id),
      getWalletBalance(user.id),
      getWalletCredits(user.id),
    ]);
    setCode(refCode);
    setReferrals(stats);
    setWalletCents(balance);
    setWalletCredits(credits);
    setLoading(false);
  }

  const referralUrl = code ? `https://knowbeforeyouglow.com/r/${code}` : '';
  const city = getCity() || 'my city';
  const shareText = `I use Know Before You Glow to find real Botox prices in ${city} before I book. Use my link and we both get $10 in credit: ${referralUrl}`;

  function handleCopy() {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
        return;
      } catch {
        // User cancelled
      }
    }
    handleCopy();
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="glow-card p-8">
          <Gift size={40} className="mx-auto mb-4 text-rose-accent" />
          <h1 className="text-2xl font-bold text-text-primary mb-2">Give $10, Get $10</h1>
          <p className="text-text-secondary mb-6">
            Sign in to get your referral link and start earning wallet credit.
          </p>
          <button
            onClick={() => openAuthModal('signup', '/refer')}
            className="px-6 py-3 bg-rose-accent text-white font-medium rounded-xl hover:bg-rose-dark transition-colors"
          >
            Sign Up to Refer
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="animate-pulse text-rose-accent text-center text-lg">Loading your referral program...</div>
      </div>
    );
  }

  const rewardedCount = referrals.filter((r) => r.status === 'rewarded').length;
  const totalEarned = rewardedCount * 10;
  const unredeemed = walletCredits.filter((c) => !c.redeemed_at && (!c.expires_at || new Date(c.expires_at) > new Date()));

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Hero */}
      <div
        className="glow-card p-8 text-center mb-8"
        style={{ background: 'linear-gradient(135deg, #FBE8EF, #FDF6F0)' }}
      >
        <Gift size={40} className="mx-auto mb-3 text-rose-accent" />
        <h1 className="text-3xl font-bold text-text-primary mb-2">Give $10, Get $10</h1>
        <p className="text-text-secondary max-w-md mx-auto">
          Invite friends to Know Before You Glow. When they verify their first treatment receipt, you both earn $10 in wallet credit — redeemable on provider specials.
        </p>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {STEPS.map((step) => (
          <div key={step.icon} className="glow-card p-4 text-center">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold text-white"
              style={{ backgroundColor: '#C94F78' }}
            >
              {step.icon}
            </div>
            <p className="text-sm font-semibold text-text-primary mb-1">{step.title}</p>
            <p className="text-xs text-text-secondary">{step.desc}</p>
          </div>
        ))}
      </div>

      {/* Your link */}
      <div className="glow-card p-6 mb-8">
        <h2 className="text-lg font-bold text-text-primary mb-3">Your Referral Link</h2>
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            readOnly
            value={referralUrl}
            className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-text-primary font-mono select-all"
            onClick={(e) => e.target.select()}
          />
          <button
            onClick={handleCopy}
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-colors"
            style={{ backgroundColor: '#C94F78' }}
          >
            {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
          </button>
        </div>
        <button
          onClick={handleShare}
          className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium text-rose-accent border border-rose-accent/30 rounded-xl hover:bg-rose-light/50 transition-colors"
        >
          <Share2 size={14} /> Share with friends
        </button>
      </div>

      {/* Wallet balance */}
      <div className="glow-card p-6 mb-8" style={{ background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)' }}>
        <div className="flex items-center gap-3 mb-2">
          <Wallet size={20} className="text-emerald-600" />
          <h2 className="text-lg font-bold text-text-primary">Your Wallet</h2>
        </div>
        <p className="text-3xl font-bold text-emerald-600">${(walletCents / 100).toFixed(2)}</p>
        <p className="text-sm text-text-secondary mt-1">
          {unredeemed.length > 0
            ? `${unredeemed.length} credit${unredeemed.length !== 1 ? 's' : ''} available — expires 12 months from earned date`
            : 'Refer friends to start earning'}
        </p>
        {walletCents > 0 && (
          <Link
            to="/specials"
            className="inline-block mt-3 text-sm font-medium text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            Browse specials to redeem &rarr;
          </Link>
        )}
      </div>

      {/* Referral history */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <Users size={18} /> Referral History
          </h2>
          {rewardedCount > 0 && (
            <span className="text-sm text-text-secondary">
              ${totalEarned} earned from {rewardedCount} referral{rewardedCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        {referrals.length === 0 ? (
          <div className="glow-card p-6 text-center">
            <p className="text-text-secondary text-sm">
              No referrals yet. Share your link to get started!
            </p>
          </div>
        ) : (
          <div className="glow-card divide-y divide-gray-100">
            {referrals.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-sm font-medium text-text-primary">{r.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={r.status} />
                  <span className="text-xs text-text-secondary">
                    {new Date(r.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fine print */}
      <p className="text-xs text-text-secondary text-center">
        Wallet credits expire 12 months from the date earned. Credits are redeemable against featured provider specials only.
        Self-referrals are not eligible.
      </p>
    </div>
  );
}

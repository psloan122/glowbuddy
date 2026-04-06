import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { AuthContext } from '../App';
import {
  CREDIT_VALUES,
  REDEMPTION_TIERS,
  getBalance,
  getCreditHistory,
} from '../lib/creditLogic';
import { supabase } from '../lib/supabase';
import CreditBalance from '../components/CreditBalance';
import RedemptionModal from '../components/RedemptionModal';
import GlowRewardsDirectory from '../components/GlowRewardsDirectory';

const TYPE_ICONS = {
  submission: '+',
  rating: '+',
  review: '+',
  receipt_verified: '+',
  photo: '+',
  pioneer: '+',
  referral: '+',
  login_streak: '+',
  freshness: '+',
  dispute_defended: '+',
  redeem_entry: '-',
  redeem_special: '-',
  redeem_treatment: '-',
  expiry: '-',
  admin: '~',
};

export default function Rewards() {
  const { user, openAuthModal } = useContext(AuthContext);
  const navigate = useNavigate();

  const [balance, setBalance] = useState(0);
  const [dollarValue, setDollarValue] = useState('0.00');
  const [history, setHistory] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [giveawayEntries, setGiveawayEntries] = useState(0);
  const [showGuide, setShowGuide] = useState(false);
  const [redeemModal, setRedeemModal] = useState(null);
  const [userCity, setUserCity] = useState('');
  const [userState, setUserState] = useState('');
  const [showDirectory, setShowDirectory] = useState(false);

  useEffect(() => {
    document.title = 'My Rewards | GlowBuddy';
  }, []);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadData();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    setLoading(true);
    const [balRes, histRes] = await Promise.all([
      getBalance(user.id),
      getCreditHistory(user.id, 20, 0),
    ]);
    setBalance(balRes.balance);
    setDollarValue(balRes.dollarValue);
    setHistory(histRes.rows);
    setHasMore(histRes.hasMore);
    setHistoryOffset(20);

    // Giveaway entries this month
    const month = new Date().toISOString().slice(0, 7);
    const { data: entries } = await supabase
      .from('giveaway_entries')
      .select('entries')
      .eq('user_id', user.id)
      .eq('month', month);
    const total = (entries || []).reduce((s, e) => s + (e.entries || 0), 0);
    setGiveawayEntries(total);

    // User's city/state for directory
    const { data: recentProc } = await supabase
      .from('procedures')
      .select('city, state')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);
    if (recentProc?.[0]) {
      setUserCity(recentProc[0].city || '');
      setUserState(recentProc[0].state || '');
    }

    setLoading(false);
  }

  async function loadMore() {
    setLoadingMore(true);
    const res = await getCreditHistory(user.id, 20, historyOffset);
    setHistory((prev) => [...prev, ...res.rows]);
    setHasMore(res.hasMore);
    setHistoryOffset((prev) => prev + 20);
    setLoadingMore(false);
  }

  function handleRedeemSuccess() {
    // Refresh balance and history
    loadData();
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="glow-card p-8">
          <h1 className="text-2xl font-bold text-text-primary mb-2">My Rewards</h1>
          <p className="text-text-secondary mb-6">
            Sign in to see your Glow Credits and redeem rewards.
          </p>
          <button
            onClick={() => openAuthModal('signup')}
            className="px-6 py-3 bg-rose-accent text-white font-medium rounded-xl hover:bg-rose-dark transition-colors"
          >
            Sign Up
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="animate-pulse text-rose-accent text-center text-lg">
          Loading your rewards...
        </div>
      </div>
    );
  }

  const endOfYear = new Date(new Date().getFullYear(), 11, 31).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-text-primary mb-6">My Rewards</h1>

      {/* Wallet Header */}
      <div className="glow-card p-6 mb-6" style={{ background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: '#92400E' }}>
              Glow Credits
            </p>
            <p className="text-3xl font-bold text-text-primary">
              <span style={{ color: '#D97706' }}>&#10022;</span> {balance.toLocaleString()}
            </p>
            <p className="text-sm mt-1" style={{ color: '#92400E' }}>
              ${dollarValue} value &middot; Expires {endOfYear}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-sm font-medium" style={{ color: '#C94F78' }}>
              Giveaway Entries
            </p>
            <p className="text-2xl font-bold" style={{ color: '#C94F78' }}>
              {giveawayEntries}
            </p>
            <p className="text-xs text-text-secondary">this month</p>
          </div>
        </div>
      </div>

      {/* Redemption Tiers */}
      <h2 className="text-xl font-bold text-text-primary mb-4">Redeem Credits</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {Object.entries(REDEMPTION_TIERS).map(([key, tier]) => {
          const canRedeem = balance >= tier.credits;
          const creditsNeeded = tier.credits - balance;
          return (
            <div key={key} className="glow-card p-4 flex flex-col">
              <div className="flex-1">
                <p className="text-sm font-semibold text-text-primary mb-1">
                  {tier.label}
                </p>
                <p className="text-lg font-bold mb-1" style={{ color: '#D97706' }}>
                  <span>&#10022;</span> {tier.credits.toLocaleString()}
                </p>
                {tier.value && (
                  <p className="text-xs text-text-secondary">
                    ${(tier.value / 100).toFixed(0)} value
                  </p>
                )}
              </div>
              <div className="mt-3">
                {canRedeem ? (
                  <button
                    onClick={() => setRedeemModal(key)}
                    className="w-full py-2 text-sm font-semibold text-white rounded-full transition"
                    style={{ background: '#D97706' }}
                  >
                    Redeem
                  </button>
                ) : (
                  <p className="text-xs text-text-secondary text-center">
                    {creditsNeeded.toLocaleString()} more credits needed
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* GlowRewards Directory (for treatment credit tier) */}
      {balance >= REDEMPTION_TIERS.treatment_credit.credits && (
        <div className="mb-8">
          <button
            onClick={() => setShowDirectory(!showDirectory)}
            className="flex items-center gap-2 text-sm font-semibold mb-3"
            style={{ color: '#D97706' }}
          >
            {showDirectory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showDirectory ? 'Hide' : 'Show'} GlowRewards Providers Near You
          </button>
          {showDirectory && (
            <GlowRewardsDirectory city={userCity} state={userState} />
          )}
        </div>
      )}

      {/* Credit History */}
      <h2 className="text-xl font-bold text-text-primary mb-4">Credit History</h2>
      {history.length === 0 ? (
        <div className="glow-card p-6 text-center mb-8">
          <p className="text-text-secondary mb-3">No credits yet — share a price to start earning.</p>
          <Link
            to="/log"
            className="text-sm font-medium text-rose-accent hover:text-rose-dark transition"
          >
            Share a price to start earning
          </Link>
        </div>
      ) : (
        <div className="glow-card divide-y divide-gray-100 mb-8">
          {history.map((row) => {
            const isPositive = row.amount > 0;
            return (
              <div key={row.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      background: isPositive ? '#FEF3C7' : '#FEE2E2',
                      color: isPositive ? '#D97706' : '#DC2626',
                    }}
                  >
                    {TYPE_ICONS[row.type] || '~'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm text-text-primary truncate">{row.description}</p>
                    <p className="text-xs text-text-secondary">
                      {new Date(row.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <span
                  className="text-sm font-semibold shrink-0 ml-3"
                  style={{ color: isPositive ? '#16A34A' : '#DC2626' }}
                >
                  {isPositive ? '+' : ''}{row.amount}
                </span>
              </div>
            );
          })}
          {hasMore && (
            <div className="px-4 py-3 text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="text-sm font-medium text-rose-accent hover:text-rose-dark transition"
              >
                {loadingMore ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Earning Guide */}
      <div className="mb-8">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-2 text-lg font-bold text-text-primary mb-3"
        >
          How to Earn Credits
          {showGuide ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {showGuide && (
          <div className="glow-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-warm-gray">
                  <th className="text-left px-4 py-2.5 font-medium text-text-secondary">Action</th>
                  <th className="text-right px-4 py-2.5 font-medium text-text-secondary">Credits</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  ['Share a price', CREDIT_VALUES.base_submission],
                  ['Leave a rating', CREDIT_VALUES.rating],
                  ['Write a review', CREDIT_VALUES.review],
                  ['Upload a verified receipt', CREDIT_VALUES.receipt_verified],
                  ['Upload a result photo', CREDIT_VALUES.result_photo],
                  ['Pioneer bonus (first at a provider)', CREDIT_VALUES.pioneer_bonus],
                  ['Refer a friend', CREDIT_VALUES.referral],
                  ['Daily login streak (day 3+)', CREDIT_VALUES.login_streak_daily],
                  ['Confirm price freshness', CREDIT_VALUES.freshness],
                  ['Win a dispute', CREDIT_VALUES.dispute_defended],
                ].map(([action, credits]) => (
                  <tr key={action}>
                    <td className="px-4 py-2.5 text-text-primary">{action}</td>
                    <td className="px-4 py-2.5 text-right font-semibold" style={{ color: '#D97706' }}>
                      +{credits}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Redemption Modal */}
      {redeemModal && (
        <RedemptionModal
          tier={redeemModal}
          userId={user.id}
          onClose={() => setRedeemModal(null)}
          onSuccess={handleRedeemSuccess}
        />
      )}
    </div>
  );
}

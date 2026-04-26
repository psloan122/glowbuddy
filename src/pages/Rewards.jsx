import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Gift, Star, Shield } from 'lucide-react';
import { AuthContext } from '../App';
import { supabase } from '../lib/supabase';

// Set to true and add official sweepstakes rules before re-enabling the giveaway UI.
const GIVEAWAY_ACTIVE = false;

export default function Rewards() {
  const { user, openAuthModal } = useContext(AuthContext);

  const [submissionCount, setSubmissionCount] = useState(0);
  const [giveawayEntries, setGiveawayEntries] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'My Rewards | Know Before You Glow';
  }, []);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadData();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadData() {
    setLoading(true);

    const month = new Date().toISOString().slice(0, 7);

    // Submission count this month
    const { count } = await supabase
      .from('procedures')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', `${month}-01`);
    setSubmissionCount(count || 0);

    // Giveaway entries — only fetched when giveaway is active
    if (GIVEAWAY_ACTIVE) {
      const { data: entries } = await supabase
        .from('giveaway_entries')
        .select('entries')
        .eq('user_id', user.id)
        .eq('month', month);
      const total = (entries || []).reduce((s, e) => s + (e.entries || 0), 0);
      setGiveawayEntries(total);
    }

    setLoading(false);
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="glow-card p-8">
          <h1 className="text-2xl font-bold text-text-primary mb-2">My Rewards</h1>
          <p className="text-text-secondary mb-6">
            Sign in to see your contributions and badges.
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-text-primary mb-6">My Rewards</h1>

      {/* Your Contributions Header */}
      <div className="glow-card p-6 mb-6" style={{ background: 'linear-gradient(135deg, #FBE8EF, #FCE7F3)' }}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full" style={{ background: 'rgba(201, 79, 120, 0.1)' }}>
            <Trophy className="w-8 h-8 text-rose-accent" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-secondary mb-1">
              Your Contributions
            </p>
            <p className="text-3xl font-bold" style={{ color: '#C94F78' }}>
              {submissionCount}
            </p>
            <p className="text-xs text-text-secondary mt-1">
              You've shared {submissionCount} {submissionCount === 1 ? 'price' : 'prices'} this month
            </p>
          </div>
        </div>
      </div>

      {/* Giveaway section — hidden until official rules are in place */}
      {GIVEAWAY_ACTIVE && (
        <>
          {/* Giveaway Entries Header */}
          <div className="glow-card p-6 mb-6" style={{ background: 'linear-gradient(135deg, #FBE8EF, #FCE7F3)' }}>
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full" style={{ background: 'rgba(201, 79, 120, 0.1)' }}>
                <Gift className="w-8 h-8 text-rose-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-text-secondary mb-1">
                  Monthly Giveaway Entries
                </p>
                <p className="text-3xl font-bold" style={{ color: '#C94F78' }}>
                  {giveawayEntries}
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  Drawing for a $250 treatment &middot; {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          {/* How to Earn Entries */}
          <h2 className="text-xl font-bold text-text-primary mb-4">How to Earn Entries</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="glow-card p-4">
              <div className="flex items-start gap-3">
                <Star className="w-5 h-5 text-rose-accent shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">Share a price</p>
                  <p className="text-xs text-text-secondary">1 entry per submission</p>
                </div>
              </div>
            </div>
            <div className="glow-card p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-rose-accent shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">Upload a receipt</p>
                  <p className="text-xs text-text-secondary">3x more entries</p>
                </div>
              </div>
            </div>
            <div className="glow-card p-4">
              <div className="flex items-start gap-3">
                <Gift className="w-5 h-5 text-rose-accent shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">Leave a rating or review</p>
                  <p className="text-xs text-text-secondary">+1 entry each</p>
                </div>
              </div>
            </div>
            <div className="glow-card p-4">
              <div className="flex items-start gap-3">
                <Trophy className="w-5 h-5 text-rose-accent shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">Be a Pioneer</p>
                  <p className="text-xs text-text-secondary">First to report at a provider = Pioneer status</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* CTA */}
      <div className="glow-card p-6 text-center">
        <p className="text-text-secondary mb-4">
          Every price you share helps others make informed decisions.
        </p>
        <Link
          to="/log"
          className="inline-flex items-center gap-2 px-6 py-3 bg-rose-accent text-white font-semibold rounded-xl hover:bg-rose-dark transition-colors"
        >
          Share a Price
        </Link>
      </div>
    </div>
  );
}

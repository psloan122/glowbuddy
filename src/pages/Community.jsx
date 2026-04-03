import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Gift } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabase';
import { BADGE_DEFINITIONS, procedureToSlug } from '../lib/constants';

export default function Community() {
  const [loading, setLoading] = useState(true);
  const [topContributors, setTopContributors] = useState([]);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [badgeCounts, setBadgeCounts] = useState({});

  useEffect(() => {
    document.title = 'Community & Badges | GlowBuddy';
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // Fetch all active procedures with user_id for contributor leaderboard
      const { data: allProcs } = await supabase
        .from('procedures')
        .select('user_id')
        .eq('status', 'active')
        .not('user_id', 'is', null);

      // Group by user_id and count
      const userCounts = {};
      if (allProcs) {
        allProcs.forEach((row) => {
          if (!row.user_id) return;
          userCounts[row.user_id] = (userCounts[row.user_id] || 0) + 1;
        });
      }

      const contributors = Object.entries(userCounts)
        .map(([userId, count]) => ({ userId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);
      setTopContributors(contributors);

      // Fetch recent submissions
      const { data: recent } = await supabase
        .from('procedures')
        .select('id, procedure_type, city, state, price_paid, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);
      setRecentSubmissions(recent || []);

      // Fetch all user_badges for badge counts
      const { data: badges } = await supabase
        .from('user_badges')
        .select('badge_type');

      const counts = {};
      if (badges) {
        badges.forEach((row) => {
          counts[row.badge_type] = (counts[row.badge_type] || 0) + 1;
        });
      }
      setBadgeCounts(counts);

      setLoading(false);
    }

    fetchData();
  }, []);

  // Determine which badges a contributor has earned based on their submission count
  function getBadgesForCount(count) {
    const earned = [];
    Object.entries(BADGE_DEFINITIONS).forEach(([key, badge]) => {
      if (count >= badge.threshold) {
        earned.push(badge);
      }
    });
    return earned;
  }

  const rankBorderClass = (rank) => {
    if (rank === 1) return 'border-l-4 border-l-yellow-400';
    if (rank === 2) return 'border-l-4 border-l-gray-400';
    if (rank === 3) return 'border-l-4 border-l-amber-600';
    return '';
  };

  const rankTextClass = (rank) => {
    if (rank === 1) return 'text-yellow-500 font-bold';
    if (rank === 2) return 'text-gray-400 font-bold';
    if (rank === 3) return 'text-amber-600 font-bold';
    return 'text-text-secondary';
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <p className="text-center text-text-secondary animate-pulse text-lg">
          Loading community...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-extrabold text-text-primary mb-10">
        GlowBuddy Community
      </h1>

      {/* Monthly Giveaway Banner */}
      <div className="glow-card p-6 mb-8 bg-gradient-to-r from-rose-light to-warm-white">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex-shrink-0 bg-rose-accent/10 p-3 rounded-full">
            <Gift size={32} className="text-rose-accent" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-text-primary mb-1">
              Monthly $250 Treatment Giveaway
            </h2>
            <p className="text-text-secondary">
              Submit a price and enter your email for a chance to win $250 toward
              your next treatment. Winner announced monthly.
            </p>
          </div>
          <Link
            to="/log"
            className="inline-block bg-rose-accent text-white px-6 py-3 rounded-full font-semibold hover:bg-rose-dark transition whitespace-nowrap"
          >
            Log a Treatment to Enter
          </Link>
        </div>
      </div>

      {/* Badge Showcase */}
      <div className="glow-card p-6 mb-8">
        <h2 className="text-2xl font-bold text-text-primary mb-6">Earn Badges</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(BADGE_DEFINITIONS).map(([key, badge]) => (
            <div
              key={key}
              className="bg-warm-gray rounded-xl p-6 text-center"
            >
              <div className="text-5xl mb-3">{badge.emoji}</div>
              <h3 className="text-lg font-bold text-text-primary mb-1">
                {badge.label}
              </h3>
              <p className="text-sm text-text-secondary mb-3">
                {badge.description}
              </p>
              <p className="text-xs text-text-secondary">
                {badgeCounts[key] || 0} {badgeCounts[key] === 1 ? 'user' : 'users'} earned
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Top Contributors Leaderboard */}
      <div className="glow-card p-6 mb-8">
        <h2 className="text-2xl font-bold text-text-primary mb-6">
          Top Contributors
        </h2>
        {topContributors.length > 0 ? (
          <div className="space-y-2">
            {topContributors.map((contributor, index) => {
              const rank = index + 1;
              const badges = getBadgesForCount(contributor.count);
              return (
                <div
                  key={contributor.userId}
                  className={`flex items-center justify-between py-3 px-4 rounded-lg bg-warm-gray ${rankBorderClass(rank)}`}
                >
                  <div className="flex items-center gap-4">
                    <span className={`text-lg w-8 text-center ${rankTextClass(rank)}`}>
                      #{rank}
                    </span>
                    <span className="text-text-primary font-medium">
                      Contributor #{rank}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-text-secondary">
                      {contributor.count} {contributor.count === 1 ? 'submission' : 'submissions'}
                    </span>
                    <span className="text-lg">
                      {badges.map((b) => b.emoji).join(' ')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-text-secondary text-center py-8">
            Be the first to contribute!
          </p>
        )}
      </div>

      {/* Recent Activity Feed */}
      <div className="glow-card p-6">
        <h2 className="text-2xl font-bold text-text-primary mb-6">
          Recent Submissions
        </h2>
        {recentSubmissions.length > 0 ? (
          <div className="space-y-3">
            {recentSubmissions.map((proc) => (
              <Link
                key={proc.id}
                to={`/procedure/${procedureToSlug(proc.procedure_type)}`}
                className="flex items-center justify-between py-3 px-4 rounded-lg bg-warm-gray hover:bg-rose-light/30 transition group"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-text-primary font-medium group-hover:text-rose-dark transition-colors">
                    {proc.procedure_type}
                  </span>
                  {proc.city && proc.state && (
                    <span className="text-text-secondary">
                      {' '}in {proc.city}, {proc.state}
                    </span>
                  )}
                  <span className="text-text-primary font-semibold">
                    {' '}&mdash; ${Number(proc.price_paid).toLocaleString()}
                  </span>
                </div>
                <span className="text-xs text-text-secondary ml-4 whitespace-nowrap">
                  {proc.created_at
                    ? formatDistanceToNow(new Date(proc.created_at), {
                        addSuffix: true,
                      })
                    : ''}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-text-secondary text-center py-8">
            No submissions yet.
          </p>
        )}
      </div>
    </div>
  );
}

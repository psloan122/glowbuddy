import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Gift } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabase';
import { BADGE_DEFINITIONS, procedureToSlug } from '../lib/constants';
import { AuthContext } from '../App';
import PioneerLeaderboard from '../components/PioneerLeaderboard';

const BADGE_ICONS = {
  glowgetter: {
    gradient: ['#F4A7B9', '#E8818F'],
    path: 'M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6L12 2z',
  },
  price_pioneer: {
    gradient: ['#C9B8E8', '#A78BCA'],
    path: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm-1-13h2v5h3l-4 4-4-4h3V8z',
  },
  club_100: {
    gradient: ['#E8D4A0', '#D4BC78'],
    path: 'M6 9l6-6 6 6M6 15l6 6 6-6',
  },
  location_pioneer: {
    gradient: ['#F5D77B', '#DAA520'],
    path: 'M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6L12 2z',
  },
};

function BadgeIcon({ type }) {
  const icon = BADGE_ICONS[type];
  if (!icon) return null;
  const [c1, c2] = icon.gradient;
  const gradId = `badge-${type}`;
  return (
    <div className="badge-icon" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
      <svg width={24} height={24} viewBox="0 0 24 24" aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.9" />
            <stop offset="100%" stopColor="white" />
          </linearGradient>
        </defs>
        <path d={icon.path} fill={`url(#${gradId})`} stroke="white" strokeWidth="0.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default function Community() {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [topContributors, setTopContributors] = useState([]);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [badgeCounts, setBadgeCounts] = useState({});
  const [userCity, setUserCity] = useState('');
  const [userState, setUserState] = useState('');

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

      // Fetch user's city/state from their most recent submission
      if (user?.id) {
        const { data: recentProc } = await supabase
          .from('procedures')
          .select('city, state')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1);
        if (recentProc && recentProc.length > 0) {
          setUserCity(recentProc[0].city || '');
          setUserState(recentProc[0].state || '');
        }
      }

      setLoading(false);
    }

    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Determine which badges a contributor has earned based on their submission count
  function getBadgesForCount(count) {
    const earned = [];
    Object.entries(BADGE_DEFINITIONS).forEach(([key, badge]) => {
      if (badge.threshold != null && count >= badge.threshold) {
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
              Share what you paid to automatically enter our monthly $250 giveaway.
              One winner announced the first of each month.
            </p>
          </div>
          <Link
            to="/log"
            className="inline-block bg-rose-accent text-white px-6 py-3 rounded-full font-semibold hover:bg-rose-dark transition whitespace-nowrap"
          >
            Share a Price to Enter
          </Link>
        </div>
      </div>

      {/* Pioneer Giveaway Banner */}
      <div
        className="glow-card p-6 mb-8"
        style={{ background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)' }}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex-shrink-0 p-3 rounded-full" style={{ background: 'rgba(180, 83, 9, 0.1)' }}>
            <span className="text-3xl" role="img" aria-label="Pioneer">🏅</span>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-text-primary mb-1">
              Pioneer Giveaway &mdash; $200/month
            </h2>
            <p style={{ color: '#92400E' }}>
              Be the first to share a price at a new location &mdash; every pioneer earns bonus entries.
            </p>
          </div>
          <Link
            to="/map"
            className="inline-block text-white px-6 py-3 rounded-full font-semibold hover:opacity-90 transition whitespace-nowrap"
            style={{ background: '#B45309' }}
          >
            Find Unclaimed Locations
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
              <div className="flex justify-center mb-3">
                <BadgeIcon type={key} />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-1">
                {badge.label}
              </h3>
              <p className="text-sm text-text-secondary mb-3">
                {badge.description}
              </p>
              {badgeCounts[key] > 0 && (
                <p className="text-xs text-text-secondary">
                  {badgeCounts[key]} {badgeCounts[key] === 1 ? 'user' : 'users'} earned
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pioneer Leaderboard */}
      <PioneerLeaderboard userCity={userCity} userState={userState} />

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
                    <div className="flex items-center gap-1">
                      {badges.map((b) => {
                        const key = Object.entries(BADGE_DEFINITIONS).find(([, v]) => v === b)?.[0];
                        return key ? <BadgeIcon key={key} type={key} /> : null;
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-text-secondary text-center py-8">
            No contributions yet. Be the first to share what you paid!
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

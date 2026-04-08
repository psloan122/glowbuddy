import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Award } from 'lucide-react';
import { getPioneerLeaderboard, getUnverifiedLocationCount } from '../lib/pioneerLogic';

export default function PioneerLeaderboard({ userCity, userState }) {
  const [leaders, setLeaders] = useState([]);
  const [unclaimedCount, setUnclaimedCount] = useState(0);
  const [scope, setScope] = useState('city'); // 'city' or 'global'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const isCity = scope === 'city' && userCity && userState;
      const [lb, uc] = await Promise.all([
        getPioneerLeaderboard(
          isCity ? userCity : null,
          isCity ? userState : null,
          20
        ),
        getUnverifiedLocationCount(
          isCity ? userCity : null,
          isCity ? userState : null
        ),
      ]);
      setLeaders(lb);
      setUnclaimedCount(uc);
      setLoading(false);
    }
    fetchData();
  }, [scope, userCity, userState]);

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

  return (
    <div className="glow-card p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-text-primary">
          Pioneer Leaderboard
        </h2>
        {userCity && (
          <div className="flex items-center gap-1 bg-warm-gray rounded-lg p-0.5">
            <button
              onClick={() => setScope('city')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                scope === 'city'
                  ? 'bg-white text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {userCity}
            </button>
            <button
              onClick={() => setScope('global')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                scope === 'global'
                  ? 'bg-white text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Global
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-text-secondary text-center py-4 animate-pulse">
          Loading pioneers...
        </p>
      ) : leaders.length > 0 ? (
        <div className="space-y-2">
          {leaders.map((leader, index) => {
            const rank = index + 1;
            return (
              <div
                key={leader.user_id}
                className={`flex items-center justify-between py-3 px-4 rounded-lg bg-warm-gray ${rankBorderClass(rank)}`}
              >
                <div className="flex items-center gap-4">
                  <span className={`text-lg w-8 text-center ${rankTextClass(rank)}`}>
                    #{rank}
                  </span>
                  <span className="text-text-primary font-medium">
                    {leader.display_name || `Pioneer #${rank}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-secondary">
                    {leader.location_count} location{leader.location_count !== 1 ? 's' : ''}
                  </span>
                  <Award size={14} style={{ color: '#B45309' }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-text-secondary text-center py-4">
          No pioneers yet{scope === 'city' && userCity ? ` in ${userCity}` : ''}. Share a price at a new location to be first!
        </p>
      )}

      {unclaimedCount > 0 && (
        <Link
          to="/browse"
          className="block mt-4 p-3 rounded-lg text-center text-sm font-medium transition-colors"
          style={{ background: 'rgba(251, 191, 36, 0.08)', color: '#B45309' }}
        >
          Share a price at{' '}
          <strong>{unclaimedCount} unclaimed location{unclaimedCount !== 1 ? 's' : ''}</strong>
          {scope === 'city' && userCity ? ` near you` : ''} →
        </Link>
      )}
    </div>
  );
}

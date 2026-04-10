import { useState, useEffect } from 'react';
import { Award } from 'lucide-react';
import { getUserPioneerStats } from '../lib/pioneerLogic';

export default function PioneerBadge({ userId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    getUserPioneerStats(userId).then((data) => {
      setStats(data);
      setLoading(false);
    });
  }, [userId]);

  if (loading || !stats) return null;

  // Find top city
  const topCity = Object.entries(stats.byCity).sort((a, b) => b[1] - a[1])[0];
  const cityName = topCity ? topCity[0] : null;

  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
      style={{ background: 'rgba(251, 191, 36, 0.08)', color: '#B45309' }}
    >
      <Award size={12} />
      <span>
        Pioneer{cityName ? ` · ${cityName}` : ''} · {stats.totalLocations} location{stats.totalLocations !== 1 ? 's' : ''}
      </span>
    </div>
  );
}

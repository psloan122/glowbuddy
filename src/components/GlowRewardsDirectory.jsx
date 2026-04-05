import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getGlowRewardsProviders } from '../lib/creditLogic';

export default function GlowRewardsDirectory({ city, state }) {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGlowRewardsProviders(city, state).then((data) => {
      setProviders(data);
      setLoading(false);
    });
  }, [city, state]);

  if (loading) {
    return (
      <div className="text-center py-8 text-text-secondary animate-pulse">
        Loading GlowRewards providers...
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <div className="glow-card p-6 text-center">
        <p className="text-text-secondary">
          No GlowRewards providers near you yet
        </p>
        <p className="text-xs text-text-secondary mt-1">
          Check back soon — more providers are joining every week.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {providers.map((p) => (
        <Link
          key={p.id}
          to={`/provider/${p.slug}`}
          className="glow-card p-4 hover:shadow-md transition group"
        >
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-text-primary group-hover:text-rose-accent transition">
                {p.name}
              </h4>
              <p className="text-xs text-text-secondary">
                {p.city}, {p.state}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: '#FEF3C7', color: '#92400E' }}
            >
              <span style={{ color: '#D97706' }}>&#10022;</span>
              GlowRewards
            </span>
          </div>
          <div className="mt-3 text-sm">
            <span className="text-text-secondary">Monthly cap remaining: </span>
            <span className="font-medium text-text-primary">
              ${((p.remainingCap || 0) / 100).toFixed(0)}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

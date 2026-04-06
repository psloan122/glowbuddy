import { Link } from 'react-router-dom';
import ProcedureCard from '../ProcedureCard';
import { CardGridSkeleton } from './DashboardSkeleton';

export default function PricesNearYou({ procedures, city, state, loading }) {
  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text-primary">Recent prices nearby</h2>
        </div>
        <CardGridSkeleton count={4} />
      </div>
    );
  }

  const browseUrl = city && state
    ? `/browse?city=${encodeURIComponent(city)}&state=${encodeURIComponent(state)}`
    : '/browse';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-text-primary">
          {city ? `Recent prices in ${city}` : 'Recent prices nearby'}
        </h2>
        <Link
          to={browseUrl}
          className="text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
        >
          See all &rarr;
        </Link>
      </div>

      {(!procedures || procedures.length === 0) ? (
        <div className="glow-card p-6 text-center">
          <p className="text-sm text-text-secondary mb-3">
            {city
              ? `No prices in ${city} yet. You could be the first.`
              : 'Set your location to see prices near you.'}
          </p>
          <Link
            to="/log"
            className="text-sm font-semibold text-rose-accent hover:text-rose-dark transition-colors"
          >
            Share what you paid &rarr;
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {procedures.slice(0, 4).map((proc) => (
            <ProcedureCard key={proc.id} procedure={proc} />
          ))}
        </div>
      )}
    </div>
  );
}

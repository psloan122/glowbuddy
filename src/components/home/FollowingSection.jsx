import { Link } from 'react-router-dom';
import ProviderAvatar from '../ProviderAvatar';
import { Star } from 'lucide-react';

export default function FollowingSection({ follows, loading }) {
  if (loading || !follows || follows.length === 0) return null;

  return (
    <div className="glow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-text-primary">Providers You Follow</h2>
        <Link
          to="/following"
          className="text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
        >
          Manage &rarr;
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
        {follows.map((f) => (
          <FollowCard key={f.id} follow={f} />
        ))}
      </div>
    </div>
  );
}

function FollowCard({ follow }) {
  const injector = follow.injectors || {};
  const provider = injector.providers || {};
  const name = injector.display_name || injector.name || 'Unknown';
  const city = provider.city || injector.city || '';
  const rating = injector.avg_rating || null;
  const slug = injector.slug || injector.id;

  return (
    <Link
      to={`/injectors/${slug}`}
      className="shrink-0 w-[160px] glow-card p-3 hover:shadow-md transition-shadow text-center"
    >
      <div className="flex justify-center mb-2">
        <ProviderAvatar name={name} size={40} />
      </div>
      <p className="text-sm font-semibold text-text-primary truncate">{name}</p>
      {city && <p className="text-[11px] text-text-secondary truncate">{city}</p>}
      {rating && (
        <div className="flex items-center justify-center gap-0.5 mt-1">
          <Star size={11} className="text-amber-400 fill-amber-400" />
          <span className="text-[11px] text-text-secondary">{rating.toFixed(1)}</span>
        </div>
      )}
      <span className="text-[11px] font-medium text-rose-accent mt-1.5 block">View &rarr;</span>
    </Link>
  );
}

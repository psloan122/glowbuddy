import { Link } from 'react-router-dom';
import { BadgeCheck, Users, Star } from 'lucide-react';

const CREDENTIAL_COLORS = {
  RN: { bg: '#DBEAFE', color: '#1D4ED8' },
  NP: { bg: '#E0E7FF', color: '#4338CA' },
  PA: { bg: '#EDE9FE', color: '#6D28D9' },
  MD: { bg: '#D1FAE5', color: '#065F46' },
  DO: { bg: '#D1FAE5', color: '#065F46' },
};

export default function InjectorCard({ injector, compact = false, onClick, reviewCount = 0 }) {
  const cred = injector.credentials?.toUpperCase();
  const credStyle = CREDENTIAL_COLORS[cred] || { bg: '#F3F4F6', color: '#6B7280' };
  const displayName = injector.display_name || injector.name;
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const content = (
    <div className="flex items-center gap-3">
      {injector.profile_photo_url ? (
        <img
          src={injector.profile_photo_url}
          alt={displayName}
          className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} rounded-full object-cover`}
          loading="lazy"
        />
      ) : (
        <div
          className={`${compact ? 'w-10 h-10 text-sm' : 'w-12 h-12 text-base'} rounded-full bg-sky-100 text-[#0369A1] flex items-center justify-center font-semibold`}
        >
          {initials}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-text-primary truncate group-hover:text-[#0369A1] transition">
            {displayName}
          </span>
          {injector.is_verified && (
            <BadgeCheck size={14} className="text-[#0369A1] shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {cred && (
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{ backgroundColor: credStyle.bg, color: credStyle.color }}
            >
              {cred}
            </span>
          )}
          {injector.specialties?.length > 0 && injector.specialties.slice(0, 3).map((spec) => (
            <span key={spec} className="text-[10px] bg-rose-light text-rose-dark px-1.5 py-0.5 rounded-full">
              {spec}
            </span>
          ))}
          {reviewCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
              <Star size={10} className="text-amber-400 fill-amber-400" />
              {reviewCount} review{reviewCount !== 1 ? 's' : ''}
            </span>
          )}
          {!compact && !reviewCount && injector.follower_count > 0 && (
            <span className="text-xs text-text-secondary flex items-center gap-0.5">
              <Users size={10} />
              {injector.follower_count}
            </span>
          )}
        </div>
        {injector.instagram && (
          <a
            href={`https://instagram.com/${injector.instagram.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-[#0369A1] hover:text-sky-800 transition-colors mt-0.5 inline-block"
          >
            @{injector.instagram.replace('@', '')}
          </a>
        )}
      </div>
    </div>
  );

  // If onClick is provided (legacy OverviewTab usage), render as a div
  if (onClick) {
    return (
      <div
        onClick={() => onClick(injector)}
        className={`glow-card ${compact ? 'p-3' : 'p-4'} cursor-pointer hover:shadow-md transition group`}
      >
        {content}
      </div>
    );
  }

  // Default: link to injector profile
  return (
    <Link
      to={`/injectors/${injector.slug || injector.id}`}
      className={`glow-card ${compact ? 'p-3' : 'p-4'} hover:border-[#0369A1]/30 transition group block`}
    >
      {content}
    </Link>
  );
}

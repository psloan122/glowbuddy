import { Star } from 'lucide-react';
import ProviderAvatar from './ProviderAvatar';

export default function InjectorCard({ injector, onClick, reviewCount = 0 }) {
  return (
    <div
      onClick={() => onClick?.(injector)}
      className="glow-card p-4 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-3">
        {/* Profile photo or initials */}
        {injector.profile_photo_url ? (
          <img
            src={injector.profile_photo_url}
            alt={injector.name}
            className="w-12 h-12 rounded-full object-cover shrink-0"
          />
        ) : (
          <ProviderAvatar name={injector.name} size={48} />
        )}

        <div className="flex-1 min-w-0">
          {/* Name + credentials */}
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-text-primary truncate">
              {injector.name}
            </h4>
            {injector.credentials && (
              <span className="text-xs bg-warm-gray text-text-secondary px-1.5 py-0.5 rounded-full shrink-0">
                {injector.credentials}
              </span>
            )}
          </div>

          {/* Specialties */}
          {injector.specialties && injector.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {injector.specialties.slice(0, 3).map((spec) => (
                <span
                  key={spec}
                  className="text-[10px] bg-rose-light text-rose-dark px-1.5 py-0.5 rounded-full"
                >
                  {spec}
                </span>
              ))}
              {injector.specialties.length > 3 && (
                <span className="text-[10px] text-text-secondary">
                  +{injector.specialties.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Review count + Instagram */}
          <div className="flex items-center gap-3 mt-1.5">
            {reviewCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                <Star size={10} className="text-amber-400 fill-amber-400" />
                {reviewCount} review{reviewCount !== 1 ? 's' : ''}
              </span>
            )}
            {injector.instagram && (
              <a
                href={`https://instagram.com/${injector.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-rose-accent hover:text-rose-dark transition-colors"
              >
                @{injector.instagram.replace('@', '')}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

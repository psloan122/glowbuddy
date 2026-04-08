import { X } from 'lucide-react';
import ProviderAvatar from './ProviderAvatar';
import ReviewCard from './ReviewCard';
import BeforeAfterCard from './BeforeAfterCard';

export default function InjectorDetailModal({
  injector,
  provider,
  reviews = [],
  photos = [],
  onClose,
}) {
  const injectorReviews = reviews.filter(
    (r) => r.injector_id === injector.id
  );
  const injectorPhotos = photos.filter(
    (p) => p.injector_id === injector.id
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/40">
      <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 mt-16 shadow-xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-start gap-4">
            {injector.profile_photo_url ? (
              <img
                src={injector.profile_photo_url}
                alt={injector.name}
                className="w-16 h-16 rounded-full object-cover shrink-0"
                loading="lazy"
              />
            ) : (
              <ProviderAvatar name={injector.name} size={64} />
            )}
            <div>
              <h2 className="text-xl font-bold text-text-primary">
                {injector.name}
              </h2>
              {injector.credentials && (
                <span className="text-xs bg-warm-gray text-text-secondary px-2 py-0.5 rounded-full">
                  {injector.credentials}
                </span>
              )}
              {provider?.name && (
                <p className="text-sm text-text-secondary mt-1">
                  at {provider.name}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary shrink-0"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Bio */}
        {injector.bio && (
          <p className="text-sm text-text-secondary mb-4">{injector.bio}</p>
        )}

        {/* Details row */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {injector.years_experience && (
            <span className="text-xs bg-warm-gray text-text-secondary px-2 py-1 rounded-full">
              {injector.years_experience} years experience
            </span>
          )}
          {injector.instagram && (
            <a
              href={`https://instagram.com/${injector.instagram.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-rose-accent hover:text-rose-dark transition-colors"
            >
              @{injector.instagram.replace('@', '')}
            </a>
          )}
        </div>

        {/* Specialties */}
        {injector.specialties && injector.specialties.length > 0 && (
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-text-primary mb-2">
              Specialties
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {injector.specialties.map((spec) => (
                <span
                  key={spec}
                  className="text-xs bg-rose-light text-rose-dark px-2 py-0.5 rounded-full"
                >
                  {spec}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Before & Afters */}
        {injectorPhotos.length > 0 && (
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-text-primary mb-2">
              Before & After Photos
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {injectorPhotos.slice(0, 4).map((photo) => (
                <BeforeAfterCard key={photo.id} photo={photo} />
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        {injectorReviews.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">
              Reviews ({injectorReviews.length})
            </h3>
            <div className="space-y-3">
              {injectorReviews.slice(0, 5).map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          </div>
        )}

        {injectorReviews.length === 0 && injectorPhotos.length === 0 && (
          <p className="text-sm text-text-secondary text-center py-4">
            No reviews or photos for this injector yet.
          </p>
        )}
      </div>
    </div>
  );
}

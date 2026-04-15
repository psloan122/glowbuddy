import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Flag } from 'lucide-react';
import SpecialCard from '../SpecialCard';
import InjectorCard from '../InjectorCard';
import InjectorDetailModal from '../InjectorDetailModal';
import ReviewCard from '../ReviewCard';
import ProcedureCard from '../ProcedureCard';
import ProviderPriceSummary from '../ProviderPriceSummary';

export default function OverviewTab({
  provider,
  providerPhotos,
  specials,
  injectors,
  reviews,
  baPhotos,
  communityData,
  verifiedPricing,
  isProviderOwner,
  user,
  onDisputeTarget,
  onSwitchTab,
}) {
  const [selectedInjector, setSelectedInjector] = useState(null);

  const hasGoogleAttribution = providerPhotos.some((p) => p.source === 'google');

  // Quick stats
  const avgPatientPrice =
    communityData.length > 0
      ? Math.round(
          communityData.reduce((sum, p) => sum + (p.price_paid || 0), 0) /
            communityData.length
        )
      : null;

  const wouldReturnPct =
    reviews.length > 0
      ? Math.round(
          (reviews.filter((r) => r.would_return).length / reviews.length) * 100
        )
      : null;

  // Most reviewed procedure
  const procCounts = {};
  reviews.forEach((r) => {
    if (r.procedure_type) {
      procCounts[r.procedure_type] = (procCounts[r.procedure_type] || 0) + 1;
    }
  });
  const mostReviewed = Object.entries(procCounts).sort(
    (a, b) => b[1] - a[1]
  )[0];

  return (
    <div>
      {/* Photo Gallery */}
      {providerPhotos.length > 0 && (
        <div className="mb-6">
          <div className="hidden md:grid grid-cols-3 gap-3">
            {providerPhotos.map((photo) => (
              <img
                key={photo.id}
                src={photo.public_url}
                alt={provider?.name}
                className="w-full h-48 object-cover rounded-xl"
                loading="lazy"
              />
            ))}
          </div>
          <div className="md:hidden flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {providerPhotos.map((photo) => (
              <img
                key={photo.id}
                src={photo.public_url}
                alt={provider?.name}
                className="w-[200px] h-[140px] object-cover rounded-xl flex-shrink-0"
                loading="lazy"
              />
            ))}
          </div>
          {hasGoogleAttribution && (
            <p className="text-[10px] text-text-secondary/50 mt-1.5">
              Photos from Google &middot; Powered by Google
            </p>
          )}
        </div>
      )}

      {/* Claim banner */}
      {provider && !provider.is_claimed && (
        <div className="bg-gradient-to-r from-rose-light to-warm-gray border border-rose-accent/20 rounded-xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-text-primary">
              Is this your practice?
            </p>
            <p className="text-sm text-text-secondary">
              Claim this listing to manage your prices, post specials, and
              respond to patient submissions.
            </p>
          </div>
          <Link
            to={`/business/onboarding?place_id=${provider.google_place_id || ''}`}
            className="inline-flex items-center gap-1.5 bg-rose-accent text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:bg-rose-dark transition shrink-0"
          >
            Claim This Listing
          </Link>
        </div>
      )}

      {/* Active Specials */}
      {specials.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-text-primary mb-4">
            Current Specials
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {specials.map((special) => (
              <SpecialCard
                key={special.id}
                special={special}
                provider={provider}
              />
            ))}
          </div>
        </div>
      )}

      {/* Meet the Team */}
      {injectors.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-text-primary mb-4">
            Meet the Team
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {injectors.map((injector) => (
              <InjectorCard
                key={injector.id}
                injector={injector}
                onClick={setSelectedInjector}
                reviewCount={
                  reviews.filter((r) => r.injector_id === injector.id).length
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {(avgPatientPrice || reviews.length > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {avgPatientPrice && (
            <div className="glow-card p-4 text-center">
              <p className="text-2xl font-bold text-text-primary">
                ${avgPatientPrice}
              </p>
              <p className="text-xs text-text-secondary">Avg patient price</p>
            </div>
          )}
          {mostReviewed && (
            <div className="glow-card p-4 text-center">
              <p className="text-sm font-bold text-text-primary">
                {mostReviewed[0]}
              </p>
              <p className="text-xs text-text-secondary">
                Most reviewed ({mostReviewed[1]})
              </p>
            </div>
          )}
          {wouldReturnPct !== null && (
            <div className="glow-card p-4 text-center">
              <p className="text-2xl font-bold text-verified">
                {wouldReturnPct}%
              </p>
              <p className="text-xs text-text-secondary">Would return</p>
            </div>
          )}
        </div>
      )}

      {/* Recent Reviews Preview */}
      {reviews.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-text-primary">
              Recent Reviews
            </h2>
            <button
              onClick={() => onSwitchTab?.('Reviews')}
              className="text-sm text-rose-accent hover:text-rose-dark transition-colors font-medium"
            >
              See all reviews
            </button>
          </div>
          <div className="space-y-3">
            {reviews.slice(0, 3).map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </div>
        </div>
      )}

      {/* Verified Pricing Summary */}
      {verifiedPricing.length > 0 && provider?.slug && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-text-primary">
              Published Prices
            </h2>
            <button
              onClick={() => onSwitchTab?.('Prices')}
              className="text-sm text-rose-accent hover:text-rose-dark transition-colors font-medium"
            >
              See full menu
            </button>
          </div>
          <ProviderPriceSummary
            verifiedPricing={verifiedPricing}
            providerSlug={provider.slug}
          />
        </div>
      )}

      {/* Community Prices Preview */}
      {communityData.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-text-primary">
              Reported by patients
            </h2>
            <button
              onClick={() => onSwitchTab?.('Prices')}
              className="text-sm text-rose-accent hover:text-rose-dark transition-colors font-medium"
            >
              See all prices
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {communityData.slice(0, 4).map((procedure, index) => (
              <div key={procedure.id} className="relative">
                <ProcedureCard procedure={procedure} index={index} />
                {user && isProviderOwner && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDisputeTarget(procedure);
                    }}
                    className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 text-xs text-text-secondary bg-white/90 border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-rose-accent transition-colors z-10"
                    title="Flag this price"
                  >
                    <Flag size={12} />
                    Flag
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Injector Detail Modal */}
      {selectedInjector && (
        <InjectorDetailModal
          injector={selectedInjector}
          provider={provider}
          reviews={reviews}
          photos={baPhotos}
          onClose={() => setSelectedInjector(null)}
        />
      )}
    </div>
  );
}

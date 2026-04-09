import { useState } from 'react';
import { Check, Star } from 'lucide-react';

const TIERS = [
  {
    key: 'free',
    name: 'FREE',
    price: '$0',
    period: '/mo',
    features: [
      'Claim your listing',
      'Upload your price menu',
      'Basic profile page',
      'See monthly view count',
    ],
    buttonLabel: 'Start free',
    buttonStyle: 'secondary',
  },
  {
    key: 'verified',
    name: 'VERIFIED',
    price: '$99',
    period: '/mo',
    features: [
      'Everything in Free',
      'Demand intelligence — see patient price alerts',
      'Full analytics (30 day history)',
      'Post specials + notify matched patients',
      'Priority search placement',
      'Verified badge on listing',
    ],
    buttonLabel: 'Start for $99/mo',
    buttonStyle: 'primary',
  },
  {
    key: 'certified',
    name: 'CERTIFIED',
    price: '$299',
    period: '/mo',
    features: [
      'Everything in Verified',
      'Know Before You Glow Certified badge',
      'Competitor price comparison',
      'Featured on city price reports',
      '90 day analytics history',
      'Price alert targeting — reach all matching patients',
    ],
    buttonLabel: 'Start for $299/mo',
    buttonStyle: 'featured',
    featured: true,
  },
  {
    key: 'enterprise',
    name: 'ENTERPRISE',
    price: '$799',
    period: '/mo',
    features: [
      'Everything in Certified',
      'Multi-location (up to 20 locations)',
      'White-label monthly reports',
      'API access to price data',
      'Dedicated account manager',
    ],
    buttonLabel: 'Contact us',
    buttonStyle: 'outline',
  },
];

const TIER_BADGE_STYLE = {
  free:       { background: '#F3F4F6', color: '#4B5563' },
  verified:   { background: '#0F766E', color: '#fff' },
  certified:  { background: '#7C3AED', color: '#fff' },
  enterprise: { background: '#D4A017', color: '#fff' },
};

export default function Step5ChoosePlan({ profileData, menuCount, onComplete }) {
  const [selectedTier, setSelectedTier] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleContinue() {
    if (!selectedTier) return;
    setSubmitting(true);
    await onComplete(selectedTier);
    setSubmitting(false);
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-text-primary mb-2">Choose your plan</h1>
      <p className="text-text-secondary mb-8">
        Start free or unlock premium features to grow your practice.
      </p>

      {/* Profile preview card */}
      <div className="glow-card p-4 mb-8">
        <p className="text-xs text-text-secondary mb-2 font-medium">Your listing preview</p>
        <div className="flex items-center gap-3">
          {profileData.logo_url ? (
            <img
              src={profileData.logo_url}
              alt="Logo"
              className="w-12 h-12 rounded-xl object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-rose-light flex items-center justify-center">
              <span className="text-lg font-bold text-rose-accent">
                {(profileData.name || '?')[0].toUpperCase()}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-text-primary truncate">{profileData.name}</p>
              {selectedTier && (
                <span
                  className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap"
                  style={TIER_BADGE_STYLE[selectedTier] || TIER_BADGE_STYLE.free}
                >
                  {selectedTier}
                </span>
              )}
            </div>
            <p className="text-xs text-text-secondary">
              {profileData.city}{profileData.state ? `, ${profileData.state}` : ''}
              {menuCount > 0 && (
                <span className="ml-2 text-verified font-medium">
                  {menuCount} price{menuCount !== 1 ? 's' : ''} listed
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Plan cards — 4 columns on desktop, stack on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {TIERS.map((tier) => {
          const isSelected = selectedTier === tier.key;
          const isFeatured = tier.featured;

          return (
            <button
              key={tier.key}
              type="button"
              onClick={() => setSelectedTier(tier.key)}
              className={`glow-card p-5 text-left transition-all relative flex flex-col ${
                isSelected
                  ? 'ring-2 ring-rose-accent/30'
                  : 'hover:border-gray-300'
              }`}
              style={isFeatured ? { borderColor: '#C94F78', borderWidth: 2 } : isSelected ? { borderColor: '#C94F78' } : undefined}
            >
              {/* Most popular badge */}
              {isFeatured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-rose-accent text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1 whitespace-nowrap">
                  <Star size={10} /> Most popular
                </div>
              )}

              {/* Tier name + price */}
              <div className="mb-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                  {tier.name}
                </h3>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-2xl font-bold text-text-primary">{tier.price}</span>
                  <span className="text-sm text-text-secondary">{tier.period}</span>
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-[13px] text-text-secondary">
                    <Check
                      size={14}
                      className={`flex-shrink-0 mt-0.5 ${
                        isFeatured ? 'text-rose-accent' : 'text-verified'
                      }`}
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* Tier button indicator */}
              <div
                className={`mt-4 w-full py-2 rounded-full text-center text-sm font-semibold transition ${
                  tier.buttonStyle === 'secondary'
                    ? 'bg-gray-100 text-text-primary'
                    : tier.buttonStyle === 'outline'
                    ? 'border border-gray-300 text-text-primary'
                    : tier.buttonStyle === 'featured'
                    ? 'bg-rose-accent text-white'
                    : 'bg-rose-accent text-white'
                } ${isSelected ? 'opacity-100' : 'opacity-70'}`}
              >
                {tier.buttonLabel} &rarr;
              </div>
            </button>
          );
        })}
      </div>

      {/* CTA */}
      <div className="space-y-3">
        <button
          onClick={handleContinue}
          disabled={!selectedTier || submitting}
          className="w-full bg-rose-accent text-white py-3 rounded-full font-semibold hover:bg-rose-dark transition disabled:opacity-50"
        >
          {submitting
            ? 'Setting up your listing...'
            : selectedTier
            ? `Continue with ${TIERS.find((t) => t.key === selectedTier)?.name || selectedTier}`
            : 'Select a plan to continue'}
        </button>
        <p className="text-xs text-text-secondary text-center">
          You can upgrade or downgrade at any time from your dashboard.
        </p>
      </div>
    </div>
  );
}

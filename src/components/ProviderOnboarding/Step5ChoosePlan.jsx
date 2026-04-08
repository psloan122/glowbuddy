import { useState } from 'react';
import { Check, Star, Zap } from 'lucide-react';

const FREE_FEATURES = [
  'Claim your listing',
  'Upload your price menu',
  'Verified badge on your profile',
  'Flag inaccurate patient submissions',
];

const PRO_FEATURES = [
  'Everything in Free',
  'Post deals pushed to patients near you',
  'Featured placement above organic results',
  'Analytics — see who views your profile',
  'Priority dispute review — 24hr response',
  'Priority email support',
  'Monthly performance report — emailed to you',
];

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
            <p className="font-semibold text-text-primary truncate">{profileData.name}</p>
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

      {/* Plan cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* Free plan */}
        <button
          type="button"
          onClick={() => setSelectedTier('free')}
          className={`glow-card p-5 text-left transition-all ${
            selectedTier === 'free'
              ? 'border-rose-accent ring-2 ring-rose-accent/20'
              : 'hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-text-primary">Free</h3>
            <span className="text-sm font-medium text-text-secondary">$0/mo</span>
          </div>
          <ul className="space-y-2.5">
            {FREE_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-text-secondary">
                <Check size={16} className="text-verified flex-shrink-0 mt-0.5" />
                {feature}
              </li>
            ))}
          </ul>
        </button>

        {/* Pro plan */}
        <button
          type="button"
          onClick={() => setSelectedTier('pro')}
          className={`glow-card p-5 text-left transition-all relative ${
            selectedTier === 'pro'
              ? 'border-rose-accent ring-2 ring-rose-accent/20'
              : 'hover:border-gray-300'
          }`}
        >
          <div className="absolute -top-3 right-4 bg-rose-accent text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
            <Star size={12} /> Most Popular
          </div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-lg font-bold text-text-primary">Pro</h3>
            <span className="text-sm font-medium text-text-primary">$149/mo</span>
          </div>
          <p className="text-xs text-rose-accent font-medium mb-4 flex items-center gap-1">
            <Zap size={12} /> 30-day free trial — cancel anytime
          </p>
          <ul className="space-y-2.5">
            {PRO_FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-text-secondary">
                <Check size={16} className="text-rose-accent flex-shrink-0 mt-0.5" />
                {feature}
              </li>
            ))}
          </ul>
        </button>
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
            : selectedTier === 'pro'
            ? 'Start 30-day free trial'
            : selectedTier === 'free'
            ? 'Start with Free'
            : 'Select a plan to continue'}
        </button>
        <p className="text-xs text-text-secondary text-center">
          You can upgrade or downgrade at any time from your dashboard.
        </p>
      </div>
    </div>
  );
}

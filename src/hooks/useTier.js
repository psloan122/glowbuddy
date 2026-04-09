// useTier — single source of truth for what's gated to which subscription
// tier on the provider dashboard.
//
// Pass in the provider row from the `providers` table; get back a small
// helper object with boolean flags + a `can(feature)` lookup against the
// FEATURE_TIER_REQUIREMENTS map below.
//
// To add a new gated feature: add an entry to FEATURE_TIER_REQUIREMENTS,
// then call tierHelpers.can('your_feature') in the dashboard render.

const TIER_RANK = {
  free: 0,
  verified: 1,
  certified: 2,
  enterprise: 3,
};

const FEATURE_TIER_REQUIREMENTS = {
  demand_intel:        'verified',
  full_analytics:      'verified',
  specials_notify:     'verified',
  promoted_specials:   'verified',
  call_analytics:      'verified',
  compare_prices:      'certified',
  city_report_feature: 'certified',
  multi_location:      'enterprise',
  api_access:          'enterprise',
};

function rank(t) {
  return TIER_RANK[t] ?? 0;
}

export default function useTier(provider) {
  const tier = provider?.tier || 'free';
  const r = rank(tier);

  return {
    tier,
    isFree:       tier === 'free',
    isVerified:   tier === 'verified',
    isCertified:  tier === 'certified',
    isEnterprise: tier === 'enterprise',
    isPaid:       tier !== 'free',
    hasAtLeast(minTier) {
      return r >= rank(minTier);
    },
    can(feature) {
      const required = FEATURE_TIER_REQUIREMENTS[feature];
      if (!required) return true;
      return r >= rank(required);
    },
  };
}

export const TRUST_TIERS = {
  unverified: {
    weight: 0.6,
    label: 'Unverified visit',
    badge: null,
    color: 'gray',
  },
  has_photo: {
    weight: 0.8,
    label: 'Includes result photo',
    badge: 'camera',
    color: 'blue',
  },
  receipt_verified: {
    weight: 1.0,
    label: 'Verified purchase',
    badge: 'checkmark',
    color: 'green',
  },
  receipt_and_photo: {
    weight: 1.2,
    label: 'Verified with photos',
    badge: 'checkmark_camera',
    color: 'green',
  },
};

export function assignTrustTier(review) {
  if (review.receipt_verified && review.has_result_photo) {
    return { trust_tier: 'receipt_and_photo', trust_weight: 1.2 };
  }
  if (review.receipt_verified) {
    return { trust_tier: 'receipt_verified', trust_weight: 1.0 };
  }
  if (review.has_result_photo) {
    return { trust_tier: 'has_photo', trust_weight: 0.8 };
  }
  return { trust_tier: 'unverified', trust_weight: 0.6 };
}

export function calculateWeightedRating(reviews) {
  let totalWeight = 0;
  let weightedSum = 0;

  reviews.forEach((review) => {
    const w = review.trust_weight || TRUST_TIERS[review.trust_tier]?.weight || 0.6;
    weightedSum += review.rating * w;
    totalWeight += w;
  });

  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;
}

/**
 * Price freshness decay system.
 * Determines how fresh a patient-reported price submission is
 * based on the time since it was created (or last confirmed).
 */

export const FRESHNESS_TIERS = {
  FRESH: {
    key: 'fresh',
    label: 'Fresh',
    maxDays: 30,
    color: '#059669',
    bg: '#ECFDF5',
    showWarning: false,
  },
  RECENT: {
    key: 'recent',
    label: 'Recent',
    maxDays: 90,
    color: '#6B7280',
    bg: '#F3F4F6',
    showWarning: false,
  },
  GETTING_STALE: {
    key: 'getting_stale',
    label: 'Getting stale',
    maxDays: 180,
    color: '#D97706',
    bg: '#FFFBEB',
    showWarning: true,
  },
  STALE: {
    key: 'stale',
    label: 'Stale',
    maxDays: Infinity,
    color: '#DC2626',
    bg: '#FEF2F2',
    showWarning: true,
  },
};

/**
 * Returns freshness info for a patient-reported price submission.
 * Uses freshness_confirmed_at if available, otherwise falls back to created_at.
 *
 * @param {string|Date} submittedAt - created_at or freshness_confirmed_at timestamp
 * @returns {{ tier: object, label: string, color: string, bg: string, showWarning: boolean, daysOld: number } | null}
 */
export function getPriceFreshness(submittedAt) {
  if (!submittedAt) return null;

  const daysOld = Math.floor(
    (Date.now() - new Date(submittedAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  let tier;
  if (daysOld <= FRESHNESS_TIERS.FRESH.maxDays) {
    tier = FRESHNESS_TIERS.FRESH;
  } else if (daysOld <= FRESHNESS_TIERS.RECENT.maxDays) {
    tier = FRESHNESS_TIERS.RECENT;
  } else if (daysOld <= FRESHNESS_TIERS.GETTING_STALE.maxDays) {
    tier = FRESHNESS_TIERS.GETTING_STALE;
  } else {
    tier = FRESHNESS_TIERS.STALE;
  }

  return {
    tier,
    label: tier.label,
    color: tier.color,
    bg: tier.bg,
    showWarning: tier.showWarning,
    daysOld,
  };
}

/**
 * Returns a human-readable age string for a submission.
 * @param {number} daysOld
 * @returns {string}
 */
export function getFreshnessAge(daysOld) {
  if (daysOld < 1) return 'Today';
  if (daysOld === 1) return '1 day ago';
  if (daysOld < 30) return `${daysOld} days ago`;
  const months = Math.floor(daysOld / 30);
  if (months === 1) return '1 month ago';
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(months / 12);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

/**
 * Checks if a submission is stale (180+ days old).
 * @param {string|Date} submittedAt
 * @returns {boolean}
 */
export function isStale(submittedAt) {
  const freshness = getPriceFreshness(submittedAt);
  return freshness?.tier.key === 'stale';
}

/**
 * Calculates what percentage of submissions are stale.
 * @param {Array<{ created_at: string, freshness_confirmed_at?: string }>} submissions
 * @returns {number} 0-100
 */
export function getStalenessPercentage(submissions) {
  if (!submissions || submissions.length === 0) return 0;
  const staleCount = submissions.filter((s) =>
    isStale(s.freshness_confirmed_at || s.created_at)
  ).length;
  return Math.round((staleCount / submissions.length) * 100);
}

import { supabase } from './supabase';

export const ENTRY_VALUES = {
  base_submission: 1,
  receipt_upload: 2, // pending verification
  receipt_verified: 3, // after admin verifies (+1 bonus on approval)
  with_result_photo: 2,
  with_review: 1,
  first_submission: 2,
  fifth_submission: 3,
  tenth_submission: 5,
  referral_submission: 5,
  appointment_confirmed_bonus: 2,
  receipt_verified_bonus: 3,
  pioneer_early_reporter: 1,
  pioneer_verified: 3,
  pioneer_founding: 5,
};

const MAX_ENTRIES_PER_SUBMISSION = 12;

/**
 * Calculate entries synchronously given a known active count.
 */
export function calculateEntriesFromCount(
  activeCount,
  hasReceipt,
  hasRating = false,
  hasReview = false,
  hasResultPhoto = false,
  receiptVerified = false,
  verificationTier = null,
  pioneerTier = null
) {
  let entries = ENTRY_VALUES.base_submission;

  if (receiptVerified) {
    entries += ENTRY_VALUES.receipt_verified;
  } else if (hasReceipt) {
    entries += ENTRY_VALUES.receipt_upload;
  }

  if (hasResultPhoto) entries += ENTRY_VALUES.with_result_photo;
  if (hasRating) entries += 1;
  if (hasReview) entries += ENTRY_VALUES.with_review;

  // Verification tier bonuses
  if (verificationTier === 'appointment_confirmed') {
    entries += ENTRY_VALUES.appointment_confirmed_bonus;
  } else if (verificationTier === 'receipt_verified') {
    entries += ENTRY_VALUES.receipt_verified_bonus;
  }

  // Pioneer bonus
  if (pioneerTier === 'founding_patient') {
    entries += ENTRY_VALUES.pioneer_founding;
  } else if (pioneerTier === 'pioneer') {
    entries += ENTRY_VALUES.pioneer_verified;
  } else if (pioneerTier === 'early_reporter') {
    entries += ENTRY_VALUES.pioneer_early_reporter;
  }

  const newCount = (activeCount || 0) + 1;

  if (newCount === 1) entries += ENTRY_VALUES.first_submission;
  if (newCount === 5) entries += ENTRY_VALUES.fifth_submission;
  if (newCount === 10) entries += ENTRY_VALUES.tenth_submission;

  return Math.min(entries, MAX_ENTRIES_PER_SUBMISSION);
}

/**
 * Calculate entries with a Supabase query for the user's active count.
 */
export async function calculateEntries(
  userId,
  hasReceipt,
  hasRating = false,
  hasReview = false,
  hasResultPhoto = false,
  receiptVerified = false,
  verificationTier = null
) {
  let activeCount = 0;

  if (userId) {
    try {
      const { count } = await supabase
        .from('procedures')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'active');
      activeCount = count || 0;
    } catch {
      // Fall through with 0
    }
  }

  return calculateEntriesFromCount(
    activeCount,
    hasReceipt,
    hasRating,
    hasReview,
    hasResultPhoto,
    receiptVerified,
    verificationTier
  );
}

/**
 * Get the entry breakdown for display on ThankYou screen.
 */
export function getEntryBreakdown(
  activeCount,
  hasReceipt,
  hasRating = false,
  hasReview = false,
  hasResultPhoto = false,
  receiptVerified = false,
  verificationTier = null,
  pioneerTier = null
) {
  const lines = [];
  const newCount = (activeCount || 0) + 1;

  lines.push({ label: 'Base entry', value: ENTRY_VALUES.base_submission });

  if (receiptVerified) {
    lines.push({ label: 'Receipt verified', value: ENTRY_VALUES.receipt_verified });
  } else if (hasReceipt) {
    lines.push({ label: 'Receipt upload', value: ENTRY_VALUES.receipt_upload });
    lines.push({ label: '+1 more when verified by our team', value: 0, pending: true });
  }

  if (hasResultPhoto) {
    lines.push({ label: 'Result photo', value: ENTRY_VALUES.with_result_photo });
  }
  if (hasRating) {
    lines.push({ label: 'Rating', value: 1 });
  }
  if (hasReview) {
    lines.push({ label: 'Written review', value: ENTRY_VALUES.with_review });
  }

  if (verificationTier === 'appointment_confirmed') {
    lines.push({ label: 'Appointment confirmed bonus', value: ENTRY_VALUES.appointment_confirmed_bonus });
  } else if (verificationTier === 'receipt_verified') {
    lines.push({ label: 'Receipt verified patient bonus', value: ENTRY_VALUES.receipt_verified_bonus });
  }

  if (pioneerTier === 'founding_patient') {
    lines.push({ label: 'Pioneer \u2014 first confirmed patient here', value: ENTRY_VALUES.pioneer_founding });
  } else if (pioneerTier === 'pioneer') {
    lines.push({ label: 'Pioneer \u2014 first verified price here', value: ENTRY_VALUES.pioneer_verified });
  } else if (pioneerTier === 'early_reporter') {
    lines.push({ label: 'Pioneer \u2014 first to report here', value: ENTRY_VALUES.pioneer_early_reporter });
  }

  if (newCount === 1) {
    lines.push({
      label: 'First submission bonus',
      value: ENTRY_VALUES.first_submission,
    });
  }
  if (newCount === 5) {
    lines.push({
      label: '5th submission bonus',
      value: ENTRY_VALUES.fifth_submission,
    });
  }
  if (newCount === 10) {
    lines.push({
      label: '10th submission bonus',
      value: ENTRY_VALUES.tenth_submission,
    });
  }

  const rawTotal = lines.reduce((sum, l) => sum + l.value, 0);
  const total = Math.min(rawTotal, MAX_ENTRIES_PER_SUBMISSION);
  return { lines, total };
}

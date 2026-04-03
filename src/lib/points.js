import { supabase } from './supabase';

export const ENTRY_VALUES = {
  base_submission: 1,
  receipt_upload: 3, // replaces base, not additive
  first_submission: 2, // bonus on top
  fifth_submission: 3,
  tenth_submission: 5,
  referral_submission: 5,
};

/**
 * Calculate entries synchronously given a known active count.
 */
export function calculateEntriesFromCount(activeCount, hasReceipt) {
  let entries = hasReceipt
    ? ENTRY_VALUES.receipt_upload
    : ENTRY_VALUES.base_submission;

  const newCount = (activeCount || 0) + 1;

  if (newCount === 1) entries += ENTRY_VALUES.first_submission;
  if (newCount === 5) entries += ENTRY_VALUES.fifth_submission;
  if (newCount === 10) entries += ENTRY_VALUES.tenth_submission;

  return entries;
}

/**
 * Calculate entries with a Supabase query for the user's active count.
 */
export async function calculateEntries(userId, hasReceipt) {
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

  return calculateEntriesFromCount(activeCount, hasReceipt);
}

/**
 * Get the entry breakdown for display on ThankYou screen.
 */
export function getEntryBreakdown(activeCount, hasReceipt) {
  const lines = [];
  const newCount = (activeCount || 0) + 1;

  if (hasReceipt) {
    lines.push({ label: 'Receipt upload', value: ENTRY_VALUES.receipt_upload });
  } else {
    lines.push({
      label: 'Price submission',
      value: ENTRY_VALUES.base_submission,
    });
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

  const total = lines.reduce((sum, l) => sum + l.value, 0);
  return { lines, total };
}

import { supabase } from './supabase';
import { getZip, getCity, getState, getInterests } from './gating';

/**
 * Send a magic link to the given email address.
 * Returns { error } or {} on success.
 */
export async function signInWithEmail(email) {
  const { error } = await supabase.auth.signInWithOtp({ email });
  return { error };
}

/**
 * Sign in with Google OAuth via popup.
 */
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  });
  return { error };
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  await supabase.auth.signOut();
}

/**
 * Get the current user from the active session.
 */
export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Claim a pending submission after email confirmation.
 * Reads gb_last_submission_id from localStorage, updates the procedure
 * row to link it to the authenticated user and set status to 'active'.
 * Returns the procedure id if claimed, or null.
 */
export async function claimPendingSubmission(userId) {
  const submissionId = localStorage.getItem('gb_last_submission_id');
  if (!submissionId) return null;

  try {
    const { error } = await supabase
      .from('procedures')
      .update({ user_id: userId, status: 'active' })
      .eq('id', submissionId)
      .eq('status', 'pending_confirmation');

    if (!error) {
      // Also update giveaway entries to link to user
      await supabase
        .from('giveaway_entries')
        .update({ user_id: userId })
        .eq('procedure_id', submissionId)
        .is('user_id', null);
    }

    localStorage.removeItem('gb_last_submission_id');
    localStorage.removeItem('gb_pending_submission');

    return error ? null : submissionId;
  } catch {
    return null;
  }
}

/**
 * After sign-up, sync any localStorage personalization data
 * (zip, city, state, interests) to the user's Supabase profile.
 * Silently ignores errors (e.g. if profiles table doesn't exist yet).
 */
export async function syncLocalPrefsToProfile(userId) {
  const zip = getZip();
  const city = getCity();
  const state = getState();
  const interests = getInterests();

  if (!zip && !city && !state && interests.length === 0) return;

  try {
    await supabase.from('profiles').upsert(
      {
        user_id: userId,
        zip: zip || null,
        city: city || null,
        state: state || null,
        interests: interests.length > 0 ? interests : null,
      },
      { onConflict: 'user_id' }
    );
  } catch {
    // profiles table may not exist yet — safe to ignore
  }
}

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

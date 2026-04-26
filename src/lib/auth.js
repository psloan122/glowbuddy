import { supabase } from './supabase';
import { getZip, getCity, getState, getInterests, setCity, setState, setZip } from './gating';

/**
 * Map Supabase auth error messages to user-friendly text.
 * Handles all known error codes and messages without leaking raw errors.
 */
export function getAuthErrorMessage(error) {
  if (!error) return '';
  const msg = (error.message || '').toLowerCase();
  const status = error.status;

  // Rate limiting
  if (msg.includes('rate_limit') || msg.includes('rate limit') || msg.includes('too many requests') || status === 429) {
    return 'We just sent you an email. Please check your inbox (and spam folder).';
  }

  // User already exists
  if (msg.includes('already registered') || msg.includes('user_already_exists') || msg.includes('already been registered')) {
    return 'An account with this email already exists. Try signing in instead.';
  }

  // Invalid login credentials
  if (msg.includes('invalid login') || msg.includes('invalid_credentials') || msg.includes('invalid email or password')) {
    return 'Invalid email or password. Please try again.';
  }

  // Email not confirmed
  if (msg.includes('email_not_confirmed') || msg.includes('email not confirmed')) {
    return 'Please verify your email before signing in.';
  }

  // User not found
  if (msg.includes('user_not_found') || msg.includes('user not found') || msg.includes('no user found')) {
    return 'No account found with this email. Try signing up instead.';
  }

  // Weak password
  if (msg.includes('weak_password') || msg.includes('weak password') || msg.includes('should be at least')) {
    return 'Password is too weak. Use at least 6 characters with a mix of letters and numbers.';
  }

  // Signups disabled
  if (msg.includes('signups not allowed') || msg.includes('signup_disabled')) {
    return 'Sign ups are temporarily disabled. Please try again later.';
  }

  // Email link expired / invalid
  if (msg.includes('otp_expired') || msg.includes('token') || msg.includes('expired')) {
    return 'This link has expired. Please request a new one.';
  }

  // Network errors
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch')) {
    return 'Connection error. Please check your internet and try again.';
  }

  // OAuth errors
  if (msg.includes('oauth') || msg.includes('provider')) {
    return 'Something went wrong with sign in. Please try again.';
  }

  // Fallback — never show raw Supabase errors
  return 'Something went wrong. Please try again.';
}

/**
 * Sign up with email + password. Creates the account and logs in immediately.
 * Supabase sends a verification email in the background (non-blocking).
 */
export async function signUpWithPassword(email, password, metadata) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata || undefined,
      emailRedirectTo: `${window.location.origin}/verified`,
    },
  });
  return { data, error };
}

/**
 * Sign in with email + password for existing accounts.
 */
export async function signInWithPassword(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

/**
 * Send a magic link to the given email address (kept for fallback).
 * Returns { error } or {} on success.
 */
export async function signInWithEmail(email) {
  const { error } = await supabase.auth.signInWithOtp({ email });
  return { error };
}

/**
 * Sign in with Google OAuth via redirect.
 */
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  return { error };
}

/**
 * Send a password reset email.
 */
export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  return { error };
}

/**
 * Update the user's password (used on the reset password page).
 */
export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { error };
}

/**
 * Check whether a user has verified their email.
 * Google OAuth users are considered automatically verified.
 */
export function isEmailVerified(user) {
  if (!user) return false;
  if (user.app_metadata?.provider === 'google') return true;
  return !!user.email_confirmed_at;
}

/**
 * Send (or resend) the verification email for the current user.
 * Wraps supabase.auth.resend() so callers don't duplicate the call.
 */
export async function sendVerificationEmail(email) {
  return supabase.auth.resend({ type: 'signup', email });
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
 * Claim an anonymous submission after the user signs up inline on the
 * success screen. Links a user_id=null procedures row to the new account.
 * Unlike claimPendingSubmission, this works on any status (active/pending).
 */
export async function claimAnonymousSubmission(userId) {
  const submissionId = localStorage.getItem('gb_last_submission_id');
  if (!submissionId) return null;

  try {
    const { error } = await supabase
      .from('procedures')
      .update({ user_id: userId })
      .eq('id', submissionId)
      .is('user_id', null);

    if (!error) {
      localStorage.removeItem('gb_last_submission_id');
      localStorage.removeItem('gb_pending_submission');
    }

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
        terms_accepted_at: new Date().toISOString(),
        terms_version: '2026-04',
      },
      { onConflict: 'user_id' }
    );
  } catch {
    // profiles table may not exist yet — safe to ignore
  }
}

/**
 * On login, pull city/state/zip from the user's profile into localStorage
 * if localStorage is empty. Handles: user logs in on a new device.
 */
export async function syncProfileToLocal(userId) {
  // Only fill in missing localStorage values — don't overwrite existing
  if (getCity() && getState()) return;

  try {
    const { data } = await supabase
      .from('profiles')
      .select('city, state, zip')
      .eq('user_id', userId)
      .maybeSingle();

    if (!data) return;
    if (data.city && !getCity()) setCity(data.city);
    if (data.state && !getState()) setState(data.state);
    if (data.zip && !getZip()) setZip(data.zip);
  } catch {
    // Non-blocking
  }
}

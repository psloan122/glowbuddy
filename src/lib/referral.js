import { supabase } from './supabase';

const REWARD_CENTS = 1000; // $10
const CREDIT_EXPIRY_MONTHS = 12;
const REF_STORAGE_KEY = 'gb_ref';

// ─── Referral Code Generation ───

function randomDigits(n) {
  let s = '';
  for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 10);
  return s;
}

/**
 * Generate a referral code from a display name.
 * Format: first 6 chars of sanitized name + 4 random digits.
 * Example: "Sarah K" → "sarah_k2847"
 */
export function generateReferralCode(displayName) {
  const base = (displayName || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/(^_|_$)/g, '')
    .slice(0, 6);
  return `${base || 'user'}${randomDigits(4)}`;
}

/**
 * Ensure the current user has a referral code in their profile.
 * Creates one if missing. Returns the code.
 */
export async function ensureReferralCode(userId) {
  // Check profile first
  const { data: profile } = await supabase
    .from('profiles')
    .select('referral_code, display_name')
    .eq('user_id', userId)
    .maybeSingle();

  if (profile?.referral_code) return profile.referral_code;

  // Generate with collision avoidance
  const displayName = profile?.display_name || '';
  let code = generateReferralCode(displayName);
  let attempts = 0;

  while (attempts < 5) {
    const { error } = await supabase
      .from('profiles')
      .update({ referral_code: code })
      .eq('user_id', userId);

    if (!error) return code;

    // Collision — regenerate
    code = generateReferralCode(displayName);
    attempts++;
  }

  // Fallback: uuid prefix
  code = `u${userId.slice(0, 5)}${randomDigits(4)}`;
  await supabase
    .from('profiles')
    .update({ referral_code: code })
    .eq('user_id', userId);

  return code;
}

// ─── Referral Link Capture ───

/**
 * Check URL for ?ref= param or /r/:code path.
 * Store in localStorage if found.
 */
export function captureReferralFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  if (ref) {
    localStorage.setItem(REF_STORAGE_KEY, ref);
    return ref;
  }
  return localStorage.getItem(REF_STORAGE_KEY);
}

/**
 * Get stored referral code from localStorage.
 */
export function getStoredReferralCode() {
  return localStorage.getItem(REF_STORAGE_KEY);
}

/**
 * Clear stored referral code (after creating referral record).
 */
export function clearStoredReferralCode() {
  localStorage.removeItem(REF_STORAGE_KEY);
}

// ─── Referral Record Creation ───

/**
 * On signup, check for stored referral code and create referral record.
 * Links new user to referrer.
 */
export async function createReferralOnSignup(newUserId) {
  const code = getStoredReferralCode();
  if (!code) return null;

  // Look up referrer by code
  const { data: referrer } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('referral_code', code)
    .maybeSingle();

  if (!referrer || referrer.user_id === newUserId) {
    // Invalid code or self-referral
    clearStoredReferralCode();
    return null;
  }

  // Check if already referred
  const { data: existing } = await supabase
    .from('referrals')
    .select('id')
    .eq('referred_user_id', newUserId)
    .maybeSingle();

  if (existing) {
    clearStoredReferralCode();
    return null;
  }

  // Create referral record
  const { data: referral, error } = await supabase
    .from('referrals')
    .insert({
      referrer_user_id: referrer.user_id,
      referred_user_id: newUserId,
      referral_code: code,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('[referral] Failed to create referral:', error);
    clearStoredReferralCode();
    return null;
  }

  clearStoredReferralCode();
  return referral;
}

// ─── Qualification Trigger ───

/**
 * Called after a user's submission is receipt-verified.
 * Checks if this is their first verified submission and processes referral reward.
 * Returns { rewarded: true, referralId } or { rewarded: false }.
 */
export async function processReferralQualification(userId) {
  // Check if user has a pending referral
  const { data: referral } = await supabase
    .from('referrals')
    .select('*')
    .eq('referred_user_id', userId)
    .eq('status', 'pending')
    .maybeSingle();

  if (!referral) return { rewarded: false };

  // Check if this is user's first receipt-verified procedure
  const { count } = await supabase
    .from('procedures')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('receipt_verified', true)
    .eq('status', 'active');

  // Only trigger on first verified submission
  if (count !== 1) return { rewarded: false };

  const now = new Date().toISOString();
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + CREDIT_EXPIRY_MONTHS);

  // Update referral status to qualified then rewarded
  await supabase
    .from('referrals')
    .update({
      status: 'rewarded',
      qualified_at: now,
      rewarded_at: now,
    })
    .eq('id', referral.id);

  // Award $10 wallet credit to referrer
  await supabase.from('wallet_credits').insert({
    user_id: referral.referrer_user_id,
    amount_cents: REWARD_CENTS,
    source: 'referral_give',
    reference_id: referral.id,
    expires_at: expiresAt.toISOString(),
  });

  // Award $10 wallet credit to referred user
  await supabase.from('wallet_credits').insert({
    user_id: userId,
    amount_cents: REWARD_CENTS,
    source: 'referral_receive',
    reference_id: referral.id,
    expires_at: expiresAt.toISOString(),
  });

  // Update wallet_balance_cents on both profiles
  await supabase.rpc('increment_wallet_balance', {
    p_user_id: referral.referrer_user_id,
    p_amount: REWARD_CENTS,
  });
  await supabase.rpc('increment_wallet_balance', {
    p_user_id: userId,
    p_amount: REWARD_CENTS,
  });

  // Send notification emails
  try {
    const { data: referrerProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', referral.referrer_user_id)
      .maybeSingle();

    const { data: referredProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', userId)
      .maybeSingle();

    const { data: referrerAuth } = await supabase.auth.admin?.getUserById?.(referral.referrer_user_id) || {};
    const { data: referredAuth } = await supabase.auth.admin?.getUserById?.(userId) || {};

    const referrerEmail = referrerAuth?.user?.email;
    const referredEmail = referredAuth?.user?.email;

    if (referrerEmail) {
      await supabase.functions.invoke('send-email', {
        body: {
          template: 'referral_reward',
          to: referrerEmail,
          data: {
            referrerName: referrerProfile?.display_name || 'there',
            referredName: referredProfile?.display_name || 'Your friend',
            amount: '$10',
            balance: '$10',
          },
        },
      });
    }

    if (referredEmail) {
      await supabase.functions.invoke('send-email', {
        body: {
          template: 'referral_welcome_credit',
          to: referredEmail,
          data: {
            name: referredProfile?.display_name || 'there',
            amount: '$10',
          },
        },
      });
    }
  } catch (err) {
    // Non-blocking — emails are best-effort
    console.error('[referral] Email notification failed:', err);
  }

  return { rewarded: true, referralId: referral.id };
}

// ─── Wallet ───

/**
 * Get user's wallet balance in cents.
 */
export async function getWalletBalance(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('wallet_balance_cents')
    .eq('user_id', userId)
    .maybeSingle();

  return data?.wallet_balance_cents || 0;
}

/**
 * Get wallet credit history.
 */
export async function getWalletCredits(userId) {
  const { data } = await supabase
    .from('wallet_credits')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return data || [];
}

/**
 * Redeem a wallet credit against a special.
 * Returns { success, error }.
 */
export async function redeemWalletCredit(userId, creditId, specialId) {
  // Verify credit exists, belongs to user, and is unredeemed
  const { data: credit } = await supabase
    .from('wallet_credits')
    .select('*')
    .eq('id', creditId)
    .eq('user_id', userId)
    .is('redeemed_at', null)
    .maybeSingle();

  if (!credit) return { success: false, error: 'Credit not found or already redeemed' };

  // Check expiry
  if (credit.expires_at && new Date(credit.expires_at) < new Date()) {
    return { success: false, error: 'This credit has expired' };
  }

  const now = new Date().toISOString();

  // Mark credit as redeemed
  const { error } = await supabase
    .from('wallet_credits')
    .update({
      redeemed_at: now,
      redeemed_against: specialId,
    })
    .eq('id', creditId);

  if (error) return { success: false, error: 'Something went wrong. Please try again.' };

  // Deduct from wallet balance
  await supabase.rpc('increment_wallet_balance', {
    p_user_id: userId,
    p_amount: -credit.amount_cents,
  });

  return { success: true };
}

// ─── Referral Stats ───

/**
 * Get referral stats for the /refer page.
 */
export async function getReferralStats(userId) {
  const { data: referrals } = await supabase
    .from('referrals')
    .select('*, referred:referred_user_id(display_name:profiles(display_name))')
    .eq('referrer_user_id', userId)
    .order('created_at', { ascending: false });

  // Fallback: if join doesn't work, fetch separately
  let items = [];
  if (referrals) {
    for (const r of referrals) {
      let name = null;
      // Try nested join
      if (r.referred?.display_name) {
        name = r.referred.display_name;
      }
      // Fallback: query public_profiles (privacy-safe view)
      if (!name) {
        const { data: profile } = await supabase
          .from('public_profiles')
          .select('display_name')
          .eq('user_id', r.referred_user_id)
          .maybeSingle();
        name = profile?.display_name || null;
      }
      items.push({
        id: r.id,
        name: name ? name.split(' ')[0] : 'Friend',
        status: r.status,
        date: r.created_at,
      });
    }
  }

  return items;
}

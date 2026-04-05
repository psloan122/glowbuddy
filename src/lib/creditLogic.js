import { supabase } from './supabase';

// --- Constants ---

export const CREDIT_VALUES = {
  base_submission: 100,
  rating: 100,
  review: 100,
  receipt_verified: 300,
  result_photo: 200,
  pioneer_bonus: 500,
  freshness: 50,
  referral: 1000,
  login_streak_daily: 10,
  dispute_defended: 200,
};

export const REDEMPTION_TIERS = {
  giveaway_entry:   { credits: 100,  value: null, label: 'Extra Giveaway Entry', available: true },
  provider_special: { credits: 1000, value: 1000, label: '$10 toward a Provider Special', available: true },
  treatment_credit: { credits: 2500, value: 2500, label: '$25 Treatment Credit', available: true },
};

export const MAX_CREDITS_PER_SUBMISSION = 1300;

// --- Helpers ---

function endOfYear() {
  const now = new Date();
  return new Date(now.getFullYear(), 11, 31, 23, 59, 59).toISOString();
}

export function generateRedemptionCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// --- Credit Breakdown (synchronous, for ThankYou display) ---

export function getCreditBreakdown(opts = {}) {
  const {
    hasReceipt = false,
    hasRating = false,
    hasReview = false,
    hasResultPhoto = false,
    receiptVerified = false,
    pioneerTier = null,
  } = opts;

  const lines = [];

  lines.push({ label: 'Price submission', value: CREDIT_VALUES.base_submission });

  if (hasRating) {
    lines.push({ label: 'Rating', value: CREDIT_VALUES.rating });
  }
  if (hasReview) {
    lines.push({ label: 'Written review', value: CREDIT_VALUES.review });
  }
  if (receiptVerified) {
    lines.push({ label: 'Receipt verified', value: CREDIT_VALUES.receipt_verified });
  } else if (hasReceipt) {
    lines.push({ label: 'Receipt verified (pending)', value: 0, pending: true });
  }
  if (hasResultPhoto) {
    lines.push({ label: 'Result photo', value: CREDIT_VALUES.result_photo });
  }

  if (pioneerTier) {
    lines.push({ label: 'Pioneer bonus', value: CREDIT_VALUES.pioneer_bonus });
  }

  const total = Math.min(
    lines.reduce((sum, l) => sum + l.value, 0),
    MAX_CREDITS_PER_SUBMISSION
  );

  return { lines, total };
}

// --- Core Award Function ---

export async function awardSubmissionCredits(userId, procedureRow, opts = {}) {
  const {
    hasReceipt = false,
    hasRating = false,
    hasReview = false,
    hasResultPhoto = false,
    receiptVerified = false,
    pioneerTier = null,
  } = opts;

  const expiresAt = endOfYear();
  const referenceId = procedureRow?.id || null;
  const actions = [];

  // Base submission
  actions.push({
    type: 'submission',
    amount: CREDIT_VALUES.base_submission,
    description: 'Price submission',
  });

  // Rating
  if (hasRating) {
    actions.push({
      type: 'rating',
      amount: CREDIT_VALUES.rating,
      description: 'Rating submitted',
    });
  }

  // Review
  if (hasReview) {
    actions.push({
      type: 'review',
      amount: CREDIT_VALUES.review,
      description: 'Written review',
    });
  }

  // Receipt verified
  if (receiptVerified) {
    actions.push({
      type: 'receipt_verified',
      amount: CREDIT_VALUES.receipt_verified,
      description: 'Receipt verified',
    });
  }

  // Result photo
  if (hasResultPhoto) {
    actions.push({
      type: 'photo',
      amount: CREDIT_VALUES.result_photo,
      description: 'Result photo uploaded',
    });
  }

  // Pioneer bonus
  if (pioneerTier) {
    actions.push({
      type: 'pioneer',
      amount: CREDIT_VALUES.pioneer_bonus,
      description: `Pioneer bonus (${pioneerTier})`,
    });
  }

  // Cap total
  let runningTotal = actions.reduce((s, a) => s + a.amount, 0);
  if (runningTotal > MAX_CREDITS_PER_SUBMISSION) {
    // Scale down the last entries proportionally isn't worth the complexity;
    // just cap the total by reducing the last action
    let excess = runningTotal - MAX_CREDITS_PER_SUBMISSION;
    for (let i = actions.length - 1; i >= 0 && excess > 0; i--) {
      const reduction = Math.min(actions[i].amount, excess);
      actions[i].amount -= reduction;
      excess -= reduction;
    }
    runningTotal = MAX_CREDITS_PER_SUBMISSION;
  }

  // Get current balance
  const { balance: currentBalance } = await getBalance(userId);
  let balance = currentBalance;

  // Insert each action as its own ledger row
  const breakdown = [];
  for (const action of actions) {
    if (action.amount <= 0) continue;
    balance += action.amount;
    const { error } = await supabase.from('credit_ledger').insert({
      user_id: userId,
      amount: action.amount,
      balance_after: balance,
      type: action.type,
      reference_id: referenceId,
      description: action.description,
      expires_at: expiresAt,
    });
    if (!error) {
      breakdown.push({ type: action.type, amount: action.amount, description: action.description });
    }
  }

  return {
    totalCredits: breakdown.reduce((s, b) => s + b.amount, 0),
    breakdown,
    newBalance: balance,
  };
}

// --- Balance ---

export async function getBalance(userId) {
  const { data, error } = await supabase
    .from('credit_balances')
    .select('balance')
    .eq('user_id', userId)
    .maybeSingle();

  const balance = (!error && data?.balance) ? data.balance : 0;
  return { balance, dollarValue: (balance / 100).toFixed(2) };
}

// --- Credit History ---

export async function getCreditHistory(userId, limit = 50, offset = 0) {
  const { data, error, count } = await supabase
    .from('credit_ledger')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return {
    rows: (!error && data) ? data : [],
    hasMore: (count || 0) > offset + limit,
  };
}

// --- Redemptions ---

async function deductCredits(userId, amount, type, description, referenceId = null) {
  const { balance } = await getBalance(userId);
  if (balance < amount) {
    return { success: false, error: 'Insufficient credits' };
  }

  const newBalance = balance - amount;
  const { error } = await supabase.from('credit_ledger').insert({
    user_id: userId,
    amount: -amount,
    balance_after: newBalance,
    type,
    reference_id: referenceId,
    description,
  });

  if (error) return { success: false, error: error.message };
  return { success: true, newBalance };
}

export async function redeemForEntry(userId) {
  const tier = REDEMPTION_TIERS.giveaway_entry;
  const deduction = await deductCredits(
    userId, tier.credits, 'redeem_entry', 'Redeemed for extra giveaway entry'
  );
  if (!deduction.success) return deduction;

  // Insert giveaway entry
  const month = new Date().toISOString().slice(0, 7); // yyyy-MM
  await supabase.from('giveaway_entries').insert({
    user_id: userId,
    month,
    entries: 1,
    has_receipt: false,
    source: 'credit_redemption',
  });

  // Create redemption record
  await supabase.from('credit_redemptions').insert({
    user_id: userId,
    credits_spent: tier.credits,
    redemption_type: 'giveaway_entry',
    status: 'confirmed',
    confirmed_at: new Date().toISOString(),
  });

  return { success: true };
}

export async function redeemForSpecial(userId, specialId) {
  const tier = REDEMPTION_TIERS.provider_special;
  const code = generateRedemptionCode();

  const deduction = await deductCredits(
    userId, tier.credits, 'redeem_special', `Redeemed for provider special (${code})`
  );
  if (!deduction.success) return deduction;

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase.from('credit_redemptions').insert({
    user_id: userId,
    credits_spent: tier.credits,
    redemption_type: 'provider_special',
    special_id: specialId,
    status: 'pending',
    redemption_code: code,
    expires_at: expiresAt,
  }).select().single();

  if (error) return { success: false, error: error.message };
  return { success: true, code, expiresAt: data.expires_at };
}

export async function redeemForTreatment(userId, providerId) {
  const tier = REDEMPTION_TIERS.treatment_credit;
  const code = generateRedemptionCode();

  const deduction = await deductCredits(
    userId, tier.credits, 'redeem_treatment', `Redeemed for $25 treatment credit (${code})`
  );
  if (!deduction.success) return deduction;

  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase.from('credit_redemptions').insert({
    user_id: userId,
    credits_spent: tier.credits,
    redemption_type: 'treatment_credit',
    provider_id: providerId,
    status: 'pending',
    redemption_code: code,
    expires_at: expiresAt,
  }).select().single();

  if (error) return { success: false, error: error.message };
  return { success: true, code, expiresAt: data.expires_at };
}

export async function getRedemptionHistory(userId) {
  const { data, error } = await supabase
    .from('credit_redemptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return (!error && data) ? data : [];
}

export async function confirmRedemption(redemptionCode, providerId) {
  const { data, error } = await supabase
    .from('credit_redemptions')
    .update({
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
    })
    .eq('redemption_code', redemptionCode)
    .eq('provider_id', providerId)
    .eq('status', 'pending')
    .select()
    .single();

  if (error || !data) return { success: false, error: 'Redemption not found or already confirmed' };
  return { success: true, redemption: data };
}

// --- Login Streak ---

export async function checkLoginStreak(userId) {
  if (!userId) return null;

  const today = new Date().toISOString().slice(0, 10); // yyyy-MM-dd

  // Get or create streak record
  let { data: streak } = await supabase
    .from('login_streaks')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (!streak) {
    const { data: newStreak } = await supabase
      .from('login_streaks')
      .insert({
        user_id: userId,
        current_streak: 1,
        last_login_date: today,
        longest_streak: 1,
        total_streak_credits: 0,
      })
      .select()
      .single();
    return newStreak;
  }

  // Already logged in today
  if (streak.last_login_date === today) {
    return streak;
  }

  // Check if yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  let newStreak;
  if (streak.last_login_date === yesterdayStr) {
    // Continue streak
    newStreak = streak.current_streak + 1;
  } else {
    // Streak broken, restart
    newStreak = 1;
  }

  const longestStreak = Math.max(newStreak, streak.longest_streak || 0);

  // Award credits if streak >= 3
  let creditsAwarded = 0;
  if (newStreak >= 3) {
    creditsAwarded = CREDIT_VALUES.login_streak_daily;
    const { balance } = await getBalance(userId);
    await supabase.from('credit_ledger').insert({
      user_id: userId,
      amount: creditsAwarded,
      balance_after: balance + creditsAwarded,
      type: 'login_streak',
      description: `Daily login streak (day ${newStreak})`,
      expires_at: endOfYear(),
    });
  }

  const { data: updated } = await supabase
    .from('login_streaks')
    .update({
      current_streak: newStreak,
      last_login_date: today,
      longest_streak: longestStreak,
      total_streak_credits: (streak.total_streak_credits || 0) + creditsAwarded,
    })
    .eq('user_id', userId)
    .select()
    .single();

  return updated;
}

// --- GlowRewards Provider Directory ---

export async function getGlowRewardsProviders(city, state) {
  let query = supabase
    .from('providers')
    .select('id, name, slug, city, state, glow_rewards_monthly_cap, glow_rewards_redeemed_this_month')
    .eq('glow_rewards_enabled', true);

  if (state) query = query.eq('state', state);
  if (city) query = query.eq('city', city);

  const { data, error } = await query.order('name');

  if (error || !data) return [];
  return data.map((p) => ({
    ...p,
    remainingCap: Math.max(0, (p.glow_rewards_monthly_cap || 2500) - (p.glow_rewards_redeemed_this_month || 0)),
  }));
}

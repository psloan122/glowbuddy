import { supabase } from './supabase';

/**
 * Run velocity check after a successful insert.
 * If 5+ submissions for the same provider/city/state in 2 hours,
 * flag them all for admin review. Runs silently — never tells the submitter.
 */
export async function checkVelocity(providerName, city, state) {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const { count } = await supabase
      .from('procedures')
      .select('*', { count: 'exact', head: true })
      .ilike('provider_name', providerName)
      .eq('city', city)
      .eq('state', state)
      .gte('created_at', twoHoursAgo.toISOString());

    if (count >= 5) {
      await supabase
        .from('procedures')
        .update({
          status: 'flagged',
          flagged_reason: 'velocity_check',
        })
        .ilike('provider_name', providerName)
        .eq('city', city)
        .eq('state', state)
        .gte('created_at', twoHoursAgo.toISOString());
    }
  } catch {
    // Silent — never block the user flow
  }
}

/**
 * Calculate a trust score (0–100) for a submission.
 * Higher = more trustworthy. Factors: account age, submission count,
 * provider diversity, anonymous submissions.
 */
export async function calculateTrustScore(userId) {
  let score = 50; // base score for anonymous / new users

  if (!userId) return score;

  try {
    // Get user's account creation date
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return score;

    const accountAge = Date.now() - new Date(user.created_at).getTime();
    const daysOld = accountAge / (1000 * 60 * 60 * 24);

    // Get user's total active submission count
    const { count } = await supabase
      .from('procedures')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'active');

    // Get diversity — how many different providers has this user submitted for
    const { data: providers } = await supabase
      .from('procedures')
      .select('provider_name')
      .eq('user_id', userId)
      .eq('status', 'active');

    const uniqueProviders = new Set(
      providers?.map((p) => p.provider_name) || []
    ).size;

    // Scoring
    if (daysOld > 30) score += 15;
    if (daysOld > 90) score += 10;
    if (count >= 3) score += 10;
    if (count >= 10) score += 10;
    if (uniqueProviders >= 3) score += 15;

    // Submitting for only one provider repeatedly is suspicious
    if (uniqueProviders === 1 && count >= 3) score -= 20;

    return Math.min(Math.max(score, 0), 100);
  } catch {
    return score;
  }
}

/**
 * Check if a user has already submitted for this provider + procedure
 * within the last 30 days.
 * Returns { isDuplicate: boolean, existingId: string | null }
 */
export async function checkDuplicate(userId, providerName, procedureType) {
  if (!userId) return { isDuplicate: false, existingId: null };

  try {
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    );

    const { data } = await supabase
      .from('procedures')
      .select('id')
      .eq('user_id', userId)
      .ilike('provider_name', providerName)
      .eq('procedure_type', procedureType)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .limit(1);

    if (data && data.length > 0) {
      return { isDuplicate: true, existingId: data[0].id };
    }

    return { isDuplicate: false, existingId: null };
  } catch {
    return { isDuplicate: false, existingId: null };
  }
}

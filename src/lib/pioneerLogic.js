import { supabase } from './supabase';
import { format } from 'date-fns';

export const PIONEER_TIERS = {
  early_reporter: {
    key: 'early_reporter',
    label: 'Early Reporter',
    giveaway_entries: 1,
    color: '#D4BC78',
    bgColor: '#FFFBEB',
  },
  pioneer: {
    key: 'pioneer',
    label: 'Pioneer',
    giveaway_entries: 3,
    color: '#B8860B',
    bgColor: '#FEF3C7',
  },
  founding_patient: {
    key: 'founding_patient',
    label: 'Founding Patient',
    giveaway_entries: 5,
    color: '#DAA520',
    bgColor: '#FEF9C3',
  },
};

/**
 * Main function — called after procedure INSERT in Log.jsx.
 * Determines tier, races for the unique slot, awards badge + giveaway entry.
 * Returns the pioneer record or null.
 */
export async function checkAndAwardPioneer(userId, procedureRow) {
  if (!userId || !procedureRow) return null;

  const providerSlug = procedureRow.provider_slug;
  if (!providerSlug) return null;

  // Determine tier
  let tier = 'early_reporter';
  if (procedureRow.receipt_verified || procedureRow.has_receipt) {
    tier = 'pioneer';
  }
  // Check if user has appointment_confirmed verification at this provider
  try {
    const { data: confirmed } = await supabase
      .from('procedures')
      .select('id')
      .eq('user_id', userId)
      .eq('provider_slug', providerSlug)
      .eq('receipt_verified', true)
      .limit(1);
    if (confirmed && confirmed.length > 0) {
      tier = 'founding_patient';
    }
  } catch {
    // Non-blocking
  }

  // Check if this tier is already claimed at this provider
  const { data: existing } = await supabase
    .from('pioneer_records')
    .select('id')
    .eq('provider_slug', providerSlug)
    .eq('pioneer_tier', tier)
    .maybeSingle();

  if (existing) return null; // Already claimed

  // Race for the slot via SECURITY DEFINER function — unique constraint rejects duplicates
  const { data: recordId, error } = await supabase.rpc('award_pioneer_record', {
    p_user_id: userId,
    p_provider_slug: providerSlug,
    p_provider_name: procedureRow.provider_name,
    p_city: procedureRow.city || null,
    p_state: procedureRow.state || null,
    p_procedure_id: procedureRow.id,
    p_pioneer_tier: tier,
  });

  if (error || !recordId) {
    // Unique constraint violation or someone else got there first
    return null;
  }

  // Build a record object for downstream use
  const record = {
    id: recordId,
    user_id: userId,
    provider_slug: providerSlug,
    provider_name: procedureRow.provider_name,
    city: procedureRow.city || null,
    state: procedureRow.state || null,
    procedure_id: procedureRow.id,
    pioneer_tier: tier,
  };

  // Award location_pioneer badge via SECURITY DEFINER (ON CONFLICT DO NOTHING handles dupes)
  if (tier === 'pioneer' || tier === 'founding_patient') {
    try {
      await supabase.rpc('award_badge', {
        p_user_id: userId,
        p_badge_type: 'location_pioneer',
      });
    } catch {
      // Non-blocking
    }
  }

  // Insert pioneer giveaway entry
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .maybeSingle();

    const email = profile?.email || '';
    if (email) {
      await supabase.from('pioneer_giveaway_entries').insert({
        user_id: userId,
        email,
        procedure_id: procedureRow.id,
        pioneer_record_id: record.id,
        month: format(new Date(), 'yyyy-MM'),
        entries: PIONEER_TIERS[tier].giveaway_entries,
        pioneer_tier: tier,
      });
    }
  } catch {
    // Non-blocking
  }

  return record;
}

/**
 * For ProviderProfile — shows who was first at this provider.
 * Joins with profiles for display_name.
 */
export async function getPioneerCredit(providerSlug) {
  if (!providerSlug) return [];

  const { data, error } = await supabase
    .from('pioneer_records')
    .select('pioneer_tier, earned_at, user_id')
    .eq('provider_slug', providerSlug)
    .order('earned_at', { ascending: true });

  if (error || !data || data.length === 0) return [];

  // Fetch display names from public_profiles view (privacy-safe)
  const userIds = [...new Set(data.map((r) => r.user_id))];
  const { data: profiles } = await supabase
    .from('public_profiles')
    .select('user_id, display_name')
    .in('user_id', userIds);

  const nameMap = {};
  (profiles || []).forEach((p) => {
    nameMap[p.user_id] = p.display_name;
  });

  return data.map((r) => ({
    tier: r.pioneer_tier,
    display_name: nameMap[r.user_id] || null,
    earned_at: r.earned_at,
  }));
}

/**
 * For Community page — pioneer leaderboard.
 * Groups by user_id, counts locations pioneered.
 */
export async function getPioneerLeaderboard(city, state, limit = 20) {
  let query = supabase
    .from('pioneer_records')
    .select('user_id')
    .in('pioneer_tier', ['pioneer', 'founding_patient']);

  if (city && state) {
    query = query.eq('city', city).eq('state', state);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  // Group by user_id
  const counts = {};
  data.forEach((r) => {
    counts[r.user_id] = (counts[r.user_id] || 0) + 1;
  });

  const sorted = Object.entries(counts)
    .map(([user_id, location_count]) => ({ user_id, location_count }))
    .sort((a, b) => b.location_count - a.location_count)
    .slice(0, limit);

  // Fetch display names from public_profiles view (privacy-safe)
  if (sorted.length === 0) return [];
  const userIds = sorted.map((r) => r.user_id);
  const { data: profiles } = await supabase
    .from('public_profiles')
    .select('user_id, display_name')
    .in('user_id', userIds);

  const nameMap = {};
  (profiles || []).forEach((p) => {
    nameMap[p.user_id] = p.display_name;
  });

  return sorted.map((r) => ({
    ...r,
    display_name: nameMap[r.user_id] || null,
  }));
}

/**
 * Counts providers in city/state with NO receipt-verified procedures.
 * For the "X unclaimed locations" hook.
 */
export async function getUnverifiedLocationCount(city, state) {
  if (!city && !state) return 0;

  // Get all providers in the area
  let provQuery = supabase.from('providers').select('slug');
  if (city) provQuery = provQuery.ilike('city', city);
  if (state) provQuery = provQuery.eq('state', state);

  const { data: providers, error: provErr } = await provQuery;
  if (provErr || !providers || providers.length === 0) return 0;

  // Get provider slugs that have pioneer records
  let pioneerQuery = supabase
    .from('pioneer_records')
    .select('provider_slug')
    .in('pioneer_tier', ['pioneer', 'founding_patient']);

  if (city) pioneerQuery = pioneerQuery.ilike('city', city);
  if (state) pioneerQuery = pioneerQuery.eq('state', state);

  const { data: pioneered } = await pioneerQuery;
  const pioneeredSlugs = new Set((pioneered || []).map((r) => r.provider_slug));

  return providers.filter((p) => !pioneeredSlugs.has(p.slug)).length;
}

/**
 * For MyTreatments — user's pioneer stats.
 */
export async function getUserPioneerStats(userId) {
  if (!userId) return null;

  const { data, error } = await supabase
    .from('pioneer_records')
    .select('provider_slug, city, state, pioneer_tier')
    .eq('user_id', userId);

  if (error || !data || data.length === 0) return null;

  const byCity = {};
  const tierCounts = { early_reporter: 0, pioneer: 0, founding_patient: 0 };

  data.forEach((r) => {
    const cityKey = r.city || 'Unknown';
    byCity[cityKey] = (byCity[cityKey] || 0) + 1;
    if (tierCounts[r.pioneer_tier] !== undefined) {
      tierCounts[r.pioneer_tier]++;
    }
  });

  return {
    totalLocations: data.length,
    byCity,
    tierCounts,
  };
}

/**
 * Returns warm, non-corporate toast text.
 */
export function getPioneerToastMessage(providerName, tier) {
  const name = providerName || 'this location';
  if (tier === 'founding_patient') {
    return `You're the first confirmed patient to share what they paid at ${name}. You just made it easier for every woman who comes next.`;
  }
  if (tier === 'pioneer') {
    return `You're the first person to verify a real price at ${name}. That matters.`;
  }
  return `You're the first to report a price at ${name}. Upload a receipt to earn Pioneer status.`;
}

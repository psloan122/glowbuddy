import { supabase } from './supabase';
import { getCategoryTag } from './constants';

/**
 * Fetch all providers in map viewport bounds.
 * 100% server-side via Supabase — no Google Places API calls.
 *
 * When procedureFilter is set, filters providers by:
 *   1. procedure_tags (seeded category tags from the bulk seed script)
 *   2. Actual logged procedures in the procedures table
 */
export async function fetchAllProvidersInBounds(bounds, procedureFilter) {
  const categoryTag = procedureFilter ? getCategoryTag(procedureFilter) : null;

  // 1. Fetch providers in bounds
  let provQuery = supabase
    .from('providers')
    .select('id, name, slug, city, state, lat, lng, provider_type, google_rating, google_review_count, is_claimed, is_verified, procedure_tags')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .gte('lat', bounds.south)
    .lte('lat', bounds.north)
    .gte('lng', bounds.west)
    .lte('lng', bounds.east)
    .limit(300);

  // Filter providers by procedure category tag
  if (categoryTag) {
    provQuery = provQuery.contains('procedure_tags', [categoryTag]);
  }

  const { data: providerRows } = await provQuery;

  // 2. Fetch submission stats grouped by provider
  let procQuery = supabase
    .from('procedures')
    .select('provider_name, provider_slug, city, state, lat, lng, price_paid, procedure_type, provider_type, receipt_verified')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .eq('status', 'active')
    .gte('lat', bounds.south)
    .lte('lat', bounds.north)
    .gte('lng', bounds.west)
    .lte('lng', bounds.east)
    .limit(500);

  if (procedureFilter) {
    procQuery = procQuery.eq('procedure_type', procedureFilter);
  }

  const { data: procedures } = await procQuery;

  // 3. Group procedures by provider_name + city
  const procMap = {};
  for (const p of procedures || []) {
    const key = `${p.provider_name}-${p.city}`.toLowerCase();
    if (!procMap[key]) {
      procMap[key] = { submissions: [], lat: p.lat, lng: p.lng, slug: p.provider_slug };
    }
    procMap[key].submissions.push(p);
  }

  // 4. Merge providers with submission data
  const seen = new Set();
  const merged = [];

  for (const prov of providerRows || []) {
    const key = `${prov.name}-${prov.city}`.toLowerCase();
    seen.add(key);

    const procData = procMap[key];
    const submissions = procData?.submissions || [];
    const submissionCount = submissions.length;
    const verifiedCount = submissions.filter((s) => s.receipt_verified).length;
    const avgPrice =
      submissionCount > 0
        ? Math.round(submissions.reduce((s, p) => s + (p.price_paid || 0), 0) / submissionCount)
        : 0;

    merged.push({
      key: `prov-${prov.id}`,
      provider_name: prov.name,
      provider_slug: prov.slug,
      city: prov.city,
      state: prov.state,
      lat: prov.lat,
      lng: prov.lng,
      provider_type: prov.provider_type,
      google_rating: prov.google_rating,
      google_review_count: prov.google_review_count,
      is_claimed: prov.is_claimed,
      is_verified: prov.is_verified,
      submission_count: submissionCount,
      verified_count: verifiedCount,
      avg_price: avgPrice,
      has_submissions: submissionCount > 0,
      source: 'provider',
    });
  }

  // Add procedure-only markers (providers not in providers table)
  for (const [key, data] of Object.entries(procMap)) {
    if (seen.has(key)) continue;
    const first = data.submissions[0];
    const submissionCount = data.submissions.length;
    const verifiedCount = data.submissions.filter((s) => s.receipt_verified).length;
    const avgPrice = Math.round(
      data.submissions.reduce((s, p) => s + (p.price_paid || 0), 0) / submissionCount,
    );

    merged.push({
      key: `proc-${key}`,
      provider_name: first.provider_name,
      provider_slug: data.slug || first.provider_slug,
      city: first.city,
      state: first.state,
      lat: data.lat,
      lng: data.lng,
      provider_type: first.provider_type,
      google_rating: null,
      google_review_count: null,
      is_claimed: false,
      is_verified: false,
      submission_count: submissionCount,
      verified_count: verifiedCount,
      avg_price: avgPrice,
      has_submissions: true,
      source: 'procedures',
    });
  }

  // Sort: has submissions first, then by submission count desc
  merged.sort((a, b) => {
    if (a.has_submissions !== b.has_submissions) return b.has_submissions ? 1 : -1;
    return b.submission_count - a.submission_count;
  });

  return merged;
}

import { supabase } from './supabase';
import { getCategoryTag } from './constants';
import { bestPinListing } from './priceUtils';

// Hard cap on what counts as a per-unit price for the map pin. Anything over
// $500 is almost certainly a package or flat-rate price, not a single unit.
const PER_UNIT_PRICE_MAX = 500;

// Patient submissions don't have a structured price_label, so we infer
// per-unit-ness from the units_or_volume freeform text.
function isPerUnitSubmission(unitsText) {
  if (!unitsText) return false;
  const t = String(unitsText).toLowerCase();
  return t.includes('unit') || t.includes('syringe') || t.includes('session');
}

/**
 * Fetch all providers in map viewport bounds.
 * 100% server-side via Supabase — no Google Places API calls.
 *
 * `procedureFilter` may be either:
 *   - a canonical procedure_type string (legacy callers), or
 *   - a filter object: { procedureTypes: string[], categoryTag, fuzzyToken }
 *     produced by resolveProcedureFilter() / makeProcedureFilterFrom*().
 *
 * When set, filters providers by:
 *   1. procedure_tags (seeded category tags from the bulk seed script)
 *   2. Actual logged procedures in the procedures table
 */
export async function fetchAllProvidersInBounds(bounds, procedureFilter) {
  // Normalize legacy string callers into the new filter shape.
  let procedureTypes = [];
  let categoryTag = null;
  if (typeof procedureFilter === 'string' && procedureFilter) {
    procedureTypes = [procedureFilter];
    categoryTag = getCategoryTag(procedureFilter);
  } else if (procedureFilter && typeof procedureFilter === 'object') {
    procedureTypes = procedureFilter.procedureTypes || [];
    categoryTag = procedureFilter.categoryTag || null;
  }

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
    .select('provider_name, provider_slug, city, state, lat, lng, price_paid, procedure_type, provider_type, receipt_verified, units_or_volume')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .eq('status', 'active')
    .gte('lat', bounds.south)
    .lte('lat', bounds.north)
    .gte('lng', bounds.west)
    .lte('lng', bounds.east)
    .limit(500);

  if (procedureTypes.length === 1) {
    procQuery = procQuery.eq('procedure_type', procedureTypes[0]);
  } else if (procedureTypes.length > 1) {
    procQuery = procQuery.in('procedure_type', procedureTypes);
  }

  const { data: procedures } = await procQuery;

  // 2b. Fetch provider_pricing rows in bounds. We only pull displayable rows
  // (display_suppressed=false, set by migration 053), which means only
  // confirmed per_unit / per_syringe / per_session / per_month pricing.
  // normalizePrice() will return HIDDEN for anything that isn't one of those,
  // and the map pin logic below drops providers with no comparable value.
  let pricingQuery = supabase
    .from('provider_pricing')
    .select(
      'price, price_label, procedure_type, treatment_area, units_or_volume, providers!inner(name, city, lat, lng)'
    )
    .eq('is_active', true)
    .eq('display_suppressed', false)
    .gte('providers.lat', bounds.south)
    .lte('providers.lat', bounds.north)
    .gte('providers.lng', bounds.west)
    .lte('providers.lng', bounds.east)
    .limit(2000);

  const { data: pricingRows } = await pricingQuery;

  // 3. Group procedures by provider_name + city
  const procMap = {};
  for (const p of procedures || []) {
    const key = `${p.provider_name}-${p.city}`.toLowerCase();
    if (!procMap[key]) {
      procMap[key] = { submissions: [], lat: p.lat, lng: p.lng, slug: p.provider_slug };
    }
    procMap[key].submissions.push(p);
  }

  // 3b. Group provider_pricing rows by provider_name + city, keeping the
  // raw row so we can normalize later (we need procedure_type, treatment_area,
  // units_or_volume, etc. — not just the price).
  const pricingMap = {};
  for (const row of pricingRows || []) {
    const provider = row.providers || {};
    if (!provider.name || !provider.city) continue;
    const key = `${provider.name}-${provider.city}`.toLowerCase();
    if (!pricingMap[key]) pricingMap[key] = [];
    pricingMap[key].push(row);
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

    // ── Comparable per-unit value for the map pin ──
    // Patient submissions contribute when the freeform units_or_volume text
    // says "unit"/"syringe"/"session". Scraped provider_pricing rows are
    // normalized via normalizePrice — after migration 053 only confirmed
    // per_unit / per_syringe / per_session / per_month rows survive, so
    // there are no more estimates to merge in.
    const perUnitDirect = [];
    for (const s of submissions) {
      if (
        isPerUnitSubmission(s.units_or_volume) &&
        s.price_paid > 0 &&
        s.price_paid < PER_UNIT_PRICE_MAX
      ) {
        perUnitDirect.push(Number(s.price_paid));
      }
    }
    const pinFromPricing = bestPinListing(pricingMap[key] || []);
    if (pinFromPricing && pinFromPricing.comparableValue != null) {
      perUnitDirect.push(pinFromPricing.comparableValue);
    }

    const perUnitAvg =
      perUnitDirect.length > 0
        ? Math.round(perUnitDirect.reduce((s, p) => s + p, 0) / perUnitDirect.length)
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
      per_unit_avg: perUnitAvg,
      has_per_unit_price: perUnitAvg > 0 && perUnitAvg < PER_UNIT_PRICE_MAX,
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

    const perUnitPrices = [];
    for (const s of data.submissions) {
      if (
        isPerUnitSubmission(s.units_or_volume) &&
        s.price_paid > 0 &&
        s.price_paid < PER_UNIT_PRICE_MAX
      ) {
        perUnitPrices.push(Number(s.price_paid));
      }
    }
    const perUnitAvg =
      perUnitPrices.length > 0
        ? Math.round(perUnitPrices.reduce((s, p) => s + p, 0) / perUnitPrices.length)
        : 0;
    // Procedure-only providers have no provider_pricing rows — perUnitAvg is
    // always a direct submission average here.

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
      per_unit_avg: perUnitAvg,
      has_per_unit_price: perUnitAvg > 0,
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

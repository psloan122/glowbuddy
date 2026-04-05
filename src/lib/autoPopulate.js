import { supabase } from './supabase';
import { parseAddressComponents, extractGooglePhotos } from './places';
import { slugify } from './slugify';

// Cache which cities we've already populated this session
const populatedCities = new Set();

/**
 * Auto-populate med spas in a city using Google Places Text Search.
 * Creates unclaimed provider records for any new places found.
 * Returns the list of providers created or already existing.
 *
 * Cost: ~$0.032 per search — only runs once per city per session.
 */
export async function autoPopulateCity(city, state) {
  if (!city) return [];

  const cacheKey = `${city.toLowerCase()}|${(state || '').toLowerCase()}`;
  if (populatedCities.has(cacheKey)) return [];
  populatedCities.add(cacheKey);

  // Check if we've populated this city recently (7 days)
  const { count } = await supabase
    .from('providers')
    .select('*', { count: 'exact', head: true })
    .ilike('city', city)
    .not('google_place_id', 'is', null);

  // If we already have 5+ providers in this city, skip the API call
  if (count && count >= 5) return [];

  // Requires Google Maps JS API loaded with Places library
  if (!window.google?.maps?.places) return [];

  const service = new window.google.maps.places.PlacesService(
    document.createElement('div')
  );

  const query = state
    ? `med spa ${city} ${state}`
    : `med spa ${city}`;

  return new Promise((resolve) => {
    service.textSearch({ query }, async (results, status) => {
      if (status !== window.google.maps.places.PlacesServiceStatus.OK || !results) {
        resolve([]);
        return;
      }

      const created = [];

      for (const place of results) {
        const placeId = place.place_id;
        if (!placeId) continue;

        // Check if this provider already exists
        const { data: existing } = await supabase
          .from('providers')
          .select('id')
          .eq('google_place_id', placeId)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Parse location data from the basic text search result
        const lat = place.geometry?.location?.lat() ?? null;
        const lng = place.geometry?.location?.lng() ?? null;
        const name = place.name || '';
        const address = place.formatted_address || '';

        // Parse city/state from formatted_address
        let parsedCity = city;
        let parsedState = state || '';
        let parsedZip = '';
        const addressParts = address.split(',').map((s) => s.trim());
        if (addressParts.length >= 3) {
          parsedCity = addressParts[addressParts.length - 3] || city;
          const stateZip = addressParts[addressParts.length - 2] || '';
          const stateZipMatch = stateZip.match(/^([A-Z]{2})\s*(\d{5})?/);
          if (stateZipMatch) {
            parsedState = stateZipMatch[1];
            parsedZip = stateZipMatch[2] || '';
          }
        }

        if (!parsedState) continue; // Skip if we can't determine state

        const slug = slugify(`${name}-${parsedCity}-${parsedState}`);

        // Check slug uniqueness
        const { data: slugExists } = await supabase
          .from('providers')
          .select('id')
          .eq('slug', slug)
          .limit(1);

        if (slugExists && slugExists.length > 0) continue;

        const providerRow = {
          name,
          slug,
          provider_type: 'Med Spa (Non-Physician)',
          address,
          city: parsedCity,
          state: parsedState,
          zip_code: parsedZip || '00000',
          google_place_id: placeId,
          lat,
          lng,
          google_rating: place.rating ?? null,
          google_review_count: place.user_ratings_total ?? null,
          google_synced_at: new Date().toISOString(),
          is_claimed: false,
          is_verified: false,
        };

        const { data: inserted, error } = await supabase
          .from('providers')
          .insert(providerRow)
          .select('id, name, slug, city, state, lat, lng, google_rating')
          .single();

        if (!error && inserted) {
          created.push(inserted);
        }
      }

      resolve(created);
    });
  });
}

/**
 * Fetch all providers in bounds (both claimed and unclaimed, with or without submissions).
 * Returns merged data: providers enriched with submission counts and avg prices.
 */
export async function fetchAllProvidersInBounds(bounds, procedureFilter) {
  // 1. Fetch providers in bounds
  const { data: providerRows } = await supabase
    .from('providers')
    .select('id, name, slug, city, state, lat, lng, provider_type, google_rating, google_review_count, is_claimed, is_verified')
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .gte('lat', bounds.south)
    .lte('lat', bounds.north)
    .gte('lng', bounds.west)
    .lte('lng', bounds.east)
    .limit(300);

  // 2. Fetch submission stats grouped by provider
  let procQuery = supabase
    .from('procedures')
    .select('provider_name, provider_slug, city, state, lat, lng, price_paid, procedure_type, provider_type')
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

  // Start with providers table rows
  for (const prov of providerRows || []) {
    const key = `${prov.name}-${prov.city}`.toLowerCase();
    seen.add(key);

    const procData = procMap[key];
    const submissions = procData?.submissions || [];
    const submissionCount = submissions.length;
    const avgPrice = submissionCount > 0
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
    const avgPrice = Math.round(
      data.submissions.reduce((s, p) => s + (p.price_paid || 0), 0) / submissionCount
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

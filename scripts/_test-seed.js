import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const API_KEY = process.env.GOOGLE_PLACES_SERVER_KEY;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const QUERIES = ['med spa', 'botox clinic', 'semaglutide clinic'];
const QUERY_TO_TAGS = { 'med spa': ['general'], 'botox clinic': ['neurotoxin'], 'semaglutide clinic': ['weight-loss'] };

async function searchPlaces(query, lat, lng) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
  url.searchParams.set('location', `${lat},${lng}`);
  url.searchParams.set('radius', '25000');
  url.searchParams.set('keyword', query);
  url.searchParams.set('type', 'health|beauty_salon|spa');
  url.searchParams.set('key', API_KEY);
  const res = await fetch(url);
  const json = await res.json();
  return json.results || [];
}

function parseAddress(address, seedCity, seedState) {
  const parts = address.split(',').map(s => s.trim());
  let city = seedCity, state = seedState, zip = '';
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1];
    const stateZipMatch = lastPart.match(/^([A-Z]{2})\s*(\d{5})?$/);
    if (stateZipMatch) {
      state = stateZipMatch[1]; zip = stateZipMatch[2] || '';
      if (parts.length >= 3) city = parts[parts.length - 2];
    } else if (!/^\d/.test(lastPart) && lastPart.length > 1 && lastPart.length < 40) {
      city = lastPart;
    }
  }
  return { city, state, zip };
}

async function run() {
  const seedCity = { city: 'New Orleans', state: 'LA', lat: 29.9511, lng: -90.0715 };
  console.log(`Testing: ${seedCity.city}, ${seedCity.state}`);
  const cityPlaces = new Map();
  const placeQueryTags = new Map();
  for (const query of QUERIES) {
    const places = await searchPlaces(query, seedCity.lat, seedCity.lng);
    console.log(`  "${query}" → ${places.length} results`);
    const tags = QUERY_TO_TAGS[query] || ['general'];
    for (const place of places) {
      if (!place.place_id) continue;
      if (!cityPlaces.has(place.place_id)) { cityPlaces.set(place.place_id, place); placeQueryTags.set(place.place_id, new Set()); }
      tags.forEach(t => placeQueryTags.get(place.place_id).add(t));
    }
    await sleep(300);
  }
  console.log(`  Unique: ${cityPlaces.size}`);
  const rows = [];
  for (const [placeId, place] of cityPlaces) {
    const address = place.formatted_address || place.vicinity || '';
    const parsed = parseAddress(address, seedCity.city, seedCity.state);
    const h = (() => { let v = 0; for (let i = 0; i < placeId.length; i++) v = ((v << 5) - v + placeId.charCodeAt(i)) | 0; return Math.abs(v).toString(36).slice(0, 6); })();
    const slug = (place.name + '-' + parsed.city + '-' + parsed.state).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + h;
    rows.push({
      name: place.name, slug, google_place_id: placeId,
      provider_type: 'Med Spa (Non-Physician)',
      lat: place.geometry?.location?.lat ?? null, lng: place.geometry?.location?.lng ?? null,
      address, city: parsed.city, state: parsed.state, zip_code: parsed.zip || '00000',
      google_rating: place.rating ?? null, google_review_count: place.user_ratings_total ?? null,
      is_claimed: false, is_verified: false,
      procedure_tags: Array.from(placeQueryTags.get(placeId) || []),
      place_types: place.types || [], seed_city: seedCity.city,
      photo_reference: place.photos?.[0]?.photo_reference ?? null,
      last_google_sync: new Date().toISOString(),
    });
  }
  console.log(`  Rows: ${rows.length}`);
  console.log(`  Sample: ${rows[0]?.name} | ${rows[0]?.city}, ${rows[0]?.state} | tags=${rows[0]?.procedure_tags}`);
  const { error } = await supabase.from('providers').upsert(rows, { onConflict: 'google_place_id', ignoreDuplicates: false });
  if (error) { console.error('  ERROR:', error.message); return; }
  console.log(`  Upserted ${rows.length} providers`);
  const { count } = await supabase.from('providers').select('*', { count: 'exact', head: true }).not('google_place_id', 'is', null);
  console.log(`  Total providers with place_id: ${count}`);
}
run().catch(e => { console.error(e); process.exit(1); });

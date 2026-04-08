/**
 * seed-all-providers.js
 *
 * Bulk-seeds the providers table from Google Places Nearby Search API.
 *
 * Two modes:
 *
 *   CITY MODE (default, legacy):
 *     npm run seed:providers
 *     Uses the hand-curated SEED_CITIES list (major metros).
 *
 *   NATIONAL MODE (state-by-state, 200/state target):
 *     npm run seed:national              Full 50-state pass
 *     npm run seed:topup                 Only states under 200 confirmed
 *     npm run seed:state -- --state TX   Single state
 *
 *     Loads cities from data/2023_Gaz_place_national.txt (Census Gazetteer).
 *     Inserts with is_active=false and is_medical_aesthetic=null so the
 *     classifier (classify-medspa.js) can promote confirmed med spas later.
 *     Uses ignoreDuplicates: true — existing rows are never touched.
 *
 * Required env vars (set in .env):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   GOOGLE_PLACES_SERVER_KEY   ← server-side unrestricted key
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve as resolvePath } from 'node:path';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_SERVER_KEY;
if (!GOOGLE_API_KEY) {
  console.error('Missing GOOGLE_PLACES_SERVER_KEY in .env');
  process.exit(1);
}

const REFRESH = process.env.REFRESH === 'true';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── CLI arg parsing ──────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const argSet = new Set(argv);
const getArg = (flag) => {
  const i = argv.indexOf(flag);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : null;
};
const NATIONAL_MODE = argSet.has('--national');
const TOPUP = argSet.has('--topup');
const SINGLE_STATE = getArg('--state');
const MIN_SQMI = parseFloat(getArg('--min-sqmi') || '2');
const TARGET_PER_STATE = 200;

const __dirname = dirname(fileURLToPath(import.meta.url));

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Short hash from place_id to guarantee unique slugs
function shortHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36).slice(0, 6);
}

// ─── Search queries covering all procedure categories ────────────────────────

const PROCEDURE_SEARCHES = [
  // Core
  'med spa', 'medical spa', 'medspa',
  'aesthetic clinic', 'cosmetic clinic',
  'medical aesthetics', 'beauty clinic',
  // Neurotoxin
  'botox clinic', 'botox injections',
  'dysport clinic', 'neurotoxin injections',
  'wrinkle injections',
  // Filler
  'lip filler', 'dermal filler',
  'juvederm clinic', 'restylane clinic',
  'filler injections',
  // Laser
  'laser skin treatment', 'laser hair removal',
  'IPL treatment', 'BBL photofacial',
  'fractional laser', 'CO2 laser',
  'laser clinic',
  // RF / Tightening
  'RF microneedling', 'Morpheus8',
  'Thermage', 'Ultherapy', 'Sofwave',
  'skin tightening clinic',
  // Microneedling
  'microneedling', 'PRP microneedling',
  'vampire facial',
  // Body
  'CoolSculpting', 'body contouring',
  'fat reduction clinic', 'Kybella',
  'Emsculpt', 'body sculpting',
  // GLP-1 / Weight Loss
  'semaglutide clinic', 'GLP-1 clinic',
  'Ozempic clinic', 'Wegovy clinic',
  'tirzepatide clinic', 'weight loss clinic',
  'medical weight loss',
  'compounded semaglutide',
  // Skin
  'HydraFacial', 'chemical peel',
  'dermaplaning', 'medical facial',
  'microdermabrasion',
  // Hair
  'PRP hair treatment', 'hair restoration',
  'hair loss treatment',
  // Hormone / Wellness
  'hormone therapy clinic',
  'hormone replacement',
  'testosterone clinic',
  'IV therapy clinic',
  'vitamin injection clinic',
  'NAD therapy',
  // Specialty
  'PDO thread lift', 'Sculptra clinic',
  'sclerotherapy', 'PRP injections',
  'platelet rich plasma',
  // Broad
  'cosmetic injections', 'nurse injector',
  'cosmetic dermatology', 'dermatologist',
  'aesthetic dermatology', 'skin clinic',
  'anti-aging clinic',
];

// ─── Query → category tag mapping ────────────────────────────────────────────

const QUERY_TO_TAGS = {
  'med spa':              ['general'],
  'medical spa':          ['general'],
  'medspa':               ['general'],
  'aesthetic clinic':     ['general'],
  'cosmetic clinic':      ['general'],
  'medical aesthetics':   ['general'],
  'beauty clinic':        ['general'],

  'botox clinic':           ['neurotoxin'],
  'botox injections':       ['neurotoxin'],
  'dysport clinic':         ['neurotoxin'],
  'neurotoxin injections':  ['neurotoxin'],
  'wrinkle injections':     ['neurotoxin'],

  'lip filler':         ['filler'],
  'dermal filler':      ['filler'],
  'juvederm clinic':    ['filler'],
  'restylane clinic':   ['filler'],
  'filler injections':  ['filler'],

  'laser skin treatment': ['laser'],
  'laser hair removal':   ['laser'],
  'IPL treatment':        ['laser'],
  'BBL photofacial':      ['laser'],
  'fractional laser':     ['laser'],
  'CO2 laser':            ['laser'],
  'laser clinic':         ['laser'],

  'RF microneedling':       ['rf-tightening', 'microneedling'],
  'Morpheus8':              ['rf-tightening', 'microneedling'],
  'Thermage':               ['rf-tightening'],
  'Ultherapy':              ['rf-tightening'],
  'Sofwave':                ['rf-tightening'],
  'skin tightening clinic': ['rf-tightening'],

  'microneedling':      ['microneedling'],
  'PRP microneedling':  ['microneedling'],
  'vampire facial':     ['microneedling'],

  'CoolSculpting':        ['body'],
  'body contouring':      ['body'],
  'fat reduction clinic': ['body'],
  'Kybella':              ['body'],
  'Emsculpt':             ['body'],
  'body sculpting':       ['body'],

  'semaglutide clinic':     ['weight-loss'],
  'GLP-1 clinic':           ['weight-loss'],
  'Ozempic clinic':         ['weight-loss'],
  'Wegovy clinic':          ['weight-loss'],
  'tirzepatide clinic':     ['weight-loss'],
  'weight loss clinic':     ['weight-loss'],
  'medical weight loss':    ['weight-loss'],
  'compounded semaglutide': ['weight-loss'],

  'HydraFacial':        ['skin'],
  'chemical peel':      ['skin'],
  'dermaplaning':        ['skin'],
  'medical facial':     ['skin'],
  'microdermabrasion':  ['skin'],

  'PRP hair treatment':   ['hair'],
  'hair restoration':     ['hair'],
  'hair loss treatment':  ['hair'],

  'hormone therapy clinic': ['hormone'],
  'hormone replacement':    ['hormone'],
  'testosterone clinic':    ['hormone'],
  'IV therapy clinic':      ['iv-wellness'],
  'vitamin injection clinic': ['iv-wellness'],
  'NAD therapy':            ['iv-wellness'],

  'PDO thread lift':      ['specialty'],
  'Sculptra clinic':      ['specialty'],
  'sclerotherapy':        ['specialty'],
  'PRP injections':       ['specialty'],
  'platelet rich plasma': ['specialty'],

  'cosmetic injections':    ['general', 'neurotoxin', 'filler'],
  'nurse injector':         ['general', 'neurotoxin', 'filler'],
  'cosmetic dermatology':   ['general', 'laser', 'skin'],
  'dermatologist':          ['general', 'laser', 'skin'],
  'aesthetic dermatology':  ['general', 'laser', 'skin'],
  'skin clinic':            ['general', 'skin'],
  'anti-aging clinic':      ['general', 'skin', 'rf-tightening'],
};

// ─── Seed cities (phase 1) ──────────────────────────────────────────────────

const SEED_CITIES = [
  // Louisiana (home market)
  { city: 'New Orleans',    state: 'LA', lat: 29.9511, lng: -90.0715 },
  { city: 'Metairie',       state: 'LA', lat: 29.9799, lng: -90.1791 },
  { city: 'Mandeville',     state: 'LA', lat: 30.3688, lng: -90.0651 },
  { city: 'Covington',      state: 'LA', lat: 30.4754, lng: -90.1007 },
  { city: 'Baton Rouge',    state: 'LA', lat: 30.4515, lng: -91.1871 },
  { city: 'Shreveport',     state: 'LA', lat: 32.5252, lng: -93.7502 },
  { city: 'Lafayette',      state: 'LA', lat: 30.2241, lng: -92.0198 },
  // Southeast
  { city: 'Houston',        state: 'TX', lat: 29.7604, lng: -95.3698 },
  { city: 'The Woodlands',  state: 'TX', lat: 30.1658, lng: -95.4613 },
  { city: 'Dallas',         state: 'TX', lat: 32.7767, lng: -96.7970 },
  { city: 'Plano',          state: 'TX', lat: 33.0198, lng: -96.6989 },
  { city: 'Scottsdale',     state: 'AZ', lat: 33.4942, lng: -111.9261 },
  { city: 'Atlanta',        state: 'GA', lat: 33.7490, lng: -84.3880 },
  { city: 'Nashville',      state: 'TN', lat: 36.1627, lng: -86.7816 },
  { city: 'Charlotte',      state: 'NC', lat: 35.2271, lng: -80.8431 },
  { city: 'Raleigh',        state: 'NC', lat: 35.7796, lng: -78.6382 },
  { city: 'Tampa',          state: 'FL', lat: 27.9506, lng: -82.4572 },
  { city: 'Miami',          state: 'FL', lat: 25.7617, lng: -80.1918 },
  { city: 'Boca Raton',     state: 'FL', lat: 26.3683, lng: -80.1289 },
  { city: 'Orlando',        state: 'FL', lat: 28.5383, lng: -81.3792 },
  { city: 'Jacksonville',   state: 'FL', lat: 30.3322, lng: -81.6557 },
  // Northeast
  { city: 'New York',       state: 'NY', lat: 40.7128, lng: -74.0060 },
  { city: 'Manhattan',      state: 'NY', lat: 40.7831, lng: -73.9712 },
  { city: 'Brooklyn',       state: 'NY', lat: 40.6782, lng: -73.9442 },
  { city: 'Boston',         state: 'MA', lat: 42.3601, lng: -71.0589 },
  { city: 'Philadelphia',   state: 'PA', lat: 39.9526, lng: -75.1652 },
  { city: 'Washington DC',  state: 'DC', lat: 38.9072, lng: -77.0369 },
  { city: 'Bethesda',       state: 'MD', lat: 38.9807, lng: -77.1007 },
  { city: 'Greenwich',      state: 'CT', lat: 41.0262, lng: -73.6282 },
  { city: 'New Canaan',     state: 'CT', lat: 41.1468, lng: -73.4951 },
  // Midwest
  { city: 'Chicago',        state: 'IL', lat: 41.8781, lng: -87.6298 },
  { city: 'Minneapolis',    state: 'MN', lat: 44.9778, lng: -93.2650 },
  { city: 'Columbus',       state: 'OH', lat: 39.9612, lng: -82.9988 },
  { city: 'Kansas City',    state: 'MO', lat: 39.0997, lng: -94.5786 },
  { city: 'St Louis',       state: 'MO', lat: 38.6270, lng: -90.1994 },
  // West
  { city: 'Los Angeles',    state: 'CA', lat: 34.0522, lng: -118.2437 },
  { city: 'Beverly Hills',  state: 'CA', lat: 34.0736, lng: -118.4004 },
  { city: 'San Diego',      state: 'CA', lat: 32.7157, lng: -117.1611 },
  { city: 'San Francisco',  state: 'CA', lat: 37.7749, lng: -122.4194 },
  { city: 'Seattle',        state: 'WA', lat: 47.6062, lng: -122.3321 },
  { city: 'Portland',       state: 'OR', lat: 45.5051, lng: -122.6750 },
  { city: 'Denver',         state: 'CO', lat: 39.7392, lng: -104.9903 },
  { city: 'Phoenix',        state: 'AZ', lat: 33.4484, lng: -112.0740 },
  { city: 'Las Vegas',      state: 'NV', lat: 36.1699, lng: -115.1398 },
  { city: 'Salt Lake City', state: 'UT', lat: 40.7608, lng: -111.8910 },
  // Additional high-value suburbs
  { city: 'Naperville',     state: 'IL', lat: 41.7508, lng: -88.1535 },
  { city: 'Frisco',         state: 'TX', lat: 33.1507, lng: -96.8236 },
  { city: 'Alpharetta',     state: 'GA', lat: 34.0754, lng: -84.2941 },
  { city: 'Franklin',       state: 'TN', lat: 35.9251, lng: -86.8689 },
  { city: 'Coral Gables',   state: 'FL', lat: 25.7215, lng: -80.2684 },
];

// ─── Google Places Nearby Search ─────────────────────────────────────────────

async function searchPlaces(query, lat, lng) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
  url.searchParams.set('location', `${lat},${lng}`);
  url.searchParams.set('radius', '25000');
  url.searchParams.set('keyword', query);
  url.searchParams.set('type', 'health|beauty_salon|spa');
  url.searchParams.set('key', GOOGLE_API_KEY);

  const res = await fetch(url);
  const json = await res.json();
  let results = json.results || [];

  // Handle pagination (up to 60 results across 3 pages)
  let nextPageToken = json.next_page_token;
  while (nextPageToken) {
    await sleep(2000); // Required delay for page token to activate
    url.searchParams.set('pagetoken', nextPageToken);
    const nextRes = await fetch(url);
    const nextJson = await nextRes.json();
    results = results.concat(nextJson.results || []);
    nextPageToken = nextJson.next_page_token;
  }

  return results;
}

// ─── Parse city from vicinity / formatted_address ────────────────────────────
// Nearby Search returns `vicinity` ("123 Main St, New Orleans") — no state/zip.
// We use the seed city's known state as fallback.

function parseAddress(address, seedCity, seedState) {
  const parts = address.split(',').map((s) => s.trim());
  let city = seedCity;
  let state = seedState;
  let zip = '';

  // Try to extract city from the last comma-separated part of vicinity
  // e.g. "3501 Severn Ave, Metairie" → city = "Metairie"
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1];
    // If last part looks like a state+zip (from formatted_address), parse it
    const stateZipMatch = lastPart.match(/^([A-Z]{2})\s*(\d{5})?$/);
    if (stateZipMatch) {
      state = stateZipMatch[1];
      zip = stateZipMatch[2] || '';
      // City is one part before
      if (parts.length >= 3) city = parts[parts.length - 2];
    } else if (!/^\d/.test(lastPart) && lastPart.length > 1 && lastPart.length < 40) {
      // Last part is likely city name (not a street number)
      city = lastPart;
    }
  }

  return { city, state, zip };
}

// ─── Upsert batch to Supabase ────────────────────────────────────────────────

async function upsertProviders(providerRows) {
  if (providerRows.length === 0) return;

  // Upsert in batches of 50
  for (let i = 0; i < providerRows.length; i += 50) {
    const batch = providerRows.slice(i, i + 50);
    const { error } = await supabase
      .from('providers')
      .upsert(batch, {
        onConflict: 'google_place_id',
        ignoreDuplicates: false, // update rating/count on re-seed
      });

    if (error) {
      console.error(`  Upsert error (batch ${i / 50 + 1}):`, error.message);
    }
  }
}

// ─── Main seed loop ──────────────────────────────────────────────────────────

async function runSeed() {
  console.log(`\nGlowBuddy Provider Seed`);
  console.log(`Mode: ${REFRESH ? 'REFRESH (update existing)' : 'INITIAL SEED'}`);
  console.log(`Cities: ${SEED_CITIES.length}`);
  console.log(`Queries per city: ${PROCEDURE_SEARCHES.length}\n`);

  const globalPlaceIds = new Set();
  let totalNew = 0;

  for (const seedCity of SEED_CITIES) {
    console.log(`\n--- ${seedCity.city} ---`);

    // Track all places + which queries found them
    const cityPlaces = new Map();       // place_id → place object
    const placeQueryTags = new Map();   // place_id → Set<tag>

    for (const query of PROCEDURE_SEARCHES) {
      try {
        const places = await searchPlaces(query, seedCity.lat, seedCity.lng);
        const tags = QUERY_TO_TAGS[query] || ['general'];

        for (const place of places) {
          if (!place.place_id) continue;

          if (!cityPlaces.has(place.place_id)) {
            cityPlaces.set(place.place_id, place);
            placeQueryTags.set(place.place_id, new Set());
          }
          tags.forEach((t) => placeQueryTags.get(place.place_id).add(t));
        }

        process.stdout.write('.');
        await sleep(300); // rate limit between queries
      } catch (err) {
        console.error(`\n  Error on "${query}": ${err.message}`);
        await sleep(2000); // back off on error
      }
    }

    // Build rows for upsert
    const rows = [];
    for (const [placeId, place] of cityPlaces) {
      const isNew = !globalPlaceIds.has(placeId);
      globalPlaceIds.add(placeId);

      const address = place.formatted_address || place.vicinity || '';
      const parsed = parseAddress(address, seedCity.city, seedCity.state);

      const procedureTags = Array.from(placeQueryTags.get(placeId) || []);
      const placeTypes = place.types || [];

      const slug = slugify(`${place.name}-${parsed.city}-${parsed.state}`) + '-' + shortHash(placeId);

      rows.push({
        name: place.name,
        slug,
        google_place_id: placeId,
        provider_type: 'Med Spa (Non-Physician)',
        lat: place.geometry?.location?.lat ?? null,
        lng: place.geometry?.location?.lng ?? null,
        address,
        city: parsed.city,
        state: parsed.state,
        zip_code: parsed.zip || '00000',
        google_rating: place.rating ?? null,
        google_review_count: place.user_ratings_total ?? null,
        is_claimed: false,
        is_verified: false,
        procedure_tags: procedureTags,
        place_types: placeTypes,
        seed_city: seedCity.city,
        photo_reference: place.photos?.[0]?.photo_reference ?? null,
        last_google_sync: new Date().toISOString(),
      });

      if (isNew) totalNew++;
    }

    await upsertProviders(rows);
    console.log(
      `\n  ${seedCity.city}: ${cityPlaces.size} providers (${rows.length} upserted, ${cityPlaces.size - rows.length} skipped)`,
    );

    await sleep(500); // pause between cities
  }

  console.log(`\n\nSeed complete.`);
  console.log(`Total unique place IDs: ${globalPlaceIds.size}`);
  console.log(`New providers: ${totalNew}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// NATIONAL MODE (state-by-state, 200/state target)
// ═══════════════════════════════════════════════════════════════════════════

const ALL_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

function loadCensusCities() {
  const filePath = resolvePath(__dirname, '..', 'data', '2023_Gaz_place_national.txt');
  const raw = readFileSync(filePath, 'utf-8');
  const lines = raw.trim().split('\n');
  const headers = lines[0].split('\t').map((h) => h.trim());

  const idx = {
    usps: headers.indexOf('USPS'),
    name: headers.indexOf('NAME'),
    lsad: headers.indexOf('LSAD'),
    aland_sqmi: headers.indexOf('ALAND_SQMI'),
    lat: headers.indexOf('INTPTLAT'),
    lng: headers.indexOf('INTPTLONG'),
  };

  return lines
    .slice(1)
    .map((line) => {
      const cols = line.split('\t').map((c) => c.trim());
      return {
        state: cols[idx.usps],
        name: cols[idx.name],
        lsad: cols[idx.lsad],
        aland_sqmi: parseFloat(cols[idx.aland_sqmi]) || 0,
        lat: parseFloat(cols[idx.lat]) || 0,
        lng: parseFloat(cols[idx.lng]) || 0,
      };
    })
    .filter((c) => c.lat && c.lng && c.state);
}

async function getConfirmedCountsByState() {
  const counts = {};
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('providers')
      .select('state')
      .eq('is_active', true)
      .eq('is_medical_aesthetic', true)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) {
      if (row.state) counts[row.state] = (counts[row.state] || 0) + 1;
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return counts;
}

async function getCachedPlaceIds() {
  const ids = new Set();
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('providers')
      .select('google_place_id')
      .not('google_place_id', 'is', null)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const row of data) {
      if (row.google_place_id) ids.add(row.google_place_id);
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return ids;
}

async function upsertNationalBatch(rows) {
  if (rows.length === 0) return 0;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { error } = await supabase.from('providers').upsert(batch, {
      onConflict: 'google_place_id',
      ignoreDuplicates: true, // never touch existing rows
    });
    if (error) {
      console.error(`  Upsert error: ${error.message}`);
    } else {
      inserted += batch.length;
    }
  }
  return inserted;
}

async function seedStateNational(stateCode, censusCities, cachedIds, currentCount) {
  const needed = TARGET_PER_STATE - currentCount;
  if (needed <= 0) {
    console.log(`${stateCode}: already has ${currentCount} confirmed, skipping`);
    return 0;
  }

  console.log(`\n${stateCode}: need ${needed} more (have ${currentCount})`);

  const stateCities = censusCities
    .filter((c) => c.state === stateCode)
    .sort((a, b) => b.aland_sqmi - a.aland_sqmi);

  if (stateCities.length === 0) {
    console.log(`${stateCode}: no cities found in Census data`);
    return 0;
  }

  const seenPlaceIds = new Set();
  const candidateRows = [];

  for (const city of stateCities) {
    if (candidateRows.length >= needed * 3) break;

    let cityFound = 0;
    for (const query of PROCEDURE_SEARCHES) {
      try {
        const places = await searchPlaces(query, city.lat, city.lng);
        const tags = QUERY_TO_TAGS[query] || ['general'];

        for (const place of places) {
          const placeId = place.place_id;
          if (!placeId) continue;
          if (cachedIds.has(placeId)) continue;
          if (seenPlaceIds.has(placeId)) continue;
          if (place.business_status && place.business_status !== 'OPERATIONAL') continue;

          const address = place.formatted_address || place.vicinity || '';
          const parsed = parseAddress(address, city.name, stateCode);
          const slug =
            slugify(`${place.name}-${parsed.city}-${parsed.state}`) + '-' + shortHash(placeId);

          candidateRows.push({
            name: place.name,
            slug,
            google_place_id: placeId,
            provider_type: 'Med Spa (Non-Physician)',
            lat: place.geometry?.location?.lat ?? null,
            lng: place.geometry?.location?.lng ?? null,
            address,
            city: parsed.city,
            state: parsed.state,
            zip_code: parsed.zip || '00000',
            google_rating: place.rating ?? null,
            google_review_count: place.user_ratings_total ?? null,
            is_claimed: false,
            is_verified: false,
            is_active: false,
            is_medical_aesthetic: null,
            procedure_tags: tags,
            place_types: place.types || [],
            seed_city: city.name,
            photo_reference: place.photos?.[0]?.photo_reference ?? null,
            last_google_sync: new Date().toISOString(),
          });

          seenPlaceIds.add(placeId);
          cachedIds.add(placeId);
          cityFound++;
        }
        await sleep(300);
      } catch (err) {
        console.error(`  Error on "${query}" in ${city.name}: ${err.message}`);
        await sleep(2000);
      }
    }

    console.log(
      `  ${city.name} (${city.aland_sqmi.toFixed(1)} sqmi): +${cityFound} new / ${candidateRows.length} total`,
    );

    if (candidateRows.length >= needed * 3) {
      console.log(`  ${stateCode}: reached ${candidateRows.length} candidates, stopping search`);
      break;
    }

    await sleep(500);
  }

  if (candidateRows.length === 0) {
    console.log(`${stateCode}: no new candidates found`);
    return 0;
  }

  const inserted = await upsertNationalBatch(candidateRows);
  console.log(`${stateCode}: inserted ${inserted} candidates (awaiting classification)`);
  return inserted;
}

async function runNationalSeed() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   GlowBuddy National Provider Seed         ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`Mode:    ${TOPUP ? 'TOPUP' : SINGLE_STATE ? `SINGLE STATE (${SINGLE_STATE.toUpperCase()})` : 'FULL 50-STATE'}`);
  console.log(`Target:  ${TARGET_PER_STATE} confirmed per state`);
  console.log(`Min sqmi filter: ${MIN_SQMI}`);

  console.log('\nLoading Census city data...');
  const allCities = loadCensusCities();
  const cities = allCities.filter((c) => c.aland_sqmi >= MIN_SQMI);
  console.log(
    `Loaded ${allCities.length} places, filtered to ${cities.length} with ALAND_SQMI >= ${MIN_SQMI}`,
  );

  console.log('\nChecking existing providers...');
  const existing = await getConfirmedCountsByState();
  const cachedIds = await getCachedPlaceIds();

  const total = Object.values(existing).reduce((a, b) => a + b, 0);
  console.log(`Confirmed active med spas: ${total} across ${Object.keys(existing).length} states`);
  console.log(`Cached Google place IDs (all providers): ${cachedIds.size}`);

  let statesToProcess;
  if (SINGLE_STATE) {
    statesToProcess = [SINGLE_STATE.toUpperCase()];
  } else if (TOPUP) {
    statesToProcess = ALL_STATES.filter((s) => (existing[s] || 0) < TARGET_PER_STATE);
    console.log(`Top-up mode: ${statesToProcess.length} states under ${TARGET_PER_STATE}`);
  } else {
    statesToProcess = [...ALL_STATES].sort((a, b) => (existing[a] || 0) - (existing[b] || 0));
  }

  let totalInserted = 0;
  for (const state of statesToProcess) {
    const current = existing[state] || 0;
    try {
      const inserted = await seedStateNational(state, cities, cachedIds, current);
      totalInserted += inserted;
    } catch (err) {
      console.error(`State ${state} failed: ${err.message}`);
    }
  }

  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   NATIONAL SEED COMPLETE                    ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`New candidates added: ${totalInserted}`);
  console.log(`Next step: npm run classify`);
}

// ═══════════════════════════════════════════════════════════════════════════
// Entry point — dispatch to city or national mode
// ═══════════════════════════════════════════════════════════════════════════

const entry = NATIONAL_MODE ? runNationalSeed : runSeed;
entry().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

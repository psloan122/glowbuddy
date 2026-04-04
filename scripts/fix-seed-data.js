/**
 * GlowBuddy Seed Data Fix Script (v2)
 *
 * The initial verify-seed-data.js script identified correct Google matches but
 * all DB updates failed because migration 009 (verification columns) was never applied.
 * This script uses ONLY existing columns (provider_name, google_place_id, provider_address,
 * lat, lng) and handles every provider:
 *
 * 1. Renames all fictional names to their real Google-verified names
 * 2. Replaces bad matches (weight loss clinic, nail studio, urgent care) with real med spas
 * 3. Replaces duplicates (two providers → same business) with unique businesses
 * 4. Sets google_place_id + provider_address + lat/lng for all seed rows
 *
 * Usage: node --env-file=.env scripts/fix-seed-data.js
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const GOOGLE_API_KEY = process.env.VITE_GOOGLE_PLACES_KEY || process.env.VITE_GOOGLE_MAPS_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!GOOGLE_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function searchGoogle(query) {
  const params = new URLSearchParams({ query, key: GOOGLE_API_KEY });
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status === 'REQUEST_DENIED') {
    console.error('Google API error:', data.error_message);
    process.exit(1);
  }
  return data.results || [];
}

function isAestheticsBusiness(result) {
  const name = result.name.toLowerCase();
  const types = (result.types || []).join(' ').toLowerCase();
  const good = ['aestheti', 'med spa', 'medspa', 'skin', 'beauty', 'cosmetic', 'dermatolog', 'laser', 'injection', 'botox', 'filler', 'glow', 'rejuvenat', 'wellness', 'facial'];
  const bad = ['weight loss', 'nail', 'urgent care', 'immediate care', 'veterinar', 'dental', 'auto'];
  if (bad.some((kw) => name.includes(kw))) return false;
  return good.some((kw) => name.includes(kw)) || types.includes('beauty_salon') || types.includes('spa');
}

function inCity(city, state, address) {
  const addr = address.toLowerCase();
  const s = state.toUpperCase();
  return addr.includes(city.toLowerCase()) && (address.includes(`, ${s} `) || address.includes(`, ${s},`));
}

async function findMedSpasInCity(city, state, count, excludeNames) {
  const queries = [
    `med spa aesthetics ${city} ${state}`,
    `cosmetic injections medspa ${city} ${state}`,
    `botox filler med spa ${city} ${state}`,
  ];
  const found = [];
  const usedIds = new Set();

  for (const q of queries) {
    if (found.length >= count) break;
    console.log(`  Searching: "${q}"...`);
    const results = await searchGoogle(q);
    await sleep(300);
    for (const r of results) {
      if (found.length >= count) break;
      if (usedIds.has(r.place_id)) continue;
      if (excludeNames.has(r.name)) continue;
      if (!inCity(city, state, r.formatted_address)) continue;
      if (!isAestheticsBusiness(r)) continue;
      usedIds.add(r.place_id);
      found.push(r);
      console.log(`    Found: "${r.name}" (${r.rating || 'N/A'})`);
    }
  }
  return found;
}

// Update all seed rows for a given provider (by current name + city + state)
async function updateProvider(currentName, city, state, newName, placeId, address, lat, lng) {
  const { data: rows, error } = await supabase
    .from('procedures')
    .select('id')
    .eq('provider_name', currentName)
    .eq('city', city)
    .eq('state', state)
    .eq('is_seed', true);

  if (error) {
    console.log(`  ERROR selecting "${currentName}": ${error.message}`);
    return 0;
  }
  if (!rows || rows.length === 0) {
    console.log(`  No rows for "${currentName}" in ${city}, ${state}`);
    return 0;
  }

  const updateData = {
    provider_name: newName,
    google_place_id: placeId,
    provider_address: address,
    lat: lat || null,
    lng: lng || null,
  };

  let updated = 0;
  for (const row of rows) {
    const { error: ue } = await supabase.from('procedures').update(updateData).eq('id', row.id);
    if (ue) {
      console.log(`  ERROR updating row ${row.id}: ${ue.message}`);
    } else {
      updated++;
    }
  }
  return updated;
}

async function main() {
  console.log('\n=== GLOWBUDDY SEED DATA FIX (v2) ===\n');

  const changes = [];

  // ──────────────────────────────────────────────
  // KNOWN GOOD MATCHES (from verify script results)
  // These were verified against Google but DB was never updated.
  // ──────────────────────────────────────────────

  const knownGood = [
    // Exact name matches
    { from: 'Highland Park Aesthetics', to: 'Highland Park Aesthetics', city: 'Dallas', state: 'TX',
      pid: 'ChIJp0L3I22fToYRl2qAm90DTUw', addr: '5213 W Lovers Ln, Dallas, TX 75209, USA', lat: 32.8399, lng: -96.8176 },
    { from: 'Beverly Hills Aesthetics', to: 'Beverly Hills Aesthetics', city: 'Los Angeles', state: 'CA',
      pid: 'ChIJdaHFtOS7woAR1FxwRyGmwPY', addr: '640 S San Vicente Blvd Ste 210, Los Angeles, CA 90048, USA', lat: 34.0712, lng: -118.3770 },
    { from: 'Belle Meade Aesthetics', to: 'Belle Meade Aesthetics', city: 'Nashville', state: 'TN',
      pid: 'ChIJr-ua5PRiZIgRtf7m87pAVv4', addr: '6598-A TN-100, Nashville, TN 37205, USA', lat: 36.0957, lng: -86.8877 },

    // Verified matches (rename to Google name)
    { from: 'Midtown Skin Studio', to: 'Millennial Skin Studio and Spa', city: 'Atlanta', state: 'GA',
      pid: 'ChIJpVha0D0F9YgRWmJOCr6dsIo', addr: 'Salon Lofts, 77 12th St NE loft 9, Atlanta, GA 30309, USA', lat: 33.7833, lng: -84.3833 },
    { from: 'Buckhead Aesthetics', to: 'Facial Aesthetics', city: 'Atlanta', state: 'GA',
      pid: 'ChIJwfiqahAF9YgRUTEE6BRyQJg', addr: '2975 N Fulton Dr NE, Atlanta, GA 30305, USA', lat: 33.8424, lng: -84.3637 },
    { from: 'SouthPark Aesthetics', to: 'South Park Skincare', city: 'Charlotte', state: 'NC',
      pid: 'ChIJN3LjRhSeVogRnLhPSnzMrUw', addr: '6831 Fairview Rd # B, Charlotte, NC 28210, USA', lat: 35.1532, lng: -80.8518 },
    { from: 'Gold Coast Aesthetics', to: 'GOLDCOAST medspa', city: 'Chicago', state: 'IL',
      pid: 'ChIJx19MXa0sDogRy7I0TQY78L4', addr: '233 E Erie St Suite #100, Chicago, IL 60611, USA', lat: 41.8938, lng: -87.6213 },
    { from: 'Lincoln Park Skin Studio', to: 'Skin Studio Chicago', city: 'Chicago', state: 'IL',
      pid: 'ChIJJ9dOlLvSD4gRgWtWuShZJK8', addr: '2245 W North Ave, Chicago, IL 60647, USA', lat: 41.9103, lng: -87.6843 },
    { from: 'Uptown Dallas Med Spa', to: "Mara's Med Spa", city: 'Dallas', state: 'TX',
      pid: 'ChIJVTgC-i-ZToYRnhM8bs_V0V8', addr: '2222 McKinney Ave Unit 120, Dallas, TX 75201, USA', lat: 32.7975, lng: -96.8011 },
    { from: 'LoDo Med Spa', to: 'VIVE Med Spa', city: 'Denver', state: 'CO',
      pid: 'ChIJkYnubS15bIcRXX-XXMPNIHs', addr: '2353 15th St, Denver, CO 80202, USA', lat: 39.7526, lng: -105.0072 },
    { from: 'Cherry Creek Aesthetics', to: 'Cherry Creek Med Spa', city: 'Denver', state: 'CO',
      pid: 'ChIJRTPXJQ9_bIcRG1KMpYEp0bY', addr: '90 Madison St #307, Denver, CO 80206, USA', lat: 39.7186, lng: -104.9526 },
    { from: 'Houston Skin Center', to: 'Texas Skin Center', city: 'Houston', state: 'TX',
      pid: 'ChIJB0vJ-83BQIYRc8xHwNssEUU', addr: '4101 Greenbriar Dr Suite #305, Houston, TX 77098, USA', lat: 29.7282, lng: -95.4193 },
    { from: 'River Oaks Med Spa', to: 'River Oaks MedSpa', city: 'Houston', state: 'TX',
      pid: 'ChIJL1LGdR3BQIYR5MvMIclvRtM', addr: '3100 Timmons Ln # 100, Houston, TX 77027, USA', lat: 29.7373, lng: -95.4413 },
    { from: 'Galleria Aesthetics', to: 'Galleria Aesthetics and Wellness', city: 'Houston', state: 'TX',
      pid: 'ChIJ8ZwATWTBQIYRDDFvSI-MUIw', addr: '5373 W Alabama St #120, Houston, TX 77056, USA', lat: 29.7399, lng: -95.4624 },
    { from: 'Northshore Glow', to: 'Louisiana Glow', city: 'Mandeville', state: 'LA',
      pid: 'ChIJccUbj6JcJ4YREx0YQbGKXu8', addr: '1901 US-190 Suite 20, Mandeville, LA 70448, USA', lat: 30.3783, lng: -90.0668 },
    { from: 'Lakeside Aesthetics', to: 'The Esthetic', city: 'Metairie', state: 'LA',
      pid: 'ChIJ5RxZSiKxIIYR2RXlh4k9Zok', addr: '3301 Veterans Memorial Blvd # 137, Metairie, LA 70002, USA', lat: 30.0049, lng: -90.1600 },
    { from: 'Brickell Beauty Bar', to: 'The Miami Beauty Bar', city: 'Miami', state: 'FL',
      pid: 'ChIJb_zsvLq32YgRxyPRWX_6gok', addr: '1800 SW 1st Ave Suite 303, Miami, FL 33129, USA', lat: 25.7582, lng: -80.1993 },
    { from: 'South Beach Aesthetics', to: 'Miami Beach Laser & Aesthetics', city: 'Miami Beach', state: 'FL',
      pid: 'ChIJS4dcz66z2YgRhj8_hQOVv5E', addr: '4302 Alton Rd Suite 740, Miami Beach, FL 33140, USA', lat: 25.8153, lng: -80.1418 },
    { from: 'Uptown Injections', to: 'Uptown Wellness + Aesthetics', city: 'New Orleans', state: 'LA',
      pid: 'ChIJEyfvLHalIIYRtCJPdx8CW90', addr: '4712 Magazine St, New Orleans, LA 70115, USA', lat: 29.9255, lng: -90.1009 },
    { from: 'Upper East Side Dermatology', to: 'The Dermatology Specialists - Upper East Side', city: 'New York', state: 'NY',
      pid: 'ChIJJ_NRA6RZwokRptypTme-T2Q', addr: '1425 2nd Ave, New York, NY 10021, USA', lat: 40.7697, lng: -73.9567 },
    { from: 'Tribeca Skin Studio', to: 'Tribeca Skin Center', city: 'New York', state: 'NY',
      pid: 'ChIJ5cuj9IpZwokRBQ6v4sS0HLw', addr: '315 Church St 2nd floor, New York, NY 10013, USA', lat: 40.7189, lng: -74.0035 },
    { from: 'Manhattan Aesthetics Group', to: 'Manhattan Aesthetics', city: 'New York', state: 'NY',
      pid: 'ChIJ7ShvlQBZwokRoDcuq64fg6Q', addr: '36 E 36th St 2nd Floor, New York, NY 10016, USA', lat: 40.7497, lng: -73.9818 },
    { from: 'Desert Bloom Med Spa', to: 'Desert Bloom Skin Care', city: 'Scottsdale', state: 'AZ',
      pid: 'ChIJt4Hnjj11K4cRP_lrpKgB78M', addr: '10752 N 89th Pl #122b, Scottsdale, AZ 85260, USA', lat: 33.5862, lng: -111.8797 },
    { from: 'Old Town Aesthetics', to: 'The Old Town Esthetician', city: 'Scottsdale', state: 'AZ',
      pid: 'ChIJJ-DeRLJ1K4cRwmWZZqvOM8o', addr: '7373 E Scottsdale Mall Suite 9, Scottsdale, AZ 85251, USA', lat: 33.4934, lng: -111.9235 },
    { from: 'Woodlands Wellness Spa', to: 'Woodhouse Spa - The Woodlands', city: 'The Woodlands', state: 'TX',
      pid: 'ChIJ3w6wRC43R4YR-JlO6y3vJPA', addr: '9595 Six Pines Dr #1270, The Woodlands, TX 77380, USA', lat: 30.1606, lng: -95.4585 },

    // Replacements from verify script (no_match → found replacement, but DB never updated)
    { from: 'Queen City Med Spa', to: 'Infinity MedSpa and Wellness', city: 'Charlotte', state: 'NC',
      pid: 'ChIJHQrMMxSeVogRhW21QWOsTSo', addr: '2809 Coltsgate Rd #100, Charlotte, NC 28211, USA', lat: 35.1641, lng: -80.8128 },
    { from: 'Coral Gables Med Spa', to: 'The Aesthetics MD & Wellness', city: 'Coral Gables', state: 'FL',
      pid: 'ChIJ99Qx7oS32YgRTN4PpSiVN7s', addr: '747 Ponce de Leon Blvd STE 501, Coral Gables, FL 33134, USA', lat: 25.7622, lng: -80.2586 },
    { from: 'West Hollywood Med Spa', to: 'Cienega Medical', city: 'Los Angeles', state: 'CA',
      pid: 'ChIJDUvh60W5woARpc9QXPcqgzQ', addr: '375 N La Cienega Blvd, Los Angeles, CA 90048, USA', lat: 34.0745, lng: -118.3762 },
    { from: 'Music City Med Spa', to: 'ElaMar Nashville', city: 'Nashville', state: 'TN',
      pid: 'ChIJzWRlxBZhZIgRF5Byvi9iFng', addr: '4101 Charlotte Ave Suite G100, Nashville, TN 37209, USA', lat: 36.1538, lng: -86.8386 },

    // The Glow Lounge → Belle Aesthetics (valid match, keep this one)
    { from: 'The Glow Lounge', to: 'Belle Aesthetics', city: 'New Orleans', state: 'LA',
      pid: 'ChIJ44JWzSCvIIYReV3dHWv1iYo', addr: '225 W Harrison Ave Unit C, New Orleans, LA 70124, USA', lat: 30.0057, lng: -90.1009 },
  ];

  // ──────────────────────────────────────────────
  // PHASE 1: Apply all known-good matches
  // ──────────────────────────────────────────────

  console.log('--- PHASE 1: Apply known-good matches ---\n');

  for (const m of knownGood) {
    const label = m.from === m.to ? 'place data' : `"${m.to}"`;
    const count = await updateProvider(m.from, m.city, m.state, m.to, m.pid, m.addr, m.lat, m.lng);
    if (count > 0) {
      const action = m.from === m.to ? 'place_data' : 'renamed';
      changes.push({ action, from: m.from, to: m.to, city: m.city, state: m.state, rows: count, pid: m.pid, addr: m.addr });
      console.log(`  ${m.from === m.to ? '📍' : '📝'} "${m.from}" → ${label} (${count} rows)`);
    }
  }

  // ──────────────────────────────────────────────
  // PHASE 2: Search for replacements (bad matches)
  // ──────────────────────────────────────────────

  console.log('\n--- PHASE 2: Replace bad matches with real med spas ---\n');

  // Collect all names we've already assigned to prevent duplicates
  const usedNames = new Set(knownGood.map((m) => m.to));

  // 2a. New Orleans: need 3 unique med spas for Audubon, Crescent City, NOLA Skin
  const nolaExclude = new Set(usedNames);
  nolaExclude.add('Crescent City Weight Loss');
  nolaExclude.add('Botanical Nail and Skin Studio');

  console.log('Finding 3 real med spas in New Orleans, LA...');
  const nolaMedSpas = await findMedSpasInCity('New Orleans', 'LA', 3, nolaExclude);

  const nolaTargets = [
    { current: 'Audubon Aesthetics', city: 'New Orleans', state: 'LA' },
    { current: 'Crescent City Aesthetics', city: 'New Orleans', state: 'LA' },
    { current: 'NOLA Skin Studio', city: 'New Orleans', state: 'LA' },
  ];

  for (let i = 0; i < nolaTargets.length; i++) {
    const t = nolaTargets[i];
    if (i < nolaMedSpas.length) {
      const g = nolaMedSpas[i];
      const count = await updateProvider(t.current, t.city, t.state, g.name, g.place_id,
        g.formatted_address, g.geometry?.location?.lat, g.geometry?.location?.lng);
      changes.push({ action: 'replaced', from: t.current, to: g.name, city: t.city, state: t.state,
        rows: count, pid: g.place_id, addr: g.formatted_address, rating: g.rating });
      console.log(`  🔄 "${t.current}" → "${g.name}" (${count} rows)`);
    } else {
      console.log(`  ❌ No replacement found for "${t.current}"`);
      changes.push({ action: 'failed', from: t.current, city: t.city, state: t.state, rows: 0 });
    }
  }

  // 2b. Atlanta: need 1 med spa for Peachtree Med Spa
  const atlExclude = new Set(usedNames);
  atlExclude.add('Peachtree Immediate Care - Midtown');

  console.log('\nFinding 1 real med spa in Atlanta, GA...');
  const atlMedSpas = await findMedSpasInCity('Atlanta', 'GA', 1, atlExclude);

  if (atlMedSpas.length > 0) {
    const g = atlMedSpas[0];
    const count = await updateProvider('Peachtree Med Spa', 'Atlanta', 'GA', g.name, g.place_id,
      g.formatted_address, g.geometry?.location?.lat, g.geometry?.location?.lng);
    changes.push({ action: 'replaced', from: 'Peachtree Med Spa', to: g.name, city: 'Atlanta', state: 'GA',
      rows: count, pid: g.place_id, addr: g.formatted_address, rating: g.rating });
    console.log(`  🔄 "Peachtree Med Spa" → "${g.name}" (${count} rows)`);
  } else {
    console.log('  ❌ No replacement found for "Peachtree Med Spa"');
  }

  // ──────────────────────────────────────────────
  // PHASE 3: Regenerate seed-providers.json
  // ──────────────────────────────────────────────

  console.log('\n--- PHASE 3: Regenerate seed-providers.json ---\n');

  const { data: finalSeed, error } = await supabase
    .from('procedures')
    .select('provider_name, city, state, zip_code, google_place_id, provider_address, lat, lng')
    .eq('is_seed', true)
    .order('city');

  if (error) {
    console.error('Error fetching final state:', error.message);
  } else {
    const providerMap = new Map();
    for (const row of finalSeed) {
      const key = `${row.provider_name}|||${row.city}|||${row.state}`;
      if (!providerMap.has(key)) {
        providerMap.set(key, {
          provider_name: row.provider_name,
          city: row.city,
          state: row.state,
          zip: row.zip_code,
          google_place_id: row.google_place_id,
          address: row.provider_address,
          verified: !!row.google_place_id,
        });
      }
    }

    const jsonData = [...providerMap.values()].sort((a, b) =>
      a.city.localeCompare(b.city) || a.provider_name.localeCompare(b.provider_name)
    );

    const jsonPath = resolve(__dirname, 'seed-providers.json');
    writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
    console.log(`Wrote ${jsonData.length} providers to seed-providers.json`);

    // Check for duplicates
    const namesByCity = {};
    for (const p of jsonData) {
      const ck = `${p.city}, ${p.state}`;
      if (!namesByCity[ck]) namesByCity[ck] = [];
      namesByCity[ck].push(p.provider_name);
    }
    let dupeCount = 0;
    for (const [city, names] of Object.entries(namesByCity)) {
      const dupes = names.filter((n, i) => names.indexOf(n) !== i);
      if (dupes.length > 0) {
        console.log(`  DUPLICATE in ${city}: ${dupes.join(', ')}`);
        dupeCount += dupes.length;
      }
    }
    if (dupeCount === 0) console.log('  No duplicates found');

    // Check all have place IDs
    const noPlaceId = jsonData.filter((p) => !p.google_place_id);
    if (noPlaceId.length > 0) {
      console.log(`  ${noPlaceId.length} providers still missing google_place_id:`);
      for (const p of noPlaceId) console.log(`    - ${p.provider_name} (${p.city}, ${p.state})`);
    } else {
      console.log('  All providers have google_place_id');
    }
  }

  // ──────────────────────────────────────────────
  // Report
  // ──────────────────────────────────────────────

  console.log('\n' + '='.repeat(50));
  console.log('FIX REPORT');
  console.log('='.repeat(50));

  const placeData = changes.filter((c) => c.action === 'place_data');
  const renamed = changes.filter((c) => c.action === 'renamed');
  const replaced = changes.filter((c) => c.action === 'replaced');
  const failed = changes.filter((c) => c.action === 'failed');

  console.log(`\nPlace data added (name unchanged): ${placeData.length}`);
  console.log(`Renamed to Google name: ${renamed.length}`);
  console.log(`Replaced with different business: ${replaced.length}`);
  if (failed.length > 0) console.log(`Failed: ${failed.length}`);

  console.log(`\nTotal rows updated: ${changes.reduce((s, c) => s + (c.rows || 0), 0)}`);

  if (replaced.length > 0) {
    console.log('\nReplacements:');
    for (const c of replaced) {
      console.log(`  "${c.from}" → "${c.to}" (${c.city}, ${c.state}) [${c.rating || 'N/A'}]`);
    }
  }

  if (renamed.length > 0) {
    console.log('\nRenames:');
    for (const c of renamed) {
      console.log(`  "${c.from}" → "${c.to}" (${c.city}, ${c.state})`);
    }
  }

  console.log();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

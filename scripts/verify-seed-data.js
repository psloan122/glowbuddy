/**
 * GlowBuddy Seed Data Verification Script
 *
 * Verifies every provider in the seed data is a real, legitimate business
 * by cross-referencing against Google Places Text Search API.
 *
 * Usage: npm run verify-seed
 * Requires: VITE_GOOGLE_PLACES_KEY, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Config ---

const GOOGLE_API_KEY = process.env.VITE_GOOGLE_PLACES_KEY || process.env.VITE_GOOGLE_MAPS_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!GOOGLE_API_KEY) {
  console.error('Missing VITE_GOOGLE_PLACES_KEY or VITE_GOOGLE_MAPS_KEY');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Rate limit: 300ms between Google API calls
const DELAY_MS = 300;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Fuzzy name matching ---

function normalizeForComparison(name) {
  return name
    .toLowerCase()
    .replace(/[''""]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getSignificantWords(name) {
  const stopWords = new Set([
    'the', 'a', 'an', 'of', 'in', 'at', 'by', 'and', 'or', 'for',
    'med', 'spa', 'medspa', 'medical', 'clinic', 'center', 'studio',
    'bar', 'lounge', 'group', 'llc', 'inc', 'pc', 'md', 'do',
  ]);
  return normalizeForComparison(name)
    .split(' ')
    .filter((w) => w.length > 1 && !stopWords.has(w));
}

function fuzzyNameMatch(seedName, googleName) {
  const normSeed = normalizeForComparison(seedName);
  const normGoogle = normalizeForComparison(googleName);

  // Exact match
  if (normSeed === normGoogle) return { match: true, score: 1.0 };

  // One contains the other
  if (normGoogle.includes(normSeed) || normSeed.includes(normGoogle)) {
    return { match: true, score: 0.9 };
  }

  // Significant word overlap
  const seedWords = getSignificantWords(seedName);
  const googleWords = getSignificantWords(googleName);

  if (seedWords.length === 0 || googleWords.length === 0) {
    return { match: false, score: 0 };
  }

  const matches = seedWords.filter((w) =>
    googleWords.some((gw) => gw.includes(w) || w.includes(gw))
  );

  const score = matches.length / Math.max(seedWords.length, googleWords.length);

  return { match: score >= 0.4, score };
}

function cityMatch(seedCity, googleAddress) {
  const normCity = seedCity.toLowerCase();
  const normAddr = googleAddress.toLowerCase();
  return normAddr.includes(normCity);
}

function stateMatch(seedState, googleAddress) {
  const normState = seedState.toUpperCase();
  // Match state abbreviation in address (e.g., ", LA " or ", LA,")
  return googleAddress.includes(`, ${normState} `) || googleAddress.includes(`, ${normState},`);
}

// --- Google Places API ---

async function searchGooglePlaces(query, type) {
  const params = new URLSearchParams({
    query,
    key: GOOGLE_API_KEY,
  });
  if (type) params.set('type', type);

  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status === 'REQUEST_DENIED') {
    console.error('Google API error:', data.error_message || data.status);
    process.exit(1);
  }

  return data;
}

async function verifyProvider(provider) {
  const { provider_name, city, state } = provider;
  const searchQuery = `${provider_name} ${city} ${state}`;

  console.log(`  Searching: "${searchQuery}"...`);
  const data = await searchGooglePlaces(searchQuery);

  if (!data.results || data.results.length === 0) {
    return {
      status: 'no_match',
      provider,
      googleResult: null,
      nameScore: 0,
    };
  }

  const top = data.results[0];
  const nameResult = fuzzyNameMatch(provider_name, top.name);
  const isCityMatch = cityMatch(city, top.formatted_address);
  const isStateMatch = stateMatch(state, top.formatted_address);

  if (nameResult.match && isCityMatch && isStateMatch) {
    return {
      status: 'verified_match',
      provider,
      googleResult: top,
      nameScore: nameResult.score,
    };
  }

  if (isCityMatch && isStateMatch && !nameResult.match) {
    return {
      status: 'city_match_name_differs',
      provider,
      googleResult: top,
      nameScore: nameResult.score,
    };
  }

  return {
    status: 'no_match',
    provider,
    googleResult: top,
    nameScore: nameResult.score,
  };
}

async function findReplacement(city, state) {
  const searchQuery = `med spa botox ${city} ${state}`;
  console.log(`  Finding replacement: "${searchQuery}"...`);
  const data = await searchGooglePlaces(searchQuery);

  if (!data.results || data.results.length === 0) return null;

  // Find a result actually in the right city/state
  for (const result of data.results) {
    if (cityMatch(city, result.formatted_address) && stateMatch(state, result.formatted_address)) {
      return result;
    }
  }

  return null;
}

// --- Main ---

async function main() {
  console.log('\n=== GLOWBUDDY SEED DATA VERIFICATION ===\n');

  // 1. Fetch seed data
  const { data: seedRows, error } = await supabase
    .from('procedures')
    .select('*')
    .eq('is_seed', true)
    .order('city');

  if (error) {
    console.error('Supabase error:', error.message);
    process.exit(1);
  }

  if (!seedRows || seedRows.length === 0) {
    console.error('No seed rows found. Has seed.sql been run?');
    process.exit(1);
  }

  console.log(`Found ${seedRows.length} seed procedure rows\n`);

  // 2. Get unique providers
  const providerMap = new Map();
  for (const row of seedRows) {
    const key = `${row.provider_name}|||${row.city}|||${row.state}`;
    if (!providerMap.has(key)) {
      providerMap.set(key, {
        provider_name: row.provider_name,
        city: row.city,
        state: row.state,
        zip_code: row.zip_code,
        provider_type: row.provider_type,
        rowIds: [],
      });
    }
    providerMap.get(key).rowIds.push(row.id);
  }

  const providers = [...providerMap.values()];
  console.log(`Unique providers to verify: ${providers.length}\n`);

  // 3. Verify each provider
  const results = {
    verified_match: [],
    city_match_name_differs: [],
    no_match: [],
    replaced: [],
    removed: [],
  };

  const seedProvidersJson = [];

  for (let i = 0; i < providers.length; i++) {
    const prov = providers[i];
    console.log(`[${i + 1}/${providers.length}] ${prov.provider_name} · ${prov.city}, ${prov.state}`);

    const result = await verifyProvider(prov);
    await sleep(DELAY_MS);

    if (result.status === 'verified_match') {
      results.verified_match.push(result);
      const g = result.googleResult;

      // Update DB
      for (const id of prov.rowIds) {
        await supabase.from('procedures').update({
          google_verified: true,
          verification_status: 'verified_match',
          verified_place_id: g.place_id,
          verified_business_name: g.name,
          verified_address: g.formatted_address,
          google_place_id: g.place_id,
          provider_address: g.formatted_address,
          lat: g.geometry?.location?.lat || null,
          lng: g.geometry?.location?.lng || null,
        }).eq('id', id);
      }

      seedProvidersJson.push({
        provider_name: prov.provider_name,
        city: prov.city,
        state: prov.state,
        zip: prov.zip_code,
        google_place_id: g.place_id,
        real_address: g.formatted_address,
        google_name: g.name,
        google_rating: g.rating || null,
        verified: true,
        status: 'verified_match',
        name_score: result.nameScore,
      });

      console.log(`  ✅ Verified: "${g.name}" (score: ${result.nameScore.toFixed(2)})\n`);

    } else if (result.status === 'city_match_name_differs') {
      results.city_match_name_differs.push(result);
      const g = result.googleResult;

      // Flag for review but store the Google data
      for (const id of prov.rowIds) {
        await supabase.from('procedures').update({
          google_verified: false,
          verification_status: 'city_match_name_differs',
          verified_place_id: g.place_id,
          verified_business_name: g.name,
          verified_address: g.formatted_address,
        }).eq('id', id);
      }

      seedProvidersJson.push({
        provider_name: prov.provider_name,
        city: prov.city,
        state: prov.state,
        zip: prov.zip_code,
        google_place_id: g.place_id,
        real_address: g.formatted_address,
        google_name: g.name,
        google_rating: g.rating || null,
        verified: false,
        status: 'city_match_name_differs',
        name_score: result.nameScore,
      });

      console.log(`  ⚠️  Name differs: Google returned "${g.name}" (score: ${result.nameScore.toFixed(2)})\n`);

    } else {
      // no_match — try to find a replacement
      console.log(`  ❌ No match found`);

      const replacement = await findReplacement(prov.city, prov.state);
      await sleep(DELAY_MS);

      if (replacement) {
        results.replaced.push({ ...result, replacement });

        // Update seed rows with real business
        for (const id of prov.rowIds) {
          await supabase.from('procedures').update({
            provider_name: replacement.name,
            google_verified: true,
            verification_status: 'replaced',
            verified_place_id: replacement.place_id,
            verified_business_name: replacement.name,
            verified_address: replacement.formatted_address,
            google_place_id: replacement.place_id,
            provider_address: replacement.formatted_address,
            lat: replacement.geometry?.location?.lat || null,
            lng: replacement.geometry?.location?.lng || null,
          }).eq('id', id);
        }

        seedProvidersJson.push({
          provider_name: replacement.name,
          original_name: prov.provider_name,
          city: prov.city,
          state: prov.state,
          zip: prov.zip_code,
          google_place_id: replacement.place_id,
          real_address: replacement.formatted_address,
          google_name: replacement.name,
          google_rating: replacement.rating || null,
          verified: true,
          status: 'replaced',
          name_score: 0,
        });

        console.log(`  🔄 Replaced with: "${replacement.name}"\n`);

      } else {
        results.removed.push(result);

        // Delete seed rows with no real match
        for (const id of prov.rowIds) {
          await supabase.from('procedures').delete().eq('id', id);
        }

        seedProvidersJson.push({
          provider_name: prov.provider_name,
          city: prov.city,
          state: prov.state,
          zip: prov.zip_code,
          google_place_id: null,
          real_address: null,
          google_name: null,
          google_rating: null,
          verified: false,
          status: 'removed',
          name_score: 0,
        });

        console.log(`  🗑️  No replacement found — rows deleted\n`);
      }
    }
  }

  // 4. Write seed-providers.json
  const jsonPath = resolve(__dirname, 'seed-providers.json');
  writeFileSync(jsonPath, JSON.stringify(seedProvidersJson, null, 2));
  console.log(`\nWrote ${jsonPath}\n`);

  // 5. Print report

  const removedRowCount = results.removed.reduce((sum, r) => sum + r.provider.rowIds.length, 0);
  const totalAfter = seedRows.length - removedRowCount;

  console.log('='.repeat(50));
  console.log('=== GLOWBUDDY SEED DATA VERIFICATION REPORT ===');
  console.log('='.repeat(50));
  console.log(`Total seed providers checked: ${providers.length}`);
  console.log(`✅ Verified real businesses: ${results.verified_match.length}`);
  console.log(`⚠️  City match, name differs: ${results.city_match_name_differs.length}`);
  console.log(`❌ No match (fictional): ${results.no_match.length}`);
  console.log(`🔄 Replaced with real business: ${results.replaced.length}`);
  console.log(`🗑️  Removed (no real match found): ${results.removed.length}`);

  if (results.verified_match.length > 0) {
    console.log('\n--- VERIFIED ---');
    for (const r of results.verified_match) {
      const g = r.googleResult;
      console.log(`✅ ${r.provider.provider_name} · ${r.provider.city}, ${r.provider.state}`);
      console.log(`   Matched: "${g.name}"`);
      console.log(`   Address: ${g.formatted_address}`);
      console.log(`   Place ID: ${g.place_id}`);
      if (g.rating) console.log(`   Rating: ${g.rating} ⭐`);
      console.log();
    }
  }

  if (results.city_match_name_differs.length > 0) {
    console.log('\n--- NAME DIFFERS (manual review) ---');
    for (const r of results.city_match_name_differs) {
      const g = r.googleResult;
      console.log(`⚠️  "${r.provider.provider_name}" · ${r.provider.city}, ${r.provider.state}`);
      console.log(`   Google returned: "${g.name}"`);
      console.log(`   Address: ${g.formatted_address}`);
      console.log(`   Score: ${r.nameScore.toFixed(2)}`);
      console.log();
    }
  }

  if (results.replaced.length > 0) {
    console.log('\n--- FICTIONAL (replaced) ---');
    for (const r of results.replaced) {
      const rep = r.replacement;
      console.log(`🔄 "${r.provider.provider_name}" · ${r.provider.city}, ${r.provider.state}`);
      console.log(`   No match found for this name`);
      console.log(`   Replaced with: "${rep.name}"`);
      console.log(`   Real address: ${rep.formatted_address}`);
      console.log(`   Place ID: ${rep.place_id}`);
      if (rep.rating) console.log(`   Rating: ${rep.rating} ⭐`);
      console.log();
    }
  }

  if (results.removed.length > 0) {
    console.log('\n--- REMOVED ---');
    for (const r of results.removed) {
      console.log(`🗑️  "${r.provider.provider_name}" · ${r.provider.city}, ${r.provider.state}`);
      console.log(`   No real business found in this city`);
      console.log(`   No replacement available`);
      console.log(`   ${r.provider.rowIds.length} row(s) deleted from seed data`);
      console.log();
    }
  }

  console.log('=== FINAL SEED DATA SUMMARY ===');
  console.log(`Total seed rows before: ${seedRows.length}`);
  console.log(`Total seed rows after: ${totalAfter}`);
  console.log(`All remaining rows reference real businesses: ${results.removed.length === 0 && results.city_match_name_differs.length === 0 ? '✅' : '⚠️  Some need manual review'}`);
  console.log();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

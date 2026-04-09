// End-to-end price submission test
// Inserts a test row into procedures, verifies it appears via the
// *actual* queries used by FindPrices + ProviderProfile, then deletes it.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
const env = {};
for (const l of readFileSync('.env','utf8').split('\n')) {
  const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g,'');
}
const sb = createClient(env.SUPABASE_URL || env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const MIAMI_PROVIDER_ID = 'bd10e8cc-c7a0-42d9-8b46-e66ac8e25610'; // Glow Up Body & Beauty
const MIAMI_PROVIDER_NAME = 'Glow Up Body & Beauty';
const MIAMI_PROVIDER_SLUG = null; // we'll pull the real one

// Look up the real slug from providers
const { data: prov } = await sb.from('providers')
  .select('id, name, slug, city, state, lat, lng')
  .eq('id', MIAMI_PROVIDER_ID)
  .single();
console.log('Using provider:', prov);

// Insert a test patient-price row — only columns that actually exist
const testRow = {
  procedure_type: 'neurotoxin',
  price_paid: 14,
  provider_name: prov.name,
  provider_slug: prov.slug,
  city: prov.city,
  state: prov.state,
  lat: prov.lat,
  lng: prov.lng,
  status: 'active',
  data_source: 'patient_report',
  is_anonymous: true,
  notes: 'AUDIT E2E TEST — DELETE ME',
};
const { data: inserted, error: insErr } = await sb.from('procedures')
  .insert(testRow)
  .select()
  .single();
console.log('\nInsert result:');
console.log('  error:', insErr);
console.log('  id:', inserted?.id, 'status:', inserted?.status);

if (!inserted) process.exit(1);

// Now try the FindPrices fetchProcedureRows query (broken — unit/trust_* don't exist)
const brokenSelect = 'id, procedure_type, price_paid, unit, units_or_volume, provider_name, provider_type, city, state, zip_code, created_at, rating, review_body, receipt_verified, result_photo_url, has_receipt, trust_weight, trust_tier, status, is_anonymous, provider_slug, provider_id';
const fp1 = await sb.from('procedures').select(brokenSelect).eq('status','active').ilike('city', '%Miami%').limit(5);
console.log('\nFindPrices-style query:');
console.log('  error:', fp1.error?.message);
console.log('  rows returned:', fp1.data?.length ?? 0);

// Try a fixed version (strip the missing columns) to confirm the row IS visible post-insert
const fixedSelect = 'id, procedure_type, price_paid, units_or_volume, provider_name, provider_type, city, state, zip_code, created_at, rating, review_body, receipt_verified, result_photo_url, has_receipt, status, is_anonymous, provider_slug';
const fp2 = await sb.from('procedures').select(fixedSelect).eq('status','active').ilike('city', '%Miami%').limit(5);
console.log('\nFixed query (missing cols removed):');
console.log('  error:', fp2.error?.message);
console.log('  rows returned:', fp2.data?.length ?? 0);
console.log('  test row visible:', fp2.data?.some(r => r.id === inserted.id) ? 'YES' : 'NO');

// Join to providers to confirm the map can plot it
// — but note: procedures has no provider_id, so a Supabase "!inner" join is impossible.
// The FindPrices code uses provider_name+city+state as the fallback key.
const { data: providersInCity } = await sb.from('providers')
  .select('id, name, slug, city, state, lat, lng')
  .eq('city', 'Miami')
  .eq('is_active', true)
  .limit(100);
const nameMatch = providersInCity?.find(
  p => p.name === testRow.provider_name && p.state === testRow.state
);
console.log('\nName-match join (what FindPrices falls back to):');
console.log('  match:', nameMatch ? `${nameMatch.name} (${nameMatch.id})` : 'NONE');

// ProviderProfile query by slug
const profileSelect = 'id, procedure_type, price_paid, unit, units_or_volume, provider_name, city, state, created_at, receipt_verified, result_photo_url, rating, review_body, trust_tier, provider_slug';
const pp1 = await sb.from('procedures').select(profileSelect).eq('provider_slug', prov.slug).eq('status','active');
console.log('\nProviderProfile-style query by slug:');
console.log('  error:', pp1.error?.message);
console.log('  rows:', pp1.data?.length ?? 0);

const profileSelectFixed = 'id, procedure_type, price_paid, units_or_volume, provider_name, city, state, created_at, receipt_verified, result_photo_url, rating, review_body, provider_slug';
const pp2 = await sb.from('procedures').select(profileSelectFixed).eq('provider_slug', prov.slug).eq('status','active');
console.log('\nFixed ProviderProfile query:');
console.log('  error:', pp2.error?.message);
console.log('  rows:', pp2.data?.length ?? 0);
console.log('  test row visible:', pp2.data?.some(r => r.id === inserted.id) ? 'YES' : 'NO');

// Delete
const { error: delErr } = await sb.from('procedures').delete().eq('id', inserted.id);
console.log('\nDelete:', delErr ? `FAILED: ${delErr.message}` : 'OK');

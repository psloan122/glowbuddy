// Verification script for the patient-price pipeline fix.
//
// Runs the OLD broken select (with the 4 phantom columns) and the NEW
// fixed select against the `procedures` table for Miami, and prints
// the row count + error for each. Before the fix, the broken select
// returned 0 rows due to PostgREST error 42703 (column not found).
// After the fix, the client code uses the new select and returns real
// rows.
//
// This also inserts a live test submission with status='active' at a
// real Miami provider, verifies it shows up via both the fixed list
// query and the ProviderProfile-by-slug query, then deletes it.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = {};
for (const l of readFileSync('.env', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const sb = createClient(
  env.SUPABASE_URL || env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const OLD_FINDPRICES_SELECT =
  'id, procedure_type, price_paid, unit, units_or_volume, provider_name, provider_type, city, state, zip_code, created_at, rating, review_body, receipt_verified, result_photo_url, has_receipt, trust_weight, trust_tier, status, is_anonymous, provider_slug, provider_id';

const NEW_FINDPRICES_SELECT =
  'id, procedure_type, price_paid, units_or_volume, provider_name, provider_type, city, state, zip_code, created_at, rating, review_body, receipt_verified, result_photo_url, has_receipt, status, is_anonymous, provider_slug';

const OLD_PROFILE_SELECT =
  'id, procedure_type, price_paid, unit, units_or_volume, provider_name, city, state, created_at, receipt_verified, result_photo_url, rating, review_body, trust_tier, provider_slug';

const NEW_PROFILE_SELECT =
  'id, procedure_type, price_paid, units_or_volume, provider_name, city, state, created_at, receipt_verified, result_photo_url, rating, review_body, provider_slug';

console.log('='.repeat(70));
console.log('BEFORE/AFTER VERIFICATION — Patient price pipeline');
console.log('='.repeat(70));

// ── Phase 1: Run both selects against the current live Miami data ──
console.log('\n[Phase 1] Running both selects against LIVE Miami data');

const oldList = await sb
  .from('procedures')
  .select(OLD_FINDPRICES_SELECT)
  .eq('status', 'active')
  .ilike('city', '%Miami%')
  .limit(50);

console.log('\n  OLD FindPrices select (4 phantom columns):');
console.log('    error:', oldList.error?.message || 'none');
console.log('    rows :', oldList.data?.length ?? 0);

const newList = await sb
  .from('procedures')
  .select(NEW_FINDPRICES_SELECT)
  .eq('status', 'active')
  .ilike('city', '%Miami%')
  .limit(50);

console.log('\n  NEW FindPrices select (phantom columns stripped):');
console.log('    error:', newList.error?.message || 'none');
console.log('    rows :', newList.data?.length ?? 0);

const realRows = (newList.data || []).filter(
  (r) => r.notes == null || !String(r.notes).includes('SEED'),
);
console.log('    real rows (non-seed sample): showing first 5');
for (const r of realRows.slice(0, 5)) {
  console.log(
    `      - ${r.procedure_type} $${r.price_paid} @ ${r.provider_name} (${r.created_at?.slice(0, 10)})`,
  );
}

// ── Phase 2: Insert → re-read through both paths → delete ──
console.log('\n[Phase 2] End-to-end insert → read → delete');

const MIAMI_PROVIDER_ID = 'bd10e8cc-c7a0-42d9-8b46-e66ac8e25610';
const { data: prov } = await sb
  .from('providers')
  .select('id, name, slug, city, state, lat, lng')
  .eq('id', MIAMI_PROVIDER_ID)
  .single();

console.log('\n  Test provider:', prov?.name, `(${prov?.slug})`);

const testRow = {
  procedure_type: 'neurotoxin',
  price_paid: 13,
  provider_name: prov.name,
  provider_slug: prov.slug,
  city: prov.city,
  state: prov.state,
  lat: prov.lat,
  lng: prov.lng,
  status: 'active',
  data_source: 'patient_report',
  is_anonymous: true,
  notes: 'VERIFY-FIX E2E — DELETE ME',
};

const { data: inserted, error: insErr } = await sb
  .from('procedures')
  .insert(testRow)
  .select()
  .single();

if (insErr) {
  console.log('  Insert FAILED:', insErr.message);
  process.exit(1);
}
console.log('  Inserted row id:', inserted.id);

// Re-run the NEW FindPrices-style query
const afterList = await sb
  .from('procedures')
  .select(NEW_FINDPRICES_SELECT)
  .eq('status', 'active')
  .ilike('city', '%Miami%')
  .limit(50);

const visibleInList = (afterList.data || []).some((r) => r.id === inserted.id);
console.log('\n  NEW FindPrices query after insert:');
console.log('    error:', afterList.error?.message || 'none');
console.log('    rows :', afterList.data?.length ?? 0);
console.log('    test row visible:', visibleInList ? 'YES' : 'NO');

// Run the NEW ProviderProfile-by-slug query
const profileQuery = await sb
  .from('procedures')
  .select(NEW_PROFILE_SELECT)
  .eq('provider_slug', prov.slug)
  .eq('status', 'active');

const visibleInProfile = (profileQuery.data || []).some(
  (r) => r.id === inserted.id,
);
console.log('\n  NEW ProviderProfile query by slug:');
console.log('    error:', profileQuery.error?.message || 'none');
console.log('    rows :', profileQuery.data?.length ?? 0);
console.log('    test row visible:', visibleInProfile ? 'YES' : 'NO');

// Simulate GlowMap's composite-key fallback against the provider set
const { data: providersInCity } = await sb
  .from('providers')
  .select('id, name, slug, city, state, lat, lng')
  .eq('is_active', true)
  .ilike('city', '%Miami%');

const compKey = (name, city, state) =>
  `${(name || '').trim().toLowerCase()}|${(city || '').trim().toLowerCase()}|${(state || '').trim().toLowerCase()}`;

const byComposite = new Map();
for (const p of providersInCity || []) {
  byComposite.set(compKey(p.name, p.city, p.state), p);
}

const testRowFromList = (afterList.data || []).find((r) => r.id === inserted.id);
const matchedProvider = testRowFromList
  ? byComposite.get(
      compKey(testRowFromList.provider_name, testRowFromList.city, testRowFromList.state),
    )
  : null;

console.log('\n  GlowMap composite-key fallback resolution:');
console.log(
  '    provider_id on row:',
  testRowFromList?.provider_id ?? '(undefined — column does not exist)',
);
console.log(
  '    composite-key match:',
  matchedProvider ? `${matchedProvider.name} (${matchedProvider.id})` : 'NONE',
);
console.log('    has lat/lng for pin:', matchedProvider?.lat != null && matchedProvider?.lng != null ? 'YES' : 'NO');

// Clean up
const { error: delErr } = await sb
  .from('procedures')
  .delete()
  .eq('id', inserted.id);
console.log('\n  Cleanup:', delErr ? `FAILED: ${delErr.message}` : 'OK');

// ── Summary ──
console.log('\n' + '='.repeat(70));
console.log('SUMMARY');
console.log('='.repeat(70));
console.log(`  OLD FindPrices select:  ${oldList.error ? 'ERROR (' + oldList.error.code + ')' : 'ok'} — ${oldList.data?.length ?? 0} rows`);
console.log(`  NEW FindPrices select:  ${newList.error ? 'ERROR' : 'ok'} — ${newList.data?.length ?? 0} rows`);
console.log(`  Patient test row visible in list:     ${visibleInList ? 'YES' : 'NO'}`);
console.log(`  Patient test row visible on profile:  ${visibleInProfile ? 'YES' : 'NO'}`);
console.log(`  GlowMap fallback can pin the row:     ${matchedProvider ? 'YES' : 'NO'}`);

if (
  !oldList.error ||
  newList.error ||
  !visibleInList ||
  !visibleInProfile ||
  !matchedProvider
) {
  console.log('\n  ⚠ Some check failed — review output above.');
  process.exit(1);
}
console.log('\n  ✓ Fix verified: broken select errors out, fixed select surfaces patient submissions everywhere.');

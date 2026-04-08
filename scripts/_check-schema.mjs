// One-off schema + state distribution probe. Safe to delete after.
// Run: node --env-file=.env scripts/_check-schema.mjs

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// 1. Get one row to see column names
const { data: sample, error: sampleError } = await supabase
  .from('providers')
  .select('*')
  .limit(1);

if (sampleError) {
  console.error('Sample query error:', sampleError);
  process.exit(1);
}

console.log('\n=== PROVIDERS TABLE COLUMNS ===');
if (sample && sample.length > 0) {
  const cols = Object.keys(sample[0]).sort();
  cols.forEach((c) => console.log('  ' + c));
  console.log(`\n  (${cols.length} columns)`);
} else {
  console.log('  (table is empty)');
}

// 2. Total row count
const { count: totalCount } = await supabase
  .from('providers')
  .select('*', { count: 'exact', head: true });

console.log(`\n=== TOTAL PROVIDERS ===\n  ${totalCount}`);

// 3. Confirmed med spa count
const { count: confirmedCount } = await supabase
  .from('providers')
  .select('*', { count: 'exact', head: true })
  .eq('is_active', true)
  .eq('is_medical_aesthetic', true);

console.log(`\n=== CONFIRMED ACTIVE MED SPAS ===\n  ${confirmedCount}`);

// 4. Classification status breakdown
const { count: nullCount } = await supabase
  .from('providers')
  .select('*', { count: 'exact', head: true })
  .is('is_medical_aesthetic', null);

const { count: trueCount } = await supabase
  .from('providers')
  .select('*', { count: 'exact', head: true })
  .eq('is_medical_aesthetic', true);

const { count: falseCount } = await supabase
  .from('providers')
  .select('*', { count: 'exact', head: true })
  .eq('is_medical_aesthetic', false);

console.log('\n=== CLASSIFICATION STATUS ===');
console.log(`  is_medical_aesthetic = true  : ${trueCount}`);
console.log(`  is_medical_aesthetic = false : ${falseCount}`);
console.log(`  is_medical_aesthetic = null  : ${nullCount}`);

// 5. State distribution of confirmed med spas
const { data: stateRows } = await supabase
  .from('providers')
  .select('state')
  .eq('is_active', true)
  .eq('is_medical_aesthetic', true);

const stateCounts = {};
for (const row of stateRows || []) {
  stateCounts[row.state] = (stateCounts[row.state] || 0) + 1;
}

const ALL_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

console.log('\n=== CONFIRMED MED SPAS BY STATE ===');
for (const s of ALL_STATES) {
  const n = stateCounts[s] || 0;
  const bar = '#'.repeat(Math.floor(n / 10));
  const status = n >= 200 ? 'MET' : n >= 100 ? 'mid' : n >= 10 ? 'low' : 'ZERO';
  console.log(`  ${s}: ${String(n).padStart(4)} ${status.padEnd(4)} ${bar}`);
}

const metCount = ALL_STATES.filter((s) => (stateCounts[s] || 0) >= 200).length;
const lowCount = ALL_STATES.filter((s) => (stateCounts[s] || 0) < 100).length;
console.log(`\n  ${metCount}/50 states at target (200+)`);
console.log(`  ${lowCount}/50 states under 100`);

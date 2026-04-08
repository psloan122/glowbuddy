/**
 * Apply migration 053 suppressions + print the STEP 7 summary.
 *
 * Prereq: the `display_suppressed` and `suppression_reason` columns must
 * already exist on provider_pricing. If they don't, this script prints the
 * ALTER SQL to paste into the Supabase dashboard SQL editor and exits.
 *
 * Run: node --env-file=.env scripts/apply-price-suppression.mjs
 */
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

// Neurotoxin procedure_type tokens (for the low-price suppression query)
const NEUROTOXIN_TOKENS = [
  'botox',
  'dysport',
  'xeomin',
  'jeuveau',
  'daxxify',
  'neurotoxin',
];

const FILLER_TOKENS = [
  'filler',
  'juvederm',
  'restylane',
  'rha',
  'versa',
  'belotero',
];

async function ensureColumn() {
  const probe = await supabase
    .from('provider_pricing')
    .select('display_suppressed')
    .limit(1);
  if (probe.error) {
    console.error(
      '\n✖ display_suppressed column is missing from provider_pricing.',
    );
    console.error(
      '\n  Paste the following SQL into the Supabase dashboard SQL editor',
    );
    console.error('  and run it, then re-run this script:\n');
    console.error(
      '  ──────────────────────────────────────────────────────────────',
    );
    console.error(
      `  ALTER TABLE provider_pricing
    ADD COLUMN IF NOT EXISTS display_suppressed boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS suppression_reason text;

  CREATE INDEX IF NOT EXISTS idx_provider_pricing_display_visible
    ON provider_pricing (display_suppressed)
    WHERE display_suppressed = false;`,
    );
    console.error(
      '  ──────────────────────────────────────────────────────────────\n',
    );
    process.exit(1);
  }
}

// Supabase's PostgREST `.or()` expects comma-separated filters — but comma is
// also the filter delimiter, so any comma inside a value has to be escaped.
// For ILIKE we avoid literal commas in the pattern, so this helper just joins.
function ilikeAnyOrFilter(column, tokens) {
  return tokens.map((t) => `${column}.ilike.%${t}%`).join(',');
}

async function suppressAreaAndPackageRows() {
  // Step 2a: price_label IN (...)
  const labelUpdate = await supabase
    .from('provider_pricing')
    .update({
      display_suppressed: true,
      suppression_reason: 'area_or_package_pricing_not_per_unit',
    })
    .eq('source', 'scrape')
    .in('price_label', ['flat_rate_area', 'per_treatment', 'package', 'starting_at'])
    .select('id');
  if (labelUpdate.error) throw labelUpdate.error;
  console.log(
    `  price_label in (flat_rate_area,per_treatment,package,starting_at): ${labelUpdate.data.length} rows suppressed`,
  );

  // Step 2b: notes ILIKE any of the danger words. In practice notes are all
  // NULL after migration 052, but we still run this for safety.
  const noteTokens = ['area', 'flat rate', 'package', 'estimate', 'starting'];
  const noteOr = noteTokens.map((t) => `notes.ilike.%${t}%`).join(',');
  const notesUpdate = await supabase
    .from('provider_pricing')
    .update({
      display_suppressed: true,
      suppression_reason: 'area_or_package_pricing_not_per_unit',
    })
    .eq('source', 'scrape')
    .or(noteOr)
    .select('id');
  if (notesUpdate.error) throw notesUpdate.error;
  console.log(
    `  notes ilike any(${noteTokens.join('|')}): ${notesUpdate.data.length} rows suppressed`,
  );
}

async function suppressSuspiciousLowNeurotoxin() {
  const upd = await supabase
    .from('provider_pricing')
    .update({
      display_suppressed: true,
      suppression_reason: 'price_too_low_likely_misclassified',
    })
    .eq('source', 'scrape')
    .eq('price_label', 'per_unit')
    .lt('price', 8)
    .or(ilikeAnyOrFilter('procedure_type', NEUROTOXIN_TOKENS))
    .select('id');
  if (upd.error) throw upd.error;
  console.log(`  neurotoxin per_unit < $8: ${upd.data.length} rows suppressed`);
}

async function suppressSuspiciousLowFiller() {
  const upd = await supabase
    .from('provider_pricing')
    .update({
      display_suppressed: true,
      suppression_reason: 'price_too_low_likely_misclassified',
    })
    .eq('source', 'scrape')
    .eq('price_label', 'per_syringe')
    .lt('price', 200)
    .or(ilikeAnyOrFilter('procedure_type', FILLER_TOKENS))
    .select('id');
  if (upd.error) throw upd.error;
  console.log(`  filler per_syringe < $200: ${upd.data.length} rows suppressed`);
}

async function countExact(filters) {
  // Supabase count query builder.
  let q = supabase.from('provider_pricing').select('id', { count: 'exact', head: true });
  for (const f of filters) f(q); // mutator
  // .select() chain with a mutating filter callback is awkward — instead we
  // pass a builder function that returns the chained query.
  return q;
}

async function main() {
  console.log('Checking for display_suppressed column...');
  await ensureColumn();
  console.log('  column exists ✓\n');

  console.log('Running suppression UPDATEs...');
  await suppressAreaAndPackageRows();
  await suppressSuspiciousLowNeurotoxin();
  await suppressSuspiciousLowFiller();

  // ── STEP 7: Summary ──────────────────────────────────────────────────
  console.log('\n=== Suppression summary ===');

  const total = await supabase
    .from('provider_pricing')
    .select('id', { count: 'exact', head: true });
  const suppressed = await supabase
    .from('provider_pricing')
    .select('id', { count: 'exact', head: true })
    .eq('display_suppressed', true);
  const displayable = await supabase
    .from('provider_pricing')
    .select('id', { count: 'exact', head: true })
    .eq('display_suppressed', false);

  console.log(`Total provider_pricing rows: ${total.count}`);
  console.log(`Rows now suppressed:         ${suppressed.count}`);
  console.log(`Rows still displayable:      ${displayable.count}`);

  console.log('\nSuppressed by reason:');
  const areaRows = await supabase
    .from('provider_pricing')
    .select('id', { count: 'exact', head: true })
    .eq('suppression_reason', 'area_or_package_pricing_not_per_unit');
  const miscRows = await supabase
    .from('provider_pricing')
    .select('id', { count: 'exact', head: true })
    .eq('suppression_reason', 'price_too_low_likely_misclassified');
  console.log(`  area_or_package_pricing:       ${areaRows.count}`);
  console.log(`  price_too_low_misclassified:   ${miscRows.count}`);

  console.log('\nDisplayable by type (source=scrape, display_suppressed=false):');
  const perUnitNeuro = await supabase
    .from('provider_pricing')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'scrape')
    .eq('display_suppressed', false)
    .eq('price_label', 'per_unit')
    .or(ilikeAnyOrFilter('procedure_type', NEUROTOXIN_TOKENS));
  const perSyrFiller = await supabase
    .from('provider_pricing')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'scrape')
    .eq('display_suppressed', false)
    .eq('price_label', 'per_syringe')
    .or(ilikeAnyOrFilter('procedure_type', FILLER_TOKENS));
  const perSession = await supabase
    .from('provider_pricing')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'scrape')
    .eq('display_suppressed', false)
    .eq('price_label', 'per_session');
  const perMonth = await supabase
    .from('provider_pricing')
    .select('id', { count: 'exact', head: true })
    .eq('source', 'scrape')
    .eq('display_suppressed', false)
    .eq('price_label', 'per_month');

  console.log(`  per_unit (neurotoxin): ${perUnitNeuro.count}`);
  console.log(`  per_syringe (filler):  ${perSyrFiller.count}`);
  console.log(`  per_session:           ${perSession.count}`);
  console.log(`  per_month:             ${perMonth.count}`);

  // Provider-level: count providers with at least one displayable row, and
  // providers whose rows are all suppressed. We pull the full scrape set
  // because the join+distinct would require a stored function.
  const PAGE = 1000;
  const allRows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('provider_pricing')
      .select('provider_id, display_suppressed')
      .eq('source', 'scrape')
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < PAGE) break;
  }
  const byProvider = new Map();
  for (const row of allRows) {
    const prev = byProvider.get(row.provider_id) || { visible: 0, total: 0 };
    prev.total += 1;
    if (!row.display_suppressed) prev.visible += 1;
    byProvider.set(row.provider_id, prev);
  }
  let withVisible = 0;
  let allHidden = 0;
  for (const { visible } of byProvider.values()) {
    if (visible > 0) withVisible += 1;
    else allHidden += 1;
  }
  console.log(`\nProviders with at least 1 displayable price: ${withVisible}`);
  console.log(
    `Providers with all prices suppressed:        ${allHidden}  (these show "contact for pricing")`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

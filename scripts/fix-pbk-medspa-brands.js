/**
 * One-time data fix: split PBK Medspa Brooklyn neurotoxin row into
 * brand-specific rows.
 *
 * Background: the scraper picked up a single per-unit price for PBK Medspa
 * Brooklyn (the LOWEST of three brand prices on their menu page) and stored
 * it as one generic "Botox / Dysport / Xeomin" row. The provider's published
 * menu actually lists three brand prices:
 *
 *     Botox    $15 / unit
 *     Xeomin   $14 / unit
 *     Dysport  $5  / unit
 *
 * This script:
 *   1. Looks up the provider (PBK Medspa, Brooklyn, NY)
 *   2. Deletes any existing source='scrape' neurotoxin rows for that provider
 *   3. Inserts the three correct brand-specific rows
 *
 * Idempotent — safe to re-run. The delete is scoped to source='scrape' so
 * any provider-uploaded manual rows are untouched.
 *
 * Run: node --env-file-if-exists=.env scripts/fix-pbk-medspa-brands.js
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('[fix-pbk] Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const PROVIDER_NAME_LIKE = 'pbk medspa';
const PROVIDER_CITY = 'Brooklyn';
const PROVIDER_STATE = 'NY';
const PROCEDURE_TYPE = 'Botox / Dysport / Xeomin';
const SOURCE_URL = 'https://www.pbkmedspa.com/';

const BRAND_ROWS = [
  { brand: 'Botox',   price: 15 },
  { brand: 'Xeomin',  price: 14 },
  { brand: 'Dysport', price: 5  },
];

async function main() {
  console.log('[fix-pbk] Looking up provider...');
  const { data: providers, error: lookupErr } = await supabase
    .from('providers')
    .select('id, name, city, state')
    .ilike('name', `%${PROVIDER_NAME_LIKE}%`)
    .eq('city', PROVIDER_CITY)
    .eq('state', PROVIDER_STATE);

  if (lookupErr) throw lookupErr;
  if (!providers || providers.length === 0) {
    console.error(`[fix-pbk] No provider matched "${PROVIDER_NAME_LIKE}" in ${PROVIDER_CITY}, ${PROVIDER_STATE}.`);
    process.exit(1);
  }
  if (providers.length > 1) {
    console.warn(`[fix-pbk] Multiple matches — using the first:`, providers.map((p) => p.name));
  }
  const provider = providers[0];
  console.log(`[fix-pbk] Provider: ${provider.name} (${provider.id})`);

  // Delete existing scraped neurotoxin rows for this provider so the fix is
  // idempotent. Manual provider-uploaded rows are left alone.
  console.log('[fix-pbk] Deleting existing scraped neurotoxin rows...');
  const { count: deletedCount, error: delErr } = await supabase
    .from('provider_pricing')
    .delete({ count: 'exact' })
    .eq('provider_id', provider.id)
    .eq('procedure_type', PROCEDURE_TYPE)
    .eq('source', 'scrape');
  if (delErr) throw delErr;
  console.log(`[fix-pbk] Deleted ${deletedCount ?? '?'} existing scraped rows`);

  // Insert the three brand-specific rows.
  const now = new Date().toISOString();
  const inserts = BRAND_ROWS.map(({ brand, price }) => ({
    provider_id: provider.id,
    procedure_type: PROCEDURE_TYPE,
    brand,
    price,
    price_label: 'per_unit',
    treatment_area: null,
    units_or_volume: null,
    source: 'scrape',
    verified: false,
    source_url: SOURCE_URL,
    scraped_at: now,
    notes: null,
    is_active: true,
  }));

  console.log(`[fix-pbk] Inserting ${inserts.length} brand-specific rows...`);
  const { error: insErr } = await supabase.from('provider_pricing').insert(inserts);
  if (insErr) throw insErr;

  for (const row of inserts) {
    console.log(`  + ${row.brand.padEnd(8)} $${row.price}/unit`);
  }
  console.log('[fix-pbk] Done.');
}

main().catch((err) => {
  console.error('[fix-pbk] Failed:', err);
  process.exit(1);
});

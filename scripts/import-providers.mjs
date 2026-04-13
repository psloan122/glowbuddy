/**
 * Import cleaned provider CSV into Supabase.
 *
 * Steps:
 *   A) Delete any previous CSV import rows (zip_code = '00000')
 *   B) Deactivate all remaining active providers (is_active = false)
 *   C) Parse CSV, transform rows, insert in batches of 100
 *   D) Print summary
 *
 * Usage: node --env-file=.env scripts/import-providers.mjs
 */

import fs from 'node:fs';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

const CSV_PATH = '/Users/petersloan/Downloads/cleaned_glowbuddy_providers.csv';
const BATCH_SIZE = 100;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

// --- Slug helpers (mirrored from src/lib/slugify.js) ---
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function providerSlugFromParts(name, city, state) {
  return `${slugify(name)}-${slugify(city)}-${state.toLowerCase()}`;
}

// --- Mapping helpers ---
const PROVIDER_TYPE_MAP = {
  'Med Spa': 'Med Spa (Physician-Owned)',
  'Dermatology': 'Board-Certified Dermatologist',
  'Plastic Surgery': 'Plastic Surgeon',
};

const PROCEDURE_TAG_MAP = {
  'Offers Neurotoxins': 'neurotoxin',
  'Offers Fillers': 'filler',
  'Offers Laser': 'laser',
  'Offers Body Contouring': 'body',
  'Offers GLP-1': 'weight-loss',
};

const MEDICAL_AESTHETIC_TYPES = new Set([
  'Med Spa',
  'Dermatology',
  'Plastic Surgery',
]);

function mapProviderType(raw) {
  const trimmed = (raw || '').trim();
  return PROVIDER_TYPE_MAP[trimmed] || 'Other';
}

function buildProcedureTags(row) {
  const tags = [];
  for (const [csvCol, tag] of Object.entries(PROCEDURE_TAG_MAP)) {
    if ((row[csvCol] || '').trim().toUpperCase() === 'Y') {
      tags.push(tag);
    }
  }
  return tags;
}

// Fetch all existing slugs from the DB (paginated to handle large tables)
async function fetchExistingSlugs() {
  const slugs = new Set();
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('providers')
      .select('slug')
      .range(from, from + pageSize - 1);
    if (error) {
      console.error('Failed to fetch existing slugs:', error);
      process.exit(1);
    }
    for (const row of data) {
      slugs.add(row.slug);
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return slugs;
}

// --- Main ---
async function main() {
  // Step A: Clean up any partial import from a previous run
  console.log('Cleaning up any previous partial import...');
  const { data: cleaned, error: cleanErr } = await supabase
    .from('providers')
    .delete()
    .eq('zip_code', '00000')
    .eq('is_active', true)
    .select('id');

  if (cleanErr) {
    console.error('Failed to clean up partial import:', cleanErr);
    process.exit(1);
  }
  if (cleaned?.length) {
    console.log(`  Removed ${cleaned.length} rows from previous partial import.`);
  }

  // Step B: Deactivate all remaining active providers
  console.log('Deactivating all existing providers...');
  const { data: deactivated, error: deactivateErr } = await supabase
    .from('providers')
    .update({ is_active: false })
    .eq('is_active', true)
    .select('id');

  if (deactivateErr) {
    console.error('Failed to deactivate providers:', deactivateErr);
    process.exit(1);
  }
  console.log(`Deactivated ${deactivated?.length ?? 0} existing providers.`);

  // Fetch all existing slugs (from deactivated providers) to avoid collisions
  console.log('Fetching existing slugs...');
  const existingSlugs = await fetchExistingSlugs();
  console.log(`Found ${existingSlugs.size} existing slugs in DB.`);

  // Step C: Parse CSV
  const raw = fs.readFileSync(CSV_PATH, 'utf-8');
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
  console.log(`Parsed ${records.length} rows from CSV.`);

  // Transform rows
  const usedSlugs = new Set(existingSlugs);  // track both DB and batch slugs
  const rows = [];
  const skipped = [];

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const name = (r['Name'] || '').trim();
    const city = (r['City'] || '').trim();
    const state = (r['State'] || '').trim().toUpperCase();

    if (!name || !city || !state) {
      skipped.push({ line: i + 2, reason: 'Missing Name, City, or State', row: r });
      continue;
    }

    // Build slug with collision handling against both DB and batch
    let baseSlug = providerSlugFromParts(name, city, state);
    let slug = baseSlug;
    let suffix = 2;
    while (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix++;
    }
    usedSlugs.add(slug);

    const rawType = (r['Provider Type'] || '').trim();
    const providerType = mapProviderType(rawType);
    const procedureTags = buildProcedureTags(r);
    const isMedicalAesthetic = MEDICAL_AESTHETIC_TYPES.has(rawType);
    const website = (r['Website'] || '').trim() || null;

    rows.push({
      name,
      city,
      state,
      slug,
      website,
      provider_type: providerType,
      procedure_tags: procedureTags,
      is_medical_aesthetic: isMedicalAesthetic,
      is_active: true,
      is_claimed: false,
      tier: 'free',
      zip_code: '00000',
    });
  }

  console.log(`Prepared ${rows.length} rows for insert (${skipped.length} skipped).`);

  // Insert in batches
  let insertedCount = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('providers').insert(batch);
    if (error) {
      console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed at row ${i}:`, error);
      process.exit(1);
    }
    insertedCount += batch.length;
    if (insertedCount % 500 === 0 || insertedCount === rows.length) {
      console.log(`  Inserted ${insertedCount} / ${rows.length}`);
    }
  }

  // Step D: Summary
  console.log('\n--- Summary ---');
  console.log(`Inserted ${insertedCount} providers (${skipped.length} skipped)`);
  if (skipped.length > 0) {
    console.log('Skipped rows:');
    for (const s of skipped) {
      console.log(`  Line ${s.line}: ${s.reason} — ${JSON.stringify(s.row)}`);
    }
  }
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

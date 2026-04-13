/**
 * Upload legitimacy-classified provider CSV into Supabase.
 *
 * Phase A — UPDATE supabase-sourced rows (matched on providers.id via supabase_id)
 *   Touches only: website, lat, lng, legitimacy, legitimacy_score, legitimacy_source
 *   NULL CSV values are coalesced (existing DB value wins)
 *   Dispatched through bulk_update_provider_legitimacy RPC (migration 072).
 *
 * Phase B — INSERT yelp-sourced rows (upsert with onConflict=slug, ignoreDuplicates)
 *   slug = slugify(name + city + state) + '-' + 6 random hex chars
 *   provider_type default: 'Med Spa (Non-Physician)'
 *   zip_code default: ''
 *   is_active=true, is_claimed=false, tier='free'
 *   Rows missing name/city/state are skipped (NOT NULL constraints on providers).
 *
 * Usage:
 *   node --env-file=.env scripts/upload-legitimacy.mjs            # dry run
 *   node --env-file=.env scripts/upload-legitimacy.mjs --dry-run  # dry run
 *   node --env-file=.env scripts/upload-legitimacy.mjs --yes      # execute
 */

import fs from 'node:fs';
import crypto from 'node:crypto';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

const CSV_PATH = '/Users/petersloan/Downloads/GlowBuddy_MASTER_CLEAN.csv';
const DROPPED_CSV_PATH = '/Users/petersloan/GlowBuddy/data/GlowBuddy_Yelp_NoCity_Dropped.csv';
const UPDATE_BATCH = 500;
const INSERT_BATCH = 100;

const DEFAULTS = {
  provider_type: 'Med Spa (Non-Physician)',
  zip_code: '',
  is_active: true,
  is_claimed: false,
  tier: 'free',
};

// Yelp category labels in the CSV (e.g. "Health & Medical", "Skin Care")
// are too noisy to trust as provider_type — force every inserted row to
// the default.
const FORCE_DEFAULT_PROVIDER_TYPE = true;

const args = new Set(process.argv.slice(2));
const DRY_RUN = !args.has('--yes') || args.has('--dry-run');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (use --env-file=.env).');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

// --- value coercion helpers ---------------------------------------------
function trim(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (s === '' || s.toLowerCase() === 'nan') return null;
  return s;
}

function num(v) {
  const t = trim(v);
  if (t === null) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function int(v) {
  const t = trim(v);
  if (t === null) return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function randomSuffix() {
  return crypto.randomBytes(3).toString('hex'); // 6 hex chars
}

// --- parse + split ------------------------------------------------------
function parseCsv() {
  const raw = fs.readFileSync(CSV_PATH, 'utf-8');
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const updates = [];
  const insertsRaw = [];

  for (const r of records) {
    const source = trim(r.source);
    if (source === 'supabase') {
      const id = trim(r.supabase_id);
      if (!id) continue;
      updates.push({
        id,
        website: trim(r.website),
        lat: num(r.lat),
        lng: num(r.lng),
        legitimacy: trim(r.legitimacy),
        legitimacy_score: int(r.legitimacy_score),
        legitimacy_source: trim(r.legitimacy_source),
      });
    } else {
      insertsRaw.push(r);
    }
  }

  return { updates, insertsRaw };
}

function buildInserts(insertsRaw) {
  const inserts = [];
  const droppedNoCity = [];
  const skipped = { no_name: 0, no_city: 0, no_state: 0, bad_state: 0 };
  const usedSlugs = new Set();

  for (const r of insertsRaw) {
    const name = trim(r.name);
    const city = trim(r.city);
    const stateRaw = trim(r.state);
    const state = stateRaw ? stateRaw.toUpperCase() : null;

    if (!name) { skipped.no_name++; continue; }
    if (!city) {
      skipped.no_city++;
      droppedNoCity.push(r);
      continue;
    }
    if (!state) { skipped.no_state++; continue; }
    if (state.length !== 2) { skipped.bad_state++; continue; }

    const base = slugify(`${name}-${city}-${state}`);
    let slug = `${base}-${randomSuffix()}`;
    while (usedSlugs.has(slug)) slug = `${base}-${randomSuffix()}`;
    usedSlugs.add(slug);

    const providerType = FORCE_DEFAULT_PROVIDER_TYPE
      ? DEFAULTS.provider_type
      : (trim(r.provider_type) || DEFAULTS.provider_type);

    inserts.push({
      name,
      slug,
      provider_type: providerType,
      city,
      state,
      zip_code: DEFAULTS.zip_code,
      address: trim(r.address),
      phone: trim(r.phone),
      website: trim(r.website),
      lat: num(r.lat),
      lng: num(r.lng),
      google_place_id: trim(r.google_place_id),
      google_rating: num(r.google_rating),
      google_review_count: int(r.google_review_count),
      is_active: DEFAULTS.is_active,
      is_claimed: DEFAULTS.is_claimed,
      tier: DEFAULTS.tier,
      legitimacy: trim(r.legitimacy),
      legitimacy_score: int(r.legitimacy_score),
      legitimacy_source: trim(r.legitimacy_source),
    });
  }

  return { inserts, skipped, droppedNoCity };
}

function writeDroppedCsv(droppedRows) {
  if (droppedRows.length === 0) return;
  const headers = Object.keys(droppedRows[0]);
  const escape = (v) => {
    if (v === undefined || v === null) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [headers.join(',')];
  for (const r of droppedRows) {
    lines.push(headers.map((h) => escape(r[h])).join(','));
  }
  fs.writeFileSync(DROPPED_CSV_PATH, lines.join('\n') + '\n');
  console.log(`Wrote ${droppedRows.length} dropped rows to ${DROPPED_CSV_PATH}`);
}

// --- reporting ---------------------------------------------------------
function summarize(updates, inserts, skipped) {
  const updWeb = updates.filter((u) => u.website).length;
  const updLatLng = updates.filter((u) => u.lat != null && u.lng != null).length;
  const updLegit = updates.filter((u) => u.legitimacy).length;
  const totalSkipped = Object.values(skipped).reduce((a, b) => a + b, 0);

  console.log('');
  console.log('=== UPLOAD PLAN ===');
  console.log('');
  console.log('Phase A - UPDATE (supabase_id -> providers.id):');
  console.log(`  payload rows:            ${updates.length}`);
  console.log(`  with non-null website:   ${updWeb}`);
  console.log(`  with non-null lat/lng:   ${updLatLng}`);
  console.log(`  with legitimacy label:   ${updLegit}`);
  console.log(`  fields touched:          website, lat, lng, legitimacy, legitimacy_score, legitimacy_source`);
  console.log(`  NULL handling:           COALESCE (DB value wins when payload is NULL)`);
  console.log('');
  console.log('Phase B - INSERT (yelp-sourced, upsert onConflict=slug):');
  console.log(`  rows insertable:         ${inserts.length}`);
  console.log(`  rows skipped:            ${totalSkipped}`);
  for (const [k, v] of Object.entries(skipped)) {
    if (v > 0) console.log(`    - ${k}: ${v}`);
  }
  console.log('');
  if (inserts.length > 0) {
    const s = inserts[0];
    console.log('Sample insert row:');
    console.log(`  name:          ${s.name}`);
    console.log(`  slug:          ${s.slug}`);
    console.log(`  provider_type: ${s.provider_type}`);
    console.log(`  city/state:    ${s.city}, ${s.state}`);
    console.log(`  website:       ${s.website ?? '(null)'}`);
    console.log(`  legitimacy:    ${s.legitimacy ?? '(null)'}`);
  }
  console.log('');
}

// --- execution ---------------------------------------------------------
async function verifyMigrationApplied() {
  const { error } = await supabase
    .from('providers')
    .select('id, legitimacy, legitimacy_score, legitimacy_source')
    .limit(1);
  if (error) {
    console.error('');
    console.error('ERROR: migration 072 not applied (legitimacy columns missing).');
    console.error('Apply supabase/migrations/072_provider_legitimacy.sql, then re-run.');
    console.error('Supabase error:', error.message);
    process.exit(1);
  }

  const { error: rpcErr } = await supabase.rpc('bulk_update_provider_legitimacy', { payload: [] });
  if (rpcErr) {
    console.error('');
    console.error('ERROR: bulk_update_provider_legitimacy RPC not available.');
    console.error('Confirm migration 072 ran in full.');
    console.error('Supabase error:', rpcErr.message);
    process.exit(1);
  }
}

async function runUpdates(updates) {
  console.log(`\nPhase A: sending ${updates.length} rows via RPC in batches of ${UPDATE_BATCH}...`);
  let processed = 0;
  let rowsUpdated = 0;
  for (let i = 0; i < updates.length; i += UPDATE_BATCH) {
    const batch = updates.slice(i, i + UPDATE_BATCH);
    const { data, error } = await supabase.rpc('bulk_update_provider_legitimacy', { payload: batch });
    if (error) {
      console.error(`  batch ${Math.floor(i / UPDATE_BATCH) + 1} failed:`, error);
      process.exit(1);
    }
    rowsUpdated += Number(data ?? 0);
    processed += batch.length;
    if (processed % 2500 === 0 || processed === updates.length) {
      console.log(`  sent ${processed} / ${updates.length} (db rows updated: ${rowsUpdated})`);
    }
  }
  console.log(`Phase A done. Rows actually updated in DB: ${rowsUpdated}`);
}

async function runInserts(inserts) {
  console.log(`\nPhase B: upserting ${inserts.length} rows in batches of ${INSERT_BATCH}...`);
  let processed = 0;
  for (let i = 0; i < inserts.length; i += INSERT_BATCH) {
    const batch = inserts.slice(i, i + INSERT_BATCH);
    const { error } = await supabase
      .from('providers')
      .upsert(batch, { onConflict: 'slug', ignoreDuplicates: true });
    if (error) {
      console.error(`  batch ${Math.floor(i / INSERT_BATCH) + 1} failed:`, error);
      process.exit(1);
    }
    processed += batch.length;
    if (processed % 1000 === 0 || processed === inserts.length) {
      console.log(`  upserted ${processed} / ${inserts.length}`);
    }
  }
  console.log('Phase B done.');
}

async function main() {
  const { updates, insertsRaw } = parseCsv();
  const { inserts, skipped, droppedNoCity } = buildInserts(insertsRaw);

  summarize(updates, inserts, skipped);
  writeDroppedCsv(droppedNoCity);

  if (DRY_RUN) {
    console.log('DRY RUN - no DB changes. Re-run with --yes to execute.');
    return;
  }

  await verifyMigrationApplied();
  await runUpdates(updates);
  await runInserts(inserts);
  console.log('\nAll done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

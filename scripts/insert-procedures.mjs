/**
 * Cross-reference GlowBuddy_Procedures_ALL CSV with Supabase providers,
 * match by provider_id (pre-linked) or name+city+state, then insert
 * matched price records into provider_pricing.
 *
 * Skips exact duplicates (same provider_id + procedure_type + price + price_label).
 *
 * Usage:
 *   node --env-file=.env scripts/insert-procedures.mjs            # dry run
 *   node --env-file=.env scripts/insert-procedures.mjs --yes      # execute
 */

import fs from 'node:fs';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';

const CSV_PATH = '/Users/petersloan/Downloads/GlowBuddy_Procedures_ALL (1).csv';
const UNMATCHED_PATH = '/Users/petersloan/GlowBuddy/data/GlowBuddy_Procedures_Unmatched.csv';
const INSERT_BATCH = 100;

const args = new Set(process.argv.slice(2));
const DRY_RUN = !args.has('--yes') || args.has('--dry-run');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

function trim(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' || s.toLowerCase() === 'nan' ? null : s;
}

function toInt(v) {
  const t = trim(v);
  if (t === null) return null;
  const n = Math.round(Number(t));
  return Number.isFinite(n) ? n : null;
}

function toBool(v) {
  const t = trim(v);
  if (t === null) return false;
  return t.toLowerCase() === 'true' || t === '1';
}

async function fetchAll(table, columns) {
  const rows = [];
  let from = 0;
  while (true) {
    const { data, error } = await sb.from(table).select(columns).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

async function main() {
  console.log('Fetching providers...');
  const providers = await fetchAll('providers', 'id, name, city, state, website');
  console.log(`  ${providers.length} providers`);

  console.log('Fetching existing pricing...');
  const existingPricing = await fetchAll('provider_pricing', 'provider_id, procedure_type, price, price_label');
  console.log(`  ${existingPricing.length} existing price records`);

  // Build lookup: name+city+state -> provider_id
  const nameMap = {};
  for (const p of providers) {
    const key = [p.name, p.city, p.state].join('|').toLowerCase();
    if (!nameMap[key]) nameMap[key] = p.id;
  }

  // Build dedup set from existing pricing
  const existingKey = (r) => `${r.provider_id}|${r.procedure_type}|${r.price}|${r.price_label}`;
  const existingSet = new Set(existingPricing.map(existingKey));

  // Valid provider IDs
  const providerIds = new Set(providers.map(p => p.id));

  // Parse procedures CSV
  const raw = fs.readFileSync(CSV_PATH, 'utf-8');
  const procs = parse(raw, { columns: true, skip_empty_lines: true, trim: true });
  console.log(`  ${procs.length} procedure records in CSV`);

  const toInsert = [];
  const unmatched = [];
  const stats = {
    matchedById: 0,
    matchedByName: 0,
    noMatch: 0,
    idNotInDb: 0,
    dedupSkipped: 0,
    nullPrice: 0,
  };

  for (const r of procs) {
    let providerId = trim(r.provider_id);

    // If pre-linked, verify the ID exists
    if (providerId) {
      if (!providerIds.has(providerId)) {
        stats.idNotInDb++;
        providerId = null;
      } else {
        stats.matchedById++;
      }
    }

    // Try name+city+state match
    if (!providerId) {
      const key = [r.provider_name, r.provider_city, r.provider_state].join('|').toLowerCase();
      const matched = nameMap[key];
      if (matched) {
        providerId = matched;
        stats.matchedByName++;
      } else {
        stats.noMatch++;
        unmatched.push(r);
        continue;
      }
    }

    const price = toInt(r.price);
    if (price === null || price <= 0) {
      stats.nullPrice++;
      continue;
    }

    const procedureType = trim(r.procedure_name) || trim(r.category) || 'Unknown';
    const priceLabel = trim(r.pricing_unit) || 'per_session';

    // Dedup check
    const dk = `${providerId}|${procedureType}|${price}|${priceLabel}`;
    if (existingSet.has(dk)) {
      stats.dedupSkipped++;
      continue;
    }
    existingSet.add(dk);

    toInsert.push({
      provider_id: providerId,
      procedure_type: procedureType,
      treatment_area: trim(r.subcategory),
      price,
      price_label: priceLabel,
      brand: trim(r.brand),
      source: 'csv_import',
      source_url: trim(r.source_url),
      notes: trim(r.price_notes),
      is_active: true,
      verified: false,
    });
  }

  // Write unmatched to CSV for later re-matching
  if (unmatched.length > 0) {
    const headers = Object.keys(unmatched[0]);
    const escape = (v) => {
      if (v === undefined || v === null) return '';
      const s = String(v);
      return (s.includes(',') || s.includes('"') || s.includes('\n'))
        ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csvLines = [headers.join(',')];
    for (const r of unmatched) csvLines.push(headers.map(h => escape(r[h])).join(','));
    fs.writeFileSync(UNMATCHED_PATH, csvLines.join('\n') + '\n');
  }

  // Summary
  const uniqueProviders = new Set(toInsert.map(r => r.provider_id));
  console.log('');
  console.log('=== INSERT PLAN ===');
  console.log('');
  console.log('Matching:');
  console.log(`  Pre-linked (provider_id):    ${stats.matchedById}`);
  console.log(`  Matched by name+city+state:  ${stats.matchedByName}`);
  console.log(`  Pre-linked ID not in DB:     ${stats.idNotInDb}`);
  console.log(`  No match:                    ${stats.noMatch}`);
  console.log('');
  console.log('Filtering:');
  console.log(`  Dedup (already in DB):       ${stats.dedupSkipped}`);
  console.log(`  Null/zero price:             ${stats.nullPrice}`);
  console.log('');
  console.log('Insert:');
  console.log(`  Records to insert:           ${toInsert.length}`);
  console.log(`  Unique providers:            ${uniqueProviders.size}`);
  console.log(`  Current DB pricing:          ${existingPricing.length}`);
  console.log(`  After insert:                ${existingPricing.length + toInsert.length}`);
  console.log('');
  console.log(`Unmatched saved to: ${UNMATCHED_PATH} (${unmatched.length} rows)`);
  console.log('');

  if (toInsert.length > 0) {
    // Sample by category
    const byCat = {};
    for (const r of toInsert) {
      byCat[r.procedure_type] = (byCat[r.procedure_type] || 0) + 1;
    }
    console.log('By procedure_type (top 15):');
    Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 15)
      .forEach(([t, c]) => console.log(`  ${t.padEnd(32)} ${c}`));
    console.log('');
  }

  if (DRY_RUN) {
    console.log('DRY RUN — no DB changes. Re-run with --yes to execute.');
    return;
  }

  // Execute inserts in batches
  console.log(`Inserting ${toInsert.length} records in batches of ${INSERT_BATCH}...`);
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += INSERT_BATCH) {
    const batch = toInsert.slice(i, i + INSERT_BATCH);
    const { error } = await sb.from('provider_pricing').insert(batch);
    if (error) {
      console.error(`  batch ${Math.floor(i / INSERT_BATCH) + 1} failed:`, error);
      process.exit(1);
    }
    inserted += batch.length;
    if (inserted % 500 === 0 || inserted === toInsert.length) {
      console.log(`  inserted ${inserted} / ${toInsert.length}`);
    }
  }
  console.log(`\nDone. Inserted ${inserted} price records for ${uniqueProviders.size} providers.`);
}

main().catch((err) => {
  console.error('ERROR:', err.message ?? err);
  process.exit(1);
});

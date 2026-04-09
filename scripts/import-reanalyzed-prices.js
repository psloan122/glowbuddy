/**
 * Import Claude-reanalyzed scraped prices into provider_pricing.
 *
 * Source: ~/Downloads/glowbuddy_prices/prices_clean.csv
 * Match:  business_name + city + state → providers.id
 * Insert: provider_pricing rows with source='scrape', verified=false
 *
 * Behavior: deletes any existing source='scrape' rows first to ensure a clean
 * re-import (the CSV is the source of truth for the scraped dataset).
 *
 * Run: node --env-file=.env scripts/import-reanalyzed-prices.js
 */
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const CSV_PATH = join(homedir(), 'Downloads', 'glowbuddy_prices', 'prices_clean.csv');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

// ── Procedure mapping ────────────────────────────────────────────────────
// Maps CSV final_procedure + final_brand + claude_area to canonical
// procedure_type values from src/lib/constants.js PROCEDURE_TYPES.

function mapProcedure(row) {
  const proc = (row.final_procedure || '').toLowerCase();
  const brand = (row.final_brand || '').toLowerCase();
  const area = (row.claude_area || '').toLowerCase();

  // ─ Neurotoxins ─
  if (proc === 'neurotoxin') {
    if (brand.includes('jeuveau') || brand.includes('newtox')) return 'Jeuveau';
    if (brand.includes('daxxify')) return 'Daxxify';
    // lip flip detection
    if (area.includes('lip flip') || area.includes('lip_flip')) return 'Botox Lip Flip';
    return 'Botox / Dysport / Xeomin';
  }

  // ─ Fillers ─
  if (proc === 'filler') {
    if (area.includes('lip')) return 'Lip Filler';
    if (area.includes('cheek')) return 'Cheek Filler';
    if (area.includes('jawline') || area.includes('jaw')) return 'Jawline Filler';
    if (area.includes('nasolabial') || area.includes('smile') || area.includes('marionette')) return 'Nasolabial Filler';
    if (area.includes('under eye') || area.includes('under_eye') || area.includes('tear')) return 'Under Eye Filler';
    if (area.includes('chin')) return 'Chin Filler';
    if (area.includes('nose')) return 'Nose Filler';
    if (area.includes('hand')) return 'Hand Filler';
    if (area.includes('temple')) return 'Temple Filler';
    // Kybella is often scraped as "filler" but brand reveals it
    if (brand.includes('kybella')) return 'Kybella';
    if (brand.includes('sculptra')) return 'Sculptra';
    return 'Lip Filler'; // default filler
  }

  // ─ Laser Hair Removal ─
  if (proc === 'laser_hair_removal') return 'Laser Hair Removal';

  // ─ Laser (non-hair) ─
  if (proc === 'laser') {
    if (brand.includes('ipl') || brand.includes('photofacial') || brand.includes('bbl')) return 'IPL / Photofacial';
    if (brand.includes('co2') || brand.includes('coolpeel') || brand.includes('helix') || brand.includes('fraxel')) return 'Fractional CO2 Laser';
    if (brand.includes('clear') && brand.includes('brilliant')) return 'Clear + Brilliant';
    if (brand.includes('halo')) return 'Halo Laser';
    if (brand.includes('pico')) return 'Picosure / Picoway';
    if (brand.includes('erbium')) return 'Erbium Laser';
    if (brand.includes('laser genesis')) return 'IPL / Photofacial';
    return 'IPL / Photofacial'; // default laser
  }

  // ─ Microneedling ─
  if (proc === 'microneedling') {
    if (brand.includes('morpheus')) return 'Morpheus8';
    if (brand.includes('prp')) return 'PRP Microneedling';
    if (brand.includes('exosome')) return 'Exosome Microneedling';
    return 'Microneedling';
  }

  // ─ RF Microneedling ─
  if (proc === 'rf_microneedling') {
    if (brand.includes('morpheus')) return 'Morpheus8';
    return 'RF Microneedling';
  }

  // ─ Chemical Peel ─
  if (proc === 'chemical_peel') return 'Chemical Peel';

  // ─ HydraFacial ─
  if (proc === 'hydrafacial') return 'HydraFacial';

  // ─ Skin Treatment ─
  if (proc === 'skin_treatment') {
    if (brand.includes('hydrafacial') || brand.includes('hydra facial')) return 'HydraFacial';
    if (brand.includes('dermaplan')) return 'Dermaplaning';
    if (brand.includes('led')) return 'LED Therapy';
    if (brand.includes('microdermabrasion')) return 'Microdermabrasion';
    if (brand.includes('diamondglow') || brand.includes('diamond_glow')) return 'Microdermabrasion';
    if (brand.includes('vi peel') || brand.includes('peel')) return 'Chemical Peel';
    return 'Chemical Peel'; // default skin treatment
  }

  // ─ Weight Loss ─
  if (proc === 'weight_loss') {
    if (brand.includes('semaglutide')) return 'Semaglutide (Ozempic / Wegovy)';
    if (brand.includes('tirzepatide')) return 'Tirzepatide (Mounjaro / Zepbound)';
    if (brand.includes('liraglutide') || brand.includes('saxenda')) return 'Liraglutide (Saxenda)';
    if (brand.includes('b12')) return 'B12 Injection';
    return 'GLP-1 (unspecified)';
  }

  // ─ Body Contouring ─
  if (proc === 'body_contouring' || proc === 'coolsculpting') {
    if (brand.includes('coolsculpting')) return 'CoolSculpting';
    if (brand.includes('emsculpt')) return 'Emsculpt NEO';
    if (brand.includes('kybella')) return 'Kybella';
    if (brand.includes('trusculpt')) return 'truSculpt';
    if (brand.includes('sculpsure')) return 'SculpSure';
    if (brand.includes('velashape')) return 'Velashape';
    if (brand.includes('truflex')) return 'Emsculpt NEO';
    if (proc === 'coolsculpting') return 'CoolSculpting';
    return 'CoolSculpting'; // default body contouring
  }

  // ─ IV Wellness ─
  if (proc === 'iv_wellness') return 'IV Therapy';

  // ─ Thread Lift ─
  if (proc === 'thread_lift') return 'PDO Thread Lift';

  // ─ PRP ─
  if (proc === 'prp') {
    if (area.includes('hair') || area.includes('scalp')) return 'PRP Hair Restoration';
    return 'PRP Injections';
  }

  // Skip: other, package, flat_package, waxing
  return null;
}

// ── Brand normalization ──
// Normalize the brand name to the canonical form used in the app.
function normalizeBrand(brand, procedureType) {
  if (!brand) return null;
  const b = brand.toLowerCase();

  // Neurotoxin brands
  if (b.includes('botox')) return 'Botox';
  if (b.includes('dysport')) return 'Dysport';
  if (b.includes('xeomin')) return 'Xeomin';
  if (b.includes('jeuveau') || b.includes('newtox')) return 'Jeuveau';
  if (b.includes('daxxify')) return 'Daxxify';

  // Filler brands
  if (b.includes('juvederm')) return 'Juvederm';
  if (b.includes('restylane')) return 'Restylane';
  if (b.includes('rha')) return 'RHA';
  if (b.includes('versa') || b.includes('revanesse')) return 'Revanesse Versa';
  if (b.includes('belotero')) return 'Belotero';
  if (b.includes('sculptra')) return 'Sculptra';
  if (b.includes('radiesse')) return 'Radiesse';
  if (b.includes('kybella')) return 'Kybella';
  if (b.includes('skinvive')) return 'SkinVive';
  if (b.includes('volbella')) return 'Juvederm';
  if (b.includes('vollure')) return 'Juvederm';
  if (b.includes('voluma')) return 'Juvederm';

  // Microneedling brands
  if (b.includes('morpheus')) return 'Morpheus8';
  if (b.includes('skinpen')) return 'SkinPen';

  // Weight loss brands
  if (b.includes('semaglutide')) return 'Semaglutide';
  if (b.includes('tirzepatide')) return 'Tirzepatide';

  // For non-injectable procedures, brand is often the device/product name
  // which we don't need to normalize further
  return brand;
}

// Build a name+city+state key for provider matching.
function buildKey(name, city, state) {
  return `${name}|${city}|${state}`.toLowerCase().trim();
}

function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/®|™/g, '')
    .replace(/[®™©]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  console.log(`\nReading CSV: ${CSV_PATH}`);
  const csv = readFileSync(CSV_PATH, 'utf8');
  const rows = parse(csv, { columns: true, skip_empty_lines: true, trim: true });
  console.log(`Total CSV rows: ${rows.length}`);

  // 1. Fetch all active providers in one batch (paginated).
  console.log('\nFetching providers from Supabase...');
  const allProviders = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('providers')
      .select('id, name, city, state')
      .eq('is_active', true)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allProviders.push(...data);
    if (data.length < PAGE) break;
  }
  console.log(`Loaded ${allProviders.length} active providers`);

  // 2. Build a name+city+state lookup.
  const providerByKey = new Map();
  for (const p of allProviders) {
    if (!p.name || !p.city || !p.state) continue;
    const key = buildKey(normalizeName(p.name), p.city, p.state);
    providerByKey.set(key, p);
  }

  // 3. Delete existing scraped rows so the import is a clean re-sync.
  console.log('\nDeleting existing source=scrape rows...');
  const { count: deletedCount, error: delError } = await supabase
    .from('provider_pricing')
    .delete({ count: 'exact' })
    .eq('source', 'scrape');
  if (delError) throw delError;
  console.log(`Deleted ${deletedCount ?? '?'} existing scraped rows`);

  // 4. Match each CSV row to a provider and build insert payloads.
  const inserts = [];
  const skipped = { unmatched: 0, badProc: 0, badPrice: 0 };
  const unmatchedSamples = [];
  const procCounts = {};

  for (const row of rows) {
    const procedureType = mapProcedure(row);
    if (!procedureType) {
      skipped.badProc++;
      continue;
    }

    const price = parseFloat(String(row.price_value || '').replace(/[$,]/g, ''));
    if (!Number.isFinite(price) || price <= 0) {
      skipped.badPrice++;
      continue;
    }

    const key = buildKey(normalizeName(row.business_name), row.city, row.state);
    const provider = providerByKey.get(key);
    if (!provider) {
      skipped.unmatched++;
      if (unmatchedSamples.length < 10) {
        unmatchedSamples.push(`${row.business_name} · ${row.city}, ${row.state}`);
      }
      continue;
    }

    const brand = normalizeBrand(row.final_brand, procedureType);

    inserts.push({
      provider_id: provider.id,
      procedure_type: procedureType,
      brand: brand || null,
      price: Math.round(price),
      price_label: row.final_price_type || null,
      treatment_area: row.claude_area || null,
      units_or_volume: row.claude_units_included || null,
      source: 'scrape',
      verified: false,
      source_url: row.page_url || null,
      scraped_at: row.scraped_at || new Date().toISOString(),
      notes: null,
      is_active: true,
    });

    procCounts[procedureType] = (procCounts[procedureType] || 0) + 1;
  }

  console.log(`\nMatched: ${inserts.length}`);
  console.log(`Skipped (no provider match): ${skipped.unmatched}`);
  console.log(`Skipped (unmapped procedure): ${skipped.badProc}`);
  console.log(`Skipped (invalid price):      ${skipped.badPrice}`);
  if (unmatchedSamples.length > 0) {
    console.log('\nSample unmatched businesses:');
    unmatchedSamples.forEach((s) => console.log(`  - ${s}`));
  }
  console.log('\nProcedure type breakdown:');
  Object.entries(procCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([proc, count]) => console.log(`  ${proc}: ${count}`));

  // 5. Bulk insert in chunks.
  console.log('\nInserting...');
  const CHUNK = 200;
  let inserted = 0;
  for (let i = 0; i < inserts.length; i += CHUNK) {
    const slice = inserts.slice(i, i + CHUNK);
    const { error } = await supabase.from('provider_pricing').insert(slice);
    if (error) {
      console.error(`Insert chunk failed at ${i}:`, error.message);
      throw error;
    }
    inserted += slice.length;
    process.stdout.write(`  ${inserted}/${inserts.length}\r`);
  }
  console.log(`\nInserted: ${inserted}`);

  console.log('\n=== IMPORT COMPLETE ===');
  console.log(`Imported: ${inserted}`);
  console.log(`Skipped:  ${skipped.unmatched + skipped.badProc + skipped.badPrice}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

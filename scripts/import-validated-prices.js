/**
 * Import high-confidence validated scraped prices into provider_pricing.
 *
 * Source: ~/Downloads/glowbuddy_prices/prices_validated.csv
 * Filter: confidence = 'high' AND new_price_type != 'parse_error'
 * Match:  business_name + city + state → providers.id
 * Insert: provider_pricing rows with source='scrape', verified=false
 *
 * Behavior: deletes any existing source='scrape' rows first to ensure a clean
 * re-import (the CSV is the source of truth for the scraped dataset).
 *
 * Run: node --env-file=.env scripts/import-validated-prices.js
 */
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const CSV_PATH = join(homedir(), 'Downloads', 'glowbuddy_prices', 'prices_validated.csv');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// CSV procedure_guess → canonical procedure_type used elsewhere in the app.
function mapProcedure(guess) {
  if (!guess) return null;
  const g = guess.toLowerCase();
  if (g === 'neurotoxin' || g.includes('botox') || g.includes('dysport') || g.includes('xeomin')) {
    return 'Botox / Dysport / Xeomin';
  }
  if (g === 'filler' || g.includes('filler')) return 'Lip Filler';
  return null;
}

// ── Treatment area extraction ──
// Scans the raw_text snippet for the closest area name to the price match.
// Returns the canonical area key (forehead/glabella/11s/lip flip/etc.) or null.
const AREA_PATTERNS = [
  { key: 'forehead', re: /\bforehead(?:\s+lines?)?\b/i },
  { key: 'glabella', re: /\bglabella\b/i },
  { key: '11s', re: /\b(?:11['’]?s|11s)\b/i },
  { key: 'frown lines', re: /\bfrown(?:\s+lines?)?\b/i },
  { key: "crow's feet", re: /\bcrow['’]?s?\s*feet\b/i },
  { key: 'bunny lines', re: /\bbunny(?:\s+lines?)?\b/i },
  { key: 'lip flip', re: /\blip\s*flip\b/i },
  { key: 'gummy smile', re: /\bgummy\s*smile\b/i },
  { key: 'eyebrow lift', re: /\b(?:eye)?brow\s*lift\b/i },
  { key: 'masseter', re: /\bmasseter\b/i },
  { key: 'jawline', re: /\bjawline\b/i },
  { key: 'jaw', re: /\bjaw\b/i },
  { key: 'chin', re: /\bdimpled?\s*chin\b|\bchin\b/i },
  { key: 'neck bands', re: /\bneck\s*bands?\b|\bplatysmal\b/i },
  { key: 'underarm', re: /\bunder\s*arms?\b|\bhyperhidrosis\b/i },
  { key: 'full face', re: /\bfull\s*face\b/i },
  { key: '3 areas', re: /\b(?:three|3)\s*areas?\b/i },
  { key: '2 areas', re: /\b(?:two|2)\s*areas?\b/i },
];

// Look for an area name within a window around the price match in raw_text.
function extractTreatmentArea(rawText, priceValue) {
  if (!rawText || priceValue == null) return null;
  const text = String(rawText);
  // Find the price string ($XXX or $XXX.YY) in the text and look at the
  // 80 chars on each side for an area keyword.
  const priceStr = String(priceValue).replace(/\.0+$/, '');
  const dollarRe = new RegExp(
    `\\$\\s*${priceStr.replace(/\./g, '\\.')}(?:\\.\\d+)?`,
    'i',
  );
  const m = text.match(dollarRe);
  let window = text;
  if (m && m.index != null) {
    const start = Math.max(0, m.index - 80);
    const end = Math.min(text.length, m.index + 80);
    window = text.slice(start, end);
  }
  for (const { key, re } of AREA_PATTERNS) {
    if (re.test(window)) return key;
  }
  // Fallback: scan the whole snippet for an area mention
  for (const { key, re } of AREA_PATTERNS) {
    if (re.test(text)) return key;
  }
  return null;
}

// Pull "N units" or "N syringes" from the same window.
function extractUnitsText(rawText, priceValue) {
  if (!rawText || priceValue == null) return null;
  const text = String(rawText);
  const priceStr = String(priceValue).replace(/\.0+$/, '');
  const dollarRe = new RegExp(
    `\\$\\s*${priceStr.replace(/\./g, '\\.')}(?:\\.\\d+)?`,
    'i',
  );
  const m = text.match(dollarRe);
  const window =
    m && m.index != null
      ? text.slice(Math.max(0, m.index - 60), Math.min(text.length, m.index + 60))
      : text;
  const units = window.match(/(\d{1,3})\s*(?:units?|u\b)/i);
  if (units) return `${units[1]} units`;
  const syr = window.match(/(\d{1,2})\s*syringes?/i);
  if (syr) return `${syr[1]} syringes`;
  return null;
}

// Build a name+city+state key for fuzzy provider matching.
function buildKey(name, city, state) {
  return `${name}|${city}|${state}`.toLowerCase().trim();
}

// Strip suffixes / locations / punctuation that scrape may have added.
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

  const validRows = rows.filter(
    (r) => r.confidence === 'high' && r.new_price_type !== 'parse_error'
  );
  console.log(`High-confidence valid rows: ${validRows.length}`);

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

  // 2. Build a name+city+state lookup. Multiple providers may share a name
  // (e.g. dermani MEDSPA® Buckhead vs Sandy Springs) — exact name match wins.
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

  for (const row of validRows) {
    const procedureType = mapProcedure(row.procedure_guess);
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

    // Try to capture an area label and units text from raw_text — only useful
    // for flat_rate_area / per_treatment rows where the area name lives in the
    // surrounding text rather than a structured column.
    const treatmentArea =
      row.new_price_type === 'flat_rate_area' || row.new_price_type === 'per_treatment'
        ? extractTreatmentArea(row.raw_text, row.price_value)
        : null;
    const unitsText = extractUnitsText(row.raw_text, row.price_value);

    inserts.push({
      provider_id: provider.id,
      procedure_type: procedureType,
      price: Math.round(price),
      price_label: row.new_price_type, // 'per_unit' / 'per_syringe' / 'flat_rate_area' / etc.
      treatment_area: treatmentArea,
      units_or_volume: unitsText,
      source: 'scrape',
      verified: false,
      source_url: row.page_url || null,
      scraped_at: row.scraped_at || new Date().toISOString(),
      notes: row.reclassify_reason || null,
      is_active: true,
    });
  }

  console.log(`\nMatched: ${inserts.length}`);
  console.log(`Skipped (no provider match): ${skipped.unmatched}`);
  console.log(`Skipped (unknown procedure):  ${skipped.badProc}`);
  console.log(`Skipped (invalid price):      ${skipped.badPrice}`);
  if (unmatchedSamples.length > 0) {
    console.log('\nSample unmatched businesses:');
    unmatchedSamples.forEach((s) => console.log(`  - ${s}`));
  }

  // 5. Bulk insert in chunks to avoid request size limits.
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

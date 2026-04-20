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

// ── Brand extraction ──
// When a scraped page lists prices per brand (e.g. "Botox $15 / Dysport $5 /
// Xeomin $14"), each CSV row maps to a single price match. We need to attach
// the *closest* brand name to that price so the row stores the right brand
// rather than collapsing all three into one ambiguous "neurotoxin" row.
//
// Strategy: find every brand mention in raw_text, find the price match in
// raw_text, and pick the brand whose mention is closest to the price (within
// 60 chars). Returns null when no brand is within range.
const NEUROTOXIN_BRANDS = [
  { name: 'Daxxify', re: /\bdaxxify\b/i },
  { name: 'Jeuveau', re: /\bjeuveau\b/i },
  { name: 'Xeomin',  re: /\bxeomin\b/i },
  { name: 'Dysport', re: /\bdysport\b/i },
  { name: 'Botox',   re: /\bbotox\b/i },
];

const FILLER_BRANDS = [
  { name: 'Juvederm',  re: /\bjuv[eé]derm\b/i },
  { name: 'Restylane', re: /\brestylane\b/i },
  { name: 'RHA',       re: /\brha\b/i },
  { name: 'Versa',     re: /\bversa\b/i },
  { name: 'Belotero',  re: /\bbelotero\b/i },
];

function brandsForProcedure(procedureType) {
  if (!procedureType) return [];
  const t = String(procedureType).toLowerCase();
  if (t.includes('botox') || t.includes('neurotoxin') || t.includes('dysport')) {
    return NEUROTOXIN_BRANDS;
  }
  if (t.includes('filler') || t.includes('lip')) return FILLER_BRANDS;
  return [];
}

function extractBrand(rawText, priceValue, procedureType) {
  const brands = brandsForProcedure(procedureType);
  if (brands.length === 0 || !rawText) return null;
  const text = String(rawText);

  // Locate the price string in raw_text — preferred anchor for proximity.
  let priceIdx = null;
  if (priceValue != null) {
    const priceStr = String(priceValue).replace(/\.0+$/, '');
    const dollarRe = new RegExp(
      `\\$\\s*${priceStr.replace(/\./g, '\\.')}(?:\\.\\d+)?`,
      'i',
    );
    const m = text.match(dollarRe);
    if (m && m.index != null) priceIdx = m.index;
  }

  // Walk every brand mention; track the closest one to the price anchor.
  let best = null;
  for (const b of brands) {
    const r = new RegExp(b.re.source, 'gi');
    let bm;
    while ((bm = r.exec(text)) !== null) {
      const dist = priceIdx == null ? bm.index : Math.abs(bm.index - priceIdx);
      if (!best || dist < best.dist) {
        best = { name: b.name, dist };
      }
    }
  }

  // Only accept if the brand is reasonably close to the price (or anywhere in
  // text when there's no price anchor).
  if (!best) return null;
  if (priceIdx == null) return best.name;
  return best.dist <= 60 ? best.name : null;
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

// ── Patch 3: Wrong-page-type URL blocklist ────────────────────────────────────
// Skip rows whose source URL path indicates a non-pricing page (weight-loss
// programs, wholesale portals, provider-only content). Mirrors the same guard
// in extract_units.py. Applied per row so it catches URLs that entered via
// the validated CSV from a prior scrape.
const WRONG_PAGE_RE = /\/(weight[-_]?loss|weight[-_]management|wholesale|provider[-_]?portal|staff[-_]?only|b2b)\b/i;

// ── Post-assignment plausibility guard ────────────────────────────────────────
// The validated CSV assigns price_label from automated classification. For
// neurotoxins the most common error is assigning per_unit to session-range
// prices (e.g. $250 labelled per_unit) or per_session to unit-range prices
// (e.g. $20 labelled per_session). These constants and the function below
// catch those cases at import time rather than relying on a post-hoc migration.
const NEUROTOXIN_PER_UNIT_MAX = 50;   // $50/unit is the realistic ceiling
const NEUROTOXIN_SESSION_MIN  = 50;   // anything under $50 can't be a real session
const NEUROTOXIN_PER_UNIT_MIN = 8;    // Patch 4: floor for scraper-sourced per_unit rows

function fixNeurotoxinLabel(price, label, procedureType) {
  if (!procedureType) return label;
  const t = procedureType.toLowerCase();
  const isNeurotoxin =
    t.includes('botox') || t.includes('dysport') || t.includes('xeomin') ||
    t.includes('jeuveau') || t.includes('daxxify') || t.includes('neurotox');
  if (!isNeurotoxin) return label;

  if (label === 'per_unit' && price > NEUROTOXIN_PER_UNIT_MAX) {
    return price > 300 ? 'flat_package' : 'per_session';
  }
  if ((label === 'per_session' || label === 'flat_package') && price < NEUROTOXIN_SESSION_MIN) {
    return 'per_unit';
  }
  return label;
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
  const skipped = { unmatched: 0, badProc: 0, badPrice: 0, wrongPage: 0, belowFloor: 0 };
  const unmatchedSamples = [];

  for (const row of validRows) {
    // Patch 3: skip rows whose source URL indicates a non-pricing page
    if (WRONG_PAGE_RE.test(row.page_url || '')) {
      skipped.wrongPage++;
      continue;
    }

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
    const brand = extractBrand(row.raw_text, row.price_value, procedureType);

    const rawLabel = row.new_price_type;
    const price_label = fixNeurotoxinLabel(Math.round(price), rawLabel, procedureType);
    if (price_label !== rawLabel) {
      console.warn(
        `  RECLASSIFY ${procedureType} $${Math.round(price)}: ` +
        `${rawLabel} → ${price_label} (${row.business_name}, ${row.city} ${row.state})`,
      );
    }

    // Patch 4: per_unit floor — skip scraper rows below the realistic minimum.
    // Real sub-$8 Botox pricing should enter via provider_listed or community,
    // not via automated scraper CSV import.
    const isNeurotoxin =
      procedureType.toLowerCase().includes('botox') ||
      procedureType.toLowerCase().includes('dysport') ||
      procedureType.toLowerCase().includes('xeomin') ||
      procedureType.toLowerCase().includes('neurotox');
    if (isNeurotoxin && price_label === 'per_unit' && Math.round(price) < NEUROTOXIN_PER_UNIT_MIN) {
      skipped.belowFloor++;
      continue;
    }

    inserts.push({
      provider_id: provider.id,
      procedure_type: procedureType,
      brand,
      price: Math.round(price),
      price_label, // plausibility-corrected label
      treatment_area: treatmentArea,
      units_or_volume: unitsText,
      source: 'scrape',
      verified: false,
      source_url: row.page_url || null,
      scraped_at: row.scraped_at || new Date().toISOString(),
      // IMPORTANT: never write reclassify_reason (or any internal classifier
      // diagnostic) into notes — that field is consumer-facing copy. The
      // classifier reason is debug-only and stays out of the database.
      notes: null,
      is_active: true,
    });
  }

  console.log(`\nMatched: ${inserts.length}`);
  console.log(`Skipped (no provider match): ${skipped.unmatched}`);
  console.log(`Skipped (unknown procedure):  ${skipped.badProc}`);
  console.log(`Skipped (invalid price):      ${skipped.badPrice}`);
  console.log(`Skipped (wrong page URL):     ${skipped.wrongPage}`);    // Patch 3
  console.log(`Skipped (below unit floor):   ${skipped.belowFloor}`);  // Patch 4
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

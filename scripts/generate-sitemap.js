/**
 * generate-sitemap.js
 *
 * Builds public/sitemap.xml at build time so Google can crawl every populated
 * city price report. Preserves any existing non-/prices/* <url> entries.
 *
 * Sources of truth:
 *   1. procedure_price_averages materialized view (cities with submission_count >= 5)
 *   2. provider_pricing joined to providers (cities with >= 5 rows)
 *
 * Run via: npm run build:sitemap (chained from `npm run build`)
 *
 * Required env vars (loaded by `node --env-file=.env`):
 *   SUPABASE_URL (or VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY)
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SITE_URL = 'https://glowbuddy.com';
const SITEMAP_PATH = resolve(__dirname, '..', 'public', 'sitemap.xml');
const MIN_SUBMISSIONS = 5;

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Non-fatal: skip cleanly if env isn't configured (e.g. CI without Supabase
// secrets). The committed sitemap.xml will be used as-is in that case.
if (!supabaseUrl || !supabaseKey) {
  console.warn('[sitemap] Skipping: SUPABASE env vars not set — keeping existing sitemap.xml');
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function slugify(str) {
  return String(str)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function citySlug(city, state) {
  return `${slugify(city)}-${String(state).toLowerCase()}`;
}

async function fetchCitiesFromMaterializedView() {
  const { data, error } = await supabase
    .from('procedure_price_averages')
    .select('city, state, submission_count')
    .gte('submission_count', MIN_SUBMISSIONS);

  if (error) {
    console.warn('Could not query procedure_price_averages:', error.message);
    return [];
  }
  return data || [];
}

async function fetchCitiesFromProviderPricing() {
  // Pull every provider+city; aggregate in JS to avoid GROUP BY shenanigans.
  const { data, error } = await supabase
    .from('provider_pricing')
    .select('providers!inner(city, state)');

  if (error) {
    console.warn('Could not query provider_pricing:', error.message);
    return [];
  }

  const counts = new Map();
  for (const row of data || []) {
    const provider = row.providers;
    if (!provider?.city || !provider?.state) continue;
    const key = `${provider.city}|${provider.state}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count >= MIN_SUBMISSIONS)
    .map(([key]) => {
      const [city, state] = key.split('|');
      return { city, state };
    });
}

function loadExistingNonPricesEntries() {
  if (!existsSync(SITEMAP_PATH)) return [];
  const content = readFileSync(SITEMAP_PATH, 'utf8');
  const blocks = [];
  const urlRegex = /<url>[\s\S]*?<\/url>/g;
  let match;
  while ((match = urlRegex.exec(content)) !== null) {
    const block = match[0];
    const locMatch = block.match(/<loc>([^<]+)<\/loc>/);
    const loc = locMatch ? locMatch[1] : '';
    if (loc && !loc.includes('/prices')) {
      blocks.push(block);
    }
  }
  return blocks;
}

function buildUrlBlock(loc, lastmod, priority) {
  const lines = [`    <loc>${loc}</loc>`];
  if (lastmod) lines.push(`    <lastmod>${lastmod}</lastmod>`);
  if (priority) lines.push(`    <priority>${priority}</priority>`);
  return `  <url>\n${lines.join('\n')}\n  </url>`;
}

async function main() {
  console.log('Generating sitemap…');

  const [mvCities, ppCities] = await Promise.all([
    fetchCitiesFromMaterializedView(),
    fetchCitiesFromProviderPricing(),
  ]);

  const seen = new Set();
  const cities = [];
  for (const c of [...mvCities, ...ppCities]) {
    if (!c.city || !c.state) continue;
    const slug = citySlug(c.city, c.state);
    if (seen.has(slug)) continue;
    seen.add(slug);
    cities.push({ city: c.city, state: c.state, slug });
  }
  cities.sort((a, b) => a.slug.localeCompare(b.slug));

  console.log(`Found ${cities.length} populated cities (MV: ${mvCities.length}, PP: ${ppCities.length})`);

  const today = new Date().toISOString().split('T')[0];
  const preserved = loadExistingNonPricesEntries();

  const priceBlocks = [
    buildUrlBlock(`${SITE_URL}/prices`, today, '0.9'),
    ...cities.map((c) => buildUrlBlock(`${SITE_URL}/prices/${c.slug}`, today, '0.8')),
  ];

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    [...preserved, ...priceBlocks].join('\n') +
    '\n</urlset>\n';

  writeFileSync(SITEMAP_PATH, xml, 'utf8');
  console.log(`Wrote ${SITEMAP_PATH} (${preserved.length} preserved + ${priceBlocks.length} price entries)`);
}

main().catch((err) => {
  // Non-fatal: log and exit 0 so a Supabase hiccup doesn't break the build.
  // The committed sitemap.xml stays as the fallback.
  console.warn('[sitemap] Generation failed (non-fatal):', err?.message || err);
  process.exit(0);
});

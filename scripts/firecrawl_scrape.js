/**
 * Firecrawl batch scrape — runs the pre-built payload against
 * /v1/batch/scrape and saves raw results. Polls until completion,
 * backs off on 429 / 5xx, paginates through `next` links.
 *
 * Input:  data/firecrawl_batch_payload.json  (urls + extract schema)
 * Output: data/firecrawl_results.json        (raw aggregated results)
 *
 * Usage:
 *   node --env-file=.env scripts/firecrawl_scrape.js
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PAYLOAD_PATH = path.join(ROOT, 'data', 'firecrawl_batch_payload.json');
const RESULTS_PATH = path.join(ROOT, 'data', 'firecrawl_results.json');

const API_BASE = 'https://api.firecrawl.dev';
const SUBMIT_ENDPOINT = `${API_BASE}/v1/batch/scrape`;
const POLL_START_MS = 10_000;   // 10s initial poll interval
const POLL_MAX_MS = 60_000;     // cap poll interval at 60s
const POLL_STEP_MS = 5_000;     // bump 5s per poll
const MAX_BACKOFF_RETRIES = 8;

const apiKey = process.env.FIRECRAWL_API_KEY;
if (!apiKey) {
  console.error('FIRECRAWL_API_KEY is not set. Add it to .env and re-run:');
  console.error('  echo "FIRECRAWL_API_KEY=fc-..." >> .env');
  process.exit(1);
}

// --- helpers -----------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function request(url, options = {}, attempt = 0) {
  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(options.headers || {}),
      },
    });
  } catch (err) {
    if (attempt >= MAX_BACKOFF_RETRIES) throw err;
    const backoff = Math.min(2 ** attempt * 1000, POLL_MAX_MS);
    console.log(`  [network error] backing off ${Math.round(backoff / 1000)}s (attempt ${attempt + 1}): ${err.message}`);
    await sleep(backoff);
    return request(url, options, attempt + 1);
  }

  if (res.status === 429 || res.status >= 500) {
    if (attempt >= MAX_BACKOFF_RETRIES) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status} after ${attempt} retries: ${body}`);
    }
    const retryAfterHdr = Number(res.headers.get('retry-after')) || 0;
    const expBackoff = Math.min(2 ** attempt * 1000, POLL_MAX_MS);
    const delay = Math.max(retryAfterHdr * 1000, expBackoff) + Math.floor(Math.random() * 500);
    console.log(`  [${res.status}] backing off ${Math.round(delay / 1000)}s (attempt ${attempt + 1})`);
    await sleep(delay);
    return request(url, options, attempt + 1);
  }

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON response: ${text.slice(0, 200)}`);
  }
}

// Booking platforms show deposits/fees, not real procedure prices — skip them.
const BOOKING_PLATFORM_BLOCKLIST = [
  'glossgenius.com', 'vagaro.com', 'squareup.com', 'square.site',
  'mindbodyonline.com', 'booker.com', 'schedulicity.com',
  'acuityscheduling.com', 'janeapp.com', 'fresha.com',
  'boulevard.app', 'zenoti.com', 'booksy.com', 'as.me',
  'setmore.com', 'appointy.com', 'simplybook.me', 'phorest.com',
  'timely.com', 'treatwell.co', 'healthie.com', 'intakeq.com',
];

function isBookingPlatform(url) {
  const lower = (url || '').toLowerCase();
  return BOOKING_PLATFORM_BLOCKLIST.some((p) => lower.includes(p));
}

// --- submit + poll ------------------------------------------------------
async function submitBatch(payload) {
  const filtered = payload.urls.filter((u) => !isBookingPlatform(u));
  const skipped = payload.urls.length - filtered.length;
  if (skipped > 0) console.log(`Skipped ${skipped} booking platform URLs`);

  const body = {
    urls: filtered,
    formats: payload.formats ?? ['extract'],
    extract: payload.extract,
    onlyMainContent: payload.onlyMainContent ?? true,
    timeout: payload.timeout ?? 30_000,
  };

  console.log(`Submitting batch: ${body.urls.length} URLs, formats=${JSON.stringify(body.formats)}`);
  const out = await request(SUBMIT_ENDPOINT, { method: 'POST', body: JSON.stringify(body) });

  if (!out.success || !out.id) {
    throw new Error(`Batch submit failed: ${JSON.stringify(out)}`);
  }
  console.log(`Batch submitted: id=${out.id}`);
  return out.id;
}

async function pollBatch(batchId) {
  const statusUrl = `${API_BASE}/v1/batch/scrape/${batchId}`;
  const aggregated = { id: batchId, data: [] };
  let interval = POLL_START_MS;
  let lastProgress = -1;

  // Wait for completion
  while (true) {
    const page = await request(statusUrl);
    const status = page.status;
    const completed = Number(page.completed ?? 0);
    const total = Number(page.total ?? 0);

    if (completed !== lastProgress) {
      console.log(`  [${status}] ${completed} / ${total}`);
      lastProgress = completed;
    }

    if (status === 'failed' || status === 'cancelled') {
      throw new Error(`Batch ${status}: ${JSON.stringify(page).slice(0, 500)}`);
    }

    if (status === 'completed') {
      if (Array.isArray(page.data)) aggregated.data.push(...page.data);
      aggregated.status = status;
      aggregated.total = page.total;
      aggregated.completed = page.completed;
      aggregated.creditsUsed = page.creditsUsed;

      // Drain pagination
      let next = page.next;
      while (next) {
        const p = await request(next);
        if (Array.isArray(p.data)) aggregated.data.push(...p.data);
        next = p.next;
        console.log(`  paginated: ${aggregated.data.length} pages drained`);
      }
      return aggregated;
    }

    await sleep(interval);
    interval = Math.min(interval + POLL_STEP_MS, POLL_MAX_MS);
  }
}

// --- reporting ---------------------------------------------------------
function summarize(results, submittedCount) {
  const data = results.data ?? [];
  let withPrices = 0;
  let withoutPrices = 0;
  let scrapeErrors = 0;

  for (const entry of data) {
    if (entry?.error || entry?.success === false) {
      scrapeErrors++;
      continue;
    }
    // Firecrawl returns the extracted JSON under `extract` (legacy format)
    // or `json` (newer format). Handle both.
    const extracted = entry?.extract ?? entry?.json ?? {};
    const hasMenu = extracted.has_price_menu === true;
    const hasProcedures = Array.isArray(extracted.procedures) && extracted.procedures.length > 0;
    if (hasMenu || hasProcedures) withPrices++;
    else withoutPrices++;
  }

  console.log('');
  console.log('=== FIRECRAWL SCRAPE REPORT ===');
  console.log(`  URLs submitted:   ${submittedCount}`);
  console.log(`  Pages returned:   ${data.length}`);
  console.log(`  With prices:      ${withPrices}`);
  console.log(`  No prices:        ${withoutPrices}`);
  console.log(`  Scrape errors:    ${scrapeErrors}`);
  console.log(`  Credits used:     ${results.creditsUsed ?? 'unknown'}`);
}

// --- main --------------------------------------------------------------
async function main() {
  if (!fs.existsSync(PAYLOAD_PATH)) {
    console.error(`Payload not found: ${PAYLOAD_PATH}`);
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(PAYLOAD_PATH, 'utf-8'));
  if (!Array.isArray(payload.urls) || payload.urls.length === 0) {
    console.error('Payload has no urls[].');
    process.exit(1);
  }

  const batchId = await submitBatch(payload);
  const results = await pollBatch(batchId);

  fs.writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2));
  console.log(`\nSaved raw results to ${RESULTS_PATH}`);

  summarize(results, payload.urls.length);
}

main().catch((err) => {
  console.error('ERROR:', err?.message ?? err);
  process.exit(1);
});

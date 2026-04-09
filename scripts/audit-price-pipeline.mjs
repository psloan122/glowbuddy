#!/usr/bin/env node
// Price Submission Pipeline Audit — read-only (no writes)
// Usage: node scripts/audit-price-pipeline.mjs

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load .env manually (no dotenv dep needed)
const env = {};
for (const line of readFileSync('.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

// Helper: run SQL via a one-off RPC using the REST /rpc path.
// We use a generic exec_sql function if present; otherwise fall back to table selects.
async function sql(q) {
  // Try supabase-js 'rpc' via a wrapper we'll create, otherwise use raw fetch to PostgREST
  // Use the REST endpoint directly
  const r = await fetch(`${url}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q }),
  });
  if (r.ok) return { data: await r.json(), error: null };
  return { data: null, error: { message: await r.text(), status: r.status } };
}

// Fallback: use pg_meta-style raw query through PostgREST is not available without a custom fn.
// Instead we use supabase-js introspection via information_schema exposed as a view, if not
// available, we call PG via the query endpoint used by the Supabase dashboard (pg-meta).

// The Supabase project includes a hidden `pg-meta` endpoint we can query if needed.
// But for safety and portability, we only use table queries against information_schema and
// pg_policies through a simple exec_sql we create now via the REST API.

async function pgMetaQuery(q) {
  // Supabase provides /pg endpoint for dashboard only — not available via REST.
  // Instead, we rely on supabase-js .from() against base tables + any helper RPCs.
  return { error: 'no-pg-meta' };
}

// Because we don't have exec_sql, use supabase-js introspection helpers:
// - list buckets: storage.listBuckets()
// - schema: query information_schema.columns via from() — but PostgREST doesn't expose it.
// Workaround: create a short-lived function? No — we're read-only. Use the Supabase
// management API for schema instead: https://api.supabase.com is not accessible without a PAT.
//
// SOLUTION: Use direct Postgres via `fetch` to the REST /rpc/sql endpoint if one exists.
// If not, we use a well-known trick: query the public.information_schema_columns view.
//
// The simplest reliable path is to call the Supabase SQL endpoint at:
//   POST {url}/rest/v1/rpc/{fn}
// for any function `public.*`. Since we have no such function, we'll probe tables directly
// and build our report from what we can SELECT.

function header(s) {
  console.log('\n' + '='.repeat(72));
  console.log(s);
  console.log('='.repeat(72));
}

async function main() {
  const report = {};

  // ── STEP 1: Storage buckets ────────────────────────────────────────────
  header('STEP 1 — Storage buckets');
  const { data: buckets, error: bErr } = await sb.storage.listBuckets();
  if (bErr) {
    console.log('ERROR:', bErr.message);
  } else {
    console.log(JSON.stringify(buckets, null, 2));
    report.buckets = buckets.map((b) => ({ name: b.name, public: b.public }));
  }

  // ── STEP 2: procedures table ───────────────────────────────────────────
  header('STEP 2 — procedures table');
  const { data: procs, error: pErr, count: procCount } = await sb
    .from('procedures')
    .select('*', { count: 'exact' })
    .limit(100);
  if (pErr) {
    console.log('ERROR:', pErr.message);
    report.procedures = { exists: false, error: pErr.message };
  } else {
    console.log(`Row count: ${procCount}`);
    if (procs && procs[0]) {
      console.log('Columns present in row:', Object.keys(procs[0]));
      console.log('First 5 rows:');
      console.log(JSON.stringify(procs.slice(0, 5), null, 2));
    }
    report.procedures = { exists: true, count: procCount, columns: procs[0] ? Object.keys(procs[0]) : [] };
  }

  // ── STEP 3: find price submission tables ──────────────────────────────
  header('STEP 3 — price submission tables');
  const candidates = [
    'price_submissions',
    'patient_prices',
    'user_prices',
    'price_reports',
    'submissions',
    'prices',
  ];
  report.priceTables = {};
  for (const t of candidates) {
    const { count, error, data } = await sb.from(t).select('*', { count: 'exact', head: false }).limit(1);
    if (!error) {
      console.log(`\n✓ Table exists: ${t} (count=${count})`);
      if (data && data[0]) {
        console.log(`  columns: ${Object.keys(data[0]).join(', ')}`);
        report.priceTables[t] = { count, columns: Object.keys(data[0]) };
      } else {
        report.priceTables[t] = { count, columns: [] };
      }
    }
  }
  if (Object.keys(report.priceTables).length === 0) {
    console.log('No dedicated price submission table found with common names.');
  }

  // ── STEP 5: provider_pricing ───────────────────────────────────────────
  header('STEP 5 — provider_pricing table');
  const { data: ppRows, error: ppErr, count: ppCount } = await sb
    .from('provider_pricing')
    .select('*', { count: 'exact' })
    .limit(3);
  if (ppErr) {
    console.log('ERROR:', ppErr.message);
    report.providerPricing = { exists: false, error: ppErr.message };
  } else {
    console.log(`Row count: ${ppCount}`);
    console.log('Sample rows:', JSON.stringify(ppRows, null, 2));
    const cols = ppRows && ppRows[0] ? Object.keys(ppRows[0]) : [];
    console.log('Columns:', cols);
    report.providerPricing = {
      exists: true,
      count: ppCount,
      columns: cols,
      hasSource: cols.includes('source') || cols.includes('data_source'),
      hasVerified: cols.includes('verified') || cols.includes('is_verified'),
    };
  }

  // Check aggregation by source/verified if columns exist
  if (report.providerPricing?.hasSource || report.providerPricing?.hasVerified) {
    const pageAll = await sb.from('provider_pricing').select('*').limit(5000);
    if (!pageAll.error && pageAll.data) {
      const counts = {};
      for (const r of pageAll.data) {
        const key = `${r.source || r.data_source || '∅'} | verified=${r.verified ?? r.is_verified ?? '∅'}`;
        counts[key] = (counts[key] || 0) + 1;
      }
      console.log('Aggregation (sampled up to 5000):', counts);
      report.providerPricing.agg = counts;
    }
  }

  // ── STEP 5b: price_alerts (for context) ────────────────────────────────
  header('STEP 5b — price_alerts table (context)');
  const { count: paCount, error: paErr } = await sb
    .from('price_alerts')
    .select('*', { count: 'exact', head: true });
  if (paErr) {
    console.log('ERROR:', paErr.message);
  } else {
    console.log(`price_alerts row count: ${paCount}`);
    report.priceAlerts = { count: paCount };
  }

  // ── STEP 6/8: providers sample (for end-to-end test) ──────────────────
  header('STEP 6 — providers sample');
  const { data: provSample, error: provErr } = await sb
    .from('providers')
    .select('id, name, city, state, lat, lng, is_active, is_claimed')
    .eq('is_active', true)
    .limit(5);
  if (provErr) {
    console.log('ERROR:', provErr.message);
  } else {
    console.log('Active providers:', JSON.stringify(provSample, null, 2));
  }

  // Miami check
  const { data: miami } = await sb
    .from('providers')
    .select('id, name, city, lat, lng')
    .eq('city', 'Miami')
    .eq('is_active', true)
    .limit(5);
  console.log('Miami providers:', JSON.stringify(miami, null, 2));
  report.miamiProviders = miami?.length || 0;

  // ── Also probe: 'treatment_logs', 'logs', 'patient_logs' ──────────────
  header('Extra — patient log / treatment tables');
  const extras = ['treatment_logs', 'patient_logs', 'logs', 'treatments', 'user_treatments'];
  for (const t of extras) {
    const { count, error, data } = await sb.from(t).select('*', { count: 'exact' }).limit(1);
    if (!error) {
      console.log(`✓ ${t} exists (count=${count})`);
      if (data && data[0]) console.log(`  columns: ${Object.keys(data[0]).join(', ')}`);
      report.priceTables[t] = { count, columns: data && data[0] ? Object.keys(data[0]) : [] };
    }
  }

  // ── All public tables probe ───────────────────────────────────────────
  header('Table discovery — probing common names');
  const commonTables = [
    'providers',
    'provider_pricing',
    'provider_specials',
    'provider_price_listings',
    'procedures',
    'price_alerts',
    'price_submissions',
    'price_reports',
    'patient_prices',
    'patient_submissions',
    'treatment_logs',
    'user_treatments',
    'scraped_prices',
    'custom_events',
    'reviews',
    'profiles',
  ];
  const discovered = {};
  for (const t of commonTables) {
    const { count, error } = await sb.from(t).select('*', { count: 'exact', head: true });
    if (!error) discovered[t] = count;
  }
  console.log(JSON.stringify(discovered, null, 2));
  report.discovered = discovered;

  console.log('\n\nREPORT JSON:');
  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});

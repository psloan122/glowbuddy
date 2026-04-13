/**
 * Read-only Supabase audit. Fetches all providers + pricing via PostgREST,
 * computes stats in memory, prints structured report, saves to file.
 *
 * Usage: node --env-file=.env scripts/audit-supabase.mjs
 */

import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const DATE = new Date().toISOString().slice(0, 10);
const REPORT_PATH = `glowbuddy_audit_${DATE}.txt`;
const lines = [];
function print(s = '') { lines.push(s); console.log(s); }

async function fetchAll(table, columns) {
  const rows = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await sb
      .from(table)
      .select(columns)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

function pct(n, total) {
  return total ? `${((n / total) * 100).toFixed(1)}%` : '0%';
}

function fmt(n) {
  return n.toLocaleString('en-US');
}

function pad(s, w) {
  return String(s).padEnd(w);
}

function rpad(s, w) {
  return String(s).padStart(w);
}

function groupCount(arr, key) {
  const m = {};
  for (const r of arr) {
    const v = r[key] ?? '(null)';
    m[v] = (m[v] || 0) + 1;
  }
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}

async function main() {
  console.log('Fetching providers...');
  const providers = await fetchAll('providers',
    'id, name, city, state, website, lat, lng, is_claimed, tier, provider_type, is_active, is_medical_aesthetic');
  console.log(`  fetched ${providers.length} providers`);

  console.log('Fetching provider_pricing...');
  const pricing = await fetchAll('provider_pricing',
    'id, provider_id, procedure_type, price_label, price, brand, source, is_active');
  console.log(`  fetched ${pricing.length} pricing records`);

  // === PROVIDERS ===
  const total = providers.length;
  const withWebsite = providers.filter(p => p.website && p.website.trim()).length;
  const withCoords = providers.filter(p => p.lat != null && p.lng != null).length;
  const claimed = providers.filter(p => p.is_claimed).length;
  const active = providers.filter(p => p.is_active).length;

  const byState = groupCount(providers, 'state');
  const byType = groupCount(providers, 'provider_type');
  const byTier = groupCount(providers, 'tier');
  const byClaimed = groupCount(providers, 'is_claimed');

  // === PRICING ===
  const totalPricing = pricing.length;
  const providerIdsWithPricing = new Set(pricing.map(r => r.provider_id));
  const uniqueProvidersWithPricing = providerIdsWithPricing.size;
  const byProcType = groupCount(pricing, 'procedure_type');
  const byPriceLabel = groupCount(pricing, 'price_label');
  const bySource = groupCount(pricing, 'source');

  // Price range by procedure_type
  const priceByType = {};
  for (const r of pricing) {
    const t = r.procedure_type ?? '(null)';
    if (!priceByType[t]) priceByType[t] = [];
    if (r.price != null && r.price > 0) priceByType[t].push(r.price);
  }

  // Top states by pricing
  const pricingByState = {};
  const providerById = {};
  for (const p of providers) providerById[p.id] = p;
  for (const r of pricing) {
    const prov = providerById[r.provider_id];
    const st = prov?.state ?? '(orphaned)';
    pricingByState[st] = (pricingByState[st] || 0) + 1;
  }
  const topPricingStates = Object.entries(pricingByState).sort((a, b) => b[1] - a[1]).slice(0, 20);

  // Top cities by pricing
  const pricingByCity = {};
  for (const r of pricing) {
    const prov = providerById[r.provider_id];
    if (!prov) continue;
    const key = `${prov.city}, ${prov.state}`;
    pricingByCity[key] = (pricingByCity[key] || 0) + 1;
  }
  const topPricingCities = Object.entries(pricingByCity).sort((a, b) => b[1] - a[1]).slice(0, 20);

  // Providers with most price records
  const priceCountByProvider = {};
  for (const r of pricing) {
    priceCountByProvider[r.provider_id] = (priceCountByProvider[r.provider_id] || 0) + 1;
  }
  const topPricedProviders = Object.entries(priceCountByProvider)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([id, count]) => {
      const p = providerById[id];
      return { name: p?.name ?? '(unknown)', city: p?.city, state: p?.state, count };
    });

  // === DATA QUALITY ===
  // Duplicate names
  const nameKey = (p) => `${p.name}|${p.city}|${p.state}`;
  const nameCounts = {};
  for (const p of providers) {
    const k = nameKey(p);
    nameCounts[k] = (nameCounts[k] || 0) + 1;
  }
  const dupes = Object.entries(nameCounts).filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]);
  const totalDupeGroups = dupes.length;
  const totalDupeRows = dupes.reduce((s, [, c]) => s + c, 0);

  // Orphaned pricing records
  const providerIds = new Set(providers.map(p => p.id));
  const orphanedPricing = pricing.filter(r => !providerIds.has(r.provider_id)).length;

  // Null/zero prices
  const nullZeroPrices = pricing.filter(r => r.price == null || r.price === 0).length;

  // per_unit prices out of range
  const perUnitOutOfRange = pricing.filter(r =>
    r.price_label === 'per_unit' && r.price != null && (r.price < 4 || r.price > 35)
  ).length;

  // per_syringe below floor
  const perSyringeBelowFloor = pricing.filter(r =>
    r.price_label === 'per_syringe' && r.price != null && r.price < 100
  ).length;

  // === COVERAGE GAPS ===
  // States with providers but zero pricing
  const stateProvCount = {};
  const statePricedProvs = {};
  for (const p of providers) {
    stateProvCount[p.state] = (stateProvCount[p.state] || 0) + 1;
    if (!statePricedProvs[p.state]) statePricedProvs[p.state] = new Set();
  }
  for (const r of pricing) {
    const prov = providerById[r.provider_id];
    if (prov) statePricedProvs[prov.state]?.add(r.provider_id);
  }

  const zeroPricingStates = Object.entries(stateProvCount)
    .filter(([st]) => (pricingByState[st] || 0) === 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  const coverageByState = Object.entries(stateProvCount)
    .filter(([, c]) => c >= 10)
    .map(([st, total]) => ({
      state: st,
      total,
      withPrices: statePricedProvs[st]?.size ?? 0,
      pct: ((statePricedProvs[st]?.size ?? 0) / total * 100).toFixed(1),
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 20);

  // === PRINT REPORT ===
  const HR = '═'.repeat(60);
  print(HR);
  print(`  GLOWBUDDY SUPABASE AUDIT — ${DATE}`);
  print(HR);
  print();

  print('PROVIDERS');
  print(`  Total in Supabase:        ${rpad(fmt(total), 8)}`);
  print(`  Expected from master:     ${rpad('32,209', 8)}`);
  print(`  Delta:                    ${rpad(total - 32209 >= 0 ? '+' : '', 0)}${fmt(total - 32209)}`);
  print(`  Active:                   ${rpad(fmt(active), 8)} (${pct(active, total)})`);
  print();
  print(`  With website:             ${rpad(fmt(withWebsite), 8)} (${pct(withWebsite, total)})`);
  print(`  With coordinates:         ${rpad(fmt(withCoords), 8)} (${pct(withCoords, total)})`);
  print(`  Claimed:                  ${rpad(fmt(claimed), 8)} (${pct(claimed, total)})`);
  print();

  print('  By type:');
  for (const [t, c] of byType) {
    print(`    ${pad(t, 36)} ${rpad(fmt(c), 7)}`);
  }
  print();

  print('  By tier:');
  for (const [t, c] of byTier) {
    print(`    ${pad(t, 36)} ${rpad(fmt(c), 7)}`);
  }
  print();

  print('  Top 20 states:');
  for (const [st, c] of byState.slice(0, 20)) {
    print(`    ${pad(st, 6)} ${rpad(fmt(c), 6)}`);
  }
  print();

  print(HR);
  print('PRICING');
  print(`  Total price records:      ${rpad(fmt(totalPricing), 8)}`);
  print(`  Providers with prices:    ${rpad(fmt(uniqueProvidersWithPricing), 8)} (${pct(uniqueProvidersWithPricing, total)} of all providers)`);
  print();

  print('  By procedure_type:');
  for (const [t, c] of byProcType) {
    print(`    ${pad(t, 32)} ${rpad(fmt(c), 7)}`);
  }
  print();

  print('  By price_label:');
  for (const [t, c] of byPriceLabel) {
    print(`    ${pad(t, 32)} ${rpad(fmt(c), 7)}`);
  }
  print();

  print('  By source:');
  for (const [t, c] of bySource) {
    print(`    ${pad(t, 32)} ${rpad(fmt(c), 7)}`);
  }
  print();

  print('  Price ranges by procedure_type:');
  print(`    ${'Type'.padEnd(28)} ${'Min'.padStart(8)} ${'Avg'.padStart(8)} ${'Max'.padStart(8)} ${'Count'.padStart(7)}`);
  const sortedTypes = Object.entries(priceByType).sort((a, b) => b[1].length - a[1].length);
  for (const [t, prices] of sortedTypes) {
    if (prices.length === 0) continue;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2);
    print(`    ${pad(t, 28)} ${rpad('$' + fmt(min), 8)} ${rpad('$' + avg, 8)} ${rpad('$' + fmt(max), 8)} ${rpad(fmt(prices.length), 7)}`);
  }
  print();

  print('  Top 20 states by price records:');
  for (const [st, c] of topPricingStates) {
    print(`    ${pad(st, 6)} ${rpad(fmt(c), 6)}`);
  }
  print();

  print('  Top 20 cities by price records:');
  for (const [city, c] of topPricingCities) {
    print(`    ${pad(city, 28)} ${rpad(fmt(c), 6)}`);
  }
  print();

  print('  Top 20 providers by price records:');
  for (const p of topPricedProviders) {
    print(`    ${pad(p.name, 40)} ${pad(p.city + ', ' + p.state, 20)} ${rpad(String(p.count), 4)}`);
  }
  print();

  print(HR);
  print('DATA QUALITY');
  print(`  Orphaned price records:   ${rpad(fmt(orphanedPricing), 8)}`);
  print(`  Duplicate name+city+state groups: ${rpad(fmt(totalDupeGroups), 4)} (${fmt(totalDupeRows)} total rows)`);
  print(`  Null/zero prices:         ${rpad(fmt(nullZeroPrices), 8)}`);
  print(`  per_unit out of range:    ${rpad(fmt(perUnitOutOfRange), 8)} (price < $4 or > $35)`);
  print(`  per_syringe below floor:  ${rpad(fmt(perSyringeBelowFloor), 8)} (price < $100)`);
  print();

  if (dupes.length > 0) {
    print('  Top 20 duplicates:');
    for (const [key, c] of dupes.slice(0, 20)) {
      const [name, city, state] = key.split('|');
      print(`    ${pad(name, 36)} ${pad(city + ', ' + state, 20)} ×${c}`);
    }
    print();
  }

  print(HR);
  print('COVERAGE GAPS — states with providers but zero prices');
  if (zeroPricingStates.length === 0) {
    print('  (none — every state with providers has at least 1 price record)');
  } else {
    for (const [st, c] of zeroPricingStates) {
      print(`    ${pad(st, 6)} ${rpad(fmt(c), 6)} providers, 0 prices`);
    }
  }
  print();

  print(HR);
  print('COVERAGE — top 20 states by pricing penetration (min 10 providers)');
  print(`  ${'State'.padEnd(8)} ${'Providers'.padStart(10)} ${'With Price'.padStart(12)} ${'Coverage'.padStart(10)}`);
  for (const r of coverageByState) {
    print(`  ${pad(r.state, 8)} ${rpad(fmt(r.total), 10)} ${rpad(fmt(r.withPrices), 12)} ${rpad(r.pct + '%', 10)}`);
  }
  print();
  print(HR);

  fs.writeFileSync(REPORT_PATH, lines.join('\n') + '\n');
  console.log(`\nReport saved to ${REPORT_PATH}`);
}

main().catch((err) => {
  console.error('ERROR:', err.message ?? err);
  process.exit(1);
});

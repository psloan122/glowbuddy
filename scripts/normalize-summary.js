/**
 * Pull every active provider_pricing row, normalize each via priceUtils,
 * and print the distribution by display category.
 *
 * Run: node --env-file=.env scripts/normalize-summary.js
 */
import { createClient } from '@supabase/supabase-js';
import { normalizePrice, tabulateCategories } from '../src/lib/priceUtils.js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

async function main() {
  console.log('Fetching provider_pricing rows...');
  const all = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('provider_pricing')
      .select(
        'id, procedure_type, price, price_label, treatment_area, units_or_volume, source, verified',
      )
      .eq('is_active', true)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
  }
  console.log(`Loaded ${all.length} active rows\n`);

  const stats = tabulateCategories(all);
  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  console.log('=== Normalization category breakdown ===\n');
  for (const [k, v] of Object.entries(stats)) {
    const pct = total > 0 ? ((v / total) * 100).toFixed(1) : '0.0';
    console.log(`  ${k.padEnd(36)} ${String(v).padStart(5)}  (${pct}%)`);
  }
  console.log(`  ${'TOTAL'.padEnd(36)} ${String(total).padStart(5)}`);

  // Bonus: by source
  console.log('\n=== By source ===');
  const bySource = { manual: 0, scrape: 0, other: 0 };
  for (const r of all) {
    if (r.source === 'manual') bySource.manual += 1;
    else if (r.source === 'scrape') bySource.scrape += 1;
    else bySource.other += 1;
  }
  console.log(`  manual: ${bySource.manual}`);
  console.log(`  scrape: ${bySource.scrape}`);
  console.log(`  other:  ${bySource.other}`);

  // Bonus: how many flat_rate_area rows now have a recoverable per-unit estimate
  const areaRows = all.filter((r) => r.price_label === 'flat_rate_area');
  let estimated = 0;
  let nonEstimated = 0;
  for (const r of areaRows) {
    const n = normalizePrice(r);
    if (n.isEstimate && n.comparableValue != null) estimated += 1;
    else nonEstimated += 1;
  }
  console.log('\n=== flat_rate_area recovery ===');
  console.log(`  estimated to per-unit: ${estimated} of ${areaRows.length}`);
  console.log(`  no estimate possible:  ${nonEstimated} of ${areaRows.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

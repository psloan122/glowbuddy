import { createClient } from '@supabase/supabase-js';

const s = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

// Suspicious low prices
const lowNeuro = await s
  .from('provider_pricing')
  .select('id, procedure_type, price_label, price')
  .eq('source', 'scrape')
  .eq('price_label', 'per_unit')
  .lt('price', 8);
console.log(`per_unit < $8 (scraped):`, lowNeuro.data?.length || 0);
for (const r of lowNeuro.data || []) console.log(' ', r);

const lowFill = await s
  .from('provider_pricing')
  .select('id, procedure_type, price_label, price')
  .eq('source', 'scrape')
  .eq('price_label', 'per_syringe')
  .lt('price', 200);
console.log(`\nper_syringe < $200 (scraped):`, lowFill.data?.length || 0);
for (const r of lowFill.data || []) console.log(' ', r);

// Anything w/ notes ILIKE area/package/starting/estimate/flat rate?
const noteHits = await s
  .from('provider_pricing')
  .select('id, notes')
  .eq('source', 'scrape')
  .not('notes', 'is', null);
console.log(`\nscrape rows with non-null notes:`, noteHits.data?.length || 0);
for (const r of (noteHits.data || []).slice(0, 10)) console.log(' ', r);

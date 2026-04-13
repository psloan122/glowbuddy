import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import fs from 'fs'
dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function auditAndMigrate() {
  console.log('=== PHASE 0: SCHEMA AUDIT ===\n')

  // ── 1. Check providers table ──────────────────────────────────────────────
  const { data: provSample } = await supabase.from('providers').select('*').limit(1)
  const provCols = provSample?.[0] ? Object.keys(provSample[0]) : []
  console.log(`providers columns (${provCols.length}):`, provCols)

  const { count: provCount } = await supabase
    .from('providers').select('*', { count: 'exact', head: true })
  console.log(`providers rows: ${provCount}`)

  // ── 2. Check provider_pricing table ──────────────────────────────────────
  const { data: priceSample, error: priceErr } = await supabase
    .from('provider_pricing').select('*').limit(1)

  if (priceErr) {
    console.log('provider_pricing ERROR:', priceErr.message)
  } else {
    const priceCols = priceSample?.[0] ? Object.keys(priceSample[0]) : []
    console.log(`\nprovider_pricing columns (${priceCols.length}):`, priceCols)
    const { count: priceCount } = await supabase
      .from('provider_pricing').select('*', { count: 'exact', head: true })
    console.log(`provider_pricing rows: ${priceCount}`)
  }

  // ── 3. Check for confidence_tier column ───────────────────────────────────
  const hasConfidenceTier = priceSample?.[0] &&
    'confidence_tier' in priceSample[0]
  console.log(`\nconfidence_tier column exists: ${hasConfidenceTier}`)

  // ── 4. Check for yelp columns on providers ────────────────────────────────
  const needsCols = ['yelp_url', 'yelp_rating', 'yelp_review_count', 'domain',
                     'legitimacy', 'legitimacy_score', 'legitimacy_source']
  const missingOnProviders = needsCols.filter(c => !provCols.includes(c))
  console.log(`\nMissing columns on providers:`, missingOnProviders)

  // ── 5. Active provider count ──────────────────────────────────────────────
  const { count: activeCount } = await supabase
    .from('providers').select('*', { count: 'exact', head: true })
    .eq('is_active', true)
  const { count: inactiveCount } = await supabase
    .from('providers').select('*', { count: 'exact', head: true })
    .eq('is_active', false)
  console.log(`\nActive providers: ${activeCount}`)
  console.log(`Inactive providers: ${inactiveCount}`)

  // ── 6. Run needed migrations ──────────────────────────────────────────────
  console.log('\n=== RUNNING MIGRATIONS ===\n')

  // Migration A: Add confidence_tier to provider_pricing
  if (!hasConfidenceTier) {
    console.log('Adding confidence_tier column to provider_pricing...')
    const { error } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE provider_pricing
            ADD COLUMN IF NOT EXISTS confidence_tier smallint NOT NULL DEFAULT 4
            CHECK (confidence_tier BETWEEN 1 AND 5);
            COMMENT ON COLUMN provider_pricing.confidence_tier IS
            '1=receipt_verified 2=provider_listed 3=scraped_unit_verified 4=scraped_unit_inferred 5=community_submitted';`
    })

    if (error) {
      console.log('⚠️  Cannot run migration via RPC.')
      console.log('Paste this into Supabase SQL Editor:\n')
      console.log(`ALTER TABLE provider_pricing
  ADD COLUMN IF NOT EXISTS confidence_tier smallint NOT NULL DEFAULT 4
  CHECK (confidence_tier BETWEEN 1 AND 5);

COMMENT ON COLUMN provider_pricing.confidence_tier IS
  '1=receipt_verified 2=provider_listed 3=scraped_unit_verified 4=scraped_unit_inferred 5=community_submitted';`)
    } else {
      console.log('✅ confidence_tier added')
    }
  } else {
    console.log('✅ confidence_tier already exists')
  }

  // Migration B: Add missing provider columns
  const colMigrations = {
    'yelp_url':          'TEXT',
    'yelp_rating':       'NUMERIC(3,1)',
    'yelp_review_count': 'INTEGER',
    'domain':            'TEXT',
    'legitimacy':        'TEXT',
    'legitimacy_score':  'NUMERIC',
    'legitimacy_source': 'TEXT',
  }

  const sqlLines = missingOnProviders
    .filter(c => colMigrations[c])
    .map(c => `ADD COLUMN IF NOT EXISTS ${c} ${colMigrations[c]}`)

  if (sqlLines.length > 0) {
    const migSQL = `ALTER TABLE providers\n  ${sqlLines.join(',\n  ')};`
    console.log('\nProviders table migration SQL (paste into SQL Editor if RPC fails):')
    console.log(migSQL)
    const { error } = await supabase.rpc('exec_sql', { sql: migSQL })
    if (!error) console.log('✅ Provider columns added')
    else console.log('⚠️  Paste the SQL above into Supabase SQL Editor')
  }

  // ── 7. Performance indexes ────────────────────────────────────────────────
  const indexSQL = `
CREATE INDEX IF NOT EXISTS idx_providers_domain ON providers(domain);
CREATE INDEX IF NOT EXISTS idx_providers_state  ON providers(state);
CREATE INDEX IF NOT EXISTS idx_providers_city   ON providers(city, state);
CREATE INDEX IF NOT EXISTS idx_providers_active ON providers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pricing_provider ON provider_pricing(provider_id);
CREATE INDEX IF NOT EXISTS idx_pricing_procedure ON provider_pricing(procedure_type);
CREATE INDEX IF NOT EXISTS idx_pricing_category ON provider_pricing(category);
CREATE INDEX IF NOT EXISTS idx_pricing_tier     ON provider_pricing(confidence_tier);
CREATE INDEX IF NOT EXISTS idx_pricing_price    ON provider_pricing(price);`

  console.log('\nIndex SQL (paste into SQL Editor):')
  console.log(indexSQL)

  fs.writeFileSync('phase0_report.json', JSON.stringify({
    providerColumns: provCols,
    providerCount: provCount,
    activeCount,
    inactiveCount,
    missingColumns: missingOnProviders,
    hasConfidenceTier,
  }, null, 2))
  console.log('\n✅ Saved phase0_report.json')
}

auditAndMigrate().catch(console.error)

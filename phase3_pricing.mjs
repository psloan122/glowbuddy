import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import fs from 'fs'
import { parse } from 'csv-parse/sync'
dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Confidence tier mapping
function getConfidenceTier(sourceType, pricingUnit, hasUnitFromText) {
  if (sourceType === 'provider_listed')   return 2  // provider published it
  if (sourceType === 'receipt_verified')  return 1  // future: receipt upload
  if (hasUnitFromText)                    return 3  // scraped + unit verified
  return 4                                           // scraped + unit inferred
}

function clean(v) {
  if (v === '' || v === 'nan' || v === 'NaN' || v === 'None' || v == null) return null
  return v
}

async function run() {
  console.log('=== PHASE 3: PRICING ===\n')

  const domainMap = JSON.parse(fs.readFileSync('domain_map.json', 'utf8'))
  const raw = fs.readFileSync('GlowBuddy_Procedures_ALL_v4.csv', 'utf8')
  const rows = parse(raw, { columns: true, skip_empty_lines: true })
  console.log(`Pricing records: ${rows.length}`)

  // Fetch existing to deduplicate
  const { data: existing } = await supabase
    .from('provider_pricing')
    .select('provider_id, procedure_type, price')
    .limit(100000)
  const existingSet = new Set(
    (existing || []).map(r => `${r.provider_id}|${r.procedure_type}|${r.price}`)
  )
  console.log(`Existing pricing rows: ${existingSet.size}`)

  const records = []
  let skippedNoId = 0, skippedDupe = 0

  for (const row of rows) {
    // Resolve provider_id
    let pid = clean(row.provider_id)
    if (!pid) {
      const domain = clean(row.domain)?.toLowerCase()
      if (domain) pid = domainMap[domain] || null
    }
    if (!pid) { skippedNoId++; continue }

    const price = parseFloat(row.price)
    if (isNaN(price)) continue

    const dedup = `${pid}|${row.procedure_name}|${price}`
    if (existingSet.has(dedup)) { skippedDupe++; continue }
    existingSet.add(dedup)

    // Confidence tier
    const tier = getConfidenceTier(
      row.source_type,
      row.pricing_unit,
      row.source_type === 'cheerio_scraper' && row.pricing_unit !== 'per_session' // rough proxy for text-verified
    )

    records.push({
      provider_id:        pid,
      procedure_type:     clean(row.procedure_name),
      brand:              clean(row.brand),
      treatment_area:     clean(row.subcategory),
      category:           clean(row.category),
      price:              price,
      price_label:        clean(row.pricing_unit),
      unit_description:   clean(row.unit_description),
      is_starting_price:  String(row.is_starting_price).toLowerCase() === 'true',
      notes:              clean(row.price_notes),
      typical_range_low:  parseFloat(row.typical_range_low) || null,
      typical_range_high: parseFloat(row.typical_range_high) || null,
      tags:               clean(row.tags),
      source:             clean(row.source_type) || 'cheerio_scraper',
      source_url:         clean(row.source_url),
      confidence_tier:    tier,
    })
  }

  console.log(`Records to insert: ${records.length}`)
  console.log(`Skipped no ID:     ${skippedNoId}`)
  console.log(`Skipped duplicate: ${skippedDupe}`)

  // Confidence tier breakdown
  const tierCounts = records.reduce((acc, r) => {
    acc[r.confidence_tier] = (acc[r.confidence_tier] || 0) + 1; return acc
  }, {})
  console.log('\nBy confidence tier:', tierCounts)

  const BATCH = 500
  let inserted = 0, errors = 0

  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH)
    const { error } = await supabase.from('provider_pricing').insert(batch)
    if (error) {
      console.error(`  Batch ${i} error:`, error.message)
      errors += batch.length
    } else {
      inserted += batch.length
    }
    if (i % 5000 === 0) console.log(`  Inserted ${Math.min(i + BATCH, records.length)} / ${records.length}...`)
  }

  const { count } = await supabase
    .from('provider_pricing').select('*', { count: 'exact', head: true })
  console.log(`\n✅ Phase 3 complete`)
  console.log(`   Inserted: ${inserted} | Errors: ${errors}`)
  console.log(`   Total provider_pricing rows: ${count}`)
}

run().catch(console.error)

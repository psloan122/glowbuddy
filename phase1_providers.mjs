import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import fs from 'fs'
import { parse } from 'csv-parse/sync'
dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const TYPE_MAP = {
  'Health & Medical': 'Med Spa (Non-Physician)',
  'Beauty & Spas':    'Med Spa (Non-Physician)',
  'Shopping':         'Med Spa (Non-Physician)',
  'Active Life':      'Med Spa (Non-Physician)',
  'Education':        'Med Spa (Non-Physician)',
  'Local Services':   'Med Spa (Non-Physician)',
  'Home Services':    'Med Spa (Non-Physician)',
  'Dermatology':      'Med Spa (Physician-Owned)',
  'Board-Certified Dermatologist': 'Med Spa (Physician-Owned)',
}

function clean(v) {
  if (v === '' || v === 'nan' || v === 'NaN' || v === 'None' || v === 'NULL' || v == null) return null
  return v
}

// Run promises in batches of `concurrency`
async function pMap(items, fn, concurrency = 50) {
  let results = []
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    const batchResults = await Promise.all(batch.map(fn))
    results.push(...batchResults)
  }
  return results
}

async function run() {
  console.log('=== PHASE 1: PROVIDERS ===\n')

  // ── 1A: Reactivate inactive providers that exist in master ───────────────
  console.log('Fetching master CSV...')
  const raw = fs.readFileSync('GlowBuddy_MASTER_COMBINED.csv', 'utf8')
  const rows = parse(raw, { columns: true, skip_empty_lines: true })
  console.log(`Master rows: ${rows.length}`)

  const masterIds = new Set(rows.filter(r => r.supabase_id && r.supabase_id !== 'nan').map(r => r.supabase_id))
  const masterDomains = new Set(rows.filter(r => r.domain && r.domain !== 'nan').map(r => r.domain.toLowerCase()))
  const masterPlaceIds = new Set(rows.filter(r => r.google_place_id && r.google_place_id !== 'nan').map(r => r.google_place_id))

  // Fetch inactive providers
  console.log('Fetching inactive providers...')
  const inactive = []
  let page = 0
  while (true) {
    const { data } = await supabase.from('providers')
      .select('id, domain, google_place_id, name, state')
      .eq('is_active', false)
      .range(page * 1000, (page + 1) * 1000 - 1)
    if (!data?.length) break
    inactive.push(...data)
    page++
    if (data.length < 1000) break
  }
  console.log(`Inactive providers: ${inactive.length}`)

  // Cross-reference
  const safeToActivate = inactive.filter(p =>
    masterIds.has(p.id) ||
    (p.google_place_id && masterPlaceIds.has(p.google_place_id)) ||
    (p.domain && masterDomains.has(p.domain.toLowerCase()))
  )
  console.log(`Safe to reactivate (master match): ${safeToActivate.length}`)

  // Reactivate in batches of 500 IDs per query
  const BATCH = 500
  let activated = 0
  for (let i = 0; i < safeToActivate.length; i += BATCH) {
    const ids = safeToActivate.slice(i, i + BATCH).map(p => p.id)
    const { error } = await supabase.from('providers')
      .update({ is_active: true })
      .in('id', ids)
    if (!error) activated += ids.length
    if ((i / BATCH) % 10 === 0) console.log(`  Activated ${Math.min(i + BATCH, safeToActivate.length)} / ${safeToActivate.length}`)
  }
  console.log(`✅ Reactivated: ${activated}`)

  // ── 1B: Enrich existing providers (concurrent) ────────────────────────────
  console.log('\nEnriching existing providers...')
  const existing = rows.filter(r => r.supabase_id && r.supabase_id !== 'nan')
  let enriched = 0, enrichErrors = 0

  const CONCURRENCY = 50
  for (let i = 0; i < existing.length; i += CONCURRENCY) {
    const batch = existing.slice(i, i + CONCURRENCY)
    const results = await Promise.all(batch.map(async (row) => {
      const updates = {}
      const fields = {
        website: clean(row.website), phone: clean(row.phone),
        lat: parseFloat(row.lat) || null, lng: parseFloat(row.lng) || null,
        google_rating: parseFloat(row.google_rating) || null,
        google_review_count: parseFloat(row.google_review_count) || null,
        yelp_rating: parseFloat(row.yelp_rating) || null,
        yelp_review_count: parseFloat(row.yelp_review_count) || null,
        yelp_url: clean(row.yelp_url), domain: clean(row.domain),
        legitimacy: clean(row.legitimacy),
        legitimacy_score: parseFloat(row.legitimacy_score) || null,
        legitimacy_source: clean(row.legitimacy_source),
        provider_type: TYPE_MAP[row.provider_type] || clean(row.provider_type) || 'Med Spa (Non-Physician)',
        is_active: true,
      }
      Object.entries(fields).forEach(([k, v]) => { if (v != null) updates[k] = v })
      if (!Object.keys(updates).length) return 'skip'

      const { error } = await supabase.from('providers').update(updates).eq('id', row.supabase_id)
      return error ? 'error' : 'ok'
    }))
    enriched += results.filter(r => r === 'ok').length
    enrichErrors += results.filter(r => r === 'error').length
    if (i % 2500 === 0) console.log(`  Enriched ${i} / ${existing.length}...`)
  }
  console.log(`✅ Enriched: ${enriched} | Errors: ${enrichErrors}`)

  // ── 1C: Insert net-new providers ─────────────────────────────────────────
  console.log('\nInserting net-new providers...')
  const netNew = rows.filter(r => !r.supabase_id || r.supabase_id === 'nan' || r.supabase_id === '')
  console.log(`Net-new to insert: ${netNew.length}`)

  let inserted = 0, insertErrors = 0
  for (let i = 0; i < netNew.length; i += BATCH) {
    const batch = netNew.slice(i, i + BATCH).map(row => ({
      name:                 clean(row.name),
      city:                 clean(row.city),
      state:                clean(row.state),
      address:              clean(row.address),
      website:              clean(row.website),
      phone:                clean(row.phone),
      lat:                  parseFloat(row.lat) || null,
      lng:                  parseFloat(row.lng) || null,
      google_place_id:      clean(row.google_place_id),
      google_rating:        parseFloat(row.google_rating) || null,
      google_review_count:  parseFloat(row.google_review_count) || null,
      yelp_rating:          parseFloat(row.yelp_rating) || null,
      yelp_review_count:    parseFloat(row.yelp_review_count) || null,
      yelp_url:             clean(row.yelp_url),
      domain:               clean(row.domain),
      provider_type:        TYPE_MAP[row.provider_type] || 'Med Spa (Non-Physician)',
      tier:                 clean(row.tier) || 'free',
      legitimacy:           clean(row.legitimacy),
      legitimacy_score:     parseFloat(row.legitimacy_score) || null,
      legitimacy_source:    clean(row.legitimacy_source),
      is_active:            true,
      is_claimed:           false,
    })).filter(r => r.name)

    const { error } = await supabase.from('providers')
      .upsert(batch, { onConflict: 'google_place_id', ignoreDuplicates: false })
    if (error) {
      const { error: e2 } = await supabase.from('providers').insert(batch)
      if (e2) insertErrors += batch.length
      else inserted += batch.length
    } else {
      inserted += batch.length
    }
    if (i % 2500 === 0) console.log(`  Inserted ${Math.min(i + BATCH, netNew.length)} / ${netNew.length}...`)
  }
  console.log(`✅ Inserted: ${inserted} | Errors: ${insertErrors}`)

  const { count: total } = await supabase
    .from('providers').select('*', { count: 'exact', head: true })
  console.log(`\n✅ Phase 1 complete. Total providers in Supabase: ${total}`)
}

run().catch(console.error)

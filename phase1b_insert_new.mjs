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

function slugify(name, city, state) {
  const base = `${name}-${city}-${state}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  // Add random suffix to avoid collisions
  const rand = Math.random().toString(36).substring(2, 8)
  return `${base}-${rand}`
}

async function run() {
  console.log('=== PHASE 1B: INSERT NET-NEW PROVIDERS ===\n')

  const raw = fs.readFileSync('GlowBuddy_MASTER_COMBINED.csv', 'utf8')
  const rows = parse(raw, { columns: true, skip_empty_lines: true })
  const netNew = rows.filter(r => !r.supabase_id || r.supabase_id === 'nan' || r.supabase_id === '')
  console.log(`Net-new to insert: ${netNew.length}`)

  const BATCH = 200
  let inserted = 0, errors = 0, skipped = 0

  for (let i = 0; i < netNew.length; i += BATCH) {
    const batch = netNew.slice(i, i + BATCH).map(row => {
      const name = clean(row.name)
      const city = clean(row.city)
      const state = clean(row.state)
      if (!name || !city || !state) return null

      return {
        name,
        slug:                 slugify(name, city, state),
        city,
        state,
        zip_code:             '00000',  // placeholder — no zip in CSV
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
        provider_type:        TYPE_MAP[row.provider_type] || clean(row.provider_type) || 'Med Spa (Non-Physician)',
        tier:                 clean(row.tier) || 'free',
        legitimacy:           clean(row.legitimacy),
        legitimacy_score:     parseFloat(row.legitimacy_score) || null,
        legitimacy_source:    clean(row.legitimacy_source),
        is_active:            true,
        is_claimed:           false,
      }
    }).filter(Boolean)

    skipped += (BATCH - batch.length)

    if (!batch.length) continue

    const { error } = await supabase.from('providers').insert(batch)
    if (error) {
      // Try one by one to isolate failures (e.g. duplicate google_place_id)
      let batchOk = 0, batchErr = 0
      await Promise.all(batch.map(async (row) => {
        const { error: e } = await supabase.from('providers').insert([row])
        if (e) batchErr++
        else batchOk++
      }))
      inserted += batchOk
      errors += batchErr
    } else {
      inserted += batch.length
    }
    if (i % 2500 === 0) console.log(`  Processed ${Math.min(i + BATCH, netNew.length)} / ${netNew.length}...`)
  }

  console.log(`\n✅ Inserted: ${inserted} | Errors: ${errors} | Skipped (missing data): ${skipped}`)

  const { count: total } = await supabase
    .from('providers').select('*', { count: 'exact', head: true })
  const { count: active } = await supabase
    .from('providers').select('*', { count: 'exact', head: true }).eq('is_active', true)
  console.log(`Total providers in Supabase: ${total} (active: ${active})`)
}

run().catch(console.error)

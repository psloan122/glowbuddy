import { createClient } from '@supabase/supabase-js'
import { parse } from 'csv-parse/sync'
import { readFileSync } from 'fs'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const PROCEDURE_TYPES = [
  'Botox / Dysport / Xeomin',
  'Lip Filler',
  'Cheek Filler',
  'Jawline Filler',
  'Under Eye Filler',
  'Chin Filler',
  'Nasolabial Filler',
  'Botox Lip Flip',
  'Kybella',
  'RF Microneedling',
  'Microneedling',
  'Chemical Peel',
  'HydraFacial',
  'IPL / Photofacial',
  'Laser Hair Removal',
  'CoolSculpting',
  'Semaglutide / Weight Loss',
  'IV Therapy'
]

const fuzzyMatchProcedure = (input) => {
  if (!input) return null
  const lower = input.toLowerCase()

  if (lower.includes('botox') ||
      lower.includes('dysport') ||
      lower.includes('xeomin') ||
      lower.includes('neurotox'))
    return 'Botox / Dysport / Xeomin'

  if (lower.includes('lip filler') ||
      lower.includes('lip fill'))
    return 'Lip Filler'

  if (lower.includes('cheek'))
    return 'Cheek Filler'

  if (lower.includes('jaw'))
    return 'Jawline Filler'

  if (lower.includes('under eye') ||
      lower.includes('undereye') ||
      lower.includes('tear trough'))
    return 'Under Eye Filler'

  if (lower.includes('chin'))
    return 'Chin Filler'

  if (lower.includes('nasolabial') ||
      lower.includes('smile line'))
    return 'Nasolabial Filler'

  if (lower.includes('lip flip'))
    return 'Botox Lip Flip'

  if (lower.includes('kybella') ||
      lower.includes('double chin'))
    return 'Kybella'

  if (lower.includes('hydrafacial') ||
      lower.includes('hydra facial') ||
      lower.includes('hydra-facial'))
    return 'HydraFacial'

  if (lower.includes('microneedling') ||
      lower.includes('micro needling')) {
    if (lower.includes('rf') ||
        lower.includes('radio') ||
        lower.includes('morpheus'))
      return 'RF Microneedling'
    return 'Microneedling'
  }

  if (lower.includes('chemical peel') ||
      lower.includes('chem peel'))
    return 'Chemical Peel'

  if (lower.includes('ipl') ||
      lower.includes('photofacial') ||
      lower.includes('photo facial'))
    return 'IPL / Photofacial'

  if (lower.includes('laser hair'))
    return 'Laser Hair Removal'

  if (lower.includes('coolsculpt') ||
      lower.includes('cool sculpt'))
    return 'CoolSculpting'

  if (lower.includes('semaglutide') ||
      lower.includes('ozempic') ||
      lower.includes('weight loss'))
    return 'Semaglutide / Weight Loss'

  if (lower.includes('iv therapy') ||
      lower.includes('iv drip') ||
      lower.includes('vitamin drip'))
    return 'IV Therapy'

  if (lower.includes('filler'))
    return 'Cheek Filler'

  const exact = PROCEDURE_TYPES.find(
    p => p.toLowerCase() === lower
  )
  return exact || null
}

const importQuotes = async () => {
  const csv = readFileSync(
    './scripts/provider-quotes.csv',
    'utf8'
  )

  const rows = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  })

  console.log(
    `\n📋 Found ${rows.length} quotes\n`
  )

  const results = {
    success: [],
    skipped: [],
    errors: []
  }

  for (const row of rows) {

    // Validate required fields
    if (!row.provider_name?.trim() ||
        !row.city?.trim() ||
        !row.state?.trim() ||
        !row.price) {
      results.errors.push({
        name: row.provider_name || 'Unknown',
        reason: 'Missing required field ' +
          '(provider_name, city, state, price)'
      })
      continue
    }

    // Validate price
    const price = parseFloat(
      row.price.toString().replace(/[$,]/g, '')
    )
    if (isNaN(price) || price <= 0) {
      results.errors.push({
        name: row.provider_name,
        reason: `Invalid price: ${row.price}`
      })
      continue
    }

    // Match procedure type
    const procedureType =
      fuzzyMatchProcedure(row.procedure_type)
    if (!procedureType) {
      results.errors.push({
        name: row.provider_name,
        reason: `Unknown procedure type: ` +
          `"${row.procedure_type}"`
      })
      continue
    }

    // Check for duplicate
    const { data: existing } = await supabase
      .from('procedures')
      .select('id')
      .ilike('provider_name',
        row.provider_name.trim())
      .ilike('city', row.city.trim())
      .eq('procedure_type', procedureType)
      .eq('data_source', 'provider_quote')
      .limit(1)

    if (existing?.length > 0) {
      results.skipped.push({
        name: row.provider_name,
        reason: 'Duplicate already exists'
      })
      continue
    }

    const insertRow = {
      provider_name: row.provider_name.trim(),
      provider_type: row.provider_type?.trim()
        || null,
      provider_address: row.address?.trim()
        || null,
      city: row.city.trim(),
      state: row.state.trim().toUpperCase(),
      zip_code: row.zip?.trim() || null,
      phone: row.phone?.trim() || null,
      website: row.website?.trim() || null,
      procedure_type: procedureType,
      treatment_area: row.treatment_area?.trim()
        || 'Full Face',
      price_paid: price,
      units_or_volume: row.units_or_volume?.trim()
        || row.price_per?.trim()
        || '1 session',
      data_source: 'provider_quote',
      quote_date: row.quote_date?.trim() ||
        new Date().toISOString().split('T')[0],
      quote_notes: row.notes?.trim() || null,
      trust_tier: 'provider_quote',
      trust_weight: 0.7,
      status: 'active',
      is_seed: true,
      is_anonymous: true,
      created_at: new Date().toISOString()
    }

    const { error } = await supabase
      .from('procedures')
      .insert(insertRow)

    if (error) {
      results.errors.push({
        name: insertRow.provider_name,
        reason: error.message
      })
    } else {
      results.success.push({
        provider: insertRow.provider_name,
        city: insertRow.city,
        state: insertRow.state,
        procedure: insertRow.procedure_type,
        price: insertRow.price_paid,
        per: insertRow.units_or_volume
      })
    }
  }

  // Summary report
  console.log('=== IMPORT RESULTS ===\n')

  console.log(
    `✅ Imported: ${results.success.length}`
  )
  results.success.forEach(r =>
    console.log(
      `   ${r.provider} · ${r.city}, ${r.state}` +
      ` · ${r.procedure} · $${r.price} ${r.per}`
    )
  )

  if (results.skipped.length > 0) {
    console.log(
      `\n⏭️  Skipped: ${results.skipped.length}`
    )
    results.skipped.forEach(r =>
      console.log(`   ${r.name}: ${r.reason}`)
    )
  }

  if (results.errors.length > 0) {
    console.log(
      `\n❌ Errors: ${results.errors.length}`
    )
    results.errors.forEach(r =>
      console.log(`   ${r.name}: ${r.reason}`)
    )
  }

  console.log(
    `\n=== DONE: ${results.success.length} ` +
    `imported, ${results.skipped.length} ` +
    `skipped, ${results.errors.length} errors ===`
  )
}

importQuotes().catch(console.error)

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  console.log('=== PHASE 4: FRONTEND QUERY VERIFICATION ===\n')

  // ── Query 1: Provider search by city ─────────────────────────────────────
  const { data: citySearch } = await supabase
    .from('providers')
    .select('id, name, city, state, website, lat, lng, google_rating, yelp_rating, domain')
    .eq('city', 'San Diego')
    .eq('state', 'CA')
    .eq('is_active', true)
    .limit(5)
  console.log(`City search (San Diego): ${citySearch?.length} results`)
  console.log('Sample:', citySearch?.[0])

  // ── Query 2: Pricing for a provider ───────────────────────────────────────
  if (citySearch?.[0]) {
    const { data: pricing } = await supabase
      .from('provider_pricing')
      .select('procedure_type, price, price_label, is_starting_price, confidence_tier, source')
      .eq('provider_id', citySearch[0].id)
      .order('procedure_type')
    console.log(`\nPricing for ${citySearch[0].name}: ${pricing?.length} records`)
    pricing?.slice(0, 5).forEach(p =>
      console.log(`  ${p.procedure_type}: $${p.price} ${p.price_label} (tier ${p.confidence_tier})`)
    )
  }

  // ── Query 3: Price comparison — Botox across providers ───────────────────
  const { data: botoxPrices } = await supabase
    .from('provider_pricing')
    .select(`
      price, price_label, is_starting_price, confidence_tier,
      providers!inner(name, city, state, lat, lng)
    `)
    .eq('procedure_type', 'Botox')
    .eq('price_label', 'per_unit')
    .lte('price', 20)
    .gte('price', 8)
    .eq('providers.is_active', true)
    .order('price')
    .limit(10)
  console.log(`\nBotox per_unit $8-$20: ${botoxPrices?.length} results`)
  botoxPrices?.forEach(p =>
    console.log(`  $${p.price}/unit — ${p.providers?.name}, ${p.providers?.city} (tier ${p.confidence_tier})`)
  )

  // ── Query 4: Providers with pricing near coordinates (San Diego) ──────────
  const { data: nearbyWithPricing } = await supabase
    .rpc('providers_with_pricing_near', {
      lat: 32.7157, lng: -117.1611, radius_miles: 10
    })

  if (nearbyWithPricing) {
    console.log(`\nNearby providers with pricing: ${nearbyWithPricing.length}`)
  } else {
    // Fallback without geo RPC
    const { data: fallback } = await supabase
      .from('providers')
      .select('id, name, city, lat, lng')
      .eq('city', 'San Diego')
      .eq('is_active', true)
      .not('lat', 'is', null)
      .limit(20)
    const ids = fallback?.map(p => p.id) || []
    const { data: pricedNearby } = await supabase
      .from('provider_pricing')
      .select('provider_id')
      .in('provider_id', ids)
    const pricedIds = new Set(pricedNearby?.map(p => p.provider_id))
    console.log(`\nSan Diego providers: ${fallback?.length}, with pricing: ${pricedIds.size}`)
  }

  // ── Query 5: Confidence tier breakdown ───────────────────────────────────
  const { data: tierData } = await supabase
    .from('provider_pricing')
    .select('confidence_tier')
    .limit(100000)
  const tierCounts = tierData?.reduce((acc, r) => {
    acc[r.confidence_tier] = (acc[r.confidence_tier] || 0) + 1; return acc
  }, {})
  console.log('\nConfidence tier distribution:', tierCounts)
  console.log('\nTier meanings:')
  console.log('  1 = Receipt verified (user uploaded receipt)')
  console.log('  2 = Provider listed (published on their website with clear labeling)')
  console.log('  3 = Scraped + unit verified (unit confirmed from page text)')
  console.log('  4 = Scraped + unit inferred (taxonomy default, show disclaimer)')
  console.log('  5 = Community submitted (user said they paid this)')

  // ── Query 6: Check disclaimer logic ──────────────────────────────────────
  console.log('\n--- Disclaimer logic for frontend ---')
  console.log('Show verified badge:   confidence_tier <= 2')
  console.log('Show disclaimer:       confidence_tier >= 4')
  console.log('Show "from" prefix:    is_starting_price = true')
  console.log('Example UI text:')
  console.log('  Tier 2: "Provider listed" — green checkmark')
  console.log('  Tier 3: "Scraped · unit confirmed" — yellow badge')
  console.log('  Tier 4: "Estimated pricing · contact to confirm" — gray disclaimer')

  // ── Final summary ─────────────────────────────────────────────────────────
  const { count: totalProviders } = await supabase
    .from('providers').select('*', { count: 'exact', head: true }).eq('is_active', true)
  const { count: totalPricing } = await supabase
    .from('provider_pricing').select('*', { count: 'exact', head: true })
  const { data: pricedProviders } = await supabase
    .from('provider_pricing').select('provider_id').limit(100000)
  const uniquePriced = new Set(pricedProviders?.map(r => r.provider_id)).size

  console.log('\n═══════════════════════════════════════════')
  console.log('  GLOWBUDDY DATABASE — FINAL STATE')
  console.log('═══════════════════════════════════════════')
  console.log(`  Active providers:      ${totalProviders}`)
  console.log(`  Providers with pricing: ${uniquePriced}`)
  console.log(`  Pricing coverage:      ${((uniquePriced/totalProviders)*100).toFixed(1)}%`)
  console.log(`  Total price records:   ${totalPricing}`)
  console.log('═══════════════════════════════════════════')
  console.log('\nPaste this output back to Claude for QA.')
}

run().catch(console.error)

// Supabase Edge Function: Weekly activity email for unclaimed providers
// Deploy: supabase functions deploy cron-provider-activity
// Schedule: 0 15 * * 1 (Monday 10am CT / 3pm UTC)
// Secrets needed: RESEND_API_KEY (via send-email), OPTOUT_SECRET

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { createHmac } from 'node:crypto'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPTOUT_SECRET = Deno.env.get('OPTOUT_SECRET') || 'glowbuddy-optout-secret'
const BASE_URL = 'https://glowbuddy.com'

function generateOptoutToken(providerId: string): string {
  return createHmac('sha256', OPTOUT_SECRET)
    .update(providerId)
    .digest('hex')
    .slice(0, 32)
}

Deno.serve(async (req: Request) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // ─── Step 1: Aggregate page views per provider for last 7 days ───
    const { data: pageViewEvents } = await supabase
      .from('custom_events')
      .select('properties')
      .eq('event_name', 'provider_page_view')
      .gte('created_at', sevenDaysAgo)

    const weeklyViews: Record<string, number> = {}
    if (pageViewEvents) {
      for (const e of pageViewEvents) {
        const pid = e.properties?.provider_id
        if (pid) weeklyViews[pid] = (weeklyViews[pid] || 0) + 1
      }
    }

    // Update page_view_count_week on providers
    for (const [providerId, count] of Object.entries(weeklyViews)) {
      await supabase
        .from('providers')
        .update({ page_view_count_week: count })
        .eq('id', providerId)

      // Also increment total
      await supabase.rpc('increment_page_view_total', {
        p_provider_id: providerId,
        p_count: count,
      })
    }

    // Reset providers with zero views this week
    await supabase
      .from('providers')
      .update({ page_view_count_week: 0 })
      .not('id', 'in', `(${Object.keys(weeklyViews).map(id => `'${id}'`).join(',')})`)
      .gt('page_view_count_week', 0)

    // ─── Step 2: Find eligible unclaimed providers ───
    let query = supabase
      .from('providers')
      .select('id, name, slug, city, state, contact_email, page_view_count_week, last_activity_email_sent_at')
      .eq('is_claimed', false)
      .not('contact_email', 'is', null)
      .eq('activity_email_opted_out', false)
      .gt('page_view_count_week', 0)
      .limit(100)

    const { data: providers, error: providerError } = await query

    if (providerError) {
      console.error('Provider fetch error:', providerError)
      return new Response(JSON.stringify({ error: 'An internal error occurred' }), { status: 500 })
    }

    if (!providers || providers.length === 0) {
      return new Response(JSON.stringify({ sent: 0, aggregated: Object.keys(weeklyViews).length }), { status: 200 })
    }

    // Filter by last sent date (>= 7 days ago or never sent)
    const eligible = providers.filter((p) => {
      if (!p.last_activity_email_sent_at) return true
      return new Date(p.last_activity_email_sent_at) < new Date(sevenDaysAgo)
    })

    let sentCount = 0

    for (const provider of eligible) {
      // ─── Step 3: Build activity data ───

      // Submissions this week
      const { data: weekSubmissions } = await supabase
        .from('procedures')
        .select('price_paid')
        .ilike('provider_name', provider.name)
        .eq('status', 'active')
        .gte('created_at', sevenDaysAgo)

      const submissionCountWeek = weekSubmissions?.length || 0

      // All-time submission count
      const { count: submissionCountTotal } = await supabase
        .from('procedures')
        .select('id', { count: 'exact', head: true })
        .ilike('provider_name', provider.name)
        .eq('status', 'active')

      // Average price
      let avgPrice: number | null = null
      if (weekSubmissions && weekSubmissions.length > 0) {
        const prices = weekSubmissions
          .map((s) => Number(s.price_paid))
          .filter((p) => p > 0)
        if (prices.length > 0) {
          avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
        }
      }

      // Competitor ads count — claimed providers in same city
      const { count: competitorCount } = await supabase
        .from('providers')
        .select('id', { count: 'exact', head: true })
        .eq('is_claimed', true)
        .eq('city', provider.city)
        .eq('state', provider.state)
        .neq('id', provider.id)

      // Get first competitor name for email
      let competitorName: string | null = null
      let competitorCity: string | null = null
      if ((competitorCount || 0) > 0) {
        const { data: topCompetitor } = await supabase
          .from('providers')
          .select('name, city')
          .eq('is_claimed', true)
          .eq('city', provider.city)
          .eq('state', provider.state)
          .neq('id', provider.id)
          .limit(1)
          .single()

        if (topCompetitor) {
          competitorName = topCompetitor.name
          competitorCity = topCompetitor.city
        }
      }

      // ─── Step 4: Build opt-out token and URLs ───
      const optoutToken = generateOptoutToken(provider.id)
      const optoutUrl = `${BASE_URL}/api/provider-email-optout?id=${provider.id}&token=${optoutToken}`
      const claimUrl = `${BASE_URL}/business/onboarding?provider=${provider.slug}&source=email`
      const pageUrl = `${BASE_URL}/provider/${provider.slug}`

      // ─── Step 5: Choose subject line ───
      const useCompetitorSubject = (competitorCount || 0) > 0 && competitorName
      const subject = useCompetitorSubject
        ? `A competitor is advertising on your GlowBuddy page`
        : `${provider.page_view_count_week} people viewed ${provider.name} on GlowBuddy this week`

      // ─── Step 6: Send email ───
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          template: 'provider_activity',
          to: provider.contact_email,
          subject,
          data: {
            providerName: provider.name,
            providerSlug: provider.slug,
            pageViews: provider.page_view_count_week,
            submissionsWeek: submissionCountWeek,
            submissionsTotal: submissionCountTotal || 0,
            avgPrice,
            competitorCount: competitorCount || 0,
            competitorName,
            competitorCity,
            claimUrl,
            pageUrl,
            optoutUrl,
          },
        }),
      })

      if (res.ok) {
        sentCount++
        // Update last sent timestamp
        await supabase
          .from('providers')
          .update({ last_activity_email_sent_at: new Date().toISOString() })
          .eq('id', provider.id)

        // Track event
        await supabase
          .from('custom_events')
          .insert({
            event_name: 'provider_activity_email_sent',
            properties: {
              provider_id: provider.id,
              provider_slug: provider.slug,
              page_views: provider.page_view_count_week,
              submissions_week: submissionCountWeek,
              competitor_count: competitorCount || 0,
              subject_variant: useCompetitorSubject ? 'competitor' : 'activity',
            },
          })
      } else {
        console.error(`Failed to send activity email for ${provider.id}:`, await res.text())
      }
    }

    return new Response(
      JSON.stringify({ sent: sentCount, eligible: eligible.length, aggregated: Object.keys(weeklyViews).length }),
      { status: 200 }
    )
  } catch (err) {
    console.error('cron-provider-activity error:', err)
    return new Response(
      JSON.stringify({ error: 'An internal error occurred' }),
      { status: 500 }
    )
  }
})

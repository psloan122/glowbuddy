// Supabase Edge Function: Weekly digest email for providers
// Deploy: supabase functions deploy cron-weekly-digest
// Schedule: 0 14 * * 1 (Monday 10am ET / 2pm UTC)
// Secrets needed: RESEND_API_KEY (via send-email)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Get providers with weekly digest enabled
    const { data: providers, error: providerError } = await supabase
      .from('providers')
      .select('id, name, slug, owner_user_id, city, state')
      .eq('is_claimed', true)
      .not('owner_user_id', 'is', null)
      .limit(200)

    if (providerError) {
      console.error('Provider fetch error:', providerError)
      return new Response(JSON.stringify({ error: providerError.message }), { status: 500 })
    }

    if (!providers || providers.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
    }

    let sentCount = 0

    for (const provider of providers) {
      // Aggregate impressions and clicks from provider_specials in the last 7 days
      const { data: specials } = await supabase
        .from('provider_specials')
        .select('impressions, clicks')
        .eq('provider_id', provider.id)
        .gte('created_at', sevenDaysAgo)

      const impressions = specials?.reduce((sum, s) => sum + (s.impressions || 0), 0) ?? 0
      const clicks = specials?.reduce((sum, s) => sum + (s.clicks || 0), 0) ?? 0

      // Skip providers with zero activity
      if (impressions === 0 && clicks === 0) continue

      // Get top procedure near their location
      let topProcedure: string | undefined
      if (provider.city && provider.state) {
        const { data: topProc } = await supabase
          .from('procedures')
          .select('procedure_type')
          .eq('city', provider.city)
          .eq('state', provider.state)
          .gte('created_at', sevenDaysAgo)
          .limit(100)

        if (topProc && topProc.length > 0) {
          // Count occurrences to find most popular
          const counts: Record<string, number> = {}
          for (const p of topProc) {
            counts[p.procedure_type] = (counts[p.procedure_type] || 0) + 1
          }
          const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
          topProcedure = sorted[0]?.[0]
        }
      }

      // Get provider owner email
      const { data: { user } } = await supabase.auth.admin.getUserById(provider.owner_user_id)
      if (!user?.email) continue

      // Send via internal invoke
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          template: 'weekly_digest',
          to: user.email,
          data: {
            providerName: provider.name,
            impressions,
            clicks,
            topProcedure,
            analyticsUrl: `https://glowbuddy.com/business/dashboard`,
          },
        }),
      })

      if (res.ok) {
        sentCount++
      } else {
        console.error(`Failed to send digest for provider ${provider.id}:`, await res.text())
      }
    }

    return new Response(JSON.stringify({ sent: sentCount }), { status: 200 })
  } catch (err) {
    console.error('cron-weekly-digest error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500 }
    )
  }
})

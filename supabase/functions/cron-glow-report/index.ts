// Supabase Edge Function: Monthly Glow Report email for active users
// Deploy: supabase functions deploy cron-glow-report
// Schedule: 0 15 1 * * (1st of every month, 9am CT / 3pm UTC)
// Secrets needed: RESEND_API_KEY (via send-email)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Typical units per treatment for savings calculation
const TYPICAL_UNITS: Record<string, number> = {
  'Botox / Dysport / Xeomin': 28,
  'Lip Filler': 1,
  'Cheek Filler': 1,
  'HydraFacial': 1,
}

function getTypicalUnits(procedureType: string): number {
  return TYPICAL_UNITS[procedureType] || 1
}

function getMonthLabel(): string {
  const d = new Date()
  return d.toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

Deno.serve(async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const monthLabel = getMonthLabel()

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()

    // 1. Find eligible users: at least 1 submission ever
    const { data: submitters } = await supabase
      .from('procedures')
      .select('user_id')
      .not('user_id', 'is', null)
      .eq('status', 'active')

    const uniqueUserIds = [...new Set((submitters || []).map((r: { user_id: string }) => r.user_id))]

    if (uniqueUserIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No eligible users' }), { status: 200 })
    }

    // 2. Filter out users who opted out of monthly report
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, city, state, email_monthly_report')
      .in('user_id', uniqueUserIds)

    const profileMap = new Map<string, { city: string | null; state: string | null }>()
    const optedOut = new Set<string>()
    for (const p of (profiles || [])) {
      if (p.email_monthly_report === false) {
        optedOut.add(p.user_id)
      }
      profileMap.set(p.user_id, { city: p.city, state: p.state })
    }

    let sentCount = 0
    const errors: string[] = []

    for (const userId of uniqueUserIds) {
      if (optedOut.has(userId)) continue

      try {
        // Get user email
        const { data: { user } } = await supabase.auth.admin.getUserById(userId)
        if (!user?.email) continue

        // Get user's submissions
        const { data: userProcs } = await supabase
          .from('procedures')
          .select('id, procedure_type, provider_name, price_paid, city, state, created_at')
          .eq('user_id', userId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })

        if (!userProcs || userProcs.length === 0) continue

        // Determine user's city from profile or latest submission
        const profile = profileMap.get(userId)
        const userCity = profile?.city || userProcs[0].city
        const userState = profile?.state || userProcs[0].state
        if (!userCity || !userState) continue

        // ─── Data Collection ───

        // A. Most-submitted procedure type
        const typeCounts: Record<string, number> = {}
        for (const p of userProcs) {
          typeCounts[p.procedure_type] = (typeCounts[p.procedure_type] || 0) + 1
        }
        const topProcedure = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0]

        // B. Price trend for top procedure
        let trendProcedure: string | undefined
        let trendCurrentAvg: number | undefined
        let trendChangePercent: number | undefined
        let trendDirection: 'down' | 'up' | 'flat' | undefined
        let trendSampleSize: number | undefined

        if (topProcedure) {
          // Current month avg (last 30 days)
          const { data: currentMonth } = await supabase
            .from('procedures')
            .select('price_paid')
            .eq('procedure_type', topProcedure)
            .eq('city', userCity)
            .eq('state', userState)
            .eq('status', 'active')
            .gte('created_at', thirtyDaysAgo)

          // Previous month avg (30-60 days ago)
          const { data: prevMonth } = await supabase
            .from('procedures')
            .select('price_paid')
            .eq('procedure_type', topProcedure)
            .eq('city', userCity)
            .eq('state', userState)
            .eq('status', 'active')
            .gte('created_at', sixtyDaysAgo)
            .lt('created_at', thirtyDaysAgo)

          if (currentMonth && currentMonth.length >= 3) {
            const currentAvg = currentMonth.reduce((s: number, r: { price_paid: number }) => s + Number(r.price_paid), 0) / currentMonth.length
            trendProcedure = topProcedure
            trendCurrentAvg = Math.round(currentAvg)
            trendSampleSize = currentMonth.length

            if (prevMonth && prevMonth.length >= 3) {
              const prevAvg = prevMonth.reduce((s: number, r: { price_paid: number }) => s + Number(r.price_paid), 0) / prevMonth.length
              const pctChange = ((currentAvg - prevAvg) / prevAvg) * 100
              trendChangePercent = Math.round(Math.abs(pctChange))

              if (pctChange < -2) trendDirection = 'down'
              else if (pctChange > 2) trendDirection = 'up'
              else trendDirection = 'flat'
            } else {
              trendDirection = 'flat'
              trendChangePercent = 0
            }
          }
        }

        // C. Lifetime savings estimate (positive only)
        let lifetimeSavings = 0
        // Group user procs by procedure type + city to batch benchmark lookups
        const procGroups: Record<string, typeof userProcs> = {}
        for (const p of userProcs) {
          const key = `${p.procedure_type}|${p.state}|${p.city}`
          if (!procGroups[key]) procGroups[key] = []
          procGroups[key].push(p)
        }

        for (const [key, procs] of Object.entries(procGroups)) {
          const [procType, st, ct] = key.split('|')
          const { data: benchmark } = await supabase.rpc('get_price_benchmark', {
            p_procedure_type: procType,
            p_state: st,
            p_city: ct,
          })
          if (benchmark && benchmark.length > 0) {
            const avgPrice = Number(benchmark[0].avg_price)
            const units = getTypicalUnits(procType)
            for (const p of procs) {
              const savings = (avgPrice - Number(p.price_paid)) * units
              if (savings > 0) lifetimeSavings += savings
            }
          }
        }
        lifetimeSavings = Math.round(lifetimeSavings)

        // D. New specials near user
        let specials: Array<{ providerName: string; headline: string; price: string; daysLeft: number; specialId: string }> = []
        const { data: nearbySpecials } = await supabase
          .from('provider_specials')
          .select('id, headline, promo_price, price_unit, ends_at, providers(name, city, state)')
          .eq('is_active', true)
          .gt('ends_at', new Date().toISOString())
          .limit(50)

        if (nearbySpecials) {
          const matching = nearbySpecials.filter((s: any) =>
            s.providers?.city?.toLowerCase() === userCity.toLowerCase() &&
            s.providers?.state?.toLowerCase() === userState.toLowerCase()
          )
          specials = matching.slice(0, 3).map((s: any) => {
            const daysLeft = Math.max(1, Math.ceil((new Date(s.ends_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
            return {
              providerName: s.providers?.name || 'Provider',
              headline: s.headline,
              price: `$${Number(s.promo_price).toLocaleString()}/${s.price_unit}`,
              daysLeft,
              specialId: s.id,
            }
          })
        }

        // E. New providers added this month
        const { count: newProviderCount } = await supabase
          .from('providers')
          .select('*', { count: 'exact', head: true })
          .eq('city', userCity)
          .eq('state', userState)
          .gte('created_at', thirtyDaysAgo)

        // F. Pioneer opportunities (providers with no receipt-verified submissions for user's top procedure)
        let pioneerOpportunities = 0
        if (topProcedure) {
          // Get all provider slugs in user's city
          const { data: localProviders } = await supabase
            .from('providers')
            .select('slug')
            .eq('city', userCity)
            .eq('state', userState)
            .limit(200)

          if (localProviders && localProviders.length > 0) {
            const slugs = localProviders.map((p: { slug: string }) => p.slug)
            // Find which have receipt-verified submissions for the top procedure
            const { data: verifiedSlugs } = await supabase
              .from('procedures')
              .select('provider_slug')
              .eq('procedure_type', topProcedure)
              .eq('status', 'active')
              .eq('receipt_verified', true)
              .in('provider_slug', slugs)

            const verifiedSet = new Set((verifiedSlugs || []).map((r: { provider_slug: string }) => r.provider_slug))
            pioneerOpportunities = slugs.filter((s: string) => !verifiedSet.has(s)).length
          }
        }

        // G. Total giveaway entries
        const currentMonth = new Date().toISOString().slice(0, 7) // yyyy-MM
        const { data: entryRows } = await supabase
          .from('giveaway_entries')
          .select('entries')
          .eq('user_id', userId)
          .eq('month', currentMonth)

        const totalEntries = (entryRows || []).reduce((s: number, r: { entries: number }) => s + (r.entries || 0), 0)

        // ─── Send Email ───

        const emailData = {
          userName: user.user_metadata?.display_name || null,
          city: userCity,
          state: userState,
          month: monthLabel,
          trendProcedure,
          trendCurrentAvg,
          trendChangePercent,
          trendDirection,
          trendSampleSize,
          lifetimeSavings: lifetimeSavings > 0 ? lifetimeSavings : undefined,
          specials: specials.length > 0 ? specials : undefined,
          newProviderCount: newProviderCount || undefined,
          pioneerOpportunities: pioneerOpportunities > 0 ? pioneerOpportunities : undefined,
          totalEntries: totalEntries > 0 ? totalEntries : undefined,
        }

        const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            template: 'glow_report',
            to: user.email,
            data: emailData,
          }),
        })

        if (res.ok) {
          sentCount++
          // Track send event
          await supabase.from('custom_events').insert({
            event_name: 'glow_report_sent',
            properties: { user_id: userId, month: currentMonth, city: userCity },
          })
        } else {
          errors.push(`User ${userId.slice(0, 8)}: ${await res.text()}`)
        }
      } catch (userErr) {
        errors.push(`User ${userId.slice(0, 8)}: An internal error occurred`)
      }
    }

    return new Response(
      JSON.stringify({ sent: sentCount, eligible: uniqueUserIds.length, errors: errors.slice(0, 10) }),
      { status: 200 }
    )
  } catch (err) {
    console.error('cron-glow-report error:', err)
    return new Response(
      JSON.stringify({ error: 'An internal error occurred' }),
      { status: 500 }
    )
  }
})

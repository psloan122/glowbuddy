// Supabase Edge Function: Weekly digest email for users
// Deploy: supabase functions deploy cron-user-weekly-digest
// Schedule: 0 23 * * 0 (Sunday 6pm ET / 11pm UTC)
// Secrets needed: RESEND_API_KEY (via send-email)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // ── Gate: skip if zero new prices anywhere this week ──
    const { count: nationwideCount } = await supabase
      .from('provider_pricing')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('created_at', sevenDaysAgo)

    if (!nationwideCount || nationwideCount === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'No new prices this week — skipping digest' }),
        { status: 200 },
      )
    }

    // ── Find eligible users ──
    // Anyone with at least one active submission (procedures table)
    const { data: submitters } = await supabase
      .from('procedures')
      .select('user_id')
      .not('user_id', 'is', null)
      .eq('status', 'active')

    const uniqueUserIds = [...new Set((submitters || []).map((r: { user_id: string }) => r.user_id))]

    if (uniqueUserIds.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'No eligible users' }),
        { status: 200 },
      )
    }

    // ── Load profiles and filter opt-outs ──
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, city, state, email_monthly_report')
      .in('user_id', uniqueUserIds)

    const profileMap = new Map<string, { city: string | null; state: string | null }>()
    const optedOut = new Set<string>()
    for (const p of profiles || []) {
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

        // Get user's latest submission to determine city fallback
        const { data: latestSub } = await supabase
          .from('procedures')
          .select('city, state, provider_slug')
          .eq('user_id', userId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)

        const profile = profileMap.get(userId)
        const userCity = profile?.city || latestSub?.[0]?.city
        const userState = profile?.state || latestSub?.[0]?.state
        if (!userCity || !userState) continue

        // ── 1. New prices in user's city this week ──
        // provider_pricing doesn't have city/state directly — join via providers
        const { count: localCount } = await supabase
          .from('provider_pricing')
          .select('id, providers!inner(city, state)', { count: 'exact', head: true })
          .eq('is_active', true)
          .gte('created_at', sevenDaysAgo)
          .eq('providers.city', userCity)
          .eq('providers.state', userState)

        // ── 2. Views on user's submissions ──
        // Find provider_ids the user has submitted for
        const { data: userSubs } = await supabase
          .from('procedures')
          .select('provider_slug')
          .eq('user_id', userId)
          .eq('status', 'active')

        let viewCount = 0
        if (userSubs && userSubs.length > 0) {
          const slugs = [...new Set(userSubs.map((r: { provider_slug: string }) => r.provider_slug).filter(Boolean))]

          if (slugs.length > 0) {
            // Look up provider_ids from slugs
            const { data: providers } = await supabase
              .from('providers')
              .select('id')
              .in('slug', slugs)

            const providerIds = (providers || []).map((p: { id: string }) => p.id)

            if (providerIds.length > 0) {
              // Count page views for those providers this week
              // custom_events stores provider_id in properties JSONB
              // Use a filter on each provider_id since we can't do IN on JSONB
              for (const pid of providerIds) {
                const { count } = await supabase
                  .from('custom_events')
                  .select('id', { count: 'exact', head: true })
                  .eq('event_name', 'provider_page_view')
                  .eq('properties->>provider_id', pid)
                  .gte('created_at', sevenDaysAgo)

                viewCount += count || 0
              }
            }
          }
        }

        // ── 3. Build and send email ──
        const emailData = {
          userName: user.user_metadata?.display_name || null,
          city: userCity,
          state: userState,
          localPriceCount: localCount || 0,
          nationwidePriceCount: nationwideCount,
          submissionViewCount: viewCount,
        }

        const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            template: 'user_weekly_digest',
            to: user.email,
            data: emailData,
          }),
        })

        if (res.ok) {
          sentCount++
          await supabase.from('custom_events').insert({
            event_name: 'user_weekly_digest_sent',
            properties: { user_id: userId, city: userCity, state: userState },
          })
        } else {
          errors.push(`User ${userId.slice(0, 8)}: ${await res.text()}`)
        }
      } catch (userErr) {
        errors.push(`User ${userId.slice(0, 8)}: An internal error occurred`)
      }
    }

    return new Response(
      JSON.stringify({
        sent: sentCount,
        eligible: uniqueUserIds.length,
        nationwidePrices: nationwideCount,
        errors: errors.slice(0, 10),
      }),
      { status: 200 },
    )
  } catch (err) {
    console.error('cron-user-weekly-digest error:', err)
    return new Response(
      JSON.stringify({ error: 'An internal error occurred' }),
      { status: 500 },
    )
  }
})

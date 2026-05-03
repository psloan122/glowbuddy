// Supabase Edge Function: Daily admin digest email
// Deploy: supabase functions deploy cron-admin-digest
// Schedule: 0 13 * * * (daily 8am ET / 1pm UTC)
// Secrets needed: RESEND_API_KEY (via send-email)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ADMIN_EMAIL = 'psloan122@gmail.com'

Deno.serve(async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: notifications } = await supabase
      .from('admin_notifications')
      .select('*')
      .eq('is_read', false)
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false })

    if (!notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({ sent: false, message: 'No unread notifications in past 24h' }),
        { status: 200 },
      )
    }

    const newProviders = notifications.filter((n: { type: string }) => n.type === 'new_provider')
    const newPrices = notifications.filter((n: { type: string }) => n.type === 'new_price')
    const newReviews = notifications.filter((n: { type: string }) => n.type === 'new_review')

    const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        template: 'admin_daily_digest',
        to: ADMIN_EMAIL,
        data: {
          totalCount: notifications.length,
          newProviderCount: newProviders.length,
          newPriceCount: newPrices.length,
          newReviewCount: newReviews.length,
          providers: newProviders.slice(0, 10).map((n: { title: string; body: string; metadata: { slug?: string; source?: string } }) => ({
            title: n.title,
            body: n.body,
            slug: n.metadata?.slug,
            source: n.metadata?.source,
          })),
          prices: newPrices.slice(0, 10).map((n: { title: string; body: string }) => ({
            title: n.title,
            body: n.body,
          })),
          reviews: newReviews.slice(0, 10).map((n: { title: string; body: string; metadata: { rating?: number } }) => ({
            title: n.title,
            body: n.body,
            rating: n.metadata?.rating,
          })),
        },
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Failed to send admin digest:', errText)
      return new Response(
        JSON.stringify({ sent: false, error: errText }),
        { status: 500 },
      )
    }

    return new Response(
      JSON.stringify({
        sent: true,
        counts: {
          providers: newProviders.length,
          prices: newPrices.length,
          reviews: newReviews.length,
        },
      }),
      { status: 200 },
    )
  } catch (err) {
    console.error('cron-admin-digest error:', err)
    return new Response(
      JSON.stringify({ error: 'An internal error occurred' }),
      { status: 500 },
    )
  }
})

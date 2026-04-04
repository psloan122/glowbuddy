// Supabase Edge Function: Send expiry warning emails for specials ending within 48 hours
// Deploy: supabase functions deploy cron-expiring-specials
// Schedule: 0 */6 * * * (every 6 hours)
// Secrets needed: RESEND_API_KEY (via send-email)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const now = new Date()
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)

    // Find active specials expiring within 48 hours that haven't been warned
    const { data: specials, error: fetchError } = await supabase
      .from('provider_specials')
      .select(`
        id,
        headline,
        treatment_name,
        ends_at,
        provider_id,
        providers!inner(name, owner_user_id, slug)
      `)
      .eq('is_active', true)
      .eq('expiry_warning_sent', false)
      .gte('ends_at', now.toISOString())
      .lte('ends_at', in48h.toISOString())
      .limit(50)

    if (fetchError) {
      console.error('Fetch error:', fetchError)
      return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 })
    }

    if (!specials || specials.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { status: 200 })
    }

    let sentCount = 0

    for (const special of specials) {
      const provider = special.providers as any
      if (!provider?.owner_user_id) continue

      // Get provider owner email
      const { data: { user } } = await supabase.auth.admin.getUserById(provider.owner_user_id)
      if (!user?.email) continue

      const expiryDate = new Date(special.ends_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })

      // Send via internal invoke
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          template: 'special_offer_expiring',
          to: user.email,
          data: {
            providerName: provider.name,
            treatmentName: special.treatment_name || special.headline || 'Special Offer',
            expiryDate,
            renewUrl: `https://glowbuddy.com/business/dashboard`,
          },
        }),
      })

      if (res.ok) {
        // Mark as warned
        await supabase
          .from('provider_specials')
          .update({ expiry_warning_sent: true })
          .eq('id', special.id)
        sentCount++
      } else {
        console.error(`Failed to send expiry email for special ${special.id}:`, await res.text())
      }
    }

    return new Response(JSON.stringify({ sent: sentCount }), { status: 200 })
  } catch (err) {
    console.error('cron-expiring-specials error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500 }
    )
  }
})

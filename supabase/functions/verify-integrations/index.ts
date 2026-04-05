// Supabase Edge Function: Verify all active integrations (cron)
// Deploy: supabase functions deploy verify-integrations
// Schedule: daily (configure in Supabase dashboard)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: integrations, error } = await supabase
      .from('provider_integrations')
      .select('id, vagaro_booking_url')
      .eq('connection_status', 'active')
      .limit(200)

    if (error) {
      return new Response(JSON.stringify({ error: 'An error occurred' }), { status: 500 })
    }

    if (!integrations || integrations.length === 0) {
      return new Response(JSON.stringify({ verified: 0, errors: 0 }), { status: 200 })
    }

    let verified = 0
    let errors = 0

    for (const integration of integrations) {
      try {
        const res = await fetch(integration.vagaro_booking_url, {
          method: 'HEAD',
          redirect: 'follow',
        })

        if (res.ok || res.status === 405) {
          await supabase
            .from('provider_integrations')
            .update({ last_verified_at: new Date().toISOString() })
            .eq('id', integration.id)
          verified++
        } else {
          await supabase
            .from('provider_integrations')
            .update({ connection_status: 'error' })
            .eq('id', integration.id)
          errors++
        }
      } catch {
        await supabase
          .from('provider_integrations')
          .update({ connection_status: 'error' })
          .eq('id', integration.id)
        errors++
      }
    }

    return new Response(
      JSON.stringify({ verified, errors, total: integrations.length }),
      { status: 200 }
    )
  } catch (err) {
    console.error('verify-integrations error:', err)
    return new Response(
      JSON.stringify({ error: 'An error occurred' }),
      { status: 500 }
    )
  }
})

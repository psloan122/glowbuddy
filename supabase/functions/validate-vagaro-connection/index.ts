// Supabase Edge Function: Validate Vagaro Connection
// Deploy: supabase functions deploy validate-vagaro-connection

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { provider_id, vagaro_booking_url, vagaro_widget_url, vagaro_business_id } = await req.json()

    if (!provider_id || !vagaro_booking_url) {
      return new Response(
        JSON.stringify({ success: false, error: 'provider_id and vagaro_booking_url are required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // Validate URL format
    try {
      new URL(vagaro_booking_url)
      if (vagaro_widget_url) new URL(vagaro_widget_url)
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid URL format. Make sure you include https://' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // Verify booking URL is reachable
    try {
      const res = await fetch(vagaro_booking_url, { method: 'HEAD', redirect: 'follow' })
      if (!res.ok && res.status !== 405) {
        return new Response(
          JSON.stringify({ success: false, error: `Booking URL returned status ${res.status}. Check that the URL is correct.` }),
          { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        )
      }
    } catch (fetchErr) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not reach booking URL. Check that the URL is correct and publicly accessible.' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        )
    }

    // Extract business ID from widget URL if not provided
    let businessId = vagaro_business_id || null
    if (!businessId && vagaro_widget_url) {
      // Common patterns: vagaro.com/Widget/1234567, vagaro.com/business/1234567
      const match = vagaro_widget_url.match(/(?:Widget|business)\/(\d+)/i)
      if (match) businessId = match[1]
    }
    if (!businessId && vagaro_booking_url) {
      const match = vagaro_booking_url.match(/vagaro\.com\/([^\/\?]+)/i)
      if (match) businessId = match[1]
    }

    // Upsert integration record
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { error: upsertError } = await supabase
      .from('provider_integrations')
      .upsert({
        provider_id,
        platform: 'vagaro',
        vagaro_business_id: businessId,
        vagaro_widget_url: vagaro_widget_url || null,
        vagaro_booking_url,
        connection_status: 'active',
        connected_at: new Date().toISOString(),
        last_verified_at: new Date().toISOString(),
      }, { onConflict: 'provider_id' })

    if (upsertError) {
      return new Response(
        JSON.stringify({ success: false, error: upsertError.message }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, business_id: businessId }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('validate-vagaro-connection error:', err)
    return new Response(
      JSON.stringify({ success: false, error: (err as Error).message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})

// Supabase Edge Function: Release Twilio Number from a Provider
// Deploy: supabase functions deploy release-twilio-number
// Secrets needed: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!
const TWILIO_PHONE_POOL = Deno.env.get('TWILIO_PHONE_POOL') || ''

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function twilioAuth(): string {
  return 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { provider_id } = await req.json()
    if (!provider_id) {
      return new Response(
        JSON.stringify({ error: 'provider_id required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get the assigned number
    const { data: phoneRecord } = await supabase
      .from('provider_phone_numbers')
      .select('id, twilio_number')
      .eq('provider_id', provider_id)
      .eq('is_active', true)
      .maybeSingle()

    if (!phoneRecord) {
      return new Response(
        JSON.stringify({ error: 'No active number found for this provider' }),
        { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // Check if number is from the pool (don't release pool numbers from Twilio)
    const poolNumbers = TWILIO_PHONE_POOL.split(',').map(n => n.trim()).filter(Boolean)
    const isPoolNumber = poolNumbers.includes(phoneRecord.twilio_number)

    if (!isPoolNumber && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
      // Find the Twilio SID for this number
      const listRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(phoneRecord.twilio_number)}`,
        { headers: { Authorization: twilioAuth() } }
      )
      const listData = await listRes.json()
      const numberSid = listData.incoming_phone_numbers?.[0]?.sid

      if (numberSid) {
        // Release from Twilio
        await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers/${numberSid}.json`,
          {
            method: 'DELETE',
            headers: { Authorization: twilioAuth() },
          }
        )
      }
    }

    // Deactivate in our DB
    await supabase
      .from('provider_phone_numbers')
      .update({ is_active: false })
      .eq('id', phoneRecord.id)

    return new Response(
      JSON.stringify({ success: true, released: phoneRecord.twilio_number }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('release-twilio-number error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})

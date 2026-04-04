// Supabase Edge Function: Provision Twilio Number for a Provider
// Deploy: supabase functions deploy provision-twilio-number
// Secrets needed: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_POOL (optional)

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

    // Check if provider already has a number
    const { data: existing } = await supabase
      .from('provider_phone_numbers')
      .select('twilio_number')
      .eq('provider_id', provider_id)
      .eq('is_active', true)
      .maybeSingle()

    if (existing) {
      return new Response(
        JSON.stringify({ twilio_number: existing.twilio_number, already_assigned: true }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // Get provider's phone for area code matching
    const { data: provider } = await supabase
      .from('providers')
      .select('phone, city, state')
      .eq('id', provider_id)
      .single()

    const areaCode = provider?.phone?.replace(/\D/g, '').slice(0, 3) || ''

    let twilioNumber: string | null = null

    // Check pre-bought pool first
    if (TWILIO_PHONE_POOL) {
      const poolNumbers = TWILIO_PHONE_POOL.split(',').map(n => n.trim()).filter(Boolean)

      // Find which pool numbers are already assigned
      const { data: assigned } = await supabase
        .from('provider_phone_numbers')
        .select('twilio_number')
        .eq('is_active', true)

      const assignedSet = new Set((assigned || []).map(a => a.twilio_number))
      const available = poolNumbers.find(n => !assignedSet.has(n))

      if (available) {
        twilioNumber = available
      }
    }

    // If no pool number available, search and purchase from Twilio
    if (!twilioNumber) {
      if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
        return new Response(
          JSON.stringify({ error: 'Twilio credentials not configured' }),
          { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        )
      }

      // Search for available local numbers
      const searchParams = new URLSearchParams({
        VoiceEnabled: 'true',
        SmsEnabled: 'false',
        ...(areaCode ? { AreaCode: areaCode } : {}),
      })

      const searchRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/AvailablePhoneNumbers/US/Local.json?${searchParams}`,
        { headers: { Authorization: twilioAuth() } }
      )

      const searchData = await searchRes.json()

      if (!searchData.available_phone_numbers?.length) {
        // Fallback: try without area code
        const fallbackRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/AvailablePhoneNumbers/US/Local.json?VoiceEnabled=true&SmsEnabled=false`,
          { headers: { Authorization: twilioAuth() } }
        )
        const fallbackData = await fallbackRes.json()
        if (!fallbackData.available_phone_numbers?.length) {
          return new Response(
            JSON.stringify({ error: 'No phone numbers available' }),
            { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
          )
        }
        twilioNumber = fallbackData.available_phone_numbers[0].phone_number
      } else {
        twilioNumber = searchData.available_phone_numbers[0].phone_number
      }

      // Purchase the number
      const voiceUrl = `${SUPABASE_URL}/functions/v1/twilio-voice`
      const purchaseRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`,
        {
          method: 'POST',
          headers: {
            Authorization: twilioAuth(),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            PhoneNumber: twilioNumber!,
            VoiceUrl: voiceUrl,
            VoiceMethod: 'POST',
            FriendlyName: `GlowBuddy - ${provider?.city || 'Provider'}`,
          }),
        }
      )

      if (!purchaseRes.ok) {
        const err = await purchaseRes.json()
        return new Response(
          JSON.stringify({ error: `Failed to purchase number: ${err.message || err.detail}` }),
          { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Store assignment
    const realNumber = provider?.phone || ''
    const { error: insertError } = await supabase
      .from('provider_phone_numbers')
      .insert({
        provider_id,
        twilio_number: twilioNumber,
        real_number: realNumber,
        is_active: true,
      })

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ twilio_number: twilioNumber, success: true }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('provision-twilio-number error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})

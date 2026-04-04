// Supabase Edge Function: Twilio Voice Webhook (call forwarding)
// Deploy: supabase functions deploy twilio-voice
// Secrets needed: TWILIO_AUTH_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!

// Validate Twilio request signature using HMAC-SHA1
async function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string
): Promise<boolean> {
  if (!TWILIO_AUTH_TOKEN || !signature) return false

  // Build the data string: URL + sorted params
  const sortedKeys = Object.keys(params).sort()
  let dataString = url
  for (const key of sortedKeys) {
    dataString += key + params[key]
  }

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(TWILIO_AUTH_TOKEN),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  )

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(dataString)
  )

  // Twilio uses base64-encoded HMAC-SHA1
  const computed = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))

  // Constant-time comparison
  if (computed.length !== signature.length) return false
  let result = 0
  for (let i = 0; i < computed.length; i++) {
    result |= computed.charCodeAt(i) ^ signature.charCodeAt(i)
  }
  return result === 0
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const formData = await req.formData()
    const params: Record<string, string> = {}
    for (const [key, value] of formData.entries()) {
      params[key] = value.toString()
    }

    // Validate Twilio signature
    const twilioSignature = req.headers.get('X-Twilio-Signature') || ''
    const requestUrl = `${SUPABASE_URL}/functions/v1/twilio-voice`

    const isValid = await validateTwilioSignature(requestUrl, params, twilioSignature)
    if (!isValid) {
      console.error('Invalid Twilio signature')
      return new Response(
        '<Response><Say>Invalid request.</Say></Response>',
        { status: 403, headers: { 'Content-Type': 'text/xml' } }
      )
    }

    const calledNumber = params['To'] || ''
    const callerNumber = params['From'] || ''
    const callStatus = params['CallStatus'] || 'ringing'

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Look up provider from called Twilio number
    const { data: phoneRecord } = await supabase
      .from('provider_phone_numbers')
      .select('provider_id, real_number')
      .eq('twilio_number', calledNumber)
      .eq('is_active', true)
      .maybeSingle()

    if (!phoneRecord) {
      console.error(`No provider found for number: ${calledNumber}`)
      return new Response(
        '<Response><Say>Sorry, this number is no longer active. Please visit glowbuddy.com for contact information.</Say></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }

    // Extract area code only (privacy — never store full caller number)
    const callerDigits = callerNumber.replace(/\D/g, '')
    const callerAreaCode = callerDigits.length >= 10
      ? callerDigits.slice(callerDigits.length - 10, callerDigits.length - 7)
      : null

    // Log the call
    await supabase
      .from('call_logs')
      .insert({
        provider_id: phoneRecord.provider_id,
        twilio_number: calledNumber,
        caller_area_code: callerAreaCode,
        status: callStatus === 'ringing' ? 'completed' : callStatus,
        source: 'provider_card',
      })

    // Return TwiML to forward the call
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${calledNumber}">
    ${phoneRecord.real_number}
  </Dial>
</Response>`

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    })
  } catch (err) {
    console.error('twilio-voice error:', err)
    return new Response(
      '<Response><Say>An error occurred. Please try again later.</Say></Response>',
      { status: 500, headers: { 'Content-Type': 'text/xml' } }
    )
  }
})

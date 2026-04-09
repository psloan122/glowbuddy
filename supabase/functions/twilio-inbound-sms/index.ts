// twilio-inbound-sms — receives consumer replies to any GlowBuddy SMS
// and handles the STOP / START / HELP / INFO keywords per the TCPA
// opt-out rules and Twilio's guidelines.
//
// Twilio POSTs application/x-www-form-urlencoded with fields including
// From (sender, E.164), To (our number), Body, MessageSid, and an
// X-Twilio-Signature header. We verify that signature before touching
// any profile rows.
//
// Configure in the Twilio console:
//   A number's "Messaging > A message comes in" webhook →
//   https://<project>.supabase.co/functions/v1/twilio-inbound-sms
//   Method: POST
//
// The function returns TwiML XML with an optional confirmation reply.
// Twilio auto-handles STOP acknowledgement at the carrier level for
// numbers on their platform, but we still write our own confirmation
// so the reply matches GlowBuddy's voice and the user sees a clear
// opt-out confirmation from us specifically.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
// When true, every webhook is signature-verified. If the auth token
// is missing (local dev), we fall through but log a warning so nobody
// accidentally ships an unverified function to production.
const SIGNATURE_VERIFICATION_ENABLED = Boolean(TWILIO_AUTH_TOKEN)

// Stop keywords per Twilio docs. Any body matching these (case-insensitive,
// trimmed, single word) opts the user out. Twilio also recognizes these
// at the platform level, but we duplicate the handling so our
// notification_prefs.sms stays in sync with reality.
const STOP_KEYWORDS = new Set([
  'stop',
  'stopall',
  'unsubscribe',
  'cancel',
  'end',
  'quit',
])

const START_KEYWORDS = new Set(['start', 'yes', 'unstop', 'resume'])

const HELP_KEYWORDS = new Set(['help', 'info'])

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // ── Read + signature-verify the body ───────────────────────────────
  const rawBody = await req.text()
  const signature = req.headers.get('x-twilio-signature')

  if (SIGNATURE_VERIFICATION_ENABLED) {
    if (!signature) {
      console.error('[twilio-inbound-sms] missing x-twilio-signature')
      return new Response('Unauthorized', { status: 401 })
    }

    const fullUrl = buildFullUrl(req)
    const valid = await verifyTwilioSignature(
      TWILIO_AUTH_TOKEN!,
      signature,
      fullUrl,
      rawBody,
    )
    if (!valid) {
      console.error('[twilio-inbound-sms] signature verification failed')
      return new Response('Unauthorized', { status: 401 })
    }
  } else {
    console.warn(
      '[twilio-inbound-sms] running without TWILIO_AUTH_TOKEN — signature verification disabled',
    )
  }

  // ── Parse the form-encoded payload ─────────────────────────────────
  const params = new URLSearchParams(rawBody)
  const from = (params.get('From') || '').trim()
  const body = (params.get('Body') || '').trim()
  const messageSid = params.get('MessageSid') || null

  if (!from || !body) {
    return twimlResponse('')
  }

  // Classify the reply. Only the first word matters — Twilio recommends
  // treating the entire body as a single command even though users
  // sometimes type "STOP please" or "stop all".
  const firstWord = body.split(/\s+/)[0].toLowerCase()
  const isStop = STOP_KEYWORDS.has(firstWord)
  const isStart = START_KEYWORDS.has(firstWord)
  const isHelp = HELP_KEYWORDS.has(firstWord)

  // Bail early for unrelated messages. Return empty TwiML so Twilio
  // doesn't try to send a default reply on our behalf.
  if (!isStop && !isStart && !isHelp) {
    return twimlResponse('')
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // HELP replies don't need a DB write — just respond with a canned
  // support message. Twilio's carrier docs REQUIRE this exact behavior
  // (HELP must always elicit instructions, even after STOP).
  if (isHelp) {
    return twimlResponse(
      'GlowBuddy alerts. Reply STOP to opt out, START to opt in. Support: hello@glowbuddy.com',
    )
  }

  // ── STOP / START flow ──────────────────────────────────────────────
  //
  // Look up every profile with this phone. There SHOULD be exactly one
  // (the verify-phone-start function blocks re-verification of a phone
  // already tied to another account), but we handle the 0- and n-case
  // defensively — better to opt out too many than too few.
  const { data: profilesRaw, error: profErr } = await supabase
    .from('profiles')
    .select('user_id, notification_prefs')
    .eq('phone', from)

  if (profErr) {
    console.error('[twilio-inbound-sms] profiles lookup failed:', profErr)
    return twimlResponse('') // still 200 so Twilio doesn't retry forever
  }

  const profiles = profilesRaw || []

  // Merge the new SMS flag into notification_prefs without clobbering
  // the other keys (email/price_alerts/specials). A jsonb merge on the
  // client side is the simplest path since the row count is tiny.
  for (const p of profiles) {
    const prefs = (p.notification_prefs || {}) as Record<string, unknown>
    const nextPrefs = { ...prefs, sms: isStart ? true : false }

    const { error: updErr } = await supabase
      .from('profiles')
      .update({ notification_prefs: nextPrefs })
      .eq('user_id', p.user_id)

    if (updErr) {
      console.error(
        `[twilio-inbound-sms] profile update failed for user ${p.user_id}:`,
        updErr,
      )
    }
  }

  // Audit trail — log the opt-out/opt-in so support can investigate
  // "why didn't I get my alert?" tickets. Uses the existing
  // custom_events table to stay schema-lite.
  try {
    await supabase.from('custom_events').insert({
      event_name: isStart ? 'sms_opt_in' : 'sms_opt_out',
      properties: {
        phone_suffix: from.slice(-4), // never log the full number
        message_sid: messageSid,
        matched_profiles: profiles.length,
        keyword: firstWord,
      },
    })
  } catch (logErr) {
    console.error('[twilio-inbound-sms] audit log failed:', logErr)
  }

  // ── Reply ──────────────────────────────────────────────────────────
  if (isStop) {
    return twimlResponse(
      "You've been unsubscribed from GlowBuddy alerts. Reply START to re-enable.",
    )
  }
  // isStart
  return twimlResponse(
    "You're re-subscribed to GlowBuddy alerts. Reply STOP to opt out.",
  )
})

// ── Helpers ──────────────────────────────────────────────────────────

function twimlResponse(message: string): Response {
  // If message is empty, return the minimum valid TwiML so Twilio
  // doesn't try to generate its own reply.
  const xml = message
    ? `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
    : `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`
  return new Response(xml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  })
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// Reconstruct the full URL Twilio used to hit us. The X-Forwarded-*
// headers added by Supabase's edge proxy sometimes replace the protocol,
// but the signature calculation on Twilio's side uses the ORIGINAL URL
// the user configured in the Twilio console. We trust req.url as the
// source of truth here and upgrade to https because Twilio always
// signs against https:// URLs.
function buildFullUrl(req: Request): string {
  const url = new URL(req.url)
  url.protocol = 'https:'
  return url.toString()
}

// Twilio's signature scheme:
//   1. Build a string consisting of the full URL + sorted (key+value)
//      pairs of POST parameters concatenated together
//   2. HMAC-SHA1 that string with the auth token as the key
//   3. Base64 encode the result
// The expected signature arrives in X-Twilio-Signature.
async function verifyTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  rawBody: string,
): Promise<boolean> {
  const params = new URLSearchParams(rawBody)
  const entries: Array<[string, string]> = []
  for (const [k, v] of params.entries()) {
    entries.push([k, v])
  }
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))

  let data = url
  for (const [k, v] of entries) {
    data += k + v
  }

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(authToken),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data))

  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)))

  // Constant-time compare
  if (signature.length !== expected.length) return false
  let result = 0
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return result === 0
}

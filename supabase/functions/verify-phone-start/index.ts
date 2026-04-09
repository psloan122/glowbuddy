// verify-phone-start — send a 6-digit SMS code to verify a consumer
// phone number before it gets added to profiles.phone.
//
// POST body: { phone }     // E.164 format, e.g. "+15551234567"
// Auth:      Bearer JWT    // must be a signed-in consumer
//
// Writes a row to phone_verification_codes with a 10-minute TTL and
// sends the code via Twilio. verify-phone-confirm reads back the
// most recent unconsumed row and flips profiles.phone_verified=true
// on a match.
//
// Rate limited to 3 codes per user per rolling hour to prevent abuse.
// Safe by default: mocks the send and logs the code if Twilio secrets
// are not set, so local dev works without a live Twilio sub-account.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  CORS_HEADERS,
  jsonResponse,
  redactPhone,
  truncateSMS,
  withStopSuffix,
} from '../_shared/helpers.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')
const TWILIO_ENABLED = Boolean(
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER,
)

// Strict E.164 regex matching the profiles.phone CHECK constraint.
// Allowing anything looser lets Twilio reject on their side, which
// costs money and leaks a bad UX.
const E164_REGEX = /^\+[1-9][0-9]{7,14}$/

const CODE_TTL_MINUTES = 10
const MAX_CODES_PER_HOUR = 3

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  // ── Authenticate the caller ────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: userData, error: authErr } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', ''),
  )
  if (authErr || !userData?.user) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }
  const user = userData.user

  // ── Parse + validate the phone number ──────────────────────────────
  let body: { phone?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const phone = (body.phone || '').trim()
  if (!phone) {
    return jsonResponse({ error: 'phone is required' }, 400)
  }
  if (!E164_REGEX.test(phone)) {
    return jsonResponse(
      {
        error:
          'phone must be in E.164 format (e.g. +15551234567 — country code required)',
      },
      400,
    )
  }

  // ── Rate limit: max 3 codes per rolling hour per user ──────────────
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count: recentCount, error: countErr } = await supabase
    .from('phone_verification_codes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', oneHourAgo)

  if (countErr) {
    console.error('[verify-phone-start] rate-limit count failed:', countErr)
    return jsonResponse({ error: 'Internal error' }, 500)
  }

  if ((recentCount || 0) >= MAX_CODES_PER_HOUR) {
    return jsonResponse(
      {
        error: 'Too many verification attempts. Try again in an hour.',
        code: 'rate_limited',
      },
      429,
    )
  }

  // ── Guard: if another user has already verified this phone, refuse ─
  // We don't want two accounts sharing a phone number because the
  // twilio-inbound-sms handler uses phone as the lookup key for STOP
  // replies — opting out one user would silently opt out the other.
  const { data: existing } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('phone', phone)
    .eq('phone_verified', true)
    .neq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    return jsonResponse(
      {
        error: 'This phone number is already verified on another account.',
        code: 'phone_taken',
      },
      409,
    )
  }

  // ── Generate the 6-digit code ──────────────────────────────────────
  // crypto.getRandomValues is available in Deno edge runtime.
  const code = String(
    crypto.getRandomValues(new Uint32Array(1))[0] % 1000000,
  ).padStart(6, '0')

  const expiresAt = new Date(
    Date.now() + CODE_TTL_MINUTES * 60 * 1000,
  ).toISOString()

  const { error: insertErr } = await supabase
    .from('phone_verification_codes')
    .insert({
      user_id: user.id,
      phone,
      code,
      expires_at: expiresAt,
    })

  if (insertErr) {
    console.error('[verify-phone-start] insert failed:', insertErr)
    return jsonResponse(
      { error: 'Failed to queue verification code' },
      500,
    )
  }

  // ── Send the SMS ───────────────────────────────────────────────────
  const rawBody = `Your Know Before You Glow verification code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes.`
  const smsBody = withStopSuffix(truncateSMS(rawBody, 160), 160)

  if (TWILIO_ENABLED) {
    try {
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization:
              'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            From: TWILIO_PHONE_NUMBER!,
            To: phone,
            Body: smsBody,
          }),
        },
      )

      if (!res.ok) {
        const errText = await res.text()
        console.error(
          `[verify-phone-start] Twilio send failed to ${redactPhone(phone)}:`,
          errText,
        )
        // Don't leak the raw Twilio error to the client, but do flag it.
        return jsonResponse(
          {
            error: 'Failed to send verification code. Please try again.',
            code: 'send_failed',
          },
          502,
        )
      }
    } catch (err) {
      console.error('[verify-phone-start] Twilio fetch threw:', err)
      return jsonResponse(
        { error: 'Failed to send verification code' },
        502,
      )
    }
  } else {
    // Mock mode — log the code so local dev can verify without Twilio.
    // This log is safe: development Supabase logs only, never production.
    console.log(
      `[verify-phone-start] MOCK SMS to ${redactPhone(phone)}: code=${code} (expires ${expiresAt})`,
    )
  }

  return jsonResponse({
    success: true,
    expires_at: expiresAt,
    ttl_minutes: CODE_TTL_MINUTES,
    mode: TWILIO_ENABLED ? 'live' : 'mock',
  })
})

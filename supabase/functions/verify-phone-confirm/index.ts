// verify-phone-confirm — consume a 6-digit code and flip
// profiles.phone_verified to true.
//
// POST body: { phone, code }   // phone in E.164, code is 6 digits
// Auth:      Bearer JWT        // must be a signed-in consumer
//
// Looks up the most recent unconsumed, non-expired
// phone_verification_codes row for (user_id, phone). If the code
// matches, marks the row consumed and updates profiles. If it
// doesn't match, increments the attempt counter — after 5 attempts
// the row is invalidated and the user has to request a new code.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { CORS_HEADERS, jsonResponse } from '../_shared/helpers.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const E164_REGEX = /^\+[1-9][0-9]{7,14}$/
const CODE_REGEX = /^[0-9]{6}$/
const MAX_ATTEMPTS = 5

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  // ── Authenticate ───────────────────────────────────────────────────
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

  // ── Parse + validate ───────────────────────────────────────────────
  let body: { phone?: string; code?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const phone = (body.phone || '').trim()
  const code = (body.code || '').trim()

  if (!phone || !code) {
    return jsonResponse({ error: 'phone and code are required' }, 400)
  }
  if (!E164_REGEX.test(phone)) {
    return jsonResponse({ error: 'Invalid phone format' }, 400)
  }
  if (!CODE_REGEX.test(code)) {
    return jsonResponse(
      { error: 'Code must be 6 digits' },
      400,
    )
  }

  // ── Look up the most recent unconsumed, non-expired code row ──────
  const nowIso = new Date().toISOString()
  const { data: codeRow, error: lookupErr } = await supabase
    .from('phone_verification_codes')
    .select('id, code, attempts, expires_at, consumed_at')
    .eq('user_id', user.id)
    .eq('phone', phone)
    .is('consumed_at', null)
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lookupErr) {
    console.error('[verify-phone-confirm] lookup failed:', lookupErr)
    return jsonResponse({ error: 'Internal error' }, 500)
  }

  if (!codeRow) {
    return jsonResponse(
      {
        error: 'No active verification code. Request a new one.',
        code: 'no_active_code',
      },
      404,
    )
  }

  // Brute-force guard — after MAX_ATTEMPTS wrong submissions on the
  // same code, the row is invalidated by bumping consumed_at.
  if ((codeRow.attempts || 0) >= MAX_ATTEMPTS) {
    await supabase
      .from('phone_verification_codes')
      .update({ consumed_at: nowIso })
      .eq('id', codeRow.id)

    return jsonResponse(
      {
        error: 'Too many incorrect attempts. Request a new code.',
        code: 'too_many_attempts',
      },
      429,
    )
  }

  // ── Compare codes ──────────────────────────────────────────────────
  // Constant-time compare to defend against any timing side channel
  // a motivated attacker might try. Overkill for a 6-digit code but
  // cheap to implement.
  const matches = constantTimeEqual(codeRow.code, code)

  if (!matches) {
    await supabase
      .from('phone_verification_codes')
      .update({ attempts: (codeRow.attempts || 0) + 1 })
      .eq('id', codeRow.id)

    const attemptsLeft = MAX_ATTEMPTS - ((codeRow.attempts || 0) + 1)
    return jsonResponse(
      {
        error: 'Incorrect code.',
        code: 'invalid_code',
        attempts_left: Math.max(0, attemptsLeft),
      },
      400,
    )
  }

  // ── Consume the code + write phone to profiles ─────────────────────
  const { error: consumeErr } = await supabase
    .from('phone_verification_codes')
    .update({ consumed_at: nowIso })
    .eq('id', codeRow.id)

  if (consumeErr) {
    console.error('[verify-phone-confirm] consume failed:', consumeErr)
    return jsonResponse({ error: 'Internal error' }, 500)
  }

  // Upsert the profile row — profiles is keyed on user_id, and we
  // defensively create the row if it doesn't exist yet (older
  // accounts may pre-date the profiles table for auth-only users).
  const { error: profileErr } = await supabase
    .from('profiles')
    .upsert(
      {
        user_id: user.id,
        phone,
        phone_verified: true,
      },
      { onConflict: 'user_id' },
    )

  if (profileErr) {
    console.error('[verify-phone-confirm] profile upsert failed:', profileErr)
    return jsonResponse(
      { error: 'Failed to save phone number' },
      500,
    )
  }

  return jsonResponse({
    success: true,
    phone_verified: true,
  })
})

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

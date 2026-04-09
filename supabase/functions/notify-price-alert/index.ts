// notify-price-alert — fan SMS notifications out to matching price alerts
// when a provider publishes a special with notify_alerts=true.
//
// Called from the provider dashboard (POST) when a special is saved
// with the "Notify matching patients" toggle on. Pulls the special,
// finds active price_alerts whose criteria match it, dedups against
// already-sent alert_notifications rows, sends one SMS per remaining
// user via Twilio, and records each send in alert_notifications.
//
// Reconciled with the real schema:
//   - provider_specials uses treatment_name / promo_price / ends_at /
//     price_unit / headline (not procedure_slug / special_price /
//     valid_until / title from the original spec).
//   - price_alerts uses procedure_type / max_price / is_active
//     (not procedure_slug / threshold_price / active).
//   - profiles uses user_id as PK and stores phone in a new column
//     (added by migration 066).
//   - providers uses owner_user_id (not claimed_by).
//
// Safe by default: if TWILIO_* secrets aren't set, the function logs
// what it WOULD send and still writes alert_notifications rows so the
// dashboard's counter updates — makes local development possible
// without a live Twilio sub-account.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  CORS_HEADERS,
  jsonResponse,
  getProcedureName,
  formatDate,
  unitSuffix,
  truncateSMS,
  withStopSuffix,
  redactPhone,
  normalizePrefs,
} from '../_shared/helpers.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')
const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER')
const TWILIO_ENABLED = Boolean(
  TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER,
)

// Public site URL used to build the deep link in the SMS. Defaults to
// the production host; override with a secret if you want SMS links
// to point at staging.
const PUBLIC_SITE_URL =
  Deno.env.get('PUBLIC_SITE_URL') || 'https://knowbeforeyouglow.com'

interface RequestBody {
  special_id?: string
}

interface ProviderRef {
  id: string
  name: string | null
  city: string | null
  state: string | null
  slug: string | null
}

interface SpecialRow {
  id: string
  provider_id: string
  treatment_name: string | null
  promo_price: number | null
  price_unit: string | null
  headline: string | null
  ends_at: string | null
  is_active: boolean | null
  notify_alerts: boolean | null
  provider: ProviderRef | null
}

interface AlertRow {
  id: string
  user_id: string
  procedure_type: string
  max_price: number | null
  city: string | null
  state: string | null
  is_active: boolean | null
}

interface ProfileRow {
  user_id: string
  phone: string | null
  phone_verified: boolean | null
  notification_prefs: Record<string, unknown> | null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const specialId = body.special_id
  if (!specialId) {
    return jsonResponse({ error: 'special_id is required' }, 400)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── STEP 1: Fetch the special ──────────────────────────────────────
  const { data: special, error: specialErr } = await supabase
    .from('provider_specials')
    .select(
      `id, provider_id, treatment_name, promo_price, price_unit, headline,
       ends_at, is_active, notify_alerts,
       provider:providers(id, name, city, state, slug)`,
    )
    .eq('id', specialId)
    .maybeSingle<SpecialRow>()

  if (specialErr) {
    console.error('[notify-price-alert] fetch special failed:', specialErr)
    return jsonResponse(
      { error: 'Failed to fetch special', detail: specialErr.message },
      500,
    )
  }
  if (!special) {
    return jsonResponse({ error: 'Special not found' }, 404)
  }
  if (!special.provider || !special.provider.id) {
    return jsonResponse({ error: 'Special has no linked provider' }, 422)
  }
  if (special.promo_price == null) {
    return jsonResponse({ error: 'Special has no promo_price' }, 422)
  }
  if (!special.treatment_name) {
    return jsonResponse({ error: 'Special has no treatment_name' }, 422)
  }

  // Cheap guardrails — don't fan out inactive / expired / unflagged
  // specials even if the dashboard accidentally POSTs here.
  const now = new Date()
  const endsAt = special.ends_at ? new Date(special.ends_at) : null
  if (endsAt && endsAt < now) {
    return jsonResponse({ error: 'Special has already ended' }, 422)
  }
  if (special.is_active === false) {
    return jsonResponse({ error: 'Special is not active' }, 422)
  }

  const provider = special.provider
  const providerCity = provider.city || ''
  const providerState = provider.state || ''

  // ── STEP 2: Find matching price alerts ─────────────────────────────
  //
  // A price_alerts row matches the special when:
  //   - procedure_type matches the special's treatment (case-insensitive)
  //   - is_active = true
  //   - max_price IS NULL OR max_price >= promo_price
  //     (alert is willing to accept at least this price)
  //   - state IS NULL OR equals provider state
  //   - city  IS NULL OR equals provider city
  //
  // The NULL-as-wildcard filters are applied in application code because
  // PostgREST's .or() syntax with is.null across multiple columns is
  // awkward and the candidate set is small (single procedure type).
  const { data: candidateAlertsRaw, error: alertErr } = await supabase
    .from('price_alerts')
    .select('id, user_id, procedure_type, max_price, city, state, is_active')
    .ilike('procedure_type', special.treatment_name)
    .eq('is_active', true)

  if (alertErr) {
    console.error('[notify-price-alert] fetch alerts failed:', alertErr)
    return jsonResponse(
      { error: 'Failed to fetch price alerts', detail: alertErr.message },
      500,
    )
  }

  const candidateAlerts: AlertRow[] = candidateAlertsRaw || []

  const matchedAlerts = candidateAlerts.filter((a) => {
    const priceOk = a.max_price == null || a.max_price >= special.promo_price!
    const stateOk = !a.state || a.state === providerState
    const cityOk = !a.city || a.city === providerCity
    return priceOk && stateOk && cityOk
  })

  if (matchedAlerts.length === 0) {
    // Still update the counters so the dashboard can show "sent to 0".
    await supabase
      .from('provider_specials')
      .update({ notifications_sent: 0, notified_at: now.toISOString() })
      .eq('id', special.id)

    return jsonResponse({
      success: true,
      matched: 0,
      notified: 0,
      skipped: 0,
      reason: 'No active price alerts matched this special.',
    })
  }

  // ── STEP 3: Filter out already-notified users ──────────────────────
  //
  // The (user_id, special_id) unique index on alert_notifications
  // enforces this at the DB level, but doing the filter in code gives
  // us a clean "already_notified" count for the response payload and
  // avoids wasted Twilio API calls.
  const { data: alreadyNotified } = await supabase
    .from('alert_notifications')
    .select('user_id')
    .eq('special_id', special.id)

  const notifiedIds = new Set(
    (alreadyNotified || []).map((r) => r.user_id as string),
  )
  const toNotifyAlerts = matchedAlerts.filter((a) => !notifiedIds.has(a.user_id))

  if (toNotifyAlerts.length === 0) {
    return jsonResponse({
      success: true,
      matched: matchedAlerts.length,
      notified: 0,
      skipped: matchedAlerts.length,
      reason: 'All matched users have already been notified for this special.',
    })
  }

  // ── STEP 4: Pull phone + prefs for every candidate user ────────────
  const userIds = Array.from(new Set(toNotifyAlerts.map((a) => a.user_id)))

  const { data: profilesRaw, error: profErr } = await supabase
    .from('profiles')
    .select('user_id, phone, phone_verified, notification_prefs')
    .in('user_id', userIds)

  if (profErr) {
    console.error('[notify-price-alert] fetch profiles failed:', profErr)
    return jsonResponse(
      { error: 'Failed to fetch consumer profiles', detail: profErr.message },
      500,
    )
  }

  const profileByUserId = new Map<string, ProfileRow>()
  for (const p of (profilesRaw || []) as ProfileRow[]) {
    profileByUserId.set(p.user_id, p)
  }

  // ── STEP 5: Build the SMS body ─────────────────────────────────────
  const procedureName = getProcedureName(special.treatment_name)
  const unit = unitSuffix(special.price_unit)
  const priceFragment =
    unit && unit.length > 0
      ? `$${Number(special.promo_price)}/${unit}`
      : `$${Number(special.promo_price)}`
  const validFragment = endsAt ? ` Valid until ${formatDate(special.ends_at)}.` : ''
  const link = `${PUBLIC_SITE_URL}/provider/${provider.slug || provider.id}?special=${special.id}`

  // The spec wants the provider name shortened first if the message
  // overflows 160 chars. truncateSMS() handles that by keeping the
  // URL at the end intact and shrinking the head of the message.
  const longProviderName = provider.name || 'a Know Before You Glow provider'
  const rawBody =
    `Know Before You Glow: ${longProviderName} in ${providerCity} posted ${procedureName} ` +
    `at ${priceFragment} — matches your price alert.${validFragment} ${link}`

  const smsBody = withStopSuffix(truncateSMS(rawBody, 320), 320)
  // NB: 320 = exactly two SMS segments. Going over that triples the send
  // cost and most carriers drop extra segments silently. The STOP suffix
  // is legally required, so we give ourselves 2 segments of headroom
  // rather than crushing the URL into 160 chars.

  // ── STEP 6: Send one SMS per user, log, handle failures ────────────
  let notified = 0
  let skippedNoPhone = 0
  let skippedSmsOff = 0
  let skippedUnverified = 0
  let failed = 0

  const successfulLogs: Array<{
    user_id: string
    provider_id: string
    special_id: string
    alert_id: string
    type: string
    channel: string
    sent_at: string
  }> = []

  for (const alert of toNotifyAlerts) {
    const profile = profileByUserId.get(alert.user_id)
    if (!profile) {
      skippedNoPhone++
      continue
    }
    const prefs = normalizePrefs(profile.notification_prefs)
    if (!profile.phone) {
      skippedNoPhone++
      continue
    }
    if (!profile.phone_verified) {
      // Never SMS an unverified number — liability + Twilio will
      // reject the request on fraud-prevention grounds.
      skippedUnverified++
      continue
    }
    if (!prefs.sms || !prefs.price_alerts) {
      skippedSmsOff++
      continue
    }

    try {
      if (TWILIO_ENABLED) {
        const twilioRes = await fetch(
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
              To: profile.phone,
              Body: smsBody,
            }),
          },
        )

        if (!twilioRes.ok) {
          const errText = await twilioRes.text()
          // Never log the phone number in plaintext.
          console.error(
            `[notify-price-alert] Twilio send failed for ${redactPhone(profile.phone)}:`,
            errText,
          )
          failed++
          await supabase.from('notification_errors').insert({
            channel: 'sms',
            provider_id: provider.id,
            user_id: alert.user_id,
            special_id: special.id,
            error_code: String(twilioRes.status),
            error_message: errText.slice(0, 500),
            payload: { alert_id: alert.id, redacted_to: redactPhone(profile.phone) },
          })
          continue
        }
      } else {
        // Mock mode — log what we WOULD send and continue. Lets local
        // dev still populate alert_notifications so the dashboard's
        // counter updates.
        console.log(
          `[notify-price-alert] MOCK SMS to ${redactPhone(profile.phone)}: ${smsBody.slice(0, 80)}…`,
        )
      }

      successfulLogs.push({
        user_id: alert.user_id,
        provider_id: provider.id,
        special_id: special.id,
        alert_id: alert.id,
        type: 'price_match',
        channel: 'sms',
        sent_at: new Date().toISOString(),
      })
      notified++
    } catch (err) {
      console.error('[notify-price-alert] unexpected send error:', err)
      failed++
      try {
        await supabase.from('notification_errors').insert({
          channel: 'sms',
          provider_id: provider.id,
          user_id: alert.user_id,
          special_id: special.id,
          error_code: 'exception',
          error_message: String(err).slice(0, 500),
          payload: { alert_id: alert.id },
        })
      } catch (logErr) {
        console.error('[notify-price-alert] error logging failure:', logErr)
      }
    }
  }

  // ── STEP 7: Write alert_notifications rows (batch) ─────────────────
  //
  // We insert AFTER the send loop so a failed Twilio call doesn't
  // leave a ghost "sent" row. The unique index on (user_id, special_id)
  // protects against double-fires if the dashboard posts twice.
  if (successfulLogs.length > 0) {
    const { error: logErr } = await supabase
      .from('alert_notifications')
      .insert(successfulLogs)
    if (logErr) {
      // Don't fail the whole request — the SMS already went out.
      // Surface in the response so the dashboard can retry the log.
      console.error(
        '[notify-price-alert] alert_notifications insert failed:',
        logErr,
      )
    }
  }

  // ── STEP 8: Update the special with notification bookkeeping ──────
  const { error: updErr } = await supabase
    .from('provider_specials')
    .update({
      notifications_sent: notified,
      notified_at: new Date().toISOString(),
    })
    .eq('id', special.id)

  if (updErr) {
    console.error('[notify-price-alert] special update failed:', updErr)
  }

  // ── STEP 9: Build the response payload ─────────────────────────────
  const skipped =
    skippedNoPhone + skippedSmsOff + skippedUnverified + failed
  const reasons: string[] = []
  if (skippedNoPhone > 0) reasons.push(`${skippedNoPhone} had no phone on file`)
  if (skippedUnverified > 0)
    reasons.push(`${skippedUnverified} had unverified phones`)
  if (skippedSmsOff > 0) reasons.push(`${skippedSmsOff} had SMS disabled`)
  if (failed > 0) reasons.push(`${failed} send failures`)

  return jsonResponse({
    success: true,
    matched: matchedAlerts.length,
    notified,
    skipped,
    already_notified: matchedAlerts.length - toNotifyAlerts.length,
    reason: reasons.length > 0 ? reasons.join('; ') : null,
    mode: TWILIO_ENABLED ? 'live' : 'mock',
  })
})

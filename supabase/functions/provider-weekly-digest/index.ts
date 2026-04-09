// provider-weekly-digest — sends a Monday-morning summary email to
// every claimed provider that has opted in.
//
// Runs on a pg_cron schedule (see deploy instructions) but is also
// POST-callable for manual triggering + admin "send me the digest
// right now" buttons. POST body:
//
//   {}                            → run for every eligible provider
//   { "provider_id": "uuid" }    → run for one provider only
//
// Reconciled with the real schema:
//   - providers.owner_user_id is the claim pointer (not claimed_by)
//   - provider_page_views does NOT exist — we read view counts out of
//     the existing custom_events table where event_name='provider_page_view'
//     and properties->>'provider_id' matches. This matches how
//     src/pages/ProviderProfile.jsx records them.
//   - provider_specials uses treatment_name / promo_price / ends_at
//     (not title / special_price / valid_until).
//   - price_alerts uses procedure_type (not procedure_slug).
//
// Safe by default: if RESEND_API_KEY isn't set, the function logs
// what it WOULD send and still writes an email_log row so downstream
// analytics work locally without a Resend key.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  CORS_HEADERS,
  jsonResponse,
  getProcedureName,
  formatDate,
  unitSuffix,
  redactEmail,
} from '../_shared/helpers.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const RESEND_ENABLED = Boolean(RESEND_API_KEY)

const FROM_ADDRESS =
  Deno.env.get('DIGEST_FROM_ADDRESS') || 'GlowBuddy <hello@glowbuddy.com>'
const PUBLIC_SITE_URL =
  Deno.env.get('PUBLIC_SITE_URL') || 'https://glowbuddy.com'

interface RequestBody {
  provider_id?: string
}

interface Provider {
  id: string
  name: string | null
  city: string | null
  state: string | null
  tier: string | null
  owner_user_id: string | null
  is_claimed: boolean | null
  notify_weekly: boolean | null
}

interface DigestStats {
  thisWeekViews: number
  lastWeekViews: number
  notificationsSent: number
  activeSpecials: Array<{
    treatment_name: string | null
    promo_price: number | null
    price_unit: string | null
    ends_at: string | null
    redemption_count: number | null
  }>
  topDemand: Array<{ procedure_type: string; count: number }>
  demandTotal: number
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST' && req.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  let body: RequestBody = {}
  if (req.method === 'POST') {
    try {
      const text = await req.text()
      body = text ? (JSON.parse(text) as RequestBody) : {}
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── STEP 1: Resolve the set of providers to digest ─────────────────
  let providerQuery = supabase
    .from('providers')
    .select('id, name, city, state, tier, owner_user_id, is_claimed, notify_weekly')
    .eq('is_claimed', true)
    .eq('notify_weekly', true)
    .not('owner_user_id', 'is', null)

  if (body.provider_id) {
    providerQuery = providerQuery.eq('id', body.provider_id)
  }

  const { data: providersRaw, error: provErr } = await providerQuery
  if (provErr) {
    console.error('[weekly-digest] fetch providers failed:', provErr)
    return jsonResponse(
      { error: 'Failed to fetch providers', detail: provErr.message },
      500,
    )
  }

  const providers: Provider[] = providersRaw || []
  if (providers.length === 0) {
    return jsonResponse({
      success: true,
      processed: 0,
      sent: 0,
      reason: body.provider_id
        ? 'Provider not found, not claimed, or has notify_weekly=false'
        : 'No providers eligible for this week',
    })
  }

  // ── STEP 2: Process each provider ──────────────────────────────────
  let sent = 0
  let skipped = 0
  let failed = 0
  const results: Array<Record<string, unknown>> = []

  for (const provider of providers) {
    try {
      const stats = await gatherStats(supabase, provider)
      const email = await resolveProviderEmail(supabase, provider)

      if (!email) {
        skipped++
        results.push({
          provider_id: provider.id,
          status: 'skipped',
          reason: 'no_email_on_file',
        })
        continue
      }

      const subject = buildSubject(stats, provider)
      const html = buildEmailHtml(provider, stats)

      const sendResult = await sendEmail(email, subject, html)
      if (!sendResult.ok) {
        failed++
        await supabase.from('notification_errors').insert({
          channel: 'email',
          provider_id: provider.id,
          error_code: sendResult.code || 'send_failed',
          error_message: (sendResult.error || '').slice(0, 500),
          payload: { type: 'weekly_digest', recipient: redactEmail(email) },
        })
        results.push({
          provider_id: provider.id,
          status: 'failed',
          reason: sendResult.code || 'send_failed',
        })
        continue
      }

      // Log the send. Never store the raw recipient email in stats —
      // put it in its own column so GDPR deletion is a targeted UPDATE.
      await supabase.from('email_log').insert({
        provider_id: provider.id,
        type: 'weekly_digest',
        subject,
        recipient: email,
        sent_at: new Date().toISOString(),
        stats: {
          views: stats.thisWeekViews,
          views_last_week: stats.lastWeekViews,
          notifications_sent: stats.notificationsSent,
          demand_total: stats.demandTotal,
          active_specials: stats.activeSpecials.length,
          mode: RESEND_ENABLED ? 'live' : 'mock',
        },
      })

      sent++
      results.push({
        provider_id: provider.id,
        status: 'sent',
        recipient: redactEmail(email),
      })
    } catch (err) {
      // Never crash the whole batch on one provider's failure.
      console.error(
        `[weekly-digest] unexpected error for provider ${provider.id}:`,
        err,
      )
      failed++
      try {
        await supabase.from('notification_errors').insert({
          channel: 'email',
          provider_id: provider.id,
          error_code: 'exception',
          error_message: String(err).slice(0, 500),
          payload: { type: 'weekly_digest' },
        })
      } catch (logErr) {
        console.error('[weekly-digest] error logging failure:', logErr)
      }
      results.push({
        provider_id: provider.id,
        status: 'failed',
        reason: 'exception',
      })
    }
  }

  return jsonResponse({
    success: true,
    processed: providers.length,
    sent,
    skipped,
    failed,
    mode: RESEND_ENABLED ? 'live' : 'mock',
    results,
  })
})

// ───────────────────────────────────────────────────────────────────
//                           HELPERS
// ───────────────────────────────────────────────────────────────────

// Intentionally using `any` for the client parameter: the return type
// of createClient is a generated types-schema generic that fails strict
// assignability when passed across helper boundaries without a pre-
// generated database.ts. The runtime behavior is identical.
// deno-lint-ignore no-explicit-any
type SupabaseClient = any

async function gatherStats(
  supabase: SupabaseClient,
  provider: Provider,
): Promise<DigestStats> {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  // Views this week — read from custom_events since provider_page_views
  // doesn't exist. The properties column is jsonb, and ProviderProfile
  // writes { provider_id, provider_slug, is_claimed, source, ... } there.
  const { count: thisWeekViews } = await supabase
    .from('custom_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_name', 'provider_page_view')
    .eq('properties->>provider_id', provider.id)
    .gte('created_at', weekAgo.toISOString())

  const { count: lastWeekViews } = await supabase
    .from('custom_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_name', 'provider_page_view')
    .eq('properties->>provider_id', provider.id)
    .gte('created_at', twoWeeksAgo.toISOString())
    .lt('created_at', weekAgo.toISOString())

  // Active specials — is_active boolean, end date still in the future.
  const { data: activeSpecialsRaw } = await supabase
    .from('provider_specials')
    .select(
      'treatment_name, promo_price, price_unit, ends_at, redemption_count',
    )
    .eq('provider_id', provider.id)
    .eq('is_active', true)
    .or(`ends_at.is.null,ends_at.gt.${now.toISOString()}`)
    .order('ends_at', { ascending: true })

  // Demand intel — count distinct active price_alerts by procedure_type
  // in the provider's city. We pull the raw rows and aggregate in code
  // because PostgREST doesn't expose GROUP BY cleanly for jsonb-free
  // queries, and the active-alert population in a single city is small.
  let topDemand: Array<{ procedure_type: string; count: number }> = []
  let demandTotal = 0

  if (provider.city) {
    const { data: alertsInCity } = await supabase
      .from('price_alerts')
      .select('procedure_type')
      .eq('is_active', true)
      .eq('city', provider.city)

    const demandMap = new Map<string, number>()
    const rows = (alertsInCity || []) as Array<{ procedure_type: string | null }>
    for (const row of rows) {
      const key = row.procedure_type
      if (!key) continue
      demandMap.set(key, (demandMap.get(key) || 0) + 1)
      demandTotal++
    }
    topDemand = Array.from(demandMap.entries())
      .map(([procedure_type, count]) => ({ procedure_type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
  }

  // Notifications sent this week via notify-price-alert.
  const { count: notificationsSent } = await supabase
    .from('alert_notifications')
    .select('*', { count: 'exact', head: true })
    .eq('provider_id', provider.id)
    .gte('sent_at', weekAgo.toISOString())

  return {
    thisWeekViews: thisWeekViews || 0,
    lastWeekViews: lastWeekViews || 0,
    notificationsSent: notificationsSent || 0,
    activeSpecials: (activeSpecialsRaw || []) as DigestStats['activeSpecials'],
    topDemand,
    demandTotal,
  }
}

async function resolveProviderEmail(
  supabase: SupabaseClient,
  provider: Provider,
): Promise<string | null> {
  if (!provider.owner_user_id) return null
  const { data, error } = await supabase.auth.admin.getUserById(
    provider.owner_user_id,
  )
  if (error) {
    console.error(
      `[weekly-digest] getUserById failed for provider ${provider.id}:`,
      error,
    )
    return null
  }
  return data?.user?.email || null
}

function buildSubject(stats: DigestStats, provider: Provider): string {
  const viewsFragment = `${stats.thisWeekViews} view${stats.thisWeekViews === 1 ? '' : 's'}`
  const demandFragment =
    stats.demandTotal > 0
      ? `${stats.demandTotal} patients watching ${provider.city || 'your area'}`
      : 'no alerts nearby yet'
  return `Your week on GlowBuddy — ${viewsFragment}, ${demandFragment}`
}

// HTML email that renders cleanly in Gmail, Outlook, and Apple Mail.
// Intentionally plain-CSS, no external stylesheets, no <link> tags.
// Uses web-safe system fonts because custom web fonts don't load in
// most desktop mail clients.
function buildEmailHtml(provider: Provider, stats: DigestStats): string {
  const viewsDelta = stats.thisWeekViews - stats.lastWeekViews
  const viewsTrend =
    viewsDelta > 0 ? 'up' : viewsDelta < 0 ? 'down' : 'flat'
  const viewsTrendArrow =
    viewsTrend === 'up' ? '↑' : viewsTrend === 'down' ? '↓' : '→'
  const viewsDeltaAbs = Math.abs(viewsDelta)

  const isFreeTier = provider.tier === 'free' || !provider.tier
  const providerName = escapeHtml(provider.name || 'your provider')
  const providerCity = escapeHtml(provider.city || 'your area')
  const providerState = escapeHtml(provider.state || '')

  const demandBlock = renderDemandBlock(
    providerCity,
    stats.topDemand,
    stats.demandTotal,
    isFreeTier,
  )
  const specialsBlock = renderSpecialsBlock(stats.activeSpecials)

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your week on GlowBuddy</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111; max-width: 600px; margin: 0 auto; padding: 20px; background: #fff; }
  .header { border-bottom: 1px solid #eee; padding-bottom: 16px; margin-bottom: 24px; }
  .logo { font-size: 20px; font-weight: 600; color: #1D9E75; }
  .sub { font-size: 14px; color: #666; margin-top: 4px; }
  .stat-row { width: 100%; border-collapse: separate; border-spacing: 8px 0; margin: 16px 0; }
  .stat { background: #f9f9f9; border-radius: 8px; padding: 16px; text-align: center; width: 33%; }
  .stat-num { font-size: 28px; font-weight: 600; color: #111; line-height: 1.2; }
  .stat-label { font-size: 12px; color: #666; margin-top: 4px; }
  .stat-delta { font-size: 12px; margin-top: 4px; }
  .up { color: #1D9E75; }
  .down { color: #D85A30; }
  .flat { color: #888; }
  .section { margin: 24px 0; }
  .section-title { font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: #666; margin-bottom: 12px; }
  .row { padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
  .cta { background: #1D9E75; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; margin: 8px 0; font-weight: 500; }
  .locked { background: #f5f5f5; border: 1px dashed #ccc; border-radius: 8px; padding: 16px; text-align: center; color: #666; font-size: 14px; }
  .footer { margin-top: 40px; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 16px; }
  .footer a { color: #666; text-decoration: none; }
</style>
</head>
<body>
  <div class="header">
    <div class="logo">GlowBuddy</div>
    <div class="sub">Weekly summary for ${providerName}</div>
  </div>

  <div class="section">
    <div class="section-title">This week</div>
    <table class="stat-row" role="presentation">
      <tr>
        <td class="stat">
          <div class="stat-num">${stats.thisWeekViews}</div>
          <div class="stat-label">Profile views</div>
          <div class="stat-delta ${viewsTrend}">${viewsTrendArrow} ${viewsDeltaAbs} vs last week</div>
        </td>
        <td class="stat">
          <div class="stat-num">${stats.notificationsSent}</div>
          <div class="stat-label">Patients notified</div>
          <div class="stat-delta flat">via specials</div>
        </td>
        <td class="stat">
          <div class="stat-num">${stats.activeSpecials.length}</div>
          <div class="stat-label">Active specials</div>
        </td>
      </tr>
    </table>
  </div>

  ${demandBlock}

  ${specialsBlock}

  <div class="footer">
    <a href="${PUBLIC_SITE_URL}/business/dashboard">View full dashboard</a>
    &nbsp;&middot;&nbsp;
    <a href="${PUBLIC_SITE_URL}/business/dashboard?tab=Settings">Manage email preferences</a>
    &nbsp;&middot;&nbsp;
    <a href="${PUBLIC_SITE_URL}/unsubscribe?provider=${provider.id}">Unsubscribe</a>
    <br><br>
    GlowBuddy &middot; ${providerCity}${providerState ? ', ' + providerState : ''}
  </div>
</body>
</html>`
}

function renderDemandBlock(
  city: string,
  topDemand: DigestStats['topDemand'],
  demandTotal: number,
  isFreeTier: boolean,
): string {
  if (!topDemand || topDemand.length === 0) return ''

  if (isFreeTier) {
    return `
  <div class="section">
    <div class="section-title">Patient demand in ${city}</div>
    <div class="locked">
      🔒 ${demandTotal} patient${demandTotal === 1 ? '' : 's'} in ${city} have active price alerts.<br><br>
      <a href="${PUBLIC_SITE_URL}/business/dashboard?tab=Upgrade" class="cta">Upgrade to reach them &rarr;</a>
    </div>
  </div>`
  }

  const rows = topDemand
    .map(
      (d) => `
      <div class="row">
        <table width="100%" role="presentation"><tr>
          <td>${escapeHtml(getProcedureName(d.procedure_type))}</td>
          <td align="right" style="font-weight:500">${d.count} patient${d.count === 1 ? '' : 's'} watching</td>
        </tr></table>
      </div>`,
    )
    .join('')

  return `
  <div class="section">
    <div class="section-title">Patient demand in ${city}</div>
    ${rows}
    <br>
    <a href="${PUBLIC_SITE_URL}/business/dashboard?tab=Demand%20Intel" class="cta">Post a special to reach them &rarr;</a>
  </div>`
}

function renderSpecialsBlock(
  specials: DigestStats['activeSpecials'],
): string {
  if (!specials || specials.length === 0) {
    return `
  <div class="section">
    <div class="section-title">Post a special</div>
    <p style="font-size:14px;color:#666;margin:0 0 12px">
      You have no active specials. Post one to notify patients watching your procedures.
    </p>
    <a href="${PUBLIC_SITE_URL}/business/dashboard?tab=Promoted%20Specials" class="cta">Create a special &rarr;</a>
  </div>`
  }

  const rows = specials
    .map((s) => {
      const unit = unitSuffix(s.price_unit)
      const priceFragment =
        unit.length > 0
          ? `$${Number(s.promo_price)}/${escapeHtml(unit)}`
          : `$${Number(s.promo_price)}`
      const expires = s.ends_at
        ? `expires ${escapeHtml(formatDate(s.ends_at))}`
        : 'no expiration'
      const redemptions = s.redemption_count ?? 0
      return `
      <div class="row">
        <table width="100%" role="presentation"><tr>
          <td>${escapeHtml(getProcedureName(s.treatment_name))} &mdash; ${priceFragment}</td>
          <td align="right" style="color:#666">${redemptions} redemption${redemptions === 1 ? '' : 's'} &middot; ${expires}</td>
        </tr></table>
      </div>`
    })
    .join('')

  return `
  <div class="section">
    <div class="section-title">Your active specials</div>
    ${rows}
  </div>`
}

// Minimal HTML escape — we only interpolate provider names and
// procedure names, none of which should ever contain HTML, but this
// defends against a malicious provider name leaking across emails.
function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ ok: true } | { ok: false; code?: string; error?: string }> {
  if (!RESEND_ENABLED) {
    console.log(
      `[weekly-digest] MOCK email to ${redactEmail(to)}: ${subject}`,
    )
    return { ok: true }
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to,
        subject,
        html,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error(
        `[weekly-digest] Resend send failed for ${redactEmail(to)}:`,
        errText,
      )
      return { ok: false, code: String(res.status), error: errText }
    }
    return { ok: true }
  } catch (err) {
    console.error(
      `[weekly-digest] Resend fetch threw for ${redactEmail(to)}:`,
      err,
    )
    return { ok: false, code: 'exception', error: String(err) }
  }
}

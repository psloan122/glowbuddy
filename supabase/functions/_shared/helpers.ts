// Shared helpers for GlowBuddy edge functions.
//
// Kept deliberately small — no Supabase client, no network calls,
// just stateless utilities used by notify-price-alert and
// provider-weekly-digest. Anything stateful belongs in the function
// file itself so each edge function can be debugged in isolation.

export const PROCEDURE_DISPLAY_NAMES: Record<string, string> = {
  neurotoxin: 'Botox / neurotoxins',
  filler: 'Dermal fillers',
  laser: 'Laser treatments',
  microneedling: 'Microneedling',
  'weight-loss': 'GLP-1 / weight loss',
  'rf-tightening': 'RF microneedling',
  'chemical-peel': 'Chemical peels',
  hydrafacial: 'HydraFacial',
  coolsculpting: 'CoolSculpting',
  'iv-wellness': 'IV therapy',
  prp: 'PRP treatments',
  'thread-lift': 'Thread lifts',
  'laser-hair': 'Laser hair removal',
  botox: 'Botox',
  dysport: 'Dysport',
  juvederm: 'Juvederm',
  restylane: 'Restylane',
}

// Consumer-facing label for a procedure slug/type. Falls back to the
// raw slug (with dashes flipped to spaces) when we don't have a canonical
// display name, so new procedures never render as empty strings.
export function getProcedureName(slugOrType: string | null | undefined): string {
  if (!slugOrType) return 'treatment'
  const key = String(slugOrType).toLowerCase().trim()
  if (PROCEDURE_DISPLAY_NAMES[key]) return PROCEDURE_DISPLAY_NAMES[key]
  return key.replace(/[-_]/g, ' ')
}

// Short date format used in both SMS bodies and email subject lines.
// Example: "Apr 15". Returns empty string for null/undefined so we can
// interpolate without guarding at every call site.
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Human unit suffix — strips the "per_" prefix the provider_specials
// table stores ("per_unit" → "unit"). Returns empty string when there's
// nothing meaningful to show, so callers can safely do
// `${price}/${unitSuffix(u)}` without stray slashes.
export function unitSuffix(priceUnit: string | null | undefined): string {
  if (!priceUnit) return ''
  return String(priceUnit).replace(/^per_/, '')
}

// Truncate a string so the entire SMS fits in one segment (160 GSM-7
// chars). Tries to preserve the URL at the end by truncating the middle
// — if a URL is present, we keep everything from the last "http" onward
// and squeeze the provider-name portion. Falls back to a plain tail
// truncation when no URL is present.
export function truncateSMS(msg: string, maxLen = 160): string {
  if (msg.length <= maxLen) return msg
  const urlIdx = msg.lastIndexOf('http')
  if (urlIdx > 0) {
    const url = msg.slice(urlIdx)
    const headroom = maxLen - url.length - 4 // ' … '
    if (headroom > 20) {
      return msg.slice(0, headroom).trimEnd() + '… ' + url
    }
  }
  return msg.slice(0, maxLen - 1).trimEnd() + '…'
}

// Every outbound SMS must carry opt-out instructions per Twilio/TCPA.
// Append " Reply STOP to opt out." if there's room; otherwise
// ruthlessly truncate the body first so we can still fit it.
export function withStopSuffix(body: string, maxLen = 160): string {
  const suffix = ' Reply STOP to opt out.'
  if (body.length + suffix.length <= maxLen) return body + suffix
  const room = maxLen - suffix.length
  if (room < 40) {
    // Message is so long there's barely room — keep the body and drop
    // the suffix. The next segment will carry the legal language.
    return truncateSMS(body, maxLen)
  }
  return truncateSMS(body, room) + suffix
}

// ── CORS helpers ─────────────────────────────────────────────────────
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  })
}

// ── Redaction ────────────────────────────────────────────────────────
// Never log raw phone numbers or email addresses. Use these wrappers
// in console.log/console.error calls so accidental PII exposure
// doesn't leak into Supabase function logs.
export function redactPhone(phone: string | null | undefined): string {
  if (!phone) return '<none>'
  const s = String(phone)
  if (s.length < 6) return '***'
  return s.slice(0, 3) + '****' + s.slice(-2)
}

export function redactEmail(email: string | null | undefined): string {
  if (!email) return '<none>'
  const s = String(email)
  const at = s.indexOf('@')
  if (at <= 1) return '***'
  return s[0] + '***' + s.slice(at)
}

// ── Notification prefs ───────────────────────────────────────────────
// The profiles.notification_prefs jsonb column defaults to all-true,
// but may be null on older rows or contain partial keys. This normalizer
// turns anything into a predictable boolean shape so the send gate
// can just check `prefs.sms && prefs.price_alerts`.
export interface NotificationPrefs {
  sms: boolean
  email: boolean
  price_alerts: boolean
  specials: boolean
}

export function normalizePrefs(
  raw: Record<string, unknown> | null | undefined,
): NotificationPrefs {
  const p = raw || {}
  const boolOrTrue = (v: unknown) => (v === false || v === 'false' ? false : true)
  return {
    sms: boolOrTrue(p.sms),
    email: boolOrTrue(p.email),
    price_alerts: boolOrTrue(p.price_alerts),
    specials: boolOrTrue(p.specials),
  }
}

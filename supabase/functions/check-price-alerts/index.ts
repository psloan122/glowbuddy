import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

interface CheckPriceAlertsInput {
  submission_id?: string
  special_id?: string
  procedure_type: string
  price: number
  price_unit?: string
  city: string
  state: string
  provider_name: string
  provider_id?: string
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const input: CheckPriceAlertsInput = await req.json()

    // ── Validate required fields ──────────────────────────────────────
    if (!input.procedure_type || input.price == null) {
      return new Response(
        JSON.stringify({
          error: 'procedure_type and price are required',
        }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // ── 1. Find all active price_alerts matching the input ────────────
    // Build the query with conditional filters so NULL columns act as
    // wildcards (i.e. the user wants alerts for "any city/state/price").
    let alertQuery = supabase
      .from('price_alerts')
      .select('*')
      .eq('procedure_type', input.procedure_type)
      .eq('is_active', true)

    // State: match when alert.state IS NULL (any state) OR equals input
    // We fetch all and filter in code because `.or()` with `is.null` and
    // `.eq` across multiple columns is cleaner this way.
    const { data: candidateAlerts, error: alertError } = await alertQuery

    if (alertError) {
      console.error('Error fetching price_alerts:', alertError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch price alerts', detail: alertError.message }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    if (!candidateAlerts || candidateAlerts.length === 0) {
      return new Response(
        JSON.stringify({ matched: 0, notified: 0 }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    // Apply the wildcard-nullable filters in application code
    const matchingAlerts = candidateAlerts.filter((alert) => {
      const stateMatch = alert.state == null || alert.state === input.state
      const cityMatch = alert.city == null || alert.city === input.city
      const priceMatch = alert.max_price == null || input.price <= alert.max_price
      // Unit match: alert.price_unit must match the incoming price's unit.
      // Default to per_unit for existing alerts that don't have price_unit set.
      const alertUnit = alert.price_unit || 'per_unit'
      const inputUnit = input.price_unit || 'per_unit'
      const unitMatch = alertUnit === inputUnit
      return stateMatch && cityMatch && priceMatch && unitMatch
    })

    if (matchingAlerts.length === 0) {
      return new Response(
        JSON.stringify({ matched: 0, notified: 0 }),
        { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
      )
    }

    // ── 2. Process each matching alert ────────────────────────────────
    let matched = matchingAlerts.length
    let notified = 0

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    for (const alert of matchingAlerts) {
      try {
        // ── 2a. 24-hour cooldown check ──────────────────────────────
        const { data: recentTriggers, error: cooldownError } = await supabase
          .from('price_alert_triggers')
          .select('id')
          .eq('alert_id', alert.id)
          .eq('provider_name', input.provider_name)
          .gte('created_at', twentyFourHoursAgo)
          .limit(1)

        if (cooldownError) {
          console.error(`Cooldown check failed for alert ${alert.id}:`, cooldownError)
          continue
        }

        if (recentTriggers && recentTriggers.length > 0) {
          console.log(
            `Skipping alert ${alert.id} — already triggered for provider "${input.provider_name}" within 24hrs`,
          )
          continue
        }

        // ── 2b. Insert into price_alert_triggers ────────────────────
        const { data: trigger, error: triggerError } = await supabase
          .from('price_alert_triggers')
          .insert({
            alert_id: alert.id,
            procedure_id: input.submission_id ?? null,
            price_seen: input.price,
            provider_name: input.provider_name,
            provider_id: input.provider_id ?? null,
            was_sent: false,
            was_read: false,
          })
          .select('id')
          .single()

        if (triggerError) {
          console.error(`Failed to insert trigger for alert ${alert.id}:`, triggerError)
          continue
        }

        // ── 2c. Update price_alerts: last_triggered_at & trigger_count
        const { error: updateError } = await supabase
          .from('price_alerts')
          .update({
            last_triggered_at: new Date().toISOString(),
            trigger_count: (alert.trigger_count ?? 0) + 1,
          })
          .eq('id', alert.id)

        if (updateError) {
          console.error(`Failed to update alert ${alert.id}:`, updateError)
          // Non-fatal — continue to notification
        }

        // ── 2d. Insert into user_notifications ──────────────────────
        const { error: notifError } = await supabase
          .from('user_notifications')
          .insert({
            user_id: alert.user_id,
            price_alert_trigger_id: trigger.id,
            is_read: false,
          })

        if (notifError) {
          console.error(`Failed to insert notification for alert ${alert.id}:`, notifError)
          // Non-fatal — continue to email
        }

        // ── 2e. Get user email from auth.users ──────────────────────
        const { data: userData, error: userError } =
          await supabase.auth.admin.getUserById(alert.user_id)

        if (userError || !userData?.user?.email) {
          console.error(
            `Failed to get email for user ${alert.user_id}:`,
            userError ?? 'no email on file',
          )
          // Mark trigger as not sent but still count the match
          continue
        }

        const userEmail = userData.user.email

        // ── 2f. Call send-email function ─────────────────────────────
        const providerSlug = input.provider_id ?? encodeURIComponent(input.provider_name)
        const providerUrl = `${SUPABASE_URL.replace('.supabase.co', '.vercel.app')}/providers/${providerSlug}`

        const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            template: 'price_alert',
            to: userEmail,
            data: {
              treatment: input.procedure_type,
              price: String(input.price),
              providerName: input.provider_name,
              providerUrl,
            },
          }),
        })

        if (!emailRes.ok) {
          const errBody = await emailRes.text()
          console.error(`send-email failed for alert ${alert.id}:`, errBody)
          // Still count — the trigger and notification were created
        } else {
          // Mark trigger as sent
          await supabase
            .from('price_alert_triggers')
            .update({ was_sent: true })
            .eq('id', trigger.id)
        }

        notified++
      } catch (alertProcessingError) {
        console.error(`Unexpected error processing alert ${alert.id}:`, alertProcessingError)
        continue
      }
    }

    // ── 3. Return summary ─────────────────────────────────────────────
    return new Response(
      JSON.stringify({ matched, notified }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('check-price-alerts unhandled error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error', detail: String(err) }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  }
})

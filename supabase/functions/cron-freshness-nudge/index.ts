// Supabase Edge Function: Freshness nudge emails for stale price submissions
// Deploy: supabase functions deploy cron-freshness-nudge
// Schedule: 0 9 * * 1 (Monday 9am UTC)
// Secrets needed: RESEND_API_KEY (via send-email)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Submissions older than this many days are considered stale
const STALE_DAYS = 180
// Don't re-nudge more frequently than this
const NUDGE_COOLDOWN_DAYS = 30

Deno.serve(async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const staleCutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const nudgeCutoff = new Date(Date.now() - NUDGE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString()

    // Find stale active submissions that haven't been confirmed and haven't been nudged recently
    const { data: staleProcs, error: fetchError } = await supabase
      .from('procedures')
      .select('id, user_id, procedure_type, provider_name, city, state, created_at')
      .eq('status', 'active')
      .not('user_id', 'is', null)
      .is('freshness_confirmed_at', null)
      .lt('created_at', staleCutoff)
      .or(`last_nudge_sent_at.is.null,last_nudge_sent_at.lt.${nudgeCutoff}`)
      .limit(500)

    if (fetchError) {
      console.error('Fetch stale procedures error:', fetchError)
      return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 })
    }

    if (!staleProcs || staleProcs.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No stale submissions found' }), { status: 200 })
    }

    // Group by user_id
    const userProcs: Record<string, typeof staleProcs> = {}
    for (const proc of staleProcs) {
      if (!proc.user_id) continue
      if (!userProcs[proc.user_id]) userProcs[proc.user_id] = []
      userProcs[proc.user_id].push(proc)
    }

    let sentCount = 0

    for (const [userId, procs] of Object.entries(userProcs)) {
      // Get user email
      const { data: { user } } = await supabase.auth.admin.getUserById(userId)
      if (!user?.email) continue

      // Build procedure list for email
      const procedures = procs.map((p) => ({
        procedure_type: p.procedure_type,
        provider_name: p.provider_name || 'Unknown Provider',
        city: p.city || '',
        state: p.state || '',
        procedure_id: p.id,
      }))

      // Send nudge email via send-email function
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          template: 'freshness_nudge',
          to: user.email,
          data: {
            userName: user.user_metadata?.display_name || null,
            staleCount: procs.length,
            procedures,
          },
        }),
      })

      if (res.ok) {
        sentCount++

        // Update last_nudge_sent_at for all this user's stale procedures
        const procIds = procs.map((p) => p.id)
        await supabase
          .from('procedures')
          .update({ last_nudge_sent_at: new Date().toISOString() })
          .in('id', procIds)
      } else {
        console.error(`Failed to send nudge for user ${userId}:`, await res.text())
      }
    }

    return new Response(
      JSON.stringify({ sent: sentCount, usersWithStaleProcs: Object.keys(userProcs).length }),
      { status: 200 }
    )
  } catch (err) {
    console.error('cron-freshness-nudge error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500 }
    )
  }
})

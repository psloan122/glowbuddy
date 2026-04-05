// Supabase Edge Function: Fan out injector updates to follower notifications
// Deploy: supabase functions deploy fan-out-injector-update
// Trigger: Call after INSERT on injector_updates

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { injector_update_id } = await req.json()
    if (!injector_update_id) {
      return new Response(
        JSON.stringify({ error: 'injector_update_id required' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Fetch the update
    const { data: update, error: updateErr } = await supabase
      .from('injector_updates')
      .select('id, injector_id, update_type')
      .eq('id', injector_update_id)
      .single()

    if (updateErr || !update) {
      return new Response(
        JSON.stringify({ error: 'Update not found' }),
        { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // Map update_type to the notification preference column
    const prefMap: Record<string, string> = {
      moved: 'notify_on_move',
      special: 'notify_on_special',
      availability: 'notify_on_availability',
      announcement: 'notify_on_move', // announcements go to move subscribers
    }

    const prefColumn = prefMap[update.update_type] || 'notify_on_move'

    // Fetch all followers who want this notification type
    const { data: followers } = await supabase
      .from('injector_follows')
      .select('user_id')
      .eq('injector_id', update.injector_id)
      .eq(prefColumn, true)

    if (!followers || followers.length === 0) {
      return new Response(
        JSON.stringify({ notified: 0 }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    // Batch insert notifications
    const notifications = followers.map((f) => ({
      user_id: f.user_id,
      injector_update_id: update.id,
      is_read: false,
    }))

    const { error: insertErr } = await supabase
      .from('user_notifications')
      .insert(notifications)

    if (insertErr) {
      console.error('Notification insert error:', insertErr)
      return new Response(
        JSON.stringify({ error: 'Failed to create notifications' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ notified: notifications.length }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('fan-out error:', err)
    return new Response(
      JSON.stringify({ error: 'An internal error occurred' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})

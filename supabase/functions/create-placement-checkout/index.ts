// Supabase Edge Function: Create Stripe Checkout Session for Placement
// Deploy: supabase functions deploy create-placement-checkout
// Secrets needed: STRIPE_SECRET_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: 'Stripe not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { specialId, placementId, tier, weeks, totalPrice, successUrl, cancelUrl } = await req.json()

    // Verify the placement exists
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: placement } = await supabase
      .from('special_placements')
      .select('*, provider_specials(*)')
      .eq('id', placementId)
      .single()

    if (!placement) {
      return new Response(
        JSON.stringify({ error: 'Placement not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Stripe Checkout Session
    const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'payment',
        'payment_method_types[0]': 'card',
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][unit_amount]': String(Math.round(totalPrice * 100)),
        'line_items[0][price_data][product_data][name]': `${tier === 'featured' ? 'Featured' : 'Standard'} Placement — ${weeks} week${weeks > 1 ? 's' : ''}`,
        'line_items[0][price_data][product_data][description]': placement.provider_specials?.headline || 'GlowBuddy Promoted Special',
        'line_items[0][quantity]': '1',
        'success_url': successUrl,
        'cancel_url': cancelUrl,
        'metadata[placement_id]': placementId,
        'metadata[special_id]': specialId,
      }),
    })

    const session = await stripeResponse.json()

    if (session.error) {
      return new Response(
        JSON.stringify({ error: session.error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Store the Stripe session ID on the placement
    await supabase
      .from('special_placements')
      .update({ stripe_payment_intent: session.id })
      .eq('id', placementId)

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

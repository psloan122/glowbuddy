// Supabase Edge Function: Create Stripe Checkout Session for Tier Subscription
// Deploy: supabase functions deploy create-subscription-checkout
// Secrets needed: STRIPE_SECRET_KEY, STRIPE_PRICE_VERIFIED, STRIPE_PRICE_CERTIFIED, STRIPE_PRICE_ENTERPRISE

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonRes(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// Map tier names to Stripe Price IDs (recurring prices created in Stripe Dashboard).
// NEVER trust the client's price — look it up server-side from secrets.
const TIER_PRICE_IDS: Record<string, string | undefined> = {
  verified:   Deno.env.get('STRIPE_PRICE_VERIFIED'),
  certified:  Deno.env.get('STRIPE_PRICE_CERTIFIED'),
  enterprise: Deno.env.get('STRIPE_PRICE_ENTERPRISE'),
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      return jsonRes({ error: 'Stripe not configured' }, 500)
    }

    // --- Authentication ---
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonRes({ error: 'Unauthorized' }, 401)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', ''),
    )
    if (authError || !user) {
      return jsonRes({ error: 'Unauthorized' }, 401)
    }

    // --- Parse + validate ---
    const { tier, providerId, successUrl, cancelUrl } = await req.json()

    const tierKey = (tier || '').toLowerCase()
    const priceId = TIER_PRICE_IDS[tierKey]

    if (!priceId) {
      return jsonRes({ error: `Invalid tier "${tier}" or price not configured` }, 400)
    }

    if (!providerId) {
      return jsonRes({ error: 'providerId is required' }, 400)
    }

    // --- Verify the user actually owns this provider ---
    const { data: provider, error: provErr } = await supabase
      .from('providers')
      .select('id, name, tier, owner_user_id, stripe_customer_id')
      .eq('id', providerId)
      .single()

    if (provErr || !provider) {
      return jsonRes({ error: 'Provider not found' }, 404)
    }
    if (provider.owner_user_id !== user.id) {
      return jsonRes({ error: 'You do not own this provider listing' }, 403)
    }

    // --- Get or create Stripe customer ---
    let customerId = provider.stripe_customer_id

    if (!customerId) {
      const customerRes = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: user.email || '',
          'metadata[provider_id]': providerId,
          'metadata[user_id]': user.id,
          name: provider.name || '',
        }),
      })
      const customer = await customerRes.json()
      if (customer.error) {
        console.error('[create-subscription-checkout] Stripe customer creation failed:', customer.error)
        return jsonRes({ error: 'Failed to create billing account' }, 500)
      }
      customerId = customer.id

      // Persist the Stripe customer ID for future checkouts
      await supabase
        .from('providers')
        .update({ stripe_customer_id: customerId })
        .eq('id', providerId)
    }

    // --- Create Stripe Checkout Session (subscription mode) ---
    const params = new URLSearchParams({
      mode: 'subscription',
      customer: customerId,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      success_url: successUrl || `${req.headers.get('origin') || 'https://knowbeforeyouglow.com'}/business/dashboard?checkout=success`,
      cancel_url: cancelUrl || `${req.headers.get('origin') || 'https://knowbeforeyouglow.com'}/business/dashboard?checkout=cancelled`,
      'metadata[provider_id]': providerId,
      'metadata[user_id]': user.id,
      'metadata[tier]': tierKey,
      'subscription_data[metadata][provider_id]': providerId,
      'subscription_data[metadata][tier]': tierKey,
    })

    const checkoutRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    })

    const session = await checkoutRes.json()

    if (session.error) {
      console.error('[create-subscription-checkout] Stripe error:', session.error)
      return jsonRes({ error: 'Payment session could not be created. Please try again.' }, 400)
    }

    return jsonRes({ url: session.url })
  } catch (err) {
    console.error('[create-subscription-checkout] unexpected error:', err)
    return jsonRes({ error: 'An error occurred. Please try again.' }, 500)
  }
})

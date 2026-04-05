// Supabase Edge Function: Stripe Webhook Handler
// Deploy: supabase functions deploy stripe-webhook
// Secrets needed: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Stripe signature verification using Web Crypto API (no Stripe SDK needed in Deno)
async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  const parts = sigHeader.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=')
    if (key === 't') acc.timestamp = value
    if (key === 'v1') acc.signatures.push(value)
    return acc
  }, { timestamp: '', signatures: [] as string[] })

  if (!parts.timestamp || parts.signatures.length === 0) return false

  // Reject timestamps older than 5 minutes
  const tolerance = 300 // 5 minutes
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - parseInt(parts.timestamp)) > tolerance) return false

  // Compute expected signature
  const signedPayload = `${parts.timestamp}.${payload}`
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signedPayload)
  )

  // Convert to hex
  const expectedSig = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  // Constant-time comparison
  return parts.signatures.some(sig => {
    if (sig.length !== expectedSig.length) return false
    let result = 0
    for (let i = 0; i < sig.length; i++) {
      result |= sig.charCodeAt(i) ^ expectedSig.charCodeAt(i)
    }
    return result === 0
  })
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (!stripeSecret || !webhookSecret) {
    return new Response('Stripe not configured', { status: 500 })
  }

  try {
    const body = await req.text()
    const sig = req.headers.get('stripe-signature')

    if (!sig) {
      return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), { status: 400 })
    }

    // Verify webhook signature
    const isValid = await verifyStripeSignature(body, sig, webhookSecret)
    if (!isValid) {
      console.error('Stripe webhook signature verification failed')
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 })
    }

    const event = JSON.parse(body)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const placementId = session.metadata?.placement_id
      const specialId = session.metadata?.special_id

      if (placementId) {
        // Get the placement to calculate expires_at
        const { data: placement } = await supabase
          .from('special_placements')
          .select('weeks')
          .eq('id', placementId)
          .single()

        const now = new Date()
        const weeks = placement?.weeks || 1
        const expiresAt = new Date(now.getTime() + weeks * 7 * 24 * 60 * 60 * 1000)

        // Activate the placement
        await supabase
          .from('special_placements')
          .update({
            status: 'active',
            activated_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
            stripe_payment_intent: session.payment_intent,
          })
          .eq('id', placementId)

        // Update the special's dates
        if (specialId) {
          await supabase
            .from('provider_specials')
            .update({
              starts_at: now.toISOString(),
              ends_at: expiresAt.toISOString(),
              is_active: true,
            })
            .eq('id', specialId)
        }

        // Send receipt email to the provider (fire-and-forget)
        try {
          // Get provider info from placement
          const { data: placementInfo } = await supabase
            .from('special_placements')
            .select('provider_id, tier, weeks, amount_paid')
            .eq('id', placementId)
            .single()

          if (placementInfo) {
            const { data: provider } = await supabase
              .from('providers')
              .select('name, owner_user_id')
              .eq('id', placementInfo.provider_id)
              .single()

            if (provider?.owner_user_id) {
              const { data: { user: ownerUser } } = await supabase.auth.admin.getUserById(provider.owner_user_id)

              // Get special details
              let treatmentName = 'Special Offer'
              let promoPrice = ''
              let priceUnit = ''
              if (specialId) {
                const { data: special } = await supabase
                  .from('provider_specials')
                  .select('headline, treatment_name, promo_price, price_unit')
                  .eq('id', specialId)
                  .single()
                if (special) {
                  treatmentName = special.treatment_name || special.headline || treatmentName
                  promoPrice = special.promo_price ? `$${special.promo_price}` : ''
                  priceUnit = special.price_unit || 'per unit'
                }
              }

              if (ownerUser?.email) {
                const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
                const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
                await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                  },
                  body: JSON.stringify({
                    template: 'special_offer_receipt',
                    to: ownerUser.email,
                    data: {
                      providerName: provider.name,
                      treatmentName,
                      promoPrice,
                      priceUnit,
                      tier: placementInfo.tier || 'standard',
                      weeks,
                      totalPaid: `$${(placementInfo.amount_paid / 100).toFixed(2)}`,
                      expiryDate: expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                    },
                  }),
                })
              }
            }
          }
        } catch (emailErr) {
          console.error('Receipt email failed (non-blocking):', emailErr)
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Webhook error:', err)
    return new Response(JSON.stringify({ error: 'Webhook processing failed' }), { status: 400 })
  }
})

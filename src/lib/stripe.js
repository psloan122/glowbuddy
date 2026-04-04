/**
 * Stripe client scaffold for GlowBuddy.
 * Wire up VITE_STRIPE_PUBLISHABLE_KEY in .env when ready.
 */

let stripePromise = null;

export function getStripe() {
  if (!stripePromise) {
    const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (key) {
      // Dynamically import stripe-js only when needed
      stripePromise = import('@stripe/stripe-js').then((m) => m.loadStripe(key));
    }
  }
  return stripePromise;
}

/**
 * Create a placement checkout session via Supabase edge function.
 * Returns { url } for redirect, or { error }.
 */
export async function createPlacementCheckout({ specialId, placementId, tier, weeks, totalPrice }) {
  const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

  // If Stripe isn't configured yet, simulate success for development
  if (!stripeKey) {
    console.warn('[Stripe] No publishable key configured. Simulating checkout success.');
    return {
      simulated: true,
      message: 'Stripe not configured — placement activated directly for development.',
    };
  }

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-placement-checkout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await import('./supabase')).supabase.auth.session()?.access_token}`,
        },
        body: JSON.stringify({
          specialId,
          placementId,
          tier,
          weeks,
          totalPrice,
          successUrl: `${window.location.origin}/business/dashboard?tab=Specials&checkout=success`,
          cancelUrl: `${window.location.origin}/business/dashboard?tab=Specials&checkout=cancelled`,
        }),
      }
    );

    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
      return { url: data.url };
    }
    return { error: data.error || 'Failed to create checkout session' };
  } catch (err) {
    return { error: err.message };
  }
}

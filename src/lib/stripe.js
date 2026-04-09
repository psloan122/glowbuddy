/**
 * Stripe client scaffold for Know Before You Glow.
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
export async function createPlacementCheckout({ specialId, placementId, tier, weeks }) {
  const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

  // If Stripe isn't configured yet, simulate success for development
  if (!stripeKey) {
    return {
      simulated: true,
      message: 'Stripe not configured — placement activated directly for development.',
    };
  }

  try {
    const { supabase } = await import('./supabase');
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return { error: 'You must be signed in to checkout' };
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-placement-checkout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          specialId,
          placementId,
          tier,
          weeks,
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
  } catch {
    return { error: 'Something went wrong. Please try again.' };
  }
}

/**
 * Create a subscription checkout session for tier upgrades.
 * Returns { url } for redirect, or { error }, or { simulated } in dev.
 */
export async function createSubscriptionCheckout({ tier, providerId }) {
  const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

  if (!stripeKey) {
    return {
      simulated: true,
      message: `Stripe not configured — would upgrade to "${tier}" tier.`,
    };
  }

  try {
    const { supabase } = await import('./supabase');
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return { error: 'You must be signed in to checkout' };
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-subscription-checkout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          tier,
          providerId,
          successUrl: `${window.location.origin}/business/dashboard?checkout=success`,
          cancelUrl: `${window.location.origin}/business/dashboard?checkout=cancelled`,
        }),
      }
    );

    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
      return { url: data.url };
    }
    return { error: data.error || 'Failed to create checkout session' };
  } catch {
    return { error: 'Something went wrong. Please try again.' };
  }
}

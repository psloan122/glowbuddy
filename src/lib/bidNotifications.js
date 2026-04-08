// bidNotifications.js — thin service layer for the Bid Request feature.
//
// Everything in here writes to the existing `user_notifications` table
// (which was extended in migration 057 with generic type/title/body/data
// + bid_request_id + provider_bid_id columns). The notification bell
// and feed don't yet render custom copy for bid events, so the key job
// of these helpers is to make the unread counter light up and record
// the event so the activity feed on /my-requests can surface it.
//
// We intentionally keep the fan-out client-side for MVP — a production
// setup would push this onto an Edge Function with service-role access.
// Client writes work because the notifications table RLS already
// allows authenticated users to insert their own rows, and the bid
// flow only inserts notifications for the same user_id as the patient
// or for providers whose listing the current user touches. If RLS
// rejects a write we swallow the error rather than blocking the UX.

import { supabase } from './supabase';
import { haversineMiles } from './distance';

const NOTIF_TABLE = 'user_notifications';

function swallow(error) {
  if (error) {
    // Notifications are best-effort. Log so we see it in dev but never
    // throw — missing notifications should not block a bid submission.
    console.warn('[bidNotifications]', error.message || error);
  }
}

// ── Fan-out when a new bid_request is created ────────────────────────
// Finds active providers within the request's radius_miles using a
// bounding-box query on providers.lat/lng, filters to haversine
// distance client-side, then inserts one notification per provider
// owner. Unclaimed listings (no owner_user_id) are skipped.
export async function notifyProvidersOfNewRequest(request) {
  if (!request?.id || !request?.lat || !request?.lng) return;

  const radius = Number(request.radius_miles) || 25;
  // ~1 degree latitude ≈ 69 miles; longitude scales with cos(lat).
  // We over-select with a bounding box, then filter precisely.
  const latDelta = radius / 69;
  const lngDelta = radius / (69 * Math.cos((request.lat * Math.PI) / 180));

  const { data: providers, error } = await supabase
    .from('providers')
    .select('id, owner_user_id, lat, lng, name, trust_tier, is_active')
    .not('owner_user_id', 'is', null)
    .eq('is_active', true)
    .gte('lat', request.lat - latDelta)
    .lte('lat', request.lat + latDelta)
    .gte('lng', request.lng - lngDelta)
    .lte('lng', request.lng + lngDelta);

  if (error || !providers) {
    swallow(error);
    return;
  }

  const inRadius = providers.filter((p) => {
    if (p.lat == null || p.lng == null) return false;
    const miles = haversineMiles(request.lat, request.lng, p.lat, p.lng);
    return miles != null && miles <= radius;
  });

  if (inRadius.length === 0) return;

  const procLabel = (request.procedure_slug || 'treatment').replace(/-/g, ' ');
  const budget =
    request.budget_min && request.budget_max
      ? `$${request.budget_min}\u2013$${request.budget_max}`
      : 'open';

  const rows = inRadius.map((p) => ({
    user_id: p.owner_user_id,
    type: 'new_bid_request',
    title: 'New patient bid request near you',
    body: `A patient is looking for ${procLabel} within ${radius} miles. Budget: ${budget}.`,
    data: { request_id: request.id, provider_id: p.id },
    bid_request_id: request.id,
  }));

  const { error: insertError } = await supabase.from(NOTIF_TABLE).insert(rows);
  swallow(insertError);
}

// ── Notify patient that a new bid was submitted ──────────────────────
export async function notifyPatientOfNewBid(bid, request) {
  if (!request?.user_id || !bid?.id) return;
  const procLabel = (request.procedure_slug || 'treatment').replace(/-/g, ' ');

  const { error } = await supabase.from(NOTIF_TABLE).insert({
    user_id: request.user_id,
    type: 'new_bid',
    title: `You have a new bid on your ${procLabel} request!`,
    body: 'Tap to see the offer and compare it to other bids.',
    data: { request_id: request.id, bid_id: bid.id },
    bid_request_id: request.id,
    provider_bid_id: bid.id,
  });
  swallow(error);
}

// ── Notify the winning provider + all losers on acceptance ───────────
// Only the accepted bid's provider gets the "you won" copy. Every other
// pending bid's provider gets a "request filled" heads-up so their
// dashboard doesn't keep showing a stale "bid in review" card.
export async function notifyProvidersOfAcceptance({
  acceptedBid,
  otherBidProviderUserIds,
  request,
}) {
  const procLabel = (request?.procedure_slug || 'treatment').replace(/-/g, ' ');
  const rows = [];

  if (acceptedBid?.provider_owner_user_id) {
    rows.push({
      user_id: acceptedBid.provider_owner_user_id,
      type: 'bid_accepted',
      title: 'Your bid was accepted!',
      body: `The patient accepted your offer on ${procLabel}. $35 lead fee charged.`,
      data: {
        request_id: request?.id,
        bid_id: acceptedBid.id,
        lead_fee: 35,
      },
      bid_request_id: request?.id,
      provider_bid_id: acceptedBid.id,
    });
  }

  for (const uid of otherBidProviderUserIds || []) {
    if (!uid) continue;
    rows.push({
      user_id: uid,
      type: 'bid_lost',
      title: 'This request has been filled',
      body: 'Better luck next time! Watch for more bid requests in your area.',
      data: { request_id: request?.id },
      bid_request_id: request?.id,
    });
  }

  if (rows.length === 0) return;
  const { error } = await supabase.from(NOTIF_TABLE).insert(rows);
  swallow(error);
}

// ── Lead fee ledger ──────────────────────────────────────────────────
// MVP: record the $35 charge we need to collect. An admin runs Stripe
// manually, then flips pending_charges.status to 'charged' + drops the
// payment intent into the notes column. Phase 2 will replace this with
// automated Stripe PaymentIntent creation.
export async function recordPendingLeadFee({ bid, request }) {
  if (!bid?.id || !bid?.provider_id || !request?.id) return null;
  const { data, error } = await supabase
    .from('pending_charges')
    .insert({
      provider_id: bid.provider_id,
      bid_id: bid.id,
      request_id: request.id,
      amount: 35.0,
      status: 'pending',
    })
    .select()
    .single();
  if (error) {
    swallow(error);
    return null;
  }
  return data;
}

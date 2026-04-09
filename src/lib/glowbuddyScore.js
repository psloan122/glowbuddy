// glowbuddyScore.js — composite 0–100 score used to rank provider bids
// on the patient's bid review page. Computed once at bid-submit time
// and stored on `provider_bids.glowbuddy_score` so the patient view
// doesn't have to re-run the formula on every render.
//
// Point allocation:
//   Price competitiveness ......... 40 pts (closeness to budget midpoint)
//   Provider rating ............... 30 pts (google_rating out of 5)
//   Injector credentials .......... 20 pts (RN/NP/PA/MD/DO)
//   Message quality + extras ...... 10 pts (non-empty, personalized, add-ons)
//
// Each sub-score is defensive: missing inputs degrade gracefully rather
// than hard-failing, and the total is clamped to [0, 100].

const CREDENTIAL_POINTS = {
  RN: 12,
  NP: 14,
  PA: 14,
  MD: 20,
  DO: 20,
};

function toNumber(n) {
  const parsed = Number(n);
  return Number.isFinite(parsed) ? parsed : null;
}

export function calculateKnow Before You GlowScore(bid, request, provider) {
  let score = 0;

  // ── Price competitiveness (40 pts) ───────────────────────────────
  // Closeness of bid.total_price to the midpoint of the patient's
  // budget range. Exactly at the midpoint → 40 pts. Drops linearly to
  // zero as the distance reaches the full midpoint value (so a bid
  // 2x the midpoint scores zero on this dimension).
  const min = toNumber(request?.budget_min);
  const max = toNumber(request?.budget_max);
  const total = toNumber(bid?.total_price);
  if (min != null && max != null && total != null) {
    const budgetMid = (min + max) / 2;
    if (budgetMid > 0) {
      const priceDiff = Math.abs(total - budgetMid);
      const priceScore = Math.max(0, 40 - (priceDiff / budgetMid) * 40);
      score += priceScore;
    }
  }

  // ── Provider rating (30 pts) ─────────────────────────────────────
  const rating = toNumber(provider?.google_rating);
  const ratingScore = ((rating != null ? rating : 3) / 5) * 30;
  score += ratingScore;

  // ── Injector credentials (20 pts) ────────────────────────────────
  const creds = (bid?.injector_credentials || '').toUpperCase().trim();
  // Providers often enter "NP, 10 years" — pull the first credential
  // token so we still award points when the field has extra copy.
  const credKey = creds.split(/[\s,/]+/).find((tok) => CREDENTIAL_POINTS[tok]);
  score += CREDENTIAL_POINTS[credKey] || 10;

  // ── Message quality + add-ons (10 pts) ───────────────────────────
  const message = (bid?.message_to_patient || '').trim();
  if (message.length > 50) score += 5;
  if ((bid?.add_ons || '').trim().length > 0) score += 3;

  // Bonus: did the message reference any distinctive words from the
  // patient's freeform notes? Caps at 2 pts so it can't dominate.
  if (request?.patient_notes && message) {
    const noteWords = String(request.patient_notes).toLowerCase().split(/\s+/);
    const msgLower = message.toLowerCase();
    const matches = noteWords.filter(
      (w) => w.length > 4 && msgLower.includes(w),
    ).length;
    score += Math.min(2, matches);
  }

  return Math.min(100, Math.round(score));
}

// Label + color band used by the score circle on the patient's bid
// review page. Green >= 80, amber 60–79, red < 60.
export function scoreBand(score) {
  const n = Number(score);
  if (!Number.isFinite(n)) return { label: 'N/A', color: '#B8A89A' };
  if (n >= 80) return { label: 'Excellent', color: '#1D9E75' };
  if (n >= 60) return { label: 'Good', color: '#D98F2B' };
  return { label: 'Fair', color: '#C8001A' };
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Reusable waitlist form for the bid request feature. Used by both the
// patient (/request-bid) and provider (/business/bid-requests) waitlist
// pages. Persists rows to public.waitlist_signups via the RLS-allowed
// public insert policy. The unique constraint on email is what makes
// re-signups idempotent.
//
// Three render modes, driven by props:
//
//   1. Anonymous: classic email input form. Shows a "Log in to join
//      faster" link below when `loginRedirect` is provided.
//
//   2. Logged in + eligible: one-click "Joining as [avatar] email"
//      panel. On submit we insert with the user's email + id.
//
//   3. Logged in + blocked (e.g. provider with no claimed listing):
//      fall back to anonymous form plus a contextual notice with a
//      CTA to resolve the gating condition.
//
// On mount, if we have a user email, we query waitlist_signups to see
// if the user is already on the list and skip straight to the success
// state so re-visits feel immediate.

function initialFromLabel(label) {
  if (!label) return '?';
  const trimmed = label.trim();
  if (!trimmed) return '?';
  return trimmed[0].toUpperCase();
}

export default function WaitlistForm({
  type, // 'patient' | 'provider'
  user = null,
  // When the user is logged in AND eligible for one-click, show this as
  // the primary label on the "Joining as" panel. Defaults to user.email.
  loggedInPrimaryLabel = null,
  // Optional secondary line on the "Joining as" panel, e.g. the user's
  // email when the primary label is a practice name.
  loggedInSecondaryLabel = null,
  // When logged in but ineligible (e.g. provider with no claimed
  // listing) this message + CTA renders above the email form.
  blockedMessage = null,
  blockedCtaLabel = null,
  blockedCtaTo = null,
  // Path to send anonymous users to when they click the "Log in to
  // join faster" link under the email form.
  loginRedirect = null,
  placeholder = 'your@email.com',
  buttonLabel = 'JOIN THE WAITLIST',
  helperText = 'Be the first to know when it launches.',
  successHeadline = "You're on the list.",
  successBody = "We'll email you the moment bid requests go live. In the meantime, browse prices in your city.",
  successCtaLabel = 'BROWSE PRICES',
  successCtaTo = '/browse',
}) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyOnList, setAlreadyOnList] = useState(false);
  const [error, setError] = useState('');
  const [checkingExisting, setCheckingExisting] = useState(!!user?.email);

  // The user is eligible for one-click if they're logged in and the
  // parent page hasn't flagged them as blocked (via blockedMessage).
  const userEmail = user?.email || null;
  const oneClickEligible = !!userEmail && !blockedMessage;

  // On mount (or when the user changes), if we have an email, check
  // whether they're already on the waitlist so we can short-circuit
  // into the success state.
  useEffect(() => {
    let cancelled = false;
    async function checkExisting() {
      if (!userEmail) {
        setCheckingExisting(false);
        return;
      }
      setCheckingExisting(true);
      const { data } = await supabase
        .from('waitlist_signups')
        .select('id')
        .eq('email', userEmail.toLowerCase())
        .maybeSingle();
      if (cancelled) return;
      if (data?.id) {
        setSubmitted(true);
        setAlreadyOnList(true);
      }
      setCheckingExisting(false);
    }
    checkExisting();
    return () => {
      cancelled = true;
    };
  }, [userEmail]);

  async function submitWithEmail(rawEmail) {
    const cleaned = rawEmail.trim().toLowerCase();
    if (!cleaned || !cleaned.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setSubmitting(true);

    // We can't easily distinguish "newly inserted" vs "already existed"
    // with .insert() + ON CONFLICT DO NOTHING because PostgREST returns
    // an empty result on conflict. Strategy: do an upsert ignoring the
    // duplicate, then immediately read back to confirm the row exists.
    // If the read returns a row whose created_at is older than ~10s,
    // we know they were already on the list.
    const payload = { email: cleaned, type };
    if (user?.id) payload.user_id = user.id;

    const { error: insertError } = await supabase
      .from('waitlist_signups')
      .upsert(payload, { onConflict: 'email', ignoreDuplicates: true });

    if (insertError) {
      setError('Something went wrong. Please try again.');
      setSubmitting(false);
      return;
    }

    const { data: row } = await supabase
      .from('waitlist_signups')
      .select('email, created_at')
      .eq('email', cleaned)
      .maybeSingle();

    if (row) {
      const ageMs = Date.now() - new Date(row.created_at).getTime();
      setAlreadyOnList(ageMs > 10_000);
    }

    setSubmitted(true);
    setSubmitting(false);
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    await submitWithEmail(email);
  }

  async function handleOneClick() {
    if (!userEmail) return;
    await submitWithEmail(userEmail);
  }

  // ─── Success state ────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="text-center">
        <div
          className="mx-auto mb-6 flex items-center justify-center"
          style={{
            width: '64px',
            height: '64px',
            background: '#E8347A',
            borderRadius: '50%',
          }}
        >
          <Check size={32} color="#fff" strokeWidth={3} />
        </div>
        <h2
          className="mb-3"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: '28px',
            color: '#111',
            lineHeight: 1.1,
          }}
        >
          {alreadyOnList ? "You're already on the list!" : successHeadline}
        </h2>
        <p
          className="mx-auto mb-6"
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 300,
            fontSize: '14px',
            color: '#888',
            maxWidth: '420px',
            lineHeight: 1.6,
          }}
        >
          {successBody}
        </p>
        <Link
          to={successCtaTo}
          className="inline-flex items-center gap-2 px-6 py-3"
          style={{
            background: '#E8347A',
            color: '#fff',
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: '11px',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            borderRadius: '2px',
          }}
        >
          {successCtaLabel}
          <ArrowRight size={13} />
        </Link>
      </div>
    );
  }

  // ─── Loading — we're still checking whether this user is already
  // on the list. Render a placeholder the same height as the form so
  // the page doesn't jump. ──────────────────────────────────────────
  if (checkingExisting) {
    return (
      <div
        style={{
          minHeight: '116px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '12px',
            color: '#B8A89A',
          }}
        >
          Loading…
        </p>
      </div>
    );
  }

  // ─── Logged-in one-click panel ────────────────────────────────────
  if (oneClickEligible) {
    const primary = loggedInPrimaryLabel || userEmail;
    const secondary = loggedInSecondaryLabel;
    const initial = initialFromLabel(primary);

    return (
      <div className="w-full">
        <div
          className="flex items-center gap-3 px-4 py-3 mb-3"
          style={{
            background: '#fff',
            border: '1px solid #EEE',
            borderRadius: '2px',
          }}
        >
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: '24px',
              height: '24px',
              background: '#E8347A',
              borderRadius: '50%',
              color: '#fff',
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
              fontSize: '11px',
            }}
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p
              className="truncate"
              style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 500,
                fontSize: '13px',
                color: '#111',
                lineHeight: 1.3,
              }}
            >
              <span style={{ color: '#888', fontWeight: 400 }}>Joining as </span>
              {primary}
            </p>
            {secondary ? (
              <p
                className="truncate"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontWeight: 300,
                  fontSize: '11px',
                  color: '#888',
                  lineHeight: 1.3,
                  marginTop: '2px',
                }}
              >
                {secondary}
              </p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={handleOneClick}
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3"
          style={{
            background: submitting ? '#C8C2BC' : '#E8347A',
            color: '#fff',
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: '11px',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            borderRadius: '2px',
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? 'Joining…' : buttonLabel}
          {!submitting && <ArrowRight size={13} />}
        </button>
        {error ? (
          <p
            className="mt-3 text-center"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '12px',
              color: '#C8001A',
            }}
          >
            {error}
          </p>
        ) : (
          <p
            className="mt-3 text-center"
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 300,
              fontSize: '12px',
              color: '#B8A89A',
            }}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }

  // ─── Anonymous / blocked email form ───────────────────────────────
  return (
    <div className="w-full">
      {blockedMessage ? (
        <div
          className="mb-4 px-4 py-3"
          style={{
            background: '#FFF8F0',
            border: '1px solid #F5E1C8',
            borderRadius: '2px',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 500,
              fontSize: '13px',
              color: '#7A4F16',
              lineHeight: 1.5,
            }}
          >
            {blockedMessage}
          </p>
          {blockedCtaTo && blockedCtaLabel ? (
            <Link
              to={blockedCtaTo}
              className="inline-flex items-center gap-1 mt-2"
              style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 600,
                fontSize: '12px',
                color: '#E8347A',
                letterSpacing: '0.02em',
              }}
            >
              {blockedCtaLabel}
              <ArrowRight size={12} />
            </Link>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={handleFormSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={placeholder}
          autoComplete="email"
          className="w-full px-4 py-3 mb-3"
          style={{
            background: '#fff',
            border: '1px solid #DDD',
            borderRadius: '2px',
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            color: '#111',
            outline: 'none',
            transition: 'border-color 0.15s ease',
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = '#E8347A')}
          onBlur={(e) => (e.currentTarget.style.borderColor = '#DDD')}
          required
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full px-4 py-3"
          style={{
            background: submitting ? '#C8C2BC' : '#E8347A',
            color: '#fff',
            fontFamily: 'var(--font-body)',
            fontWeight: 700,
            fontSize: '11px',
            letterSpacing: '0.10em',
            textTransform: 'uppercase',
            borderRadius: '2px',
            cursor: submitting ? 'not-allowed' : 'pointer',
          }}
        >
          {submitting ? 'Joining…' : buttonLabel}
        </button>
        {error ? (
          <p
            className="mt-3 text-center"
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '12px',
              color: '#C8001A',
            }}
          >
            {error}
          </p>
        ) : (
          <p
            className="mt-3 text-center"
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 300,
              fontSize: '12px',
              color: '#B8A89A',
            }}
          >
            {helperText}
          </p>
        )}
      </form>

      {/* Log-in shortcut — only shown when the parent page passes a
          loginRedirect AND the user isn't already logged in. We don't
          render it when the user is logged in but blocked, because in
          that case the blockedMessage + CTA already gives them the
          next step. */}
      {loginRedirect && !user ? (
        <p
          className="mt-4 text-center"
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 300,
            fontSize: '12px',
            color: '#888',
          }}
        >
          Have an account?{' '}
          <Link
            to={loginRedirect}
            style={{
              color: '#E8347A',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Log in to join faster
          </Link>
          <span style={{ color: '#E8347A', fontWeight: 600 }}> →</span>
        </p>
      ) : null}
    </div>
  );
}

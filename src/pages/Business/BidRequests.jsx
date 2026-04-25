import { useContext, useEffect, useState } from 'react';
import WaitlistForm from '../../components/WaitlistForm';
import { AuthContext } from '../../App';
import { supabase } from '../../lib/supabase';

// Bid Request — provider waitlist landing page.
//
// Mirrors /request-bid for the patient side. The provider-facing list,
// SubmitBid form, and MyBids inbox are all built (migration 057) but
// gated behind this waitlist signup. Reactivating the live experience
// is a one-file revert away if we choose to ship it.
//
// Logged-in behavior:
//   • User logged in + has a claimed provider listing
//     → one-click "Joining as <practice name> · <city, state>" panel
//   • User logged in but no claimed listing
//     → email form + amber notice: "Claim your listing first to get
//       early access" linking to /business/onboarding
//   • Anonymous
//     → email form + "Log in to join faster" link

const BENEFITS = [
  'Only pay $35 when a patient accepts your bid',
  'See patient budget, experience level, and notes before you submit an offer',
  'Fill cancellations and open slots instantly',
  'Know Before You Glow Score ranks your bid on quality, not just price',
];

export default function BidRequests() {
  const { user } = useContext(AuthContext);
  const [provider, setProvider] = useState(null);
  const [providerChecked, setProviderChecked] = useState(false);

  useEffect(() => {
    document.title = 'Bid Requests for providers — coming soon | Know Before You Glow';
  }, []);

  // Look up the user's claimed provider listing (if any). We gate
  // one-click access on this so we don't accidentally enroll a
  // patient user as a provider just because they're logged in.
  useEffect(() => {
    let cancelled = false;
    async function loadProvider() {
      if (!user?.id) {
        if (!cancelled) setProviderChecked(true);
        return;
      }
      const { data } = await supabase
        .from('providers')
        .select('name, city, state')
        .eq('owner_user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      setProvider(data || null);
      setProviderChecked(true);
    }
    loadProvider();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Until we know whether the logged-in user has a claimed listing,
  // skip rendering the form region so we don't flash the anonymous
  // email input to users who'll immediately see the one-click panel.
  const formReady = !user || providerChecked;

  const hasClaimedListing = !!(user && provider);
  const primaryLabel = hasClaimedListing ? provider.name : null;
  const secondaryLabel = hasClaimedListing
    ? [
        [provider.city, provider.state].filter(Boolean).join(', '),
        user?.email,
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

  // Logged in but no claimed listing → blocked, show email form with
  // a nudge toward the onboarding flow.
  const blockedMessage =
    user && !provider && providerChecked
      ? 'Claim your listing first to get early access.'
      : null;

  return (
    <div className="min-h-screen" style={{ background: '#FBF9F7' }}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
        {/* Kicker */}
        <p
          className="mb-4"
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#E8347A',
          }}
        >
          COMING SOON · FOR PROVIDERS
        </p>

        {/* H1 */}
        <h1
          className="mb-5"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: 'clamp(28px, 5vw, 36px)',
            color: '#111',
            lineHeight: 1.05,
            letterSpacing: '-0.01em',
          }}
        >
          New patients will bid for your availability.
        </h1>

        {/* Subhead */}
        <p
          className="mb-12"
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 300,
            fontSize: '15px',
            color: '#888',
            lineHeight: 1.6,
            maxWidth: '540px',
          }}
        >
          Patients post what they want. You compete with a targeted offer.
          Only pay when they say yes.
        </p>

        {/* Benefit bullets — editorial em-dash list, no icons */}
        <ul className="mb-14 flex flex-col gap-4">
          {BENEFITS.map((benefit) => (
            <li
              key={benefit}
              className="grid grid-cols-[auto_1fr] gap-3 items-start"
            >
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 900,
                  fontSize: '16px',
                  color: '#E8B4C8',
                  lineHeight: 1.5,
                }}
              >
                —
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontWeight: 300,
                  fontSize: '14px',
                  color: '#444',
                  lineHeight: 1.6,
                }}
              >
                {benefit}
              </span>
            </li>
          ))}
        </ul>

        {/* Waitlist form */}
        <div className="max-w-md">
          {formReady ? (
            <WaitlistForm
              type="provider"
              user={user}
              loggedInPrimaryLabel={primaryLabel}
              loggedInSecondaryLabel={secondaryLabel}
              blockedMessage={blockedMessage}
              blockedCtaLabel={blockedMessage ? 'Claim your listing' : null}
              blockedCtaTo={blockedMessage ? '/business/claim' : null}
              loginRedirect="/login?redirect=/business/bid-requests"
              placeholder="your@practice.com"
              buttonLabel="NOTIFY ME WHEN THIS LAUNCHES"
              helperText="Be the first to know when it launches."
              successHeadline="You're on the list."
              successBody="We'll email you the moment bid requests go live. In the meantime, manage your provider listing."
              successCtaLabel="GO TO DASHBOARD"
              successCtaTo="/business/dashboard"
            />
          ) : (
            <div
              style={{
                minHeight: '116px',
                display: 'flex',
                alignItems: 'center',
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
          )}
        </div>
      </div>
    </div>
  );
}

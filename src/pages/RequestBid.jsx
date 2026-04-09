import { useContext, useEffect } from 'react';
import WaitlistForm from '../components/WaitlistForm';
import { AuthContext } from '../App';

// Bid Request — patient waitlist landing page.
//
// The full 4-step request flow is built (and the route still exists in
// case we need to gate-toggle it back on later) but we're not letting
// patients through yet. This page collects email signups so we can
// notify them at launch. See migration 058_waitlist_signups.sql.

const STEPS = [
  {
    number: '01',
    title: 'You post your request',
    body: 'Treatment, budget, availability, location. Providers within your radius get notified.',
  },
  {
    number: '02',
    title: 'Providers compete',
    body: 'They submit bids with their price, credentials, and a personal message. You stay anonymous.',
  },
  {
    number: '03',
    title: 'You pick the winner',
    body: 'Choose the best offer. Provider pays Know Before You Glow a small fee. You pay nothing extra.',
  },
];

export default function RequestBid() {
  const { user } = useContext(AuthContext);

  useEffect(() => {
    document.title = 'Bid Requests — coming soon | Know Before You Glow';
  }, []);

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
          COMING SOON
        </p>

        {/* H1 */}
        <h1
          className="mb-5"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: 'clamp(32px, 6vw, 42px)',
            color: '#111',
            lineHeight: 1.05,
            letterSpacing: '-0.01em',
          }}
        >
          Let providers compete for your appointment.
        </h1>

        {/* Subhead */}
        <p
          className="mb-12"
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 400,
            fontStyle: 'italic',
            fontSize: '20px',
            color: '#B8A89A',
            lineHeight: 1.4,
          }}
        >
          Post what you want. Providers bid. You pick the best offer.
        </p>

        {/* How it works — 3 editorial steps */}
        <div className="mb-14 flex flex-col gap-10">
          {STEPS.map((step) => (
            <div key={step.number} className="grid grid-cols-[auto_1fr] gap-5 items-start">
              <p
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 900,
                  fontSize: '32px',
                  color: '#E8B4C8',
                  lineHeight: 1,
                }}
              >
                {step.number}
              </p>
              <div>
                <h3
                  className="mb-2"
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontWeight: 600,
                    fontSize: '14px',
                    color: '#111',
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontWeight: 300,
                    fontSize: '13px',
                    color: '#888',
                    lineHeight: 1.7,
                  }}
                >
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Waitlist form */}
        <div className="max-w-md">
          <WaitlistForm
            type="patient"
            user={user}
            loginRedirect="/login?redirect=/request-bid"
            placeholder="your@email.com"
            buttonLabel="JOIN THE WAITLIST"
            helperText="Be the first to know when it launches."
            successHeadline="You're on the list."
            successBody="We'll email you the moment bid requests go live. In the meantime, browse prices in your city."
            successCtaLabel="BROWSE PRICES"
            successCtaTo="/browse"
          />
        </div>
      </div>
    </div>
  );
}

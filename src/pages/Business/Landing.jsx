import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Search, FileText, Users, Sparkles } from 'lucide-react';

// Four tiers laid out left → right. Each entry carries:
//   - included: feature lines rendered with a green check
//   - excluded: lines rendered with a muted X (Free tier only — paid
//     tiers stack on top of one another so a "missing" feature is
//     never relevant once you're past Free)
//   - cta: { label, to } — Free + Verified + Certified link directly
//     to /business/claim, Enterprise to /business/contact
//   - featured: true on Certified to drive the pink ring + badge
const TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    tagline: 'Claim and edit your listing.',
    included: [
      'Claim your listing',
      'Add and edit prices',
      'See monthly view count',
      'Verified badge on listing',
    ],
    excluded: [
      'Demand intelligence',
      'Full analytics',
      'Post specials to patients',
      'Competitor comparison',
    ],
    cta: { label: 'Get Started Free', to: '/business/claim' },
  },
  {
    name: 'Verified',
    price: '$99',
    period: '/mo',
    tagline: 'Reach matched patients with full analytics.',
    included: [
      'Everything in Free',
      'Full demand intelligence dashboard',
      'Full analytics (30 day history)',
      'Post specials + notify matched patients',
      'Priority search placement',
      'Patient inquiry alerts',
    ],
    cta: { label: 'Start for $99/mo', to: '/business/claim?plan=verified' },
  },
  {
    name: 'Certified',
    price: '$299',
    period: '/mo',
    tagline: 'Featured placement + competitor intel.',
    included: [
      'Everything in Verified',
      'GlowBuddy Certified badge',
      'Competitor price comparison',
      'Featured on city price reports',
      '90 day analytics history',
      'Price alert targeting',
    ],
    cta: { label: 'Start for $299/mo', to: '/business/claim?plan=certified' },
    featured: true,
  },
  {
    name: 'Enterprise',
    price: '$799',
    period: '/mo',
    tagline: 'Multi-location, white-label, API access.',
    included: [
      'Everything in Certified',
      'Multi-location (up to 20)',
      'White-label monthly reports',
      'API access to price data',
      'Dedicated account manager',
    ],
    cta: { label: 'Contact us', to: '/business/claim?plan=enterprise' },
  },
];

const STEPS = [
  {
    icon: Search,
    title: 'Claim Your Listing',
    description:
      'Search for your practice and claim the auto-generated profile patients are already viewing.',
  },
  {
    icon: FileText,
    title: 'Upload Your Menu',
    description:
      'Add your official procedure pricing so patients see verified prices alongside community data.',
  },
  {
    icon: Users,
    title: 'Reach Patients',
    description:
      'Get discovered by patients comparing prices in your area and grow your practice.',
  },
];

export default function Landing() {
  useEffect(() => {
    document.title = 'For Providers \u2014 GlowBuddy';
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-rose-light/30 to-warm-white py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-text-primary mb-5 leading-tight">
            Get found by patients already researching your prices.
          </h1>
          <p className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-10">
            Create your free provider profile, upload your menu, and reach patients
            comparing prices in your area.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/business/claim"
              className="inline-block bg-rose-accent text-white px-8 py-3 rounded-full font-semibold hover:bg-rose-dark transition"
            >
              Claim Your Listing
            </Link>
            <Link
              to="/business/dashboard"
              className="inline-block px-8 py-3 rounded-full font-semibold border-2 border-rose-accent text-rose-accent hover:bg-rose-accent hover:text-white transition"
            >
              Sign In to Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing — 4 tier grid */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-text-primary mb-3">
            Choose Your Plan
          </h2>
          <p className="text-text-secondary max-w-2xl mx-auto">
            Start free. Upgrade when you&rsquo;re ready to reach more patients,
            unlock demand intelligence, and grow your practice.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {TIERS.map((tier) => (
            <PricingCard key={tier.name} tier={tier} />
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            to="/business/claim"
            className="inline-block bg-rose-accent text-white px-8 py-3 rounded-full font-semibold hover:bg-rose-dark transition"
          >
            Get Started Free
          </Link>
          <p className="text-xs text-text-secondary mt-3">
            No credit card required for the Free plan.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-warm-gray py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-text-primary text-center mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-light text-rose-accent mb-4">
                    <Icon size={28} />
                  </div>
                  <div className="text-sm font-semibold text-rose-accent mb-1">
                    Step {index + 1}
                  </div>
                  <h3 className="text-xl font-bold text-text-primary mb-2">
                    {step.title}
                  </h3>
                  <p className="text-text-secondary">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-light text-rose-accent mb-4">
            <Sparkles size={24} />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-3">
            Join 500+ providers on GlowBuddy
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto mb-8">
            Providers across the country are claiming their listings, sharing
            verified pricing, and connecting with patients who are ready to book.
          </p>
          <Link
            to="/business/claim"
            className="inline-block bg-rose-accent text-white px-8 py-3 rounded-full font-semibold hover:bg-rose-dark transition"
          >
            Claim Your Listing
          </Link>
        </div>
      </section>
    </div>
  );
}

// ── PricingCard ─────────────────────────────────────────────────────
// Featured tier (Certified) gets a 2px pink border, soft pink ring,
// and a "Most popular" pill that floats above the card. All other
// tiers share the same baseline gray border so they read as a
// consistent row of four. Each card is column-flex so the CTA always
// pins to the bottom regardless of how many feature lines a tier has.
function PricingCard({ tier }) {
  const { name, price, period, tagline, included, excluded, cta, featured } = tier;

  return (
    <div className="relative flex">
      {featured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 inline-flex items-center text-[11px] font-bold uppercase tracking-wide bg-rose-accent text-white px-3 py-1 rounded-full shadow-sm">
          Most popular
        </span>
      )}
      <div
        className={`glow-card p-6 flex flex-col w-full ${
          featured
            ? 'border-2 border-rose-accent ring-4 ring-rose-accent/10 bg-gradient-to-b from-rose-light/20 to-warm-white'
            : 'border border-gray-200'
        }`}
      >
        {/* Header */}
        <div className="mb-5 pb-5 border-b border-gray-100">
          <h3 className="text-sm font-bold uppercase tracking-wide text-rose-accent mb-2">
            {name}
          </h3>
          <div className="flex items-baseline">
            <span className="text-4xl font-extrabold text-text-primary">
              {price}
            </span>
            <span className="text-text-secondary ml-1">{period}</span>
          </div>
          <p className="text-xs text-text-secondary mt-2 leading-snug">
            {tagline}
          </p>
        </div>

        {/* Features */}
        <ul className="space-y-2.5 mb-6 flex-1">
          {included.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5">
              <Check
                size={16}
                className="text-verified mt-0.5 shrink-0"
                strokeWidth={2.5}
              />
              <span className="text-sm text-text-primary leading-snug">
                {feature}
              </span>
            </li>
          ))}
          {excluded?.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2.5 text-text-secondary/60"
            >
              <X size={16} className="mt-0.5 shrink-0" strokeWidth={2} />
              <span className="text-sm leading-snug line-through decoration-text-secondary/30">
                {feature}
              </span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Link
          to={cta.to}
          className={`block text-center px-5 py-2.5 rounded-full font-semibold text-sm transition ${
            featured
              ? 'bg-rose-accent text-white hover:bg-rose-dark'
              : 'border-2 border-rose-accent text-rose-accent hover:bg-rose-accent hover:text-white'
          }`}
        >
          {cta.label}
        </Link>
      </div>
    </div>
  );
}

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, Search, FileText, Users, Sparkles } from 'lucide-react';

const FREE_FEATURES = [
  'Claim your listing',
  'Upload your price menu',
  'Verified badge on your profile',
  'Flag inaccurate patient submissions',
];

const PRO_FEATURES = [
  'Everything in Free',
  'Post deals pushed to patients near you',
  'Featured placement above organic results',
  'Analytics: profile views, submission volume, and local price benchmarks',
  'Priority dispute review — 24hr response',
  'Priority email support',
  'Monthly performance report — emailed to you',
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

      {/* Free vs Pro Comparison */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-text-primary text-center mb-10">
          Choose Your Plan
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free Tier */}
          <div className="glow-card p-6 border border-gray-200 flex flex-col">
            <div className="mb-6">
              <span className="inline-block text-sm font-semibold text-text-secondary uppercase tracking-wide">
                Free
              </span>
              <div className="mt-2">
                <span className="text-4xl font-extrabold text-text-primary">
                  $0
                </span>
                <span className="text-text-secondary">/mo</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check
                    size={20}
                    className="text-verified mt-0.5 shrink-0"
                  />
                  <span className="text-text-primary">{feature}</span>
                </li>
              ))}
            </ul>
            <Link
              to="/business/claim"
              className="block text-center bg-warm-gray text-text-primary px-6 py-3 rounded-full font-semibold hover:bg-gray-200 transition"
            >
              Get Started Free
            </Link>
          </div>

          {/* Pro Tier */}
          <div className="glow-card p-6 border border-rose-accent ring-2 ring-rose-accent/20 flex flex-col relative">
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <span className="inline-block text-sm font-semibold text-text-secondary uppercase tracking-wide">
                  Pro
                </span>
                <span className="inline-block text-xs font-bold bg-rose-accent text-white px-2.5 py-0.5 rounded-full">
                  Popular
                </span>
              </div>
              <div className="mt-2">
                <span className="text-4xl font-extrabold text-text-primary">
                  $149
                </span>
                <span className="text-text-secondary">/mo</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {PRO_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <Check
                    size={20}
                    className="text-verified mt-0.5 shrink-0"
                  />
                  <span className="text-text-primary">{feature}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => alert('Stripe integration coming soon')}
              className="block w-full text-center bg-rose-accent text-white px-6 py-3 rounded-full font-semibold hover:bg-rose-dark transition"
            >
              Upgrade to Pro
            </button>
          </div>
        </div>
        <p className="text-xs text-text-secondary text-center mt-6 max-w-2xl mx-auto">
          Free providers can claim their listing, upload their menu, and flag inaccurate submissions.
          Pro providers can additionally post deals, appear in featured placements, and access
          analytics. Specials require a Pro plan.
        </p>
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

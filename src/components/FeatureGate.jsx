// FeatureGate — declarative wrapper that renders children only when the
// provider's tier unlocks the named feature. Otherwise renders a styled
// upgrade prompt (or a custom `fallback` if provided).
//
// Usage:
//   <FeatureGate feature="demand_intel" tierHelpers={tierHelpers}>
//     <DemandIntelTab />
//   </FeatureGate>
//
// The tierHelpers object comes from useTier(provider). We accept it as a
// prop rather than calling useTier internally so (a) the Dashboard doesn't
// fetch the provider twice, and (b) tests can inject a mock trivially.

import { Link } from 'react-router-dom';

const GATE_MESSAGES = {
  demand_intel: {
    title: 'Demand Intel is a Verified feature',
    body: 'See how many patients near you are watching your procedures — and what price would win them over.',
  },
  full_analytics: {
    title: 'Full Analytics is a Verified feature',
    body: 'Unlock views, procedure breakdowns, and benchmarks across your metro.',
  },
  specials_notify: {
    title: 'Patient Notifications are a Verified feature',
    body: 'Reach patients with active price alerts in your city when you post a special.',
  },
  promoted_specials: {
    title: 'Promoted Specials are a Verified feature',
    body: 'Reach patients searching in your area with featured placements above organic results.',
  },
  call_analytics: {
    title: 'Call Analytics is a Verified feature',
    body: 'See which marketing channels drive real phone calls — with full call history, durations, and outcomes.',
  },
  compare_prices: {
    title: 'Competitor Comparison is a Certified feature',
    body: 'See how your prices compare to nearby providers and where you can win on value.',
  },
  city_report_feature: {
    title: 'City Reports are a Certified feature',
    body: 'Get the full 90-day pricing report for your metro with trends and opportunity scores.',
  },
  multi_location: {
    title: 'Multi-Location is an Enterprise feature',
    body: 'Manage up to 20 locations under a single dashboard with consolidated analytics.',
  },
  api_access: {
    title: 'API Access is an Enterprise feature',
    body: 'Integrate Know Before You Glow data into your own systems with our REST API.',
  },
};

export default function FeatureGate({ feature, tierHelpers, children, fallback }) {
  if (!tierHelpers) return null;
  if (tierHelpers.can(feature)) return children;
  if (fallback) return fallback;

  const copy = GATE_MESSAGES[feature] || {
    title: 'This feature requires an upgrade',
    body: 'Upgrade your plan to unlock this feature.',
  };

  return (
    <div
      style={{
        background: '#FFFCF7',
        border: '1px solid #EDE8E3',
        borderTop: '3px solid #E8347A',
        borderRadius: '2px',
        padding: '32px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>🔒</div>
      <p
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 900,
          fontSize: '22px',
          color: '#111',
          margin: 0,
        }}
      >
        {copy.title}
      </p>
      <p
        className="mt-2 mx-auto"
        style={{
          fontFamily: 'var(--font-body)',
          color: '#666',
          fontSize: '14px',
          maxWidth: '480px',
        }}
      >
        {copy.body}
      </p>
      <Link
        to="/business/dashboard?tab=settings"
        className="inline-block mt-5"
        style={{
          background: '#E8347A',
          color: '#fff',
          fontFamily: 'var(--font-body)',
          fontWeight: 700,
          fontSize: '12px',
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          padding: '12px 22px',
          borderRadius: '2px',
          textDecoration: 'none',
        }}
      >
        Upgrade to unlock →
      </Link>
    </div>
  );
}

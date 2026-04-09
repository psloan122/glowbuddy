import { useState, useMemo, useEffect } from 'react';

// /audit — internal product audit dashboard for GoodRx vs Know Before You Glow
// feature parity. Not wired into the main nav; footer link only.
// Status is hand-maintained based on a codebase grep at time of write;
// update when features land.

const STATUS = {
  LIVE: {
    key: 'LIVE',
    label: 'LIVE',
    dot: '#1D9E75',
    bg: '#E1F5EE',
    text: '#085041',
  },
  PARTIAL: {
    key: 'PARTIAL',
    label: 'PARTIAL',
    dot: '#EF9F27',
    bg: '#FAEEDA',
    text: '#412402',
  },
  MISSING: {
    key: 'MISSING',
    label: 'MISSING',
    dot: '#D85A30',
    bg: '#FAECE7',
    text: '#4A1B0C',
  },
  YEAR_2: {
    key: 'YEAR_2',
    label: 'YEAR 2',
    dot: '#7F77DD',
    bg: '#EEEDFE',
    text: '#26215C',
  },
  SKIP: {
    key: 'SKIP',
    label: 'SKIP',
    dot: '#888',
    bg: '#EFEFEF',
    text: '#555',
  },
};

const PRIORITY = {
  P1: {
    key: 'P1',
    label: 'P1 · This week',
    bg: '#FCEBEB',
    text: '#A32D2D',
  },
  P2: {
    key: 'P2',
    label: 'P2 · This month',
    bg: '#FAEEDA',
    text: '#633806',
  },
  P3: {
    key: 'P3',
    label: 'P3 · Eventually',
    bg: '#EFEFEF',
    text: '#555',
  },
  NONE: null,
};

// Feature list — status set from the codebase audit performed when this
// page was built. Update when features change state.
const FEATURES = [
  // ── Section 1: Core pricing ─────────────────────────────────────────
  {
    section: 'Core pricing',
    name: 'Providers ranked by price',
    description: 'Sort results cheapest → most expensive for selected procedure.',
    goodrx: true,
    status: 'LIVE',
    priority: 'NONE',
    evidence: 'FindPrices.jsx — sortBy=lowest_price',
    effort: null,
  },
  {
    section: 'Core pricing',
    name: 'Multi-provider comparison table',
    description: 'Compare 3 providers side-by-side — price, rating, distance.',
    goodrx: true,
    status: 'PARTIAL',
    priority: 'P1',
    evidence: 'Only CityReport/ProviderPriceComparisonTable — no side-by-side picker',
    effort: 'M',
    why: 'Head-to-head compare is the top unmet use case for injectables shoppers.',
  },
  {
    section: 'Core pricing',
    name: 'Distance from user location',
    description: '"X miles away" on every provider card.',
    goodrx: true,
    status: 'MISSING',
    priority: 'P1',
    evidence: 'MapView has it, ProcedureCard / MultiProcedureProviderCard do not',
    effort: 'S',
    why: 'Distance is the #1 decision factor after price. Cheap and already have coords.',
  },
  {
    section: 'Core pricing',
    name: 'Price history / trends over time',
    description: '"Was $16/unit 6 months ago, now $14" on provider profile.',
    goodrx: true,
    status: 'PARTIAL',
    priority: 'P2',
    evidence: 'Insights has national trends; provider profiles do not surface history',
    effort: 'M',
  },
  {
    section: 'Core pricing',
    name: 'City + procedure SEO landing pages',
    description: '"How much does Botox cost in Miami" indexable pages.',
    goodrx: true,
    status: 'LIVE',
    priority: 'NONE',
    evidence: '/prices/:citySlug + /prices/:citySlug/:yearMonth routes',
    effort: null,
  },
  {
    section: 'Core pricing',
    name: 'Brand separation',
    description: 'Separate, filterable brands (Botox vs Dysport vs Xeomin).',
    goodrx: true,
    status: 'LIVE',
    priority: 'NONE',
    evidence: 'brandFilter + brand column (migration 052) + BrandGroupCard',
    effort: null,
  },

  // ── Section 2: Alerts & retention ───────────────────────────────────
  {
    section: 'Alerts & retention',
    name: 'Price drop alerts',
    description: 'Notify when price drops below threshold.',
    goodrx: true,
    status: 'LIVE',
    priority: 'NONE',
    evidence: '/alerts page + price_alerts table (migration 016, 031)',
    effort: null,
  },
  {
    section: 'Alerts & retention',
    name: 'Radius-based alerts',
    description: 'Alert within X miles of ZIP / location.',
    goodrx: true,
    status: 'LIVE',
    priority: 'NONE',
    evidence: 'lat/lng/radius_miles in priceAlerts.js + migration 055',
    effort: null,
  },
  {
    section: 'Alerts & retention',
    name: 'Email notifications delivery',
    description: 'Actually sends the alert email (not just queues it).',
    goodrx: true,
    status: 'LIVE',
    priority: 'NONE',
    evidence: 'supabase/functions/send-alert-email + Resend API',
    effort: null,
  },

  // ── Section 3: Consumer tools ───────────────────────────────────────
  {
    section: 'Consumer tools',
    name: 'Savings calculator',
    description: '"How much could you save vs the highest price in your city?"',
    goodrx: true,
    status: 'LIVE',
    priority: 'NONE',
    evidence: 'SavingsCalculator.jsx + /calculator route',
    effort: null,
  },
  {
    section: 'Consumer tools',
    name: 'Personal treatment history',
    description: 'Log treatments, track spend over time.',
    goodrx: true,
    status: 'LIVE',
    priority: 'NONE',
    evidence: '/my/history + TreatmentTimeline.jsx + Log flow',
    effort: null,
  },
  {
    section: 'Consumer tools',
    name: 'Cumulative savings tracker',
    description: '"You\u2019ve saved $X vs paying the highest price nearby."',
    goodrx: true,
    status: 'PARTIAL',
    priority: 'P2',
    evidence: 'Wrapped shows year-end; no always-on running total on dashboard',
    effort: 'M',
  },
  {
    section: 'Consumer tools',
    name: 'Price match card',
    description: 'Shareable card with the price you found \u2014 bring to your provider.',
    goodrx: true,
    status: 'MISSING',
    priority: 'P1',
    evidence: 'No PriceMatchCard / shareable-price flow in codebase',
    effort: 'S',
    why: 'GoodRx\u2019s killer feature equivalent. Gives users a real-world reason to screenshot.',
  },
  {
    section: 'Consumer tools',
    name: 'HSA / FSA eligibility tags',
    description: 'Which treatments qualify for HSA/FSA spending.',
    goodrx: true,
    status: 'MISSING',
    priority: 'P2',
    evidence: 'Mentioned in TreatmentTimeline copy only; no hsa_eligible column',
    effort: 'S',
  },
  {
    section: 'Consumer tools',
    name: 'Glossary of treatment terms',
    description: 'What to expect, dosing, questions to ask.',
    goodrx: true,
    status: 'LIVE',
    priority: 'NONE',
    evidence: '/guides + GuideIndex.jsx + migrations 026 + 041',
    effort: null,
  },

  // ── Section 4: Provider side ────────────────────────────────────────
  {
    section: 'Provider side',
    name: 'Provider claiming flow',
    description: 'Business onboarding at /business/onboarding.',
    goodrx: true,
    status: 'LIVE',
    priority: 'NONE',
    evidence: 'Step1FindPractice \u2192 Step5ChoosePlan',
    effort: null,
  },
  {
    section: 'Provider side',
    name: 'Provider tiers / verified badge',
    description: 'Free / Verified / Certified pricing ladder with trust signals.',
    goodrx: true,
    status: 'PARTIAL',
    priority: 'P2',
    evidence: 'tier column (free/verified/certified/enterprise); Stripe checkout deferred to Phase 2',
    effort: 'M',
  },
  {
    section: 'Provider side',
    name: 'Provider specials / promotions',
    description: 'Providers pin weekly deals on listings.',
    goodrx: false,
    status: 'LIVE',
    priority: 'NONE',
    evidence: 'active_special column (migration 054) + SpecialBanner + /specials',
    effort: null,
    advantage: true,
  },
  {
    section: 'Provider side',
    name: 'Provider analytics dashboard',
    description: 'Views, clicks, patient inquiries for claimed listings.',
    goodrx: true,
    status: 'LIVE',
    priority: 'NONE',
    evidence: '/business/dashboard',
    effort: null,
  },

  // ── Section 5: Platform ─────────────────────────────────────────────
  {
    section: 'Platform',
    name: 'User preferences / personalization',
    description: 'Saved procedures, budget, location drive personalized browse.',
    goodrx: true,
    status: 'LIVE',
    priority: 'NONE',
    evidence: 'user_preferences (046/056) + /settings#treatment-preferences',
    effort: null,
  },
  {
    section: 'Platform',
    name: 'Saved providers',
    description: 'Bookmark favorite providers.',
    goodrx: true,
    status: 'LIVE',
    priority: 'NONE',
    evidence: 'saved_providers table (048) + useSavedProviders hook',
    effort: null,
  },
  {
    section: 'Platform',
    name: 'Native mobile app',
    description: 'iOS / Android native app.',
    goodrx: true,
    status: 'YEAR_2',
    priority: 'P3',
    evidence: 'Web only. No RN / Expo setup in repo.',
    effort: 'L',
  },
  {
    section: 'Platform',
    name: 'Employer / B2B product',
    description: 'Offer Know Before You Glow as an employee wellness benefit.',
    goodrx: true,
    status: 'YEAR_2',
    priority: 'P3',
    evidence: 'Not started.',
    effort: 'L',
  },
];

const FILTERS = ['ALL', 'MISSING', 'PARTIAL', 'LIVE', 'YEAR_2'];

const SECTION_ORDER = [
  'Core pricing',
  'Alerts & retention',
  'Consumer tools',
  'Provider side',
  'Platform',
];

export default function Audit() {
  const [filter, setFilter] = useState('ALL');
  const [overrides, setOverrides] = useState({}); // local-only "mark as done"

  useEffect(() => {
    document.title = 'Product Audit · Know Before You Glow';
  }, []);

  const rowsWithOverride = useMemo(
    () =>
      FEATURES.map((f, i) => ({
        ...f,
        id: i,
        effectiveStatus: overrides[i] ? 'LIVE' : f.status,
      })),
    [overrides],
  );

  const counts = useMemo(() => {
    const c = { LIVE: 0, PARTIAL: 0, MISSING: 0, YEAR_2: 0, SKIP: 0 };
    for (const f of rowsWithOverride) c[f.effectiveStatus] += 1;
    return c;
  }, [rowsWithOverride]);

  const filteredRows = useMemo(() => {
    if (filter === 'ALL') return rowsWithOverride;
    return rowsWithOverride.filter((r) => r.effectiveStatus === filter);
  }, [rowsWithOverride, filter]);

  const rowsBySection = useMemo(() => {
    const grouped = new Map();
    for (const s of SECTION_ORDER) grouped.set(s, []);
    for (const row of filteredRows) {
      if (!grouped.has(row.section)) grouped.set(row.section, []);
      grouped.get(row.section).push(row);
    }
    return grouped;
  }, [filteredRows]);

  const nextSprint = useMemo(
    () =>
      rowsWithOverride.filter(
        (f) => f.effectiveStatus === 'MISSING' && f.priority === 'P1',
      ),
    [rowsWithOverride],
  );

  function toggleDone(id) {
    setOverrides((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function generatePrompt(featureName) {
    const prompt = `Write a Claude Code prompt to build ${featureName} for Know Before You Glow`;
    // Copy-first UX — the "button" is effectively a launcher.
    navigator.clipboard?.writeText(prompt).catch(() => {});
    alert(`Prompt copied to clipboard:\n\n${prompt}`);
  }

  return (
    <div
      style={{
        background: '#FBF9F7',
        minHeight: '100vh',
        fontFamily: 'Outfit, sans-serif',
        color: '#111',
      }}
    >
      <div
        style={{
          maxWidth: 1080,
          margin: '0 auto',
          padding: '48px 24px 96px',
        }}
      >
        {/* Header ──────────────────────────────────────────────────── */}
        <p
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 600,
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#E8347A',
            margin: 0,
          }}
        >
          Internal &middot; Product Audit
        </p>
        <h1
          style={{
            fontFamily: '"Playfair Display", serif',
            fontWeight: 900,
            fontSize: 48,
            color: '#111',
            lineHeight: 1.05,
            margin: '10px 0 12px',
          }}
        >
          Know Before You Glow vs GoodRx
        </h1>
        <p
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 300,
            fontSize: 15,
            color: '#888',
            margin: 0,
          }}
        >
          Feature parity audit &mdash; updated manually from codebase greps.
        </p>

        {/* Scorecard ───────────────────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
            margin: '40px 0 56px',
          }}
        >
          <ScoreCard
            count={counts.LIVE}
            label="Built / live"
            color="#1D9E75"
          />
          <ScoreCard count={counts.PARTIAL} label="Partial" color="#EF9F27" />
          <ScoreCard
            count={counts.MISSING}
            label="Missing \u2014 build now"
            color="#D85A30"
          />
          <ScoreCard
            count={counts.YEAR_2}
            label="Year 2 / defer"
            color="#7F77DD"
          />
        </div>

        {/* Filter pills ────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            marginBottom: 24,
          }}
        >
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 2,
                  border: `1px solid ${active ? '#E8347A' : '#DDD'}`,
                  background: active ? '#E8347A' : 'transparent',
                  color: active ? '#fff' : '#888',
                  fontFamily: 'Outfit, sans-serif',
                  fontWeight: 500,
                  fontSize: 11,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {f === 'YEAR_2' ? 'YEAR 2' : f}
              </button>
            );
          })}
        </div>

        {/* Feature table ──────────────────────────────────────────── */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #EDE8E3',
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <TableHeader />
          {[...rowsBySection.entries()].map(([section, rows]) => {
            if (rows.length === 0) return null;
            return (
              <div key={section}>
                <div
                  style={{
                    padding: '16px 20px 8px',
                    fontFamily: 'Outfit, sans-serif',
                    fontWeight: 600,
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: '#B8A89A',
                    borderTop: '1px solid #F5F0EC',
                  }}
                >
                  {section}
                </div>
                {rows.map((row) => (
                  <FeatureRow
                    key={row.id}
                    row={row}
                    onToggle={() => toggleDone(row.id)}
                  />
                ))}
              </div>
            );
          })}
        </div>

        {/* Next Sprint ────────────────────────────────────────────── */}
        {nextSprint.length > 0 && (
          <div style={{ marginTop: 80 }}>
            <p
              style={{
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 600,
                fontSize: 10,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#E8347A',
                margin: 0,
              }}
            >
              Next Sprint
            </p>
            <h2
              style={{
                fontFamily: '"Playfair Display", serif',
                fontWeight: 900,
                fontSize: 32,
                color: '#111',
                lineHeight: 1.1,
                margin: '8px 0 8px',
              }}
            >
              Build these next
            </h2>
            <p
              style={{
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 300,
                fontSize: 14,
                color: '#888',
                margin: '0 0 28px',
              }}
            >
              Highest-impact gaps, ranked.
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: 12,
              }}
            >
              {nextSprint.map((f, i) => (
                <div
                  key={f.id}
                  style={{
                    background: '#fff',
                    border: '1px solid #EDE8E3',
                    borderLeft: '3px solid #E8347A',
                    borderRadius: 8,
                    padding: '20px 24px',
                    display: 'grid',
                    gridTemplateColumns: '40px 1fr auto',
                    gap: 20,
                    alignItems: 'center',
                  }}
                >
                  <p
                    style={{
                      fontFamily: '"Playfair Display", serif',
                      fontWeight: 900,
                      fontSize: 28,
                      color: '#E8B4C8',
                      margin: 0,
                      lineHeight: 1,
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        fontFamily: '"Playfair Display", serif',
                        fontWeight: 700,
                        fontSize: 18,
                        color: '#111',
                        margin: 0,
                        lineHeight: 1.25,
                      }}
                    >
                      {f.name}
                    </p>
                    {f.why && (
                      <p
                        style={{
                          fontFamily: 'Outfit, sans-serif',
                          fontWeight: 300,
                          fontSize: 13,
                          color: '#666',
                          margin: '4px 0 0',
                          lineHeight: 1.45,
                        }}
                      >
                        {f.why}
                      </p>
                    )}
                    {f.effort && (
                      <p
                        style={{
                          fontFamily: 'Outfit, sans-serif',
                          fontWeight: 600,
                          fontSize: 10,
                          letterSpacing: '0.10em',
                          textTransform: 'uppercase',
                          color: '#B8A89A',
                          margin: '8px 0 0',
                        }}
                      >
                        Effort &middot; {f.effort}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => generatePrompt(f.name)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: 2,
                      border: '1px solid #E8347A',
                      background: 'transparent',
                      color: '#E8347A',
                      fontFamily: 'Outfit, sans-serif',
                      fontWeight: 600,
                      fontSize: 11,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Generate prompt &rarr;
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer note */}
        <p
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 300,
            fontSize: 12,
            color: '#B8A89A',
            marginTop: 64,
            textAlign: 'center',
          }}
        >
          Internal tool &middot; status reflects codebase at time of last audit
          pass &middot; toggle rows to preview post-launch counts.
        </p>
      </div>
    </div>
  );
}

function ScoreCard({ count, label, color }) {
  return (
    <div
      style={{
        background: '#fff',
        borderTop: `3px solid ${color}`,
        borderRadius: 8,
        border: '1px solid #EDE8E3',
        borderTopWidth: 3,
        borderTopColor: color,
        padding: '22px 20px',
      }}
    >
      <p
        style={{
          fontFamily: '"Playfair Display", serif',
          fontWeight: 900,
          fontSize: 42,
          color: '#111',
          lineHeight: 1,
          margin: 0,
        }}
      >
        {count}
      </p>
      <p
        style={{
          fontFamily: 'Outfit, sans-serif',
          fontWeight: 300,
          fontSize: 12,
          color: '#888',
          margin: '6px 0 0',
        }}
      >
        {label}
      </p>
    </div>
  );
}

function TableHeader() {
  const cell = {
    fontFamily: 'Outfit, sans-serif',
    fontWeight: 600,
    fontSize: 10,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: '#B8A89A',
  };
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr 1fr 40px',
        gap: 20,
        padding: '14px 20px',
        borderBottom: '1px solid #F0EBE6',
        background: '#FBF9F7',
      }}
    >
      <p style={{ ...cell, margin: 0 }}>Feature</p>
      <p style={{ ...cell, margin: 0 }}>GoodRx</p>
      <p style={{ ...cell, margin: 0 }}>Know Before You Glow</p>
      <p style={{ ...cell, margin: 0 }}>Priority</p>
      <p style={{ ...cell, margin: 0, textAlign: 'center' }}>Done</p>
    </div>
  );
}

function FeatureRow({ row, onToggle }) {
  const s = STATUS[row.effectiveStatus] || STATUS.SKIP;
  const p = PRIORITY[row.priority];
  const isDone = row.effectiveStatus === 'LIVE' && row.status !== 'LIVE';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr 1fr 40px',
        gap: 20,
        padding: '18px 20px',
        borderBottom: '1px solid #F5F0EC',
        alignItems: 'flex-start',
        opacity: isDone ? 0.65 : 1,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <p
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 600,
            fontSize: 14,
            color: '#111',
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {row.name}
          {row.advantage && (
            <span
              style={{
                marginLeft: 8,
                fontFamily: 'Outfit, sans-serif',
                fontWeight: 600,
                fontSize: 9,
                letterSpacing: '0.10em',
                textTransform: 'uppercase',
                color: '#E8347A',
              }}
            >
              &middot; Know Before You Glow advantage
            </span>
          )}
        </p>
        <p
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 300,
            fontSize: 12,
            color: '#888',
            margin: '4px 0 0',
            lineHeight: 1.45,
          }}
        >
          {row.description}
        </p>
        {row.evidence && (
          <p
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 10,
              color: '#B8A89A',
              margin: '6px 0 0',
            }}
          >
            {row.evidence}
          </p>
        )}
      </div>
      <div>
        <span
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 600,
            fontSize: 11,
            color: row.goodrx ? '#1D9E75' : '#B8A89A',
          }}
        >
          {row.goodrx ? 'Yes' : 'No'}
        </span>
      </div>
      <div>
        <StatusPill status={s} />
      </div>
      <div>{p ? <PriorityPill priority={p} /> : <Dash />}</div>
      <div style={{ textAlign: 'center' }}>
        <input
          type="checkbox"
          checked={row.effectiveStatus === 'LIVE'}
          onChange={onToggle}
          disabled={row.status === 'LIVE'}
          style={{
            width: 16,
            height: 16,
            accentColor: '#E8347A',
            cursor: row.status === 'LIVE' ? 'default' : 'pointer',
          }}
          aria-label={`Mark ${row.name} as done`}
        />
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 2,
        background: status.bg,
        color: status.text,
        fontFamily: 'Outfit, sans-serif',
        fontWeight: 700,
        fontSize: 9,
        letterSpacing: '0.10em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: status.dot,
          display: 'inline-block',
        }}
      />
      {status.label}
    </span>
  );
}

function PriorityPill({ priority }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '4px 10px',
        borderRadius: 2,
        background: priority.bg,
        color: priority.text,
        fontFamily: 'Outfit, sans-serif',
        fontWeight: 700,
        fontSize: 9,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {priority.label}
    </span>
  );
}

function Dash() {
  return (
    <span
      style={{
        color: '#D8D0CA',
        fontFamily: 'Outfit, sans-serif',
        fontSize: 14,
      }}
    >
      &mdash;
    </span>
  );
}

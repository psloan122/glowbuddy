import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { setPageMeta } from '../lib/seo';

// The Glow Fund — public marketing page. 5% of every dollar GlowBuddy
// earns funds aesthetic reconstructive treatments for domestic violence
// survivors and veterans. See migration 060_glow_fund.sql for the
// backing tables (glow_fund running total + glow_fund_reports ledger).

// ── CountUp ─────────────────────────────────────────────────────────
// Dedicated count-up component for the big $X,XXX counter. Eases from
// 0 to target over 1500ms with an ease-out cubic and formats with
// US-style comma separators. Respects prefers-reduced-motion by using
// a zero-duration tick that jumps straight to the final value.
function CountUpCurrency({ target, className, style }) {
  const [display, setDisplay] = useState('$0');

  useEffect(() => {
    const value = Math.floor(Number(target) || 0);
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Reduced-motion / zero-target runs collapse to a 0ms animation so
    // the first frame snaps to the final value. This avoids a sync
    // setState in the effect body while keeping one code path.
    const duration = reduced || value === 0 ? 0 : 1500;
    const startTime = performance.now();
    let raf;
    const tick = (now) => {
      const progress = duration === 0 ? 1 : Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(value * eased);
      setDisplay(`$${current.toLocaleString()}`);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => raf && cancelAnimationFrame(raf);
  }, [target]);

  return (
    <p className={className} style={style}>
      {display}
    </p>
  );
}

// Shared kicker style used across every section for consistency.
const kickerStyle = {
  fontFamily: 'var(--font-body)',
  fontWeight: 600,
  fontSize: '10px',
  letterSpacing: '0.20em',
  textTransform: 'uppercase',
};

export default function GlowFund() {
  const [totalDonated, setTotalDonated] = useState(0);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    setPageMeta({
      title: 'The Glow Fund — Beauty is our business. Healing is our purpose. | GlowBuddy',
      description:
        '5% of every dollar GlowBuddy earns funds aesthetic reconstructive treatments for domestic violence survivors and veterans.',
    });
  }, []);

  useEffect(() => {
    // Single-row running total.
    supabase
      .from('glow_fund')
      .select('total_donated')
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setTotalDonated(Number(data.total_donated) || 0);
      });

    // Quarterly transparency ledger (most recent first).
    supabase
      .from('glow_fund_reports')
      .select('id, quarter, year, revenue, donated, recipient, report_url, published_at')
      .order('year', { ascending: false })
      .order('quarter', { ascending: false })
      .then(({ data }) => setReports(data || []));
  }, []);

  return (
    <div style={{ background: '#FBF9F7' }}>
      {/* ═══════════════════════════════════════════════════════
          SECTION 1 — Hero (hot pink)
          ═══════════════════════════════════════════════════════ */}
      <section style={{ background: '#E8347A' }}>
        <div
          style={{
            maxWidth: '800px',
            margin: '0 auto',
            padding: 'clamp(56px, 10vw, 80px) clamp(24px, 5vw, 40px)',
          }}
        >
          <p style={{ ...kickerStyle, color: 'rgba(255,255,255,0.8)', marginBottom: '20px' }}>
            The Glow Fund
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: 'clamp(40px, 8vw, 56px)',
              color: '#fff',
              lineHeight: 0.9,
              letterSpacing: '-0.01em',
              margin: 0,
            }}
          >
            Beauty is our business.
            <br />
            <span style={{ fontStyle: 'italic', fontWeight: 900 }}>
              Healing is our purpose.
            </span>
          </h1>
          <div
            style={{
              width: '40px',
              height: '2px',
              background: 'rgba(255,255,255,0.4)',
              margin: '24px 0',
            }}
          />
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 300,
              fontSize: '18px',
              color: 'rgba(255,255,255,0.85)',
              lineHeight: 1.65,
              margin: 0,
              maxWidth: '620px',
            }}
          >
            5% of every dollar GlowBuddy earns funds aesthetic reconstructive
            treatments for domestic violence survivors and veterans.
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 2 — Live counter
          ═══════════════════════════════════════════════════════ */}
      <section style={{ background: '#FBF9F7' }}>
        <div
          style={{
            maxWidth: '900px',
            margin: '0 auto',
            padding: 'clamp(48px, 8vw, 60px) clamp(24px, 5vw, 40px)',
            textAlign: 'center',
          }}
        >
          <p style={{ ...kickerStyle, color: '#E8347A', marginBottom: '20px' }}>
            The Glow Fund · Total Donated
          </p>
          <CountUpCurrency
            target={totalDonated}
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: 'clamp(56px, 10vw, 72px)',
              color: '#111',
              lineHeight: 1,
              margin: 0,
              letterSpacing: '-0.02em',
            }}
          />
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 400,
              fontStyle: 'italic',
              fontSize: '18px',
              color: '#B8A89A',
              marginTop: '16px',
              marginBottom: '48px',
            }}
          >
            and counting — updated quarterly
          </p>

          {/* Three stats row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '24px',
              maxWidth: '640px',
              margin: '0 auto',
            }}
          >
            {[
              { num: '5%', label: 'Of every dollar earned' },
              { num: 'Quarterly', label: 'Transparent reporting' },
              { num: 'Day 1', label: 'Committed from launch' },
            ].map((stat) => (
              <div key={stat.label}>
                <p
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 900,
                    fontSize: 'clamp(24px, 4vw, 36px)',
                    color: '#E8347A',
                    lineHeight: 1,
                    margin: 0,
                  }}
                >
                  {stat.num}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontWeight: 300,
                    fontSize: '12px',
                    color: '#B8A89A',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    marginTop: '12px',
                    marginBottom: 0,
                    lineHeight: 1.4,
                  }}
                >
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 3 — How it works (white)
          ═══════════════════════════════════════════════════════ */}
      <section style={{ background: '#fff' }}>
        <div
          style={{
            maxWidth: '900px',
            margin: '0 auto',
            padding: 'clamp(56px, 10vw, 80px) clamp(24px, 5vw, 40px)',
          }}
        >
          <div style={{ maxWidth: '700px', margin: '0 auto 40px' }}>
            <p style={{ ...kickerStyle, color: '#E8347A', marginBottom: '12px' }}>
              How it works
            </p>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontSize: 'clamp(28px, 5vw, 36px)',
                color: '#111',
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
                margin: 0,
              }}
            >
              Every dollar is accounted for.
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}
          >
            {[
              {
                num: '01',
                title: 'Revenue comes in',
                body:
                  'Every provider subscription, bid lead fee, and ad dollar earned by GlowBuddy.',
              },
              {
                num: '02',
                title: '5% goes to The Glow Fund',
                body:
                  'Automatically calculated, held in a dedicated account, never commingled.',
              },
              {
                num: '03',
                title: 'Treatments get funded',
                body:
                  'Quarterly distributions to our partner organization fund real treatments for real people rebuilding their lives.',
              },
            ].map((card) => (
              <div
                key={card.num}
                style={{
                  background: '#fff',
                  border: '1px solid #EDE8E3',
                  borderTop: '3px solid #E8347A',
                  borderRadius: '4px',
                  padding: '24px 20px',
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 900,
                    fontSize: '32px',
                    color: '#E8B4C8',
                    lineHeight: 1,
                    margin: 0,
                    marginBottom: '16px',
                  }}
                >
                  {card.num}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontWeight: 600,
                    fontSize: '14px',
                    color: '#111',
                    margin: 0,
                    marginBottom: '8px',
                  }}
                >
                  {card.title}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontWeight: 300,
                    fontSize: '13px',
                    color: '#888',
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 4 — The impact (cream)
          ═══════════════════════════════════════════════════════ */}
      <section style={{ background: '#FBF9F7' }}>
        <div
          style={{
            maxWidth: '700px',
            margin: '0 auto',
            padding: 'clamp(56px, 10vw, 80px) clamp(24px, 5vw, 40px)',
          }}
        >
          <p style={{ ...kickerStyle, color: '#E8347A', marginBottom: '12px' }}>
            What $5 becomes
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontStyle: 'italic',
              fontSize: 'clamp(28px, 5vw, 36px)',
              color: '#111',
              lineHeight: 1.1,
              letterSpacing: '-0.01em',
              margin: 0,
              marginBottom: '40px',
            }}
          >
            Aesthetic treatments change lives.
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              {
                title: 'Scar treatment',
                price: '$400 funds one session',
                body:
                  'Laser or filler treatment for burn or trauma scarring. Often changes how someone is perceived in job interviews.',
              },
              {
                title: 'Restorative injectables',
                price: '$650 funds one treatment',
                body:
                  'Volume restoration after trauma-related facial changes. Documented improvement in self-reported confidence.',
              },
              {
                title: 'Full treatment plan',
                price: '$2,400 funds a full course',
                body:
                  'Multiple sessions addressing scarring and volume. The kind of transformation that makes a before/after impossible to argue with.',
              },
            ].map((card) => (
              <div
                key={card.title}
                style={{
                  background: '#fff',
                  borderLeft: '3px solid #E8347A',
                  borderRadius: '0 4px 4px 0',
                  padding: '20px',
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontWeight: 600,
                    fontSize: '14px',
                    color: '#111',
                    margin: 0,
                    marginBottom: '6px',
                    letterSpacing: '0.01em',
                  }}
                >
                  {card.title}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 900,
                    fontSize: '28px',
                    color: '#E8347A',
                    lineHeight: 1.05,
                    margin: 0,
                    marginBottom: '10px',
                  }}
                >
                  {card.price}
                </p>
                <p
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontWeight: 300,
                    fontSize: '13px',
                    color: '#888',
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 5 — Quarterly report (white)
          ═══════════════════════════════════════════════════════ */}
      <section style={{ background: '#fff' }}>
        <div
          style={{
            maxWidth: '900px',
            margin: '0 auto',
            padding: 'clamp(56px, 10vw, 80px) clamp(24px, 5vw, 40px)',
          }}
        >
          <p style={{ ...kickerStyle, color: '#E8347A', marginBottom: '12px' }}>
            Transparency report
          </p>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: 'clamp(28px, 5vw, 36px)',
              color: '#111',
              lineHeight: 1.1,
              letterSpacing: '-0.01em',
              margin: 0,
              marginBottom: '32px',
            }}
          >
            We publish everything.
          </h2>

          {reports.length === 0 ? (
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontWeight: 300,
                fontSize: '14px',
                color: '#B8A89A',
                margin: 0,
              }}
            >
              Q2 2026 · First report coming July 2026
            </p>
          ) : (
            <div
              style={{
                border: '1px solid #EDE8E3',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              {/* Header row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr 1.4fr auto',
                  gap: '16px',
                  padding: '14px 20px',
                  background: '#FBF9F7',
                  borderBottom: '1px solid #EDE8E3',
                  fontFamily: 'var(--font-body)',
                  fontWeight: 600,
                  fontSize: '10px',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#888',
                }}
              >
                <span>Quarter</span>
                <span>Revenue</span>
                <span>5% donated</span>
                <span>Recipient</span>
                <span>Report</span>
              </div>
              {reports.map((r, i) => (
                <div
                  key={r.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr 1.4fr auto',
                    gap: '16px',
                    padding: '16px 20px',
                    borderBottom: i < reports.length - 1 ? '1px solid #EDE8E3' : 'none',
                    fontFamily: 'var(--font-body)',
                    fontWeight: 400,
                    fontSize: '13px',
                    color: '#111',
                    alignItems: 'center',
                  }}
                >
                  <span>
                    {r.quarter} {r.year}
                  </span>
                  <span>
                    {r.revenue != null
                      ? `$${Math.round(Number(r.revenue)).toLocaleString()}`
                      : '—'}
                  </span>
                  <span>
                    {r.donated != null
                      ? `$${Math.round(Number(r.donated)).toLocaleString()}`
                      : '—'}
                  </span>
                  <span style={{ color: '#666' }}>{r.recipient || '—'}</span>
                  <span>
                    {r.report_url ? (
                      <a
                        href={r.report_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#E8347A',
                          fontWeight: 600,
                          fontSize: '12px',
                          letterSpacing: '0.02em',
                          textDecoration: 'none',
                        }}
                      >
                        View PDF →
                      </a>
                    ) : (
                      <span style={{ color: '#B8A89A', fontSize: '12px' }}>Pending</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════
          SECTION 6 — CTA (hot pink)
          ═══════════════════════════════════════════════════════ */}
      <section style={{ background: '#E8347A' }}>
        <div
          style={{
            maxWidth: '760px',
            margin: '0 auto',
            padding: 'clamp(48px, 8vw, 60px) clamp(24px, 5vw, 40px)',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontStyle: 'italic',
              fontSize: 'clamp(32px, 6vw, 42px)',
              color: '#fff',
              lineHeight: 1.05,
              letterSpacing: '-0.01em',
              margin: 0,
              marginBottom: '20px',
            }}
          >
            Every listing helps.
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 300,
              fontSize: '16px',
              color: 'rgba(255,255,255,0.85)',
              lineHeight: 1.65,
              margin: 0,
              marginBottom: '32px',
              maxWidth: '580px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}
          >
            When a provider claims their listing on GlowBuddy, they join a
            platform that gives back. When you share your prices, you help
            someone find the best deal — and fund someone else's fresh start.
          </p>
          <div
            style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Link
              to="/business/onboarding"
              style={{
                background: '#fff',
                color: '#E8347A',
                padding: '14px 24px',
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                fontSize: '11px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                borderRadius: '2px',
                textDecoration: 'none',
              }}
            >
              Claim your listing
            </Link>
            <Link
              to="/browse"
              style={{
                background: 'transparent',
                color: '#fff',
                padding: '14px 24px',
                fontFamily: 'var(--font-body)',
                fontWeight: 700,
                fontSize: '11px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                borderRadius: '2px',
                border: '1px solid rgba(255,255,255,0.7)',
                textDecoration: 'none',
              }}
            >
              Browse prices
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

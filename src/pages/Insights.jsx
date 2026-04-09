import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
  CartesianGrid,
} from 'recharts';

// "The Know Before You Glow Price Report" — editorial data feature.
//
// This page is not a dashboard. It's a monthly magazine piece: ticker,
// kicker, hero headline, then section after section of hot-pink charts
// with Playfair/Outfit typography and wide whitespace. All data is
// pulled from the same `procedures` query the old Insights page used;
// what changed is how we present it.

const dollarFormatter = (value) => `$${Number(value).toLocaleString()}`;

// Hot-pink palette only — no purple, no green. Different shades
// distinguish lines in the trend chart (STEP CHART 4).
const PINK_SHADES = ['#E8347A', '#C8001A', '#E8B4C8', '#F06393'];

// Provider-type copy lives alongside the data so the three cards in
// Chart 2 always read correctly even when the underlying provider
// naming drifts.
const PROVIDER_TYPE_COPY = {
  'Plastic Surgeon': 'Board-certified surgeon. Highest overhead.',
  'Plastic Surgery': 'Board-certified surgeon. Highest overhead.',
  'Med Spa': 'Most common. Wide quality range.',
  'MedSpa': 'Most common. Wide quality range.',
  'Nurse Injector': 'Often the best value. Look for experience.',
  'Nurse Practitioner': 'Often the best value. Look for experience.',
  'Dermatologist': 'Medical expertise at clinical prices.',
};

// Display-friendly procedure names. The raw `procedures.procedure_type`
// can read like "Botox / Dysport / Xeomin" — we want "Botox" in the
// editorial chart.
function displayProcedureName(raw) {
  if (!raw) return '';
  const first = raw.split(/[\s/]+/)[0];
  // Normal-case the first word so "BOTOX" becomes "Botox"
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function unitLabelFor(raw) {
  const r = (raw || '').toLowerCase();
  if (r.includes('botox') || r.includes('dysport') || r.includes('xeomin') || r.includes('jeuveau') || r.includes('daxxify') || r.includes('neurotoxin')) {
    return 'per unit';
  }
  if (r.includes('filler') || r.includes('juvederm') || r.includes('restylane')) return 'per syringe';
  if (r.includes('laser hair')) return 'per session';
  if (r.includes('microneedling') || r.includes('rf ')) return 'per session';
  if (r.includes('coolsculpting')) return 'per cycle';
  if (r.includes('iv ') || r.includes('drip')) return 'per session';
  return null;
}

const SectionRule = () => (
  <div style={{ borderTop: '1px solid #EDE8E3', marginTop: 80, paddingTop: 48 }} />
);

const Kicker = ({ children }) => (
  <p
    className="mb-3"
    style={{
      fontFamily: 'var(--font-body)',
      fontWeight: 700,
      fontSize: '10px',
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: '#E8347A',
    }}
  >
    {children}
  </p>
);

const SectionHeadline = ({ children }) => (
  <h2
    className="mb-5"
    style={{
      fontFamily: 'var(--font-display)',
      fontWeight: 900,
      fontSize: 'clamp(28px, 4vw, 40px)',
      lineHeight: 1.05,
      letterSpacing: '-0.02em',
      color: '#111',
    }}
  >
    {children}
  </h2>
);

const EditorialTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #EDE8E3',
        padding: '8px 12px',
        fontFamily: 'var(--font-body)',
        fontSize: '12px',
      }}
    >
      <p style={{ color: '#111', fontWeight: 600, marginBottom: 2 }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color || entry.stroke }}>
          {entry.name}: ${Number(entry.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
};

export default function Insights() {
  const [loading, setLoading] = useState(true);
  const [rawData, setRawData] = useState([]);
  const [avgByProcedure, setAvgByProcedure] = useState([]);
  const [procedureRanges, setProcedureRanges] = useState({});
  const [avgByProviderType, setAvgByProviderType] = useState([]);
  const [topCities, setTopCities] = useState([]);
  const [mostSubmitted, setMostSubmitted] = useState([]);
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [trendProcedures, setTrendProcedures] = useState([]);
  const [selectedTrendProc, setSelectedTrendProc] = useState(null);
  const [reportMonth, setReportMonth] = useState('');

  useEffect(() => {
    document.title = 'The Know Before You Glow Price Report | Know Before You Glow';
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const { data, error } = await supabase
        .from('procedures')
        .select('procedure_type, provider_type, city, state, price_paid, created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(2000);

      if (error || !data) {
        setLoading(false);
        return;
      }

      setRawData(data);

      // Report month — use the most recent submission date so the page
      // always reads as a fresh monthly report.
      const latest = data
        .map((d) => d.created_at)
        .filter(Boolean)
        .sort()
        .slice(-1)[0];
      if (latest) {
        const d = new Date(latest);
        setReportMonth(d.toLocaleString('en-US', { month: 'long', year: 'numeric' }));
      }

      // --- Average by Procedure (plus ranges) ---
      const procGroups = {};
      data.forEach((row) => {
        const key = row.procedure_type;
        if (!key || !row.price_paid) return;
        if (!procGroups[key]) procGroups[key] = [];
        procGroups[key].push(Number(row.price_paid));
      });

      const avgByProc = Object.entries(procGroups)
        .filter(([, prices]) => prices.length >= 2)
        .map(([name, prices]) => ({
          name,
          displayName: displayProcedureName(name),
          unitLabel: unitLabelFor(name),
          avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
          min: Math.min(...prices),
          max: Math.max(...prices),
          count: prices.length,
        }))
        .sort((a, b) => b.avgPrice - a.avgPrice)
        .slice(0, 8);
      setAvgByProcedure(avgByProc);

      // Keyed map for "What's a fair price?" cards
      const rangeMap = {};
      avgByProc.forEach((entry) => {
        rangeMap[entry.name] = entry;
      });
      setProcedureRanges(rangeMap);

      // --- Average by Provider Type ---
      const provGroups = {};
      data.forEach((row) => {
        const key = row.provider_type;
        if (!key || !row.price_paid) return;
        if (!provGroups[key]) provGroups[key] = [];
        provGroups[key].push(Number(row.price_paid));
      });
      const avgByProv = Object.entries(provGroups)
        .filter(([, prices]) => prices.length >= 2)
        .map(([name, prices]) => ({
          name,
          avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
          count: prices.length,
          copy: PROVIDER_TYPE_COPY[name] || 'Quality varies widely — compare prices carefully.',
        }))
        .sort((a, b) => b.avgPrice - a.avgPrice)
        .slice(0, 3);
      setAvgByProviderType(avgByProv);

      // --- Top Cities ---
      const cityGroups = {};
      data.forEach((row) => {
        if (!row.city || !row.state) return;
        const key = `${row.city}, ${row.state}`;
        if (!cityGroups[key]) cityGroups[key] = { city: row.city, state: row.state, count: 0 };
        cityGroups[key].count += 1;
      });
      const topCitiesArr = Object.values(cityGroups)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
      setTopCities(topCitiesArr);

      // --- Most Submitted (ranked bars for Chart 5) ---
      const procCounts = {};
      data.forEach((row) => {
        const key = row.procedure_type;
        if (!key) return;
        procCounts[key] = (procCounts[key] || 0) + 1;
      });
      const totalSubs = Object.values(procCounts).reduce((a, b) => a + b, 0);
      const mostSub = Object.entries(procCounts)
        .map(([name, value]) => ({
          name,
          displayName: displayProcedureName(name),
          value,
          pct: totalSubs > 0 ? Math.round((value / totalSubs) * 100) : 0,
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);
      setMostSubmitted(mostSub);

      // --- Monthly trends (top 3 procedures) ---
      const top3Procs = mostSub.slice(0, 3).map((p) => p.name);
      setTrendProcedures(top3Procs);
      setSelectedTrendProc(top3Procs[0] || null);

      const monthMap = {};
      data.forEach((row) => {
        if (!top3Procs.includes(row.procedure_type)) return;
        if (!row.created_at) return;
        const date = new Date(row.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthMap[monthKey]) monthMap[monthKey] = {};
        if (!monthMap[monthKey][row.procedure_type]) {
          monthMap[monthKey][row.procedure_type] = [];
        }
        monthMap[monthKey][row.procedure_type].push(Number(row.price_paid));
      });

      const months = Object.keys(monthMap).sort();
      const trendsArr = months.map((month) => {
        const entry = { month };
        top3Procs.forEach((proc) => {
          const prices = monthMap[month]?.[proc];
          if (prices && prices.length > 0) {
            entry[proc] = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
          }
        });
        return entry;
      });
      setMonthlyTrends(trendsArr);

      setLoading(false);
    }

    fetchData();
  }, []);

  // Compute "Surprising findings" from rawData when it arrives.
  const surprisingFindings = useMemo(() => {
    const botoxPrices = rawData
      .filter((r) => {
        const pt = (r.procedure_type || '').toLowerCase();
        return (pt.includes('botox') || pt.includes('neurotoxin')) && r.price_paid;
      })
      .map((r) => Number(r.price_paid))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (botoxPrices.length < 3) {
      return null;
    }
    const min = Math.min(...botoxPrices);
    const max = Math.max(...botoxPrices);
    const spreadPct = Math.round(((max - min) / min) * 100);
    const multiplier = Math.round((max / min) * 10) / 10;
    return {
      spreadPct: `${spreadPct}%`,
      highest: `$${Math.round(max).toLocaleString()}`,
      multiplier: `${multiplier}\u00D7`,
    };
  }, [rawData]);

  // Trend delta annotation for the currently selected procedure.
  const trendDelta = useMemo(() => {
    if (!selectedTrendProc || monthlyTrends.length < 2) return null;
    const last = monthlyTrends[monthlyTrends.length - 1]?.[selectedTrendProc];
    const prev = monthlyTrends[monthlyTrends.length - 2]?.[selectedTrendProc];
    if (last == null || prev == null) return null;
    const diff = last - prev;
    if (diff === 0) return { text: 'Flat vs last month', up: false, down: false };
    if (diff < 0) return { text: `\u2193 $${Math.abs(diff).toFixed(2)} vs last month`, up: false, down: true };
    return { text: `\u2191 $${diff.toFixed(2)} vs last month`, up: true, down: false };
  }, [selectedTrendProc, monthlyTrends]);

  const fairPriceCards = useMemo(() => {
    // Prefer the big-ticket procedures: Botox first, then top fillers, then laser.
    const preferred = Object.values(procedureRanges)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    return preferred;
  }, [procedureRanges]);

  if (loading) {
    return (
      <div className="max-w-[800px] mx-auto px-4 py-24 text-center">
        <p className="editorial-kicker mb-3" style={{ color: '#E8347A' }}>
          The Know Before You Glow Price Report
        </p>
        <p
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 400,
            fontStyle: 'italic',
            fontSize: '20px',
            color: '#B8A89A',
          }}
        >
          Loading the latest report&hellip;
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#fff' }}>
      {/* Hot-pink ticker bar */}
      <div
        className="w-full overflow-hidden"
        style={{
          background: '#E8347A',
          color: '#fff',
          padding: '8px 16px',
          fontFamily: 'var(--font-body)',
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          textAlign: 'center',
        }}
      >
        The Know Before You Glow Price Report &middot; Updated Monthly
        {reportMonth ? ` \u00B7 ${reportMonth}` : ''}
      </div>

      {/* Page container — narrow editorial max width */}
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-14">
        {/* Hero */}
        <header className="mb-2">
          <Kicker>Data Report</Kicker>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: 'clamp(40px, 7vw, 56px)',
              lineHeight: 1,
              letterSpacing: '-0.02em',
              color: '#111',
              marginBottom: '18px',
            }}
          >
            What women are actually paying.
          </h1>
          <p
            className="mb-3"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 400,
              fontStyle: 'italic',
              fontSize: 'clamp(16px, 2.5vw, 20px)',
              lineHeight: 1.4,
              color: '#B8A89A',
            }}
          >
            Crowdsourced from real patients. No brand deals. No sponsored content.
          </p>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 300,
              fontSize: '15px',
              color: '#888',
              maxWidth: '60ch',
            }}
          >
            Every month we analyze thousands of real patient-reported receipts to
            show you what a fair price actually looks like &mdash; and where you're
            probably getting overcharged.
          </p>
        </header>

        {/* CHART 1 — What does it actually cost? */}
        <section>
          <SectionRule />
          <Kicker>Procedure averages</Kicker>
          <SectionHeadline>What does it actually cost?</SectionHeadline>

          {avgByProcedure.length > 0 ? (
            <div className="space-y-2">
              {(() => {
                const maxVal = Math.max(...avgByProcedure.map((a) => a.avgPrice));
                return avgByProcedure.map((entry) => {
                  const widthPct = maxVal > 0 ? (entry.avgPrice / maxVal) * 100 : 0;
                  return (
                    <div key={entry.name} className="flex items-center gap-3">
                      <div className="w-[130px] shrink-0 text-right">
                        <p
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontWeight: 500,
                            fontSize: '13px',
                            color: '#111',
                            lineHeight: 1.2,
                          }}
                        >
                          {entry.displayName}
                        </p>
                        {entry.unitLabel && (
                          <p
                            style={{
                              fontFamily: 'var(--font-body)',
                              fontWeight: 300,
                              fontSize: '11px',
                              color: '#B8A89A',
                            }}
                          >
                            {entry.unitLabel}
                          </p>
                        )}
                      </div>
                      <div className="flex-1 flex items-center gap-3">
                        <div
                          style={{
                            height: '32px',
                            width: `${widthPct}%`,
                            background: '#E8347A',
                            transition: 'width 0.5s ease',
                          }}
                        />
                        <p
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 700,
                            fontSize: '14px',
                            color: '#111',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ${entry.avgPrice.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            <p style={{ fontFamily: 'var(--font-body)', color: '#B8A89A' }}>
              Not enough data yet.
            </p>
          )}
        </section>

        {/* CHART 2 — Where you pay more, and why */}
        {avgByProviderType.length > 0 && (
          <section>
            <SectionRule />
            <Kicker>By provider type</Kicker>
            <SectionHeadline>Where you pay more &mdash; and why.</SectionHeadline>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {avgByProviderType.map((entry) => (
                <div
                  key={entry.name}
                  style={{
                    background: '#fff',
                    border: '1px solid #EDE8E3',
                    borderTop: '3px solid #E8347A',
                    padding: '20px 18px',
                  }}
                >
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontWeight: 700,
                      fontSize: '10px',
                      letterSpacing: '0.10em',
                      textTransform: 'uppercase',
                      color: '#E8347A',
                      marginBottom: '8px',
                    }}
                  >
                    {entry.name}
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 900,
                      fontSize: '36px',
                      lineHeight: 1,
                      color: '#111',
                      marginBottom: '6px',
                    }}
                  >
                    ${entry.avgPrice.toLocaleString()}
                    <span
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontWeight: 400,
                        fontSize: '12px',
                        color: '#B8A89A',
                        marginLeft: '6px',
                      }}
                    >
                      avg
                    </span>
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontWeight: 300,
                      fontSize: '13px',
                      color: '#666',
                      lineHeight: 1.4,
                    }}
                  >
                    {entry.copy}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CHART 3 — Where Know Before You Glow is growing (ranked list) */}
        {topCities.length > 0 && (
          <section>
            <SectionRule />
            <Kicker>Top cities</Kicker>
            <SectionHeadline>Where Know Before You Glow is growing.</SectionHeadline>

            <ol className="space-y-4">
              {(() => {
                const maxCount = Math.max(...topCities.map((c) => c.count));
                return topCities.map((city, idx) => {
                  const rank = String(idx + 1).padStart(2, '0');
                  const widthPct = maxCount > 0 ? (city.count / maxCount) * 100 : 0;
                  const url = `/browse?city=${encodeURIComponent(city.city)}&state=${encodeURIComponent(city.state)}`;
                  return (
                    <li key={`${city.city}-${city.state}`}>
                      <Link
                        to={url}
                        className="flex items-center gap-4 group"
                        style={{ textDecoration: 'none' }}
                      >
                        <span
                          style={{
                            fontFamily: 'var(--font-display)',
                            fontWeight: 900,
                            fontSize: '24px',
                            color: '#E8B4C8',
                            width: '38px',
                            lineHeight: 1,
                          }}
                        >
                          {rank}
                        </span>
                        <span
                          className="flex-1 min-w-0"
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontWeight: 500,
                            fontSize: '14px',
                            color: '#111',
                          }}
                        >
                          {city.city}, {city.state}
                        </span>
                        <span className="flex-1 max-w-[240px]">
                          <span
                            className="block"
                            style={{
                              height: '4px',
                              width: `${widthPct}%`,
                              background: '#E8347A',
                              transition: 'width 0.4s ease',
                            }}
                          />
                        </span>
                        <span
                          className="shrink-0 text-right"
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontWeight: 300,
                            fontSize: '11px',
                            color: '#B8A89A',
                            width: '70px',
                          }}
                        >
                          {city.count} {city.count === 1 ? 'price' : 'prices'}
                        </span>
                      </Link>
                    </li>
                  );
                });
              })()}
            </ol>
          </section>
        )}

        {/* CHART 4 — Are prices going up or down? */}
        {monthlyTrends.length >= 2 && trendProcedures.length > 0 && (
          <section>
            <SectionRule />
            <Kicker>6-month trend</Kicker>
            <SectionHeadline>Are prices going up or down?</SectionHeadline>

            {/* Procedure toggle pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              {trendProcedures.map((proc) => {
                const isActive = selectedTrendProc === proc;
                return (
                  <button
                    key={proc}
                    type="button"
                    onClick={() => setSelectedTrendProc(proc)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '2px',
                      border: `1px solid ${isActive ? '#E8347A' : '#DDD'}`,
                      background: isActive ? '#E8347A' : 'transparent',
                      color: isActive ? '#fff' : '#888',
                      fontFamily: 'var(--font-body)',
                      fontWeight: 500,
                      fontSize: '11px',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}
                  >
                    {displayProcedureName(proc)}
                  </button>
                );
              })}
            </div>

            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer>
                <LineChart data={monthlyTrends} margin={{ top: 20, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid stroke="#F5F0EC" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fontFamily: 'var(--font-body)', fill: '#888' }}
                    axisLine={{ stroke: '#EDE8E3' }}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={dollarFormatter}
                    tick={{ fontSize: 11, fontFamily: 'var(--font-body)', fill: '#888' }}
                    axisLine={{ stroke: '#EDE8E3' }}
                    tickLine={false}
                  />
                  <Tooltip content={<EditorialTooltip />} />
                  <Legend wrapperStyle={{ fontFamily: 'var(--font-body)', fontSize: 11 }} />
                  {trendProcedures.map((proc, i) => (
                    <Line
                      key={proc}
                      type="monotone"
                      dataKey={proc}
                      name={displayProcedureName(proc)}
                      stroke={PINK_SHADES[i % PINK_SHADES.length]}
                      strokeWidth={selectedTrendProc === proc ? 3 : 1.5}
                      strokeOpacity={
                        selectedTrendProc && selectedTrendProc !== proc ? 0.25 : 1
                      }
                      dot={{ r: 3 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {trendDelta && (
              <p
                className="mt-3"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  color: trendDelta.down ? '#1A7A3A' : trendDelta.up ? '#C8001A' : '#888',
                  fontWeight: 500,
                }}
              >
                {displayProcedureName(selectedTrendProc)}: {trendDelta.text}
              </p>
            )}
          </section>
        )}

        {/* CHART 5 — What people are shopping for (ranked bars) */}
        {mostSubmitted.length > 0 && (
          <section>
            <SectionRule />
            <Kicker>By volume</Kicker>
            <SectionHeadline>What people are shopping for.</SectionHeadline>

            <div className="space-y-3">
              {mostSubmitted.map((entry) => (
                <div key={entry.name} className="flex items-center gap-3">
                  <p
                    className="w-[180px] shrink-0"
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontWeight: 600,
                      fontSize: '13px',
                      color: '#111',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {entry.displayName}
                  </p>
                  <div className="flex-1 flex items-center gap-3">
                    <div
                      style={{
                        height: '6px',
                        width: `${entry.pct}%`,
                        background: '#E8347A',
                        transition: 'width 0.5s ease',
                      }}
                    />
                    <p
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        fontSize: '14px',
                        color: '#E8347A',
                      }}
                    >
                      {entry.pct}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* NEW — What's a fair price? */}
        {fairPriceCards.length > 0 && (
          <section>
            <SectionRule />
            <Kicker>The honest answer</Kicker>
            <SectionHeadline>What's a fair price?</SectionHeadline>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {fairPriceCards.map((entry) => {
                const low = Math.round(entry.avgPrice * 0.75);
                const high = Math.round(entry.avgPrice * 1.15);
                const unit = entry.unitLabel || '';
                const browseUrl = `/browse?procedure=${encodeURIComponent(entry.displayName.toLowerCase())}`;
                return (
                  <div
                    key={entry.name}
                    style={{
                      background: '#FBF9F7',
                      borderTop: '3px solid #E8347A',
                      padding: '20px 18px',
                    }}
                  >
                    <p
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontWeight: 700,
                        fontSize: '10px',
                        letterSpacing: '0.10em',
                        textTransform: 'uppercase',
                        color: '#E8347A',
                        marginBottom: '8px',
                      }}
                    >
                      {entry.displayName}
                    </p>
                    <p
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 700,
                        fontSize: '20px',
                        color: '#111',
                        marginBottom: '10px',
                      }}
                    >
                      Fair range: ${low}&ndash;${high}
                      {unit ? (
                        <span
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontWeight: 300,
                            fontSize: '12px',
                            color: '#B8A89A',
                            marginLeft: '4px',
                          }}
                        >
                          {unit}
                        </span>
                      ) : null}
                    </p>
                    <p
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontWeight: 400,
                        fontStyle: 'italic',
                        fontSize: '13px',
                        color: '#666',
                        lineHeight: 1.4,
                        marginBottom: '14px',
                      }}
                    >
                      If you're being quoted well above this range, shop around. It's the same product.
                    </p>
                    <Link
                      to={browseUrl}
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontWeight: 500,
                        fontSize: '12px',
                        color: '#E8347A',
                        textDecoration: 'none',
                        borderBottom: '1px solid #E8347A',
                        paddingBottom: '1px',
                      }}
                    >
                      Find {entry.displayName} near me &rarr;
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* NEW — Surprising findings */}
        {surprisingFindings && (
          <section>
            <SectionRule />
            <Kicker>Surprising findings</Kicker>
            <SectionHeadline>The gap is bigger than you think.</SectionHeadline>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { number: surprisingFindings.spreadPct, label: 'Price spread for the same Botox product' },
                { number: surprisingFindings.highest, label: 'Highest Botox price we found' },
                { number: surprisingFindings.multiplier, label: 'Markup from cheapest to most expensive' },
              ].map((stat, i) => (
                <div
                  key={i}
                  style={{
                    background: '#fff',
                    borderTop: '3px solid #E8347A',
                    padding: '24px 18px',
                  }}
                >
                  <p
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 900,
                      fontSize: '48px',
                      lineHeight: 1,
                      color: '#E8347A',
                      marginBottom: '10px',
                    }}
                  >
                    {stat.number}
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontWeight: 400,
                      fontSize: '13px',
                      color: '#666',
                      lineHeight: 1.4,
                    }}
                  >
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Disclaimer */}
        <section>
          <SectionRule />
          <div
            style={{
              borderLeft: '3px solid #E8347A',
              paddingLeft: '16px',
              marginTop: '24px',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontWeight: 300,
                fontStyle: 'italic',
                fontSize: '12px',
                color: '#B8A89A',
                lineHeight: 1.5,
              }}
            >
              Real prices from real patients. All data is self-reported. Provider-listed
              prices are submitted by providers and clearly labeled where they appear.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

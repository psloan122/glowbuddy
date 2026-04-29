import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
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
// All price stats use provider_pricing filtered by each procedure's
// primary price_label (per_unit, per_syringe, per_session, etc.).
// Patient submissions (procedures table) are used only for volume
// counts and city rankings — never for price calculations.

const dollarFormatter = (value) => `$${Number(value).toLocaleString()}`;

// Hot-pink palette only — no purple, no green. Different shades
// distinguish lines in the trend chart (STEP CHART 4).
const PINK_SHADES = ['#E8347A', '#C8001A', '#E8B4C8', '#F06393'];

// Display-friendly procedure names. The raw `procedures.procedure_type`
// can read like "Botox / Dysport / Xeomin" — we want "Botox" in the
// editorial chart.
function displayProcedureName(raw) {
  if (!raw) return '';
  const first = raw.split(/[\s/]+/)[0];
  // Normal-case the first word so "BOTOX" becomes "Botox"
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

const PRIMARY_LABEL = {
  'Botox': 'per_unit',
  'Dysport': 'per_unit',
  'Xeomin': 'per_unit',
  'Jeuveau': 'per_unit',
  'Daxxify': 'per_unit',
  'Botox / Dysport / Xeomin': 'per_unit',
  'Filler': 'per_syringe',
  'Lip Filler': 'per_syringe',
  'Cheek Filler': 'per_syringe',
  'Juvederm': 'per_syringe',
  'Restylane': 'per_syringe',
  'Sculptra': 'per_vial',
  'Radiesse': 'per_syringe',
  'Kybella': 'per_session',
  'RF Microneedling': 'per_session',
  'Microneedling': 'per_session',
  'Chemical Peel': 'per_session',
  'HydraFacial': 'per_session',
  'IPL/BBL Photofacial': 'per_session',
  'Laser Hair Removal': 'per_session',
  'CoolSculpting': 'per_cycle',
  'Morpheus8': 'per_session',
};

const LABEL_DISPLAY = {
  per_unit: 'per unit',
  per_syringe: 'per syringe',
  per_session: 'per session',
  per_vial: 'per vial',
  per_cycle: 'per cycle',
};

const LABEL_SUFFIX = {
  per_unit: '/unit',
  per_syringe: '/syringe',
  per_session: '/session',
  per_vial: '/vial',
  per_cycle: '/cycle',
};

const NEUROTOXINS = new Set([
  'Botox', 'Dysport', 'Xeomin', 'Jeuveau', 'Daxxify', 'Botox / Dysport / Xeomin',
]);

const MIN_SAMPLE_SIZE = 20;
const CHART_MIN_ROWS = 100;

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
  const [pricingRows, setPricingRows] = useState([]);
  const [avgByProcedure, setAvgByProcedure] = useState([]);
  const [procedureRanges, setProcedureRanges] = useState({});
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

      const [pricingResult, patientResult] = await Promise.all([
        supabase
          .from('provider_pricing')
          .select('procedure_type, price_label, price, created_at')
          .eq('is_active', true)
          .eq('display_suppressed', false)
          .gt('price', 0)
          .in('procedure_type', Object.keys(PRIMARY_LABEL))
          .in('price_label', ['per_unit', 'per_syringe', 'per_session', 'per_vial', 'per_cycle'])
          .order('created_at', { ascending: false })
          .limit(15000),
        supabase
          .from('procedures')
          .select('procedure_type, city, state, created_at')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(2000),
      ]);

      const pricingData = pricingResult.data || [];
      const patientData = patientResult.data || [];
      setPricingRows(pricingData);

      const latest = [...pricingData, ...patientData]
        .map((d) => d.created_at)
        .filter(Boolean)
        .sort()
        .slice(-1)[0];
      if (latest) {
        const d = new Date(latest);
        setReportMonth(d.toLocaleString('en-US', { month: 'long', year: 'numeric' }));
      }

      // --- Procedure stats from provider_pricing, filtered by primary label ---
      // Merge neurotoxin variants into a single "Botox" bucket.
      const procGroups = {};
      pricingData.forEach((row) => {
        const expectedLabel = PRIMARY_LABEL[row.procedure_type];
        if (!expectedLabel || row.price_label !== expectedLabel) return;
        const groupName = NEUROTOXINS.has(row.procedure_type) ? 'Botox' : row.procedure_type;
        if (!procGroups[groupName]) procGroups[groupName] = [];
        procGroups[groupName].push(Number(row.price));
      });

      const allProcStats = Object.entries(procGroups)
        .filter(([, prices]) => prices.length >= MIN_SAMPLE_SIZE)
        .map(([name, prices]) => {
          prices.sort((a, b) => a - b);
          const p25 = prices[Math.floor(prices.length * 0.25)];
          const p75 = prices[Math.floor(prices.length * 0.75)];
          const label = PRIMARY_LABEL[name] || 'per_session';
          return {
            name,
            displayName: displayProcedureName(name),
            label,
            unitLabel: LABEL_DISPLAY[label] || '',
            suffix: LABEL_SUFFIX[label] || '',
            avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
            p25: Math.round(p25),
            p75: Math.round(p75),
            min: Math.min(...prices),
            max: Math.max(...prices),
            count: prices.length,
          };
        });

      const avgByProc = allProcStats
        .filter((entry) => entry.count >= CHART_MIN_ROWS)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
      setAvgByProcedure(avgByProc);

      const rangeMap = {};
      allProcStats.forEach((entry) => {
        rangeMap[entry.name] = entry;
      });
      setProcedureRanges(rangeMap);

      // --- Top Cities (from patient submissions — volume only) ---
      const cityGroups = {};
      patientData.forEach((row) => {
        if (!row.city || !row.state) return;
        const key = `${row.city}, ${row.state}`;
        if (!cityGroups[key]) cityGroups[key] = { city: row.city, state: row.state, count: 0 };
        cityGroups[key].count += 1;
      });
      const topCitiesArr = Object.values(cityGroups)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
      setTopCities(topCitiesArr);

      // --- Most Submitted (from patient submissions — volume only) ---
      const procCounts = {};
      patientData.forEach((row) => {
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

      // --- Monthly trends (top 3 by provider_pricing count, label-filtered) ---
      const top3Procs = avgByProc.slice(0, 3).map((p) => p.name);
      setTrendProcedures(top3Procs);
      setSelectedTrendProc(top3Procs[0] || null);

      const monthMap = {};
      pricingData.forEach((row) => {
        const groupName = NEUROTOXINS.has(row.procedure_type) ? 'Botox' : row.procedure_type;
        if (!top3Procs.includes(groupName)) return;
        const expectedLabel = PRIMARY_LABEL[row.procedure_type];
        if (!expectedLabel || row.price_label !== expectedLabel) return;
        if (!row.created_at) return;
        const date = new Date(row.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthMap[monthKey]) monthMap[monthKey] = {};
        if (!monthMap[monthKey][groupName]) monthMap[monthKey][groupName] = [];
        monthMap[monthKey][groupName].push(Number(row.price));
      });

      const months = Object.keys(monthMap).sort().slice(-6);
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

  const surprisingFindings = useMemo(() => {
    const botoxPerUnit = pricingRows
      .filter((r) => NEUROTOXINS.has(r.procedure_type) && r.price_label === 'per_unit')
      .map((r) => Number(r.price))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (botoxPerUnit.length < MIN_SAMPLE_SIZE) return null;

    const min = Math.min(...botoxPerUnit);
    const max = Math.max(...botoxPerUnit);
    const multiplier = Math.round((max / min) * 10) / 10;
    return {
      multiplier: `${multiplier}×`,
      highest: `$${Math.round(max)}/unit`,
      lowest: `$${Math.round(min)}/unit`,
      count: botoxPerUnit.length,
    };
  }, [pricingRows]);

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
                          <span
                            style={{
                              fontFamily: 'var(--font-body)',
                              fontWeight: 400,
                              fontSize: '11px',
                              color: '#888',
                            }}
                          >
                            {entry.suffix}
                          </span>
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
                      Fair range: ${entry.p25.toLocaleString()}&ndash;${entry.p75.toLocaleString()}
                      {entry.suffix ? (
                        <span
                          style={{
                            fontFamily: 'var(--font-body)',
                            fontWeight: 300,
                            fontSize: '12px',
                            color: '#B8A89A',
                            marginLeft: '4px',
                          }}
                        >
                          {entry.suffix}
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
                      Based on {entry.count.toLocaleString()} real provider prices. If you're quoted well above this, shop around.
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
                { number: surprisingFindings.multiplier, label: 'Price spread for the same Botox product' },
                { number: surprisingFindings.highest, label: 'Highest per-unit price we found' },
                { number: surprisingFindings.lowest, label: 'Lowest per-unit price we found' },
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
              Price stats are based on provider-listed prices filtered by the correct
              unit (per unit, per syringe, per session). Only procedures with 20+
              data points are shown. Volume and city data comes from patient submissions.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

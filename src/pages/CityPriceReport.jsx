import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapPin, Calendar, ChevronDown, Clock, ShieldCheck, ArrowLeft, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { parseCitySlug } from '../lib/slugify';
import { fetchCityReport } from '../lib/cityReport';
import {
  getProviderPriceComparisons,
  getPriceDistribution,
  getDataFreshness,
} from '../lib/queries/prices';
import { applyCityReportMeta } from '../lib/seo';
import PriceTable from '../components/CityReport/PriceTable';
import NeighborhoodChart from '../components/CityReport/NeighborhoodChart';
import AffordableProviderCard from '../components/CityReport/AffordableProviderCard';
import ReportCardImage from '../components/CityReport/ReportCardImage';
import DataFreshnessNotice from '../components/CityReport/DataFreshnessNotice';
import ProviderPriceComparisonTable from '../components/CityReport/ProviderPriceComparisonTable';
import NeighborhoodBreakdown from '../components/CityReport/NeighborhoodBreakdown';
import PriceDistributionChart from '../components/CityReport/PriceDistributionChart';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatYearMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

function MetricCard({ label, value, sub, accent }) {
  return (
    <div className="p-4" style={{ borderRight: '1px solid #E8E8E8' }}>
      <p
        className="text-[10px] font-semibold uppercase text-text-secondary mb-2"
        style={{ letterSpacing: '0.12em' }}
      >
        {label}
      </p>
      <p
        className={`font-display leading-none ${accent ? 'text-hot-pink' : 'text-ink'}`}
        style={{
          fontWeight: 900,
          fontSize: accent ? 'clamp(18px, 2vw, 22px)' : 'clamp(24px, 3vw, 36px)',
          lineHeight: 1.05,
        }}
      >
        {value}
      </p>
      {sub != null && <div className="mt-2 text-[11px] text-text-secondary font-light">{sub}</div>}
    </div>
  );
}

function TrendChip({ trend }) {
  if (!trend || trend.direction === 'flat') {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase text-text-secondary"
        style={{ letterSpacing: '0.06em' }}
      >
        <Minus size={10} /> flat MoM
      </span>
    );
  }
  if (trend.direction === 'down') {
    return (
      <span
        className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase text-below-avg"
        style={{ letterSpacing: '0.06em' }}
      >
        <TrendingDown size={10} /> {trend.pct}% MoM
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase text-above-avg"
      style={{ letterSpacing: '0.06em' }}
    >
      <TrendingUp size={10} /> {trend.pct}% MoM
    </span>
  );
}

function trustTierBadge(tier) {
  if (!tier) return null;
  const tiers = {
    verified: { label: 'Verified', bg: '#F0FAF5', color: '#1A7A3A', border: '#1A7A3A' },
    receipt: { label: 'Receipt', bg: '#F5F2EE', color: '#666', border: '#E8E8E8' },
    self_reported: { label: 'Self-Reported', bg: '#F5F2EE', color: '#888', border: '#E8E8E8' },
  };
  const t = tiers[tier] || tiers.self_reported;
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase px-1.5 py-0.5"
      style={{
        letterSpacing: '0.06em',
        borderRadius: '4px',
        background: t.bg,
        color: t.color,
        border: `1px solid ${t.border}`,
      }}
    >
      {tier === 'verified' && <ShieldCheck size={9} />}
      {t.label}
    </span>
  );
}

export default function CityPriceReport() {
  const { citySlug: slugParam, yearMonth } = useParams();
  const navigate = useNavigate();
  const parsed = parseCitySlug(slugParam);

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [providerComparisons, setProviderComparisons] = useState(null);
  const [priceDistribution, setPriceDistribution] = useState(null);
  const [dataFreshness, setDataFreshness] = useState(null);

  const city = parsed?.city;
  const state = parsed?.state;

  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const displayMonth = yearMonth ? formatYearMonth(yearMonth) : formatYearMonth(currentYM);

  // SEO meta tags — driven by resolved report + freshness
  useEffect(() => {
    if (!city || !state || !report) return;
    const topProc = report.priceTable?.[0];
    const cleanup = applyCityReportMeta({
      city,
      state,
      slug: slugParam,
      yearMonth: yearMonth || currentYM,
      topProc: topProc?.procedure,
      topProcAvg: topProc?.avg,
      topProcSampleSize: topProc?.sampleSize,
      totalSubmissions: report.totalSubmissions,
      distinctProviders: dataFreshness?.distinctProviders,
      dataFreshness,
    });
    return cleanup;
  }, [city, state, report, dataFreshness, slugParam, yearMonth, currentYM]);

  // Phase A: fetch the legacy city report
  useEffect(() => {
    if (!city || !state) return;
    setLoading(true);
    setReport(null);
    setProviderComparisons(null);
    setPriceDistribution(null);
    setDataFreshness(null);
    fetchCityReport(city, state, yearMonth).then((data) => {
      setReport(data);
      setLoading(false);
    });
  }, [city, state, yearMonth]);

  // Phase B: once the report resolves, fetch the provider_pricing-derived data
  useEffect(() => {
    if (!city || !state || !report) return;
    let cancelled = false;
    const topProc = report.priceTable?.[0]?.procedure;
    if (!topProc) {
      setProviderComparisons([]);
      setPriceDistribution({ buckets: [], priceLabel: null, totalSamples: 0 });
    }
    Promise.all([
      topProc ? getProviderPriceComparisons(slugParam, topProc) : Promise.resolve([]),
      topProc
        ? getPriceDistribution(slugParam, topProc)
        : Promise.resolve({ buckets: [], priceLabel: null, totalSamples: 0 }),
      getDataFreshness(slugParam),
    ]).then(([comparisons, distribution, freshness]) => {
      if (cancelled) return;
      setProviderComparisons(comparisons);
      setPriceDistribution(distribution);
      setDataFreshness(freshness);
    });
    return () => {
      cancelled = true;
    };
  }, [city, state, report, slugParam]);

  if (!parsed) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <p className="font-display italic text-[18px] text-text-secondary mb-4">Invalid city URL.</p>
        <Link to="/prices" className="text-[10px] font-semibold uppercase text-hot-pink hover:text-hot-pink-dark" style={{ letterSpacing: '0.10em' }}>
          Browse all cities &rarr;
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse font-display italic text-hot-pink text-center text-[20px]">
          Loading prices for {city}, {state}...
        </div>
      </div>
    );
  }

  const topProc = report?.priceTable?.[0];

  return (
    <div className="bg-cream min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          to="/prices"
          className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-text-secondary hover:text-hot-pink mb-6 transition-colors"
          style={{ letterSpacing: '0.10em' }}
        >
          <ArrowLeft size={12} /> All Cities
        </Link>

        {/* Newspaper masthead */}
        <header className="mb-8" style={{ borderTop: '3px solid #111111', borderBottom: '1px solid #111111' }}>
          <div className="py-6">
            <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
              <p
                className="text-[11px] font-semibold uppercase text-hot-pink"
                style={{ letterSpacing: '0.18em' }}
              >
                The {city} Price Report
              </p>
              <p
                className="text-[10px] font-semibold uppercase text-text-secondary flex items-center gap-1"
                style={{ letterSpacing: '0.12em' }}
              >
                <Calendar size={10} />
                {displayMonth} &middot; Vol. {yearMonth || currentYM}
              </p>
            </div>
            <h1
              className="font-display text-ink mb-3"
              style={{
                fontWeight: 900,
                fontSize: 'clamp(40px, 7vw, 88px)',
                lineHeight: 0.96,
                letterSpacing: '-0.015em',
              }}
            >
              Cosmetic prices<br />
              in <span className="italic">{city}</span>,<br />
              {state}.
            </h1>
            <p className="editorial-deck max-w-2xl">
              {report.totalSubmissions} submission{report.totalSubmissions !== 1 ? 's' : ''} from real patients and public provider menus.
              {report.usingAllTime && ' All-time data (limited recent activity).'}
            </p>
          </div>
        </header>

        {/* Archive dropdown */}
        {report.archiveMonths.length > 1 && (
          <div className="mb-8">
            <p className="editorial-kicker mb-2">View another month</p>
            <div className="relative inline-block">
              <select
                value={yearMonth || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    navigate(`/prices/${slugParam}/${val}`);
                  } else {
                    navigate(`/prices/${slugParam}`);
                  }
                }}
                className="appearance-none pl-3 pr-8 py-2 text-[12px] text-ink bg-white focus:outline-none"
                style={{ border: '1px solid #111', borderRadius: '2px' }}
              >
                <option value="">Current</option>
                {report.archiveMonths.map((ym) => (
                  <option key={ym} value={ym}>{formatYearMonth(ym)}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink pointer-events-none" />
            </div>
          </div>
        )}

        {/* Section A — Newspaper stats grid */}
        {topProc && (
          <section className="mb-8">
            <div
              className="grid grid-cols-2 lg:grid-cols-4 bg-white"
              style={{ border: '1px solid #111111' }}
            >
              <MetricCard label="Top procedure" value={topProc.procedure} sub={`${topProc.sampleSize} data point${topProc.sampleSize === 1 ? '' : 's'}`} accent />
              <MetricCard label="Avg price" value={`$${topProc.avg.toLocaleString()}`} sub={topProc.trend ? <TrendChip trend={topProc.trend} /> : null} />
              <MetricCard label="Median" value={topProc.median != null ? `$${topProc.median.toLocaleString()}` : '—'} sub={`Range $${topProc.min.toLocaleString()}–$${topProc.max.toLocaleString()}`} />
              <MetricCard label="Sample size" value={`${report.totalSubmissions}`} sub={dataFreshness?.distinctProviders ? `${dataFreshness.distinctProviders} provider${dataFreshness.distinctProviders === 1 ? '' : 's'}` : 'patient + provider data'} />
            </div>
          </section>
        )}

        {/* Section E — Data freshness banner */}
        {dataFreshness && (
          <section className="mb-8">
            <DataFreshnessNotice freshness={dataFreshness} />
          </section>
        )}

        {/* Price table */}
        <section className="mb-10">
          <p className="editorial-kicker mb-2">The Numbers</p>
          <h2 className="editorial-headline mb-4" style={{ fontSize: 'clamp(24px, 3vw, 36px)' }}>
            Price comparison.
          </h2>
          <PriceTable rows={report.priceTable} />
        </section>

        {/* Provider chart (existing — provider averages from `procedures`) */}
        {report.providers.length >= 2 && (
          <section className="mb-10">
            <NeighborhoodChart data={report.providers} />
          </section>
        )}

        {/* Section B — Provider price comparison (from provider_pricing) */}
        {topProc && providerComparisons && providerComparisons.length > 0 && (
          <section className="mb-10">
            <p className="editorial-kicker mb-2">Head-to-Head</p>
            <h2 className="editorial-headline mb-1" style={{ fontSize: 'clamp(24px, 3vw, 36px)' }}>
              Who charges what for <span className="italic text-hot-pink">{topProc.procedure}</span>.
            </h2>
            <p className="text-[12px] text-text-secondary font-light mb-4">
              Each provider&apos;s lowest listed price, sorted low to high.
            </p>
            <ProviderPriceComparisonTable rows={providerComparisons} cityAvg={topProc.avg} />
          </section>
        )}

        {/* Section C — Neighborhood (ZIP) breakdown */}
        {topProc && (
          <section className="mb-10">
            <p className="editorial-kicker mb-2">By Neighborhood</p>
            <h2 className="editorial-headline mb-4" style={{ fontSize: 'clamp(24px, 3vw, 36px)' }}>
              Where in {city}.
            </h2>
            <NeighborhoodBreakdown citySlug={slugParam} procedureType={topProc.procedure} />
          </section>
        )}

        {/* Section D — Price distribution histogram */}
        {priceDistribution && priceDistribution.totalSamples >= 5 && (
          <section className="mb-10">
            <PriceDistributionChart distribution={priceDistribution} />
          </section>
        )}

        {/* Affordable providers */}
        {report.affordable.length > 0 && (
          <section className="mb-10">
            <p className="editorial-kicker mb-2">The Bargains</p>
            <h2 className="editorial-headline mb-4" style={{ fontSize: 'clamp(24px, 3vw, 36px)' }}>
              Most affordable providers.
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {report.affordable.map((p) => (
                <AffordableProviderCard key={p.name} provider={p} />
              ))}
            </div>
          </section>
        )}

        {/* Recent submissions */}
        {report.recent.length > 0 && (
          <section className="mb-10">
            <p className="editorial-kicker mb-2">Fresh Off the Receipt</p>
            <h2 className="editorial-headline mb-4" style={{ fontSize: 'clamp(24px, 3vw, 36px)' }}>
              Recent submissions.
            </h2>
            <div className="bg-white" style={{ border: '1px solid #111111' }}>
              {report.recent.map((r, i) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between px-4 py-3"
                  style={i > 0 ? { borderTop: '1px solid #E8E8E8' } : undefined}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-ink font-medium">{r.procedure}</p>
                    {r.units && (
                      <p className="text-[11px] text-text-secondary font-light mt-0.5">{r.units}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {trustTierBadge(r.trustTier)}
                    <p
                      className="font-display text-ink leading-none"
                      style={{ fontWeight: 900, fontSize: '18px' }}
                    >
                      ${r.price.toLocaleString()}
                    </p>
                    <span
                      className="text-[10px] font-semibold uppercase text-text-secondary inline-flex items-center gap-0.5"
                      style={{ letterSpacing: '0.06em' }}
                    >
                      <Clock size={10} />
                      {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Submit CTA — editorial dark block */}
        <section className="mb-10">
          <div
            className="bg-ink p-8 sm:p-12 text-center"
            style={{ borderTop: '2px solid #E8347A' }}
          >
            <p
              className="text-[10px] font-semibold uppercase text-hot-pink mb-3"
              style={{ letterSpacing: '0.18em' }}
            >
              Your turn
            </p>
            <h2
              className="font-display text-white mb-3"
              style={{ fontWeight: 900, fontSize: 'clamp(28px, 4vw, 48px)', lineHeight: 1.0 }}
            >
              Know a price in <span className="italic text-hot-pink">{city}</span>?
            </h2>
            <p
              className="text-[13px] font-light mb-6 max-w-md mx-auto"
              style={{ color: '#bbb' }}
            >
              Help others by sharing what you paid. It only takes 30 seconds.
            </p>
            <Link
              to={`/log?city=${encodeURIComponent(city)}&state=${state}`}
              className="btn-editorial btn-editorial-primary"
            >
              Add your price
            </Link>
          </div>
        </section>

        {/* Report card image */}
        {topProc && (
          <section className="mb-8 max-w-lg">
            <ReportCardImage
              city={city}
              state={state}
              topProcedure={topProc.procedure}
              avgPrice={topProc.avg}
              submissions={report.totalSubmissions}
              month={displayMonth}
            />
          </section>
        )}
      </div>
    </div>
  );
}

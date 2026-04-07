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
    <div className={`glow-card p-4 ${accent ? 'border-rose-accent/30' : ''}`}>
      <p className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">{label}</p>
      <p className={`mt-1 font-bold leading-tight ${accent ? 'text-rose-accent text-base lg:text-lg' : 'text-text-primary text-xl lg:text-2xl'}`}>
        {value}
      </p>
      {sub != null && <div className="mt-1 text-xs text-text-secondary">{sub}</div>}
    </div>
  );
}

function TrendChip({ trend }) {
  if (!trend || trend.direction === 'flat') {
    return <span className="inline-flex items-center gap-0.5 text-xs text-gray-400"><Minus size={11} /> flat MoM</span>;
  }
  if (trend.direction === 'down') {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-emerald-600">
        <TrendingDown size={11} /> {trend.pct}% MoM
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-red-500">
      <TrendingUp size={11} /> {trend.pct}% MoM
    </span>
  );
}

function trustTierBadge(tier) {
  if (!tier) return null;
  const tiers = {
    verified: { label: 'Verified', color: 'text-verified bg-verified/10' },
    receipt: { label: 'Receipt', color: 'text-blue-600 bg-blue-50' },
    self_reported: { label: 'Self-Reported', color: 'text-gray-500 bg-gray-100' },
  };
  const t = tiers[tier] || tiers.self_reported;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full ${t.color}`}>
      {tier === 'verified' && <ShieldCheck size={10} />}
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
        <p className="text-text-secondary mb-4">Invalid city URL.</p>
        <Link to="/prices" className="text-rose-accent hover:text-rose-dark font-medium">Browse all cities</Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse text-rose-accent text-center text-lg">
          Loading prices for {city}, {state}...
        </div>
      </div>
    );
  }

  const topProc = report?.priceTable?.[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <Link to="/prices" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-rose-accent mb-4 transition-colors">
        <ArrowLeft size={14} /> All Cities
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-primary flex items-center gap-2">
          <MapPin size={24} className="text-rose-accent" />
          Cosmetic Prices in {city}, {state}
        </h1>
        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-text-secondary">
          <span className="inline-flex items-center gap-1">
            <Calendar size={14} /> {displayMonth}
          </span>
          <span>{report.totalSubmissions} submission{report.totalSubmissions !== 1 ? 's' : ''}</span>
          {report.usingAllTime && (
            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">All-time data (limited recent activity)</span>
          )}
        </div>
      </div>

      {/* Archive dropdown */}
      {report.archiveMonths.length > 1 && (
        <div className="mb-6">
          <label className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-1 block">View another month</label>
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
              className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-accent/50"
            >
              <option value="">Current</option>
              {report.archiveMonths.map((ym) => (
                <option key={ym} value={ym}>{formatYearMonth(ym)}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none" />
          </div>
        </div>
      )}

      {/* Section A — City header metric cards */}
      {topProc && (
        <section className="mb-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
      <section className="mb-8">
        <h2 className="text-xl font-bold text-text-primary mb-3">Price Comparison</h2>
        <PriceTable rows={report.priceTable} />
      </section>

      {/* Provider chart (existing — provider averages from `procedures`) */}
      {report.providers.length >= 2 && (
        <section className="mb-8">
          <NeighborhoodChart data={report.providers} />
        </section>
      )}

      {/* Section B — Provider price comparison (from provider_pricing) */}
      {topProc && providerComparisons && providerComparisons.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-text-primary mb-1">
            Provider Price Comparison: {topProc.procedure}
          </h2>
          <p className="text-sm text-text-secondary mb-3">
            Each provider&apos;s lowest listed price for {topProc.procedure}, sorted lowest to highest.
          </p>
          <ProviderPriceComparisonTable rows={providerComparisons} cityAvg={topProc.avg} />
        </section>
      )}

      {/* Section C — Neighborhood (ZIP) breakdown */}
      {topProc && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-text-primary mb-3">Neighborhood Breakdown</h2>
          <NeighborhoodBreakdown citySlug={slugParam} procedureType={topProc.procedure} />
        </section>
      )}

      {/* Section D — Price distribution histogram */}
      {priceDistribution && priceDistribution.totalSamples >= 5 && (
        <section className="mb-8">
          <PriceDistributionChart distribution={priceDistribution} />
        </section>
      )}

      {/* Affordable providers */}
      {report.affordable.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-text-primary mb-3">Most Affordable Providers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {report.affordable.map((p) => (
              <AffordableProviderCard key={p.name} provider={p} />
            ))}
          </div>
        </section>
      )}

      {/* Recent submissions */}
      {report.recent.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-text-primary mb-3">Recent Submissions</h2>
          <div className="glow-card divide-y divide-gray-50">
            {report.recent.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="font-medium text-text-primary text-sm">{r.procedure}</span>
                  {r.units && <span className="text-xs text-text-secondary ml-2">{r.units}</span>}
                </div>
                <div className="flex items-center gap-3">
                  {trustTierBadge(r.trustTier)}
                  <span className="font-semibold text-text-primary text-sm">${r.price.toLocaleString()}</span>
                  <span className="text-xs text-text-secondary inline-flex items-center gap-0.5">
                    <Clock size={10} />
                    {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Submit CTA */}
      <section className="mb-8">
        <div className="glow-card p-6 text-center bg-gradient-to-br from-rose-light/30 to-white">
          <h2 className="text-xl font-bold text-text-primary mb-2">Know a price in {city}?</h2>
          <p className="text-sm text-text-secondary mb-4">Help others by sharing what you paid. It only takes 30 seconds.</p>
          <Link
            to={`/log?city=${encodeURIComponent(city)}&state=${state}`}
            className="inline-block px-6 py-3 bg-rose-accent text-white font-medium rounded-xl hover:bg-rose-dark transition-colors"
          >
            Add Your Price
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
  );
}

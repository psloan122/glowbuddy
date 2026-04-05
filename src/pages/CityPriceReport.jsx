import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapPin, Calendar, ChevronDown, Clock, ShieldCheck, ArrowLeft } from 'lucide-react';
import { parseCitySlug } from '../lib/slugify';
import { fetchCityReport } from '../lib/cityReport';
import PriceTable from '../components/CityReport/PriceTable';
import NeighborhoodChart from '../components/CityReport/NeighborhoodChart';
import AffordableProviderCard from '../components/CityReport/AffordableProviderCard';
import ReportCardImage from '../components/CityReport/ReportCardImage';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatYearMonth(ym) {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
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

  const city = parsed?.city;
  const state = parsed?.state;

  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const displayMonth = yearMonth ? formatYearMonth(yearMonth) : formatYearMonth(currentYM);

  // SEO meta tags
  useEffect(() => {
    if (!city || !state) return;
    const topProc = report?.priceTable?.[0]?.procedure || 'Botox, Filler & Facial';
    const count = report?.totalSubmissions || 0;

    document.title = `${topProc} Prices in ${city}, ${state} \u2014 ${displayMonth} | GlowBuddy`;

    const desc = `Compare real ${topProc.toLowerCase()} prices in ${city}, ${state}. ${count} patient-reported prices. Updated ${displayMonth}.`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute('content', desc);
    } else {
      const newMeta = document.createElement('meta');
      newMeta.name = 'description';
      newMeta.content = desc;
      document.head.appendChild(newMeta);
    }

    // JSON-LD
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'city-report-jsonld';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: `Cosmetic Prices in ${city}, ${state}`,
      description: desc,
      url: `https://glowbuddy.com/prices/${slugParam}`,
      temporalCoverage: yearMonth || currentYM,
      spatialCoverage: { '@type': 'Place', name: `${city}, ${state}` },
      creator: { '@type': 'Organization', name: 'GlowBuddy' },
    });
    document.head.appendChild(script);

    return () => {
      const el = document.getElementById('city-report-jsonld');
      if (el) el.remove();
    };
  }, [city, state, report, displayMonth, slugParam, yearMonth, currentYM]);

  // Fetch data
  useEffect(() => {
    if (!city || !state) return;
    setLoading(true);
    fetchCityReport(city, state, yearMonth).then((data) => {
      setReport(data);
      setLoading(false);
    });
  }, [city, state, yearMonth]);

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

      {/* Price table */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-text-primary mb-3">Price Comparison</h2>
        <PriceTable rows={report.priceTable} />
      </section>

      {/* Provider chart */}
      {report.providers.length >= 2 && (
        <section className="mb-8">
          <NeighborhoodChart data={report.providers} />
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

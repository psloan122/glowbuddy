import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Search, BarChart3, ShieldCheck, Globe } from 'lucide-react';
import { fetchCityList } from '../lib/cityReport';
import { getGlobalPricingSummary, fetchVerifiedPriceCountsByCity } from '../lib/queries/prices';

function GlobalMetricCard({ icon, label, value }) {
  return (
    <div className="glow-card p-4">
      <div className="flex items-center gap-2 text-text-secondary text-[11px] uppercase tracking-wide font-medium">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-2xl font-bold text-text-primary">{value}</p>
    </div>
  );
}

export default function CityPriceIndex() {
  const [cities, setCities] = useState([]);
  const [verifiedByCity, setVerifiedByCity] = useState({});
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // SEO
  useEffect(() => {
    document.title = 'Compare Real Cosmetic Prices by City | GlowBuddy';
    const meta = document.querySelector('meta[name="description"]');
    const desc = 'Browse real patient-reported cosmetic procedure prices by city. Compare Botox, filler, and facial prices near you on GlowBuddy.';
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
    script.id = 'city-index-jsonld';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: 'GlowBuddy City Price Reports',
      description: 'Patient-reported cosmetic procedure prices by city across the United States.',
      url: 'https://glowbuddy.com/prices',
      creator: { '@type': 'Organization', name: 'GlowBuddy' },
    });
    document.head.appendChild(script);

    return () => {
      const el = document.getElementById('city-index-jsonld');
      if (el) el.remove();
    };
  }, []);

  useEffect(() => {
    Promise.all([
      fetchCityList(),
      fetchVerifiedPriceCountsByCity(),
      getGlobalPricingSummary(),
    ]).then(([cityList, verifiedCounts, globalSummary]) => {
      setCities(cityList);
      setVerifiedByCity(verifiedCounts);
      setSummary(globalSummary);
      setLoading(false);
    });
  }, []);

  const filtered = search
    ? cities.filter((c) =>
        `${c.city} ${c.state}`.toLowerCase().includes(search.toLowerCase())
      )
    : cities;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse text-rose-accent text-center text-lg">Loading cities...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Cosmetic Prices by City</h1>
        <p className="text-text-secondary">
          Browse real, patient-reported prices for Botox, fillers, facials, and more in cities across the US.
        </p>
      </div>

      {/* Global metric cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <GlobalMetricCard
            icon={<MapPin size={12} />}
            label="Cities tracked"
            value={summary.totalCities.toLocaleString()}
          />
          <GlobalMetricCard
            icon={<BarChart3 size={12} />}
            label="Total prices"
            value={summary.totalSubmissions.toLocaleString()}
          />
          <GlobalMetricCard
            icon={<ShieldCheck size={12} />}
            label="Verified"
            value={summary.totalVerifiedPrices.toLocaleString()}
          />
          <GlobalMetricCard
            icon={<Globe size={12} />}
            label="Public menus"
            value={summary.totalScrapedPrices.toLocaleString()}
          />
        </div>
      )}

      {/* Search */}
      <div className="relative mb-8 max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search cities..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-accent/50"
        />
      </div>

      {/* City grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const verifiedKey = `${c.city.toLowerCase()}|${c.state.toUpperCase()}`;
            const verifiedCount = verifiedByCity[verifiedKey] || 0;
            return (
              <Link
                key={c.slug}
                to={`/prices/${c.slug}`}
                className="glow-card p-5 hover:shadow-md transition-shadow hover:no-underline"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-text-primary flex items-center gap-1.5">
                      <MapPin size={16} className="text-rose-accent shrink-0" />
                      {c.city}, {c.state}
                    </h2>
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary bg-gray-100 px-2 py-1 rounded-full">
                    <BarChart3 size={12} />
                    {c.count}
                  </span>
                </div>
                <p className="text-sm text-text-secondary mt-2">
                  {c.count} patient-reported price{c.count !== 1 ? 's' : ''}
                </p>
                {verifiedCount > 0 && (
                  <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-verified bg-verified/10 px-2 py-0.5 rounded-full">
                    <ShieldCheck size={11} />
                    {verifiedCount} verified price{verifiedCount === 1 ? '' : 's'}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="glow-card p-8 text-center">
          <p className="text-text-secondary">
            {search ? `No cities found matching "${search}".` : 'No cities with enough data yet.'}
          </p>
        </div>
      )}
    </div>
  );
}

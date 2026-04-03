import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ShieldCheck, Users, TrendingDown, TrendingUp, BarChart3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { slugToProcedure, PROVIDER_TYPES, US_STATES } from '../lib/constants';
import ProcedureCard from '../components/ProcedureCard';

export default function ProcedureDetail() {
  const { slug } = useParams();
  const procedureName = slugToProcedure(slug);

  const [communityData, setCommunityData] = useState([]);
  const [verifiedData, setVerifiedData] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('community');
  const [stateFilter, setStateFilter] = useState('');
  const [providerTypeFilter, setProviderTypeFilter] = useState('');
  const [dateRange, setDateRange] = useState('');

  // SEO
  useEffect(() => {
    document.title = `${procedureName} Prices Near You | GlowBuddy`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        'content',
        `Compare real ${procedureName} prices from patients and verified providers. See averages, lowest, and highest prices near you on GlowBuddy.`
      );
    } else {
      const newMeta = document.createElement('meta');
      newMeta.name = 'description';
      newMeta.content = `Compare real ${procedureName} prices from patients and verified providers. See averages, lowest, and highest prices near you on GlowBuddy.`;
      document.head.appendChild(newMeta);
    }
  }, [procedureName]);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // Fetch community submissions
      const { data: community } = await supabase
        .from('procedures')
        .select('*')
        .eq('procedure_type', procedureName)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      // Fetch verified pricing with provider info
      const { data: verified } = await supabase
        .from('provider_pricing')
        .select('*, providers(*)')
        .eq('procedure_type', procedureName);

      const communityItems = community || [];
      const verifiedItems = verified || [];

      setCommunityData(communityItems);
      setVerifiedData(verifiedItems);

      // Compute stats
      const communityPrices = communityItems
        .map((p) => Number(p.price_paid))
        .filter((p) => p > 0);
      const verifiedPrices = verifiedItems
        .map((p) => Number(p.price))
        .filter((p) => p > 0);
      const allPrices = [...communityPrices, ...verifiedPrices];

      const avg = (arr) =>
        arr.length > 0
          ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
          : null;

      // Compute avg per unit if applicable
      let avgPerUnit = null;
      const isUnitBased =
        procedureName.toLowerCase().includes('botox') ||
        procedureName.toLowerCase().includes('filler');
      if (isUnitBased) {
        const withUnits = communityItems.filter(
          (p) => p.units_or_volume && /^\d+/.test(p.units_or_volume) && Number(p.price_paid) > 0
        );
        if (withUnits.length > 0) {
          const perUnits = withUnits.map(
            (p) => Number(p.price_paid) / parseInt(p.units_or_volume, 10)
          );
          avgPerUnit = Math.round(
            perUnits.reduce((a, b) => a + b, 0) / perUnits.length
          );
        }
      }

      setStats({
        avgCommunity: avg(communityPrices),
        avgVerified: avg(verifiedPrices),
        lowest: allPrices.length > 0 ? Math.min(...allPrices) : null,
        highest: allPrices.length > 0 ? Math.max(...allPrices) : null,
        totalCount: communityItems.length + verifiedItems.length,
        avgPerUnit,
        isUnitBased,
      });

      setLoading(false);
    }

    fetchData();
  }, [procedureName]);

  // Apply filters
  function getFilteredCommunity() {
    let filtered = communityData;
    if (stateFilter) {
      filtered = filtered.filter((p) => p.state === stateFilter);
    }
    if (providerTypeFilter) {
      filtered = filtered.filter(
        (p) => p.provider_type === providerTypeFilter
      );
    }
    if (dateRange) {
      const now = new Date();
      const daysAgo = new Date(
        now.getTime() - Number(dateRange) * 24 * 60 * 60 * 1000
      );
      filtered = filtered.filter((p) => new Date(p.created_at) >= daysAgo);
    }
    return filtered;
  }

  function getFilteredVerified() {
    let filtered = verifiedData;
    if (stateFilter) {
      filtered = filtered.filter(
        (p) => p.providers?.state === stateFilter
      );
    }
    if (providerTypeFilter) {
      filtered = filtered.filter(
        (p) => p.providers?.provider_type === providerTypeFilter
      );
    }
    return filtered;
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse text-rose-accent text-center text-lg">
          Loading {procedureName} prices...
        </div>
      </div>
    );
  }

  const filteredCommunity = getFilteredCommunity();
  const filteredVerified = getFilteredVerified();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Heading */}
      <h1 className="text-3xl font-bold text-text-primary mb-6">
        {procedureName} Prices
      </h1>

      {/* Price Stats Card */}
      {stats && (
        <div className="glow-card p-6 mb-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <div>
              <span className="text-xs uppercase tracking-wide text-text-secondary">
                Avg Patient-Reported Price
              </span>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {stats.avgCommunity != null
                  ? `$${stats.avgCommunity.toLocaleString()}`
                  : '--'}
              </p>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wide text-text-secondary">
                Avg Provider-Listed Price
              </span>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {stats.avgVerified != null
                  ? `$${stats.avgVerified.toLocaleString()}`
                  : '--'}
              </p>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wide text-text-secondary">
                Lowest
              </span>
              <p className="text-2xl font-bold text-verified mt-1 flex items-center gap-1">
                {stats.lowest != null ? (
                  <>
                    <TrendingDown size={18} />$
                    {stats.lowest.toLocaleString()}
                  </>
                ) : (
                  '--'
                )}
              </p>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wide text-text-secondary">
                Highest
              </span>
              <p className="text-2xl font-bold text-rose-dark mt-1 flex items-center gap-1">
                {stats.highest != null ? (
                  <>
                    <TrendingUp size={18} />$
                    {stats.highest.toLocaleString()}
                  </>
                ) : (
                  '--'
                )}
              </p>
            </div>
            <div>
              <span className="text-xs uppercase tracking-wide text-text-secondary">
                Total Submissions
              </span>
              <p className="text-2xl font-bold text-text-primary mt-1 flex items-center gap-1">
                <BarChart3 size={18} />
                {stats.totalCount.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Avg per unit */}
          {stats.isUnitBased && stats.avgPerUnit != null && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <span className="text-xs uppercase tracking-wide text-text-secondary">
                Avg Per Unit
              </span>
              <p className="text-xl font-bold text-text-primary mt-1">
                ${stats.avgPerUnit.toLocaleString()} / unit
              </p>
            </div>
          )}
        </div>
      )}

      {/* Toggle */}
      <div className="flex gap-0 mb-6">
        <button
          onClick={() => setActiveTab('community')}
          className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-l-xl transition-colors ${
            activeTab === 'community'
              ? 'bg-rose-accent text-white'
              : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
          }`}
        >
          <Users size={16} />
          Patient Reported
        </button>
        <button
          onClick={() => setActiveTab('verified')}
          className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-r-xl transition-colors ${
            activeTab === 'verified'
              ? 'bg-rose-accent text-white'
              : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
          }`}
        >
          <ShieldCheck size={16} />
          Provider-Listed Prices
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-accent/50"
        >
          <option value="">All States</option>
          {US_STATES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          value={providerTypeFilter}
          onChange={(e) => setProviderTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-accent/50"
        >
          <option value="">All Provider Types</option>
          {PROVIDER_TYPES.map((pt) => (
            <option key={pt} value={pt}>
              {pt}
            </option>
          ))}
        </select>

        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-accent/50"
        >
          <option value="">All Time</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
          <option value="365">Last Year</option>
        </select>
      </div>

      {/* Cards */}
      {activeTab === 'community' ? (
        filteredCommunity.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCommunity.map((procedure) => (
              <ProcedureCard
                key={procedure.id}
                procedure={procedure}
              />
            ))}
          </div>
        ) : (
          <div className="glow-card p-8 text-center">
            <p className="text-text-secondary mb-4">
              No prices reported yet for {procedureName}. Be the first!
            </p>
            <Link
              to="/log"
              className="inline-block px-6 py-3 bg-rose-accent text-white font-medium rounded-xl hover:bg-rose-dark transition-colors"
            >
              Log a Treatment
            </Link>
          </div>
        )
      ) : filteredVerified.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVerified.map((item) => (
            <Link
              key={item.id}
              to={`/provider/${item.providers?.slug}`}
              className="block glow-card p-5 hover:no-underline"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-1 text-xs font-medium text-verified bg-verified/10 px-2 py-0.5 rounded-full">
                  <ShieldCheck size={14} />
                  Provider-listed price
                </span>
              </div>

              <h3 className="text-lg font-bold text-text-primary mb-1">
                {item.providers?.name || 'Provider'}
              </h3>

              {item.providers?.city && item.providers?.state && (
                <p className="text-sm text-text-secondary mb-3">
                  {item.providers.city}, {item.providers.state}
                </p>
              )}

              <div className="price-display mb-2">
                ${Number(item.price).toLocaleString()}
              </div>

              {item.price_label && (
                <p className="text-sm text-text-secondary mb-1">
                  {item.price_label}
                </p>
              )}

              {item.units_or_volume && (
                <p className="text-sm text-text-secondary">
                  {item.units_or_volume}
                </p>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="glow-card p-8 text-center">
          <p className="text-text-secondary mb-4">
            No verified prices yet for {procedureName}. Be the first!
          </p>
          <Link
            to="/log"
            className="inline-block px-6 py-3 bg-rose-accent text-white font-medium rounded-xl hover:bg-rose-dark transition-colors"
          >
            Log a Treatment
          </Link>
        </div>
      )}
    </div>
  );
}

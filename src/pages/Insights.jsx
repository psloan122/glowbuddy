import { useState, useEffect } from 'react';
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
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';

const COLORS = ['#F4A7B9', '#8B5CF6', '#10B981', '#F59E0B', '#3B82F6'];

const dollarFormatter = (value) => `$${Number(value).toLocaleString()}`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white rounded-lg shadow px-4 py-2">
      <p className="text-sm font-medium text-text-primary mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm" style={{ color: entry.color || entry.stroke }}>
          {entry.name}: ${Number(entry.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
};

const CountTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white rounded-lg shadow px-4 py-2">
      <p className="text-sm font-medium text-text-primary mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
};

const RADIAN = Math.PI / 180;
const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  const radius = outerRadius + 30;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.03) return null;
  return (
    <text
      x={x}
      y={y}
      fill="#1A1A2E"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-xs"
    >
      {name} ({(percent * 100).toFixed(0)}%)
    </text>
  );
};

export default function Insights() {
  const [loading, setLoading] = useState(true);
  const [avgByProcedure, setAvgByProcedure] = useState([]);
  const [avgByProviderType, setAvgByProviderType] = useState([]);
  const [topCities, setTopCities] = useState([]);
  const [mostSubmitted, setMostSubmitted] = useState([]);
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [trendProcedures, setTrendProcedures] = useState([]);
  const [avgRatingByProvType, setAvgRatingByProvType] = useState([]);
  const [ratingVsPrice, setRatingVsPrice] = useState([]);
  const [trustBreakdown, setTrustBreakdown] = useState([]);

  useEffect(() => {
    document.title = 'Price Insights & Trends | GlowBuddy';
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const { data, error } = await supabase
        .from('procedures')
        .select('procedure_type, provider_type, city, state, price_paid, created_at, rating')
        .eq('status', 'active');

      if (error || !data) {
        setLoading(false);
        return;
      }

      // --- Average by Procedure ---
      const procGroups = {};
      data.forEach((row) => {
        const key = row.procedure_type;
        if (!key) return;
        if (!procGroups[key]) procGroups[key] = [];
        procGroups[key].push(row.price_paid);
      });

      const avgByProc = Object.entries(procGroups)
        .map(([name, prices]) => ({
          name,
          avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
        }))
        .sort((a, b) => b.avgPrice - a.avgPrice);
      setAvgByProcedure(avgByProc);

      // --- Average by Provider Type ---
      const provGroups = {};
      data.forEach((row) => {
        const key = row.provider_type;
        if (!key) return;
        if (!provGroups[key]) provGroups[key] = [];
        provGroups[key].push(row.price_paid);
      });

      const avgByProv = Object.entries(provGroups)
        .map(([name, prices]) => ({
          name,
          avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
        }))
        .sort((a, b) => b.avgPrice - a.avgPrice);
      setAvgByProviderType(avgByProv);

      // --- Top 10 Cities ---
      const cityGroups = {};
      data.forEach((row) => {
        if (!row.city || !row.state) return;
        const key = `${row.city}, ${row.state}`;
        cityGroups[key] = (cityGroups[key] || 0) + 1;
      });

      const topCitiesArr = Object.entries(cityGroups)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      setTopCities(topCitiesArr);

      // --- Most Submitted Procedures ---
      const procCounts = {};
      data.forEach((row) => {
        const key = row.procedure_type;
        if (!key) return;
        procCounts[key] = (procCounts[key] || 0) + 1;
      });

      const mostSub = Object.entries(procCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
      setMostSubmitted(mostSub);

      // --- Monthly Trends (top 3 procedures) ---
      const top3Procs = mostSub.slice(0, 3).map((p) => p.name);
      setTrendProcedures(top3Procs);

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
        monthMap[monthKey][row.procedure_type].push(row.price_paid);
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

      // --- Average Rating by Provider Type ---
      const ratingByProv = {};
      data.forEach((row) => {
        if (!row.provider_type || !row.rating) return;
        if (!ratingByProv[row.provider_type]) ratingByProv[row.provider_type] = [];
        ratingByProv[row.provider_type].push(row.rating);
      });

      const avgRatingByProv = Object.entries(ratingByProv)
        .map(([name, ratings]) => ({
          name,
          avgRating: Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10,
          count: ratings.length,
        }))
        .filter((x) => x.count >= 2)
        .sort((a, b) => b.avgRating - a.avgRating);
      setAvgRatingByProvType(avgRatingByProv);

      // --- Rating vs Price scatter ---
      const scatter = data
        .filter((row) => row.rating && row.price_paid)
        .map((row) => ({
          rating: row.rating,
          price: row.price_paid,
          procedure: row.procedure_type,
        }));
      setRatingVsPrice(scatter);

      // --- Trust breakdown from reviews ---
      const { data: reviewData } = await supabase
        .from('reviews')
        .select('trust_tier')
        .eq('status', 'active');

      if (reviewData && reviewData.length > 0) {
        const tierCounts = { receipt_verified: 0, has_photo: 0, unverified: 0 };
        reviewData.forEach((r) => {
          const tier = r.trust_tier || 'unverified';
          if (tier === 'receipt_verified' || tier === 'receipt_and_photo') {
            tierCounts.receipt_verified++;
          } else if (tier === 'has_photo') {
            tierCounts.has_photo++;
          } else {
            tierCounts.unverified++;
          }
        });

        const breakdown = [];
        if (tierCounts.receipt_verified > 0)
          breakdown.push({ name: 'Receipt Verified', value: tierCounts.receipt_verified });
        if (tierCounts.has_photo > 0)
          breakdown.push({ name: 'Photo Reviews', value: tierCounts.has_photo });
        if (tierCounts.unverified > 0)
          breakdown.push({ name: 'Unverified', value: tierCounts.unverified });
        setTrustBreakdown(breakdown);
      }

      setLoading(false);
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <p className="text-center text-text-secondary animate-pulse text-lg">
          Loading insights...
        </p>
      </div>
    );
  }

  const lineColors = ['#F4A7B9', '#8B5CF6', '#10B981'];

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-extrabold text-text-primary mb-2">Price Insights</h1>
      <p className="text-lg text-text-secondary mb-10">
        Explore crowdsourced pricing trends across the country.
      </p>

      {/* Chart 1: Average Price by Procedure */}
      <div className="glow-card p-6 mb-8">
        <h2 className="text-2xl font-bold text-text-primary mb-6">
          Average Price by Procedure
        </h2>
        {avgByProcedure.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={avgByProcedure}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <XAxis
                type="number"
                tickFormatter={dollarFormatter}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={180}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="avgPrice"
                name="Avg Price"
                fill="#F4A7B9"
                barSize={20}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-text-secondary text-center py-8">No procedure data yet.</p>
        )}
      </div>

      {/* Chart 2: Price by Provider Type */}
      <div className="glow-card p-6 mb-8">
        <h2 className="text-2xl font-bold text-text-primary mb-6">
          Average Price by Provider Type
        </h2>
        {avgByProviderType.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={avgByProviderType}
              margin={{ top: 5, right: 30, left: 10, bottom: 30 }}
            >
              <XAxis
                dataKey="name"
                angle={-20}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 11 }}
              />
              <YAxis tickFormatter={dollarFormatter} tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="avgPrice"
                name="Avg Price"
                fill="#8B5CF6"
                barSize={40}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-text-secondary text-center py-8">No provider data yet.</p>
        )}
      </div>

      {/* Chart 3: Top 10 Cities by Submissions */}
      <div className="glow-card p-6 mb-8">
        <h2 className="text-2xl font-bold text-text-primary mb-6">
          Top Cities by Volume
        </h2>
        {topCities.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={topCities}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={180}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CountTooltip />} />
              <Bar
                dataKey="count"
                name="Submissions"
                fill="#10B981"
                barSize={20}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-text-secondary text-center py-8">No city data yet.</p>
        )}
      </div>

      {/* Chart 4: National Price Trends Over Time */}
      <div className="glow-card p-6 mb-8">
        <h2 className="text-2xl font-bold text-text-primary mb-6">
          Price Trends Over Time
        </h2>
        {monthlyTrends.length >= 2 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={monthlyTrends}
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={dollarFormatter} tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="bottom" />
              {trendProcedures.map((proc, i) => (
                <Line
                  key={proc}
                  type="monotone"
                  dataKey={proc}
                  name={proc}
                  stroke={lineColors[i % lineColors.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-text-secondary text-center py-8">
            Not enough data for trends yet.
          </p>
        )}
      </div>

      {/* Chart 5: Most Logged Procedures (Pie) */}
      <div className="glow-card p-6 mb-8">
        <h2 className="text-2xl font-bold text-text-primary mb-6">
          Most Submitted Procedures
        </h2>
        {mostSubmitted.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={mostSubmitted}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={130}
                label={renderPieLabel}
              >
                {mostSubmitted.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CountTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-text-secondary text-center py-8">No submission data yet.</p>
        )}
      </div>

      {/* Chart 6: Average Rating by Provider Type */}
      {avgRatingByProvType.length > 0 && (
        <div className="glow-card p-6 mb-8">
          <h2 className="text-2xl font-bold text-text-primary mb-6">
            Average Rating by Provider Type
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={avgRatingByProvType}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={180}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-white rounded-lg shadow px-4 py-2">
                      <p className="text-sm font-medium text-text-primary mb-1">{label}</p>
                      <p className="text-sm" style={{ color: payload[0].color }}>
                        Avg Rating: {payload[0].value} ({payload[0].payload.count} reviews)
                      </p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="avgRating"
                name="Avg Rating"
                fill="#F59E0B"
                barSize={20}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Chart 7: Rating vs Price */}
      {ratingVsPrice.length >= 5 && (
        <div className="glow-card p-6 mb-8">
          <h2 className="text-2xl font-bold text-text-primary mb-6">
            Rating vs Price
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
              <XAxis
                type="number"
                dataKey="rating"
                name="Rating"
                domain={[1, 5]}
                tick={{ fontSize: 12 }}
                label={{ value: 'Rating', position: 'bottom', fontSize: 12 }}
              />
              <YAxis
                type="number"
                dataKey="price"
                name="Price"
                tickFormatter={dollarFormatter}
                tick={{ fontSize: 12 }}
                label={{ value: 'Price', angle: -90, position: 'insideLeft', fontSize: 12 }}
              />
              <ZAxis range={[30, 30]} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white rounded-lg shadow px-4 py-2">
                      <p className="text-sm font-medium text-text-primary">{d.procedure}</p>
                      <p className="text-sm text-text-secondary">
                        {d.rating} stars &middot; ${Number(d.price).toLocaleString()}
                      </p>
                    </div>
                  );
                }}
              />
              <Scatter data={ratingVsPrice} fill="#F4A7B9" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Chart 8: Trust Breakdown Donut */}
      {trustBreakdown.length > 0 && (
        <div className="glow-card p-6 mb-8">
          <h2 className="text-2xl font-bold text-text-primary mb-2">
            Review Quality Across GlowBuddy
          </h2>
          <p className="text-sm text-text-secondary mb-6">
            Higher verified percentages mean more trustworthy data.
          </p>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={trustBreakdown}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={120}
                label={renderPieLabel}
              >
                {trustBreakdown.map((entry, index) => {
                  const trustColors = ['#10B981', '#3B82F6', '#9CA3AF'];
                  return (
                    <Cell key={`trust-${index}`} fill={trustColors[index % trustColors.length]} />
                  );
                })}
              </Pie>
              <Tooltip content={<CountTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Footer note */}
      <p className="italic text-sm text-text-secondary text-center">
        All data is crowdsourced and self-reported. Provider-listed prices are submitted by providers.
      </p>
    </div>
  );
}

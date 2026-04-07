import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function PriceDistributionChart({ distribution }) {
  if (!distribution || distribution.totalSamples < 5) return null;
  if (!distribution.buckets?.length) return null;

  return (
    <div className="glow-card p-6">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-lg font-bold text-text-primary">Price Distribution</h3>
        <p className="text-xs text-text-secondary">
          {distribution.totalSamples} data points · {distribution.priceLabel}
        </p>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(220, distribution.buckets.length * 36)}>
        <BarChart data={distribution.buckets} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-15}
            textAnchor="end"
            height={50}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip
            formatter={(value) => [`${value} provider${value === 1 ? '' : 's'}`, 'Count']}
            contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6', fontSize: '13px' }}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {distribution.buckets.map((_, i) => (
              <Cell key={i} fill={i === Math.floor(distribution.buckets.length / 2) ? '#C94F78' : '#E8A0B8'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-text-secondary mt-2 italic">
        Histogram is grouped within a single price label ({distribution.priceLabel}) — prices in
        other units are not blended in.
      </p>
    </div>
  );
}

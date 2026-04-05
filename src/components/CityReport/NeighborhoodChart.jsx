import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function NeighborhoodChart({ data }) {
  if (!data || data.length < 2) return null;

  return (
    <div className="glow-card p-6">
      <h3 className="text-lg font-bold text-text-primary mb-4">Average Price by Provider</h3>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
          <XAxis
            type="number"
            tickFormatter={(v) => `$${v}`}
            tick={{ fontSize: 12, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={140}
            tick={{ fontSize: 12, fill: '#374151' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => [`$${value.toLocaleString()}`, 'Avg Price']}
            contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6', fontSize: '13px' }}
          />
          <Bar dataKey="avgPrice" radius={[0, 6, 6, 0]} maxBarSize={28}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === 0 ? '#C94F78' : '#E8A0B8'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

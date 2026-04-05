import { Link } from 'react-router-dom';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { procedureToSlug } from '../../lib/constants';

function TrendBadge({ trend }) {
  if (!trend || trend.direction === 'flat') {
    return <span className="inline-flex items-center gap-0.5 text-xs text-gray-400"><Minus size={12} /> --</span>;
  }
  if (trend.direction === 'down') {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-emerald-600">
        <TrendingDown size={12} /> {trend.pct}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-red-500">
      <TrendingUp size={12} /> {trend.pct}%
    </span>
  );
}

export default function PriceTable({ rows }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="glow-card p-6 text-center text-text-secondary">
        No price data available yet for this city.
      </div>
    );
  }

  return (
    <div className="glow-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wide">Procedure</th>
            <th className="text-right px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wide">Avg</th>
            <th className="text-right px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wide hidden sm:table-cell">Median</th>
            <th className="text-right px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wide hidden md:table-cell">Range</th>
            <th className="text-right px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wide">Count</th>
            <th className="text-right px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wide">Trend</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.procedure} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
              <td className="px-4 py-3">
                <Link
                  to={`/procedure/${procedureToSlug(row.procedure)}`}
                  className="font-medium text-text-primary hover:text-rose-accent transition-colors"
                >
                  {row.procedure}
                </Link>
              </td>
              <td className="text-right px-4 py-3 font-semibold text-text-primary">${row.avg.toLocaleString()}</td>
              <td className="text-right px-4 py-3 text-text-secondary hidden sm:table-cell">${row.median?.toLocaleString() ?? '--'}</td>
              <td className="text-right px-4 py-3 text-text-secondary hidden md:table-cell">${row.min.toLocaleString()} – ${row.max.toLocaleString()}</td>
              <td className="text-right px-4 py-3 text-text-secondary">{row.sampleSize}</td>
              <td className="text-right px-4 py-3"><TrendBadge trend={row.trend} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

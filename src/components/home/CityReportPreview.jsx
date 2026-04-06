import { Link } from 'react-router-dom';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { citySlug } from '../../lib/slugify';
import { SectionSkeleton } from './DashboardSkeleton';

export default function CityReportPreview({ report, city, state, loading }) {
  if (loading) return <SectionSkeleton lines={5} />;

  const slug = city && state ? citySlug(city, state) : '';
  const reportUrl = slug ? `/prices/${slug}` : '/prices';

  if (!report || !report.priceTable || report.priceTable.length === 0) {
    return (
      <div className="glow-card p-5">
        <h2 className="text-lg font-bold text-text-primary mb-3">
          {city ? `${city} Price Report` : 'City Price Report'}
        </h2>
        <p className="text-sm text-text-secondary mb-3">
          {city
            ? `Be the first to add prices in ${city}.`
            : 'Set your location to see your city report.'}
        </p>
        <Link
          to="/log"
          className="text-sm font-semibold text-rose-accent hover:text-rose-dark transition-colors"
        >
          Share a price &rarr;
        </Link>
      </div>
    );
  }

  const topRows = report.priceTable.slice(0, 5);
  const providerCount = report.providers?.length || 0;
  const totalSubmissions = report.totalSubmissions || 0;

  return (
    <div className="glow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-text-primary">{city} Price Report</h2>
        <Link
          to={reportUrl}
          className="text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
        >
          Full report &rarr;
        </Link>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-text-secondary border-b border-gray-100">
            <th className="text-left py-1.5 font-medium">Procedure</th>
            <th className="text-right py-1.5 font-medium">Avg</th>
            <th className="text-right py-1.5 font-medium w-10">Trend</th>
          </tr>
        </thead>
        <tbody>
          {topRows.map((row) => (
            <tr key={row.procedure} className="border-b border-gray-50 last:border-0">
              <td className="py-2 text-text-primary font-medium truncate max-w-[160px]">
                {row.procedure}
              </td>
              <td className="py-2 text-right text-text-primary font-semibold">
                ${row.avg.toLocaleString()}
              </td>
              <td className="py-2 text-right">
                <TrendIcon direction={row.trend?.direction} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50 text-[11px] text-text-secondary">
        <span>{providerCount} provider{providerCount !== 1 ? 's' : ''} mapped</span>
        <span>{totalSubmissions} patient report{totalSubmissions !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}

function TrendIcon({ direction }) {
  if (direction === 'down') return <TrendingDown size={14} className="text-verified inline" />;
  if (direction === 'up') return <TrendingUp size={14} className="text-amber-600 inline" />;
  return <Minus size={14} className="text-text-secondary/40 inline" />;
}

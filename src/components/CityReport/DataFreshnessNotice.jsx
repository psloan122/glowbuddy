import { Clock, AlertTriangle, ShieldCheck, Globe } from 'lucide-react';

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DataFreshnessNotice({ freshness, className = '' }) {
  if (!freshness || !freshness.totalDataPoints) return null;

  const {
    mostRecent,
    daysSinceMostRecent,
    totalDataPoints,
    distinctProviders,
    verifiedDataPoints,
    scrapedDataPoints,
  } = freshness;

  const stale = daysSinceMostRecent != null && daysSinceMostRecent >= 90;
  const banner = stale
    ? {
        wrap: 'bg-amber-50 border-amber-200',
        icon: <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />,
        title: 'May be outdated',
        body: `Most recent price was added ${daysSinceMostRecent} days ago. Always confirm prices with the provider before booking.`,
      }
    : {
        wrap: 'bg-emerald-50 border-emerald-200',
        icon: <Clock size={16} className="text-emerald-700 mt-0.5 shrink-0" />,
        title: 'Recently updated',
        body: mostRecent
          ? `Most recent price added ${formatDate(mostRecent)} (${daysSinceMostRecent ?? 0} day${daysSinceMostRecent === 1 ? '' : 's'} ago).`
          : 'Recent provider activity in this area.',
      };

  return (
    <div className={`glow-card overflow-hidden ${className}`}>
      <div className={`flex items-start gap-2.5 px-4 py-3 border-b ${banner.wrap}`}>
        {banner.icon}
        <div className="text-sm">
          <p className="font-semibold text-text-primary">{banner.title}</p>
          <p className="text-text-secondary">{banner.body}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 text-center">
        <div className="px-3 py-3">
          <p className="text-lg font-bold text-text-primary">{totalDataPoints.toLocaleString()}</p>
          <p className="text-[11px] uppercase tracking-wide text-text-secondary">Data points</p>
        </div>
        <div className="px-3 py-3">
          <p className="text-lg font-bold text-text-primary">{distinctProviders.toLocaleString()}</p>
          <p className="text-[11px] uppercase tracking-wide text-text-secondary">Providers</p>
        </div>
        <div className="px-3 py-3">
          <p className="inline-flex items-center justify-center gap-1 text-lg font-bold text-emerald-700">
            <ShieldCheck size={14} />
            {verifiedDataPoints.toLocaleString()}
          </p>
          <p className="text-[11px] uppercase tracking-wide text-text-secondary">Verified</p>
        </div>
        <div className="px-3 py-3">
          <p className="inline-flex items-center justify-center gap-1 text-lg font-bold text-blue-700">
            <Globe size={14} />
            {scrapedDataPoints.toLocaleString()}
          </p>
          <p className="text-[11px] uppercase tracking-wide text-text-secondary">Public menus</p>
        </div>
      </div>
    </div>
  );
}

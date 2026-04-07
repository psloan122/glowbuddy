import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { getNeighborhoodBreakdown } from '../../lib/queries/prices';

export default function NeighborhoodBreakdown({ citySlug, procedureType }) {
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!citySlug || !procedureType) {
      setRows([]);
      return () => {
        cancelled = true;
      };
    }
    setRows(null);
    getNeighborhoodBreakdown(citySlug, procedureType).then((data) => {
      if (!cancelled) setRows(data);
    });
    return () => {
      cancelled = true;
    };
  }, [citySlug, procedureType]);

  if (rows === null) {
    return (
      <div className="glow-card p-6 text-center text-text-secondary text-sm">
        Loading neighborhood breakdown…
      </div>
    );
  }

  if (rows.length < 2) {
    return (
      <div className="glow-card p-6 text-center text-text-secondary text-sm">
        Not enough ZIP-code coverage yet to break {procedureType} prices down by neighborhood.
        We need at least 2 ZIPs with 2+ data points each.
      </div>
    );
  }

  const maxAvg = Math.max(...rows.map((r) => r.avg));

  return (
    <div className="glow-card overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/60">
        <p className="text-xs text-text-secondary">
          Grouped by ZIP code · {procedureType} · {rows.length} ZIP{rows.length === 1 ? '' : 's'}
        </p>
      </div>
      <div className="divide-y divide-gray-50">
        {rows.map((r) => {
          const widthPct = Math.max(8, Math.round((r.avg / maxAvg) * 100));
          return (
            <div key={r.zip} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-rose-accent" />
                  <span className="font-medium text-text-primary text-sm">{r.zip}</span>
                  <span className="text-[11px] text-text-secondary">
                    {r.count} data point{r.count === 1 ? '' : 's'}
                  </span>
                </div>
                <span className="font-semibold text-text-primary text-sm">
                  ${r.avg.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full bg-rose-accent rounded-full"
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <p className="text-[11px] text-text-secondary mt-1">
                Range: ${r.min.toLocaleString()} – ${r.max.toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { ShieldCheck, Globe, AlertTriangle, ExternalLink, TrendingDown, TrendingUp } from 'lucide-react';
import { providerProfileUrl } from '../../lib/slugify';

const STALE_DAYS = 90;

function daysOld(scrapedAt, createdAt) {
  const ts = scrapedAt || createdAt;
  if (!ts) return null;
  return Math.floor((Date.now() - new Date(ts).getTime()) / (1000 * 60 * 60 * 24));
}

function SourceBadge({ row }) {
  if (row.verified === true && row.source === 'manual') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-verified bg-verified/10 px-2 py-0.5 rounded-full">
        <ShieldCheck size={11} />
        Verified
      </span>
    );
  }
  if (row.source === 'scrape') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
        <Globe size={11} />
        Public menu
      </span>
    );
  }
  return null;
}

function StalenessPill({ row }) {
  const age = daysOld(row.scrapedAt, row.createdAt);
  if (age == null || age < STALE_DAYS) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
      <AlertTriangle size={11} />
      May be outdated
    </span>
  );
}

function VsAvgBadge({ pct }) {
  if (pct == null || pct === 0) return null;
  if (pct < -90 || pct > 500) return null;
  const below = pct < 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
        below ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
      }`}
      title={`${Math.abs(pct)}% ${below ? 'below' : 'above'} city average for this price label`}
    >
      {below ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
      {Math.abs(pct)}%
    </span>
  );
}

function fmtCompare(value) {
  if (value == null || !Number.isFinite(value)) return '—';
  if (Number.isInteger(value)) return `$${value.toLocaleString()}`;
  return `$${value.toFixed(2)}`;
}

export default function ProviderPriceComparisonTable({ rows, cityAvg }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="glow-card p-6 text-center text-text-secondary text-sm">
        No provider-level price data available yet.
      </div>
    );
  }

  return (
    <div className="glow-card overflow-hidden">
      {cityAvg ? (
        <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/60 text-xs text-text-secondary">
          City average:{' '}
          <span className="font-semibold text-text-primary">${cityAvg.toLocaleString()}</span>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wide">Provider</th>
              <th className="text-right px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wide">Price</th>
              <th className="text-right px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wide">Per unit</th>
              <th className="text-left px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wide hidden sm:table-cell">Source</th>
              <th className="text-right px-4 py-3 font-semibold text-text-secondary text-xs uppercase tracking-wide hidden md:table-cell">vs avg</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const href = providerProfileUrl(
                row.providerSlug,
                row.providerName,
                row.providerCity,
                row.providerState,
              );
              const perUnitText =
                row.comparableValue != null ? fmtCompare(row.comparableValue) : '—';
              return (
                <tr
                  key={row.providerId}
                  className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors align-top"
                >
                  <td className="px-4 py-3">
                    {href ? (
                      <Link
                        to={href}
                        className="font-medium text-text-primary hover:text-rose-accent transition-colors"
                      >
                        {row.providerName}
                      </Link>
                    ) : (
                      <span className="font-medium text-text-primary">{row.providerName}</span>
                    )}
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap sm:hidden">
                      <SourceBadge row={row} />
                      <StalenessPill row={row} />
                    </div>
                    {row.source === 'scrape' && (
                      <p className="text-[11px] text-text-secondary italic mt-1">
                        Pulled from provider&apos;s public website
                        {row.sourceUrl && (
                          <>
                            {' '}
                            <a
                              href={row.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 text-blue-700 not-italic hover:underline"
                            >
                              view source <ExternalLink size={9} />
                            </a>
                          </>
                        )}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-text-primary">{row.displayPrice}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`tabular-nums ${row.comparableValue == null ? 'text-text-secondary' : 'text-text-primary font-medium'}`}
                    >
                      {perUnitText}
                    </span>
                    {row.comparableValue != null && (
                      <p className="text-[10px] text-text-secondary uppercase tracking-wide">
                        {row.compareUnit}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="flex flex-wrap gap-1.5">
                      <SourceBadge row={row} />
                      <StalenessPill row={row} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">
                    <VsAvgBadge pct={row.vsCityAvgPct} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2.5 border-t border-gray-50 bg-gray-50/40 text-[11px] text-text-secondary italic">
        Sorted by per-unit value ascending.
      </div>
    </div>
  );
}

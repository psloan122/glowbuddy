import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { procedureToSlug } from '../lib/constants';

const RELEVANCE_LABELS = {
  3: { label: 'Best Match', bg: '#E0F2FE', color: '#0369A1' },
  2: { label: 'Good Option', bg: '#F0F9FF', color: '#0369A1' },
  1: { label: 'Complementary', bg: '#F5F5F4', color: '#78716C' },
};

export default function TreatmentRecommendationCard({ rec }) {
  const badge = RELEVANCE_LABELS[rec.relevance] || RELEVANCE_LABELS[1];
  const feedUrl = `/?procedure=${encodeURIComponent(procedureToSlug(rec.treatment_name))}`;

  return (
    <div className="glow-card p-5">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-text-primary">{rec.treatment_name}</h3>
        <span
          className="text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ml-2"
          style={{ backgroundColor: badge.bg, color: badge.color }}
        >
          {badge.label}
        </span>
      </div>

      <p className="text-sm text-text-secondary leading-relaxed mb-3">
        {rec.why_it_works}
      </p>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary mb-3">
        {rec.typical_sessions && (
          <span>Sessions: {rec.typical_sessions}</span>
        )}
        {rec.time_to_results && (
          <span>Results: {rec.time_to_results}</span>
        )}
      </div>

      {rec.sources?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {rec.sources.map((url, i) => {
            const domain = (() => {
              try { return new URL(url).hostname.replace('www.', ''); } catch { return ''; }
            })();
            const shortMap = {
              'accessdata.fda.gov': 'FDA',
              'plasticsurgery.org': 'ASPS',
              'aad.org': 'AAD',
              'asds.net': 'ASDS',
              'pubmed.ncbi.nlm.nih.gov': 'PubMed',
              'hydrafacial.com': 'HydraFacial',
            };
            const short = shortMap[domain] || domain;
            return (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-[10px] text-[#0369A1] hover:text-sky-800 transition"
              >
                <ExternalLink size={9} className="shrink-0" />
                {short}
              </a>
            );
          })}
        </div>
      )}

      <Link
        to={feedUrl}
        className="inline-flex items-center text-sm font-medium text-[#0369A1] hover:text-sky-800 transition"
      >
        See prices near you &rarr;
      </Link>
    </div>
  );
}

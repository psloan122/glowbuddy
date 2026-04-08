import { ExternalLink } from 'lucide-react';

/**
 * Individual financing partner card (CareCredit or Cherry).
 * Used inside FinancingWidget full variant.
 */
export default function FinancingPartnerCard({ partner, url, onApply }) {
  return (
    <div className="glow-card p-4 flex flex-col items-center text-center">
      <img
        src={partner.logo}
        alt={partner.name}
        className="h-8 mb-3"
        loading="lazy"
        onError={(e) => {
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'block';
        }}
      />
      <span
        className="text-sm font-bold mb-1 hidden"
        style={{ color: partner.color }}
      >
        {partner.name}
      </span>
      <p className="text-xs text-text-secondary mb-3">{partner.tagline}</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onApply}
        className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white rounded-full transition hover:opacity-90"
        style={{ backgroundColor: partner.color }}
      >
        Apply Now
        <ExternalLink size={12} />
      </a>
      <p className="text-[10px] text-text-secondary mt-2">
        You'll be redirected to {partner.name}'s website
      </p>
    </div>
  );
}

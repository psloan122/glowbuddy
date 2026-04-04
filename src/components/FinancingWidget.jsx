import { ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { FINANCING_PARTNERS, buildAffiliateUrl } from '../lib/financingPartners';
import FinancingPartnerCard from './FinancingPartnerCard';

/**
 * Financing widget for CareCredit and Cherry.
 * variant="compact": single line below a price
 * variant="full": two partner cards side by side
 */
export default function FinancingWidget({
  procedureName,
  estimatedCost,
  providerId,
  variant = 'compact',
}) {
  // Determine which partners to show based on minProcedureCost
  const eligible = Object.entries(FINANCING_PARTNERS).filter(
    ([, p]) => !estimatedCost || estimatedCost >= p.minProcedureCost
  );

  if (eligible.length === 0) return null;

  function handleClick(partnerKey) {
    // Fire-and-forget: log click before opening URL
    supabase
      .from('financing_clicks')
      .insert({
        provider_id: providerId || null,
        procedure_name: procedureName || null,
        financing_partner: partnerKey,
        estimated_procedure_cost: estimatedCost || null,
        session_id: sessionStorage.getItem('gb_session') || null,
      })
      .then(() => {})
      .catch(() => {});
  }

  if (variant === 'compact') {
    const links = eligible.map(([key, partner]) => {
      const url = buildAffiliateUrl(key, estimatedCost);
      return (
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => handleClick(key)}
          className="font-medium hover:underline"
          style={{ color: partner.color }}
        >
          {partner.name}
        </a>
      );
    });

    return (
      <p className="text-xs text-text-secondary mt-1">
        Finance with{' '}
        {links.reduce((prev, curr, i) => (
          i === 0 ? [curr] : [...prev, ' or ', curr]
        ), [])}
        {' '}
        <ExternalLink size={10} className="inline" />
      </p>
    );
  }

  // Full variant: side-by-side cards
  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-text-primary mb-3">
        Finance this procedure
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {eligible.map(([key, partner]) => {
          const url = buildAffiliateUrl(key, estimatedCost);
          return (
            <FinancingPartnerCard
              key={key}
              partner={partner}
              url={url}
              onApply={() => handleClick(key)}
            />
          );
        })}
      </div>
    </div>
  );
}

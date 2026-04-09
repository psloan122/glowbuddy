import { useState, useEffect } from 'react';
import { getPioneerCredit, PIONEER_TIERS } from '../lib/pioneerLogic';
import { format } from 'date-fns';

export default function PioneerCredit({ providerSlug }) {
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!providerSlug) {
      setLoading(false);
      return;
    }
    getPioneerCredit(providerSlug).then((data) => {
      setCredits(data);
      setLoading(false);
    });
  }, [providerSlug]);

  if (loading || credits.length === 0) return null;

  // Show the highest tier credit
  const best =
    credits.find((c) => c.tier === 'founding_patient') ||
    credits.find((c) => c.tier === 'pioneer') ||
    credits[0];

  const tierInfo = PIONEER_TIERS[best.tier] || PIONEER_TIERS.pioneer;
  const name = best.display_name ? `@${best.display_name}` : 'a Know Before You Glow member';
  const dateStr = best.earned_at ? format(new Date(best.earned_at), 'MMMM yyyy') : '';

  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium mb-3"
      style={{ background: 'rgba(251, 191, 36, 0.08)', color: '#B45309' }}
    >
      <span>
        {tierInfo.label}: first verified by {name}{dateStr ? ` \u00b7 ${dateStr}` : ''}
      </span>
    </div>
  );
}

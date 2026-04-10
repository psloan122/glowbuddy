import { useEffect, useRef } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatUnitSuffix } from '../utils/formatPricingUnit';
import SpecialCountdownBadge from './SpecialCountdownBadge';
import ProviderAvatar from './ProviderAvatar';
import FinancingWidget from './FinancingWidget';

/**
 * Consumer-facing special offer card for the market feed.
 * Variants: 'featured' (gold badge, pinned) or 'standard' (subtle promoted label).
 */
export default function SpecialOfferCard({ special, provider, onBook }) {
  const isFeatured = special.placement_tier === 'featured';
  const tracked = useRef(false);

  // Track impression once per session per special
  useEffect(() => {
    if (tracked.current) return;
    const key = `gb_imp_${special.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
    tracked.current = true;
    supabase.rpc('increment_special_impressions', {
      special_ids: [special.id],
    }).catch(() => {});
  }, [special.id]);

  function handleBookClick() {
    // Track click
    supabase.rpc('increment_special_click', {
      p_special_id: special.id,
    }).catch(() => {});

    if (onBook) {
      onBook(special, provider);
    } else if (provider?.website) {
      window.open(
        provider.website.startsWith('http') ? provider.website : `https://${provider.website}`,
        '_blank'
      );
    } else if (provider?.phone) {
      window.location.href = `tel:${provider.phone}`;
    }
  }

  const unitLabel = formatUnitSuffix(special.price_unit) || '/session';

  return (
    <div
      className={`glow-card p-5 relative overflow-hidden transition-shadow ${
        isFeatured
          ? 'border-l-4 shadow-md hover:shadow-lg'
          : 'border-l-4 hover:shadow-md'
      }`}
      style={{
        borderLeftColor: isFeatured ? '#D4A017' : '#C94F78',
      }}
    >
      {/* Badge */}
      <div className="flex items-center justify-between mb-3">
        {isFeatured ? (
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
          >
            <Sparkles size={12} />
            Special Offer
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-text-secondary">
            Promoted
          </span>
        )}
        <SpecialCountdownBadge endsAt={special.ends_at} />
      </div>

      {/* Headline */}
      <h3
        className={`font-bold text-text-primary mb-1 ${
          isFeatured ? 'text-lg' : 'text-base'
        }`}
      >
        {special.headline}
      </h3>

      {/* Description */}
      {special.description && (
        <p className="text-sm text-text-secondary mb-3 line-clamp-2">
          {special.description}
        </p>
      )}

      {/* Price */}
      <div className="flex items-baseline gap-1 mb-3">
        <span
          className={`font-bold text-text-primary ${
            isFeatured ? 'text-2xl' : 'text-xl'
          }`}
        >
          ${Number(special.promo_price).toFixed(2)}
        </span>
        <span className="text-sm text-text-secondary">{unitLabel}</span>
      </div>

      {/* Financing (show if estimated total >= $150, e.g. Botox $10 x 40 units) */}
      <FinancingWidget
        procedureName={special.treatment_name}
        estimatedCost={Number(special.promo_price) * 40}
        providerId={provider?.id}
        variant="compact"
      />

      {/* Provider info */}
      <div className="flex items-center gap-2 mb-4 mt-3">
        <ProviderAvatar name={provider?.name || 'Provider'} size={24} />
        <div>
          <p className="text-sm font-medium text-text-primary">
            {provider?.name || 'Provider'}
          </p>
          {provider?.city && provider?.state && (
            <p className="text-xs text-text-secondary">
              {provider.city}, {provider.state}
            </p>
          )}
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={handleBookClick}
        className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold transition"
        style={{
          backgroundColor: isFeatured ? '#C94F78' : 'transparent',
          color: isFeatured ? 'white' : '#C94F78',
          border: isFeatured ? 'none' : '1px solid #C94F78',
        }}
      >
        Book Now
        <ArrowRight size={14} />
      </button>
    </div>
  );
}

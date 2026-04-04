import { Sparkles, Clock, ArrowRight } from 'lucide-react';
import ProviderAvatar from './ProviderAvatar';

/**
 * Live preview of how the special offer card will appear in the feed.
 * Used alongside CreateSpecialForm.
 */
export default function SpecialPreview({ formData, providerName, providerCity, providerState }) {
  const isFeatured = formData.tier === 'featured';
  const unitLabel = formData.priceUnit === 'unit' ? '/unit'
    : formData.priceUnit === 'syringe' ? '/syringe'
    : formData.priceUnit === 'area' ? '/area'
    : '/session';

  const hasData = formData.treatmentName || formData.headline || formData.promoPrice;

  if (!hasData) {
    return (
      <div className="glow-card p-6 text-center">
        <p className="text-sm text-text-secondary">
          Fill out the form to see a live preview of your special offer card.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`glow-card p-5 relative overflow-hidden ${
        isFeatured ? 'border-l-4 shadow-md' : 'border-l-4'
      }`}
      style={{ borderLeftColor: isFeatured ? '#D4A017' : '#C94F78' }}
    >
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
        {formData.weeks && (
          <span
            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: '#E1F5EE', color: '#0F6E56' }}
          >
            <Clock size={12} />
            Ends in {formData.weeks * 7} days
          </span>
        )}
      </div>

      <h3 className={`font-bold text-text-primary mb-1 ${isFeatured ? 'text-lg' : 'text-base'}`}>
        {formData.headline || `$${formData.promoPrice || '—'} ${formData.treatmentName || 'Treatment'}`}
      </h3>

      {formData.description && (
        <p className="text-sm text-text-secondary mb-3 line-clamp-2">
          {formData.description}
        </p>
      )}

      {formData.promoPrice && (
        <div className="flex items-baseline gap-1 mb-3">
          <span className={`font-bold text-text-primary ${isFeatured ? 'text-2xl' : 'text-xl'}`}>
            ${Number(formData.promoPrice).toFixed(2)}
          </span>
          <span className="text-sm text-text-secondary">{unitLabel}</span>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <ProviderAvatar name={providerName || 'Your Practice'} size={24} />
        <div>
          <p className="text-sm font-medium text-text-primary">
            {providerName || 'Your Practice'}
          </p>
          {(providerCity || providerState) && (
            <p className="text-xs text-text-secondary">
              {[providerCity, providerState].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      </div>

      <div
        className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold"
        style={{
          backgroundColor: isFeatured ? '#C94F78' : 'transparent',
          color: isFeatured ? 'white' : '#C94F78',
          border: isFeatured ? 'none' : '1px solid #C94F78',
        }}
      >
        Book Now
        <ArrowRight size={14} />
      </div>
    </div>
  );
}

import { Check, Sparkles, TrendingUp } from 'lucide-react';
import { PLACEMENT_PRICING } from '../lib/placementPricing';

export default function PlacementPricingSelector({ selected, weeks, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Standard */}
      <button
        type="button"
        onClick={() => onChange('standard')}
        className={`relative p-5 rounded-xl border-2 text-left transition ${
          selected === 'standard'
            ? 'border-rose-accent bg-rose-light/30'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        {selected === 'standard' && (
          <span className="absolute top-3 right-3 w-5 h-5 bg-rose-accent rounded-full flex items-center justify-center">
            <Check size={12} className="text-white" />
          </span>
        )}
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={18} className="text-text-primary" />
          <span className="font-bold text-text-primary">
            {PLACEMENT_PRICING.standard.label}
          </span>
        </div>
        <p className="text-2xl font-bold text-text-primary mb-1">
          ${PLACEMENT_PRICING.standard.weeklyRate}
          <span className="text-sm font-normal text-text-secondary">/week</span>
        </p>
        {weeks > 0 && (
          <p className="text-xs text-text-secondary mb-3">
            ${PLACEMENT_PRICING.standard.weeklyRate * weeks} total for {weeks} week{weeks > 1 ? 's' : ''}
          </p>
        )}
        <p className="text-sm text-text-secondary mb-3">
          {PLACEMENT_PRICING.standard.description}
        </p>
        <ul className="space-y-1.5">
          {PLACEMENT_PRICING.standard.features.map((f) => (
            <li key={f} className="flex items-center gap-1.5 text-xs text-text-secondary">
              <Check size={12} className="text-verified shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </button>

      {/* Featured */}
      <button
        type="button"
        onClick={() => onChange('featured')}
        className={`relative p-5 rounded-xl border-2 text-left transition ${
          selected === 'featured'
            ? 'border-amber-400 bg-amber-50/30'
            : 'border-gray-200 hover:border-gray-300'
        }`}
      >
        {/* Popular badge */}
        <span
          className="absolute -top-2.5 left-4 text-[10px] font-bold uppercase tracking-wide px-2.5 py-0.5 rounded-full"
          style={{ backgroundColor: '#D4A017', color: 'white' }}
        >
          Most Popular
        </span>

        {selected === 'featured' && (
          <span className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#D4A017' }}>
            <Check size={12} className="text-white" />
          </span>
        )}
        <div className="flex items-center gap-2 mb-2 mt-1">
          <Sparkles size={18} style={{ color: '#D4A017' }} />
          <span className="font-bold text-text-primary">
            {PLACEMENT_PRICING.featured.label}
          </span>
        </div>
        <p className="text-2xl font-bold text-text-primary mb-1">
          ${PLACEMENT_PRICING.featured.weeklyRate}
          <span className="text-sm font-normal text-text-secondary">/week</span>
        </p>
        {weeks > 0 && (
          <p className="text-xs text-text-secondary mb-3">
            ${PLACEMENT_PRICING.featured.weeklyRate * weeks} total for {weeks} week{weeks > 1 ? 's' : ''}
          </p>
        )}
        <p className="text-sm text-text-secondary mb-3">
          {PLACEMENT_PRICING.featured.description}
        </p>
        <ul className="space-y-1.5">
          {PLACEMENT_PRICING.featured.features.map((f) => (
            <li key={f} className="flex items-center gap-1.5 text-xs text-text-secondary">
              <Check size={12} className="text-verified shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </button>
    </div>
  );
}

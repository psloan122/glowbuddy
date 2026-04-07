import { Link } from 'react-router-dom';
import ProviderAvatar from './ProviderAvatar';
import { providerProfileUrl } from '../lib/slugify';

/*
 * DarkPriceCard — the dark variant editorial price card.
 *
 * Used on black/ink backgrounds (homepage hero, dark sections).
 * Hard 2px hot-pink top rule, ink-soft background, white prices,
 * blush procedure label.
 *
 * Props:
 *   - procedureLabel: short uppercase label e.g. "Botox / Per Unit"
 *   - price: number — what to render in big Playfair 900
 *   - unit: optional string — e.g. "/unit", "/syringe"
 *   - brand: optional brand label e.g. "Botox"
 *   - vsAvg: optional { type: 'below' | 'at' | 'above', label: string }
 *   - source: optional 'website' | 'patient' — adds source pill
 *   - providerName: string
 *   - providerCity: string
 *   - providerState: string
 *   - providerSlug: optional — when set, card becomes a link
 */
export default function DarkPriceCard({
  procedureLabel,
  price,
  unit,
  brand,
  vsAvg,
  source,
  providerName,
  providerCity,
  providerState,
  providerSlug,
}) {
  const profileUrl = providerSlug
    ? providerProfileUrl(providerSlug, providerName, providerCity, providerState)
    : null;
  const Wrapper = profileUrl ? Link : 'div';
  const wrapperProps = profileUrl ? { to: profileUrl } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className="block glow-card-dark p-5 hover:no-underline group"
    >
      {/* Procedure label — tracked uppercase blush */}
      <p
        className="text-[9px] font-semibold uppercase text-blush mb-2"
        style={{ letterSpacing: '0.12em' }}
      >
        {procedureLabel}
      </p>

      {/* Price — Playfair 900 white huge */}
      <div className="flex items-baseline gap-1.5 mb-1">
        <span className="price-display-dark">
          ${Number(price).toLocaleString()}
        </span>
        {unit && (
          <span className="font-body text-[12px] font-light text-[#777]">{unit}</span>
        )}
      </div>

      {brand && (
        <p className="font-body text-[11px] font-light text-[#888] mb-3">{brand}</p>
      )}

      {/* Badge row */}
      {(vsAvg || source) && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {vsAvg && (
            <span
              className="inline-flex items-center text-[10px] font-medium uppercase px-2 py-0.5"
              style={{
                letterSpacing: '0.06em',
                borderRadius: '4px',
                ...(vsAvg.type === 'below'
                  ? { background: '#0D2A1A', color: '#4CAF50', border: '1px solid #1A4A2A' }
                  : vsAvg.type === 'above'
                  ? { background: '#2A0A0A', color: '#E8347A', border: '1px solid #4A1A1A' }
                  : { background: '#1A1A1A', color: '#666', border: '1px solid #222' }),
              }}
            >
              {vsAvg.label}
            </span>
          )}
          {source && (
            <span
              className="inline-flex items-center text-[10px] font-medium uppercase px-2 py-0.5"
              style={{
                letterSpacing: '0.06em',
                borderRadius: '4px',
                background: '#111',
                color: '#666',
                border: source === 'website' ? '1px dashed #333' : '1px solid #222',
              }}
            >
              {source === 'website' ? 'From website' : 'Patient reported'}
            </span>
          )}
        </div>
      )}

      {/* Provider row — divider above */}
      <div className="flex items-center gap-2 pt-3" style={{ borderTop: '1px solid #222' }}>
        <ProviderAvatar name={providerName} size={24} />
        <div className="flex-1 min-w-0">
          <p
            className="text-[12px] font-medium text-white truncate"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {providerName}
          </p>
          {(providerCity || providerState) && (
            <p className="text-[11px] font-light text-[#666] truncate">
              {providerCity}
              {providerCity && providerState ? ', ' : ''}
              {providerState}
            </p>
          )}
        </div>
      </div>
    </Wrapper>
  );
}

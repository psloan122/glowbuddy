import { Link } from 'react-router-dom';
import ProviderAvatar from './ProviderAvatar';
import { providerProfileUrl } from '../lib/slugify';

/*
 * DarkPriceCard — pink-section editorial price card.
 *
 * Despite the legacy name, this card now lives INSIDE hot-pink
 * full-bleed sections (e.g. the homepage feature section). It is
 * a translucent white-on-pink card with a 3px white top rule, white
 * Playfair Display prices, and blush procedure labels.
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
        className="text-[9px] font-semibold uppercase mb-2"
        style={{ letterSpacing: '0.12em', color: '#FBE4ED' }}
      >
        {procedureLabel}
      </p>

      {/* Price — Playfair 900 white huge */}
      <div className="flex items-baseline gap-1.5 mb-1">
        <span className="price-display-dark">
          ${Number(price).toLocaleString()}
        </span>
        {unit && (
          <span
            className="font-body text-[12px] font-light"
            style={{ color: 'rgba(255,255,255,0.75)' }}
          >
            {unit}
          </span>
        )}
      </div>

      {brand && (
        <p
          className="font-body text-[11px] font-light mb-3"
          style={{ color: 'rgba(255,255,255,0.75)' }}
        >
          {brand}
        </p>
      )}

      {/* Badge row */}
      {(vsAvg || source) && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {vsAvg && (
            <span
              className="inline-flex items-center text-[10px] font-semibold uppercase px-2 py-0.5"
              style={{
                letterSpacing: '0.06em',
                borderRadius: '4px',
                background: 'rgba(255,255,255,0.18)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.35)',
              }}
            >
              {vsAvg.label}
            </span>
          )}
          {source && (
            <span
              className="inline-flex items-center text-[10px] font-semibold uppercase px-2 py-0.5"
              style={{
                letterSpacing: '0.06em',
                borderRadius: '4px',
                background: 'transparent',
                color: '#ffffff',
                border: source === 'website'
                  ? '1px dashed rgba(255,255,255,0.50)'
                  : '1px solid rgba(255,255,255,0.40)',
              }}
            >
              {source === 'website' ? 'From website' : 'Patient reported'}
            </span>
          )}
        </div>
      )}

      {/* Provider row — divider above */}
      <div
        className="flex items-center gap-2 pt-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.20)' }}
      >
        <ProviderAvatar name={providerName} size={24} />
        <div className="flex-1 min-w-0">
          <p
            className="text-[12px] font-medium text-white truncate"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {providerName}
          </p>
          {(providerCity || providerState) && (
            <p
              className="text-[11px] font-light truncate"
              style={{ color: 'rgba(255,255,255,0.70)' }}
            >
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

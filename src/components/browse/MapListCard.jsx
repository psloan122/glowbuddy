import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import ProviderAvatar from '../ProviderAvatar';
import { providerProfileUrl } from '../../lib/slugify';
import { formatPricingUnit } from '../../utils/formatPricingUnit';

/**
 * Compact Airbnb-style map/list card. Used in the desktop browse 2-column
 * grid. Shows photo (4:3), provider name, location, rating, and a single
 * lead price (not every price row).
 */
function MapListCard({
  provider,
  leadPrice,
  brandLabel,
  photoUrl,
  selected,
  onHoverChange,
  onClick,
}) {
  const href = providerProfileUrl(
    provider.provider_slug || provider.slug,
    provider.provider_name || provider.name,
    provider.city,
    provider.state,
  );

  const rating = Number(provider.google_rating || provider.rating) || null;
  const reviewCount = Number(provider.google_review_count) || null;

  // Lead price line: "Botox from $9/unit" or "No prices yet"
  const priceLine = leadPrice
    ? (() => {
        const unit = formatPricingUnit(leadPrice.price_label);
        const procedure = brandLabel || leadPrice.procedure_type || 'From';
        return `${procedure} from $${Math.round(leadPrice.price)}${unit ? ` / ${unit.replace(/^per /, '')}` : ''}`;
      })()
    : null;

  return (
    <Link
      to={href || '#'}
      onClick={onClick}
      onMouseEnter={onHoverChange ? () => onHoverChange(provider, true) : undefined}
      onMouseLeave={onHoverChange ? () => onHoverChange(provider, false) : undefined}
      style={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        borderRadius: 10,
        overflow: 'hidden',
        background: 'white',
        border: selected ? '2px solid #111' : '1px solid #EDE8E3',
        transition: 'border-color 150ms, transform 150ms',
      }}
      onMouseOver={(e) => {
        if (!selected) e.currentTarget.style.borderColor = '#D6CFC6';
      }}
      onMouseOut={(e) => {
        if (!selected) e.currentTarget.style.borderColor = '#EDE8E3';
      }}
    >
      {/* Photo — 4:3 aspect ratio */}
      <div
        style={{
          width: '100%',
          aspectRatio: '4/3',
          background: '#FBF9F7',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt=""
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : (
          <ProviderAvatar name={provider.provider_name || provider.name} size={56} />
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '10px 12px 12px' }}>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            fontSize: 13,
            color: '#111',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {provider.provider_name || provider.name}
        </p>
        <p
          style={{
            fontFamily: 'var(--font-body)',
            fontWeight: 300,
            fontSize: 11,
            color: '#888',
            margin: '2px 0 0',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {[provider.city, provider.state].filter(Boolean).join(', ')}
          </span>
          {rating && (
            <>
              <span style={{ color: '#D6CFC6' }}>·</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: '#111', fontWeight: 500, flexShrink: 0 }}>
                <Star size={10} fill="#F5B301" stroke="#F5B301" />
                {rating.toFixed(1)}
                {reviewCount ? (
                  <span style={{ color: '#888', fontWeight: 400, marginLeft: 2 }}>
                    ({reviewCount})
                  </span>
                ) : null}
              </span>
            </>
          )}
        </p>
        {priceLine ? (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 600,
              fontSize: 13,
              color: '#E8347A',
              margin: '6px 0 0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {priceLine}
          </p>
        ) : (
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 11,
              color: '#B8A89A',
              margin: '6px 0 0',
              fontStyle: 'italic',
            }}
          >
            No prices yet
          </p>
        )}
      </div>
    </Link>
  );
}

export default memo(MapListCard);

import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import ProviderAvatar from '../ProviderAvatar';
import { providerProfileUrl } from '../../lib/slugify';
import { getPriceLabelShort } from '../../utils/formatPricingUnit';
import { getProcedureLabel } from '../../lib/procedureLabel';

// Pull a usable photo URL off a provider record — check the common field
// shapes used across the app (Google Places photos, joined photos table).
function pickPhotoUrl(provider) {
  if (!provider) return null;
  const candidates = [
    provider.photo_url,
    provider.photoUrl,
    provider.logo_url,
    provider.photos?.[0]?.public_url,
    provider.photos?.[0]?.url,
    provider.google_photos?.[0],
    provider.provider_photos?.[0]?.public_url,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.startsWith('http')) return c;
  }
  return null;
}

/**
 * Compact Airbnb-style map/list card. Used in the desktop browse 2-column
 * grid. Shows photo (4:3), provider name, location, rating, and a single
 * lead price (not every price row).
 */
function MapListCard({
  provider,
  leadPrice,
  brandLabel,
  photoUrl: photoUrlProp,
  selected,
  onHoverChange,
  onClick,
}) {
  const photoUrl = useMemo(
    () => photoUrlProp || pickPhotoUrl(provider),
    [photoUrlProp, provider],
  );
  const hasPhoto = Boolean(photoUrl);
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
        const unit = getPriceLabelShort(leadPrice.price_label);
        const procedure = getProcedureLabel(leadPrice.procedure_type, brandLabel || leadPrice.brand);
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
      {/* Photo area — 4:3 aspect when a real photo exists, otherwise
          a shorter 120px pink panel with centered initials so cards
          without photos don't leave giant empty space. */}
      <div
        style={hasPhoto ? {
          width: '100%',
          aspectRatio: '4/3',
          background: '#FBF9F7',
          position: 'relative',
          overflow: 'hidden',
        } : {
          width: '100%',
          height: 120,
          background: '#FDF0F5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {hasPhoto ? (
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

import { memo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Star } from 'lucide-react';
import { providerProfileUrl } from '../../lib/slugify';

function initials(name) {
  if (!name) return '?';
  const w = name.replace(/^(Dr\.?|Prof\.?)\s+/i, '').trim().split(/\s+/);
  if (w.length === 1) return w[0].charAt(0).toUpperCase();
  return (w[0].charAt(0) + w[w.length - 1].charAt(0)).toUpperCase();
}

function fmtPrice(n) {
  const v = Number(n) || 0;
  if (v >= 100 || Number.isInteger(v)) return `$${Math.round(v).toLocaleString()}`;
  return `$${v.toFixed(2)}`;
}

const UNIT_LABEL = {
  per_unit: '/unit', per_syringe: '/syringe', per_session: '/session',
  per_vial: '/vial', per_cycle: '/cycle',
};

export default memo(function MapMarkerCard({ provider, onClose }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  if (!provider) return null;

  const hasPrice = provider.bestPrice != null && provider.bestPrice > 0;
  const unit = UNIT_LABEL[provider.bestPriceLabel] || '';
  const priceCount = provider.rows?.length || 0;
  const profileUrl = providerProfileUrl(
    provider.provider_slug, provider.provider_name, provider.city, provider.state,
  );
  const photoUrl = provider.photo_url || provider.image_url || null;

  const card = (
    <div
      style={{
        borderRadius: '24px',
        overflow: 'hidden',
        background: 'white',
        boxShadow: '0 8px 40px rgba(0,0,0,0.22)',
        width: '100%',
        pointerEvents: 'auto',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Photo container */}
      <div
        style={{
          height: '240px',
          width: '100%',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#F8E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={provider.provider_name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : (
          <div
            style={{
              width: '100px',
              height: '100px',
              borderRadius: '16px',
              fontSize: '32px',
              fontWeight: 700,
              background: '#E91E8C',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none',
            }}
          >
            {initials(provider.provider_name)}
          </div>
        )}
      </div>

      {/* Info section */}
      <div style={{ padding: '20px 20px 8px 20px', fontFamily: 'var(--font-body)' }}>
        <div style={{
          fontSize: '19px',
          fontWeight: 700,
          color: '#1A1A1A',
          lineHeight: 1.3,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {provider.provider_name}
        </div>

        <div style={{
          fontSize: '14px',
          color: '#666',
          marginTop: '4px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {provider.provider_type || 'Med Spa'}
          {provider.city && <> &middot; {provider.city}{provider.state ? `, ${provider.state}` : ''}</>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          {provider.google_rating != null && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12, color: '#666' }}>
              <Star size={11} fill="#F5B301" stroke="#F5B301" />
              <span style={{ fontWeight: 600, color: '#1A1A1A' }}>{Number(provider.google_rating).toFixed(1)}</span>
              {provider.google_review_count != null && (
                <span>({provider.google_review_count})</span>
              )}
            </span>
          )}
          {hasPrice && (
            <span style={{ fontSize: '21px', fontWeight: 700, color: '#1A1A1A', marginLeft: 'auto' }}>
              {fmtPrice(provider.bestPrice)}
              {unit && <span style={{ fontSize: '13px', fontWeight: 400, color: '#888' }}>{unit}</span>}
            </span>
          )}
        </div>

        {/* CTA button */}
        <div
          style={{
            height: '56px',
            width: '100%',
            borderRadius: '12px',
            fontSize: '17px',
            fontWeight: 700,
            backgroundColor: '#E91E8C',
            color: 'white',
            border: 'none',
            marginTop: '14px',
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {hasPrice ? 'View Profile' : 'Be the first to log a price'}
        </div>
      </div>
    </div>
  );

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 16, left: 16, right: 16,
        zIndex: 20,
        pointerEvents: 'none',
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        opacity: visible ? 1 : 0,
        transition: 'transform 200ms ease-out, opacity 200ms ease-out',
      }}
    >
      {/* X dismiss button */}
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose?.(); }}
        aria-label="Dismiss"
        style={{
          position: 'absolute', top: -10, right: -6, zIndex: 2,
          width: '36px', height: '36px', borderRadius: '50%',
          background: 'white', border: '1px solid #e5e5e5',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', padding: 0, pointerEvents: 'auto',
        }}
      >
        <X size={16} color="#666" />
      </button>

      {profileUrl ? (
        <Link to={profileUrl} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
          {card}
        </Link>
      ) : (
        card
      )}
    </div>
  );
});

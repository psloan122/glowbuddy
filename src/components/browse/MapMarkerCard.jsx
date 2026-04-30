import { memo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Star, ChevronRight } from 'lucide-react';
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

  const card = (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        background: 'white', borderRadius: 16, padding: '18px 20px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.14)',
        border: '1px solid rgba(0,0,0,0.06)',
        pointerEvents: 'auto',
        WebkitTapHighlightColor: 'transparent',
        minHeight: 320,
      }}
    >
      {/* Avatar */}
      <div style={{
        width: 88, height: 88, borderRadius: 16, flexShrink: 0,
        background: '#E91E8C', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontWeight: 700, fontSize: 28, userSelect: 'none',
      }}>
        {initials(provider.provider_name)}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-body)' }}>
        <div style={{
          fontWeight: 700, fontSize: 18, color: '#1A1A1A', lineHeight: 1.3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {provider.provider_name}
        </div>
        <div style={{
          fontSize: 13, color: '#666', marginTop: 3,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {provider.provider_type || 'Med Spa'}
          {provider.city && <> &middot; {provider.city}{provider.state ? `, ${provider.state}` : ''}</>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          {provider.google_rating != null && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12, color: '#666' }}>
              <Star size={11} fill="#F5B301" stroke="#F5B301" />
              <span style={{ fontWeight: 600, color: '#1A1A1A' }}>{Number(provider.google_rating).toFixed(1)}</span>
              {provider.google_review_count != null && (
                <span>({provider.google_review_count})</span>
              )}
            </span>
          )}
          {priceCount > 0 && (
            <span style={{ fontSize: 12, color: '#888' }}>
              &middot; {priceCount} {priceCount === 1 ? 'price' : 'prices'}
            </span>
          )}
        </div>
      </div>

      {/* Price + arrow */}
      <div style={{ flexShrink: 0, textAlign: 'right', fontFamily: 'var(--font-body)' }}>
        {hasPrice ? (
          <div>
            <span style={{ fontWeight: 700, fontSize: 20, color: '#1A1A1A' }}>
              {fmtPrice(provider.bestPrice)}
            </span>
            {unit && (
              <span style={{ fontSize: 12, fontWeight: 400, color: '#888' }}>{unit}</span>
            )}
          </div>
        ) : (
          <span style={{ fontSize: 13, fontWeight: 600, color: '#E91E8C' }}>
            Be first &rarr;
          </span>
        )}
        <ChevronRight size={18} style={{ color: '#ccc', marginTop: 2, marginLeft: 'auto' }} />
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
      {/* Close button */}
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose?.(); }}
        aria-label="Dismiss"
        style={{
          position: 'absolute', top: -10, right: -6, zIndex: 2,
          width: 36, height: 36, borderRadius: '50%',
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

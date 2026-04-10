/*
 * ResultsCountBar — sits below the price context bar.
 *
 * Shows a unified count that distinguishes providers (unique med spas)
 * from listings (total price rows):
 *   - Same count:  "4 providers offering Botox in Miami, FL"
 *   - Different:   "4 med spas  ·  10 Botox prices in Miami, FL"
 *
 * Right side: SHARE THESE RESULTS button (copies current URL).
 */

import { useState } from 'react';
import { Link2 } from 'lucide-react';

export default function ResultsCountBar({ count, providerCount, brandLabel, city, state }) {
  const [copied, setCopied] = useState(false);

  function handleShare() {
    if (typeof window === 'undefined') return;
    try {
      navigator.clipboard?.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Older browsers may block clipboard outside HTTPS — silently noop.
    }
  }

  const locStr = city && state ? `${city}, ${state}` : city || '';
  const providers = providerCount ?? count;
  const listings = count;
  const same = providers === listings;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '12px 4px 16px 4px',
        flexWrap: 'wrap',
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-body)',
          fontWeight: 300,
          fontSize: 13,
          color: '#888',
        }}
      >
        {same ? (
          <>
            <strong style={{ fontWeight: 600, color: '#555' }}>{providers}</strong>
            {` ${providers === 1 ? 'provider' : 'providers'} offering`}
            {brandLabel ? ` ${brandLabel}` : ''}
            {locStr ? ` in ${locStr}` : ''}
          </>
        ) : (
          <>
            <strong style={{ fontWeight: 600, color: '#555' }}>{providers}</strong>
            {` ${providers === 1 ? 'med spa' : 'med spas'}`}
            <span style={{ margin: '0 8px', color: '#D6CFC6' }}>·</span>
            <strong style={{ fontWeight: 600, color: '#555' }}>{listings}</strong>
            {` ${brandLabel || ''} ${listings === 1 ? 'price' : 'prices'} listed`}
            {locStr ? ` in ${locStr}` : ''}
          </>
        )}
      </p>

      <button
        type="button"
        onClick={handleShare}
        aria-live="polite"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          background: copied ? '#1A7A3A' : 'transparent',
          color: copied ? 'white' : '#888',
          border: `1px solid ${copied ? '#1A7A3A' : '#DDD'}`,
          borderRadius: 2,
          fontFamily: 'var(--font-body)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          transition: 'background 150ms, color 150ms, border-color 150ms',
        }}
      >
        <Link2 size={12} />
        {copied ? 'Copied!' : 'Share these results'}
      </button>
    </div>
  );
}

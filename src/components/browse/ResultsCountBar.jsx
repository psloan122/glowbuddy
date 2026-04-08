/*
 * ResultsCountBar — sits below the price context bar.
 *
 * Left:  "{count} results for {brand} in {city}"  (Outfit 300, 13px, #888)
 * Right: SHARE THESE RESULTS button. Copies the current URL to the
 *        clipboard and shows a transient "Copied!" confirmation for 2s.
 *
 * The URL is shareable as-is because all filters live in URL params.
 */

import { useState } from 'react';
import { Link2 } from 'lucide-react';

export default function ResultsCountBar({ count, brandLabel, city, state }) {
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
  const labelText = (() => {
    const head = `${count} ${count === 1 ? 'result' : 'results'}`;
    if (brandLabel && locStr) return `${head} for ${brandLabel} in ${locStr}`;
    if (brandLabel) return `${head} for ${brandLabel}`;
    if (locStr) return `${head} in ${locStr}`;
    return head;
  })();

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
        {labelText}
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

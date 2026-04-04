import { useState } from 'react';

/**
 * Inline Vagaro booking widget (iframe embed).
 * Only shown when provider has widget_embed_enabled = true.
 */
// NOTE: Vagaro may block iframe via CSP headers. Test in production and fall back to redirect button if blocked.
export default function VagaroWidget({ widgetUrl, providerName }) {
  const [loaded, setLoaded] = useState(false);

  if (!widgetUrl) return null;

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-text-primary mb-3">Book Online</h3>
      <div className="glow-card overflow-hidden relative" style={{ minHeight: 600 }}>
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 animate-pulse">
            <p className="text-sm text-text-secondary">Loading booking widget...</p>
          </div>
        )}
        <iframe
          src={widgetUrl}
          width="100%"
          height="600"
          frameBorder="0"
          title={`Book at ${providerName}`}
          onLoad={() => setLoaded(true)}
          style={{ display: loaded ? 'block' : 'none' }}
        />
      </div>
      <p className="text-[10px] text-text-secondary mt-2 text-center">
        Powered by Vagaro
      </p>
    </div>
  );
}

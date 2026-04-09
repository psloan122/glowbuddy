/*
 * MapLoadingFallback — friendly illustrated empty state shown when the
 * GlowMap fails to load (network blip, blocked Maps script, expired key).
 * Replaces the old "Map could not load. The list view is still available."
 * one-liner with a calmer, on-brand fallback that nudges the user toward
 * the list view and lets them retry without a full reload.
 */

export default function MapLoadingFallback({ onRetry }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FBF9F7',
        padding: 24,
      }}
    >
      <style>{`
        @keyframes mlf-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes mlf-shadow {
          0%, 100% { transform: scaleX(1);   opacity: 0.35; }
          50%      { transform: scaleX(0.7); opacity: 0.18; }
        }
        .mlf-pin    { animation: mlf-bob 1.8s ease-in-out infinite; transform-origin: center bottom; }
        .mlf-shadow { animation: mlf-shadow 1.8s ease-in-out infinite; transform-origin: center; }
        .mlf-btn:hover { background: #d52d6d; }
      `}</style>

      <div style={{ textAlign: 'center', maxWidth: 320 }}>
        <svg width="88" height="104" viewBox="0 0 88 104" aria-hidden="true" style={{ display: 'block', margin: '0 auto 16px' }}>
          <ellipse className="mlf-shadow" cx="44" cy="94" rx="18" ry="4" fill="#E8347A" />
          <g className="mlf-pin">
            <path
              d="M44 6 C27 6 16 18 16 33 C16 52 44 82 44 82 C44 82 72 52 72 33 C72 18 61 6 44 6 Z"
              fill="#E8347A"
              stroke="#C41E68"
              strokeWidth="2"
            />
            <circle cx="44" cy="32" r="9" fill="#FBF9F7" />
            <circle cx="44" cy="32" r="4" fill="#E8347A" />
          </g>
        </svg>

        <h3 style={{
          fontFamily: 'var(--font-display, Georgia, serif)',
          fontSize: 20, fontWeight: 700, color: '#1a1a1a',
          margin: '0 0 8px',
        }}>
          Map is taking a nap 😴
        </h3>
        <p style={{
          fontFamily: 'var(--font-body, system-ui, sans-serif)',
          fontSize: 13, lineHeight: 1.5, color: '#666',
          margin: '0 0 18px',
        }}>
          The list view has everything you need. Prices, providers, all of it.
        </p>
        {onRetry && (
          <button
            type="button"
            className="mlf-btn"
            onClick={onRetry}
            style={{
              fontFamily: 'var(--font-body, system-ui, sans-serif)',
              fontSize: 12, fontWeight: 600, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: 'white', background: '#E8347A',
              border: 'none', borderRadius: 2, padding: '10px 18px',
              cursor: 'pointer', transition: 'background 150ms ease',
            }}
          >
            Try map again
          </button>
        )}
      </div>
    </div>
  );
}

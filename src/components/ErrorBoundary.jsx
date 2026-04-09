import { Component } from 'react';

// Stale-chunk recovery key. When a deploy ships new asset hashes, the
// browser may still be holding the old index.html in memory and try to
// fetch a chunk that no longer exists (`Loading chunk N failed` /
// `Failed to fetch dynamically imported module`). Reloading once is the
// fix — but only ONCE, otherwise a real error would loop forever.
const RELOAD_KEY = '__gb_chunk_reload_at';

function isChunkLoadError(error) {
  if (!error) return false;
  const msg = String(error.message || error || '');
  const name = String(error.name || '');
  return (
    name === 'ChunkLoadError' ||
    /Loading chunk [^\s]+ failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg)
  );
}

function tryStaleChunkReload(error) {
  if (typeof window === 'undefined') return false;
  if (!isChunkLoadError(error)) return false;
  // Only auto-reload once per minute so a genuinely-broken chunk
  // doesn't loop forever.
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 60_000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Always log the actual error so /business style failures are easy
    // to diagnose in production. The "Oops" screen otherwise hides the
    // root cause and forces guesswork.
    console.error('[ErrorBoundary]', this.props.label || 'root', error, errorInfo);
    // Stale-chunk recovery — fires once, then the reloaded page either
    // works or hits the boundary again with a real error.
    tryStaleChunkReload(error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    // Caller-supplied fallback wins so per-route boundaries can render
    // a friendlier inline message instead of the full-page "Oops".
    if (typeof this.props.fallback === 'function') {
      return this.props.fallback({
        error: this.state.error,
        reset: () => this.setState({ hasError: false, error: null }),
      });
    }
    if (this.props.fallback) return this.props.fallback;

    // Default full-page fallback (kept for the root boundary).
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#FBF9F7',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '48px',
            fontWeight: 900,
            color: '#E8347A',
            marginBottom: '16px',
          }}
        >
          Oops.
        </div>
        <div
          style={{
            fontFamily: 'Outfit, sans-serif',
            fontSize: '16px',
            color: '#888',
            marginBottom: '32px',
            maxWidth: '400px',
            lineHeight: 1.6,
          }}
        >
          Something went wrong. Try refreshing — if the problem persists, we're on it.
        </div>
        <button
          onClick={() => {
            window.location.href = '/';
          }}
          style={{
            background: '#E8347A',
            color: 'white',
            border: 'none',
            padding: '12px 32px',
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 700,
            fontSize: '12px',
            letterSpacing: '.1em',
            textTransform: 'uppercase',
            borderRadius: '2px',
            cursor: 'pointer',
          }}
        >
          Back to Home
        </button>
      </div>
    );
  }
}

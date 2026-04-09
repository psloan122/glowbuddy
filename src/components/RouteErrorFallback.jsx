/*
 * RouteErrorFallback — inline error message rendered by the per-route
 * ErrorBoundary in App.jsx when a single route component crashes.
 *
 * Unlike the full-page "Oops" fallback in ErrorBoundary.jsx, this one
 * lives inside the app shell so Navbar/Footer/auth state are preserved
 * and the user can navigate elsewhere or retry without a full reload.
 *
 * In dev we surface the actual error message so debugging is one click
 * away; in production we keep the friendly copy and dump the stack to
 * the console (the boundary already does that as well).
 */

import { Link } from 'react-router-dom';
import { AlertTriangle, RotateCw } from 'lucide-react';

export default function RouteErrorFallback({ error, reset }) {
  const isDev = import.meta.env.DEV;

  return (
    <div
      style={{
        minHeight: '60vh',
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
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: '#FBE8EF',
          color: '#C94F78',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <AlertTriangle size={26} />
      </div>

      <h1
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 28,
          fontWeight: 800,
          color: '#1A1A1A',
          margin: '0 0 8px 0',
        }}
      >
        This page hit a snag.
      </h1>

      <p
        style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize: 14,
          color: '#888',
          maxWidth: 420,
          margin: '0 0 24px 0',
          lineHeight: 1.55,
        }}
      >
        Something on this page crashed, but the rest of GlowBuddy is fine.
        Try again, or head somewhere else.
      </p>

      {isDev && error && (
        <pre
          style={{
            maxWidth: 640,
            width: '100%',
            background: '#FFF5F8',
            border: '1px solid #F4C7D6',
            borderRadius: 8,
            padding: '12px 14px',
            fontSize: 11,
            lineHeight: 1.5,
            color: '#7A2440',
            textAlign: 'left',
            overflowX: 'auto',
            marginBottom: 20,
          }}
        >
          {String(error.message || error)}
          {error.stack ? `\n\n${error.stack.split('\n').slice(0, 6).join('\n')}` : ''}
        </pre>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          onClick={() => {
            if (typeof reset === 'function') reset();
            else if (typeof window !== 'undefined') window.location.reload();
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: '#C94F78',
            color: 'white',
            border: 'none',
            padding: '10px 18px',
            borderRadius: 999,
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          <RotateCw size={14} />
          Try again
        </button>
        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'transparent',
            color: '#C94F78',
            border: '1.5px solid #C94F78',
            padding: '10px 18px',
            borderRadius: 999,
            fontFamily: 'Outfit, sans-serif',
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            textDecoration: 'none',
          }}
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}

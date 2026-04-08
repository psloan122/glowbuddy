import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
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
    return this.props.children;
  }
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { injectSpeedInsights } from '@vercel/speed-insights';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// Suppress Google Maps auth-failure banner — our key is restricted to
// provider-detail routes; the overlay would block unrelated pages.
if (typeof window !== 'undefined') {
  window.gm_authFailure = () => {
    console.warn('[Google Maps] auth failure suppressed');
    setTimeout(() => {
      document.querySelectorAll('.gm-err-container, .gm-err-autocomplete')
        .forEach((el) => el.remove());
    }, 100);
  };
}

injectSpeedInsights();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);

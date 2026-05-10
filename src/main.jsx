import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { Analytics } from '@vercel/analytics/react';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

injectSpeedInsights();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
        <Analytics />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);

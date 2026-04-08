import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { SpeedInsights } from '@vercel/speed-insights/react';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
        <SpeedInsights />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);

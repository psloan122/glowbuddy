import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LoadScript } from '@react-google-maps/api';
import App from './App.jsx';
import './index.css';

const LIBRARIES = ['places'];
const googleKey = import.meta.env.VITE_GOOGLE_PLACES_KEY;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      {googleKey ? (
        <LoadScript googleMapsApiKey={googleKey} libraries={LIBRARIES}>
          <App />
        </LoadScript>
      ) : (
        <App />
      )}
    </BrowserRouter>
  </StrictMode>
);

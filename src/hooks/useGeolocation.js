import { useState, useCallback } from 'react';

// Browser geolocation + reverse geocode to city/state.
// NEVER triggers on page load — only when requestLocation() is called.
// Session-cached so subsequent calls don't re-prompt.

const SESSION_KEY = 'gb_geo_city_v1';

function readCache() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.city && parsed?.state && Number.isFinite(parsed.lat)) {
      return { status: 'success', ...parsed };
    }
  } catch { /* corrupted — ignore */ }
  return null;
}

function writeCache(city, state, lat, lng) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ city, state, lat, lng }));
  } catch { /* quota exceeded — best effort */ }
}

async function reverseGeocode(lat, lng) {
  const key = import.meta.env.VITE_GOOGLE_GEOCODING_KEY;
  if (!key) throw new Error('Missing geocoding key');

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&result_type=locality&key=${key}`
  );
  const data = await res.json();

  if (data.status !== 'OK' || !data.results?.[0]) {
    throw new Error('Could not determine city from location');
  }

  const components = data.results[0].address_components;
  const city = components.find((c) => c.types.includes('locality'))?.long_name || '';
  const state = components.find((c) => c.types.includes('administrative_area_level_1'))?.short_name || '';

  if (!city || !state) throw new Error('Could not determine city');
  return { city, state };
}

/**
 * Hook for explicit "use my location" flow.
 *
 * Returns:
 *   geo.status — 'idle' | 'loading' | 'success' | 'denied' | 'error'
 *   geo.city / geo.state / geo.lat / geo.lng — when status === 'success'
 *   geo.message — when status === 'error'
 *   requestLocation() — triggers browser permission prompt
 */
export default function useGeolocation() {
  const [geo, setGeo] = useState(() => readCache() || { status: 'idle' });

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeo({ status: 'error', message: 'Geolocation not supported' });
      return;
    }

    setGeo({ status: 'loading' });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        try {
          const { city, state } = await reverseGeocode(lat, lng);
          writeCache(city, state, lat, lng);
          setGeo({ status: 'success', city, state, lat, lng });
        } catch {
          setGeo({ status: 'error', message: 'Could not determine your city' });
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGeo({ status: 'denied' });
        } else {
          setGeo({ status: 'error', message: 'Location unavailable' });
        }
      },
      {
        timeout: 10000,
        maximumAge: 300000,
        enableHighAccuracy: false,
      },
    );
  }, []);

  return { geo, requestLocation };
}

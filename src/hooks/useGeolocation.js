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

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Mapbox reverse geocoding: lng,lat order (not lat,lng).
// types=place returns the city-level feature; context[region] gives state.
async function reverseGeocode(lat, lng) {
  if (!MAPBOX_TOKEN) throw new Error('Missing Mapbox token');

  const res = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
    `${lng},${lat}.json` +
    `?types=place&country=US&access_token=${MAPBOX_TOKEN}`
  );
  if (!res.ok) throw new Error('Geocoding request failed');
  const data = await res.json();

  const feature = data.features?.[0];
  if (!feature) throw new Error('Could not determine city from location');

  // feature.text is the city name (e.g. "San Diego").
  // The region context entry carries the two-letter state code as
  // short_code "US-CA" — split on "-" to get "CA".
  const city = feature.text || '';
  const regionCtx = feature.context?.find((c) => c.id?.startsWith('region.'));
  const state = regionCtx?.short_code?.split('-')[1] || '';

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

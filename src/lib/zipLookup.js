import { setZip, setCity, setState } from './gating';

/**
 * Centralized US zipcode lookup.
 *
 * Resolves a 5-digit US zipcode to { city, state, zip, lat, lng } using a
 * cascading strategy so we cover EVERY zipcode in the country, not just
 * the ones one specific service happens to have.
 *
 *   1. In-memory cache    — same lookup in the same session is free.
 *   2. zippopotam.us      — free, no auth, full US coverage in normal cases.
 *                            Fast and reliable for the common case.
 *   3. Google Geocoding   — fallback when zippopotam returns 404 / 5xx /
 *                            network error / a missing place. Uses
 *                            VITE_GOOGLE_GEOCODING_KEY (already wired into
 *                            the app for the /browse map). Google has the
 *                            most complete US postal index — including
 *                            edge cases like brand-new zips, IRS PO box
 *                            zips (00501), and rural-route consolidations
 *                            that zippopotam occasionally misses.
 *
 * String-only handling preserves leading zeros (01001 Springfield, 00501
 * Holtsville, 02101 Boston). We never coerce to Number, never use
 * parseInt — the zip stays a string from input through API call through
 * persistence.
 *
 * @param {string} zipcode - 5-digit US zipcode (leading zeros preserved)
 * @param {object} [options]
 * @param {boolean} [options.persist=true] - Write zip/city/state to
 *   localStorage on success. Pass false from search-as-you-type pickers
 *   so a typo doesn't overwrite the user's saved location.
 * @returns {Promise<{ city: string, state: string, zip: string, lat: number|null, lng: number|null } | null>}
 */
export async function lookupZip(zipcode, options = {}) {
  const { persist = true } = options;

  // Defensive: only accept exactly 5 digits, treated as a string. Anything
  // else is a programming error and should not hit either upstream API.
  if (typeof zipcode !== 'string' || !/^\d{5}$/.test(zipcode)) return null;

  // Cache hit — same zip in the same session is free. The cache value is
  // the resolved object (or null for confirmed misses) so we don't keep
  // re-querying for invalid/unknown zips either.
  if (cache.has(zipcode)) {
    const cached = cache.get(zipcode);
    if (cached && persist) {
      setZip(zipcode);
      setCity(cached.city);
      setState(cached.state);
    }
    return cached;
  }

  // Try zippopotam first — it's the cheapest call and covers ~99% of US
  // zips with ms-level latency.
  const fromZippopotam = await tryZippopotam(zipcode);
  if (fromZippopotam) {
    cache.set(zipcode, fromZippopotam);
    if (persist) {
      setZip(zipcode);
      setCity(fromZippopotam.city);
      setState(fromZippopotam.state);
    }
    return fromZippopotam;
  }

  // Fall through to Google Geocoding for the long tail. This is what
  // catches zips that zippopotam doesn't have (or is temporarily down
  // for). Costs ~$0.005 per request, but only fires when the free path
  // failed, so total cost is bounded by how often zippopotam misses.
  const fromGoogle = await tryGoogleGeocoding(zipcode);
  if (fromGoogle) {
    cache.set(zipcode, fromGoogle);
    if (persist) {
      setZip(zipcode);
      setCity(fromGoogle.city);
      setState(fromGoogle.state);
    }
    return fromGoogle;
  }

  // Both upstreams returned nothing — cache the miss so we don't retry
  // every keystroke for the same dead zip.
  cache.set(zipcode, null);
  return null;
}

// Module-level cache. Lives for the page session only — fine, because
// gating localStorage is the long-term store for the user's chosen zip.
// Map keeps insertion order so we could LRU-trim it if it ever got big,
// but typical sessions only resolve a handful of zips so we don't bother.
const cache = new Map();

async function tryZippopotam(zipcode) {
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zipcode}`);
    if (!res.ok) return null;
    const data = await res.json();
    const place = data?.places?.[0];
    if (!place) return null;
    const city = place['place name'];
    const state = place['state abbreviation'];
    if (!city || !state) return null;

    // zippopotam returns lat/lng as strings — coerce only at the API
    // boundary so the rest of the app gets numbers (or null when the
    // upstream omits them).
    const latRaw = place.latitude;
    const lngRaw = place.longitude;
    const lat = latRaw != null && latRaw !== '' ? Number(latRaw) : null;
    const lng = lngRaw != null && lngRaw !== '' ? Number(lngRaw) : null;

    return {
      city,
      state,
      zip: zipcode,
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
    };
  } catch {
    return null;
  }
}

async function tryGoogleGeocoding(zipcode) {
  const key = import.meta.env.VITE_GOOGLE_GEOCODING_KEY;
  if (!key) {
    // Don't spam the console — this is a soft fallback. The primary path
    // already covers the common case; missing the geocoding key just
    // means we lose the long-tail coverage.
    return null;
  }

  try {
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json` +
      `?components=${encodeURIComponent(`postal_code:${zipcode}|country:US`)}` +
      `&key=${key}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) {
      return null;
    }

    const result = data.results[0];
    const components = Array.isArray(result.address_components)
      ? result.address_components
      : [];

    // Pick the city. Prefer locality; fall back to sublocality, then
    // postal_town, then administrative_area_level_3 — different parts
    // of the US tag the "city" component differently and Google isn't
    // consistent. The order below matches what gets shown in Google
    // Maps' own UI for that postal code.
    const city =
      pickComponent(components, 'locality') ||
      pickComponent(components, 'sublocality_level_1') ||
      pickComponent(components, 'sublocality') ||
      pickComponent(components, 'postal_town') ||
      pickComponent(components, 'neighborhood') ||
      pickComponent(components, 'administrative_area_level_3') ||
      '';
    const state = pickComponent(components, 'administrative_area_level_1', 'short_name') || '';
    if (!city || !state) return null;

    const loc = result.geometry?.location || {};
    const lat = typeof loc.lat === 'number' ? loc.lat : null;
    const lng = typeof loc.lng === 'number' ? loc.lng : null;

    return {
      city,
      state,
      zip: zipcode,
      lat,
      lng,
    };
  } catch {
    return null;
  }
}

function pickComponent(components, type, field = 'long_name') {
  for (const c of components) {
    if (Array.isArray(c.types) && c.types.includes(type)) {
      return c[field] || c.long_name || '';
    }
  }
  return '';
}

// Test-only export so unit tests can clear the cache between runs without
// reaching into the module's private state.
export function __clearZipCacheForTests() {
  cache.clear();
}

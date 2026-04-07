/**
 * Hardcoded city → {lat, lng, zoom} lookup for known US cities and metros.
 * Used as a fast-path before falling back to the Google geocoder so the map
 * centers immediately when a known city is selected.
 *
 * Zoom levels:
 *   10 — large metros (multi-borough/multi-municipality)
 *   12 — single-city centroid
 */

const METRO = 10;
const CITY = 12;

// Keys are normalized: lowercase "city, st"
export const CITY_COORDS = {
  // ── Major metros (zoom 10) ──
  'new york, ny': { lat: 40.7128, lng: -74.006, zoom: METRO },
  'brooklyn, ny': { lat: 40.6782, lng: -73.9442, zoom: METRO },
  'queens, ny': { lat: 40.7282, lng: -73.7949, zoom: METRO },
  'staten island, ny': { lat: 40.5795, lng: -74.1502, zoom: CITY },
  'rego park, ny': { lat: 40.7282, lng: -73.8606, zoom: CITY },
  'edgewater, ny': { lat: 40.8259, lng: -73.9748, zoom: CITY },
  'los angeles, ca': { lat: 34.0522, lng: -118.2437, zoom: METRO },
  'beverly hills, ca': { lat: 34.0736, lng: -118.4004, zoom: CITY },
  'pasadena, ca': { lat: 34.1478, lng: -118.1445, zoom: CITY },
  'sherman oaks, ca': { lat: 34.1511, lng: -118.4493, zoom: CITY },
  'chicago, il': { lat: 41.8781, lng: -87.6298, zoom: METRO },
  'naperville, il': { lat: 41.7508, lng: -88.1535, zoom: CITY },
  'dallas, tx': { lat: 32.7767, lng: -96.797, zoom: METRO },
  'plano, tx': { lat: 33.0198, lng: -96.6989, zoom: CITY },
  'bellaire, tx': { lat: 29.7058, lng: -95.4588, zoom: CITY },
  'anna, tx': { lat: 33.3493, lng: -96.5483, zoom: CITY },
  'phoenix, az': { lat: 33.4484, lng: -112.074, zoom: METRO },
  'tempe, az': { lat: 33.4255, lng: -111.94, zoom: CITY },
  'surprise, az': { lat: 33.6292, lng: -112.3679, zoom: CITY },
  'atlanta, ga': { lat: 33.749, lng: -84.388, zoom: METRO },
  'alpharetta, ga': { lat: 34.0754, lng: -84.2941, zoom: CITY },
  'miami, fl': { lat: 25.7617, lng: -80.1918, zoom: METRO },
  'boca raton, fl': { lat: 26.3683, lng: -80.1289, zoom: CITY },
  'fort lauderdale, fl': { lat: 26.1224, lng: -80.1373, zoom: CITY },
  'jacksonville, fl': { lat: 30.3322, lng: -81.6557, zoom: CITY },
  'orlando, fl': { lat: 28.5384, lng: -81.3789, zoom: CITY },
  'ocoee, fl': { lat: 28.5694, lng: -81.5436, zoom: CITY },
  'tampa, fl': { lat: 27.9506, lng: -82.4572, zoom: CITY },
  'st petersburg, fl': { lat: 27.7676, lng: -82.6403, zoom: CITY },
  'st. petersburg, fl': { lat: 27.7676, lng: -82.6403, zoom: CITY },
  'denver, co': { lat: 39.7392, lng: -104.9903, zoom: METRO },
  'aurora, co': { lat: 39.7294, lng: -104.8319, zoom: CITY },
  'lone tree, co': { lat: 39.5586, lng: -104.8861, zoom: CITY },
  'nashville, tn': { lat: 36.1627, lng: -86.7816, zoom: METRO },
  'franklin, tn': { lat: 35.9251, lng: -86.8689, zoom: CITY },
  'hendersonville, tn': { lat: 36.3048, lng: -86.6201, zoom: CITY },
  'charlotte, nc': { lat: 35.2271, lng: -80.8431, zoom: METRO },
  'fort mill, nc': { lat: 35.0073, lng: -80.9451, zoom: CITY },
  'portland, or': { lat: 45.5152, lng: -122.6784, zoom: METRO },
  'happy valley, or': { lat: 45.4434, lng: -122.5263, zoom: CITY },
  'las vegas, nv': { lat: 36.1699, lng: -115.1398, zoom: METRO },
  'new orleans, la': { lat: 29.9511, lng: -90.0715, zoom: METRO },
  'metairie, la': { lat: 29.9841, lng: -90.1529, zoom: CITY },
  'salt lake city, ut': { lat: 40.7608, lng: -111.891, zoom: METRO },
  'overland park, ks': { lat: 38.9822, lng: -94.6708, zoom: CITY },
  'overland park, mo': { lat: 38.9822, lng: -94.6708, zoom: CITY },
  'st paul, mn': { lat: 44.9537, lng: -93.09, zoom: CITY },
  'st. paul, mn': { lat: 44.9537, lng: -93.09, zoom: CITY },
  'brighton, ma': { lat: 42.3501, lng: -71.1543, zoom: CITY },
  'woburn, ma': { lat: 42.4793, lng: -71.1523, zoom: CITY },
  'arlington, md': { lat: 38.8816, lng: -77.0911, zoom: CITY },
  'fairfax, md': { lat: 38.8462, lng: -77.3064, zoom: CITY },
  'falls church, md': { lat: 38.8823, lng: -77.1711, zoom: CITY },
  'washington, md': { lat: 38.9072, lng: -77.0369, zoom: METRO },
  'washington, dc': { lat: 38.9072, lng: -77.0369, zoom: METRO },
};

/**
 * Look up coordinates for a city string. Accepts:
 *   "Brooklyn, NY"
 *   "brooklyn ny"
 *   "Brooklyn"
 * Returns { lat, lng, zoom } or null if not in the lookup.
 */
export function lookupCityCoords(input) {
  if (!input) return null;
  const cleaned = String(input).trim().toLowerCase();
  if (!cleaned) return null;

  // Direct hit
  if (CITY_COORDS[cleaned]) return CITY_COORDS[cleaned];

  // Normalize comma-less variants like "brooklyn ny"
  const noComma = cleaned.replace(/\s+/g, ' ').replace(',', '');
  for (const key of Object.keys(CITY_COORDS)) {
    const keyNoComma = key.replace(',', '');
    if (keyNoComma === noComma) return CITY_COORDS[key];
  }

  // Bare city name (no state) — match the first city with that name
  if (!cleaned.includes(',')) {
    for (const key of Object.keys(CITY_COORDS)) {
      const cityPart = key.split(',')[0].trim();
      if (cityPart === cleaned) return CITY_COORDS[key];
    }
  }

  return null;
}

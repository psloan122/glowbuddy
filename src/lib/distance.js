// Distance helpers shared across the browse cards, map view, and
// competitor ads module. Distances are computed in miles using the
// great-circle (haversine) formula with Earth radius = 3959 mi.
//
// All functions are defensive: if either coordinate pair is missing or
// non-finite, they return null so the caller can render a fallback
// without a try/catch.

const EARTH_RADIUS_MILES = 3959;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

export function haversineMiles(lat1, lng1, lat2, lng2) {
  if (
    lat1 == null ||
    lng1 == null ||
    lat2 == null ||
    lng2 == null ||
    !Number.isFinite(Number(lat1)) ||
    !Number.isFinite(Number(lng1)) ||
    !Number.isFinite(Number(lat2)) ||
    !Number.isFinite(Number(lng2))
  ) {
    return null;
  }
  const dLat = toRad(Number(lat2) - Number(lat1));
  const dLng = toRad(Number(lng2) - Number(lng1));
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(Number(lat1))) *
      Math.cos(toRad(Number(lat2))) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Short-form label used inside cards: "0.4 mi", "12 mi", "120 mi".
// Sub-mile distances get one decimal so users can tell the difference
// between "around the corner" and "two blocks". Beyond 10 miles we
// round to whole numbers because tenths stop being meaningful.
export function formatMiles(miles) {
  if (miles == null || !Number.isFinite(miles)) return null;
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

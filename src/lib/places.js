/**
 * Search for US cities via Mapbox Geocoding API.
 * Used as a fallback when Supabase has few results for a city name.
 * Returns array of { city, state } objects. No Google dependency.
 */
export async function searchCitiesViaMapbox(query) {
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  if (!token) return [];
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
      `?types=place&country=US&access_token=${token}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    const results = [];
    for (const feature of data.features || []) {
      const city = feature.text || '';
      if (!city) continue;
      const regionCtx = feature.context?.find((c) => c.id?.startsWith('region.'));
      const state = regionCtx?.short_code?.split('-')[1] || '';
      const [lng, lat] = feature.center || [];
      if (city && state) results.push({ city, state, lat, lng });
    }
    return results;
  } catch {
    return [];
  }
}


/**
 * Parse Google Places address_components into structured fields.
 * Handles cities, towns, villages, CDPs, and neighborhoods.
 */
export function parseAddressComponents(components) {
  const result = {
    city: '',
    state: '',
    zipCode: '',
    address: '',
    country: '',
  };

  if (!components) return result;

  let streetNumber = '';
  let route = '';

  for (const component of components) {
    const types = component.types;

    if (types.includes('street_number')) {
      streetNumber = component.long_name;
    } else if (types.includes('route')) {
      route = component.long_name;
    } else if (types.includes('locality')) {
      result.city = component.long_name;
    } else if (types.includes('sublocality_level_1') && !result.city) {
      result.city = component.long_name;
    } else if (types.includes('postal_town') && !result.city) {
      result.city = component.long_name;
    } else if (types.includes('administrative_area_level_3') && !result.city) {
      result.city = component.long_name;
    } else if (types.includes('neighborhood') && !result.city) {
      result.city = component.long_name;
    } else if (types.includes('administrative_area_level_1')) {
      result.state = component.short_name;
    } else if (types.includes('postal_code')) {
      result.zipCode = component.long_name;
    } else if (types.includes('country')) {
      result.country = component.short_name;
    }
  }

  if (streetNumber && route) {
    result.address = `${streetNumber} ${route}`;
  } else if (route) {
    result.address = route;
  }

  return result;
}

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

/**
 * Search for cities/towns via Google Places Autocomplete.
 * @deprecated Use searchCitiesViaMapbox instead — the Mapbox token is
 * already in use everywhere else and has no billing issues.
 * Returns array of { city, state } objects for US localities.
 */
export function searchCitiesViaGoogle(query) {
  return new Promise(async (resolve) => {
    if (!window.google?.maps?.places) {
      try {
        const { loadGoogleMaps } = await import('./loadGoogleMaps');
        await loadGoogleMaps();
        // Wait for places library
        await new Promise((r) => {
          const check = () => window.google?.maps?.places ? r() : setTimeout(check, 100);
          check();
        });
      } catch {
        resolve([]);
        return;
      }
    }
    const places = window.google?.maps?.places;
    if (!places?.AutocompleteService) {
      resolve([]);
      return;
    }

    const service = new places.AutocompleteService();
    service.getPlacePredictions(
      {
        input: query,
        types: ['(regions)'],
        componentRestrictions: { country: 'us' },
      },
      (predictions, status) => {
        if (status !== places.PlacesServiceStatus.OK || !predictions) {
          resolve([]);
          return;
        }

        // Types that represent a city, town, village, or neighborhood
        const localityTypes = [
          'locality', 'sublocality', 'neighborhood',
          'administrative_area_level_3', 'postal_town',
          'colloquial_area',
        ];

        const results = [];
        for (const p of predictions) {
          const types = p.types || [];

          // Only keep locality-level results (skip states, countries)
          if (!types.some((t) => localityTypes.includes(t))) continue;

          const city = p.structured_formatting?.main_text || '';
          if (!city) continue;

          // Parse state abbreviation from secondary text (e.g. "CT, USA")
          const secondary = p.structured_formatting?.secondary_text || '';
          const statePart = secondary.split(',')[0]?.trim() || '';

          let state = '';
          if (/^[A-Z]{2}$/.test(statePart)) {
            state = statePart;
          }

          if (city && state) {
            results.push({ city, state });
          }
        }

        resolve(results);
      }
    );
  });
}

/**
 * Extract photo data from a Google Places result.
 * Returns up to 5 photos with display URLs and attribution.
 */
export function extractGooglePhotos(place) {
  if (!place.photos || place.photos.length === 0) return [];

  return place.photos.slice(0, 5).map((photo, index) => ({
    displayUrl: photo.getUrl({ maxWidth: 800 }),
    attribution: photo.html_attributions?.[0] || null,
    index,
  }));
}

/**
 * Extract all relevant fields from a Google Places detail result.
 */
export function extractPlaceData(place) {
  const parsed = parseAddressComponents(place.address_components);

  return {
    name: place.name || '',
    formattedAddress: place.formatted_address || '',
    city: parsed.city,
    state: parsed.state,
    zipCode: parsed.zipCode,
    address: parsed.address || place.formatted_address || '',
    phone: place.formatted_phone_number || '',
    website: place.website || '',
    placeId: place.place_id || '',
    lat: place.geometry?.location?.lat() ?? null,
    lng: place.geometry?.location?.lng() ?? null,
    googleRating: place.rating ?? null,
    googleReviewCount: place.user_ratings_total ?? null,
    googleMapsUrl: place.url || null,
    googlePriceLevel: place.price_level ?? null,
    googleTypes: place.types || [],
    hoursText: place.opening_hours?.weekday_text?.join(', ') || '',
    googlePhotos: extractGooglePhotos(place),
  };
}

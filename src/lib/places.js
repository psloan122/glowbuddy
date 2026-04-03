/**
 * Parse Google Places address_components into structured fields.
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

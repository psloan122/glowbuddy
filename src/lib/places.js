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
  };
}

export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function providerSlug(name, city, googlePlaceId) {
  if (googlePlaceId) {
    return slugify(googlePlaceId);
  }
  return slugify(`${name} ${city}`);
}

/**
 * Build a URL-safe slug from provider name + city + state.
 * e.g. "Louisiana Glow", "Mandeville", "LA" → "louisiana-glow-mandeville-la"
 */
export function providerSlugFromParts(name, city, state) {
  return `${slugify(name)}-${slugify(city)}-${state.toLowerCase()}`;
}

/**
 * Build a provider profile URL, preferring existing slug.
 */
export function providerProfileUrl(existingSlug, name, city, state) {
  if (existingSlug) return `/provider/${existingSlug}`;
  if (name && city && state) return `/provider/${providerSlugFromParts(name, city, state)}`;
  return null;
}

/**
 * Best-effort conversion of a slug back to a display name.
 * Strips known state codes and title-cases remaining words.
 */
export const STATE_CODES = new Set([
  'al','ak','az','ar','ca','co','ct','de','fl','ga','hi','id','il','in',
  'ia','ks','ky','la','me','md','ma','mi','mn','ms','mo','mt','ne','nv',
  'nh','nj','nm','ny','nc','nd','oh','ok','or','pa','ri','sc','sd','tn',
  'tx','ut','vt','va','wa','wv','wi','wy','dc',
]);

/**
 * "Austin", "TX" → "austin-tx"
 */
export function citySlug(city, state) {
  return `${slugify(city)}-${state.toLowerCase()}`;
}

/**
 * "austin-tx" → { city: "Austin", state: "TX" }
 */
export function parseCitySlug(slug) {
  const parts = slug.split('-');
  const stateCode = parts[parts.length - 1];
  if (STATE_CODES.has(stateCode)) {
    const city = parts.slice(0, -1).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return { city, state: stateCode.toUpperCase() };
  }
  return null;
}

/**
 * Convert a provider slug back to a human-readable display name.
 *
 * Handles two slug formats:
 *   New: "{name}-{city}-{STATE}-{hash}"  e.g. "smith-dermatology-chicago-il-abc123"
 *   Old: "{name}-{city}-{STATE}"         e.g. "smith-dermatology-chicago-il"
 *
 * Strips the trailing state code and, for new-format slugs, the 6-char
 * disambiguation hash that immediately follows it.
 *
 * Hash regex /^[a-z0-9]{6}$/ must stay in sync with shortHash() in
 * scripts/seed-all-providers.js (base-36, .slice(0, 6)).
 */
export function slugToDisplayName(slug) {
  const parts = slug.split('-');
  let end = parts.length;

  // New slug format: "...name-city-STATE-suffix"
  // Drop trailing 6-char base-36 hash and the state code before it.
  if (
    parts.length >= 2 &&
    STATE_CODES.has(parts[end - 2]) &&
    /^[a-z0-9]{6}$/.test(parts[end - 1]) &&
    !STATE_CODES.has(parts[end - 1])
  ) {
    end -= 2;
  } else if (STATE_CODES.has(parts[end - 1])) {
    end -= 1;
  }

  // Safety: don't return empty string
  if (end < 2) {
    return parts
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  return parts
    .slice(0, end)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

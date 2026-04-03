import { setZip, setCity, setState } from './gating';

/**
 * Look up city/state from a US zip code via zippopotam.us.
 * On success, persists zip/city/state via gating helpers.
 * @param {string} zipcode
 * @returns {Promise<{ city: string, state: string } | null>}
 */
export async function lookupZip(zipcode) {
  if (!/^\d{5}$/.test(zipcode)) return null;

  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zipcode}`);
    if (!res.ok) return null;

    const data = await res.json();
    const place = data.places?.[0];
    if (!place) return null;

    const city = place['place name'];
    const state = place['state abbreviation'];

    setZip(zipcode);
    setCity(city);
    setState(state);

    return { city, state };
  } catch {
    return null;
  }
}

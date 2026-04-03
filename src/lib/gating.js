// Centralized localStorage helpers for onboarding and user location personalization

const KEYS = {
  ZIP: 'gb_zip',
  CITY: 'gb_city',
  STATE: 'gb_state',
  INTERESTS: 'gb_interests',
  ONBOARDED: 'gb_onboarded',
};

// --- Zip / City / State ---
export function getZip() {
  return localStorage.getItem(KEYS.ZIP) || '';
}

export function setZip(zip) {
  localStorage.setItem(KEYS.ZIP, zip);
}

export function getCity() {
  return localStorage.getItem(KEYS.CITY) || '';
}

export function setCity(city) {
  localStorage.setItem(KEYS.CITY, city);
}

export function getState() {
  return localStorage.getItem(KEYS.STATE) || '';
}

export function setState(state) {
  localStorage.setItem(KEYS.STATE, state);
}

// --- Onboarding interests ---
export function getInterests() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.INTERESTS) || '[]');
  } catch {
    return [];
  }
}

export function setInterests(interests) {
  localStorage.setItem(KEYS.INTERESTS, JSON.stringify(interests));
}

// --- Onboarding completion ---
export function isOnboarded() {
  return localStorage.getItem(KEYS.ONBOARDED) === 'true';
}

export function setOnboarded() {
  localStorage.setItem(KEYS.ONBOARDED, 'true');
}

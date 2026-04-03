// Centralized localStorage helpers for gating, onboarding, and user location

const KEYS = {
  VIEWS: 'gb_views',
  UNLOCKED: 'gb_unlocked',
  ZIP: 'gb_zip',
  CITY: 'gb_city',
  STATE: 'gb_state',
  INTERESTS: 'gb_interests',
  ONBOARDED: 'gb_onboarded',
};

// --- Card view count ---
export function getViews() {
  return parseInt(localStorage.getItem(KEYS.VIEWS) || '0', 10);
}

export function incrementViews() {
  const next = getViews() + 1;
  localStorage.setItem(KEYS.VIEWS, String(next));
  return next;
}

// --- Gate state ---
export function isUnlocked() {
  return localStorage.getItem(KEYS.UNLOCKED) === 'true';
}

export function unlock() {
  localStorage.setItem(KEYS.UNLOCKED, 'true');
}

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

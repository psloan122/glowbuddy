// Centralized localStorage helpers for onboarding and user location personalization

const KEYS = {
  ZIP: 'gb_zip',
  CITY: 'gb_city',
  STATE: 'gb_state',
  INTERESTS: 'gb_interests',
  ONBOARDED: 'gb_onboarded',
  PROCEDURE_TAGS: 'gb_procedure_tags',
  PREFERENCES: 'gb_preferences',
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

// --- Procedure tags (granular interest tracking) ---
export function getProcedureTags() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.PROCEDURE_TAGS) || '[]');
  } catch {
    return [];
  }
}

export function setProcedureTags(tags) {
  localStorage.setItem(KEYS.PROCEDURE_TAGS, JSON.stringify(tags));
}

// --- Preferences (budget, skin concerns, etc.) ---
export function getPreferences() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.PREFERENCES) || '{}');
  } catch {
    return {};
  }
}

export function setPreferences(prefs) {
  localStorage.setItem(KEYS.PREFERENCES, JSON.stringify(prefs));
}

// --- Sync procedure tags to Supabase on sign-in ---
export async function syncProcedureTagsToSupabase(userId, supabaseClient) {
  const tags = getProcedureTags();
  if (!tags.length || !userId) return;

  try {
    const rows = tags.map((tag) => ({
      user_id: userId,
      procedure_type: tag,
      source: 'onboarding',
    }));

    await supabaseClient
      .from('user_procedure_tags')
      .upsert(rows, { onConflict: 'user_id,procedure_type', ignoreDuplicates: true });
  } catch {
    // Best effort — don't break sign-in
  }
}

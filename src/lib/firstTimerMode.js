import { supabase } from './supabase';

const KEYS = {
  MODE: 'gb_first_timer_mode',
  TREATMENTS: 'gb_first_timer_treatments',
  DISMISSED: 'gb_first_timer_dismissed',
};

// --- Mode toggle ---
export function isFirstTimerMode() {
  return localStorage.getItem(KEYS.MODE) === 'true';
}

export function setFirstTimerMode(on) {
  localStorage.setItem(KEYS.MODE, on ? 'true' : 'false');
}

// --- Treatment list ---
export function getFirstTimerTreatments() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.TREATMENTS) || '[]');
  } catch {
    return [];
  }
}

export function addFirstTimerTreatment(name) {
  const list = getFirstTimerTreatments();
  if (!list.includes(name)) {
    list.push(name);
    localStorage.setItem(KEYS.TREATMENTS, JSON.stringify(list));
  }
}

export function removeFirstTimerTreatment(name) {
  const list = getFirstTimerTreatments().filter((t) => t !== name);
  localStorage.setItem(KEYS.TREATMENTS, JSON.stringify(list));
  if (list.length === 0) setFirstTimerMode(false);
}

export function isFirstTimerFor(name) {
  return isFirstTimerMode() && getFirstTimerTreatments().includes(name);
}

// --- Dismissal (per treatment) ---
function getDismissed() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.DISMISSED) || '{}');
  } catch {
    return {};
  }
}

export function isDismissedFor(name) {
  return !!getDismissed()[name];
}

export function dismissFor(name) {
  const d = getDismissed();
  d[name] = true;
  localStorage.setItem(KEYS.DISMISSED, JSON.stringify(d));
}

// --- Supabase sync (union merge) ---
export async function syncToSupabase(userId) {
  const treatments = getFirstTimerTreatments();
  if (treatments.length === 0) return;
  const rows = treatments.map((t) => ({ user_id: userId, treatment_name: t }));
  await supabase.from('user_first_timer_flags').upsert(rows, {
    onConflict: 'user_id,treatment_name',
    ignoreDuplicates: true,
  });
}

export async function loadFromSupabase(userId) {
  const { data } = await supabase
    .from('user_first_timer_flags')
    .select('treatment_name')
    .eq('user_id', userId);
  if (!data || data.length === 0) return;
  const local = getFirstTimerTreatments();
  const merged = [...new Set([...local, ...data.map((r) => r.treatment_name)])];
  localStorage.setItem(KEYS.TREATMENTS, JSON.stringify(merged));
  if (merged.length > 0 && !isFirstTimerMode()) {
    setFirstTimerMode(true);
  }
}

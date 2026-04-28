// Centralized URL parameter helpers for the browse/search flows.
//
// Goals:
//   1. Map free-text keywords ("botox", "lip filler") and category labels
//      ("Lip Filler", "Microneedling") to a stable procedure pill slug that
//      resolveProcedureFilter() in constants.js can consume.
//   2. Build canonical /browse?... URLs with consistent param ordering.
//   3. Parse a search-bar query string into { city, state, procedure }
//      so the homepage search bar can route directly to a populated
//      browse page.
//
// IMPORTANT: All slugs returned here MUST be valid procedure pill slugs
// (PROCEDURE_PILLS in constants.js). Do NOT introduce slugs that
// resolveProcedureFilter cannot resolve, or the browse page will fall
// through to the gate state.

import { US_STATES, VALID_STATE_CODES } from './constants';

// Keyword → { slug, brand }. Slugs match PROCEDURE_PILLS in constants.js.
// Brand is the canonical brand name used as-is in URL ?brand=... and in
// Supabase equality filters against provider_pricing.brand.
//
// Listed in priority order — multi-word keywords MUST come before their
// substrings (e.g. "lip filler" before "filler") because parseProcedureFromText
// returns on first match.
export const PROCEDURE_KEYWORDS = {
  // Multi-word first
  'lip filler': { slug: 'filler', brand: null },
  'rf microneedling': { slug: 'rf-tightening', brand: null },
  'iv therapy': { slug: 'iv-wellness', brand: null },
  'iv drip': { slug: 'iv-wellness', brand: null },
  'iv vitamin': { slug: 'iv-wellness', brand: null },
  'chemical peel': { slug: 'chemical-peel', brand: null },
  'thread lift': { slug: 'thread-lift', brand: null },
  'laser hair removal': { slug: 'laser-hair-removal', brand: null },
  'body contouring': { slug: 'coolsculpting', brand: null },
  'weight loss': { slug: 'weight-loss', brand: null },

  // Brand-specific neurotoxin keywords
  botox: { slug: 'neurotoxin', brand: 'Botox' },
  dysport: { slug: 'neurotoxin', brand: 'Dysport' },
  xeomin: { slug: 'neurotoxin', brand: 'Xeomin' },
  jeuveau: { slug: 'neurotoxin', brand: 'Jeuveau' },
  daxxify: { slug: 'neurotoxin', brand: 'Daxxify' },

  // Brand-specific filler keywords
  juvederm: { slug: 'filler', brand: 'Juvederm' },
  restylane: { slug: 'filler', brand: 'Restylane' },
  sculptra: { slug: 'filler', brand: 'Sculptra' },
  radiesse: { slug: 'filler', brand: 'Radiesse' },

  // Weight-loss brand keywords (no brand split for now — all map to slug)
  semaglutide: { slug: 'weight-loss', brand: null },
  tirzepatide: { slug: 'weight-loss', brand: null },
  ozempic: { slug: 'weight-loss', brand: null },
  wegovy: { slug: 'weight-loss', brand: null },
  mounjaro: { slug: 'weight-loss', brand: null },
  zepbound: { slug: 'weight-loss', brand: null },
  morpheus: { slug: 'rf-tightening', brand: null },
  morpheus8: { slug: 'rf-tightening', brand: null },

  // Single-word categories (brand=null means "all brands in this category")
  neurotoxin: { slug: 'neurotoxin', brand: null },
  tox: { slug: 'neurotoxin', brand: null },
  filler: { slug: 'filler', brand: null },
  fillers: { slug: 'filler', brand: null },
  laser: { slug: 'laser', brand: null },
  microneedling: { slug: 'microneedling', brand: null },
  coolsculpting: { slug: 'coolsculpting', brand: null },
  'glp-1': { slug: 'weight-loss', brand: null },
  glp1: { slug: 'weight-loss', brand: null },
  hydrafacial: { slug: 'hydrafacial', brand: null },
  prp: { slug: 'prp', brand: null },
  kybella: { slug: 'kybella', brand: null },
  emsculpt: { slug: 'emsculpt', brand: null },
  dermaplaning: { slug: 'dermaplaning', brand: null },
};

// State name → code lookup. e.g. "louisiana" → "LA".
const STATE_NAME_TO_CODE = (() => {
  const map = {};
  for (const s of US_STATES) {
    map[s.label.toLowerCase()] = s.value;
    map[s.value.toLowerCase()] = s.value;
  }
  return map;
})();

// Find a { slug, brand } match for a free-text query. Returns null if no
// keyword matches. Iteration order matches PROCEDURE_KEYWORDS declaration
// (multi-word entries first). Brand-specific keywords like "botox" take
// priority over generic "neurotoxin" because they appear earlier in the map.
export function parseProcedureFromText(text) {
  if (!text) return null;
  const lower = String(text).toLowerCase();
  for (const [keyword, value] of Object.entries(PROCEDURE_KEYWORDS)) {
    // \b doesn't anchor against hyphens, so use a manual word-ish boundary
    // for short tokens to avoid "tox" matching "intoxicated".
    const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegex(keyword)}([^a-z0-9]|$)`, 'i');
    if (pattern.test(lower)) return value;
  }
  return null;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Best-effort parse of "Botox in Mandeville LA" or "Lip filler New Orleans"
// into { city, state, procedure }. Designed for the homepage search bar —
// the browse page itself still has structured inputs.
//
// Strategy:
//   1. Detect a procedure keyword and strip it.
//   2. Strip the leading " in " connector if present.
//   3. Detect a 2-letter state code or full state name from the tail and
//      strip it.
//   4. Whatever remains is treated as the city.
export function parseSearchQuery(text) {
  const match = parseProcedureFromText(text);
  const procedure = match?.slug || null;
  const brand = match?.brand || null;
  if (!text) return { city: '', state: '', procedure, brand };

  let remaining = String(text).trim();

  // Strip the matched procedure keyword (longest match wins so we don't
  // half-strip "lip filler" and leave "lip" behind). We strip ALL keywords
  // that map to the same slug to catch synonyms the user typed alongside
  // the primary match (e.g. "neurotoxin botox" → procedure still resolves
  // and both words are stripped from the city tail).
  if (procedure) {
    const sorted = Object.keys(PROCEDURE_KEYWORDS)
      .filter((k) => PROCEDURE_KEYWORDS[k].slug === procedure)
      .sort((a, b) => b.length - a.length);
    for (const kw of sorted) {
      const re = new RegExp(`(^|[^a-z0-9])${escapeRegex(kw)}([^a-z0-9]|$)`, 'gi');
      remaining = remaining.replace(re, ' ');
    }
  }

  // Strip standalone " in " connectors and collapse whitespace.
  remaining = remaining.replace(/\bin\b/gi, ' ').replace(/\s+/g, ' ').trim();

  // Try to peel a state off the end. Accept either "Mandeville, LA" or
  // "Mandeville Louisiana".
  let state = '';
  const trailingCode = remaining.match(/(?:[,\s]+)([A-Za-z]{2})\s*$/);
  if (trailingCode && VALID_STATE_CODES.has(trailingCode[1].toUpperCase())) {
    state = trailingCode[1].toUpperCase();
    remaining = remaining.slice(0, trailingCode.index).trim();
  } else {
    // Try matching a full state name at the tail.
    const lower = remaining.toLowerCase();
    for (const [name, code] of Object.entries(STATE_NAME_TO_CODE)) {
      if (name.length < 3) continue;
      if (lower.endsWith(name)) {
        state = code;
        remaining = remaining.slice(0, remaining.length - name.length).replace(/[,\s]+$/, '').trim();
        break;
      }
    }
  }

  const city = remaining.replace(/[,\s]+$/, '').trim();
  return { city, state, procedure, brand };
}

// Build a /browse URL with stable param ordering. Drops empty values so
// we never produce ?city=&state=.
export function buildBrowseUrl({ city, state, procedure, brand, sort, lat, lng } = {}) {
  const params = new URLSearchParams();
  if (city) params.set('city', city);
  if (state) params.set('state', state);
  if (procedure) params.set('procedure', procedure);
  if (brand) params.set('brand', brand);
  if (sort) params.set('sort', sort);
  if (lat != null && lng != null) {
    params.set('lat', String(lat));
    params.set('lng', String(lng));
  }
  const qs = params.toString();
  return qs ? `/browse?${qs}` : '/browse';
}

// Slug used by the city report routes (e.g. "mandeville-la").
export function getCitySlug(city, state) {
  if (!city || !state) return '';
  return `${String(city).toLowerCase().replace(/\s+/g, '-')}-${String(state).toLowerCase()}`;
}

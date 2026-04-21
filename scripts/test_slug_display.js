#!/usr/bin/env node
/**
 * Unit tests for slugToDisplayName (src/lib/slugify.js).
 *
 * Run: node scripts/test_slug_display.js
 *
 * Covers:
 *   - New-format slug (name + city + STATE + 6-char hash)
 *   - Old-format slug (name + city + STATE, no hash)
 *   - No-state slug (old providerSlug format)
 *   - Pathological short slug (stripping would leave < 2 tokens → full fallback)
 *   - Slug where a city name fragment matches a state code
 */

import { slugToDisplayName } from '../src/lib/slugify.js';

const tests = [
  // ── New-format slugs (name-city-STATE-hash) ────────────────────────────────
  {
    desc: 'new-format: strips state + 6-char hash',
    input: 'health-link-medical-group-oceanside-ca-3pamps',
    // shortHash is exactly 6 chars base-36; 'ca' is the state code
    expected: 'Health Link Medical Group Oceanside',
  },
  {
    desc: 'new-format: everglow (used in 3.3 verification)',
    input: 'everglow-medical-aesthetics-kennebunk-me-y5nr0o',
    expected: 'Everglow Medical Aesthetics Kennebunk',
  },
  {
    desc: 'new-format: smith-dermatology canonical example',
    input: 'smith-dermatology-chicago-il-abc123',
    expected: 'Smith Dermatology Chicago',
  },
  {
    desc: 'new-format: multi-word city',
    input: 'besos-aesthetics-los-angeles-ca-f2zk9p',
    expected: 'Besos Aesthetics Los Angeles',
  },

  // ── Old-format slugs (name-city-STATE, no hash) ────────────────────────────
  {
    desc: 'old-format: strips trailing state only',
    input: 'smith-dermatology-chicago-il',
    expected: 'Smith Dermatology Chicago',
  },
  {
    desc: 'old-format: single-word city',
    input: 'la-mer-spa-dallas-tx',
    expected: 'La Mer Spa Dallas',
  },

  // ── No-state slugs (providerSlug(name, city) or Google Place ID) ───────────
  {
    desc: 'no-state: renders whole slug title-cased',
    input: 'riverside-med-spa-riverside',
    expected: 'Riverside Med Spa Riverside',
  },
  {
    desc: 'no-state: Google Place ID slug (no state or hash)',
    input: 'chij7ncjzulglwcebvngrjq',
    expected: 'Chij7ncjzulglwcebvngrjq',
  },

  // ── Pathological: stripping would leave < 2 tokens → full fallback ─────────
  {
    desc: 'short slug — stripping leaves < 2 tokens, use full slug',
    input: 'a-ca-abc123',
    // end would be 1 after stripping, triggering full fallback
    expected: 'A Ca Abc123',
  },
  {
    desc: 'state-only slug — stripping leaves 0 tokens, use full slug',
    input: 'ca',
    expected: 'Ca',
  },

  // ── Edge: city name fragment that is a state code ──────────────────────────
  {
    desc: 'city fragment matches state code (IN for Indiana city)',
    input: 'highland-park-spa-highland-in-g3r4s5',
    expected: 'Highland Park Spa Highland',
  },
];

let pass = 0;
let fail = 0;

console.log(`\nRunning ${tests.length} slugToDisplayName tests...\n`);

for (const t of tests) {
  const got = slugToDisplayName(t.input);
  if (got === t.expected) {
    console.log(`  PASS  ${t.desc}`);
    pass++;
  } else {
    console.log(`  FAIL  ${t.desc}`);
    console.log(`        input:    "${t.input}"`);
    console.log(`        expected: "${t.expected}"`);
    console.log(`        got:      "${got}"`);
    fail++;
  }
}

console.log(`\n${'='.repeat(55)}`);
if (fail === 0) {
  console.log(`All ${pass} tests passed.`);
} else {
  console.log(`${fail} / ${pass + fail} tests FAILED.`);
}
console.log('='.repeat(55));

process.exit(fail === 0 ? 0 : 1);

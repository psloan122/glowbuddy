// Browse-page grouping helper.
//
// When a single provider lists multiple brand variants of the same procedure
// category — e.g. PBK Medspa offering Botox $15, Xeomin $14, and Dysport $5
// (all neurotoxins) — we want to render ONE card with all three brands
// instead of three separate cards. This file owns that grouping logic so
// FindPrices.jsx can stay focused on filtering / sorting.
//
// Grouping rules:
//   1. The grouping key is `${providerKey}::${categoryTag}`.
//   2. providerKey is provider_id when present, otherwise a normalized
//      `${provider_name}-${city}-${state}` string.
//   3. categoryTag comes from constants.getCategoryTag(procedure_type).
//      When the row's procedure type doesn't map to a category tag, we
//      fall back to the raw procedure_type string so unrelated procedures
//      never collapse into one card.
//   4. A group is only emitted as a "brand group" when it contains 2+ rows.
//      Single-row groups pass through unchanged so the existing
//      ProcedureCard renderer keeps working.
//
// We never blend price types across the group's `compareUnit`. The card
// shows whatever per-unit/per-session/per-syringe value each row natively
// has (already normalized upstream).

import { getCategoryTag } from './constants';

function providerKey(row) {
  if (row.provider_id) return `pid:${row.provider_id}`;
  const name = (row.provider_name || '').toLowerCase().trim();
  const city = (row.city || '').toLowerCase().trim();
  const state = (row.state || '').toLowerCase().trim();
  return `name:${name}|${city}|${state}`;
}

function categoryKey(row) {
  return getCategoryTag(row.procedure_type) || `proc:${row.procedure_type || ''}`;
}

// Comparable price used to sort brand rows ascending. Falls back to the
// raw price_paid when no normalized comparable value is present.
function compareValue(row) {
  if (row.normalized_compare_value != null) return Number(row.normalized_compare_value);
  return Number(row.price_paid) || Infinity;
}

/**
 * Group an array of procedure rows by (provider, category).
 *
 * Returns an array preserving the original sort order of the FIRST row in
 * each group. Each entry has shape:
 *
 *   { kind: 'single', row }                       // single-row passthrough
 *   { kind: 'group', key, rows, lead, category }  // 2+ row brand group
 *
 * `lead` is the cheapest row in the group by comparable value. `rows` is
 * the full set sorted ascending by compareValue.
 */
export function groupBrandRows(procedures) {
  if (!Array.isArray(procedures) || procedures.length === 0) return [];

  const groups = new Map();
  const order = [];

  for (const row of procedures) {
    const key = `${providerKey(row)}::${categoryKey(row)}`;
    if (!groups.has(key)) {
      groups.set(key, { key, rows: [] });
      order.push(key);
    }
    groups.get(key).rows.push(row);
  }

  return order.map((key) => {
    const g = groups.get(key);
    if (g.rows.length === 1) {
      return { kind: 'single', row: g.rows[0] };
    }
    const sorted = [...g.rows].sort((a, b) => compareValue(a) - compareValue(b));
    return {
      kind: 'group',
      key,
      rows: sorted,
      lead: sorted[0],
      category: getCategoryTag(sorted[0].procedure_type),
    };
  });
}

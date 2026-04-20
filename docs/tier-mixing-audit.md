# Tier-Mixing Audit
**Date:** 2026-04-19  
**Scope:** Read-only. No code was modified.  
**Supabase project:** bykrkrhsworzdtvsdkec

Tier model used throughout:
- **Potency tier:** `per_unit` — drug quantity cost
- **Visit tier:** `per_session`, `flat_package` — full-appointment cost
- **Component tier:** `per_area`, `per_syringe`, `per_vial`, `per_cycle` — one element of a visit

Aggregates that mix across tiers are meaningless numbers.  
Within component-tier, `per_area` (forehead neurotoxin) and `per_syringe` (lip filler) are also incomparable.

---

## Check 1 — `city_benchmarks` column inventory

### 1.1 Column list

`city_benchmarks` is not defined in `supabase/schema.sql` — the table was created by an early migration that predates the numbered sequence. Its authoritative shape is inferred from the `INSERT` target list in `refresh_city_benchmarks()` (`supabase/migrations/079_city_benchmarks_fix.sql`):

| Column | Type | Notes |
|--------|------|-------|
| `city` | text | Part of the unique key |
| `state` | text | Part of the unique key |
| `procedure_type` | text | Part of the unique key |
| `avg_unit_price` | numeric | Mean of per_unit rows |
| `unit_price_count` | integer | Sample size for avg_unit_price |
| `avg_visit_price` | numeric | Mean of per_session / flat_package / per_area rows |
| `visit_price_count` | integer | Sample size for avg_visit_price |
| `estimated_visit_from_units` | numeric | `avg_unit_price × 28` (derived) |
| `total_records` | integer | All active, non-suppressed rows, any label |
| `updated_at` | timestamptz | Stamped by `refresh_city_benchmarks()` |

Unique constraint: `(city, state, procedure_type)`.

Note: `city_benchmarks` is a **separate table** from `city_price_benchmarks` (migration 073), which stores Reddit community averages for Botox only and is populated by `full_upload.py`.

---

### 1.2 What populates each column

The **only** code path that writes to `city_benchmarks` is `refresh_city_benchmarks()`, defined in `supabase/migrations/079_city_benchmarks_fix.sql` lines 68–134. It does a `TRUNCATE` followed by a single `INSERT … SELECT … GROUP BY`.

No scheduled Edge Function, no cron job, and no React hook write to or read from `city_benchmarks`. The function must be called manually:

```sql
SELECT * FROM refresh_city_benchmarks();
```

Trigger points documented in migrations: after 080b DELETE, after 081 UPDATE, and presumably after any bulk import. There is no automated scheduling wired up.

---

### 1.3 Price_label filter per column

From the `refresh_city_benchmarks()` body (`079_city_benchmarks_fix.sql` lines 96–119):

```sql
-- avg_unit_price / unit_price_count
AVG(CASE WHEN pp.price_label = 'per_unit'                                THEN pp.price END)
COUNT(CASE WHEN pp.price_label = 'per_unit'                              THEN 1 END)

-- avg_visit_price / visit_price_count
AVG(CASE WHEN pp.price_label IN ('per_session','flat_package','per_area') THEN pp.price END)
COUNT(CASE WHEN pp.price_label IN ('per_session','flat_package','per_area') THEN 1 END)

-- estimated_visit_from_units
AVG(CASE WHEN pp.price_label = 'per_unit' THEN pp.price END) * 28

-- total_records
COUNT(*)   -- no label filter; all active, non-suppressed rows
```

**`avg_unit_price`** — strict `per_unit` only. No tier mixing. ✓  
**`avg_visit_price`** — mixes `per_session`, `flat_package`, and `per_area`. See §1.4 below.  
**`total_records`** — counts all labels. Intentional "total rows" count, not an aggregate price. ✓  
**`per_vial`, `per_syringe`, `per_cycle`, `per_ml`** — correctly excluded from both price aggregates. ✓

---

### 1.4 `avg_visit_price` tier mixing

**BUG — Medium severity.**

`avg_visit_price` combines three economically distinct quantities:

| Label | Meaning | Typical range (neurotoxin) |
|-------|---------|--------------------------|
| `per_session` | One complete appointment | $200–$800 |
| `flat_package` | Multi-session bundle deal | $400–$2,000+ |
| `per_area` | One anatomical area (forehead, 11s…) | $100–$400 |

A single flat_package row for a "12-session Botox package at $2,400" would inflate `avg_visit_price` by 3-10× compared to a city of per_session-only rows. `per_area` is a component price, not a full-visit price; including it with `per_session` deflates the average.

**Mitigating factor:** `city_benchmarks` is not queried anywhere in the React source code (`src/`). No Edge Function reads from it either (verified by grep of `supabase/functions/`). The table appears to be maintained for internal analytics or future use but is currently inert from a user-facing perspective.

---

## Check 2 — `get_provider_price_summary` RPC behavior

### 2.1 Full SQL definition and filter walkthrough

Source: `supabase/migrations/082_provider_price_summary.sql`

```sql
CREATE OR REPLACE FUNCTION get_provider_price_summary(
  p_procedure_type  text,
  p_city            text,
  p_state           text,
  p_price_label     text DEFAULT 'per_unit'
)
```

**Phase 1 — city-level stats (runs once):**

```sql
WITH ranked AS (
  SELECT
    pp.price,
    PERCENT_RANK() OVER (ORDER BY pp.price) AS pr
  FROM provider_pricing pp
  JOIN providers prov ON prov.id = pp.provider_id
  WHERE pp.procedure_type  ILIKE ('%' || p_procedure_type || '%')
    AND prov.city          ILIKE ('%' || p_city || '%')
    AND prov.state         = p_state
    AND pp.price_label     = p_price_label        -- ← single label only
    AND pp.is_active       = true
    AND pp.display_suppressed = false
    AND pp.price           > 0
)
SELECT
  COUNT(*)::integer,
  ROUND(AVG(price) FILTER (WHERE pr BETWEEN 0.10 AND 0.90)::numeric, 2),  -- 10% trimmed mean
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY price)::numeric, 2),
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY price)::numeric, 2),
  ROUND(MIN(price)::numeric, 2),
  ROUND(MAX(price)::numeric, 2)
INTO v_city_n, v_trimmed, v_p25, v_p75, v_city_min, v_city_max
FROM ranked;
```

**Phase 2 — per-provider rows:**

```sql
RETURN QUERY SELECT
  prov.id, prov.name, prov.slug, prov.lat::float8, prov.lng::float8,
  ROUND(MIN(pp.price)::numeric, 2),
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY pp.price)::numeric, 2),
  ROUND(MAX(pp.price)::numeric, 2),
  COUNT(*)::integer, MAX(pp.created_at),
  v_city_n, v_trimmed, v_p25, v_p75, v_city_min, v_city_max
FROM provider_pricing pp
JOIN providers prov ON prov.id = pp.provider_id
WHERE pp.procedure_type  ILIKE ('%' || p_procedure_type || '%')
  AND prov.city          ILIKE ('%' || p_city || '%')
  AND prov.state         = p_state
  AND pp.price_label     = p_price_label          -- ← single label only
  AND pp.is_active       = true
  AND pp.display_suppressed = false
  AND pp.price           > 0
GROUP BY prov.id, prov.name, prov.slug, prov.lat, prov.lng
ORDER BY MIN(pp.price) ASC;
```

Both phases use `pp.price_label = p_price_label` — a strict equality filter. **No tier mixing.** ✓

---

### 2.2 Parameter scenarios

**Scenario A — Normal call (`p_price_label = 'per_unit'`):**

Both the city CTE and the per-provider SELECT filter to `price_label = 'per_unit'` only. All returned `city_trimmed_mean`, `city_min`, `city_max` values are per-unit prices. The per-provider `min_price`/`median_price`/`max_price` are per-unit prices. No mixing. ✓

**Scenario B — Null passed explicitly (`p_price_label = NULL`):**

In SQL, `pp.price_label = NULL` evaluates to `NULL` (three-valued logic), which is never `TRUE`. Both the city CTE and per-provider queries produce **zero rows**. The function returns an empty result set — not a tier-mixed rowset. The caller in `FindPrices.jsx` handles this:

```javascript
// useEffect guard (FindPrices.jsx ~line 1913):
if (!filterFuzzyToken || !filterCity || !filterState || !activePriceLabel) return undefined;
```

`activePriceLabel` is `null` when no procedure filter is active, so the RPC call is never made in that state. The guard works. ✓

**Scenario C — Parameter doesn't match any row (`p_price_label = 'per_unit'` but city has no such rows):**

Both phases return zero rows. `v_city_n`, `v_trimmed`, etc. are all `NULL`. The `RETURN QUERY` SELECT returns an empty set. The client code handles this:

```javascript
if (!data?.length) { setPriceSummary(null); return; }
```

The `priceSummary` state stays null; `cityAvgPrice` falls back to client-side computation. ✓

---

### 2.3 Null parameter — tier-mixed rowset?

**No.** As described in Scenario B, `p_price_label = NULL` returns zero rows. The SQL equality predicate on a null parameter produces no matches at all, so there is no tier-mixed rowset to worry about.

The only remaining concern is whether `activePriceLabel.replace(/\s+/g, '_')` correctly converts the space-separated client format to the DB underscore format before the RPC call. See §3.4 for the full analysis.

---

## Check 3 — `normalized_compare_unit` column

### 3.1 Where it lives

`normalized_compare_unit` is **not a database column.** It is a client-side virtual field computed by `normalizePrice()` in `src/lib/priceUtils.js` and attached to price row objects in `FindPrices.jsx` at line 1211:

```javascript
// FindPrices.jsx:1211
normalized_compare_unit: normalized.compareUnit,
```

where `normalized` is the return value of `normalizePrice({ procedure_type, price, price_label, … })`.

The field exists only in React component memory (the `displayedProcedures` array) and in procedure row objects passed to child components. It is never stored in Supabase.

---

### 3.2 Distinct `normalized_compare_unit` values

Since the field is client-computed, no database `SELECT DISTINCT` is possible. The exhaustive value set is derived from `normalizePrice()` in `src/lib/priceUtils.js`:

| `price_label` (DB) | `UNIT_DISPLAY[label]` | `compareUnit` produced |
|--------------------|----------------------|----------------------|
| `per_unit` (normal range) | `'/ unit'` | **`'per unit'`** |
| `per_unit` neurotoxin > $50 (reclassified) | *(special branch)* | **`'per area'`** |
| `per_session` | `'/ session'` | **`'per session'`** |
| `per_syringe` | `'/ syringe'` | **`'per syringe'`** |
| `per_vial` | `'/ vial'` | **`'per vial'`** |
| `per_area` | `''` (falsy) | **`''`** (empty string) |
| `per_cycle` | `'/ cycle'` | **`'per cycle'`** |
| `per_month` / `monthly` | `'/ month'` | **`'per month'`** |
| `flat_package` | `''` (falsy) | **`''`** (empty string) |
| `flat_rate_area` | `''` (falsy) | **`''`** (empty string) |
| `per_ml` | `'/ ml'` | **`'per ml'`** |
| any unrecognized label | `undefined` | *(falls through to `HIDDEN`, returns `''`)* |

Formula: `unitSuffix ? unitSuffix.replace('/ ', 'per ') : ''`

So `'/ unit'` → `'per unit'`, `'/ syringe'` → `'per syringe'`, etc. Empty-suffix labels (`per_area`, `flat_package`, `flat_rate_area`) → `''`.

---

### 3.3 price_label → normalized_compare_unit mapping; inconsistency flags

| `price_label` | `normalized_compare_unit` | `comparableValue` | Used in averages? |
|---------------|--------------------------|-------------------|-------------------|
| `per_unit` (≤ $50 neurotoxin, or non-neurotoxin) | `'per unit'` | `price` | Yes (per-unit avg) |
| `per_unit` (neurotoxin > $50) | `'per area'` | `null` | No — excluded |
| `per_session` | `'per session'` | `price` | No (not in per-unit avg) |
| `flat_package` | `''` | `null` | No |
| `per_area` | `''` | `price` | **See FLAG 1** |
| `per_syringe` | `'per syringe'` | `price` | No (not in per-unit avg) |
| `per_vial` | `'per vial'` | `price` | No |
| `per_cycle` | `'per cycle'` | `price` | No |
| `per_month` | `'per month'` | `price` | No |
| `per_ml` | `'per ml'` | `price` | No |
| `flat_rate_area` | `''` | `null` | No |

**FLAG 1 — `per_area` inconsistency (Low severity):**  
A `per_area` DB row produces `compareUnit = ''` (empty string) because `UNIT_DISPLAY['per_area'] = ''` is falsy. But a neurotoxin `per_unit` row reclassified client-side produces `compareUnit = 'per area'` (non-empty string with spaces). These two cases have the same semantic meaning ("an area-priced row") but different `normalized_compare_unit` values.

In practice this is benign for averages: `per_area` rows have `comparableValue = price` (which could be $200–$400) but their `compareUnit = ''` causes every comparison against `'per unit'` to return false, so they never contaminate the per-unit average. The reclassified rows have `comparableValue = null`, so they're excluded from any numeric average. Both paths are excluded from `cityAvgPrice`.

The inconsistency would matter only if code ever filters `normalized_compare_unit === 'per area'` — which no current code path does.

---

### 3.4 Space (`'per unit'`) vs underscore (`'per_unit'`) — exact values on both sides

This is the most operationally critical string-format question. Here is every comparison site:

#### DB storage
`provider_pricing.price_label` stores underscores: `'per_unit'`, `'per_session'`, `'per_syringe'`, etc. Defined in `src/utils/formatPricingUnit.js`:
```javascript
export const UNIT = {
  PER_UNIT:     'per_unit',
  PER_SESSION:  'per_session',
  PER_SYRINGE:  'per_syringe',
  ...
}
```

#### Client-side virtual field
`normalized_compare_unit` uses **spaces**: `'per unit'`, `'per session'`, `'per syringe'`.  
Produced by `normalizePrice()`: `unitSuffix.replace('/ ', 'per ')` → `'/ unit'` → `'per unit'`.

#### `activePriceLabel` (FindPrices.jsx line 947)
```javascript
const activePriceLabel = useMemo(() => {
  if (procFilter?.slug === 'neurotoxin' || brandFilter) return 'per unit';   // SPACE
  if (procFilter?.slug === 'filler') return 'per syringe';                   // SPACE
  return null;
}, [procFilter, brandFilter]);
```
Uses **spaces** — matches `normalized_compare_unit` format. ✓

#### GlowMap bestRow filter (GlowMap.jsx line 412)
```javascript
if (!activePriceLabel || r.normalized_compare_unit === activePriceLabel) {
```
Both sides are space format (`'per unit'` = `'per unit'`). ✓

#### MapListCard leadRow filter (FindPrices.jsx line 4004)
```javascript
group.procedures.find((p) => p.normalized_compare_unit === activePriceLabel)
```
Both sides space format. ✓

#### PriceContextBar fallback filter (PriceContextBar.jsx line 41)
```javascript
.filter((p) => p.normalized_compare_unit === 'per unit')
```
Hardcoded space format matches. ✓

#### RPC call conversion (FindPrices.jsx line 1920)
```javascript
p_price_label: activePriceLabel.replace(/\s+/g, '_'),
```
`'per unit'` → `'per_unit'` ✓  
`'per syringe'` → `'per_syringe'` ✓  
Correctly converts from space format (client) to underscore format (DB) before the RPC call. ✓

#### `leadPrice.price_label` construction (FindPrices.jsx line 4012)
```javascript
price_label:
  leadRow.price_label ||
  leadRow.normalized_compare_unit?.replace(/^per /, 'per_') ||
  null,
```
`'per unit'` → `'per_unit'` ✓  
`'per syringe'` → `'per_syringe'` ✓  
Correctly converts back to underscore when `price_label` is absent. ✓

**No space/underscore mismatch exists in any critical comparison path.**

#### Residual risk — personalized mode fallback (FindPrices.jsx line 3891)
```javascript
// Personalized mode MapListCard (separate render path from main browse):
price_label: top.price_label || 'per_unit',
```
This is the old pattern — if `top.price_label` is null (community-submitted rows sometimes have no label), the card will display every procedure as "per unit" regardless of its actual type. This affects only the personalized view, not the main /browse flow. See severity ranking below.

---

## Summary table

| # | Location | Finding | Tier mixing? | Severity |
|---|----------|---------|--------------|----------|
| C1.4 | `city_benchmarks.avg_visit_price` | Mixes `per_session` + `flat_package` + `per_area` into one aggregate | **Yes** | **Medium** — table is not read by frontend, but any future consumer (Edge Function, internal dashboard) will get a meaningless average |
| C1.bonus | `city_benchmarks` — React usage | Table is maintained and refreshed but not queried by any React page, hook, or Edge Function | N/A | **Low** — the effort to maintain it is wasted until a consumer is wired up; could create confusion |
| C2.3 | RPC null parameter | `p_price_label = NULL` returns zero rows (not a mixed rowset); client guard prevents null from being passed | No | **Low** — guarded correctly on both sides; document the SQL three-valued-logic behavior so future callers know not to pass null |
| C3.1 | `normalized_compare_unit` | Not a DB column — client-computed virtual field; cannot be queried with SQL | N/A | **Low** — operational risk if someone adds a DB-side query expecting to find the column |
| C3.3 | `per_area` compareUnit inconsistency | DB `per_area` label → `compareUnit = ''`; client-reclassified neurotoxin row → `compareUnit = 'per area'`. Two different representations of the same concept. | No (both excluded from averages) | **Low** — benign today; would matter if any code path filters `=== 'per area'` |
| C3.4 | Personalized mode `price_label \|\| 'per_unit'` fallback | FindPrices.jsx line 3891: if `top.price_label` is null, card shows "per unit" for any procedure type | Potential display error | **Low** — affects personalized view only, not main /browse; card label would be wrong but no aggregate is contaminated |

---

## Recommendations — what must precede migration 083b (relabeling)

**Must fix before 083b:**  
None. The critical path (`get_provider_price_summary` RPC → `cityAvgPrice` → GlowMap → PriceContextBar → MapListCard) has no tier-mixing bugs after the 082/React changes.

**Should fix before the next scrape run:**  
The scraper plausibility guard proposed in the mislabeling audit (Prompt F). The `city_benchmarks.avg_visit_price` mixing bug (C1.4) is a pre-existing issue that should be fixed in a migration that rebuilds the column using `per_session` only — but since no front-end code reads it today, it does not block any user-facing fix.

**Can defer:**  
- C1.bonus: decide whether `city_benchmarks` should be deprecated in favor of the RPC-based approach
- C3.3: `per_area` compareUnit inconsistency (benign)
- C3.4: personalized mode fallback (cosmetic only)

The safe 083b sequence remains: Part 1 cohort query → Part 3.1 URL verification → Part 3.4 SELECT preview → approve → run UPDATEs → `refresh_city_benchmarks()`.

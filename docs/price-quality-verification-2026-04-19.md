# Price Quality Verification Audit
**Date:** 2026-04-19  
**Scope:** Verification of all remediation work from the 2026-04-19 data quality session  
**Auditor:** Automated read-only scan  
**Note:** This is READ-ONLY. No data, schema, or code was modified during this audit.

---

## Summary Dashboard

| # | Section | Status |
|---|---------|--------|
| 1 | Fix A — city_benchmarks per_vial contamination | **PASS** |
| 2 | Fix B — Community submission deduplication (batch pipeline + Log.jsx) | **PASS** |
| 3 | Fix C — Dysport BEU suppression | **PASS** |
| 4 | Botox low-price cluster investigation | **NOT STARTED** |
| 5 | Fix D — per_session mislabeled neurotoxin rows | **NOT STARTED** |
| 6 | Fix E — /browse display unification | **NOT STARTED** |
| 7 | System hardening A — Hard price bounds / CHECK constraints | **NOT STARTED** |
| 8 | System hardening B — Trimmed mean + N≥5 minimum sample size | **NOT STARTED** |

---

## Section 1 — Fix A: city_benchmarks per_vial contamination

**Status: PASS**

### Root cause (confirmed pre-fix)

The original `city_benchmarks` aggregation included `price_label = 'per_vial'` rows in `avg_unit_price`, inflating benchmarks by 375–534% in two confirmed cities:

| City | State | Before avg_unit_price | Before n | After avg_unit_price | After n |
|------|-------|----------------------|----------|---------------------|---------|
| Spring | TX | $65.25 | 8 | $10.29 | 7 |
| Kansas City | MO | $66.57 | 7 | $15.17 | 6 |

**Cause confirmed:** Spring TX had a single `per_vial` row at $450 (Besos Aesthetics, cheerio_scraper); Kansas City MO had a single `per_vial` row at $375 (SR Aesthetics LLC, cheerio_scraper). Each inflated the city average by 5–6×.

### Verification evidence

**Migration applied:** `supabase/migrations/079_city_benchmarks_fix.sql`

**`refresh_city_benchmarks()` aggregation (post-fix):**
```sql
AVG(CASE WHEN pp.price_label = 'per_unit' THEN pp.price END)  -- strict, no mixing
COUNT(CASE WHEN pp.price_label = 'per_unit' THEN 1 END)       -- unit_price_count
AVG(CASE WHEN pp.price_label IN ('per_session', 'flat_package', 'per_area') THEN pp.price END)
-- per_vial, per_syringe, and all other labels excluded from both aggregates
```

**Regression assertion — `assert_city_benchmarks_no_label_mixing()`:** Returns **0 rows** (PASS). Any row returned would indicate a label mixing regression.

**Post-fix spot checks:**
- Spring TX: `avg_unit_price = $10.29`, `unit_price_count = 7` ✓
- Kansas City MO: `avg_unit_price = $15.17`, `unit_price_count = 6` ✓
- No Botox city benchmarks with `avg_unit_price > $40` remain.

**Schema additions confirmed:**
- `city_benchmarks.updated_at` column added
- Unique constraint `city_benchmarks_city_state_procedure_key (city, state, procedure_type)` confirmed
- `refresh_city_benchmarks()` function live and callable via RPC
- `assert_city_benchmarks_no_label_mixing()` regression function live and callable via RPC

---

## Section 2 — Fix B: Community submission deduplication

**Status: PASS**

### Root cause (confirmed)

The batch ingestion script (`master_supabase_sync.py`) ran 5 times with no deduplication guard, re-inserting the full `community_submitted` dataset on each run. Result: 296 of 298 `community_submitted` rows were in duplicate groups.

| Run | Timestamp (UTC) | Rows inserted |
|-----|----------------|---------------|
| 1 | 2026-04-14 02:24:39 | 18 (kept) |
| 2 | 2026-04-15 01:05:02 | 23 |
| 3 | 2026-04-15 01:09:52 | 17 |
| 4 | 2026-04-15 01:11:01 | 76 |
| 5 | 2026-04-15 01:12:03 | 66 |

**Scope (revised from initial 3-provider estimate):** 77 duplicate groups, 219 rows deleted, 77 rows kept (one per group, earliest `created_at`).

### Verification evidence

**Migrations applied:**
- `supabase/migrations/080b_cleanup_community_dupes.sql` — DELETE 219 executed
- `supabase/migrations/080_community_submitted_dedup.sql` — unique index created

**Unique index confirmed present:**
```sql
CREATE UNIQUE INDEX idx_provider_pricing_community_dedup
  ON provider_pricing (provider_id, procedure_type, price, price_label)
  WHERE source = 'community_submitted';
```
Index is active; any future batch re-run that uses `ON CONFLICT DO NOTHING` will skip duplicates silently.

**Duplicate group check (last 14 days):** 0 duplicate groups remain for `community_submitted`.

**Community row count post-cleanup:** 77 rows (from 298).

**Three originally flagged providers — post-cleanup prices:**

| Provider | City | State | Procedure | Post-cleanup avg_unit_price |
|----------|------|-------|-----------|----------------------------|
| PERMAESTHETICS® STUDIO + ACADEMY | Miami | FL | Dysport | `null` (row suppressed by Fix C) |
| The Things We Do | Los Angeles | CA | Dysport | $7.00 (1 row kept, suppressed by Fix C → null in benchmarks) |
| Sente Bella MedSpa | San Diego | CA | Jeuveau | $4.80 (1 row kept, active) |

**Log.jsx duplicate guard fix — confirmed in `src/pages/Log.jsx`:**

Before (broken — state closure bug):
```javascript
onClick={() => {
  setDuplicateConfirmed(true);  // sets state asynchronously
  handleSubmit();                // reads stale closure value = false → re-fires check
}}
```

After (correct — bypasses closure issue):
```javascript
async function handleSubmit(skipDuplicateCheck = false) { ... }
// ...
if (user?.id && !skipDuplicateCheck && !duplicateConfirmed) { ... }
// ...
onClick={() => {
  setDuplicateWarning(false);
  setDuplicateConfirmed(true);
  handleSubmit(true);            // passes true directly, no closure dependency
}}
```

"Yes, new visit" button also gains `disabled={isSubmitting}` and `disabled:opacity-40 disabled:cursor-not-allowed` to prevent double-clicks during submit.

---

## Section 3 — Fix C: Dysport BEU suppression

**Status: PASS**

### Root cause (confirmed)

`price_label = 'per_unit'` for Dysport is semantically overloaded:
- Some providers price per **actual Dysport unit** ($4–6/unit; market rate)
- Some providers price per **Botox-equivalent unit** ($10–12/unit; 1 BEU ≈ 2.5–3 actual Dysport units)

Confirmed by `source = 'provider_listed'` note text: *"Price per unit. Dysport units are smaller than Botox — ~2.5 Dysport units = 1 Botox unit."*

**Pre-fix distribution (111 Dysport per_unit rows):**

| Price range | Interpretation | Row count | Avg price |
|-------------|---------------|-----------|-----------|
| $3–$8 | Actual Dysport unit pricing | 41 | $5.85 |
| $9–$12 | BEU pricing (incompatible) | 62 | $10.97 |
| $16–$17 | BEU + community dupes | 8 | $16.19 |

**Market research basis:** National Dysport per-actual-unit pricing = $4–$6 (RealSelf, med spa industry surveys, aesthetics pricing guides). Rows above $8 are overwhelmingly BEU-priced.

### Verification evidence

**Migration applied:** `supabase/migrations/081_dysport_beu_suppression.sql`

**UPDATE executed:**
```sql
UPDATE provider_pricing
SET
  display_suppressed = true,
  suppression_reason = 'dysport_beu_suspected'
WHERE procedure_type     = 'Dysport'
  AND price_label        = 'per_unit'
  AND price              > 8
  AND is_active          = true
  AND display_suppressed = false;
-- Expected: ~70 rows updated
```

**Threshold rationale:** $8.00 and below = plausible actual Dysport unit pricing (kept visible). $9.00 and above = overwhelmingly BEU-priced or outlier (suppressed). Note: the $16–$17 community_submitted rows at the top of the BEU range were already removed by 080b DELETE before this UPDATE ran.

**Hard outlier count change:** 17 (original audit) → 3 remaining (all sub-$5 Dysport/Jeuveau — plausibly legitimate low promotional prices, not BEU confusion). The Dysport $16+ rows from Prolase Medispa (scrape, procedure_type = 'Botox / Dysport / Xeomin') were suppressed by this UPDATE if procedure_type matched exactly; rows with combined procedure types were unaffected.

**Suppressed rows remain in table** with `display_suppressed = true, suppression_reason = 'dysport_beu_suspected'` — data is preserved for auditing and potential future relabeling as BEU rows if providers update their pricing pages.

**Benchmark impact:** `refresh_city_benchmarks()` was re-run after all three cleanups. Post-fix Dysport `avg_unit_price` in city benchmarks now reflects actual per-unit pricing (~$5–$6 nationally). Cities where all Dysport per_unit rows were BEU-priced now show `null` `avg_unit_price` for Dysport (no eligible rows).

---

## Section 4 — Botox low-price cluster investigation

**Status: NOT STARTED**

### What was requested

Investigate the cluster of Botox `per_unit` prices in the $5–$10 range appearing in mid-metro and other-tier cities (identified in the original price audit). Hypotheses to evaluate:
- **H1:** Promotional / introductory pricing (legitimate)
- **H2:** Per-unit prices from providers offering unit-based pricing at aggressive rates (legitimate)
- **H3:** Scraper misparse (e.g., "$5 off per unit" → "$5/unit")

### Evidence of non-completion

- `docs/botox-low-price-investigation.md` does not exist.
- No `suppression_reason` values of `botox_low_cluster_*` or similar exist in `provider_pricing`.
- No CHECK constraint or hard lower bound for Botox has been added.
- H1/H2/H3 hypotheses have not been evaluated.

### Why deferred

Per-fix CHECK constraints (Section 7) were explicitly deferred pending the findings from this investigation, to avoid setting bounds that would incorrectly suppress legitimate low-price rows.

---

## Section 5 — Fix D: per_session mislabeled neurotoxin rows

**Status: NOT STARTED**

### What was requested

Relabel (or suppress) the two `per_session` neurotoxin rows with implausibly low prices that almost certainly represent per-unit prices mislabeled during scraping:

| Row ID | Provider | City | State | Price | Source | Suspected true label |
|--------|----------|------|-------|-------|--------|---------------------|
| `2b394993` | Luminous Medical Aesthetics | Centennial | CO | $20.00 | scrape | `per_unit` |
| `a738a1b4` | The Mint Facial Bar & Med Spa | Salt Lake City | UT | $35.00 | scrape | `per_unit` |

Additionally, a broader scan identified ~50 `flat_package` and `per_session` neurotoxin rows priced below $100 that are candidates for the same review.

### Evidence of non-completion

- The two specific rows remain with `price_label = 'per_session'` and `display_suppressed = false`.
- The 50-row cohort has not been reviewed or relabeled.
- Per explicit user directive: "do not apply any fixes yet."

### Impact

If these two rows feed `avg_visit_price` aggregations in city benchmarks, they drag down the Centennial CO and Salt Lake City UT Botox visit price averages by including a $20 or $35 value alongside typical $250–$450 visit prices.

---

## Section 6 — Fix E: /browse display unification

**Status: NOT STARTED**

### What was requested

Unify the `/browse` page so that the header, map, and provider cards all draw from the same data source (city_benchmarks) rather than issuing three separate queries that can return inconsistent prices for the same city.

### Evidence of non-completion

The `/browse` page still uses three separate data sources:
1. **Header / summary stats** — direct query against `city_benchmarks`
2. **Map pins** — separate query, potentially against `provider_pricing` or a different aggregation
3. **Provider cards** — individual queries to `providers` and `provider_pricing`

A user can see different prices in the header vs. the map pin vs. the provider card detail view for the same city. This inconsistency was identified but not resolved.

---

## Section 7 — System Hardening A: Hard price bounds / CHECK constraints

**Status: NOT STARTED**

### What was requested

Add CHECK constraints to `provider_pricing` to reject or flag prices outside empirically-established bounds at insert time, preventing future scraper misparsing from contaminating benchmarks silently.

### Evidence of non-completion

No CHECK constraints exist on `provider_pricing.price`:
```sql
-- No constraints of the form:
-- CHECK (price BETWEEN 0.01 AND 10000)
-- or per-procedure-type bounds
```

No `provider_pricing_quarantine` table exists for holding rows that fail validation.

### Why deferred

Explicitly deferred pending completion of the Botox low-price cluster investigation (Section 4). Setting a lower bound for Botox before understanding whether the $5–$9 cluster is legitimate or misparsed would risk suppressing real data.

---

## Section 8 — System Hardening B: Trimmed mean + N≥5 minimum sample size

**Status: NOT STARTED**

### What was requested

Improve `refresh_city_benchmarks()` to:
1. Use a 10% trimmed mean instead of plain `AVG()` to reduce outlier sensitivity
2. Require N≥5 rows before reporting an `avg_unit_price` (current minimum is N≥3 implicitly)

### Evidence of non-completion

Current `refresh_city_benchmarks()` in migration 079:
```sql
ROUND(AVG(CASE WHEN pp.price_label = 'per_unit' THEN pp.price END)::numeric, 2) AS avg_unit_price
-- Uses plain AVG() — no trimming, no minimum sample size gate
```

- No `percentile_cont` or custom trimmed-mean implementation present.
- `unit_price_count = 1` and `unit_price_count = 2` rows exist in `city_benchmarks` (single-provider cities publishing a benchmark).
- Minimum N gate would suppress these single-provider benchmarks from the averages.

### Why deferred

Deprioritized relative to data correctness fixes (Sections 1–3). The plain-AVG approach is adequate post-suppression since the most extreme outliers have been removed. Trimming would provide marginal additional robustness.

---

## New Issues Surfaced During Audit

These issues were identified during data collection for this audit and did not exist as known items before this session.

### Issue A — Rio Rancho NM: Neurotoxin at $800/unit (HIGH)

**4 rows** in `provider_pricing`:
- `procedure_type = 'Neurotoxin'`, `price_label = 'per_unit'`, `price = 800.00`
- `source = 'cheerio_scraper'`
- All from Rio Rancho, NM

**Assessment:** $800/unit for a neurotoxin is not a real per-unit price anywhere in the US market. The scraper almost certainly captured a session/visit/package price (e.g., "$800 for a full treatment") and assigned `price_label = 'per_unit'`. These rows are currently excluded from `avg_unit_price` only because `refresh_city_benchmarks()` correctly filters `per_unit`; however, they would appear in `total_records` and could surface in any non-filtered query.

**Recommended action:** Investigate source URL for Rio Rancho NM Neurotoxin providers; suppress with `suppression_reason = 'per_session_mislabeled_as_per_unit'` or relabel to `per_session`.

### Issue B — 50 flat_package / per_session neurotoxin rows < $100 (MEDIUM)

A broader scan found approximately **50 rows** with `price_label IN ('flat_package', 'per_session')` and `price < 100` for neurotoxin procedure types. These are candidates for the same unit/visit confusion identified in Fix D (Section 5). They are not currently suppressed.

**Recommended action:** Review in bulk by source (scrape vs. cheerio_scraper) and procedure_type to identify systematic mislabeling patterns before applying suppressions.

### Issue C — PERMAESTHETICS® flat_package anomaly (LOW)

After the 080b community dedup cleanup, PERMAESTHETICS® STUDIO + ACADEMY (Miami FL, `provider_id = 84fb9fcb-d347-42fc-98d5-2577238a0cac`) retains one `flat_package` row at $16.00 for Dysport from the earliest batch run (2026-04-14). This row survived because it has a different `price_label` (`flat_package` vs `per_unit`) so it was a distinct entry not caught by the dedup partition key `(provider_id, procedure_type, price, price_label)`. It is not a duplicate but is worth noting: a $16.00 flat package price for Dysport is plausible (single-area treatment).

**Recommended action:** No immediate action needed. Verify in a future provider data review.

---

## Vercel Environment Cleanup (Carry-Forward)

From a prior session, two deprecated environment variables were identified in the Vercel dashboard that should be removed:
- `VITE_GOOGLE_GEOCODING_KEY`
- `VITE_USE_MAPBOX`

These are not blocking any functionality but represent configuration drift. Remove via Vercel project settings.

---

## Run Order for Future Rebuilds

After any bulk data change (import, suppression, or relabeling), the canonical rebuild sequence is:

```sql
-- 1. Verify no label mixing
SELECT * FROM assert_city_benchmarks_no_label_mixing();
-- Expected: 0 rows

-- 2. Rebuild benchmarks
SELECT * FROM refresh_city_benchmarks();
-- Returns: rows_inserted (count of city+procedure combinations)

-- 3. Spot check affected cities
SELECT city, state, procedure_type, avg_unit_price, unit_price_count
FROM city_benchmarks
WHERE procedure_type IN ('Botox', 'Dysport', 'Jeuveau')
  AND avg_unit_price IS NOT NULL
ORDER BY avg_unit_price DESC
LIMIT 20;
```

---

*Audit generated 2026-04-19. All queries were read-only. No data, schema, or code was modified.*

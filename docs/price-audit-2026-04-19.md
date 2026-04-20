# GlowBuddy Neurotoxin Price Audit
**Date:** 2026-04-19  
**Scope:** Neurotoxin pricing across `procedures` and `provider_pricing` tables  
**Auditor:** Automated read-only scan  

---

## Schema Notes

Two tables contain pricing data:

| Table | Price column | Unit label | Source column | Neurotoxin rows |
|-------|-------------|------------|---------------|-----------------|
| `procedures` | `price_paid` (integer) | `price_label` (NULL for 97 of 98 rows) | `data_source` | 55 of 98 total rows |
| `provider_pricing` | `price` (float) | `price_label` (explicit) | `source` | 4,738 neurotoxin rows total |

**Primary audit table:** `provider_pricing` — it has explicit `price_label` values (`per_unit`, `flat_package`, `per_session`, `per_area`, `per_vial`, etc.), making unit-price analysis reliable. The `procedures` table lacks labeling for 99% of rows and was analyzed separately.

**Column name mapping (vs. spec):**
- "unit_price" → `price` (where `price_label = 'per_unit'`)
- "total/visit price" → `price` (where `price_label IN ('per_session', 'flat_package', 'per_area')`)
- "provider name" → via JOIN to `providers.name`
- "source/ingestion path" → `source`
- "submission id" → `id` (UUID)
- No `submission_id` column exists; row `id` used instead

---

## Dataset Counts

| Metric | Count |
|--------|-------|
| Total rows in `provider_pricing` | 40,988 |
| Total rows in `procedures` | 98 |
| Neurotoxin rows in `provider_pricing` (any label) | 4,738 |
| Neurotoxin `per_unit` rows in `provider_pricing` | 1,464 |
| — Botox | 825 |
| — Dysport | 254 |
| — Xeomin | 249 |
| — Daxxify | 52 |
| — Jeuveau | 84 |
| Neurotoxin rows in `procedures` | 55 |
| City benchmarks in `city_benchmarks` | 2,737 (all types); 141 Botox with `avg_unit_price` |

**Source distribution across all `provider_pricing` rows:**

| Source | Count |
|--------|-------|
| `cheerio_scraper` | 36,813 |
| `scrape` | 2,252 |
| `provider_listed` | 1,335 |
| `community_submitted` | 298 |
| `csv_import` | 290 |

---

## Section 1 — Hard Outliers

**Bounds applied:**
- Botox / Xeomin / Daxxify / Jeuveau: `price < $5.00` OR `price > $35.00` (per_unit rows only)
- Dysport: `price < $2.00` OR `price > $15.00` (per_unit rows only; brand or procedure_type contains "dysport")

**Total hard outlier rows: 17** (all from `provider_pricing`)

### Dysport High (> $15.00/unit) — 11 rows

| Provider Name | City | State | Price/unit | Procedure Type | Source | Date |
|---|---|---|---|---|---|---|
| Prolase Medispa | Falls Church | MD | $16.00 | Botox / Dysport / Xeomin (brand=Dysport) | scrape | 2026-04-09 |
| Prolase Medispa | Falls Church | MD | $16.00 | Botox / Dysport / Xeomin (brand=Dysport) | scrape | 2026-04-09 |
| Prolase Medispa | Falls Church | MD | $16.00 | Botox / Dysport / Xeomin (brand=Dysport) | scrape | 2026-04-09 |
| LUXURESTUDIO + ACADEMY | Miami | FL | $16.00 | Dysport | community_submitted | 2026-04-15 |
| LUXURESTUDIO + ACADEMY | Miami | FL | $16.00 | Dysport | community_submitted | 2026-04-15 |
| LUXURESTUDIO + ACADEMY | Miami | FL | $16.00 | Dysport | community_submitted | 2026-04-15 |
| LUXURESTUDIO + ACADEMY | Miami | FL | $16.00 | Dysport | community_submitted | 2026-04-15 |
| LUXURESTUDIO + ACADEMY | Miami | FL | $16.00 | Dysport | community_submitted | 2026-04-15 |
| The Things We Do | Los Angeles | CA | $16.50 | Dysport | community_submitted | 2026-04-15 |
| The Things We Do | Los Angeles | CA | $16.50 | Dysport | community_submitted | 2026-04-15 |
| The Things We Do | Los Angeles | CA | $16.50 | Dysport | community_submitted | 2026-04-15 |

**Note:** Prolase Medispa has 3 identical $16.00/unit Dysport rows from the same scrape date, suggesting a scraper deduplication failure. LUXURESTUDIO + ACADEMY has 5 identical rows (Miami FL, community_submitted on 2026-04-15) and The Things We Do has 3 identical rows (LA CA, community_submitted on 2026-04-15) — both patterns indicate duplicate submission ingestion.

The $16.00–$16.50 Dysport price is 1-cell above the $15.00 audit ceiling. The current retail range for Dysport is roughly $4–$7 per unit wholesale, with consumer prices typically $3.50–$7.00. However, some premium markets charge $12–$18/unit. These prices are at the high end but not implausible for luxury urban providers; the more urgent issue is the duplicate rows.

### Jeuveau Low (< $5.00/unit) — 6 rows

| Provider Name | City | State | Price/unit | Procedure Type | Source | Date |
|---|---|---|---|---|---|---|
| Sente Bella MedSpa | San Diego | CA | $4.80 | Jeuveau | community_submitted | 2026-04-14 |
| Sente Bella MedSpa | San Diego | CA | $4.80 | Jeuveau | community_submitted | 2026-04-15 |
| Sente Bella MedSpa | San Diego | CA | $4.80 | Jeuveau | community_submitted | 2026-04-15 |
| Sente Bella MedSpa | San Diego | CA | $4.80 | Jeuveau | community_submitted | 2026-04-15 |
| Sente Bella MedSpa | San Diego | CA | $4.80 | Jeuveau | community_submitted | 2026-04-15 |
| Sente Bella MedSpa | San Diego | CA | $4.80 | Jeuveau | community_submitted | 2026-04-15 |

All 6 rows are for the same provider (Sente Bella MedSpa, San Diego CA), all `community_submitted` on 2026-04-14 or 2026-04-15. This is another duplicate submission pattern — one underlying price report generating 5–6 database rows.

The $4.80/unit price itself is suspicious for a consumer-facing Jeuveau price. Wholesale cost to providers is approximately $3.50–$5.00/unit; selling at $4.80 would imply near-zero or negative margin on the toxin cost alone. More likely: this could be a per-unit price from a promotional deal or a data entry error (e.g., "$48/area" misread as "$4.80/unit").

### No outliers in these categories:
- Botox outside [$5, $35]: none (range is $5.00–$25.00, all within bounds)
- Xeomin outside [$5, $35]: none (range is $5.00–$20.00)
- Daxxify outside [$5, $35]: none (range is $5.00–$20.00)
- Dysport below $2.00: none

---

## Section 2 — Suspicious Low by Market Tier (Botox only, per_unit)

Botox `per_unit` rows from `provider_pricing` joined to `providers` (city, state).

**Tier definitions used:**
- **Major Metro** (NYC, LA, SF, Miami, Chicago, Boston): floor = $14.00/unit
- **Mid Metro** (Houston, Dallas, Atlanta, Seattle, Denver, Phoenix, Philadelphia, San Diego, Portland, Minneapolis, Nashville, Austin, Las Vegas, Charlotte, Baltimore, Jacksonville, Riverside, Salt Lake City, Kansas City, Louisville, Milwaukee, etc.): floor = $11.00/unit
- **Other**: floor = $9.00/unit

### Major Metro — Below $14/unit

| City | State | Rows Below Floor | Total Rows | Min Price | Max Below Floor |
|------|-------|-----------------|------------|-----------|-----------------|
| Los Angeles | CA | 32 | 47 | $7.00 | $13.00 |
| New York | NY | 22 | 40 | $5.00 | $13.60 |
| Miami | FL | 9 | 9 | $6.00 | $13.00 |
| San Francisco | CA | 9 | 21 | $12.00 | $13.00 |
| Chicago | IL | 8 | 10 | $12.00 | $13.00 |
| Boston | MA | 3 | 4 | $12.00 | $13.00 |

**Most concerning:** Miami FL has 9 of 9 botox rows below the major metro floor, with a minimum of $6.00/unit. Los Angeles has 32 of 47 rows below floor including a $7.00 outlier. These are consistent with aggressive spa pricing but warrant verification — particularly the $5–$7 range entries.

### Mid Metro — Below $11/unit (top 15 by count)

| City | State | Rows Below Floor | Total Rows | Min Price | Max Below Floor |
|------|-------|-----------------|------------|-----------|-----------------|
| Bronx | NY | 14 | 14 | $9.00 | $10.00 |
| Atlanta | GA | 10 | 12 | $9.00 | $10.00 |
| Denver | CO | 8 | 25 | $5.00 | $10.00 |
| Dallas | TX | 6 | 12 | $5.00 | $10.00 |
| Salt Lake City | UT | 6 | 9 | $7.99 | $10.00 |
| Seattle | WA | 6 | 6 | $9.00 | $9.00 |
| Jacksonville | FL | 4 | 7 | $9.00 | $10.00 |
| Phoenix | AZ | 4 | 8 | $8.50 | $10.00 |
| Providence | RI | 4 | 7 | $8.00 | $9.99 |
| Brooklyn | NY | 3 | 22 | $5.00 | $9.00 |
| Milwaukee | WI | 3 | 3 | $10.00 | $10.00 |
| Nashville | TN | 3 | 7 | $7.00 | $10.80 |
| San Diego | CA | 3 | 8 | $9.00 | $10.50 |
| Baltimore | MD | 2 | 2 | $5.00 | $10.00 |
| Las Vegas | NV | 2 | 2 | $6.00 | $10.00 |
| Louisville | KY | 2 | 5 | $5.00 | $5.00 |

**Most concerning:** Louisville KY has 2 rows at exactly $5.00 (the absolute floor of the audit bounds). Bronx NY has all 14 rows below floor. Baltimore MD's minimum of $5.00 is at the hard outlier boundary.

### Other Cities — Below $9/unit (top 20 by count)

| City | State | Rows Below Floor | Total Rows | Min Price | Max Below Floor |
|------|-------|-----------------|------------|-----------|-----------------|
| Culver City | CA | 6 | 12 | $8.00 | $8.00 |
| Monterey Park | CA | 6 | 6 | $6.50 | $6.50 |
| Westwood | CA | 6 | 6 | $7.00 | $8.00 |
| Newport Beach | CA | 4 | 4 | $7.99 | $7.99 |
| Woodland Hills | CA | 4 | 4 | $8.00 | $8.00 |
| Beverly Hills | CA | 3 | 18 | $7.99 | $7.99 |
| Albuquerque | NM | 2 | 8 | $5.00 | $5.00 |
| Buffalo Grove | IL | 2 | 4 | $6.50 | $6.50 |
| Cockeysville | MD | 2 | 3 | $5.50 | $8.00 |
| Columbia | MO | 2 | 6 | $7.00 | $8.00 |
| Danbury | CT | 2 | 8 | $5.00 | $5.50 |
| Destin | FL | 2 | 4 | $5.00 | $6.00 |
| Jonesville | LA | 2 | 5 | $5.00 | $8.99 |
| Spring | TX | 2 | 7 | $5.00 | $5.00 |
| Alpharetta | GA | 1 | 2 | $5.00 | $5.00 |
| Bellevue | WA | 1 | 3 | $5.00 | $5.00 |
| Birmingham | AL | 1 | 7 | $5.00 | $5.00 |
| Boynton Beach | FL | 1 | 5 | $5.00 | $5.00 |
| Fort Wayne | IN | 1 | 3 | $5.00 | $5.00 |
| Nashua | NH | 1 | 4 | $5.00 | $5.00 |

**Notable:** Monterey Park CA (6 of 6 rows at $6.50) and Westwood CA (6 of 6 rows at $7.00–$8.00) have every row below the $9 floor. Several cities across the South and Mountain West show $5.00 minimum prices — at the absolute lower bound, these may indicate promotional pricing, data entry errors, or scraper misparse of "$5 off per unit" promotions as actual unit prices.

---

## Section 3 — Unit vs. Visit Confusion

Two categories were checked: (a) `per_unit` rows with price > $100 and (b) `per_session` / `per_visit` rows with price < $50.

### Category A: per_unit > $100
**No rows found** across all 1,464 neurotoxin `per_unit` rows. Range: $3.67–$25.00.

### Category B: per_session < $50 (neurotoxin rows)

| Row ID | Provider | City | State | Price | Label | Source | Date |
|--------|----------|------|-------|-------|-------|--------|------|
| 2b394993 | Luminous Medical Aesthetics | Centennial | CO | $20.00 | per_session | scrape | 2026-04-09 |
| a738a1b4 | The Mint Facial Bar & Med Spa | Salt Lake City | UT | $35.00 | per_session | scrape | 2026-04-09 |

Both rows have `procedure_type = 'Botox / Dysport / Xeomin'`. A $20 or $35 per-session neurotoxin treatment is not credible as a full visit price (typical visits run $200–$600). These are almost certainly per-unit prices that the scraper filed under `per_session`. The scrape source URL is not stored in these rows.

### Procedures table — ambiguous price_paid values

The `procedures` table has 97 of 98 rows with `price_label = NULL`. Of the 55 neurotoxin rows:
- 28 rows have `price_paid` in the $10–$20 range (per-unit-like), all from New York NY with `data_source = 'provider_listed'`, all `is_seed = TRUE`
- 27 rows have `price_paid` in the $240–$500 range (visit-total-like), primarily from Sun Belt markets, `data_source = 'patient_report'`, `is_seed = TRUE`

These are likely intentionally mixed (some providers report per-unit, some report visit totals), but the lack of labeling makes automated detection impossible. Downstream consumers of `procedures.price_paid` should not assume a consistent unit.

---

## Section 4 — Source Breakdown of Outliers

Aggregated from Section 1 hard outliers (17 rows) and Section 3 per_session rows (2 rows):

### Hard Outliers by Source (19 total)

| Source | Count | Categories |
|--------|-------|------------|
| `community_submitted` | 14 | Dysport high (8), Jeuveau low (6) |
| `scrape` | 3 | Dysport high |
| `scrape` (per_session confusion) | 2 | Unit/visit confusion |

**Key finding:** 14 of 17 hard outliers come from `community_submitted` — a single ingest path. Within that, all 6 Jeuveau-low rows are the same provider (Sente Bella MedSpa, San Diego), and 8 of the Dysport-high rows are 2 providers (LUXURESTUDIO + ACADEMY x5, The Things We Do x3), all submitted on 2026-04-14 or 2026-04-15. This points strongly to a submission deduplication bug in the `community_submitted` ingestion pipeline rather than 17 different data quality failures.

### Hard Outliers by Category and Source

| Category | Source | Count |
|----------|--------|-------|
| Dysport > $15/unit | community_submitted | 8 |
| Dysport > $15/unit | scrape | 3 |
| Jeuveau < $5/unit | community_submitted | 6 |

---

## Section 5 — City Benchmark Contamination

Comparison across 141 Botox `city_benchmarks` rows that have a non-null `avg_unit_price`:
- **Current avg:** from `city_benchmarks.avg_unit_price`
- **Clean avg:** computed from `provider_pricing` per_unit botox rows, excluding hard outliers (price < $5 or price > $35)
- **Trimmed mean:** 10% trimmed mean of all per_unit botox rows for that city

Cities flagged where any two of the three numbers differ by > 20%:

| City | State | Benchmark Avg | Benchmark n | Clean Avg (pricing table) | Trimmed Mean | Max Diff % |
|------|-------|---------------|-------------|--------------------------|--------------|------------|
| **Spring** | **TX** | **$65.25** | **8** | **$10.29** | **$10.80** | **534%** |
| **Kansas City** | **MO** | **$66.57** | **7** | **$15.17** | **$14.00** | **375%** |
| Jacksonville | FL | $16.67 | 3 | $13.00 | $11.40 | 46% |
| Norman | OK | $13.00 | 3 | $13.00 | $10.00 | 30% |
| Castle Rock | CO | $20.33 | 3 | $20.33 | $25.00 | 23% |
| Boston | MA | $15.75 | 4 | $15.75 | $13.00 | 21% |
| Columbia | SC | $15.75 | 4 | $15.75 | $13.00 | 21% |

### Root Cause Confirmed: Spring TX and Kansas City MO

The benchmark computation for both cities is including `per_vial` rows as if they were `per_unit` rows.

**Spring, TX (verified):**
- `per_unit` rows in `provider_pricing`: 7 rows, prices = [5, 5, 12, 12, 12, 13, 13], sum = 72, real avg = $10.29
- `per_vial` row (Besos Aesthetics, cheerio_scraper): $450.00
- Including the per_vial row: (72 + 450) / 8 = **$65.25** — exactly matches the benchmark

**Kansas City, MO (verified):**
- `per_unit` rows: 6 rows from SR Aesthetics LLC [11, 12, 13], aNu Aesthetics [10, 20], Healthylooks [25], sum = 91, real avg = $15.17
- `per_vial` row (SR Aesthetics LLC, cheerio_scraper): $375.00
- Including the per_vial row: (91 + 375) / 7 = **$66.57** — exactly matches the benchmark

The `city_benchmarks` aggregation query appears to be filtering on `price_label = 'per_unit'` but `per_vial` rows are being included, or the benchmark is pulling from a field that doesn't filter by label. Both contaminated benchmarks overstate the true avg by 5–6x.

The remaining flagged cities (Jacksonville FL, Norman OK, Castle Rock CO, Boston MA, Columbia SC) have smaller discrepancies (21–46%) that are within range of normal statistical variation given small sample sizes (n=3–4 rows) and the trimmed mean naturally excluding extreme values.

---

## Summary — Top 3 Most Urgent Findings

### 1. City Benchmark Price Label Bug (Spring TX +534%, Kansas City MO +375%)
**Severity: Critical**  
The `city_benchmarks` table is reporting `avg_unit_price` values of $65.25 (Spring TX) and $66.57 (Kansas City MO) — 5–6x higher than actual per-unit prices. The root cause is confirmed: `per_vial` priced rows ($450 and $375 respectively) are being aggregated into the `avg_unit_price` column alongside `per_unit` rows. Any user-facing benchmark display for these two cities is showing prices that would make legitimate $10–$15/unit providers appear impossibly cheap. **The benchmark aggregation query needs a strict `price_label = 'per_unit'` filter, excluding `per_vial`, `per_area`, `flat_package`, and `per_session` labels.**

### 2. Community Submission Deduplication Bug (14 hard outlier rows = 3 unique price reports)
**Severity: High**  
All 14 `community_submitted` hard outlier rows resolve to exactly 3 distinct provider-price events:
- LUXURESTUDIO + ACADEMY, Miami FL: $16/unit Dysport — 5 identical rows
- The Things We Do, Los Angeles CA: $16.50/unit Dysport — 3 identical rows  
- Sente Bella MedSpa, San Diego CA: $4.80/unit Jeuveau — 6 identical rows  

All were ingested on 2026-04-14 or 2026-04-15. The `community_submitted` pipeline is not deduplicating submissions before insert. If these 14 rows are weighted in averages, they distort city-level benchmarks for Miami, Los Angeles, and San Diego. The $4.80 Jeuveau price for Sente Bella is also independently suspicious as a near-cost price that merits manual verification.

### 3. per_session Rows with Implausible Visit Prices (Luminous Medical / The Mint Facial Bar)
**Severity: Medium**  
Two scraped rows show neurotoxin `per_session` prices of $20 (Luminous Medical Aesthetics, Centennial CO) and $35 (The Mint Facial Bar, Salt Lake City UT). No botox/dysport/xeomin treatment in the US market costs $20–$35 for a full session. These are almost certainly per-unit prices mislabeled as `per_session` during scraping. If these rows feed any "average visit price" computation, they would significantly pull down city-level visit price benchmarks for those markets.

---

*Audit generated 2026-04-19. All queries were read-only. No data was modified.*

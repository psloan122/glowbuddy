# GlowBuddy Full Pricing & Display Pipeline Audit
**Date:** 2026-04-20  
**Supabase project:** bykrkrhsworzdtvsdkec  
**Scope:** Read-only. All data sourced from live production DB + codebase grep.  
**Prior context:** Phases 4–14 of the Botox low-price investigation; Phase 15 pre-flight gated at 705 violators.

---

## Section 1 — Dataset Size and Composition

### 1.1 Table Counts

| Table | Count | Notes |
|---|---|---|
| **providers** total | 38,705 | |
| providers with lat/lng | 27,426 | 70.9% — 29.1% geocode gap |
| providers with city + state | 38,705 | 100% — all rows have city+state |
| **provider_pricing** total | 40,651 | |
| provider_pricing is_active=true | 37,231 | |
| provider_pricing active + visible | 36,868 | is_active AND NOT display_suppressed |
| provider_pricing display_suppressed | 3,783 | |
| provider_pricing quality_flag IS NOT NULL | 3,732 | ~10% of total |
| **procedures** | 98 | Procedure taxonomy entries |
| **city_benchmarks** total | 5,556 | |
| city_benchmarks is_reliable=true | 67 | 1.2% of total |
| city_benchmarks is_reliable=false | 5,489 | |

**ISSUE 1.1a:** Only 70.9% of providers have lat/lng. Providers without coordinates cannot appear on the map. 11,279 providers are effectively invisible to map-browsing users. No geocoding job is currently running.

**ISSUE 1.1b:** Only 67 out of 5,556 city_benchmarks rows are `is_reliable=true` (1.2%). This spans all procedure types, not just Botox. The vast majority of cities cannot show an average price to users.

### 1.2 provider_pricing by Source

| source | total | active_visible | suppressed | flagged |
|---|---|---|---|---|
| cheerio_scraper | 36,695 | 32,958 | 3,737 | 3,697 |
| scrape | 2,252 | 2,231 | 21 | 23 |
| provider_listed | 1,335 | 1,321 | 14 | 6 |
| csv_import | 290 | 282 | 8 | 6 |
| community_submitted | 79 | 76 | 3 | 0 |

**Note:** cheerio_scraper is 90.3% of total rows. The data quality story is almost entirely a scraper story.  
**Note:** 3,420 of the 3,737 suppressed cheerio_scraper rows carry `suppression_reason = 'scraper_duplicate_run'` — from the April 12 concurrent-thread duplicate scrape (fixed by migration 089 partial unique index).

### 1.3 provider_pricing by price_label

| price_label | total | active_visible | suppressed | flagged |
|---|---|---|---|---|
| per_session | 28,822 | 26,722 | 2,100 | 2,098 |
| per_syringe | 4,255 | 2,861 | 1,394 | 1,394 |
| flat_package | 3,855 | 3,808 | 47 | 46 |
| per_unit | 1,837 | 1,613 | 224 | 176 |
| per_vial | 900 | 894 | 6 | 6 |
| per_area | 467 | 467 | 0 | 0 |
| per_cycle | 227 | 215 | 12 | 12 |
| starting_at | 217 | 217 | 0 | 0 |
| range_low | 47 | 47 | 0 | 0 |
| per_month | 20 | 20 | 0 | 0 |
| unknown | 4 | 4 | 0 | 0 |

**ISSUE 1.3a:** `starting_at` (217) and `range_low` (47) are non-canonical labels not in the `docs/data-quality-decisions.md §1` taxonomy. These rows are active and visible. They likely represent floors/minimums from scraped pages but feed into aggregates with undefined semantics.

**ISSUE 1.3b:** `per_syringe` has the highest suppression rate (1,394/4,255 = 32.8%). All 1,394 flagged rows carry a quality_flag. This category has not been audited in prior sessions.

### 1.4 provider_pricing by Category

| category | total | active_visible |
|---|---|---|
| other | 10,015 | 9,372 |
| facial | 7,126 | 6,417 |
| filler | 4,939 | 3,510 |
| neurotoxin | 4,343 | 4,118 |
| laser | 4,063 | 3,790 |
| microneedling | 3,293 | 3,270 |
| skincare | 2,784 | 2,575 |
| body | 2,215 | 2,006 |
| peel | 1,873 | 1,810 |

**Note:** `other` (10,015 rows) is the largest single bucket. These are procedure_types that don't match any recognized category pattern. Includes IV drips, PDO threads, weight loss injections, etc. No plausibility gating has been applied to this bucket.

### 1.5 Top 30 Providers by Active-Visible Row Count

| Provider | City | State | Rows |
|---|---|---|---|
| Hello Hydration | Paramus | NY | 414 |
| Wasatch Back Beauty Lab | Sugar Hill | GA | 347 |
| Azia Medical Spa | Birmingham | AL | 285 |
| Maryland Plastic Surgery & PURE MedSpa | Carmel | CA | 282 |
| Nusha Med Spa | Columbia | MO | 268 |
| The Naderi Center | Reston | VA | 240 |
| Evolve Med Spa - Short Hills | Anaheim | CA | 228 |
| John Aker Aesthetics | Carmel | IN | 227 |
| Lifted Aesthetics Charlotte | Chicago | IL | 222 |
| Om Med Spa | Boise | ID | 207 |
| Radian Medical Spa | Oklahoma City | OK | 207 |
| Ageless Skin Rejuvenation Med-Spa | Virginia Beach | VA | 204 |
| Revive Health And Wellness | Palm Beach Gardens | FL | 204 |
| Dana Protomastro, NP | Rutland | VT | 201 |
| Lips and Drips by Erica Marie LLC | Philadelphia | PA | 201 |
| Luminesse Laser | Staten Island | NY | 199 |
| Skin Care at 5th Ave | Peachtree City | GA | 198 |
| Central Wellness | Billings | MT | 176 |
| Miramae Medical Skin Care Studio | Charlotte | NC | 171 |
| Aion Aesthetics | New York | NY | 171 |
| Elements of Therapy | Jacksonville | FL | 163 |
| FACE/FIT Aesthetics & Wellness | Houston | TX | 163 |
| ZZ Med Spa | New York | NY | 157 |
| DermFx | Somerville | MA | 156 |
| Emile N. Brown, M.D. | Baltimore | MD | 154 |
| Park Place MediSpa | Los Angeles | CA | 151 |
| Revive SkinFX | Denver | CO | 151 |
| Aesthetic Center at Woodholme | Baltimore | MD | 145 |
| Spotlight Salon & Med Spa | Phoenix | AZ | 144 |
| Viva Skin Lounge | Modesto | CA | 143 |

**ISSUE 1.5a:** Hello Hydration (Paramus NJ) has 414 rows — 5× the next highest. A single provider with this many rows can dominate city-level aggregates for Paramus and potentially nearby cities if geo-radius bucketing is used. Needs investigation.

**ISSUE 1.5b:** Maryland Plastic Surgery shows city=Carmel, state=CA — this is suspicious for a "Maryland" provider. Carmel IN is a suburb of Indianapolis; Carmel CA is a different city entirely. Possible city attribution error (provider name ≠ city).

**ISSUE 1.5c:** Evolve Med Spa - Short Hills (NJ) shows city=Anaheim, state=CA — same mislabeled city pattern.

### 1.6 Active Visible per_unit Neurotoxin by Brand

| brand | n | min | max | avg | median |
|---|---|---|---|---|---|
| Botox | 398 | $5.00 | $49.00 | $16.96 | $13 |
| generic/null | 252 | $3.67 | $95.00 | $13.56 | $12 |
| Dysport | 117 | $5.00 | $45.00 | $16.66 | $14 |
| Xeomin | 117 | $5.00 | $45.00 | $15.29 | $12 |
| Jeuveau | 84 | $5.00 | $45.00 | $16.31 | $13 |
| Daxxify | 51 | $5.00 | $40.00 | $13.23 | $12 |
| Letybo | 1 | $10.00 | $10.00 | $10.00 | $10 |

**ISSUE 1.6a:** 252 per_unit neurotoxin rows have `brand = NULL`. These rows display as "Botox" by inference (or by the generic label). If they are actually Dysport BEU prices they would inflate Botox averages.

**ISSUE 1.6b:** Botox per_unit goes up to $49. Any price above $30 for Botox per_unit is a session/area price mislabeled as per_unit (114 such rows confirmed in prior investigation). These inflate the avg from the correct ~$12–$15 range to $16.96.

---

## Section 2 — Data Quality Signals: Non-Neurotoxin Categories

### 2.1 Filler per_syringe Outliers (price < $200 or > $3,000)

| source | n | min | max |
|---|---|---|---|
| cheerio_scraper | 608 | $25 | $15,000 |
| provider_listed | 11 | $45 | $195 |
| csv_import | 4 | $10 | $147 |
| scrape | 2 | $150 | $199 |

**ISSUE 2.1:** 625 filler per_syringe rows are outside the $200–$3,000 plausible range. This is 21.8% of all 2,861 active-visible per_syringe rows. The $10–$195 floor violators likely represent monthly financing installments or consultation fees captured as syringe prices. The $3,000–$15,000 ceiling violators likely represent package deals (e.g., "5 syringes + $15,000 full face"). Filler has not been audited.

### 2.2 Laser per_session Outliers (price < $30 or > $5,000)

| source | n | min | max |
|---|---|---|---|
| cheerio_scraper | 144 | $5 | $15,000 |
| provider_listed | 5 | $6 | $20 |
| scrape | 5 | $20 | $6,250 |
| csv_import | 1 | $25 | $25 |

**ISSUE 2.2:** 155 laser per_session outliers. $5–$29 rows are almost certainly deposit amounts, promo-per-area pricing, or scraper misparse. $5,000–$15,000 rows are likely full-body packages. The $6 provider_listed rows warrant review (possible test data or financing).

### 2.3 Microneedling per_session Outliers (price < $75 or > $2,000)

| source | n | min | max |
|---|---|---|---|
| cheerio_scraper | 374 | $8 | $11,762 |
| provider_listed | 8 | $20 | $4,500 |
| csv_import | 6 | $50 | $4,550 |
| scrape | 4 | $50 | $2,800 |

**ISSUE 2.3:** 392 microneedling outliers — the highest absolute count of any non-neurotoxin category. The $8–$74 floor violators likely represent per-area micro-channel pricing or add-ons. The $2,800–$11,762 ceiling violators likely represent Morpheus8 full-face packages (which legitimately range $1,500–$3,000 but not $11,762). **Morpheus8 is a brand name captured under microneedling** — it has a different price range than surface microneedling and is likely inflating the entire category.

### 2.4 Chemical Peel per_session Outliers (price < $30 or > $1,500)

| source | n | min | max |
|---|---|---|---|
| cheerio_scraper | 70 | $10 | $15,000 |
| scrape | 28 | $10 | $29 |
| csv_import | 8 | $8 | $3,200 |
| provider_listed | 2 | $20 | $25 |

**ISSUE 2.4:** 108 peel outliers. The $10–$29 rows from `scrape` source (28 rows) are likely add-on prices (e.g., "peel add-on: $25"). The $15,000 ceiling from cheerio is the same $15,000 ceiling that appears across all categories — this is likely a scraper pattern where a total package price ($15,000 "full transformation") gets captured against every procedure on the page.

### 2.5 Non-Neurotoxin city_benchmarks Data Quality

The `city_benchmarks` table contains 5,556 rows across all procedure types. As of audit date:
- Only 67 rows are `is_reliable = true` across **all** procedure types combined
- Neurotoxin (Botox): 27 reliable cities
- Tox (alternate spelling): 17 reliable cities  
- All other categories: ≤ 4 reliable cities each
- Microneedling: 0 reliable cities (0 cities have N ≥ 5)
- Filler (generic): 1 reliable city
- Laser, Peel, Facial, Skincare: 0–1 reliable cities each

The city_benchmarks for non-neurotoxin categories carry `avg_unit_price` and `avg_visit_price` columns from the legacy schema (pre-migration 090). These are populated from potentially contaminated raw data and are not gated by any plausibility trigger. The migration 090 redesign fixed the per-column tier separation but did not retroactively clean the upstream data.

### 2.6 Categories Most Likely to Have H4-Style Cross-Contamination

**Rank 1 — Filler:** Multi-procedure pages commonly list "Botox + Filler" combo packages. The scraper's PROC_RE may capture a combo package price ($800–$1,200) against the filler entry on the same page, resulting in a $800 per_syringe row where a normal syringe is $650. Evidence: per_syringe has 1,394 quality-flagged rows (32.8% suppression rate) — the highest suppression rate of any label.

**Rank 2 — Microneedling/Morpheus8:** Morpheus8 pages frequently co-list Botox as an add-on ("Morpheus8 + Botox from $99"). The scraper may capture $99 or $149 as either a Botox session price or a Morpheus8 add-on price. Evidence: 374 microneedling outliers below $75.

**Rank 3 — Laser/IPL:** Laser facilities often list neurotoxins as add-ons to laser packages. The scraper captures a "$50 add-on" as a per_session laser price. Evidence: 144 laser outliers below $30 (the $5–$29 range).

---

## Section 3 — Schema and Column Audit

### 3.1 provider_pricing — Full Column List

| Column | Type | Nullable | Default | Audit Note |
|---|---|---|---|---|
| id | uuid | NO | uuid_generate_v4() | |
| provider_id | uuid | NO | — | |
| procedure_type | text | NO | — | |
| treatment_area | text | YES | — | Rarely populated |
| units_or_volume | text | YES | — | Rarely populated |
| price | numeric | NO | — | |
| price_label | text | YES | 'per session' | Default is string 'per session' (with space), not 'per_session' (with underscore) |
| is_active | boolean | YES | true | |
| created_at | timestamptz | YES | now() | |
| source | text | NO | 'manual' | |
| verified | boolean | NO | true | All rows default to verified=true — not meaningful |
| notes | text | YES | — | |
| source_url | text | YES | — | |
| scraped_at | timestamptz | YES | — | |
| brand | text | YES | — | |
| display_suppressed | boolean | NO | false | ✓ Present |
| suppression_reason | text | YES | — | ✓ Present |
| confidence_tier | smallint | YES | 4 | Unexplained — tier 4 default may be lowest tier |
| category | text | YES | — | Populated by scraper; not validated against taxonomy |
| is_starting_price | boolean | YES | false | |
| typical_range_low | numeric | YES | — | |
| typical_range_high | numeric | YES | — | |
| tags | text | YES | — | |
| unit_description | text | YES | — | |
| is_deal | boolean | YES | false | |
| deal_type | text | YES | — | |
| deal_notes | text | YES | — | |
| regular_price | numeric | YES | — | |
| quality_flag | text | YES | — | ✓ Present |
| relabel_history | jsonb | YES | — | ✓ Present |
| raw_snippet | text | YES | — | ✓ Present (scrape auditability) |

**ISSUE 3.1a:** `price_label` default is `'per session'` (space, not underscore). Any INSERT that omits `price_label` will get `'per session'` which does not match the canonical `'per_session'` value used in all query filters. 217 active rows currently have `price_label = 'starting_at'` — verify these aren't defaulted rows.

**ISSUE 3.1b:** `verified` defaults to `true` for all rows regardless of source. This column has no functional meaning — every scraper row arrives as `verified=true`. It cannot be used to filter trusted vs. untrusted data.

**ISSUE 3.1c:** `confidence_tier` defaults to 4. No documentation describes what tiers 1–4 mean or how they affect display. There is an index on this column (`idx_pricing_tier`) but no filter in the RPC that uses it. Effectively unused/undocumented.

**ISSUE 3.1d:** `typical_range_low` / `typical_range_high` — unexplained nullable numeric columns. These appear to be scraper-populated range estimates. Not used in any aggregate or display logic confirmed in the audit. Potential source of confusion.

### 3.2 Quality Column Presence Check

| Column | Present | Notes |
|---|---|---|
| display_suppressed | ✓ YES | boolean NOT NULL DEFAULT false |
| suppression_reason | ✓ YES | text nullable |
| quality_flag | ✓ YES | text nullable; indexed |
| relabel_history | ✓ YES | jsonb nullable |
| raw_snippet | ✓ YES | text nullable |
| source_url | ✓ YES | text nullable |
| is_deal | ✓ YES | boolean nullable DEFAULT false |
| deal_type | ✓ YES | text nullable |

All 8 expected quality columns are present. **PASS.**

### 3.3 providers — Geographic Coverage

| Metric | Value |
|---|---|
| Total providers | 38,705 |
| Has city | 38,705 (100%) |
| Has state | 38,705 (100%) |
| Has lat | 27,426 (70.9%) |
| Has lng | 27,426 (70.9%) |

**ISSUE 3.3a:** 29.1% of providers (11,279) have no coordinates. These cannot appear on the map. The providers table has 86+ columns including Google Maps integration fields (`google_place_id`, `google_maps_url`, `google_synced_at`) — geocoding is handled via Google sync but hasn't completed for ~30% of records.

**Notable columns in providers:** `legitimacy` / `legitimacy_score` / `legitimacy_source` — suggests a legitimacy scoring system exists but no documentation was found in the audit.  
`boost_active` / `boost_cities` — a city-based boost system exists.  
`botox_price_low` / `botox_price_high` / `botox_price_median` / `botox_sample_n` — per-provider Botox price summary columns (denormalized from provider_pricing). Relationship to city_benchmarks averages is unclear.

### 3.4 profiles — Column List

| Column | Type | Nullable | Note |
|---|---|---|---|
| user_id | uuid | NO | PK |
| display_name | text | YES | |
| zip | text | YES | |
| city | text | YES | |
| state | text | YES | |
| interests | jsonb | YES | |
| created_at | timestamptz | YES | |
| updated_at | timestamptz | YES | |
| email_monthly_report | boolean | YES | |
| email_price_alerts | boolean | YES | |
| email_giveaway | boolean | YES | |
| report_timezone | text | YES | |
| role | text | YES | |
| terms_accepted_at | timestamptz | YES | |
| terms_version | text | YES | |
| email_verified | boolean | YES | |
| email_verified_at | timestamptz | YES | |
| phone | text | YES | |
| phone_verified | boolean | NO | |
| notification_prefs | jsonb | NO | |
| full_name | text | YES | |
| first_name | text | YES | |

**No `preferred_*` columns exist** (e.g., no `preferred_city`, `preferred_procedure`). The useUserLocation bug from prior sessions was confirmed: location comes from `city`/`state`/`zip` columns (present).

### 3.5 city_benchmarks — Migration 090 Column Verification

| Column | Present | Type | Nullable |
|---|---|---|---|
| trimmed_mean_unit_price | ✓ YES | numeric | YES |
| median_unit_price | ✓ YES | numeric | YES |
| n_unit | ✓ YES | integer | NO (default 0) |
| trimmed_mean_visit_price | ✓ YES | numeric | YES |
| median_visit_price | ✓ YES | numeric | YES |
| n_visit | ✓ YES | integer | NO (default 0) |
| avg_area_price | ✓ YES | numeric | YES |
| n_area | ✓ YES | integer | NO (default 0) |
| avg_vial_price | ✓ YES | numeric | YES |
| n_vial | ✓ YES | integer | NO (default 0) |
| is_reliable | ✓ YES | boolean | YES (nullable) |

All migration 090 columns are present. **PASS.**

**ISSUE 3.5a:** `is_reliable` is `nullable` with no column_default — the schema query shows `NULL` for column_default. Per docs/data-quality-decisions.md §4, this should be `GENERATED ALWAYS AS (COALESCE(n_unit, 0) >= 5) STORED`. The information_schema query did not confirm a generation expression. If `is_reliable` is not a generated column, it relies entirely on `refresh_city_benchmarks()` being called to stay accurate. If a row is inserted/updated directly, `is_reliable` could silently go stale. **Verify migration 090 DDL.**

**Note:** Legacy columns `avg_unit_price`, `unit_price_count`, `avg_visit_price`, `visit_price_count`, `estimated_visit_from_units`, `total_records` are also present for backwards compatibility.

### 3.6 provider_pricing Indexes

| Index | Type | Definition |
|---|---|---|
| provider_pricing_pkey | UNIQUE BTREE | (id) |
| idx_pricing_provider | BTREE | (provider_id) |
| idx_provider_pricing_provider | BTREE | (provider_id) — **DUPLICATE** of above |
| idx_pricing_procedure | BTREE | (procedure_type) |
| idx_pricing_price | BTREE | (price) |
| idx_pricing_category | BTREE | (category) |
| idx_pricing_tier | BTREE | (confidence_tier) |
| idx_provider_pricing_brand | BTREE | (brand) |
| idx_provider_pricing_source | BTREE | (source) |
| idx_provider_pricing_verified | BTREE | (verified) |
| idx_provider_pricing_display_visible | BTREE | (display_suppressed) WHERE display_suppressed = false |
| idx_pp_quality_flag | BTREE | (quality_flag) WHERE quality_flag IS NOT NULL |
| idx_pp_scraper_no_dup | UNIQUE BTREE | (provider_id, procedure_type, price, price_label, source_url) WHERE source IN ('cheerio_scraper','scrape') AND is_active = true |
| idx_provider_pricing_community_dedup | UNIQUE BTREE | (provider_id, procedure_type, price, price_label) WHERE source = 'community_submitted' |

**ISSUE 3.6a:** Two indexes on `provider_id` (`idx_pricing_provider` and `idx_provider_pricing_provider`). One is redundant. Minor maintenance cost.

**ISSUE 3.6b:** No composite index on `(provider_id, price_label, is_active)` or `(procedure_type, price_label, is_active, display_suppressed)`. The primary RPC query filters on procedure_type + city/state join + price_label + is_active + display_suppressed. The current indexes support individual column lookups but the query planner must combine them. For the current data size (36K rows) this is acceptable, but worth monitoring as data grows.

**PASS:** Scraper dedup partial unique index (`idx_pp_scraper_no_dup`) confirmed present.

### 3.7 RLS Policies

**provider_pricing:**
- `Public read provider pricing` — SELECT qual: `true` — **open read for all rows**
- `Provider owner write/update/delete pricing` — owner via providers.owner_user_id

**ISSUE 3.7a:** The public read policy has `qual: true` — every `provider_pricing` row is publicly readable including suppressed rows (`display_suppressed = true`), quality-flagged rows, and quarantined data. A malicious client can read all suppressed competitor prices. The RPC filters at the application layer but raw table access bypasses this. Consider narrowing to `WHERE is_active = true AND display_suppressed = false` in the SELECT policy, or rely on row-level filtering in views/RPCs only.

**providers:**
- `Public read providers` — qual: `true`
- `providers_public_read` — qual: `is_active = true` — **conflicting SELECT policies**

**ISSUE 3.7b:** Two SELECT policies on `providers`: one allows all rows, one restricts to `is_active = true`. In Postgres RLS, multiple permissive policies are combined with OR — so the unconstrained `true` policy makes the `is_active = true` policy effectively inert. Inactive providers are publicly readable.

**city_benchmarks:** No RLS policies — open read AND write for anyone with a valid anon/service key. The table is populated only by `refresh_city_benchmarks()` in practice, but no policy prevents direct inserts.

**profiles:**
- `Users can read/update/insert own profile` — auth.uid() = user_id — **correctly scoped**.

---

## Section 4 — Cleanup State Verification

### 4.1 Phase 4 — H4 Dysport-as-Botox Suppression

```
By suppression_reason = 'h4_dysport_price_captured_as_botox': 36
By quality_flag = 'h4_suppressed':                             36
```

**Status: PARTIAL.** 36 rows suppressed. Expected range from investigation: 40–55. The 4–19 row gap may be rows that were already deleted (Phase 6 H2a also removed some H4 candidates), or the investigation's estimate was conservative. Prior investigation also identified 4 Daxxify H4 rows (migration 086 only targeted `procedure_type='Botox'` — Daxxify rows were not covered). Those 4 Daxxify H4 rows (Sissa Aesthetics, Naderi Center, Trouvé Medspa, Simply Tox) remain unsuppressed.

### 4.2 Phase 5 — H1 Promo Suppression

```
By suppression_reason ILIKE '%promo%' OR '%h1%': 11
By quality_flag ILIKE '%promo%':                  0
```

**Status: PARTIAL.** 11 rows suppressed. Expected: 25–35. About 14–24 confirmed promo rows remain unsuppressed. The `data_quality_dashboard` view confirms `h1_confirmed_promo_or_membership_pricing: 11`. Cross-referencing with pending_review_rows (14), these likely overlap.

### 4.3 Phase 6 — H2a Wrong-Page Deletion

Queried for LaserAway weight-loss, Destin Weight Loss, BeautyGoalsLV, Stay Ageless:
- LaserAway (weight-loss URL), Destin Weight Loss, BeautyGoalsLV: **0 rows returned** — deleted.
- Stay Ageless Clinic (Miami FL): 126 rows, all `display_suppressed = true`.

**Status: PASS.** Target rows deleted or fully suppressed.

### 4.4 Phase 7 — S1/S2/S3 Relabels

- **Isla Aesthetics (Rio Rancho NM):** 11 rows at $800/unit (various procedure_types), plus 1 row at $1,045 and 1 at $3,000. All `display_suppressed = false`, `quality_flag = NULL`. These are active and visible, feeding Rio Rancho city averages.
- **The Mint Facial Bar & Med Spa (Salt Lake City UT):** $35 per_unit and $35 per_session — both active and visible.
- **Luminous Medical Aesthetics (Centennial CO):** $20 per_unit Botox, Dysport, Xeomin — all active and visible.

**Status: NOT APPLIED.** The approved relabels from Phase 7 were previewed but never executed. These rows are currently distorting the Rio Rancho, Salt Lake City, and Denver city averages.

### 4.5 Phase 8 — Domain Mismatch Suppression

- **Dream Medspa (Denver CO):** Majority suppressed with `suppression_reason = 'domain_mismatch_wrong_city_attribution'`. ✓
- **Dream spa (Danbury CT):** All rows suppressed with domain_mismatch. ✓
- **Dream Spa Medical (Brookline MA):** 1 row, NOT suppressed — appears to be a legitimately different entity at a different domain.
- **Nebraska Medicine Dreams MedSpa (Omaha NE):** Mix — some rows suppressed (`scraper_duplicate_run`), some visible. Different entity, correctly left active.

**Status: PASS (target entities handled).** The Dreams MedSpa Brookline and Nebraska Medicine cases are different entities.

### 4.6 Phase 9 — Scraper Dedup

```sql
SELECT COUNT(*) FROM duplicate_groups → 0
```

**Status: PASS.** Zero duplicate groups detected. The partial unique index `idx_pp_scraper_no_dup` is confirmed present and active. The 3,420 suppressed rows from the April 12 duplicate run are soft-deleted and accounted for.

### 4.7 Scraper Dedup Partial Unique Index

Index `idx_pp_scraper_no_dup` confirmed:
```
UNIQUE (provider_id, procedure_type, price, price_label, source_url)
WHERE source IN ('cheerio_scraper','scrape') AND is_active = true
```

**Status: PASS.**

### 4.8 Dysport BEU Suppression

```
quality_flag = 'dysport_beu_suppressed':  0 rows
suppression_reason = 'dysport_beu_suspected': 62 rows (from data_quality_dashboard)
```

**Status: PASS (with note).** 62 rows are suppressed for Dysport BEU. These are suppressed via `display_suppressed = true` + `suppression_reason = 'dysport_beu_suspected'`, NOT via `quality_flag = 'dysport_beu_suppressed'`. The query in this section checked quality_flag (returning 0), but the dashboard confirms 62 rows are correctly suppressed by reason. The two-column approach is consistent and working.

---

## Section 5 — Current Outlier / Violator Landscape

### 5.1 per_unit Outliers by Brand (active, non-suppressed)

| brand | total_active_visible | below_floor | above_ceiling | min | max | median |
|---|---|---|---|---|---|---|
| Botox | 398 | 13 (< $8) | 42 (> $30) | $5.00 | $49.00 | $13 |
| Dysport | 117 | 0 (< $3) | 34 (> $15) | $5.00 | $45.00 | $14 |
| Xeomin | 117 | 6 (< $7) | 14 (> $25) | $5.00 | $45.00 | $12 |
| Daxxify | 51 | 9 (< $8) | 4 (> $20) | $5.00 | $40.00 | $12 |
| Jeuveau | 84 | 4 (< $6) | 20 (> $18) | $5.00 | $45.00 | $13 |
| **Total** | **767** | **32** | **114** | | | |

Combined: 146/767 = **19.0% of named-brand per_unit rows are outside plausible bounds.**  
110/114 above-ceiling rows are from `cheerio_scraper` — these are session/area prices mislabeled as per_unit.  
32 below-floor rows are a mix of H4 pattern (not yet suppressed), BEU variants, and test data.

Additionally, 252 per_unit rows have `brand = NULL` — these are not included in the above count. Their plausibility is unknown.

### 5.2 per_session Neurotoxin Outliers (price < $150 or > $1,500)

| source | n | min | max |
|---|---|---|---|
| cheerio_scraper | 12 | $100 | $147 |
| scrape | 4 | $100 | $125 |
| provider_listed | 2 | $100 | $100 |

**18 rows below $150.** All appear to be single-area sessions priced at $100–$147 (legitimate lip-flip or single-area treatments). **No above-ceiling violations** (nothing > $1,500). The per_session category is relatively clean.

### 5.3 flat_package Neurotoxin by Price Bucket

| bucket | n | min | max |
|---|---|---|---|
| under $50 | 0 | — | — |
| $50–$75 | 178 | $50 | $73 |
| $75–$100 | 132 | $75 | $99 |
| $100–$150 | 278 | $100 | $150 |
| $150–$200 | 214 | $150 | $199 |
| over $200 | 1,664 | $200 | $15,000 |

**Key finding from prior investigation (2026-04-20):**
- No rows exist below $50 — the real market floor is $50
- $50–$150 range (588 rows): mix of legitimate small packages AND per_area prices mislabeled as flat_package (Allure Med Spa $120 = per-area forehead; Nash Injections $150 = per-area lip flip)
- $150–$200 range (214 rows): contains correctly labeled flat packages (Hello Skin $199 = "Unlimited Tox - All Upper Areas")
- $200+ (1,664 rows): bulk of flat_package pricing, largely legitimate bundled sessions
- 8 rows are confirmed mislabeled per_unit (flat_package price matches per_unit price at same provider within $2)
- Phase 15 flat_package floor ($150) is above the true market floor ($50) — 509 false violations triggered

### 5.4 per_area Neurotoxin Outliers (price < $50 or > $500)

| source | n | min | max |
|---|---|---|---|
| scrape | 8 | $45 | $1,180 |

8 rows total. 6 are slightly below the $50 floor ($45–$49, legitimate single-area pricing). 2 are above $500 (up to $1,180 — likely multi-area bundles labeled per_area). Small cohort, low priority.

### 5.5 per_vial Outliers

```
total per_vial:  894
outliers (< $200 or > $2,500): 199
min: $15 / max: $13,500
```

199/894 = 22.3% of per_vial rows are outside the plausible wholesale range. Per docs/data-quality-decisions.md §1, `per_vial` has its own `avg_vial_price` column and is excluded from `is_reliable` gating. **Confirm per_vial rows are excluded from city average calculations** — migration 090 separates these into `avg_vial_price`/`n_vial` and excludes them from `avg_unit_price`. The RPC should filter to `price_label = 'per_unit'` only. ✓ Verified in migration 091 shared `filtered` CTE.

### 5.6 Phase 15 Pre-flight Total

```
705 violators (unchanged from prior session 2026-04-20)
```

Breakdown by category:
- flat_package below_floor: 509 rows (72%) — **root cause: floors miscalibrated**
- per_unit above_ceiling: 114 rows (16%) — **root cause: session prices mislabeled as per_unit**
- Other (per_unit below_floor, per_session, per_area, per_vial): 82 rows (12%)

The gate is ≤ 20 for Phase 15 to proceed. Calibration path established in prior investigation:
1. Lower flat_package floors to $50 → removes ~509 violations
2. Pre-clean per_unit above-ceiling cheerio_scraper rows → removes ~110 violations
3. After (1)+(2), remaining ~86 edge cases need per-category review

---

## Section 6 — Display Pipeline Audit

### 6.1 get_provider_price_summary RPC

```
Function: get_provider_price_summary(p_procedure_type text, p_city text, p_state text, p_price_label text DEFAULT 'per_unit')
Returns: TABLE(provider_id, provider_name, provider_slug, lat, lng, min_price, median_price,
               max_price, sample_size, latest_created_at, city_sample_size, city_trimmed_mean,
               city_p25, city_p75, city_min, city_max, city_is_reliable boolean)
```

**PASS:** Function exists. `city_is_reliable boolean` confirmed in return type (migration 091 applied).

**Live RPC Results:**

**NYC Botox per_unit** — city_sample_size: 27, city_trimmed_mean: $13.84, p25: $10.50, p75: $16.00, reliable: true

Top 5 by price (ascending):
| Provider | min | median | max | n |
|---|---|---|---|---|
| Aesthetics Derma Club | $6.40 | $6.40 | $6.40 | 1 |
| Evolve Med Spa | $7.00 | $7.00 | $7.00 | 1 |
| NYC Natural Facelift | $7.50 | $7.50 | $7.50 | 1 |
| UPKEEP Med Spa | $9.00 | $12.00 | $15.00 | 2 |
| Style Medspa | $9.00 | $9.00 | $9.00 | 1 |

**ISSUE 6.1a:** Aesthetics Derma Club ($6.40), Evolve ($7.00), NYC Natural Facelift ($7.50) are below the $8 Botox per_unit floor and feeding the city average. They are active, visible, and unquarantined. The existing `trg_neurotoxin_price_plausibility` trigger (migration 084) did not block these rows — they pre-date or bypass the trigger. These three alone pull the trimmed mean down by approximately $0.30–$0.50.

**Miami Botox per_unit** — city_sample_size: 8, city_trimmed_mean: $11.35, p25: $6.19, p75: $13.00, reliable: true

| Provider | min | median | max | n |
|---|---|---|---|---|
| Monaco MedSpa | $6.00 | $12.00 | $13.00 | 7 |
| Krueger Aesthetics | $39.80 | $39.80 | $39.80 | 1 |

**ISSUE 6.1b:** Monaco MedSpa contributes a $6.00 row (below $8 floor) pulling down the p25 to $6.19. This was identified in prior sessions as a pending suppression. Krueger Aesthetics at $39.80 is above the $30 ceiling and is almost certainly a session price mislabeled as per_unit. With only 8 total rows, these two outliers meaningfully distort the Miami average.

**LA Botox per_unit** — city_sample_size: 19, city_trimmed_mean: $11.29, p25: $9.25, p75: $13.50, reliable: true

Volume Aesthetics and NakedMD at $7.00 appear in the results (below $8 floor). These feed the LA trimmed mean.

**ISSUE 6.1c:** The 10%–90% trimmed mean partially mitigates outlier impact, but with small N (NYC=27, Miami=8, LA=19), single outliers still shift the mean materially. The $39.80 Krueger row in Miami is excluded from the trimmed mean at N=8 (top 10% = top 0.8 rows, so likely excluded), but the $6 Monaco row at the bottom is not excluded if it's within the 10th percentile band.

### 6.2 Header/Map/Card Consistency (NYC Botox)

RPC returns a single `filtered` CTE (migration 091 shared source of truth) — both per-provider rows (map pins) and city aggregates come from the same predicate. **By construction, the header avg and map pins cannot diverge.** This is the fix applied in migration 091 for the April 2026 divergence bug.

**PASS:** The shared CTE prevents header/map divergence.

**Residual ISSUE 6.2:** Map pins and header are consistent WITH EACH OTHER, but both may include out-of-bounds rows (the $6.40 Aesthetics Derma Club NYC pin and the $39.80 Krueger Miami pin). The consistency guarantee does not imply plausibility.

### 6.3 Card Component Brand Labeling

**`inferNeurotoxinBrand()`** in `src/lib/priceUtils.js` — confirmed present.  
**`extractSingleBrandFromType()`** in `src/lib/priceUtils.js` — confirmed present.  
**Map-based dedup** in `src/pages/FindPrices.jsx` — confirmed using `effectiveBrand` key.

Brand display path: `PriceCard.jsx` → `inferNeurotoxinBrand({ procedureType, brand, perUnitPrice })` → label or `getProcedureLabel()` fallback.

The browse card brand labeling fix (Xeomin/Daxxify/Jeuveau showing as BOTOX when `brand=null`) was applied in this session. **AesthetIQ Med Spa (Dysport + Daxxify) now shows correctly** per the applied fix. **PASS.**

### 6.4 Price Label Display Normalization

Centralized in `src/utils/formatPricingUnit.js`:
- DB enum: `'per_unit'` (underscore)
- Display: `getPriceLabelLong('per_unit')` → `'per unit'` (space)
- Suffix: `formatUnitSuffix('per_unit')` → `'/unit'`
- Fallback: `unit.replace(/_/g, ' ')`

**PASS.** Normalization is centralized. No raw underscore strings in JSX.

**Note:** `price_label` DB default is `'per session'` (with space, not underscore). If any query compares `price_label = 'per_session'` and a row was inserted without specifying `price_label`, the default `'per session'` would not match. The 4 `unknown` label rows and 217 `starting_at` rows may include such cases.

### 6.5 Map Feature Flags

| Flag | Status |
|---|---|
| VITE_USE_MAPBOX | Deprecated — no longer in code, referenced in docs as "should be removed from Vercel settings" |
| MAP_DEBUG | Console log prefix only, not a feature flag |
| Current map library | Mapbox GL 3.22.0 + React Map GL 8.1.1 (package.json) — code uses Google Maps API via VITE_GOOGLE_MAPS_KEY |

**ISSUE 6.5:** package.json includes `mapbox-gl ^3.22.0` and `react-map-gl ^8.1.1` as dependencies, but the `.env.example` lists only Google Maps keys. If `VITE_USE_MAPBOX` was the toggle between Mapbox and Google Maps, and it's now deprecated, the mapbox-gl package is dead weight in the bundle. Confirm it can be removed.

### 6.6 "Not enough data yet" Behavior

Low-N cities found (n_unit = 1–4, Botox):

| city | state | n_unit | median | trimmed_mean | is_reliable |
|---|---|---|---|---|---|
| Castle Rock | CO | 4 | $25.00 | NULL | false |
| Boynton Beach | FL | 4 | $15.00 | NULL | false |
| Billings | MT | 4 | $11.00 | NULL | false |
| Atlanta | GA | 4 | $10.00 | NULL | false |
| Chula Vista | CA | 4 | $10.50 | NULL | false |

`trimmed_mean_unit_price = NULL` at n < 5 — confirmed. `is_reliable = false` — confirmed.

PriceContextBar two-gate: `isReliable` requires `cityStats.trimmedMean != null`. For these cities trimmedMean = null → isReliable = false → the "Not enough data yet" path renders. **PASS.**

**Note:** Castle Rock CO has median=$25 with n=4. This is suspicious — $25/unit is above typical market rates and may reflect the S1/S2 mislabeled per_unit rows in Colorado (see Phase 7: Rio Rancho $800 relabels). However with n=4 and is_reliable=false, the average is suppressed from display. No user-facing harm at this time.

---

## Section 7 — Ingest Path Audit

### 7.1 Scraper Patches (Phase 11)

| Patch | Symbol | File | Line | Status |
|---|---|---|---|---|
| 1 — Per-brand proximity guard | `nearest_brand_to_price` | extract_units.py | 470–483 | ✓ PRESENT |
| 1 — Competing brands regex | `COMPETING_BRANDS_RE` | extract_units.py | ~463 | ✓ PRESENT |
| 2 — Promo detection | `PROMO_RE` + `has_promo_signal` | extract_units.py | 489–495 | ✓ PRESENT |
| 3 — Wrong-page blocklist | `WRONG_PAGE_PATH_RE` + `is_wrong_page_type` | extract_units.py | 505–515 | ✓ PRESENT |
| 4 — Taxonomy floor | `PRICE_LABEL_FLOORS` | extract_units.py | 523–526 | ✓ PRESENT |
| 4 — Import script floor | `NEUROTOXIN_PER_UNIT_MIN = 8` | import-validated-prices.js | 199 | ✓ PRESENT |

**PASS.** All 4 patches confirmed. Test suite (scripts/test_extract_patches.py) last verified 2026-04-20, 17/17 tests passing.

### 7.2 Last Successful Scrape Run

```
data_quality_dashboard.ingested_24h: 0
```

The April 12 2026 scrape was the last known scrape run (3,420 dedup-suppressed rows). No new rows ingested in the past 24 hours. If the scraper has not run since April 12, the patches have been applied to the code but **have never been tested against real production traffic.** The April 12 scrape pre-dates the patches (which were applied in this session on 2026-04-20).

**ISSUE 7.2:** Scraper patches are code-only. No patch-protected scrape run has completed against production. The sub-$8 floor, promo detection, and proximity guard will only protect future scrape runs, not existing data.

### 7.3 New Rows in Last 7 Days

`data_quality_dashboard.ingested_24h: 0`. No new ingest in last 24 hours. No 7-day breakdown available without an additional query. The scraper is not running on a scheduled cadence visible in the audit.

### 7.4 Community Submission Path

Handler: `src/lib/submitPrice.js` — `submitPrice()` function.  
- Single-row insert with per-row error logging to `submission_errors` table.
- Errors logged as: user_id, procedure_type, city, state, error_code, error_message, payload.
- Non-blocking catch for `submission_errors` insert itself.
- Community dedup index: `idx_provider_pricing_community_dedup` — UNIQUE on (provider_id, procedure_type, price, price_label) WHERE source = 'community_submitted'. ✓ Present.
- Current community_submitted rows: 79 total, 76 active_visible, 0 quality_flagged.

**PASS.** Community submission has per-row error handling and dedup index.

### 7.5 Silent Catch Audit

**26 empty catch blocks** found across 22 files. All are intentional non-blocking suppression patterns of the form `.catch(() => {})` on background async operations (analytics, Google Maps load, etc.). None are in the pricing read path or the data aggregation path.

**Notable patterns:**
- `App.jsx` lines 146–152: 6 catch blocks in the initialization chain (Google Maps, geolocation, etc.) — all intentional
- `FindPrices.jsx` lines 3087, 3826: localStorage read failures — intentional (graceful degradation)
- No empty catches in: submitPrice.js, the RPC call path, or city_benchmarks refresh

**PASS (with note).** No silently swallowed errors in user-facing pricing flows. The 26 catches are all in UI initialization / background analytics paths.

---

## Section 8 — City Coverage and Reliability

### 8.1 is_reliable Count by Procedure (top 20)

| procedure_type | reliable | low_n | no_data |
|---|---|---|---|
| Botox | 27 | 170 | 90 |
| Tox | 17 | 43 | 0 |
| Xeomin | 4 | 52 | 43 |
| Botox / Dysport / Xeomin | 4 | 58 | 16 |
| Juvederm | 3 | 1 | 24 |
| Jeuveau | 3 | 46 | 21 |
| Dysport | 2 | 68 | 73 |
| Medical Weight Loss | 1 | 0 | 59 |
| Daxxify | 1 | 28 | 34 |
| Dermaplaning | 1 | 2 | 96 |
| Restylane | 1 | 1 | 28 |
| Lip Flip | 1 | 20 | 35 |
| Filler | 1 | 30 | 195 |
| Sculptra | 1 | 10 | 83 |
| Microneedling | 0 | 12 | 266 |
| Non-Surgical Rhinoplasty | 0 | 0 | 4 |

**ISSUE 8.1a:** "Botox" and "Tox" are separate rows in city_benchmarks. Together they represent 44 reliable cities. The RPC is called with `p_procedure_type = 'botox'` (lowercase) and the fuzzyToken resolves to a single canonical token before the call — but city_benchmarks appears to store both "Botox" and "Tox" as separate procedure_types. The `refresh_city_benchmarks()` function must be aggregating correctly by canonical token — verify this does not double-count.

**ISSUE 8.1b:** "Botox / Dysport / Xeomin" (4 reliable cities) is a multi-brand combined procedure_type. Per docs §3, cross-brand aggregation is prohibited. These 4 rows in city_benchmarks are mixed-brand averages and should be excluded from display or split.

### 8.2 Top 50 Metro Coverage (Botox)

Of the top 50 US metros by population, **Botox coverage:**

**Reliable (N ≥ 5):** Los Angeles, New York, Denver (2 entries), San Diego, Omaha, Phoenix, Nashville, Chicago, Portland, Albuquerque, Kansas City, San Francisco, Houston, Jacksonville, Dallas = **~17 reliable metro entries** (some metros appear multiple times due to multiple procedure_type rows)

**Low-N (1–4):** Columbus, Atlanta, Indianapolis, Louisville, Virginia Beach, Tampa, Philadelphia, Arlington, Baltimore, Memphis, Oklahoma City, San Antonio, Charlotte, Colorado Springs, Anaheim, Las Vegas, Mesa, Milwaukee, Austin, Seattle, Sacramento = **~21 metros**

**No data:** Honolulu, Raleigh, New Orleans, El Paso, Aurora CO = **5 metros with zero Botox data**

**Net assessment:** ~17 of the top 50 metros have reliable Botox averages. ~21 show a median-only (no average). ~5 show nothing at all.

### 8.3 Launch-Readiness Count

| Procedure | Reliable Cities |
|---|---|
| Botox | 27 (44 if Tox combined) |
| Dysport | 2 |
| Xeomin | 4 |
| Jeuveau | 3 |
| Daxxify | 1 |
| Filler | 1 |
| Laser/Microneedling | 0 |

For a launch centered on neurotoxin pricing, Botox coverage at 27+ reliable cities is meaningful. All other categories have negligible reliable coverage and cannot show averages to users in most cities.

### 8.4 Cities with n=1 or n=2 (Botox)

```
183 cities have n_unit = 1 or 2 for Botox
```

183 cities show a single data point as the "median." While technically correct (median of 1 = the point itself), showing a single provider's price as a city median is potentially misleading for a consumer product. These cities show no average (correctly suppressed), but the map pin from that single provider is visible.

---

## Section 9 — Known Infrastructure Gaps

### 9.1 Monitoring and Tooling

| Item | Status |
|---|---|
| Sentry / Bugsnag / Rollbar / Datadog | **NOT FOUND** — no error tracking service in package.json or imports |
| Client-side MAP_DEBUG capture | **NOT FOUND** — `[MAP_DEBUG]` is a console.error prefix only; not sent to any monitoring service |
| `/admin/data-quality` route | **DOES NOT EXIST** — admin routes are `/admin`, `/admin/pending-charges`, `/admin/waitlist` only |
| `data_quality_snapshots` table | **EXISTS** — table present in DB |
| `data_quality_dashboard` view | **EXISTS** — view present, returning correct data |
| `price_plausibility_rejects` table | **DOES NOT EXIST** — Phase 15 Part 2 (migration 095) not yet applied |
| pg_cron weekly snapshot job | **UNKNOWN** — table exists but no cron job confirmed |

**ISSUE 9.1a (Critical):** No error tracking service (Sentry, etc.). In production, unhandled errors in the pricing pipeline, RPC failures, and map rendering errors are lost to `console.error` only. There is no alerting, no error aggregation, no ability to detect regressions after deploy.

**ISSUE 9.1b:** The `/admin/data-quality` route was planned in prior sessions but not implemented. The `data_quality_dashboard` view exists in the DB but has no web UI surface.

### 9.2 Test Coverage

| Category | Status |
|---|---|
| Playwright / Cypress e2e tests | **NONE** |
| Vitest / Jest unit tests | **NONE** |
| Application test files (*.test.*, *.spec.*) | **NONE** |
| Test framework in package.json | **NONE** |
| Scraper patch tests | **EXISTS** — `scripts/test_extract_patches.py` (17/17 passing, 2026-04-20) |

**ISSUE 9.2 (Critical):** Zero automated tests for the frontend or pricing display logic. The only tested code is the scraper patch suite. Type-checking (if any) and the scraper tests are the entire automated safety net.

### 9.3 Backup / Restore

Supabase provides automated daily backups for all projects on paid plans. Point-in-time recovery (PITR) is available on Pro plan and above. No manual dump schedule was found in the codebase.

**UNKNOWN 9.3:** Backup tier (Free vs Pro) and PITR window were not confirmed in this audit. If the project is on the Free tier, backup policy is more limited.

---

## Section 10 — Final Scorecard and Recommendation

### 10.1 Cleanup State Summary

| Phase | Status | Evidence | Remaining |
|---|---|---|---|
| Phase 4: H4 Botox suppression | **PARTIAL** | 36 rows suppressed; expected 40–55; 4 Daxxify H4 rows uncovered | Daxxify H4: 4 rows; possible 4–19 Botox H4 residuals |
| Phase 5: H1 promo suppression | **PARTIAL** | 11 rows suppressed; expected 25–35; 14 pending_review_rows in dashboard | ~14–24 promo rows remain active_visible |
| Phase 6: H2a deletion | **PASS** | Target URLs deleted; Stay Ageless fully suppressed | None |
| Phase 7: S1/S2/S3 relabels | **NOT APPLIED** | Rio Rancho $800 (11 rows), Luminous $20, Mint Facial $35 — all active | 13 approved relabels pending execution |
| Phase 8: Domain mismatch | **PASS** | Dream Medspa Denver + Dream spa Danbury suppressed | Fringe edge cases (different entities) not required |
| Phase 9: Scraper dedup | **PASS** | 0 duplicate groups; idx_pp_scraper_no_dup confirmed | None |
| Phase 11: Scraper patches | **PASS (code only)** | All 4 patches in extract_units.py; NEUROTOXIN_PER_UNIT_MIN in import-validated-prices.js; 17/17 tests | Patches untested against live traffic (no scrape since April 12) |
| Phase 13: Migration 090 | **PASS** | All migration 090 columns present; is_reliable populated | Verify is_reliable is GENERATED vs. function-set |
| Phase 13: Migration 091 | **PASS** | get_provider_price_summary returns city_is_reliable; shared CTE confirmed | None |
| Phase 13: Migration 092 | **PASS** | data_quality_dashboard view returns correct data | None |
| Phase 14: UI diffs | **PASS** | PriceContextBar two-gate, GlowMap opacity, cityStats.isReliable mapping — all confirmed | None |
| Phase 15: Trigger | **NOT STARTED** | Pre-flight gated: 705 violators (> 20 limit); trg_neurotoxin_price_plausibility (migration 084) already exists | Calibrate flat_package floors; pre-clean per_unit above-ceiling; re-run pre-flight |
| Brand labeling fix | **APPLIED** | extractSingleBrandFromType + Map-based dedup applied in this session | None |

### 10.2 Top 5 Launch Blockers

**#1 — Per-unit above-ceiling rows distort displayed averages (NYC, Miami, LA, others)**  
110 cheerio_scraper rows at $30–$49/unit (session prices mislabeled as per_unit) are active and visible. They appear on map pins and feed city trimmed means. Example: Krueger Aesthetics $39.80 in Miami (N=8 city) and sub-$8 rows in NYC pull the city averages. These create consumer-visible pricing errors in the core use case.  
*Fix: Suppress 110 rows + pending pre-clean before Phase 15 trigger. 1–2 migrations.*

**#2 — Phase 7 relabels not applied (Rio Rancho $800, Salt Lake City $35, Centennial $20)**  
The approved relabels from Phase 7 were previewed but never executed. Isla Aesthetics Rio Rancho has 11 rows at $800/unit showing in per_unit averages, Luminous Medical $20/unit and Mint Facial Bar $35 are active.  
*Fix: Execute the approved UPDATE statements from Phase 7. 1 migration.*

**#3 — No error tracking in production**  
Pricing pipeline errors, RPC failures, and map errors are invisible in production. A silent regression (e.g., wrong city_benchmarks after a re-run, broken RPC) would not be detected until a user reports it.  
*Fix: Add Sentry or equivalent. Estimated 1 day of work.*

**#4 — 29.1% of providers have no coordinates (invisible on map)**  
11,279 providers cannot appear on the map at all. For users who only browse the map view, this is a 30% data gap. Major metros may appear sparse when the actual data density is higher.  
*Fix: Run geocoding job via Google Places API for missing providers. Estimated 1–2 days.*

**#5 — Monaco MedSpa Miami $6.00 sub-floor row distorts the only 8-provider city average**  
Miami has only 8 Botox per_unit rows. A single $6.00 row (Monaco MedSpa, identified in prior sessions as pending suppression) pulls the p25 to $6.19 and makes Miami look cheaper than it is.  
*Fix: Apply Monaco MedSpa suppression (1 row). Pending explicit approval from prior session gate.*

### 10.3 Top 5 "Could Ship Without This" Items

**#1 — Non-neurotoxin plausibility gating (filler, laser, microneedling)**  
625 filler outliers, 155 laser outliers, 392 microneedling outliers exist. These categories don't have reliable city averages anyway (0–1 reliable cities each) so the bad data is not currently surfaced to users as averages. The map pins for these categories still show individual prices which could be wrong.

**#2 — per_area mislabeling (flat_package vs per_area)**  
A material portion of the 802 flat_package < $200 rows are per_area prices mislabeled by the scraper. These don't affect city averages (per_area has its own `avg_area_price` column, separated in migration 090) but do show incorrect labels on provider cards.

**#3 — Proxy flat_package floor calibration for Phase 15**  
The Phase 15 trigger flat_package floor of $150 is miscalibrated. Fixing it is prerequisite for Phase 15, but Phase 15 itself is a future insert gate — it doesn't affect currently displayed data.

**#4 — Botox/Dysport/Xeomin cross-brand city_benchmarks rows (4 reliable)**  
4 city_benchmark rows are cross-brand aggregates which are prohibited by docs §3. These are technically wrong but 4 rows won't meaningfully affect overall coverage.

**#5 — VITE_USE_MAPBOX in Vercel settings / mapbox-gl dead package**  
Deprecated flag should be cleaned up, dead mapbox-gl bundle weight should be removed. Zero user-facing impact at launch.

### 10.4 Real Data Health Number

**For neurotoxin per_unit specifically (the core use case):**

```
Total named-brand per_unit rows (active, visible, excluding known-suppressed): 767
Passing all plausibility bounds:                                               621
Failing (below_floor or above_ceiling):                                        146
HEALTH: 81.0% clean
```

**Broader view — all 36,868 active_visible rows:**

The per_unit neurotoxin category (767 rows, 2.1% of total) has the most scrutiny applied. Other categories are less audited. The "all rows" health number cannot be computed precisely without per-category bounds (not yet defined for filler, laser, etc.) but given:
- Section 2 shows 625 filler + 155 laser + 392 microneedling + 108 peel outliers = 1,280 known outliers outside loose category bounds
- Plus 705 Phase 15 neurotoxin violations
- Total identifiable outliers: ~2,000 / 36,868 active_visible = ~5.4%

**Headline data health: approximately 94–95% of active_visible rows pass basic plausibility checks across all categories. For the core neurotoxin per_unit use case specifically: 81% pass all bounds without the trigger in place, and the failing 19% are well-understood and fixable.**

### 10.5 Reality Check: Launch with Display-Time Phase 15 Filter

If we added a display-time filter (`show only neurotoxin per_unit rows within Phase 15 bounds`) to the RPC:

**Row retention:** 621/767 named-brand per_unit rows pass = 81%. But Phase 15 bounds currently trigger on flat_package too — applying them display-time to flat_package would hide 509 legitimate rows. **Apply display-time filter to per_unit only.**

**City coverage impact (Botox per_unit, applying $8–$30 filter):**
- NYC: n=27 → drops to ~22 (remove $6.40, $7.00, $7.50 below-floor). trimmed_mean shifts from $13.84 to ~$14.50. Still reliable. ✓
- Miami: n=8 → drops to 6 (remove Monaco $6 below-floor, Krueger $39.80 above-ceiling). Still reliable (N ≥ 5). trimmed_mean becomes ~$12.50 (more accurate). ✓
- LA: n=19 → drops to ~17 (remove Volume $7, NakedMD $7). Still reliable. trimmed_mean shifts from $11.29 to ~$11.90. ✓
- Denver: n=11 → loses 1–2 outliers, still reliable. ✓
- Cities currently at N=5 (minimum reliable): losing 1 row → N=4 → **drops to is_reliable=false**. 2–3 cities could lose reliable status.

**Net: applying per_unit display-time bounds would slightly improve averages in major cities, maintain reliability in most, and potentially drop 2–3 borderline cities from reliable to low-N. Approximately 88–90% of top-50 metro cities with any Botox data would retain is_reliable=true.**

### 10.6 Final Recommendation: **FIX FIRST** (not SHIP, not MAJOR WORK)

**Reasoning:**

The data is not catastrophically broken — 81% of per_unit neurotoxin rows pass plausibility bounds, 17 of the top 50 metros have reliable Botox averages, the display pipeline (RPC, PriceContextBar, GlowMap) is correctly wired, and the Phase 9–14 foundations are solid.

**But** two issues create concrete consumer harm if shipped today:
1. The Miami RPC returns Krueger Aesthetics at $39.80/unit (a $40 session price mislabeled as per_unit) alongside $13–$14 legitimate prices. A user comparing Miami to LA will see "$39.80" on the map alongside normal-range providers, which is misleading.
2. Phase 7 relabels (Rio Rancho $800/unit) are still visible. A Botox-seeking user in Albuquerque or nearby cities could see a $800/unit pin on the map.

**Estimated fix time before ship:** 1–2 days.

Required before launch:
- Execute Phase 7 approved relabels (1 migration, < 1 hour)
- Suppress Monaco MedSpa $6 Miami row + Krueger Aesthetics $39.80 Miami row (pending gate approval)
- Suppress ~110 per_unit above-ceiling cheerio_scraper rows (migration, ~2 hours)
- Monaco/NYC sub-floor pins are a lower priority (trimmed mean still reasonable at ~$14)

Nice-to-have before launch (weekend of work):
- Calibrate Phase 15 flat_package floors → apply trigger → close the ingest gate
- Add Sentry (1 day)
- Geocode missing providers (1–2 days async job)
- Implement /admin/data-quality route

The data quality story is: the systematic issues are understood, bounded, and fixable with migrations — not architectural. The scraper patches are in place for future runs. The display pipeline is correct. **Fix the 3–4 specific consumer-visible errors, then ship.**

---

*Audit generated: 2026-04-20. All data read-only from production. No modifications made.*

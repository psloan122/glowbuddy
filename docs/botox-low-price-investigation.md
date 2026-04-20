# Botox Low-Price Investigation
**Date:** 2026-04-19  
**Scope:** Active, unsuppressed `provider_pricing` rows where `procedure_type ILIKE '%botox%'`, `price_label = 'per_unit'`, `price < $10`  
**Purpose:** Determine whether the sub-$10 cluster is real aggressive pricing (H3) or scraper artifact (H1/H2a/H2b/H4); inform CHECK constraint bounds and scraper patches

---

## Part 1 — Raw Evidence

### 1.1 Cohort Size

**Total: 124 rows** across 5 sources:

| Source | Rows | Min | Avg | Max |
|--------|------|-----|-----|-----|
| `cheerio_scraper` | 53 | $5.00 | $7.05 | $9.99 |
| `scrape` | 24 | $5.00 | $7.13 | $9.00 |
| `provider_listed` | 22 | $5.00 | $7.78 | $9.50 |
| `community_submitted` | 21 | $6.40 | $7.94 | $9.00 |
| `csv_import` | 4 | $5.00 | $7.25 | $9.00 |

**Price distribution (notable clusters):**

| Price | Rows | Notes |
|-------|------|-------|
| $5.00 | 28 | Largest single price; H4 dominant |
| $9.00 | 32 | Largest cluster overall; H1/H3/membership mix |
| $8.00 | 15 | Mixed H1/H3 |
| $7.00 | 13 | Mixed H1/H4/H3 |
| $7.99 | 5 | Simply Tox (promo/membership) |
| $9.99 | 5 | Simply Tox membership + new-client specials |

**Deal flags:** Only 6 of 124 rows have `is_deal = true` (3× bulk_package, 1× groupon, 1× sale, 1× day_special). The remaining 118 rows have `is_deal = false` regardless of actual pricing nature — a significant undercount of promotional rows.

**Procedure type split:** 100 rows are `procedure_type = 'Botox'`; 24 are `'Botox / Dysport / Xeomin'`.

### 1.2 Raw Scrape Text Storage

**Infrastructure gap confirmed.** `provider_pricing` has no raw HTML or scrape-text column. The only text-adjacent columns are:

- `notes` — consumer-facing copy field; almost always NULL in scraped rows
- `units_or_volume` — extracted "N units" string, populated for ~5 rows
- `source_url` — URL only, no page snapshot

**Recommendation:** Add a `raw_snippet TEXT` column (nullable) storing the ±300-char context window around the price match at scrape time. This is the minimum needed to audit label assignments post-hoc without re-fetching live pages (which may have changed).

---

## Part 2 — H2b Test: Per-Vial-to-Per-Unit Conversion

### 2.1 Providers With Both Low Per-Unit and a Per-Vial Botox Row

**1 provider found:** Besos Aesthetics (Spring, TX)
- `per_unit` row: **$5.00** (cheerio_scraper)
- `per_vial` row: **$450.00** (same provider)
- Implied unit price: $450 / 100 = **$4.50/unit** — within $0.50 of the actual $5 row

### 2.2 Per-Vial Conversion Assessment

The $5 at Besos is within $0.50 of the implied H2b value, making it a technical match. However, live page verification (see Part 5) confirms the actual page lists **Botox $13/unit and Dysport $5/unit**. The $5 row is better explained by H4 (Dysport misattribution). The per-vial row is likely a separate correct flat-package entry.

**H2b verdict: Not a significant driver.** Only 1 provider has a coexisting per_vial row, and that case has a superior H4 explanation.

### 2.3 Vial/Bottle URL Pattern Match

Zero source URLs in the sub-$10 cohort contain `vial`, `bottle`, `100u`, `100-unit`, or `100unit`.

**H2b conclusion: Ruled out as a systematic cause.**

---

## Part 3 — H1 Test: Promo Text Misparse

### 3.1 URL-Level Signal Scan (All 124 Rows)

| Signal Type | Rows |
|-------------|------|
| No URL signal | 120 |
| `/special` or `/specials` or `/promo` in path | 3 |
| `/weight-loss` (wrong page type) | 1 |

URL patterns catch only 4 of 124 problem rows — URL-level filtering is not sufficient. The real H1 signal is in page *content*, not in the URL.

### 3.2 H1 Content Evidence (20-Row Sample Via Live Fetch)

Providers directly confirmed as H1 via page content:

| Provider | City | Price | H1 Evidence |
|----------|------|-------|-------------|
| Aurea Medical Aesthetics | Providence, RI | $8.00 | April 1-30 Letybo special: "purchase 25 units at $8/unit, receive free Lip Flip" — stored as Botox |
| Emagine Med Spa | San Diego, CA | $9.00 | "Smooth & Save" promo page; Jeuveau/Xeomin "Only $9/unit — unbeatable price, don't miss your chance" |
| Center for Medical Aesthetics | Providence, RI | $9.99 | "NEW CLIENT SPECIAL — minimum 40 units" |
| James Christian Cosmetics | Miami Beach, FL | ~$7.00 | "BOTOX SPECIAL — Best Botox Deal in NYC & Long Island"; new clients only, 60-unit minimum, actual price $6.65 |
| Simply Tox | Salt Lake City, UT | $7.99 | "Easter Special: new clients get Tox for $7.99/unit"; non-promo member rate $9.99/unit |
| Simply Tox | Salt Lake City, UT | $8.99/$9.99 | Membership pre-pay rate ($45/month); not standard retail |
| dermani MEDSPA® (5 locations) | GA + TX | $9.00 | Member-only pricing ($45/month, 6-month minimum, 20-unit minimum per visit); non-member retail is $11/unit |

**H1 scope estimate: 25–35 rows** (confirmed 7 providers × multiple rows; additional rows exist for VIP Aesthetic Center FL `/botox-special` URL and Natura Med Spa `/botox` specials page).

---

## Part 4 — H2a Test: Wrong Page Type

### 4.1 Confirmed Wrong-Page Rows

| Provider | Price | Evidence |
|----------|-------|---------|
| LaserAway Nashville Green Hills (Nashville, TN) | $7.00 | Source URL: `https://laseraway.com/weight-loss` — LaserAway weight-loss landing page, not a neurotoxin pricing page. Returns 403 on direct fetch, confirming it is an authenticated/gated page |
| Destin Weight Loss and Wellness (Destin, FL) | $5.00 / $6.00 | Provider name + domain both indicate weight loss clinic; two rows at different prices suggest the scraper matched "Botox" on a weight-loss treatment menu where pricing is per-weight-loss-session, not per toxin unit |
| BeautyGoalsLV (Las Vegas, NV) | $6.00 | Live page shows only session/package pricing: Botox $550, Dysport $600, Xeomin $450, Daxxify from $800 — no per-unit prices exist; the $6 is unaccountable from the page's visible content |

**H2a scope estimate: 3–5 rows.** LaserAway chains may have additional locations affected by the same weight-loss URL match pattern.

### 4.2 H2a Scope Note

Stay Ageless Clinic (listed in DB at Miami, FL with $7.00) uses domain `stayageless.net` which is already in `JUNK_DOMAINS` in `extract_units.py`. The row was imported before that exclusion was added. This is an additional wrong-provider-type row.

---

## Part 5 — H3 Spot Check

### 5.1 New Hypothesis Discovered: H4 (Dysport Price Misattributed to Botox)

A new hypothesis not in the original spec emerged as the **dominant explanation** for the $5–$7 cluster.

**Mechanism:** When a provider page lists multiple neurotoxin brands in a menu (e.g., "Botox $15 / Dysport $5 / Xeomin $12"), the scraper's `PROC_RE` matches "Botox" and extracts all prices within the ±100-char context window. Dysport's lower per-unit price ($3–7, reflecting the ~2.5× dosing ratio) falls within that window and gets recorded as a Botox row.

**Cross-check query:** 52 of 124 sub-$10 rows belong to providers that also have a Dysport per_unit row at the *same price point* — the strongest possible evidence of double-capture.

**Directly confirmed via live page fetch (9 providers):**

| Provider | City | DB Price (Botox) | Actual Page: Botox | Actual Page: Dysport |
|----------|------|-----------------|-------------------|---------------------|
| UPKEEP Med Spa | New York + Dallas | $5.00 | $15/unit | $5/unit |
| Besos Aesthetics | Spring, TX | $5.00 | $13/unit | $5/unit |
| AEVR Wellness | Lutz, FL | $5.00 | $12/unit | $5.25/unit |
| Azia Medical Spa | Birmingham, AL | $5.00 | $15/unit | $5/unit |
| AesthetIQ Med Spa | Cockeysville, MD | $5.50 + $8.00 | $14/unit | $5.50/unit (Dysport) + $8/unit (Daxxify) |
| Ketchum Dermatology | Brooklyn, NY | $6.00 | $15/unit | $6/unit |
| Skin Envy Aesthetics | Alpharetta, GA | $5.00 | $13/unit | $5.25/unit |
| Lumiere Skin & Laser | McLean, MD | $5.00 | $12/unit | $5/unit |
| Mara's Med Spa | Dallas, TX | $6.50 | $13.50+ (starting) | $6.50+ (starting) |

**Coexistence pattern:** All confirmed H4 providers also have a *correct* higher-priced Botox row in the DB. The Dysport price was ingested in addition to — not instead of — the real Botox price:

| Provider | Suspect (low) | Correct (high) |
|----------|--------------|---------------|
| UPKEEP (NY) | $5 | $15 |
| Besos Aesthetics | $5 | $40* |
| AEVR Wellness | $5 | $12 |
| AesthetIQ Med Spa | $5.50 | $14 |
| Ketchum Dermatology | $6 | $15 |
| Mara's Med Spa | $6.50 | $14 |

*The $40 high-price rows at some providers may be separate labeling issues; they do not affect the H4 diagnosis of the low-price rows.

**H4 scope estimate: 40–55 rows** (52 confirmed by cross-check; some overlap with H1 where promo pages also show Dysport at low prices).

### 5.2 Confirmed H3 Rows (Real Retail Pricing)

The following sub-$10 rows are confirmed or strongly credible as real retail per-unit Botox pricing:

| Provider | City | Price | Source | Evidence |
|----------|------|-------|--------|----------|
| Headlines Tox Bar | Phoenix, AZ | $8.50–$9.50 | provider_listed | Live page: Jeuveau $8.50, Botox $9.50, Daxxify $12.50 — standard retail, no membership |
| Alliance Health Choice | Westwood/Woodland Hills/Brentwood, CA | $7–$8 | community_submitted | Community notes: "Regular any-day price", bulk 100-unit bank at $7 |
| NakedMD | LA / Beverly Hills / Newport Beach | $7–$7.99 | community_submitted | Multiple consistent reports across locations |
| dermani MEDSPA® (chain) | GA + TX | $9.00 | scrape + cheerio | Real price, but only for members ($45/month, 20-unit minimum); non-member retail is $11 |
| BTX Clinic | Monterey Park, CA | $6.50 | community_submitted | No deal flag; consistent with Chinese-market aggressive pricing cluster in SGV |
| YouthFill MD Med Spa | Culver City, CA | $8–$9 | community_submitted | Two separate community reports |
| Serenity Aesthetics Spa | Bronx, NY | $9.00 | community_submitted | No deal flag |
| Glow Medispa | Seattle, WA | $9.00 | community_submitted | No deal flag |
| UPKEEP Med Spa | New York + Dallas | $9.00 | community_submitted | Community-reported, distinct from the $5 scraper row |
| Monaco MedSpa | Miami, FL | $6.00–$6.25 | provider_listed + csv_import + scrape | Three sources converge; URL JS-rendered so page could not be confirmed live |

**H3 scope estimate: 20–30 rows.** Concentrated in the $8–$9 range; a small cluster of credible community reports exists at $7–$7.99 for discount/bulk-friendly providers.

### 5.3 Secondary Issues Found

**Domain mismatch errors (not a hypothesis — a data quality issue):**
- Dream Medspa (Denver, CO) and Dream spa (Danbury, CT): both use `dreamhoustonmedspa.com` — a Houston TX provider's domain. All pricing rows for these two records reflect Houston pricing applied to wrong-city providers.
- A New Day Spa (Sugar Hill, GA): source URL `anewdayspautah.com` — a Utah provider's domain matched to a Georgia provider.
- Stay Ageless Clinic (Miami, FL): source URL `stayageless.net` — a New York provider's domain; `stayageless.net` is already in `JUNK_DOMAINS` but this record predates the exclusion.

**Deduplication issues:** Multiple providers appear 2–3× at the same price from the same scrape batch (Besos Aesthetics ×2, UPKEEP Dallas ×2, Sissa Albuquerque ×2, Simply Tox ×4–5). These are not separate price signals — they are scraper re-runs without dedup.

---

## Part 6 — Recommendations

### 6.1 Action Per Bucket

| Bucket | Estimated Rows | Action |
|--------|---------------|--------|
| **H4** — Dysport price misattributed to Botox | 40–55 | **Suppress** the low Botox rows (correct Botox price already exists for same provider); do not relabel — the price is real for Dysport but wrong for Botox |
| **H1** — Promo / new-client / membership | 25–35 | **Suppress** rows where source is scraper and price < $8; for community_submitted with `is_deal = true`, keep with deal flag intact |
| **H2a** — Wrong page type | 3–5 | **Delete** (LaserAway weight-loss, Destin Weight Loss, BeautyGoalsLV); these have no valid neurotoxin price on the scraped page |
| **H2b** — Per-vial conversion | 0–1 | No action required; sole case better explained by H4 |
| **H3** — Real aggressive retail | 20–30 | **Keep**; note that dermani MEDSPA rows should have `is_deal = true` / `deal_type = 'membership'` added to reflect the pricing gate |

**H4 suppression query template (do not run yet — requires review):**
```sql
-- Suppress low-Botox rows where the same provider has a Dysport row at the same price
UPDATE provider_pricing pp
SET display_suppressed = true,
    suppression_reason = 'h4_dysport_price_captured_as_botox'
WHERE pp.procedure_type ILIKE '%botox%'
  AND pp.price_label = 'per_unit'
  AND pp.price < 10
  AND pp.is_active = true
  AND pp.display_suppressed = false
  AND pp.source IN ('cheerio_scraper', 'scrape')  -- scraper sources only
  AND EXISTS (
    SELECT 1 FROM provider_pricing pp2
    WHERE pp2.provider_id = pp.provider_id
      AND pp2.procedure_type ILIKE '%dysport%'
      AND pp2.price_label = 'per_unit'
      AND ABS(pp2.price - pp.price) <= 0.50  -- within $0.50 of the Dysport price
      AND pp2.is_active = true
  );
-- Estimated rows affected: 40–55
```

### 6.2 CHECK Constraint Bounds for Botox per_unit

Based on the investigation:

| Floor Option | Rationale | Rows Excluded |
|-------------|-----------|--------------|
| **$5** (current) | No constraint | Admits all H4, H1, H2a artifacts |
| **$8** (recommended) | Excludes all confirmed H4 Dysport prices ($5–$7.50); preserves real H3 at $8+ | ~65 rows, all scraper/artifact |
| **$10** (conservative) | Full industry-standard floor; excludes all sub-$10 including real H3 at $8–$9 | ~124 rows |

**Recommendation: $8 floor with source-aware logic.**

The constraint cannot differentiate H3 from H4 by price alone at $8–$9. But:
- All confirmed H4 cases are at **$7.50 or below**
- Real H3 retail Botox at a Botox bar (Headlines Tox Bar) starts at **$8.50 for Jeuveau / $9.50 for Botox**
- Community-confirmed sub-$8 rows are almost all bulk_package deals (flagged in `is_deal`)

**Proposed CHECK constraint:**
```sql
-- Option A: Hard floor of $8 (excludes entire confirmed H4 cluster)
ALTER TABLE provider_pricing
ADD CONSTRAINT chk_botox_unit_price_floor
CHECK (
  NOT (
    procedure_type ILIKE '%botox%'
    AND price_label = 'per_unit'
    AND price < 8
    AND source IN ('cheerio_scraper', 'scrape', 'csv_import')
  )
);

-- Option B: Floor $6 with is_deal gate (preserves real bulk pricing)
ALTER TABLE provider_pricing
ADD CONSTRAINT chk_botox_unit_price_floor
CHECK (
  NOT (
    procedure_type ILIKE '%botox%'
    AND price_label = 'per_unit'
    AND price < 6
    AND is_deal = false
    AND source NOT IN ('provider_listed', 'community_submitted')
  )
);
```

**Recommendation: Option A ($8 floor for scraper sources).** The bulk/community H3 rows at $7–$7.99 should enter via `community_submitted` or `provider_listed` only, with `is_deal = true`. No legitimate $5–$7 Botox price should come from a scraper without the deal flag.

**Upper bound for Botox per_unit:** The existing `PRICE_CEILINGS['Neurotoxin'] = 5000` is already patched via migration 083 (those rows were re-labeled to flat_package). A practical upper constraint of **$50/unit** for `price_label = 'per_unit'` would catch future per-session misattributions. This is the same threshold used in migration 083's plausibility guard.

### 6.3 Scraper Patches

#### Patch 1 — Per-Brand Price Extraction (addresses H4)

The root fix: instead of one price per PROC_RE procedure match, extract a `{brand → price}` mapping from multi-brand menus.

**In `extract_units.py`**, after finding a price in `ctx`, check whether the price is adjacent to a competing brand name:

```python
# In the price extraction loop (after check_label_plausibility):
# H4 guard: if a non-Botox neurotoxin brand name appears closer to this
# price than the matched Botox/Neurotoxin term does, skip this price.
# Prevents $5 Dysport prices from being recorded as Botox.
COMPETING_BRANDS_RE = re.compile(
    r'\b(dysport|xeomin|jeuveau|daxxify|letybo)\b', re.I
)

def nearest_brand_to_price(ctx, price_match_start, proc_match_start):
    """
    Returns the distance to the matched procedure keyword vs. the closest
    competing brand name. If a competing brand is closer to the price than
    the matched keyword, the price likely belongs to the competing brand.
    """
    competing_matches = [
        m for m in COMPETING_BRANDS_RE.finditer(ctx)
        if m.start() != proc_match_start  # exclude the original match itself
    ]
    if not competing_matches:
        return False  # no competition — price belongs to matched brand
    dist_to_proc = abs(price_match_start - proc_match_start)
    min_dist_to_competitor = min(
        abs(price_match_start - m.start()) for m in competing_matches
    )
    return min_dist_to_competitor < dist_to_proc  # True = price belongs to competitor
```

Wire into the extraction loop: if `nearest_brand_to_price()` returns True, skip the price for the matched brand.

#### Patch 2 — Promo-Language Detection (addresses H1)

Add a `is_promo` flag to the scraper output, and suppress rows where promo signals appear near the price.

```python
PROMO_RE = re.compile(
    r'\b(new\s+client|first\s+visit|intro(?:ductory)?|minimum\s+\d+\s+units?|'
    r'\d+\s+unit\s+min(?:imum)?|easter|holiday|spring|summer|'
    r'month\s+only|limited\s+time|while\s+supplies|expires?)\b',
    re.I
)

def has_promo_signal(ctx):
    return bool(PROMO_RE.search(ctx))
```

If `has_promo_signal(ctx)` is True, set `is_starting = True` on the extracted record (it already suppresses the "best price" designation) and optionally set `is_deal = True` with `deal_type = 'promotion'`.

#### Patch 3 — Wrong-Page-Type URL Blocklist (addresses H2a)

Add patterns to `extract_units.py`'s filtering:

```python
WRONG_PAGE_PATH_RE = re.compile(
    r'/(?:weight[-_]?loss|weight[-_]management|wholesale|provider[-_]?portal|'
    r'staff[-_]?only|b2b|for[-_]?providers?|practitioner)',
    re.I
)

def is_wrong_page_type(url):
    if not url:
        return False
    return bool(WRONG_PAGE_PATH_RE.search(url))
```

Apply in the domain loop: `if is_wrong_page_type(source_url): continue`.

For `import-validated-prices.js`, add the same check around line 260:

```javascript
const WRONG_PAGE_RE = /\/(weight[-_]?loss|wholesale|provider[-_]?portal|staff[-_]?only|b2b)\b/i;

if (WRONG_PAGE_RE.test(row.page_url || '')) {
  skipped.wrongPage = (skipped.wrongPage || 0) + 1;
  continue;
}
```

#### Patch 4 — Taxonomy Floor for Botox (complements CHECK constraint)

In `extract_units.py`, strengthen `PRICE_FLOORS` and add a per-label floor override for Botox per_unit:

```python
# Add to PRICE_FLOORS (currently Neurotoxin floor = $5):
PRICE_LABEL_FLOORS = {
    ('Neurotoxin', 'per_unit'): 8,      # scraper-side companion to CHECK constraint
    ('Neurotoxin', 'per_session'): 50,  # already enforced by plausibility guard
}

# In the extraction loop, after check_label_plausibility():
label_floor = PRICE_LABEL_FLOORS.get((cat, final_unit), floor)
if price < label_floor:
    continue  # silently skip; this price range is untrustworthy for this label
```

In `import-validated-prices.js`, update `fixNeurotoxinLabel`:

```javascript
// Lower the per_unit ceiling threshold in the JS script to match:
const NEUROTOXIN_PER_UNIT_MIN = 8;  // Add this companion constant

// In the per-row validation, after price parsing:
if (isNeurotoxin && price_label === 'per_unit' && price < NEUROTOXIN_PER_UNIT_MIN
    && !['provider_listed', 'community_submitted'].includes(row.source)) {
  skipped.belowFloor = (skipped.belowFloor || 0) + 1;
  continue;
}
```

---

## Summary

| Hypothesis | Rows | Disposition |
|------------|------|-------------|
| **H4** Dysport price misattributed to Botox | **40–55** | Suppress scraper rows; fix per-brand extraction |
| **H1** Promo / membership / new-client pricing | **25–35** | Suppress scraper rows; preserve `is_deal=true` community rows |
| **H3** Real aggressive retail pricing | **20–30** | Keep; tag dermani membership rows with `is_deal=true` |
| **H2a** Wrong page type | **3–5** | Delete; add URL path blocklist to scraper |
| **H2b** Per-vial conversion | **0–1** | Non-issue; ruled out |
| Domain mismatch / stale data | **5–8** | Suppress; these rows have wrong-city attribution |

**Overall verdict:** The sub-$10 Botox cluster is *mostly artifact*. H4 (Dysport misattribution) is the single largest cause, concentrated at $5–$7. H1 (promo/membership) explains the $7–$9.99 cluster with multiple confirmed cases. A real H3 population of approximately 20–30 rows exists at $8–$9, primarily from community_submitted sources and one confirmed retail Botox bar (Headlines Tox Bar, Phoenix AZ). 

**Recommended CHECK floor: $8 for scraper sources.** Real sub-$8 retail Botox exists in the market (bulk packages, aggressive discount bars) but should only enter via `provider_listed` or `community_submitted` with `is_deal = true`, not via automated scrapers.

**Priority scraper patch: Patch 1 (per-brand price extraction).** This addresses H4 at the root cause. The plausibility guard added in migration 083 / `check_label_plausibility()` catches post-$100 errors; a $8 floor in `PRICE_LABEL_FLOORS` catches the Dysport-range false positives.

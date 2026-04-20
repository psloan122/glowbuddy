# Data Quality Decisions

This document records the rationale behind key data quality choices in GlowBuddy's
pricing pipeline. Consult it when changing aggregation logic, adding new procedure
categories, or onboarding a new data source.

## §1 — Price label taxonomy

Five price labels are used:

- `per_unit` — a single injectable unit (Botox, Dysport, etc.)
- `per_session` — a full treatment session (e.g., laser, HydraFacial)
- `flat_package` — a bundled price for a defined scope of work
- `per_area` — a fixed price per anatomical zone (e.g., forehead, glabellar)
- `per_vial` — wholesale or clinic-facing vial pricing

**Why `per_vial` is excluded from `avg_unit_price`:**
Vial pricing is wholesale/clinic-facing, not retail. A "$400 vial" is not
comparable to a "$15/unit" retail price — mixing them would inflate the avg by
5–10×. `per_vial` has its own column (`avg_vial_price`) and is excluded from
`is_reliable` gating (it's a data integrity check, not a consumer-facing number).

**Why `per_area` has its own column:**
Area pricing isn't directly comparable across anatomical zones (a lip flip area
≠ a full-forehead area). `avg_area_price` is computed but treated as a rough
signal rather than a user-facing benchmark.

## §2 — Dysport BEU suppression

Dysport is dosed in Botox Equivalent Units (BEU) at some practices and in native
Dysport units at others. A "5 unit" price from a BEU practice is not comparable
to a "5 unit" price from a native-unit practice. Migration 081 suppresses
Dysport rows below $3/unit as likely BEU-mislabeled. These rows are not deleted
— they are soft-suppressed with `quality_flag = 'dysport_beu_suppressed'`.

## §3 — Neurotoxin cross-drug aggregation

**Decision: per-brand aggregation only (no cross-drug averages).**

Each brand pill (Botox, Dysport, Xeomin, Jeuveau, Daxxify) has its own
`fuzzyToken` and RPC call. City averages are always computed for a single brand.
A cross-brand "neurotoxin" average is mathematically meaningless because:

- 1 Botox unit ≠ 1 Dysport unit (Dysport is ~2.5× more dilute)
- Jeuveau/Xeomin are priced 10–25% below Botox as competitive positioning
- Mixing brands produces a misleading "average" driven by sample composition

Implementation: `filterFuzzyToken` in `FindPrices.jsx` always resolves to a
single brand token before the RPC call. There is no code path that sends a
cross-brand token to `get_provider_price_summary`. See the comment at the
`filterFuzzyToken` declaration for the precise derivation.

**Post-launch option:** A "compare neurotoxins" view showing side-by-side
per-brand city averages (not a blended average) would be valuable but is
deferred to v2.

## §4 — N ≥ 5 threshold for averages

`avg_unit_price` and `trimmed_mean_unit_price` are set to NULL when `n_unit < 5`.
`median_unit_price` is always populated (median is robust even at N=1, and showing
a single data point as a median is honest — it *is* the median).

**Why 5:** At N=1–4, a single outlier can shift the average by 50%+. N=5 is the
minimum for the 10%–90% trimmed mean to exclude at least one value from each
tail. Cities below this threshold show "Not enough data yet" in the UI with a
tooltip explaining the policy.

**`is_reliable`** is a GENERATED column (`COALESCE(n_unit, 0) >= 5`) —
it's the canonical downstream check. Consumers should prefer `is_reliable`
over re-computing the threshold locally.

**Two-gate pattern in `PriceContextBar.jsx`:**
1. `hasRpcStats`: city has any pricing data (N ≥ 1) — show range
2. `isReliable`: city has enough for a stable average (N ≥ 5) — show avg

When only gate 1 passes, the range is still shown with "Not enough data yet"
in place of the average. When neither passes, the stats strip is hidden entirely.

## §5 — get_provider_price_summary shared CTE

The `filtered` CTE in `get_provider_price_summary` (migration 091) is the
single source of truth for which rows feed both the per-provider results
(map pins) and the city-level aggregates (header avg). Prior to migration 091,
the function duplicated the WHERE clause in two separate plpgsql query blocks.
Any change to one block without the other caused the header avg and map pins to
silently diverge — this was identified as a /browse bug in April 2026.

**Rule:** Do not add a second filter predicate inside this function. All
changes to the row selection criteria belong in the `filtered` CTE only.

## §6 — H4 Dysport-as-Botox suppression

Investigation (docs/botox-low-price-investigation.md §4) confirmed that the
scraper's PROC_RE regex matches "Botox" and then captures adjacent Dysport prices
from multi-brand pricing menus. Fingerprint: same provider has a Dysport per_unit
row at the same price ±$0.50. Migration 086 suppresses these rows with
`quality_flag = 'h4_suppressed'`.

**Why per-brand CHECK constraints instead of a hard floor:**
A hard `price > $8` constraint on Botox would also block legitimate Dysport rows
(which can be $3–$7/unit). The constraint must be brand-conditional. Migration 084
implements a BEFORE trigger that enforces brand-specific bounds and quarantines
violating rows into `provider_pricing_quarantine`.

## §7 — Suppression vs. deletion vs. relabeling

- **Relabeling** (migration 083): used when the procedure_type is correct but the
  price_label is wrong (e.g., a $500 flat_package row labeled per_unit). The row
  is valid data — just miscategorized.
- **Suppression** (`display_suppressed = true`): used when the row may have valid
  signal but cannot be shown as-is (promo pricing, domain mismatch, dedup extras).
  Suppressed rows are auditable and recoverable.
- **Deletion**: used only when the row has zero valid signal — wrong page type,
  fabricated by scraper misparse (H2a cases). Not recoverable.

## §8 — Scraper deduplication (migration 089)

The April 12 2026 scrape run inserted 7–10 copies of each row within milliseconds
due to concurrent threads without dedup. Migration 089 soft-deletes excess copies
and adds a partial unique index on `(provider_id, procedure_type, price,
price_label, source_url)` WHERE `source IN ('cheerio_scraper', 'scrape') AND
is_active = true`. Community-submitted rows are NOT covered by this index —
multiple patient reports for the same price are legitimate.

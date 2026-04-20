# Data Quality Runbook

Ongoing operations guide for GlowBuddy pricing data health.

## Monitoring

The `data_quality_dashboard` view (migration 092) surfaces key metrics.
Query it directly or via the `/admin/data-quality` route (auth required).

```sql
SELECT * FROM data_quality_dashboard;
```

Alert thresholds:

| Metric | Alert when |
|--------|------------|
| `rejects_last_7d` | > 2× trailing 4-week average (scraper regression) |
| `pending_review_rows` | > 100 (review queue backlog) |
| `new_duplicate_groups_7d` | > 0 (dedup constraint broken post-migration 089) |
| `reliable_cities` | < 30 before marketing launch push |

---

## When `rejects_last_7d` spikes

1. Check `provider_pricing_quarantine` for the violating rows:
   ```sql
   SELECT quarantine_reason, source, COUNT(*), MIN(price), MAX(price)
   FROM provider_pricing_quarantine
   WHERE quarantined_at > NOW() - INTERVAL '7 days'
   GROUP BY 1, 2 ORDER BY COUNT(*) DESC;
   ```
2. If `source = 'cheerio_scraper'`: check recent scrape runs for a new page
   pattern hitting wrong-page URLs. Apply a Patch 3 path exclusion to
   `extract_units.py` and re-scrape.
3. If `source = 'csv_import'`: check the import file for a unit mismatch
   (e.g., per_session prices loaded into per_unit column). Fix in the CSV
   and re-run `import-validated-prices.js`.
4. If prices are legitimately in range but still quarantined: the bounds in
   migration 084's trigger may need widening. See "Revising plausibility
   bounds" below.

---

## Reviewing `pending_review_rows`

These are rows with a `quality_flag` that are still active (not suppressed).

```sql
SELECT quality_flag, COUNT(*), MIN(price), MAX(price), MIN(source_url)
FROM provider_pricing
WHERE quality_flag IS NOT NULL
  AND display_suppressed = false
GROUP BY quality_flag
ORDER BY COUNT(*) DESC;
```

Flags and their resolution:

| Flag | Action |
|------|--------|
| `needs_review_h1_candidate` | Fetch the source URL; if promo page, suppress. If live retail, clear flag. |
| `h4_candidate_no_higher_botox_manual_review` | Check whether provider has any Botox row > $10. If not found, likely H1 — suppress. |
| `domain_mismatch` | Already suppressed. No action unless re-attributing to correct provider. |

To clear a flag after review:
```sql
UPDATE provider_pricing
SET quality_flag    = NULL,
    relabel_history = COALESCE(relabel_history, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'action',    'flag_cleared',
        'reason',    'manual_review_confirmed_valid',
        'timestamp', now()
      )
    )
WHERE id = '<row_id>';
```

---

## When `new_duplicate_groups_7d` > 0

Migration 089 added a partial unique index that should prevent this. If it
triggers, the scraper found a way around the constraint (e.g., writing
`is_active = false` first then updating to `true`).

1. Identify the new dupes:
   ```sql
   SELECT provider_id, procedure_type, price, price_label, source_url,
          COUNT(*) AS copies
   FROM provider_pricing
   WHERE created_at > NOW() - INTERVAL '7 days'
     AND source IN ('cheerio_scraper', 'scrape')
     AND is_active = true
   GROUP BY 1, 2, 3, 4, 5
   HAVING COUNT(*) > 1;
   ```
2. Check whether the scraper is performing an UPDATE that temporarily disables
   the `is_active` flag before re-enabling it (this bypasses the partial index).
3. Fix at the scraper level; do NOT drop the unique index as a workaround.

---

## Revising plausibility bounds (migration 084 trigger)

Bounds may need updating when:
- A new drug is approved (e.g., MT-10109, if cleared by FDA)
- Market rates shift significantly (e.g., post-shortage price resets)
- A price tier is identified as legitimate that the current bounds reject

Steps:
1. Query `provider_pricing_quarantine` to understand the violating distribution.
2. Cross-check against public pricing pages (at least 3 independent sources).
3. Update `fn_check_neurotoxin_plausibility()` in a **new migration** with the
   revised bounds and a comment explaining the change.
4. Backfill: after the migration, fire the trigger for all currently-suppressed
   plausibility violations. The trigger fires on UPDATE of monitored columns
   (`price`, `price_label`, `brand`, `procedure_type`, `source`); re-trigger
   it with a no-op update on a monitored column:

   ```sql
   -- Re-fires the plausibility BEFORE UPDATE trigger on all suppressed rows,
   -- allowing rows that now fall within the new bounds to be un-quarantined.
   -- Uses SET price = price (no-op value) because the trigger is defined on
   -- UPDATE OF price — updated_at is NOT in the trigger's column list.
   UPDATE provider_pricing
   SET price = price
   WHERE display_suppressed = true
     AND suppression_reason = 'plausibility_violation';
   ```

---

## Adding a new procedure category to the plausibility trigger

In the function created by migration 084 (`fn_check_neurotoxin_plausibility`):
1. Add the new category's `procedure_type` pattern to the function's filter
   predicate, or create a new parallel check block for the category.
2. Define `per_unit` bounds based on publicly available wholesale + retail ranges.
3. Add a pre-flight violator count comment (query the current DB before deploying).
4. Deploy in a **new migration** (do not edit 084 in place — migrations are immutable).

---

## City benchmark refresh

`refresh_city_benchmarks()` is called automatically at the end of migrations 086
and 088. After any bulk data change (new scrape run, import, manual correction),
call it manually:

```sql
SELECT refresh_city_benchmarks();
```

The function truncates and rebuilds the entire table. It returns the row count.
Typical runtime: 2–5 seconds on the current dataset size.

---

## Pre-launch checklist

Before the marketing launch push, confirm all of the following:

- [ ] `reliable_cities` (Botox per_unit) ≥ 30
- [ ] `new_duplicate_groups_7d` = 0 for at least two consecutive scrape runs
- [ ] `pending_review_rows` < 50
- [ ] NYC, LA, Miami smoke tests clean (no sub-$8 Botox pins from scraper)
- [ ] "Not enough data yet" renders correctly for a known low-N city
- [ ] `/admin/data-quality` route loads and shows current dashboard

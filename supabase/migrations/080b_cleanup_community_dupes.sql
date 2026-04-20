-- 080b: Cleanup ALL duplicate community_submitted rows
--
-- SCOPE: Much larger than the 3 originally identified cases.
--   298 total community_submitted rows exist.
--   77 duplicate groups (296 of 298 rows are in a duplicate group).
--   219 rows to DELETE. 77 rows kept (1 per group, earliest created_at).
--
-- ROOT CAUSE CONFIRMED: The batch script ran 5 times with no deduplication.
-- Each run re-inserted the entire dataset. Rows 2-5 are pure duplicates of run 1.
--
-- Run 1 — 2026-04-14 02:24:39 UTC  (18 rows)  ← earliest, all KEPT
-- Run 2 — 2026-04-15 01:05:02 UTC  (23 rows)
-- Run 3 — 2026-04-15 01:09:52 UTC  (17 rows)
-- Run 4 — 2026-04-15 01:11:01 UTC  (76 rows)
-- Run 5 — 2026-04-15 01:12:03 UTC  (66 rows)
--
-- ORDER OF OPERATIONS:
--   1. Run the SELECT preview below — confirm 219 DELETE rows + 77 KEEP rows
--   2. Uncomment and run the DELETE block
--   3. Run the verify query — confirm 0 duplicate groups remain
--   4. Apply migration 080_community_submitted_dedup.sql (creates the unique index)
--   5. Run SELECT * FROM refresh_city_benchmarks()
-- ════════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────
-- STEP 1 — SELECT preview (read-only, safe to run anytime)
--
-- Shows every affected row with action = KEEP or DELETE.
-- Expected: 77 KEEP rows + 219 DELETE rows = 296 total.
-- ────────────────────────────────────────────────────────────────
WITH ranked AS (
  SELECT
    pp.id,
    prov.name                                                   AS provider_name,
    prov.city,
    prov.state,
    pp.procedure_type,
    pp.price,
    pp.price_label,
    pp.created_at,
    ROW_NUMBER() OVER (
      PARTITION BY pp.provider_id, pp.procedure_type, pp.price, pp.price_label
      ORDER BY pp.created_at ASC
    )                                                           AS rn,
    COUNT(*) OVER (
      PARTITION BY pp.provider_id, pp.procedure_type, pp.price, pp.price_label
    )                                                           AS group_size
  FROM provider_pricing pp
  JOIN providers prov ON prov.id = pp.provider_id
  WHERE pp.source = 'community_submitted'
)
SELECT
  CASE WHEN rn = 1 THEN 'KEEP' ELSE 'DELETE' END               AS action,
  id,
  provider_name,
  city,
  state,
  procedure_type,
  price,
  price_label,
  created_at,
  rn                                                            AS row_in_group,
  group_size
FROM ranked
WHERE group_size > 1
ORDER BY provider_name, procedure_type, price, created_at;

-- Expected summary:
--   action='KEEP'   → 77 rows  (one per duplicate group, earliest created_at)
--   action='DELETE' → 219 rows
--   Total affected  → 296 rows


-- ────────────────────────────────────────────────────────────────
-- STEP 2 — DELETE  (STOP — do not run until you approve the preview)
-- ────────────────────────────────────────────────────────────────
/*  ← remove this block comment to execute after approval

DELETE FROM provider_pricing
WHERE id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY provider_id, procedure_type, price, price_label
        ORDER BY created_at ASC
      ) AS rn
    FROM provider_pricing
    WHERE source = 'community_submitted'
  ) ranked
  WHERE rn > 1
);
-- Expected: DELETE 219

*/


-- ────────────────────────────────────────────────────────────────
-- STEP 3 — Verify (run after step 2 completes)
-- ────────────────────────────────────────────────────────────────
/*

-- Should return 0 rows (no duplicate groups remaining)
SELECT
  provider_id,
  procedure_type,
  price,
  price_label,
  COUNT(*) AS n
FROM provider_pricing
WHERE source = 'community_submitted'
GROUP BY provider_id, procedure_type, price, price_label
HAVING COUNT(*) > 1;

-- Should return 77 rows (one per original group)
SELECT COUNT(*) FROM provider_pricing WHERE source = 'community_submitted';

*/

-- 064_demand_intelligence.sql — Demand Intel RPCs
--
-- Two SECURITY DEFINER functions used by the Demand Intel dashboard tab.
-- Both gate access to `auth.uid() = providers.owner_user_id` and return
-- only aggregate counts. No user_id, no PII, no row-level alert detail.
--
--   get_provider_demand_intel(p_provider_id)
--     Per procedure on the provider's menu, returns how many active
--     price_alerts in the same city/state would match, the average
--     threshold, the provider's current displayed price, and three
--     "reachability" buckets (already-reachable, +10% discount,
--     +20% discount).
--
--   get_city_demand_heatmap(p_provider_id)
--     Top 10 procedures by active alert count in the provider's city.
--     Always-on carrot for the dashboard — shown to free-tier providers
--     too, as the visible motivator behind the upgrade prompt.
--
-- Convention follows 023_twilio_call_tracking.sql / 039_security_audit_fixes.sql:
-- p_ prefix on params, v_ prefix on locals.

-- ── get_provider_demand_intel ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_provider_demand_intel(
  p_provider_id uuid
)
RETURNS TABLE (
  procedure_type        text,
  alert_count           integer,
  avg_threshold         numeric,
  min_threshold         numeric,
  max_threshold         numeric,
  current_price         numeric,
  current_price_label   text,
  already_reachable     integer,
  reachable_with_10pct  integer
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_city  text;
  v_state text;
BEGIN
  SELECT owner_user_id, city, state
    INTO v_owner, v_city, v_state
    FROM providers
   WHERE id = p_provider_id;

  IF v_owner IS NULL OR v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  WITH menu AS (
    -- Most recent visible price row per procedure on this provider's menu.
    SELECT DISTINCT ON (pp.procedure_type)
           pp.procedure_type,
           pp.price        AS current_price,
           pp.price_label  AS current_price_label
      FROM provider_pricing pp
     WHERE pp.provider_id = p_provider_id
       AND pp.display_suppressed = false
     ORDER BY pp.procedure_type, pp.created_at DESC
  ),
  alerts AS (
    -- Active price alerts in the provider's city/state, joined to the
    -- provider's menu by procedure_type. Anything not on the menu is
    -- ignored — we only surface demand the provider can actually serve.
    SELECT m.procedure_type,
           m.current_price,
           m.current_price_label,
           pa.max_price
      FROM menu m
      JOIN price_alerts pa
        ON pa.procedure_type = m.procedure_type
       AND pa.is_active = true
       AND pa.city  IS NOT DISTINCT FROM v_city
       AND pa.state IS NOT DISTINCT FROM v_state
  )
  SELECT
    m.procedure_type,
    COALESCE(COUNT(a.max_price), 0)::integer        AS alert_count,
    AVG(a.max_price)::numeric                       AS avg_threshold,
    MIN(a.max_price)::numeric                       AS min_threshold,
    MAX(a.max_price)::numeric                       AS max_threshold,
    m.current_price                                  AS current_price,
    m.current_price_label                            AS current_price_label,
    COALESCE(
      SUM(CASE WHEN a.max_price >= m.current_price THEN 1 ELSE 0 END),
      0
    )::integer                                       AS already_reachable,
    COALESCE(
      SUM(
        CASE
          WHEN a.max_price <  m.current_price
           AND a.max_price >= (m.current_price * 0.9)
          THEN 1 ELSE 0
        END
      ),
      0
    )::integer                                       AS reachable_with_10pct
  FROM menu m
  LEFT JOIN alerts a ON a.procedure_type = m.procedure_type
  GROUP BY m.procedure_type, m.current_price, m.current_price_label
  ORDER BY alert_count DESC, m.procedure_type;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_provider_demand_intel(uuid) TO authenticated;

-- ── get_city_demand_heatmap ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_city_demand_heatmap(
  p_provider_id uuid
)
RETURNS TABLE (
  procedure_type text,
  alert_count    integer
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_city  text;
  v_state text;
BEGIN
  SELECT owner_user_id, city, state
    INTO v_owner, v_city, v_state
    FROM providers
   WHERE id = p_provider_id;

  IF v_owner IS NULL OR v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    pa.procedure_type,
    COUNT(*)::integer AS alert_count
  FROM price_alerts pa
  WHERE pa.is_active = true
    AND pa.city  IS NOT DISTINCT FROM v_city
    AND pa.state IS NOT DISTINCT FROM v_state
  GROUP BY pa.procedure_type
  ORDER BY COUNT(*) DESC, pa.procedure_type
  LIMIT 10;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_city_demand_heatmap(uuid) TO authenticated;

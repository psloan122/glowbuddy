-- Migration 049: procedure_price_averages materialized view
-- Aggregates from existing procedures table for fast vs-average lookups.

create materialized view if not exists procedure_price_averages as
select
  procedure_type,
  city,
  state,
  round(avg(price_paid)::numeric, 2) as avg_price,
  percentile_cont(0.5) within group (order by price_paid) as median_price,
  min(price_paid) as min_price,
  max(price_paid) as max_price,
  count(*) as submission_count
from procedures
where status = 'active'
  and price_paid > 0
group by procedure_type, city, state
having count(*) >= 2;

-- Index for fast lookups
create unique index if not exists idx_ppa_type_city_state
  on procedure_price_averages (procedure_type, city, state);

create index if not exists idx_ppa_type
  on procedure_price_averages (procedure_type);

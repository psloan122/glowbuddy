-- Migration 047: user_procedure_tags table
-- Granular per-procedure interest tracking (more specific than profiles.interests).

create table if not exists user_procedure_tags (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  procedure_type text not null,
  source text not null default 'manual' check (source in ('onboarding', 'manual', 'implicit')),
  created_at timestamptz not null default now(),
  unique (user_id, procedure_type)
);

-- RLS: users manage own rows
alter table user_procedure_tags enable row level security;

create policy "user_procedure_tags_select_own"
  on user_procedure_tags for select
  using (auth.uid() = user_id);

create policy "user_procedure_tags_insert_own"
  on user_procedure_tags for insert
  with check (auth.uid() = user_id);

create policy "user_procedure_tags_update_own"
  on user_procedure_tags for update
  using (auth.uid() = user_id);

create policy "user_procedure_tags_delete_own"
  on user_procedure_tags for delete
  using (auth.uid() = user_id);

-- Index for fast lookup
create index if not exists idx_user_procedure_tags_user
  on user_procedure_tags (user_id);

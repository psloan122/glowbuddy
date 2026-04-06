-- Migration 046: user_preferences table
-- Deep personalization beyond what profiles stores.

create table if not exists user_preferences (
  id bigint generated always as identity primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  budget_min numeric,
  budget_max numeric,
  preferred_radius_miles int default 25,
  preferred_provider_types text[] default '{}',
  first_timer boolean default false,
  skin_concerns text[] default '{}',
  treatment_frequency text, -- 'never', 'first-time', 'occasional', 'regular', 'frequent'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: users manage own rows
alter table user_preferences enable row level security;

create policy "user_preferences_select_own"
  on user_preferences for select
  using (auth.uid() = user_id);

create policy "user_preferences_insert_own"
  on user_preferences for insert
  with check (auth.uid() = user_id);

create policy "user_preferences_update_own"
  on user_preferences for update
  using (auth.uid() = user_id);

create policy "user_preferences_delete_own"
  on user_preferences for delete
  using (auth.uid() = user_id);

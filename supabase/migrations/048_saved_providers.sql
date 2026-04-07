-- Migration 048: saved_providers table
-- Bookmarking distinct from provider_follows (follows = updates, saved = comparison list).

create table if not exists saved_providers (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_id uuid references providers(id) on delete set null,
  provider_slug text not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, provider_slug)
);

-- RLS: users manage own rows
alter table saved_providers enable row level security;

create policy "saved_providers_select_own"
  on saved_providers for select
  using (auth.uid() = user_id);

create policy "saved_providers_insert_own"
  on saved_providers for insert
  with check (auth.uid() = user_id);

create policy "saved_providers_update_own"
  on saved_providers for update
  using (auth.uid() = user_id);

create policy "saved_providers_delete_own"
  on saved_providers for delete
  using (auth.uid() = user_id);

-- Index for fast lookup
create index if not exists idx_saved_providers_user
  on saved_providers (user_id);

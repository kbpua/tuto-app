-- Tuto Phase 5 - User progression table (XP + streak core)
-- Run this after 001_init_schema.sql in Supabase SQL Editor.

create table if not exists public.user_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  total_xp integer not null default 0,
  streak integer not null default 0,
  last_studied_date date,
  updated_at timestamptz not null default now()
);

create index if not exists user_progress_updated_idx on public.user_progress (updated_at desc);

alter table public.user_progress enable row level security;

drop policy if exists user_progress_select_own on public.user_progress;
create policy user_progress_select_own on public.user_progress
for select using (auth.uid() = user_id);

drop policy if exists user_progress_insert_own on public.user_progress;
create policy user_progress_insert_own on public.user_progress
for insert with check (auth.uid() = user_id);

drop policy if exists user_progress_update_own on public.user_progress;
create policy user_progress_update_own on public.user_progress
for update using (auth.uid() = user_id);

drop policy if exists user_progress_delete_own on public.user_progress;
create policy user_progress_delete_own on public.user_progress
for delete using (auth.uid() = user_id);

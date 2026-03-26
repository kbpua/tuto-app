-- Tuto Phase 5 - Initial cloud schema
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  folder text not null default 'General',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  last_studied timestamptz
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  deck_id uuid not null references public.decks (id) on delete cascade,
  front text not null,
  back text not null,
  interval integer not null default 1,
  repetitions integer not null default 0,
  ease_factor double precision not null default 2.5,
  due_date timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  deck_id uuid references public.decks (id) on delete set null,
  cards_reviewed integer not null default 0,
  accuracy numeric(5,2) not null default 0,
  duration_sec integer not null default 0,
  xp_earned integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  total_questions integer not null default 0,
  correct_answers integer not null default 0,
  duration_sec integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists decks_user_created_idx on public.decks (user_id, created_at desc);
create index if not exists cards_user_deck_idx on public.cards (user_id, deck_id);
create index if not exists cards_due_date_idx on public.cards (user_id, due_date);
create index if not exists study_sessions_user_created_idx on public.study_sessions (user_id, created_at desc);
create index if not exists quiz_attempts_user_created_idx on public.quiz_attempts (user_id, created_at desc);

alter table public.decks enable row level security;
alter table public.cards enable row level security;
alter table public.study_sessions enable row level security;
alter table public.quiz_attempts enable row level security;

drop policy if exists decks_select_own on public.decks;
create policy decks_select_own on public.decks for select using (auth.uid() = user_id);
drop policy if exists decks_insert_own on public.decks;
create policy decks_insert_own on public.decks for insert with check (auth.uid() = user_id);
drop policy if exists decks_update_own on public.decks;
create policy decks_update_own on public.decks for update using (auth.uid() = user_id);
drop policy if exists decks_delete_own on public.decks;
create policy decks_delete_own on public.decks for delete using (auth.uid() = user_id);

drop policy if exists cards_select_own on public.cards;
create policy cards_select_own on public.cards for select using (auth.uid() = user_id);
drop policy if exists cards_insert_own on public.cards;
create policy cards_insert_own on public.cards for insert with check (auth.uid() = user_id);
drop policy if exists cards_update_own on public.cards;
create policy cards_update_own on public.cards for update using (auth.uid() = user_id);
drop policy if exists cards_delete_own on public.cards;
create policy cards_delete_own on public.cards for delete using (auth.uid() = user_id);

drop policy if exists study_sessions_select_own on public.study_sessions;
create policy study_sessions_select_own on public.study_sessions for select using (auth.uid() = user_id);
drop policy if exists study_sessions_insert_own on public.study_sessions;
create policy study_sessions_insert_own on public.study_sessions for insert with check (auth.uid() = user_id);
drop policy if exists study_sessions_update_own on public.study_sessions;
create policy study_sessions_update_own on public.study_sessions for update using (auth.uid() = user_id);
drop policy if exists study_sessions_delete_own on public.study_sessions;
create policy study_sessions_delete_own on public.study_sessions for delete using (auth.uid() = user_id);

drop policy if exists quiz_attempts_select_own on public.quiz_attempts;
create policy quiz_attempts_select_own on public.quiz_attempts for select using (auth.uid() = user_id);
drop policy if exists quiz_attempts_insert_own on public.quiz_attempts;
create policy quiz_attempts_insert_own on public.quiz_attempts for insert with check (auth.uid() = user_id);
drop policy if exists quiz_attempts_update_own on public.quiz_attempts;
create policy quiz_attempts_update_own on public.quiz_attempts for update using (auth.uid() = user_id);
drop policy if exists quiz_attempts_delete_own on public.quiz_attempts;
create policy quiz_attempts_delete_own on public.quiz_attempts for delete using (auth.uid() = user_id);

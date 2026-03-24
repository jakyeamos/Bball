-- Migration: 0001_core_tables
-- Phase 02-02: Core schema for Court Vision persistence layer
--
-- Tables created:
--   users               — identity row per Supabase auth user (anon or email)
--   lesson_progress     — per-lesson completion/accuracy tracking
--   daily_challenge_attempts — daily challenge responses and streaks
--   offseason_runs      — save state for multi-session offseason simulator runs
--   coach_profiles      — real NBA coach records used by offseason sim
--
-- Design decisions:
--   • user_id on all user-scoped tables references auth.users(id) directly so
--     RLS can use auth.uid() = user_id without a join.
--   • Unique constraints on high-cardinality lookup paths prevent duplicate rows
--     from client retries and serve as natural compound indexes.
--   • created_at / updated_at timestamps use NOW() defaults; updated_at is kept
--     current via a shared trigger defined below.
--   • All UUIDs use gen_random_uuid() (built-in to Postgres 13+ / Supabase).

-- ---------------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------------

-- pgcrypto for gen_random_uuid() on older Postgres versions; Supabase already
-- enables this, but listing it explicitly makes the migration self-contained.
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. Shared updated_at trigger function
-- ---------------------------------------------------------------------------

create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. users
-- ---------------------------------------------------------------------------
-- One row per Supabase auth user (anonymous or email-upgraded).
-- id mirrors auth.users.id so no join is required for ownership checks.

create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,                           -- null for anonymous users
  display_name text,
  is_anonymous boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.users is
  'One row per Supabase auth user. id mirrors auth.users.id for RLS.';

create trigger set_users_updated_at
  before update on public.users
  for each row execute function update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 3. lesson_progress
-- ---------------------------------------------------------------------------
-- Tracks per-user, per-lesson completion state and accuracy score.
-- Unique on (user_id, lesson_id) so upsert semantics are safe.

create table if not exists public.lesson_progress (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  lesson_id       text not null,               -- slug / static lesson identifier
  completed       boolean not null default false,
  accuracy_pct    smallint,                    -- 0-100; null until first attempt
  attempts        smallint not null default 0,
  last_attempted_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint lesson_progress_user_lesson_unique unique (user_id, lesson_id)
);

comment on table public.lesson_progress is
  'Per-user, per-lesson completion and accuracy. Upsert on (user_id, lesson_id).';

create index if not exists lesson_progress_user_id_idx
  on public.lesson_progress (user_id);

create trigger set_lesson_progress_updated_at
  before update on public.lesson_progress
  for each row execute function update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 4. daily_challenge_attempts
-- ---------------------------------------------------------------------------
-- One row per user per calendar date. Unique on (user_id, challenge_date).

create table if not exists public.daily_challenge_attempts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  challenge_date  date not null,               -- UTC date of the challenge
  challenge_id    text not null,               -- links to challenge config
  score           smallint,                    -- null until submitted
  max_score       smallint not null default 100,
  submitted       boolean not null default false,
  streak_day      int not null default 0,      -- current streak length at submission
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint daily_attempts_user_date_unique unique (user_id, challenge_date)
);

comment on table public.daily_challenge_attempts is
  'Per-user daily challenge response. Unique on (user_id, challenge_date).';

create index if not exists daily_attempts_user_id_idx
  on public.daily_challenge_attempts (user_id);

create index if not exists daily_attempts_challenge_date_idx
  on public.daily_challenge_attempts (challenge_date);

create trigger set_daily_attempts_updated_at
  before update on public.daily_challenge_attempts
  for each row execute function update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 5. offseason_runs
-- ---------------------------------------------------------------------------
-- Save state for multi-session offseason simulator runs.
-- Unique on (user_id, run_id) so a client can safely re-save mid-run.

create table if not exists public.offseason_runs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  run_id      text not null,                   -- client-generated stable identifier
  team_id     text,                            -- NBA team slug selected by user
  season      text not null default '2025-26',
  phase       text not null default 'team_context',  -- current phase of the run
  state_json  jsonb not null default '{}',     -- serialised run state blob
  completed   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint offseason_runs_user_run_unique unique (user_id, run_id)
);

comment on table public.offseason_runs is
  'Serialised offseason sim run state. Unique on (user_id, run_id) for safe re-save.';

create index if not exists offseason_runs_user_id_idx
  on public.offseason_runs (user_id);

create trigger set_offseason_runs_updated_at
  before update on public.offseason_runs
  for each row execute function update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 6. coach_profiles
-- ---------------------------------------------------------------------------
-- Static reference table for real NBA coaches. Not user-scoped; read-only for
-- authenticated clients. Populated via seed script, not by user writes.

create table if not exists public.coach_profiles (
  id          uuid primary key default gen_random_uuid(),
  coach_id    text not null unique,            -- stable slug (e.g. "gregg-popovich")
  name        text not null,
  team_id     text,                            -- current team or null if available
  seasons_hc  smallint not null default 0,     -- seasons as head coach
  style       text,                            -- "defensive", "pace-and-space", etc.
  tendencies  jsonb not null default '{}',     -- structured coaching tendency blob
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.coach_profiles is
  'Real NBA coach reference data. Populated by seed; read-only for client users.';

create index if not exists coach_profiles_team_id_idx
  on public.coach_profiles (team_id);

create trigger set_coach_profiles_updated_at
  before update on public.coach_profiles
  for each row execute function update_updated_at_column();

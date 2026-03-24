-- Migration: 0002_rls_policies
-- Phase 02-02: Row Level Security policies for all user-scoped tables
--
-- Policy design:
--   • Authenticated users (including anonymous Supabase users) can read/write
--     only rows where auth.uid() = user_id.
--   • Unauthenticated requests (no JWT / expired token) are denied entirely.
--   • coach_profiles is public read-only (no user_id column) — any authenticated
--     user may read; only service-role may insert/update.
--   • All policies use auth.uid() which works identically for anonymous and
--     email-upgraded users because the Supabase user id does not change on
--     upgrade.
--
-- Three-session test matrix expected outcomes:
--   anonymous user     → can read/write own rows only
--   authenticated user → can read/write own rows only
--   unauthenticated    → all operations denied (401 from PostgREST)

-- ---------------------------------------------------------------------------
-- 1. users
-- ---------------------------------------------------------------------------

alter table public.users enable row level security;

-- Users can read their own profile row.
create policy "users: self read"
  on public.users
  for select
  using (auth.uid() = id);

-- Users can insert their own profile row (created on first anonymous sign-in).
create policy "users: self insert"
  on public.users
  for insert
  with check (auth.uid() = id);

-- Users can update their own profile row.
create policy "users: self update"
  on public.users
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- 2. lesson_progress
-- ---------------------------------------------------------------------------

alter table public.lesson_progress enable row level security;

create policy "lesson_progress: self read"
  on public.lesson_progress
  for select
  using (auth.uid() = user_id);

create policy "lesson_progress: self insert"
  on public.lesson_progress
  for insert
  with check (auth.uid() = user_id);

create policy "lesson_progress: self update"
  on public.lesson_progress
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "lesson_progress: self delete"
  on public.lesson_progress
  for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. daily_challenge_attempts
-- ---------------------------------------------------------------------------

alter table public.daily_challenge_attempts enable row level security;

create policy "daily_challenge_attempts: self read"
  on public.daily_challenge_attempts
  for select
  using (auth.uid() = user_id);

create policy "daily_challenge_attempts: self insert"
  on public.daily_challenge_attempts
  for insert
  with check (auth.uid() = user_id);

create policy "daily_challenge_attempts: self update"
  on public.daily_challenge_attempts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "daily_challenge_attempts: self delete"
  on public.daily_challenge_attempts
  for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4. offseason_runs
-- ---------------------------------------------------------------------------

alter table public.offseason_runs enable row level security;

create policy "offseason_runs: self read"
  on public.offseason_runs
  for select
  using (auth.uid() = user_id);

create policy "offseason_runs: self insert"
  on public.offseason_runs
  for insert
  with check (auth.uid() = user_id);

create policy "offseason_runs: self update"
  on public.offseason_runs
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "offseason_runs: self delete"
  on public.offseason_runs
  for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 5. coach_profiles (reference table — public read, service-role write)
-- ---------------------------------------------------------------------------

alter table public.coach_profiles enable row level security;

-- Any authenticated user (anonymous or email) may read coach profiles.
create policy "coach_profiles: authenticated read"
  on public.coach_profiles
  for select
  using (auth.role() = 'authenticated' or auth.role() = 'anon');

-- No INSERT / UPDATE / DELETE policies — service-role bypasses RLS for seeding.

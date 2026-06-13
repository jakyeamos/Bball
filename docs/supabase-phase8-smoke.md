# Phase 8 Supabase Smoke Test

This workflow turns the Phase 8 account-upgrade rollout blocker into a repeatable live smoke test against a real Supabase project.

It verifies:

- Anonymous Supabase sign-in returns a durable user id.
- The Phase 8 proof rows exist before upgrade in `lesson_progress`, `daily_challenge_attempts`, and `offseason_runs`.
- `/internal/rls-probe` passes unauthenticated, self-access, and cross-user isolation checks.
- `/internal/account-upgrade` converts the anonymous user to email/password without changing `auth.users.id`.
- A fresh second session can sign in with the upgraded email/password and read the same rows through RLS.

## Supabase Setup

Use a non-production Supabase project unless the rollout explicitly requires production verification.

1. Apply the migrations in order:

   - `server/supabase/migrations/0001_core_tables.sql`
   - `server/supabase/migrations/0002_rls_policies.sql`

2. Enable anonymous sign-ins in Supabase Auth.

3. For this smoke run, disable email confirmation for email/password sign-ups. The script signs in immediately after the upgrade to simulate a second device.

4. Set server environment variables:

   ```sh
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_ANON_KEY=<anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   CV_SMOKE_SERVER_URL=http://localhost:3001
   ```

   Optional:

   ```sh
   CV_SUPABASE_SMOKE_KEEP_USER=1
   ```

   Use `CV_SUPABASE_SMOKE_KEEP_USER=1` when you want to inspect the smoke user and rows after the run. By default, a passing run deletes the generated auth user, which cascades the proof rows.

## Run

Start the server locally with the same Supabase env. The RLS probe route is mounted only outside `NODE_ENV=production`.

```sh
pnpm --filter nba-draft-sim-server dev
```

In another terminal:

```sh
pnpm --filter nba-draft-sim-server smoke:supabase:phase8
```

## Pass Criteria

The script exits `0` and prints:

```text
PASS Phase 8 Supabase smoke: anonymous upgrade continuity and second-device sync verified.
```

The output must also show:

- anonymous sign-in passed with a Supabase UUID
- RLS probe passed all scenarios
- account upgrade preserved the Supabase user id
- second-device sync passed for lesson progress, daily challenge history, and offseason run state

## Fail Criteria

Any non-zero exit is a rollout blocker.

Common failure causes:

- missing `SUPABASE_ANON_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
- server not running at `CV_SMOKE_SERVER_URL`
- migrations not applied
- anonymous sign-ins disabled
- email confirmation enabled, preventing immediate second-device sign-in
- RLS policy drift that hides self-owned rows or exposes cross-user rows
- `/internal/account-upgrade` returning different pre/post user ids

On failure, the script leaves the generated auth user in Supabase for inspection and prints its user id.

## Manual Evidence To Record

Paste the terminal output into the Phase 8 rollout notes and record:

- Supabase project/ref used
- date/time of the run
- commit SHA tested
- whether `CV_SUPABASE_SMOKE_KEEP_USER` was used
- final PASS/FAIL line

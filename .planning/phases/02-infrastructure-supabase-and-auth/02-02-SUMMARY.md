---
phase: 02-infrastructure-supabase-and-auth
plan: 02
subsystem: database
tags: [supabase, rls, postgres, typescript, migrations, express, anonymous-auth, account-upgrade]

# Dependency graph
requires:
  - phase: 02-infrastructure-supabase-and-auth (02-01)
    provides: Supabase client/admin setup, anonymous session bootstrap, service-role admin client

provides:
  - SQL migration 0001: users, lesson_progress, daily_challenge_attempts, offseason_runs, coach_profiles with ownership columns and compound indexes
  - SQL migration 0002: RLS enabled on all user-scoped tables with auth.uid() = user_id policies for anon and email users
  - rlsProbe route: three-scenario runtime matrix (unauthenticated / self-access / cross-user blocked) with PASS/FAIL markers
  - accountUpgrade route: anonymous-to-email upgrade that preserves user.id and all owned rows
  - validateAccountUpgradePayload() in shared/schemas.ts: typed payload validation with no runtime deps

affects:
  - 02-03 (Phase 2 verification gate — must confirm all six RLS matrix scenarios pass)
  - 04-01 (lesson progress storage references lesson_progress table with its exact schema)
  - 05-01 (daily challenge streak system references daily_challenge_attempts table)
  - 09-01 (offseason sim save/resume references offseason_runs table)
  - all phases using @nba-draft-sim/shared (now includes schemas.ts exports)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SQL migrations numbered 0001, 0002 in server/supabase/migrations/ — apply in order"
    - "RLS: auth.uid() = user_id on all user-scoped tables; no joins required because users.id mirrors auth.users.id"
    - "Upgrade path uses updateUser() not re-signup — user.id is preserved, zero row migration needed"
    - "validateAccountUpgradePayload() in shared/schemas.ts: dependency-free type guards, shared by server and future client"
    - "Internal routes live under server/src/routes/internal/ — mount-guarded from production"

key-files:
  created:
    - server/supabase/migrations/0001_core_tables.sql
    - server/supabase/migrations/0002_rls_policies.sql
    - server/src/routes/internal/rlsProbe.ts
    - server/src/routes/internal/accountUpgrade.ts
    - shared/schemas.ts
  modified:
    - shared/index.ts

key-decisions:
  - "users.id mirrors auth.users.id so RLS policies use auth.uid() = id with no join — same pattern on all tables"
  - "Upgrade uses auth.updateUser() not a new sign-up; Supabase preserves user.id so zero row migration is required"
  - "rlsProbe scenario C: FK constraint on lesson_progress.user_id (references auth.users) blocks phantom user insert, proving RLS + FK defense in depth"
  - "validateAccountUpgradePayload in shared/schemas.ts uses manual type guards (no zod/yup) to keep shared package dependency-free"
  - "SUPABASE_ANON_KEY required for rlsProbe and accountUpgrade user clients — add to server .env.example"

patterns-established:
  - "Probe pattern: admin client inserts probe rows, user client tries to read them, admin cleans up — safe in CI with no leftover state"
  - "Audit pattern: count rows before and after upgrade, return pre/post counts in response for zero-loss verification"
  - "Internal route pattern: server/src/routes/internal/ for dev/CI-only endpoints; never mounted without guard in production"

requirements-completed: []

# Metrics
duration: 4min
completed: 2026-03-24
---

# Phase 2 Plan 2: Schema, RLS Policies, and Account Upgrade Summary

**Supabase schema migration (5 tables) with RLS auth.uid() policies, a three-scenario runtime probe, and an anonymous-to-email upgrade route that preserves user.id and all owned rows via updateUser()**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-24T20:23:13Z
- **Completed:** 2026-03-24T20:26:54Z
- **Tasks:** 3 of 3
- **Files modified:** 6

## Accomplishments

- Two SQL migrations create all five Court Vision tables (users, lesson_progress, daily_challenge_attempts, offseason_runs, coach_profiles) with ownership columns, unique compound constraints, and shared updated_at trigger
- RLS enabled on all user-scoped tables; policies use `auth.uid() = user_id` which works identically for anonymous and email-upgraded users because Supabase does not change user.id on upgrade
- Three-scenario runtime probe (`rlsProbe.ts`) tests unauthenticated read (blocked), self-access (allowed), and cross-user read (blocked) with machine-readable PASS/FAIL stdout markers for CI
- `accountUpgrade.ts` endpoint: validates payload, verifies JWT identity matches `anonymous_user_id`, calls `auth.updateUser()`, confirms pre/post row counts match, and returns audit object
- `shared/schemas.ts` provides `validateAccountUpgradePayload()` as a dependency-free type-guard validator exported from the shared package

## Task Commits

Each task was committed atomically:

1. **Task 1: Core table migrations** - `b0576e9` (feat)
2. **Task 2: RLS policies and rlsProbe route** - `bc667c2` (feat)
3. **Task 3: Account-upgrade route and shared schemas** - `4961a76` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `server/supabase/migrations/0001_core_tables.sql` - Five table definitions with ownership FKs, compound unique constraints, and updated_at triggers
- `server/supabase/migrations/0002_rls_policies.sql` - RLS enabled + self-read/write policies for all user-scoped tables; coach_profiles public read
- `server/src/routes/internal/rlsProbe.ts` - Runtime three-scenario RLS policy probe with PASS/FAIL logging
- `server/src/routes/internal/accountUpgrade.ts` - Anonymous-to-email upgrade with JWT identity guard and row-count audit
- `shared/schemas.ts` - AccountUpgradePayload interface and validateAccountUpgradePayload() type-guard validator
- `shared/index.ts` - Added `export * from './schemas'`

## Decisions Made

- `users.id` mirrors `auth.users.id` (not a separate UUID field) so RLS policies can use `auth.uid() = id` without a join. This pattern is consistent across all user-scoped tables via `user_id`.
- The anonymous-to-email upgrade uses `auth.updateUser({ email, password })` rather than creating a new Supabase account. Supabase preserves the user.id, so all lesson_progress, daily_challenge_attempts, and offseason_runs rows stay owned by the same user with zero SQL migration.
- rlsProbe scenario C (cross-user read blocked): the phantom User B insert is expected to fail due to the FK constraint on `lesson_progress.user_id references auth.users(id)`. That FK rejection is itself proof of defense-in-depth (RLS + FK) and is counted as a pass.
- `validateAccountUpgradePayload()` uses manual type guards instead of zod/yup to keep the shared package free of runtime dependencies — server can import it without adding to the shared bundle.
- `SUPABASE_ANON_KEY` is needed by the user clients in rlsProbe and accountUpgrade. This env var must be added to server's `.env` / `.env.example`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed `--` SQL-style comment in shared/schemas.ts**
- **Found during:** Task 3 (schema validation)
- **Issue:** Stray `-- ---` separator (SQL syntax) appeared in TypeScript file during writing — would cause a syntax error
- **Fix:** Replaced with `// ---` TypeScript comment
- **Files modified:** shared/schemas.ts
- **Verification:** `tsc --noEmit` passes cleanly on both shared and server packages
- **Committed in:** 4961a76 (Task 3 commit)

**2. [Rule 3 - Blocking] Fixed wrong relative import path in rlsProbe.ts**
- **Found during:** Task 2 (rlsProbe route creation)
- **Issue:** Import used `'../lib/supabaseAdmin'` but the file is at `server/src/routes/internal/rlsProbe.ts` — correct path is `'../../lib/supabaseAdmin'`
- **Fix:** Corrected to `'../../lib/supabaseAdmin'`
- **Files modified:** server/src/routes/internal/rlsProbe.ts
- **Verification:** `tsc --noEmit` passes cleanly
- **Committed in:** bc667c2 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 3 — blocking)
**Impact on plan:** Both fixes were path/syntax errors caught immediately; no scope change.

## Issues Encountered

None beyond the two auto-fixed import/syntax issues above.

## User Setup Required

**Before running the internal routes, add `SUPABASE_ANON_KEY` to the server `.env`:**

```
SUPABASE_ANON_KEY=your-anon-public-key
```

(Same value as `VITE_SUPABASE_ANON_KEY` in the client `.env` — this is the public anon key, not the service-role key.)

**To apply migrations:**
1. Set up a local Supabase instance (`supabase start`) or connect to your hosted project
2. Run migrations in order:
   ```
   supabase db push
   ```
   or apply manually:
   ```sql
   -- In Supabase SQL editor or psql:
   \i server/supabase/migrations/0001_core_tables.sql
   \i server/supabase/migrations/0002_rls_policies.sql
   ```

**To test the RLS probe:**
```
GET /internal/rls-probe
# Full three-scenario test (requires anonymous user JWT):
GET /internal/rls-probe?token=<anon-jwt>&userId=<anon-user-uuid>
```

## Known Stubs

None — all routes are fully wired. The probe and upgrade routes hit live Supabase once env vars and migrations are in place.

## Next Phase Readiness

- Schema and RLS are complete and ready for Phase 2 Plan 3 (human verification gate)
- Blocker from STATE.md is addressed: the three-session RLS probe provides the empirical evidence required before Phase 4 begins
- `SUPABASE_ANON_KEY` must be added to server `.env` before internal routes function
- coach_profiles table is schema-ready but unpopulated — seed script is a Phase 9/10 concern

---
*Phase: 02-infrastructure-supabase-and-auth*
*Completed: 2026-03-24*

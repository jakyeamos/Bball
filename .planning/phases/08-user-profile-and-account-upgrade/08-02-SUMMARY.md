---
phase: 08-user-profile-and-account-upgrade
plan: "02"
status: implemented-pending-manual-qa
completed: 2026-04-01
---

# Phase 08 Plan 02 Summary

## Accomplishments

- Added guest fallback auth mode so the app remains usable without Supabase configuration.
- Added login and account-upgrade pages with Supabase-aware gating.
- Added a defensive server-side availability check on the account-upgrade route.

## Key Files

- `client/src/pages/AccountUpgradePage.tsx`
- `client/src/pages/LoginPage.tsx`
- `client/src/context/AuthContext.tsx`
- `client/src/lib/supabaseClient.ts`
- `server/src/routes/internal/accountUpgrade.ts`
- `server/src/routes/internal/rlsProbe.ts`
- `server/scripts/smokeSupabaseAccountUpgrade.ts`
- `docs/supabase-phase8-smoke.md`

## Verification

- `npm run build --workspace=client`
- `npm run build --workspace=server`
- `pnpm --filter nba-draft-sim-server typecheck`

## Live Supabase Smoke Workflow

- Added `pnpm --filter nba-draft-sim-server smoke:supabase:phase8`.
- The smoke creates a real anonymous Supabase user, seeds proof rows in `lesson_progress`, `daily_challenge_attempts`, and `offseason_runs`, runs `/internal/rls-probe`, calls `/internal/account-upgrade`, signs in from a fresh second session, and asserts the same rows are visible through RLS.
- Exact operator setup and pass/fail criteria are documented in `docs/supabase-phase8-smoke.md`.

## Outstanding

- Rollout sign-off now requires running `pnpm --filter nba-draft-sim-server smoke:supabase:phase8` against the target Supabase project and recording the PASS output plus project/ref, timestamp, and commit SHA.

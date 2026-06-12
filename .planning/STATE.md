---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Phase 10 browser acceptance passed locally; front-office transaction preview now covers salary matching, apron restrictions, and Stepien/protection checks before execution
stopped_at: Expanded transaction legality preview and verified repo lint/type/test/build gates
last_updated: "2026-06-12T17:45:00.000-04:00"
progress:
  total_phases: 14
  completed_phases: 10
  total_plans: 33
  completed_plans: 33
  percent: 100
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` for product definition and `.planning/ROADMAP.md` for the execution-truth snapshot synced on 2026-04-22.

**Core value:** The platform only succeeds if users' basketball IQ genuinely improves - education comes before surface polish.
**Current focus:** Front-office offseason simulator rules-engine expansion after Phase 10

## Current Position

Phase: 10 (offseason-simulator-decision-loop) — BROWSER ACCEPTED LOCALLY (PRODUCT OWNER / LIVE SUPABASE SIGN-OFF REMAINS)
Plan: 4 of 4

Execution reality:

- Runtime hardening on 2026-04-30 fixed the shared package format regression that caused `exports is not defined`, restored built-server startup against canonical NBA seed artifacts, and cleaned local browser QA startup on alternate Vite ports.
- Solo draft lobby hardening on 2026-06-11 confirmed one-team lobbies start ready with assigned team IDs, normalized create/join display names, and Playwright smoke coverage through draft recap.
- Front-office rules-engine work on 2026-06-11 added the first transaction-graph legality preview path with directed shared graph types, server-owned validation, CBA citations, team deltas, suggested fixes, and `/api/front-office/transactions/preview`.
- Front-office rules-engine work on 2026-06-12 expanded that preview validator with over-cap salary matching, first/second-apron restrictions, hard-cap checks, Stepien rolling future-first coverage, and protected-pick conversion fallback validation.
- Implementation is landed through Phase 09.
- Phase 04 still has release-oriented follow-up: feature-flag, SEO, and browser/manual verification.
- Phase 08 still needs live Supabase verification for anonymous upgrade continuity and second-device sync.
- Phase 09 still needs browser-level human verification for GM discoverability and rollout-gate behavior.
- Phase 10 passed local browser acceptance on 2026-06-11; remaining sign-off is product-owner recap quality review and live Supabase persistence verification.
- Phase 03 has a separate player-model / calibration extension still in progress inside the repo.

## Snapshot

- 33 / 33 plans are implemented in the repo.
- 10 / 10 phases are implemented.
- 3 / 10 phases are historically closed with earlier human verification checkpoints.
- Remaining release scope is human/browser verification and staged rollout gates.

## Phase Status

| Phase | Plans | Status | Last Meaningful Update |
|-------|-------|--------|------------------------|
| 1. Foundation and Bug Fixes | 5/5 | Complete | 2026-03-10 |
| 2. Infrastructure - Supabase and Auth | 3/3 | Complete | 2026-03-24 |
| 3. Data Layer | 3/3 baseline | Complete baseline; calibration extension in progress | 2026-03-24 |
| 4. Lesson Components and CMS | 5/5 | Implemented pending manual rollout / SEO verification | 2026-04-01 |
| 5. Progress, Onboarding, and Content Discovery | 3/3 | Implemented | 2026-04-01 |
| 6. Daily Engagement | 3/3 | Implemented | 2026-04-01 |
| 7. Draft Simulator Teaching Layer | 2/2 | Implemented | 2026-04-01 |
| 8. User Profile and Account Upgrade | 2/2 | Implemented pending live Supabase verification | 2026-04-01 |
| 9. Offseason Simulator - Foundation | 3/3 | Implemented pending final human verification gate | 2026-04-22 |
| 10. Offseason Simulator - Decision Loop | 4/4 | Browser accepted locally; product-owner / live Supabase sign-off remains | 2026-06-11 |

## Accumulated Context

### Roadmap Evolution

- Phase 11 added: NBA Big Board Creator — private-first prospect evaluation platform with modular scoring, historical comps, film workflow, and auditable big board generation

### Decisions

- Phases 04-08 ship in a local-first / guest-first mode; missing Supabase admin env must degrade gracefully rather than block learning flows.
- Account upgrade continuity stays on the existing `/internal/account-upgrade` path; verification requires a real Supabase project and authenticated session.
- Draft teaching surfaces extend the existing simulator rather than fork it; DATA-06 still couples simulator outputs to the shared player-feature pipeline.
- Daily social scope remains status-only (done / not done), not a ranked score ladder.
- The phase summary files under `.planning/phases/04-*` through `.planning/phases/09-*` are now the source of truth for per-plan closeout notes and remaining release gates.

### Pending Todos

- Continue bug-hunting/product hardening from a now-booting baseline; client/server builds and server tests pass after the shared-package/runtime fixes.
- Execute browser/manual QA for lesson runtimes, admin flows, library/discussion surfaces, and daily challenge loops.
- Verify the feature-flag / SEO rollout checklist for public lesson and library surfaces.
- Run live Supabase upgrade continuity and second-device sync checks for Phase 08.
- Run Phase 09 human verification gate for GM entry discoverability, threshold recommendation, and disabled-flag behavior.
- Complete product-owner qualitative sign-off for Phase 10 recap quality and run live Supabase persistence verification when env is available.
- Decide whether to formally close Phases 04-09 after verification or keep the implementation/manual-QA split explicit.
- Expand the front-office transaction preview validator into sign-and-trade/base-year/minimum-salary special cases, generated/consumed trade exception accounting, swap-right conveyance validation, and rollback-safe execution before replacing the simplified offseason UI.

### Blockers/Concerns

- Human/browser QA has not been recorded for the newly implemented Phase 04-08 surfaces.
- Phase 09 still depends on a human discoverability/rollout verification checkpoint before formal close.
- Phase 10 local browser acceptance passed using `docs/offseason/verification-checklist.md`; live Supabase persistence and product-owner recap quality sign-off remain.
- Live account continuity cannot be fully guaranteed without Supabase env and a real auth session.
- Phase 03 calibration/model changes continue in parallel and can affect draft-teaching outputs if not tracked carefully.

## Session Continuity

Last session: 2026-04-23T13:18:00.000Z
Stopped at: Completed 10-04-PLAN.md (post-offseason recap + full-loop verification artifacts)
Resume file: .planning/phases/10-offseason-simulator-decision-loop/10-04-SUMMARY.md

## Planning Update (2026-04-23)

- Executed Phase 10 Plan 01 and added Coaching Market phase endpoints/UI with persisted coach hiring.
- Executed Phase 10 Plan 02 and added scouting-board uncertainty workflows plus trade fit explanation/persistence.
- Executed Phase 10 Plan 03 and added Draft Night grading plus Free Agency constraint-aware signing outcomes.
- Executed Phase 10 Plan 04 and added recap synthesis endpoints/UI plus final decision-loop rollout gating.
- Added recap regression coverage and authored `docs/offseason/verification-checklist.md` for manual acceptance sign-off.
- Updated phase tracking state to await final human acceptance gate.

## Runtime Hardening Update (2026-04-30)

- Fixed Vite client resolution so `@nba-draft-sim/shared` loads TypeScript source instead of the CommonJS `dist` bundle in the browser.
- Removed `import.meta` usage from the CommonJS-built shared feature flag module so Node server startup no longer misclassifies it as ESM.
- Fixed NBA data cache resolution so partial `dist/server/data` JSON output cannot shadow canonical `server/data/nba-seed.json`.
- Centralized API/WebSocket CORS origin checks and allowed loopback localhost/127.0.0.1 dev ports for browser QA.
- Hid the debug overlay by default; it remains available with `?debug`.
- Verified `npm run build --workspace=client`, `npm run build --workspace=server`, `npm run test --workspace=server`, and browser reload at `http://localhost:3002/` with no fresh console errors/warnings.

## Solo Draft Lobby Update (2026-06-11)

- Finished one-team lobby readiness flow: shared/team-count metadata now reflects 1-12 teams, one-team lobbies keep `canStart=true`, and lobby users receive `team_1` before draft creation.
- Normalized lobby display names consistently for create and join paths by trimming whitespace and falling back to `Team N` labels when needed.
- Updated Playwright smoke startup to use pnpm and the reachable `http://localhost:3000` Vite host, then refreshed stale smoke route assertions to current accessible page copy.
- Verified with `pnpm test`, package typechecks, focused lobby Vitest coverage, focused solo-draft Playwright coverage, and full `pnpm smoke`.

## Phase 10 Acceptance Update (2026-06-11)

- Executed the offseason simulator from Team Context through Complete in the browser using `docs/offseason/verification-checklist.md`.
- Verified reload/resume boundaries for Team Context, Coaching Market, Scouting, Trade Market, Draft Night, Free Agency, Recap, and completed recap readability.
- Fixed two acceptance failures: completed runs being reused from Team Context, and Free Agency signings being blocked by a simplified roster limit below current seeded roster sizes.
- Updated `docs/offseason/verification-checklist.md` with pass/fail evidence and remaining human sign-off scope.

## Front-Office Transaction Preview Update (2026-06-11)

- Extended `shared/src/offseason/frontOffice/schema.ts` with directed transaction graph movement types and preview/team-delta output contracts.
- Added `server/src/offseason/cba/validateTransactionGraph.ts`, which validates the supplied front-office dataset first and then fails closed on graph shape, references, trade-date eligibility, draft asset ownership/encumbrance, cash limits, exception availability, and post-trade standard roster limit.
- Added CBA citation ids for transaction graph shape, player trade eligibility, and trade cash limits.
- Mounted preview-only `POST /api/front-office/transactions/preview`; it returns validation output and does not execute or persist transaction state.
- Added focused shared/server tests and documented the slice in `docs/superpowers/plans/2026-06-11-front-office-transaction-preview.md`.
- Verified with `pnpm typecheck`, `pnpm test`, `pnpm --dir server lint`, and `pnpm build`; Vite still reports the known client chunk-size warning.

## Front-Office Transaction Legality Expansion (2026-06-12)

- Extended `validateTransactionGraph` with 2026 trade salary matching constants, over-cap incoming salary limits, first-apron no-added-salary checks, second-apron cash/aggregation restrictions, and first/second-apron hard-cap checks.
- Added Stepien validation for rolling two-year future first-round coverage and protected-pick conversion fallback ownership/tradeability checks before execution.
- Added focused Vitest coverage for salary matching, first-apron salary, second-apron cash, second-apron aggregation, Stepien, and protected-pick conversion failures.
- Verified with `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`; `pnpm audit:dead-code` still fails on the known broad Knip backlog.

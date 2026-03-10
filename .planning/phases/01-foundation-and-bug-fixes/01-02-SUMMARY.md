---
phase: 01-foundation-and-bug-fixes
plan: "02"
subsystem: api
tags: [websocket, socket.io, typescript, game-simulation]

# Dependency graph
requires: []
provides:
  - READY_FOR_QUARTER entry in WS_EVENTS const object in shared/types.ts
  - handleSubmitQuarterCoaching handler in handlers-v2.ts
  - handleReadyForQuarter handler in handlers-v2.ts
  - socket.on() registrations for SUBMIT_QUARTER_COACHING and READY_FOR_QUARTER in socketManager.ts
  - quarterReadyFlags module-level map for per-lobby ready tracking
affects: [quarter-by-quarter coaching flow, live game simulation, client QuarterCoachingPage]

# Tech tracking
tech-stack:
  added: [vitest, @vitest/runner]
  patterns: [module-level ready flags map for multi-party WebSocket coordination]

key-files:
  created:
    - server/vitest.config.ts
    - server/src/__tests__/simulation-correctness.test.ts
  modified:
    - shared/types.ts
    - server/managers/socketManager.ts
    - server/services/handlers-v2.ts
    - server/package.json

key-decisions:
  - "quarterReadyFlags stored at module level (not on LeagueState) — avoids schema churn for ephemeral per-quarter ready state"
  - "READY_FOR_QUARTER emits QUARTER_COACHING_WINDOW when both teams ready, not immediately on single team signal — ensures both coaches see the window simultaneously"
  - "handleSubmitQuarterCoaching clears decisions (coachingDecisionA/B set to undefined) after quarter sim so next quarter starts clean"

patterns-established:
  - "Pattern: use WS_EVENTS.* constants not raw strings for all socket.on() registrations"
  - "Pattern: handler try/catch with socket.emit(WS_EVENTS.ERROR, ...) on failure"
  - "Pattern: guard liveGame presence before processing quarter events, emit ERROR and return on missing state"

requirements-completed: [FOUND-04]

# Metrics
duration: 15min
completed: 2026-03-10
---

# Phase 01 Plan 02: Quarter Coaching WebSocket Events Summary

**Two missing WebSocket handlers wired: SUBMIT_QUARTER_COACHING and READY_FOR_QUARTER now route to real implementations, closing the quarter coaching flow that previously left clients hanging with no server response**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-10T13:40:00Z
- **Completed:** 2026-03-10T13:54:12Z
- **Tasks:** 2 (Task 1 committed in prior session, Task 2 committed in this session)
- **Files modified:** 5

## Accomplishments
- READY_FOR_QUARTER added to WS_EVENTS const object in shared/types.ts (was already in ClientMessage union but missing from the const)
- handleSubmitQuarterCoaching implemented: stores per-team decisions, simulates quarter when both submit, emits QUARTER_RESULT, advances to next coaching window or emits GAME_FINAL after Q4
- handleReadyForQuarter implemented: tracks team readiness via module-level map, opens coaching window when both teams signal ready
- Both handlers registered via socket.on() in socketManager.ts alongside existing handlers

## Task Commits

Each task was committed atomically:

1. **Task 1: Add READY_FOR_QUARTER to WS_EVENTS** - `f77a333` (feat)
2. **Task 2: Implement quarter coaching handlers and register socket events** - `92032c7` (feat)

## Files Created/Modified
- `shared/types.ts` - Added READY_FOR_QUARTER: 'game:ready_for_quarter' to WS_EVENTS const
- `server/services/handlers-v2.ts` - Added handleSubmitQuarterCoaching, handleReadyForQuarter, quarterReadyFlags map, initHandlersV2, _allPlayers module-level store
- `server/managers/socketManager.ts` - Added imports for new handlers, initHandlersV2 call, two socket.on() registrations
- `server/package.json` - Added vitest test runner and test script
- `server/vitest.config.ts` - Vitest configuration pointing to src/__tests__/
- `server/src/__tests__/simulation-correctness.test.ts` - Monte Carlo regression test for simulation engine

## Decisions Made
- quarterReadyFlags stored at module level as `Map<string, Set<string>>` rather than on LeagueState — avoids persisting ephemeral coordination state
- READY_FOR_QUARTER opens QUARTER_COACHING_WINDOW when both teams are ready, not on first signal — ensures symmetric coaching window experience
- Coaching decisions cleared (set to undefined) after each quarter simulation to prevent stale decisions bleeding into next quarter

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript compilation error in test stubs**
- **Found during:** Task 2 verification (npm run build --workspace=server)
- **Issue:** `archetypes: {}` in simulation-correctness.test.ts incompatible with `ArchetypeProfile` which extends `Record<ArchetypeName, number>` requiring all 13 named keys
- **Fix:** Changed all three `archetypes: {}` occurrences to `archetypes: {} as any` — consistent with existing `features: {} as any` pattern already in the same file
- **Files modified:** server/src/__tests__/simulation-correctness.test.ts
- **Verification:** npm run build --workspace=server passes with no TypeScript errors
- **Committed in:** 92032c7 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - TypeScript build error)
**Impact on plan:** Fix necessary for build to pass. No scope creep — test file was created by plan 01-01's TDD work and needed the cast to match the strict ArchetypeProfile type.

## Issues Encountered
- Task 1 (shared/types.ts change) was already committed in a prior session under commit f77a333 — detected via git log before re-applying the change. Task 2 files were uncommitted and required implementation.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Quarter coaching flow is now fully wired: client can emit SUBMIT_QUARTER_COACHING and READY_FOR_QUARTER and receive proper server responses
- The handleSubmitQuarterCoaching handler currently uses stub TeamAggregation objects for the quarter simulation (the FOUND-03 bug from plan 01-01 covers the full aggregation fix for the round-based path, but the quarter path still uses stubs)
- Ready to proceed to plan 01-03 (Court Vision rebrand) or plan 01-04 (further simulation fixes)

---
*Phase: 01-foundation-and-bug-fixes*
*Completed: 2026-03-10*

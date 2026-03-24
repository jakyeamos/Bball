---
phase: 03-data-layer
plan: "01"
subsystem: api
tags: [balldontlie, seed, json]

requires:
  - phase: 01-foundation-and-bug-fixes
    provides: Stable app baseline before data layer
provides:
  - Build-time BallDontLie seed script with offline stub
  - server/data/nba-seed.json + nba-seed.meta.json contract
  - Operator runbook for DATA-01 boundary
affects: [04-lesson-components-and-cms, offseason-simulator]

tech-stack:
  added: []
  patterns: ["No BallDontLie on request path — disk artifacts only"]

key-files:
  created:
    - server/scripts/seedBallDontLie.ts
    - server/data/nba-seed.json
    - server/data/nba-seed.meta.json
    - docs/data/seeding-workflow.md
  modified:
    - server/package.json

key-decisions:
  - "401 without API key: ship --offline teams-only stub for deterministic CI and empty player list until a real key run."
  - "Roster filter: only players with non-null team_id enter nba-seed.json from API."

patterns-established:
  - "Seed module guard: main runs only when argv references seedBallDontLie.ts (npm/tsx safe)."

requirements-completed: [DATA-01]

duration: 30min
completed: 2026-03-24
---

# Phase 03 data-layer — Plan 01 summary

**Build-time BallDontLie seed produces versioned JSON + metadata; runtime stays off the API.**

## Performance

- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Seeded deterministic offline artifact (30 teams) when no API credentials are available.
- Documented operator workflow and DATA-01 no-runtime-call rule.

## Files created/modified

- `server/scripts/seedBallDontLie.ts` — fetch or `--offline` writer.
- `server/data/nba-seed.json` — teams/players snapshot.
- `server/data/nba-seed.meta.json` — traceability metadata.
- `docs/data/seeding-workflow.md` — commands and rollback.
- `server/package.json` — `seed:nba`, `seed:nba:offline`.

## Self-Check: PASSED

- `npm run seed:nba:offline --workspace=server` succeeds (requires non-sandbox tsx).
- Key artifacts exist under `server/data/`.

---
phase: 03-data-layer
plan: "01"
subsystem: api
tags: [nba_api, seed, json, identity]

requires:
  - phase: 01-foundation-and-bug-fixes
    provides: Stable app baseline before data layer
provides:
  - Build-time NBA identity seed (`nba_api` Python + TS driver) with offline stub
  - server/data/nba-seed.json + nba-seed.meta.json contract
  - Operator runbook for DATA-01 boundary
affects: [04-lesson-components-and-cms, offseason-simulator]

tech-stack:
  added: []
  patterns: ["No stats.nba.com on request path — disk artifacts only"]

key-files:
  created:
    - server/scripts/seedNbaIdentity.ts
    - server/scripts/seed_nba_identity.py
    - server/scripts/requirements-nba.txt
    - server/data/nba-seed.json
    - server/data/nba-seed.meta.json
    - docs/data/seeding-workflow.md
  modified:
    - server/package.json

key-decisions:
  - "Offline mode: 30 teams with NBA stats TeamIDs, zero players — deterministic CI without Python/network."
  - "Live mode: Python `nba-api` required; TS shells `seed_nba_identity.py`, writes JSON + meta."
  - "Roster-attached players only; dedupe by PLAYER_ID when merging team rosters."

patterns-established:
  - "Seed module guard: main runs only when argv references seedNbaIdentity.ts (npm/tsx safe)."

requirements-completed: [DATA-01]

duration: 30min
completed: 2026-03-24
---

# Phase 03 data-layer — Plan 01 summary

**Build-time `nba_api` identity seed produces versioned JSON + metadata; runtime stays off live NBA stats HTTP.**

**Follow-on:** [`docs/data/nba-stats-stack-delta-todos.md`](../../../docs/data/nba-stats-stack-delta-todos.md), [`docs/data/external-data-sources.md`](../../../docs/data/external-data-sources.md).

## Performance

- **Tasks:** 3
- **Files modified:** 5+

## Accomplishments

- Seeded deterministic offline artifact (30 teams, NBA stats ids) when not running full Python seed.
- Documented operator workflow and DATA-01 no-runtime-call rule.

## Files created/modified

- `server/scripts/seedNbaIdentity.ts` — TS driver; `--offline` or exec Python.
- `server/scripts/seed_nba_identity.py` — `nba_api` league dash + per-team roster fetch.
- `server/scripts/requirements-nba.txt` — pins `nba-api`.
- `server/data/nba-seed.json` — teams/players snapshot.
- `server/data/nba-seed.meta.json` — traceability metadata.
- `docs/data/seeding-workflow.md` — commands and rollback.
- `server/package.json` — `seed:nba`, `seed:nba:offline`, `refresh:nba-cache`.

## Self-Check: PASSED

- `npm run seed:nba:offline --workspace=server` succeeds (requires non-sandbox tsx).
- Key artifacts exist under `server/data/`.

---
phase: 03-data-layer
plan: "02"
subsystem: api
tags: [cache, coaches, startup]

requires:
  - phase: 03-data-layer
    provides: 03-01 seed artifacts
provides:
  - NbaDataCache with background warm-up
  - coaches-seed.json for all 30 clubs
  - refresh entrypoint + cache ops doc
affects: [offseason-simulator, lessons-routing]

tech-stack:
  added: []
  patterns:
    - "Resolve server/data from compiled dist/services via ../../../data"

key-files:
  created:
    - server/services/dataCache.ts
    - server/scripts/refreshNbaIdentityCache.ts
    - server/data/coaches-seed.json
    - docs/data/cache-operations.md
  modified:
    - server/index.ts
    - server/package.json

key-decisions:
  - "Coach data is editorial JSON keyed by teamAbbreviation; merged at load time."
  - "Warm-up runs fire-and-forget alongside existing python snapshot bootstrap."

patterns-established:
  - "Singleton getNbaDataCache() for future offseason routes."

requirements-completed: [DATA-02, DATA-03]

duration: 30min
completed: 2026-03-24
---

# Phase 03 data-layer — Plan 02 summary

**Server boots a disk-only NBA identity cache and a full coach tendency table without live stats.nba.com calls on the request path.**

**Living docs:** [`docs/data/nba-stats-stack-delta-todos.md`](../../../docs/data/nba-stats-stack-delta-todos.md), [`docs/data/external-data-sources.md`](../../../docs/data/external-data-sources.md).

## Accomplishments

- Startup logs warm-up counts for teams, players, and coaches.
- `refresh:nba-cache` delegates to `seed:nba` for repeatable artifact regeneration.

## Files

- `server/services/dataCache.ts`, `server/scripts/refreshNbaIdentityCache.ts`, `server/data/coaches-seed.json`, `docs/data/cache-operations.md`, `server/index.ts`, `server/package.json`.

## Self-Check: PASSED

- `getNbaDataCache().warmUp()` resolves `../../../data` from emitted `dist/server/services` layout.

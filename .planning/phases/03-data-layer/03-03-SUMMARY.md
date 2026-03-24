---
phase: 03-data-layer
plan: "03"
subsystem: api
tags: [nba_api, playerfeatures, mapping, tests]

requires:
  - phase: 03-data-layer
    provides: 03-02 cache path stability
provides:
  - Extended python league-dash export + mapping row shape
  - playerFeaturesMapping.ts + tests
  - PLAYER_FEATURES_CORE_KEYS in shared/schemas
  - Field mapping documentation
affects: [draft-sim, offseason-simulator, lessons]

tech-stack:
  added: []
  patterns:
    - "Single formula source: buildPlayerFeatures after nbaSeasonJsonRowToPlayerRawStats"

key-files:
  created:
    - server/services/playerFeaturesMapping.ts
    - server/src/__tests__/playerFeaturesMapping.test.ts
    - docs/data/player-feature-mapping.md
  modified:
    - server/scripts/scrape_nba_stats.py
    - scripts/scraper.ts
    - shared/schemas.ts

key-decisions:
  - "Removed duplicate root scrape_nba_stats.py — canonical script under server/scripts."
  - "scraper.ts resolves python + sample_players paths for both dist/scripts and source layouts."

patterns-established:
  - "Vitest coverage: every PLAYER_FEATURES_CORE_KEY must be finite after mapping."

requirements-completed: [DATA-04, DATA-05]

duration: 40min
completed: 2026-03-24
---

# Phase 03 data-layer — Plan 03 summary

**Python emits mapping-ready rates; TypeScript bridges into PlayerRawStats then reuses buildPlayerFeatures with locked-down tests.**

## Accomplishments

- Extended `leaguedashplayerstats` export with TS%, split stats, poss estimate, and optional NBA rate columns.
- Root `scripts/scraper.ts` delegates normalization to `nbaSeasonJsonRowToPlayerRawStats`.

## Verification

- `npm test --workspace=server` — includes `playerFeaturesMapping` tests (4 tests total in suite).

## Self-Check: PASSED

- `shared` build succeeds; server `tsc` succeeds.

# NBA data seeding (BallDontLie)

## What this is

The build-time seed produces `server/data/nba-seed.json` plus `server/data/nba-seed.meta.json`. Runtime Express handlers **must not** call BallDontLie; they read these artifacts via `server/services/dataCache.ts`.

## Prerequisites

- Node 20+
- `BALLDONTLIE_API_KEY` in the environment for a full refresh (API returns `401` without a key)

## Commands

| Command | Purpose |
|--------|---------|
| `npm run seed:nba --workspace=server` | Fetch teams + roster-attached players from BallDontLie, write artifacts |
| `npm run seed:nba:offline --workspace=server` | Deterministic **teams-only** stub (30 clubs, zero players) — CI / no API key |

## Expected output

- `nba-seed.json` — `{ schemaVersion, teams[], players[] }` sorted by id
- `nba-seed.meta.json` — ISO timestamp, source (`balldontlie_api` or `offline_static`), counts, endpoints, normalization drop stats

After a real API run you should see roughly 30 teams and hundreds of players (roster-attached only). Validate in meta that counts look sane.

## Refresh cadence

- **In-season:** weekly or after major trades / call-ups is enough for identity data
- **Offseason:** after draft and post-free-agency once rosters stabilize
- **Emergency rollback:** restore the previous `nba-seed.json` / `nba-seed.meta.json` pair from git and restart the server

## DATA-01 boundary (no runtime BallDontLie)

1. All BallDontLie HTTP traffic happens **only** inside `npm run seed:nba` (this script).
2. Request-path code loads `nba-seed.json` from disk via the data cache — **no** `fetch` to `api.balldontlie.io`.
3. If artifacts are missing, fix deployment / run the seed — do not add live API calls to request handlers.

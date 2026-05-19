# NBA data seeding (nba_api / stats.nba.com)

## What this is

The build-time seed produces `server/data/nba-seed.json` plus `server/data/nba-seed.meta.json`. Runtime Express handlers **must not** call stats.nba.com; they read these artifacts via `server/services/dataCache.ts`.

Identity data uses the same **Python `nba_api`** stack as the draft sim (`server/scripts/scrape_nba_stats.py`): `pnpm --filter nba-draft-sim-server seed:nba` shells to `server/scripts/seed_nba_identity.py`.

## Prerequisites

- Node 20+
- Python 3 with `nba-api` installed:
  ```bash
  python3 -m pip install -r server/scripts/requirements-nba.txt
  ```
- Optional: set `PYTHON` in `.env` to a venv interpreter that has `nba-api` (see [.env.example](../../.env.example)).

## Commands

| Command | Purpose |
|--------|---------|
| `pnpm --filter nba-draft-sim-server seed:nba` | Fetch teams + roster players via nba_api, write artifacts (optional `--season 2025-26`) |
| `pnpm --filter nba-draft-sim-server seed:nba:offline` | Deterministic **teams-only** stub (30 clubs, NBA stats team IDs, zero players) — CI / no Python |

## Expected output

- `nba-seed.json` — `{ schemaVersion, teams[], players[] }` sorted by id (schema v2: NBA stats team/player IDs)
- `nba-seed.meta.json` — ISO timestamp, source (`nba_stats_api` or `offline_static`), counts, endpoints, normalization drop stats

After a live run you should see roughly 30 teams and hundreds of players (current rosters). Validate in meta that counts look sane.

## Refresh cadence

- **In-season:** weekly or after major trades / call-ups is enough for identity data
- **Offseason:** after draft and post-free-agency once rosters stabilize
- **Emergency rollback:** restore the previous `nba-seed.json` / `nba-seed.meta.json` pair from git and restart the server

## DATA-01 boundary (no runtime stats.nba.com)

1. All stats.nba.com traffic for identity happens **only** inside `pnpm --filter nba-draft-sim-server seed:nba` (Python + TS driver).
2. Request-path code loads `nba-seed.json` from disk via the data cache — **no** live fetches to NBA endpoints.
3. If artifacts are missing, fix deployment / run the seed — do not add live API calls to request handlers.

## Planning references

Linked from **Phase 3** in [`.planning/ROADMAP.md`](../../.planning/ROADMAP.md) and **Data Layer** in [`.planning/REQUIREMENTS.md`](../../.planning/REQUIREMENTS.md). For follow-on work: [nba-stats-stack-delta-todos.md](./nba-stats-stack-delta-todos.md), [external-data-sources.md](./external-data-sources.md).

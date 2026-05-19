# NBA disk cache operations

## Components

- **Seed artifacts:** `server/data/nba-seed.json`, `server/data/nba-seed.meta.json` — produced only by the seed script (`pnpm --filter nba-draft-sim-server seed:nba`). See [seeding-workflow.md](./seeding-workflow.md).
- **Coach editorial data:** `server/data/coaches-seed.json` — curated tendencies (pace, scheme, flags). Update by hand when coaching changes are material.
- **Runtime loader:** `server/services/dataCache.ts` — warms an in-memory view on server startup. **No outbound stats.nba.com calls** during HTTP handling.

## Refresh sequence

1. Ensure Python has `nba-api` (see `server/scripts/requirements-nba.txt`), or use `seed:nba:offline` for a teams-only stub.
2. Run:
   ```bash
   pnpm --filter nba-draft-sim-server refresh:nba-cache
   ```
   This shells to `seed:nba`, overwriting seed JSON files idempotently.
3. Restart the API process so `getNbaDataCache().warmUp()` reloads from disk.

## Success indicators

- Console: `[dataCache] warm-up complete teams=… players=… coaches=30`
- `nba-seed.meta.json` `generatedAt` reflects the refresh time and `source` is `nba_stats_api` for a live run.

## Rollback

```bash
git checkout -- server/data/nba-seed.json server/data/nba-seed.meta.json
```

Then restart the server. Do not add live NBA endpoint fetches to routes as a “quick fix” for bad data.

## Planning references

Same data-layer scope as [seeding-workflow.md](./seeding-workflow.md). Sourcing roadmap: [nba-stats-stack-delta-todos.md](./nba-stats-stack-delta-todos.md), [external-data-sources.md](./external-data-sources.md).

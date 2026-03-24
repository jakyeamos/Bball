# NBA disk cache operations

## Components

- **Seed artifacts:** `server/data/nba-seed.json`, `server/data/nba-seed.meta.json` — produced only by the seed script (`npm run seed:nba --workspace=server`). See [seeding-workflow.md](./seeding-workflow.md).
- **Coach editorial data:** `server/data/coaches-seed.json` — curated tendencies (pace, scheme, flags). Update by hand when coaching changes are material.
- **Runtime loader:** `server/services/dataCache.ts` — warms an in-memory view on server startup. **No outbound BallDontLie calls** during HTTP handling.

## Refresh sequence

1. Ensure `BALLDONTLIE_API_KEY` is set (or use `seed:nba:offline` for a teams-only stub).
2. Run:
   ```bash
   npm run refresh:nba-cache --workspace=server
   ```
   This shells to `seed:nba`, overwriting seed JSON files idempotently.
3. Restart the API process so `getNbaDataCache().warmUp()` reloads from disk.

## Success indicators

- Console: `[dataCache] warm-up complete teams=… players=… coaches=30`
- `nba-seed.meta.json` `generatedAt` reflects the refresh time and `source` is `balldontlie_api` for a live run.

## Rollback

```bash
git checkout -- server/data/nba-seed.json server/data/nba-seed.meta.json
```

Then restart the server. Do not add live BallDontLie fetches to routes as a “quick fix” for bad data.

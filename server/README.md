# nba-draft-sim-server

Server package for Bballedu, containing backend API/runtime code that supports the basketball IQ training platform.

## Scope

This README documents the `server` subproject inside `Bballedu`.
It is marked private in `package.json` and is intended for workspace use rather than standalone publishing.

## Repository Layout

- `.eslintrc.cjs` - project file.
- `data/` - local input, cache, or generated data artifacts.
- `index.ts` - project file.
- `managers/` - project directory.
- `package.json` - JavaScript package metadata and scripts.
- `routes/` - project directory.
- `scripts/` - automation and operational scripts.
- `server/` - backend package or server code.
- `services/` - project directory.
- `src/` - source code and package internals.
- `stores/` - project directory.
- `supabase/` - project directory.
- `tsconfig.json` - project file.
- `utils/` - project directory.
- `vitest.config.ts` - project file.

## Common Commands

- `pnpm build` - `tsc`
- `pnpm dev` - `tsx watch index.ts`
- `pnpm start` - `node dist/server/index.js`
- `pnpm build:stats-artifact` - `python3 scripts/scrape_nba_stats.py --season 2025-26 --output data/player-stats-2025-26.json`
- `pnpm calibrate:sim` - `tsx scripts/calibrateDraftSim.ts`
- `pnpm seed:nba` - `tsx scripts/seedNbaIdentity.ts`
- `pnpm seed:nba:offline` - `tsx scripts/seedNbaIdentity.ts --offline`
- `pnpm refresh:nba-cache` - `tsx scripts/refreshNbaIdentityCache.ts`
- `pnpm test` - `vitest run`
- `pnpm lint` - `eslint . --ext ts --report-unused-disable-directives --max-warnings 0`
- `pnpm typecheck` - `tsc --noEmit`

## Development Notes

Runtime dependencies include `@nba-draft-sim/shared`, `@supabase/supabase-js`, `cookie-parser`, `cors`, `dotenv`, `express`, `socket.io`, `uuid`.
Use `pnpm` from the containing workspace to install dependencies and run scripts.

## Verification

Run the relevant test script listed above before changing behavior.

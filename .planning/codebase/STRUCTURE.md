# Codebase Structure

**Analysis Date:** 2026-03-09

## Directory Layout

```
Bball/                          # Monorepo root
├── client/                     # React SPA (Vite)
│   ├── src/
│   │   ├── App.tsx             # Router + GameRouting state machine
│   │   ├── index.tsx           # React 18 entry point
│   │   ├── archetypes.ts       # Client-side archetype helpers (colors, labels)
│   │   ├── vite-env.d.ts       # Vite env type declarations
│   │   ├── pages/              # Route-level components (one per game phase)
│   │   ├── components/         # Shared UI primitives
│   │   ├── context/            # AppContext (global WS state)
│   │   ├── services/           # WebSocket client + REST helpers
│   │   ├── features/           # Feature modules
│   │   │   └── team-composition/   # Team identity visualization
│   │   │       ├── evaluator.ts
│   │   │       └── components/
│   │   └── utils/              # Client utilities (groupGamesByMatchup.ts)
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── server/                     # Express + Socket.io server
│   ├── index.ts                # Server entry point
│   ├── managers/               # Orchestration (timers, state, WS routing)
│   ├── routes/                 # REST routes (/api/lobbies)
│   ├── scripts/                # Startup scripts (scraper.ts)
│   ├── services/               # Pure computation (simulation engine, etc.)
│   ├── stores/                 # In-memory state Maps
│   ├── utils/                  # Server utilities (utils.ts: sigmoid, clamp)
│   └── package.json
│
├── shared/                     # @nba-draft-sim/shared workspace package
│   ├── types.ts                # All shared TypeScript types + constants
│   ├── utils.ts                # calculateWinPercentage (currently only export)
│   ├── utils.test.ts           # Vitest tests (only test file in codebase)
│   ├── index.ts                # Re-exports types.ts and utils.ts
│   └── package.json
│
├── data/                       # Static fallback data
│   └── sample_players.json     # Fallback player data when Python scraper fails
│
├── scripts/                    # Root-level scripts (also contains scraper)
│   ├── scraper.ts              # fetchPlayerData() — spawns Python, falls back to JSON
│   ├── scrape_nba_stats.py     # Python NBA API script
│   └── validate-solo-draft.mjs # Manual test script
│
├── deployment/                 # Deployment configs
│   ├── render.yaml             # Render.com deployment spec
│   ├── railway.json            # Railway.app deployment spec
│   ├── docker-compose.yml
│   ├── client.Dockerfile
│   └── server.Dockerfile
│
├── docs/                       # Project documentation
├── .planning/                  # GSD planning files
│   └── codebase/               # Codebase analysis documents (here)
├── package.json                # Root workspace definition
├── .env.example                # Environment variable template
└── .nvmrc                      # Node version: 20
```

## Directory Purposes

**`server/services/`:**
- Purpose: Pure computation with no side effects — simulation engine, player pipeline, handler logic
- Contains: Simulation (Monte Carlo), feature extraction, archetype scoring, aggregation, handlers, editorial generation, scouting report, season/playoffs runners
- Key files: `simulation.ts` (809 lines), `handlers.ts` (618 lines), `handlers-v2.ts` (544 lines), `features.ts` (352 lines), `snapshot.ts` (335 lines)

**`server/managers/`:**
- Purpose: Stateful orchestration — owns timers, coordinates between stores and services, manages WebSocket event routing
- Contains: socketManager, sessionManager, leagueManager, lobbyManager, roundManager, timerManager, coachingTimerManager, tradeTimerManager, tradeProposalManager, rejoinManager
- Key files: `socketManager.ts` (313 lines), `roundManager.ts` (331 lines), `leagueManager.ts` (272 lines)

**`server/stores/`:**
- Purpose: In-memory state containers; thin Map wrappers with typed helpers
- Contains: `leagueStore.ts` (typed get/set/update/delete for `LeagueState`)
- Note: `lobbies` and `drafts` Maps live in `server/services/handlers.ts`, not here — inconsistency

**`client/src/pages/`:**
- Purpose: Full-screen route components, one per game phase
- Contains: LobbyPage, WaitingRoomPage, DraftPage, DraftRecapPage, ScoutingReportPage, CoachingDecisionsPage, QuarterCoachingPage, ResultsPage, RoundResultsPage, RegularSeasonPage, PlayoffResultsPage, LobbyBrowserPage
- Key files: `CoachingDecisionsPage.tsx` (612 lines — largest client file), `DraftPage.tsx` (479 lines)

**`client/src/components/`:**
- Purpose: Shared, reusable UI elements
- Contains: Design system primitives (Button, Card, Input) + domain components (PlayerCard, MatchupCard, GameCard, StandingsTable, PlayoffsDisplay, TradePanel, TradeProposalPanel, DebugOverlay, GameTimer, TeamAnalysis)

**`client/src/features/team-composition/`:**
- Purpose: Self-contained feature module for team archetype visualization
- Contains: `evaluator.ts` (client-side team evaluation logic), `TeamIdentityUI.tsx` (animated display with hysteresis)

**`shared/`:**
- Purpose: Single source of truth for type contracts and constants — built to `./dist` before client or server
- All 13 archetype names, all archetype weights, all simulation parameters, all WS event names defined here

## Key File Locations

**Entry Points:**
- `server/index.ts` — Server startup, player data loading, socket init
- `client/src/index.tsx` — React app mount
- `client/src/App.tsx` — Route definitions + client-side phase navigation

**Configuration:**
- `.env.example` — Required env vars: `PORT`, `CLIENT_URL`, `NODE_ENV`
- `client/vite.config.ts` — Vite with `@` alias, dev proxy, commonjsOptions for shared package
- `server/tsconfig.json` — NodeNext module resolution
- `shared/tsconfig.json` — CommonJS output for cross-compatibility

**Core Logic:**
- `shared/types.ts` — All types + `WS_EVENTS` + `SIMULATION_PARAMS` + `ARCHETYPE_WEIGHTS` + `DRAFT_CONSTRAINTS`
- `server/services/simulation.ts` — Monte Carlo engine, quarter simulation, score generation
- `server/services/snapshot.ts` — Two-pass player processing pipeline
- `server/managers/socketManager.ts` — All WebSocket event registrations
- `server/managers/leagueManager.ts` — Phase state machine transitions
- `client/src/context/AppContext.tsx` — All client-side state derived from WS events

**Data Source:**
- `scripts/scraper.ts` — `fetchPlayerData(season)` called at server boot; spawns `scripts/scrape_nba_stats.py`
- `data/sample_players.json` — Fallback JSON when Python is unavailable

**Testing:**
- `shared/utils.test.ts` — Only test file; run with `npm test --workspace=shared`

## Naming Conventions

**Files:**
- Server: `camelCase.ts` for services/managers/stores
- Client pages: `PascalCasePage.tsx`
- Client components: `PascalCase.tsx`
- Shared: lowercase (`types.ts`, `utils.ts`)

**Directories:**
- Server: lowercase plural nouns (`services/`, `managers/`, `stores/`, `routes/`)
- Client: camelCase (`pages/`, `components/`, `context/`, `services/`, `features/`)
- Features: kebab-case directories (`team-composition/`)

**Functions/Variables:**
- Functions: `camelCase` throughout
- React components: `PascalCase`
- Constants: `UPPER_SNAKE_CASE` (all in `shared/types.ts`)
- WS event name strings: `namespace:action` format (e.g., `lobby:create`, `draft:pick`)

## Where to Add New Code

**New game phase or simulation logic:**
- Computation: `server/services/` (new `.ts` file)
- State management: `server/managers/leagueManager.ts` (new transition function)
- WS events: add to `WS_EVENTS` in `shared/types.ts`, register in `server/managers/socketManager.ts`, handle in `server/services/handlers.ts` or `handlers-v2.ts`

**New client page:**
- Implementation: `client/src/pages/NewFeaturePage.tsx`
- Route: add to `client/src/App.tsx` `<Routes>` and `GameRouting` logic
- State: add to `AppState` interface in `client/src/context/AppContext.tsx` and wire WS handler

**New UI component:**
- Shared primitive: `client/src/components/ComponentName.tsx`
- Feature-specific: `client/src/features/{feature-name}/components/ComponentName.tsx`

**New shared types:**
- All interfaces, types, enums, constants: `shared/types.ts`
- After adding, re-run `npm run build --workspace=shared`

**New REST endpoint:**
- Add to `server/routes/lobbies.ts` or create new file in `server/routes/`
- Mount in `server/index.ts` via `app.use('/api', router)`

**Utilities:**
- Server math/helpers: `server/utils/utils.ts`
- Client helpers: `client/src/utils/`
- Shared (pure, no Node/browser deps): `shared/utils.ts`

## Special Directories

**`.planning/`:**
- Purpose: GSD planning and codebase analysis documents
- Generated: No (human/AI-authored)
- Committed: Yes

**`deployment/`:**
- Purpose: Platform deployment configs for Render, Railway, Docker
- Generated: No
- Committed: Yes

**`dist/` (server and shared):**
- Purpose: TypeScript compilation output
- Generated: Yes (via `tsc`)
- Committed: No (in `.gitignore`)

**`data/`:**
- Purpose: Static fallback player data for development/testing without Python
- Generated: No (manually curated)
- Committed: Yes

---

*Structure analysis: 2026-03-09*

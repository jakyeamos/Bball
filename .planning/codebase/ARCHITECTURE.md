# Architecture

**Analysis Date:** 2026-03-09

## Pattern Overview

**Overall:** Stateful real-time monorepo — three-package npm workspace (shared types, Express+Socket.io server, React SPA) with all game state held in server process memory and synchronized to clients exclusively via Socket.io events.

**Key Characteristics:**
- Single source of truth is in-memory server state (no database)
- All client state is derived from server-emitted WebSocket events
- Shared types package enforces a strict contract between client and server
- Phase-state machine drives the game lifecycle (draft → draft_recap → regular_season → playoffs → complete)

---

## Layers

**Shared Types (`shared/`):**
- Purpose: Single contract for all data shapes, WebSocket event names, and simulation constants
- Location: `shared/types.ts`, `shared/utils.ts`, `shared/index.ts`
- Contains: TypeScript interfaces, union types, `WS_EVENTS` const object, archetype weights, simulation parameters, reliability params
- Depends on: nothing
- Used by: both `server/` and `client/src/`

**Server — Services (`server/services/`):**
- Purpose: Pure computation — simulation engine, player feature extraction, archetype scoring, team aggregation
- Key files:
  - `server/services/simulation.ts` — Monte Carlo matchup simulation, quarter simulation, score generation
  - `server/services/features.ts` — 30-feature extraction from raw stats with reliability shrinkage
  - `server/services/archetypes.ts` — softmax archetype profile computation from z-scores
  - `server/services/aggregation.ts` — weighted roster → team aggregation
  - `server/services/snapshot.ts` — two-pass league snapshot creation
  - `server/services/modifiers.ts` — team composition modifier calculation
  - `server/services/reliability.ts` — sigmoid-based reliability factor (minutes + games played)
  - `server/services/draftState.ts` — draft state machine transitions
  - `server/services/season.ts` — full round-robin regular season runner
  - `server/services/playoffs.ts` — bracket playoff runner
  - `server/services/scoutingReport.ts` — pre-game scouting report generation
  - `server/services/editorial.ts` — narrative text generation for game results
  - `server/services/playoffEditorial.ts` — playoff-specific narratives
  - `server/services/handlers.ts` — WebSocket event handlers (lobby, draft, trade execution, season/playoffs)
  - `server/services/handlers-v2.ts` — Round-based and trade-proposal WebSocket handlers
- Depends on: shared package
- Used by: managers layer

**Server — Managers (`server/managers/`):**
- Purpose: Orchestration — owns timers, session/lobby/league state, WebSocket server setup
- Key files:
  - `server/managers/socketManager.ts` — Socket.io server init, middleware auth, event routing
  - `server/managers/sessionManager.ts` — In-memory `SessionStore` class; cookie-based identity
  - `server/managers/leagueManager.ts` — League lifecycle (create, phase transitions, trade execution)
  - `server/managers/lobbyManager.ts` — Lobby creation and validation
  - `server/managers/roundManager.ts` — Round schedule generation, coaching decision tracking, round simulation
  - `server/managers/timerManager.ts` — Draft pick timers (auto-pick on expiry)
  - `server/managers/coachingTimerManager.ts` — Scouting → coaching → simulate phase transitions with timed intervals
  - `server/managers/tradeTimerManager.ts` — Trade window countdown
  - `server/managers/tradeProposalManager.ts` — Trade proposal lifecycle (create, accept, reject, cancel, expire)
  - `server/managers/rejoinManager.ts` — Maps userId → lobbyId for reconnection
- Depends on: services layer, stores layer, shared package
- Used by: `server/index.ts`

**Server — Stores (`server/stores/`):**
- Purpose: In-memory state containers (Map wrappers with typed CRUD)
- Key files:
  - `server/stores/leagueStore.ts` — `Map<string, LeagueState>` with get/set/update/delete helpers
  - `server/services/handlers.ts` also exports `lobbies: Map<string, LobbyState>` and `drafts: Map<string, DraftState>` (not in stores/ dir — a structural inconsistency)
- Depends on: shared types
- Used by: managers

**Server — Routes (`server/routes/`):**
- Purpose: REST HTTP endpoints (public lobby browser)
- Key files:
  - `server/routes/lobbies.ts` — GET `/api/lobbies` for public lobby listing
- Depends on: services/handlers lobby Map

**Client — Context (`client/src/context/`):**
- Purpose: Global React state from WebSocket events; single provider for entire app
- Key files:
  - `client/src/context/AppContext.tsx` — `AppProvider` subscribes to all WS_EVENTS and exposes `useApp()` hook
- Depends on: websocket service, shared types
- Used by: all pages and components

**Client — Services (`client/src/services/`):**
- Purpose: WebSocket client abstraction and REST helpers
- Key files:
  - `client/src/services/websocket.ts` — `WebSocketService` class (singleton `wsService`); `emit()` and `on()` wrappers
  - `client/src/services/api.ts` — REST fetch helpers for snapshot/players
- Depends on: socket.io-client, shared types
- Used by: AppContext, pages

**Client — Pages (`client/src/pages/`):**
- Purpose: Route-level components; each corresponds to a game phase
- Key files:
  - `LobbyPage.tsx` — Create/join lobby, lobby config
  - `LobbyBrowserPage.tsx` — Browse public lobbies
  - `WaitingRoomPage.tsx` — Pre-draft lobby with ready-up
  - `DraftPage.tsx` — Live snake draft with player search/sort/queue
  - `DraftRecapPage.tsx` — Post-draft roster review and direct trades
  - `ScoutingReportPage.tsx` — Pre-game scouting analysis
  - `CoachingDecisionsPage.tsx` — Pre-round coaching decisions
  - `QuarterCoachingPage.tsx` — Quarter-by-quarter live game view
  - `ResultsPage.tsx` — Full regular season results
  - `RoundResultsPage.tsx` — Single round results
  - `RegularSeasonPage.tsx` — Season standings
  - `PlayoffResultsPage.tsx` — Playoff bracket results

**Client — Components (`client/src/components/`):**
- Purpose: Shared UI primitives
- Key files:
  - `Button.tsx`, `Card.tsx`, `Input.tsx` — Base design system components
  - `DebugOverlay.tsx` — Dev-only debug panel (rendered in App.tsx unconditionally)
  - `GameTimer.tsx` — Draft pick countdown display
  - `PlayerCard.tsx`, `MatchupCard.tsx`, `GameCard.tsx` — Domain-specific cards
  - `StandingsTable.tsx`, `PlayoffsDisplay.tsx`, `TeamAnalysis.tsx` — Results display
  - `TradePanel.tsx`, `TradeProposalPanel.tsx` — Trade UI

**Client — Features (`client/src/features/`):**
- Purpose: Self-contained feature modules (currently one: team-composition)
- Key files:
  - `client/src/features/team-composition/evaluator.ts` — Client-side team archetype evaluation (281 lines)
  - `client/src/features/team-composition/components/TeamIdentityUI.tsx` — Animated archetype display with hysteresis smoothing

---

## Data Flow

**Server Startup:**
1. `server/index.ts` calls `fetchPlayerData('2025-26')` (scraper spawns Python child process; falls back to `data/sample_players.json`)
2. `createLeagueSnapshot()` runs two-pass feature extraction → archetype computation → impact rating for all players
3. Snapshot stored as module-level `leagueSnapshot` variable
4. Socket.io server initialized with `leagueSnapshot.players` passed as `allPlayers` closure

**Game Lifecycle:**
1. Client connects → Socket.io middleware runs `getOrCreateSession()` → `SESSION_INFO` emitted back
2. Client emits `lobby:create` or `lobby:join` → server creates `LobbyState` in `lobbies` Map
3. Commissioner emits `draft:start` → `DraftState` created, timer started
4. Players emit `draft:pick` → picks recorded, auto-pick fires on timer expiry
5. Draft complete → `LeagueState` created in `leagueStore`, phase = `draft_recap`
6. Commissioner emits `round:start` → `RoundState` created, scouting reports generated and emitted, coaching timer starts
7. Players emit `round:submit_coaching` → decisions collected; when all in, round simulates
8. After all rounds → Commissioner emits `league:start_playoffs` → playoff bracket runs
9. Commissioner emits `league:complete` → phase = `complete`

**Quarter-Based Game (V3):**
- `coachingTimerManager` drives `scouting` → `coaching_window` → `simulating` phase transitions via server-side `setInterval`
- `simulateQuarter()` runs per quarter with coaching adjustments applied as `FeatureAdjustments` deltas
- `QUARTER_COACHING_WINDOW` event allows inter-quarter decision updates

**State Management (Client):**
- `AppContext` holds a single flat state object: `{ isConnected, userId, allPlayers, lobby, draft, timeRemaining, league, regularSeasonResults, playoffResults, scoutingReports, error }`
- All mutation is via `setState` in WS event handlers
- No Redux, no Zustand — single `useState` in `AppProvider`

---

## Key Abstractions

**LeagueSnapshot:**
- Purpose: Immutable player universe created at server boot
- Location: `server/services/snapshot.ts`, type in `shared/types.ts`
- Pattern: Two-pass computation (bootstrap role averages → recalculate with population stats)

**Player Pipeline:**
- rawStats → `buildPlayerFeatures()` (reliability shrinkage applied) → `standardizeFeatures()` (z-scores) → `computeArchetypeProfile()` (softmax) → `calculateImpactRating()`
- `server/services/features.ts`, `server/services/archetypes.ts`, `server/services/aggregation.ts`

**TeamAggregation:**
- Purpose: Aggregate roster into team-level features + modifiers for simulation
- Location: `server/services/aggregation.ts`
- Pattern: Weighted average by `impactRating`, top 10 players by impact form the rotation

**Monte Carlo Matchup:**
- `simulateMatchup()` in `server/services/simulation.ts` runs 100 simulations (configurable via `DRAFT_CONSTRAINTS.SIMS_PER_MATCHUP`)
- Each sim: compute ORtg/DRtg/sigma → apply coaching adjustments → add home court → sample normal distributions → count wins
- Win percentage determines editorial narrative

**WS_EVENTS:**
- Const object in `shared/types.ts` defines all event name strings
- Both client and server import from shared — no string literals in handlers

---

## Entry Points

**Server:**
- Location: `server/index.ts`
- Triggers: `node dist/server/index.js` (production), `tsx server/index.ts` (dev)
- Responsibilities: Express setup, player data loading, snapshot creation, Socket.io init, session cleanup interval

**Client:**
- Location: `client/src/index.tsx`
- Triggers: Vite dev server or static file serving
- Responsibilities: Render `<App />` wrapped in React 18 `createRoot`

**App Router:**
- Location: `client/src/App.tsx`
- Contains `GameRouting` component with `useEffect` that redirects based on `league.phase` and `league.liveGame` — this is the primary navigation state machine on the client

---

## Error Handling

**Strategy:** Throw-and-emit — server handlers wrap logic in try/catch and emit `WS_EVENTS.ERROR` on failure; client `AppContext` stores the error message string and surfaces it in UI.

**Patterns:**
- Server: `socket.emit(WS_EVENTS.ERROR, { payload: { message: error.message } })` in every handler catch block
- Client: `error` state in `AppContext`; components check `error !== null`
- No structured error codes — all errors are free-text strings

---

## Cross-Cutting Concerns

**Logging:** `console.log` / `console.error` throughout server — 96 instances in server, 40 in client. No structured logger. Many are prefixed with emoji (`✅`, `❌`, `🔄`) for visual scanning.

**Validation:** Input validation is ad-hoc in handlers (check for required fields, throw Error). No validation library (no Zod, no Joi).

**Authentication:** Cookie-based session identity. `SESSION_COOKIE_NAME = 'nba_draft_sim_session'` read in Socket.io middleware. No auth tokens, no password, no accounts — identity is ephemeral per browser session.

---

*Architecture analysis: 2026-03-09*

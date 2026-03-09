# Coding Conventions

**Analysis Date:** 2026-03-09

## Naming Patterns

**Files:**
- Server services/managers/stores: `camelCase.ts` (e.g., `draftState.ts`, `leagueManager.ts`, `leagueStore.ts`)
- Client pages: `PascalCasePage.tsx` (e.g., `DraftPage.tsx`, `QuarterCoachingPage.tsx`)
- Client components: `PascalCase.tsx` (e.g., `PlayerCard.tsx`, `TradePanel.tsx`)
- Shared: all lowercase (`types.ts`, `utils.ts`, `index.ts`)
- Test files: `*.test.ts` co-located with source (e.g., `shared/utils.test.ts`)

**Functions:**
- Pure computation: `verbNoun` (e.g., `simulateMatchup`, `aggregateTeam`, `buildPlayerFeatures`, `computeArchetypeProfile`)
- Handler functions: `handle` prefix (e.g., `handleCreateLobby`, `handleSubmitCoaching`, `handleStartRound`)
- Event emitters/generators: `generate` prefix (e.g., `generateScoutingReport`, `generateGameScores`, `generateRoundSchedule`)
- Boolean checks: `is` prefix (e.g., `isCoachingWindowExpired`, `allDecisionsSubmitted`)
- Lifecycle: `create`, `start`, `stop`, `run`, `transition` prefixes

**Variables:**
- Local: `camelCase`
- Server process-level singletons: noun (e.g., `sessionStore`, `leagueStore`, `wsService`)
- Constants: `UPPER_SNAKE_CASE` — all defined in `shared/types.ts`

**Types/Interfaces:**
- Interfaces: `PascalCase` without `I` prefix (e.g., `LeagueState`, `TeamAggregation`, `CoachingDecision`)
- Type unions: `PascalCase` (e.g., `LeaguePhase`, `RoundPhase`, `LineupStrategy`)
- `type` vs `interface`: interfaces for data shapes, `type` for union strings

**WebSocket Events:**
- Event name strings: `namespace:action` format (e.g., `lobby:create`, `draft:pick`, `game:quarter_coaching_window`)
- All event names defined as a single `WS_EVENTS` const object in `shared/types.ts`
- Never use raw string literals for event names in handlers or clients

## Code Style

**Formatting:**
- No Prettier config found at root — style is enforced by TypeScript compiler and ESLint only
- Indentation: 2 spaces (consistent across all files)
- Quotes: single quotes for strings in TypeScript
- Semicolons: yes

**Linting:**
- ESLint with `@typescript-eslint` plugin
- Config: `server/.eslintrc.cjs`
- Rules include `@typescript-eslint/no-unused-vars` and strict TypeScript checks
- `max-warnings 0` enforced in `npm run lint`

## Import Organization

**Order (observed pattern):**
1. Node built-ins (`http`, `path`, `fs/promises`)
2. Third-party packages (`express`, `socket.io`, `uuid`)
3. Shared package (`@nba-draft-sim/shared`)
4. Local services/managers (`../services/simulation`, `./sessionManager`)
5. Local stores (`../stores/leagueStore`)

**Path Aliases:**
- Client only: `@` maps to `client/src/` (configured in `vite.config.ts`)
- Server/shared: no aliases — relative paths only

**Shared Package Imports:**
- Always import types and constants together from `@nba-draft-sim/shared`
- Pattern: `import { TypeA, TypeB, CONSTANT_C } from '@nba-draft-sim/shared';`

## Error Handling

**Patterns:**
- Server handlers: all wrapped in `try/catch`; catch emits `WS_EVENTS.ERROR` to the individual socket with `{ payload: { message: error.message } }`
- Pure functions: throw `Error` with descriptive message; let caller handle
- Phase validation pattern: check `league.phase` at start of every phase-transition function, throw if invalid
- Null-safety: extensive use of optional chaining (`?.`) and nullish coalescing (`??`)
- TypeScript narrowing: `(p): p is Player => p !== undefined` filter guards used to remove undefined from arrays

**No retry logic** — if a WS event fails, client receives an error; no automatic retry mechanism.

## Logging

**Framework:** Raw `console.log` / `console.error`

**Patterns:**
- Server startup: emoji-prefixed progress logs (`🚀`, `📊`, `✅`, `❌`)
- WS event reception: `📥 Received event: "${eventName}"` via `socket.onAny()` in dev (registered unconditionally in `socketManager.ts`)
- State transitions: `✅ [action] for [entity]` pattern (e.g., `✅ Started round 1 for league abc123`)
- Debugging: `🔵`, `🔴`, `🟢` prefixes for client-side event handlers in `AppContext.tsx`
- 96 console statements in server, 40 in client — production logs are very noisy; no log levels

## Comments

**When to Comment:**
- File-level JSDoc block on every file describing purpose and a CHANGELOG of significant changes
- Section dividers using `// ==== SECTION TITLE ====` with `=` characters to delineate logical groups
- Inline `// FIX:` comments on bug fixes noting what was changed and why
- Phase annotation: `// Phase 1B:`, `// Phase 2:`, `// V3:` prefixes on additions to track when code was introduced

**Pattern (observed):**
```typescript
/**
 * server/services/simulation.ts - V3 UPDATE
 *
 * CHANGELOG:
 * - Added score guard to ensure winner always has higher score
 * - Added quarter-based game simulation
 */
```

## Function Design

**Size:** Services functions run 50–200 lines; handlers run 30–80 lines. No enforced limit but functions tend to stay within a single responsibility.

**Parameters:**
- Pure computation functions take typed data objects, return typed results
- Handler functions receive `(io: SocketServer, socket: Socket, payload: any, userId: string)` consistently
- Manager functions take typed arguments only (no socket access)

**Return Values:**
- Mutation functions return the updated state or `undefined` if not found (e.g., `leagueStore.update()` returns `LeagueState | undefined`)
- Pure functions return typed results directly
- Boolean success/error results: some functions return `{ success: boolean; error?: string; league: LeagueState }` pattern (e.g., `executeTradeProposal`)

## Module Design

**Exports:**
- Named exports throughout — no default exports except React components (`export default App` in `App.tsx`, `export function` everywhere else)
- React components use both: pages use named exports (`export function DraftPage()`), `App.tsx` uses default export

**Barrel Files:**
- `shared/index.ts` re-exports `types.ts` and `utils.ts` (the only barrel file)
- No barrel files in `server/` or `client/` — direct file imports only

**Singletons:**
- `sessionStore` — exported from `server/managers/sessionManager.ts`
- `leagueStore` — exported from `server/stores/leagueStore.ts`
- `wsService` — exported from `client/src/services/websocket.ts`
- `rejoinManager` — exported from `server/managers/rejoinManager.ts`

---

*Convention analysis: 2026-03-09*

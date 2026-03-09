# Codebase Concerns

**Analysis Date:** 2026-03-09

## Tech Debt

**`handleSimulateRoundInternal` uses blank team aggregations:**
- Issue: When all coaching decisions are submitted simultaneously, `handleSimulateRoundInternal()` is called without access to `allPlayers`. It creates stub `TeamAggregation` objects with empty `features: {}`, `archetypes: {}`, and `overallRating: 50`. This means coaching decisions have zero effect in the auto-simulate path.
- Files: `server/services/handlers-v2.ts` lines 240–296
- Impact: The coaching decision system is effectively broken for the "all teams submit at once" flow — the simulation ignores team quality and coaching strategy entirely in that code path
- Fix approach: Pass `allPlayers` through to `handleSimulateRoundInternal` (same pattern as the public `handleSimulateRound()` which does it correctly at lines 301–346)

**Handler split across two files with duplicated import patterns:**
- Issue: WebSocket handlers are split across `server/services/handlers.ts` and `server/services/handlers-v2.ts` with no clear boundary. `handlers.ts` exports `lobbies` and `drafts` Maps that `handlers-v2.ts` imports, creating a circular-ish dependency via the handlers file. The comment in `socketManager.ts` says "FIX: Import core handlers from handlers.ts / FIX: Import new handlers from handlers-v2.ts".
- Files: `server/services/handlers.ts`, `server/services/handlers-v2.ts`, `server/managers/socketManager.ts`
- Impact: State (`lobbies`, `drafts`) lives in a services file instead of a stores file; hard to reason about ownership
- Fix approach: Move `lobbies` and `drafts` Maps to `server/stores/` and import from there; consolidate handler files

**`lobbies` and `drafts` Maps live in a service file:**
- Issue: `lobbies: Map<string, LobbyState>` and `drafts: Map<string, DraftState>` are module-level variables in `server/services/handlers.ts`, not in `server/stores/`. This mixes service logic with store state.
- Files: `server/services/handlers.ts` (exports both)
- Impact: Any file that needs lobby/draft state must import from `handlers.ts`, coupling every manager to the service layer
- Fix approach: Create `server/stores/lobbyStore.ts` and `server/stores/draftStore.ts` mirroring `server/stores/leagueStore.ts`

**Snapshot ID hardcoded in handlers.ts:**
- Issue: `server/services/handlers.ts` line 203 creates draft state with a hardcoded `'snapshot_v1'` string instead of the actual `leagueSnapshot.snapshotId`. The comment reads `// TODO: Use actual snapshot ID`.
- Files: `server/services/handlers.ts`
- Impact: `DraftState.leagueSnapshotId` is always `'snapshot_v1'` regardless of actual snapshot
- Fix approach: Pass `leagueSnapshot.snapshotId` from `server/index.ts` through to the handler

**Duplicate reliability factor implementations:**
- Issue: `calculateReliabilityFactor()` is implemented differently in two places: `server/services/features.ts` (simple `sqrt(gpFactor * mpFactor)` formula) and `server/services/reliability.ts` (sigmoid-based weighted formula using `RELIABILITY_PARAMS` from shared). The `features.ts` version is the one actually used in the player pipeline; `reliability.ts` is imported nowhere in the main pipeline.
- Files: `server/services/features.ts` lines 13–21, `server/services/reliability.ts`
- Impact: The more sophisticated sigmoid-based formula (which aligns with the documented design in `shared/types.ts`) is dead code
- Fix approach: Remove the simplified version in `features.ts`, import and use `calculateReliabilityFactor` from `server/services/reliability.ts`

---

## Known Bugs

**StandingsTable shows raw teamId instead of team name:**
- Symptoms: Standing table displays UUID-style teamId strings instead of human-readable team names
- Files: `client/src/components/StandingsTable.tsx` line 37 — comment says `// TODO: Replace teamId with a human-readable team name once available in the data`
- Trigger: Any regular season standings view
- Workaround: None — users see UUIDs

**Score-winner mismatch (partially fixed):**
- Symptoms: In earlier versions, the displayed score could show the losing team with more points than the winner. A "SCORE GUARD" was added in V3 but the fix uses multiple fallback clauses, suggesting the root calculation was not corrected.
- Files: `server/services/simulation.ts` lines 339–357 (SCORE GUARD implementation)
- Trigger: Edge cases in `generateGameScores()` when base spread + variance produces negative spread
- Workaround: Score guard adds 1+ points to winner after the fact

**`socket.io-client` version mismatch:**
- Symptoms: Root `package.json` devDependencies specifies `socket.io-client: ^4.8.3` while `client/package.json` specifies `socket.io-client: ^4.6.1` and server uses `socket.io: ^4.7.4`. Minor version incompatibility may cause subtle protocol differences.
- Files: `package.json`, `client/package.json`, `server/package.json`

---

## Security Considerations

**No authentication beyond ephemeral cookies:**
- Risk: Any user can join any lobby by guessing or sharing an invite code. Commissioner role is trust-based (first creator). No server-side auth tokens.
- Files: `server/managers/sessionManager.ts`, `server/managers/socketManager.ts`
- Current mitigation: 6-character alphanumeric invite codes (`generateInviteCode()` in `lobbyManager.ts`)
- Recommendations: For the expanded Court Vision platform, add user accounts or at minimum signed session tokens

**CORS allowlist is duplicated in two places:**
- Risk: The allowed origins list is defined identically in `server/index.ts` (Express middleware) and `server/managers/socketManager.ts` (Socket.io CORS). If the production URL changes, one location will be missed.
- Files: `server/index.ts` lines 44–56, `server/managers/socketManager.ts` lines 53–68
- Recommendations: Extract to a shared constant or env var

**Session cookie not HttpOnly in all code paths:**
- The `/api/session` REST endpoint sets a cookie via Express. The Socket.io middleware reads it but the session created via the REST endpoint uses `temp_${Date.now()}` as userId (not a proper UUID), then the Socket.io middleware creates a real session separately. The two session creation paths are inconsistent.
- Files: `server/index.ts` lines 111–121

**`onAny` debug logger in production:**
- `socket.onAny((eventName, ...args) => console.log(...))` is registered unconditionally in `socketManager.ts` line 108. Every WebSocket event from every client is logged to stdout in production.
- Files: `server/managers/socketManager.ts`

---

## Performance Bottlenecks

**Player data loaded synchronously at server startup:**
- Problem: `fetchPlayerData('2025-26')` spawns a Python child process; if the Python environment is not available or the NBA API is slow, server startup blocks and can timeout
- Files: `server/index.ts`, `scripts/scraper.ts`
- Cause: Entire player dataset (potentially 400+ players) is processed in the startup path before the server begins listening
- Improvement path: Cache the processed `LeagueSnapshot` to disk; skip reprocessing if snapshot is fresh

**Monte Carlo simulation is synchronous and runs 100 iterations per matchup:**
- Problem: `simulateMatchup()` runs a tight loop 100 times. For a 12-team league with 6 matchups per round, that's 600 simulation calls per round, all blocking the Node.js event loop.
- Files: `server/services/simulation.ts`
- Cause: No async, no worker threads
- Improvement path: Move simulation to a worker thread pool or reduce `NUM_SIMULATIONS` for non-playoff games

**All state in process memory — no persistence:**
- Problem: Any server restart (deploy, crash, OOM) destroys all active leagues, lobbies, sessions
- Files: `server/stores/leagueStore.ts`, `server/managers/sessionManager.ts`
- Cause: Explicit design choice (commented in `sessionManager.ts`: "In production, this would use Redis or similar")
- Improvement path: Add Redis for session and league state persistence

---

## Fragile Areas

**`coachingTimerManager` mutates state directly:**
- Files: `server/managers/coachingTimerManager.ts` lines 39–41
- Why fragile: The timer mutates `league.roundState.phase` and `league.roundState.coachingWindowEndsAt` directly on the object reference rather than going through `leagueStore.update()`. This bypasses the store's update mechanism and could cause race conditions if the store is ever made concurrent.
- Safe modification: Always use `leagueStore.update(lobbyId, { roundState: { ...existing, phase: newPhase } })` pattern

**Client routing depends on `league.liveGame` being set:**
- Files: `client/src/App.tsx` `GameRouting` component
- Why fragile: The navigation logic checks `league.liveGame` and `league.roundState?.phase` to redirect between pages. If these fields are set in inconsistent states (e.g., `liveGame` set but `phase` not updated), users get redirected in loops. There are already multiple `// FIX:` comments around state sync between `league` and `draft`.
- Test coverage: None

**`draft` and `league.draftState` are both tracked separately in AppContext:**
- Files: `client/src/context/AppContext.tsx`
- Why fragile: Client stores `draft: DraftState | null` and separately syncs it from `league.draftState` in TRADE_EXECUTED and LEAGUE_UPDATED handlers. Comments say "CRITICAL: Sync draft state from league.draftState". If any event updates roster data without touching both, UI shows stale rosters.
- Safe modification: Do not add new roster-mutation events without also updating `draft` from `league.draftState`

---

## Scaling Limits

**In-memory session store:**
- Current capacity: Single Node process (~500 MB memory typical)
- Limit: Resets on restart; no horizontal scaling possible
- Scaling path: Redis session store (noted in `sessionManager.ts` comment)

**Socket.io single server:**
- Current capacity: One process, no sticky sessions, no Redis adapter
- Limit: Cannot scale horizontally — all lobbies must be on the same process
- Scaling path: Add `@socket.io/redis-adapter`

**Coaching timer `setInterval` per lobby:**
- Each active lobby runs its own `setInterval` in `coachingTimerManager.ts`. With many concurrent lobbies, this accumulates open intervals.
- Limit: No cleanup on coach timer if lobby is abandoned (not all paths call `stopCoachingTimer`)

---

## Dependencies at Risk

**Python dependency for player data:**
- Risk: Server boot requires Python with `nba_api` library. If Python is absent, deployment falls back to `data/sample_players.json` which may be stale.
- Impact: Live NBA stats unavailable; players shown are from the fallback JSON timestamp
- Migration plan: Pre-generate and cache the processed `LeagueSnapshot` JSON on disk; remove Python runtime requirement from production deployment

**`nba_api` (unofficial NBA API client):**
- Risk: Unofficial third-party Python library that scrapes NBA.com. Could break if NBA changes their API.
- Impact: Server fails to load current player stats; falls back to sample data
- Migration plan: Alternative data source (Basketball Reference via their API, or licensed stats provider)

---

## Missing Critical Features

**No persistence:**
- Problem: Server restart destroys all active game state. A deployment during an active game loses everything.
- Blocks: Production reliability; cannot deploy without downtime during active games

**Quarter-based game simulation not wired to round system:**
- Problem: The V3 quarter-based `LiveGameState` system exists in types and `coachingTimerManager`, but the actual quarter simulation (`simulateQuarter`, `simulateQuarterBasedGame`) is not called from `handleStartRound` or `handleSimulateRound`. The `QuarterCoachingPage` listens for `game:quarter_coaching_window` events that are never emitted by the current round flow.
- Blocks: The live quarter-by-quarter coaching experience is not yet playable end-to-end

**No team name display in standings:**
- Problem: `StandingsTable.tsx` shows raw teamId UUIDs (noted with TODO comment)
- Blocks: Readable standings for players

**`SUBMIT_QUARTER_COACHING` and `READY_FOR_QUARTER` events registered in shared types but not handled in socketManager:**
- Files: `shared/types.ts` lines 644–645 (ClientMessage union), `server/managers/socketManager.ts` (no handler registered)
- Problem: Client can emit these events but server will silently ignore them

---

## Test Coverage Gaps

**Simulation engine:**
- What's not tested: `simulateMatchup()`, `simulateQuarter()`, `simulateQuarterBasedGame()`, `generateGameScores()`
- Files: `server/services/simulation.ts`
- Risk: Score guard edge cases, coaching modifier math errors, and Monte Carlo distribution skew go undetected
- Priority: High

**Player pipeline:**
- What's not tested: `buildPlayerFeatures()`, `computeArchetypeProfile()`, `calculateReliabilityFactor()`, `aggregateTeam()`
- Files: `server/services/features.ts`, `server/services/archetypes.ts`, `server/services/aggregation.ts`
- Risk: Feature regressions would silently change player ratings and draft pick values
- Priority: High

**Phase state machine:**
- What's not tested: All `leagueManager.ts` transition functions (`transitionToDraftRecap`, `startRegularSeason`, `startPlayoffs`, `completeLeague`)
- Files: `server/managers/leagueManager.ts`
- Risk: Invalid phase transitions could corrupt a live league; currently caught only at runtime
- Priority: High

**Round scheduling:**
- What's not tested: `generateRoundSchedule()`, `calculateTotalRounds()`, round-robin rotation algorithm
- Files: `server/managers/roundManager.ts`
- Risk: Odd team counts, bye scheduling, double round-robin schedule correctness
- Priority: Medium

**Trade validation:**
- What's not tested: `validateTradeProposal()`, `executeTradeProposal()`, proposal expiry
- Files: `server/managers/tradeProposalManager.ts`
- Risk: Invalid trades could silently succeed or valid trades silently fail
- Priority: Medium

---

*Concerns audit: 2026-03-09*

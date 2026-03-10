# Phase 1: Foundation and Bug Fixes - Research

**Researched:** 2026-03-09
**Domain:** TypeScript monorepo bug fixes, React SPA rebrand, Tailwind design tokens
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FOUND-01 | Codebase rebranded to Court Vision (app name, page titles, meta tags, repo identity) | Exact files requiring changes are identified: `client/index.html`, `client/src/App.tsx`, any remaining "NBA Draft Sim" strings in UI text and meta tags |
| FOUND-02 | Court Vision visual identity: color tokens, typography scale, Tailwind theme configured in a design system layer | Tailwind 3.4 `theme.extend` pattern in `tailwind.config.js` (file currently absent — must be created); existing Tailwind prose classes are utility-only with no custom tokens |
| FOUND-03 | Coaching simulation bug fixed — `handleSimulateRoundInternal` uses real `TeamAggregation` objects | Bug is in `server/services/handlers-v2.ts` lines 240–296; fix pattern is already demonstrated in `handleSimulateRound` at lines 301–346 in the same file |
| FOUND-04 | Quarter-by-quarter coaching WebSocket events wired — `SUBMIT_QUARTER_COACHING` and `READY_FOR_QUARTER` handled in `socketManager.ts` | `SUBMIT_QUARTER_COACHING` maps to `WS_EVENTS.SUBMIT_QUARTER_COACHING = 'game:submit_quarter_coaching'`; both are defined in `shared/types.ts` but no `socket.on()` registration exists in `socketManager.ts` |
| FOUND-05 | Homepage shows all three role lenses (Player IQ, Coach IQ, GM IQ) immediately on load | `client/src/App.tsx` route `/` renders `LobbyPage` — must become a Court Vision homepage component; `GameRouting` auto-redirect logic must not fire for homepage visitors |
| FOUND-06 | Top-level navigation allows fluid browsing across all three role lenses without locking user into one | No navigation component currently exists; App.tsx is a single-context routing state machine; a `NavBar` or top-level layout shell needs to be added |
</phase_requirements>

---

## Summary

Phase 1 is a surgical codebase operation with zero new dependencies. Every task targets a known file with a known fix. The coaching simulation bug (`handleSimulateRoundInternal`) has an identical working counterpart in the same file (`handleSimulateRound`) — the fix is to pass `allPlayers` as a module-level closure or parameter, exactly as the public version does. The quarter WebSocket gap is a missing `socket.on()` registration in `socketManager.ts` — the event names already exist in `WS_EVENTS`, the types exist in `shared/types.ts`, and the client page (`QuarterCoachingPage.tsx`) already emits these events; only the server-side handler registrations are missing.

The rebrand (FOUND-01, FOUND-02) is a file-by-file find-and-replace plus adding a `tailwind.config.js` with Court Vision design tokens. The homepage (FOUND-05, FOUND-06) requires replacing the `LobbyPage` default route with a new `HomePage` component that renders three visible role-lens lanes — the routing logic in `GameRouting` must be guarded to not redirect a fresh visitor to the draft flow.

No new npm packages are required for any part of this phase. The testing approach is Vitest for the simulation correctness regression test (shared workspace already has Vitest configured) and manual browser verification for the UI and WebSocket changes.

**Primary recommendation:** Fix FOUND-03 first (simulation correctness) and add the regression test before touching any UI work. This validates the engine is correct before the rebrand is layered on top.

---

## Standard Stack

### Core (no changes from existing)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.2–5.3 | All packages | Already in use; strict mode throughout |
| React | 18.2 | Client SPA | Existing; no change |
| Tailwind CSS | 3.4 | Utility styling | Existing; `tailwind.config.js` must be created for token extension |
| Socket.io | 4.7 (server) / 4.6 (client) | WebSocket layer | Existing; quarter events route through this |
| Vitest | 4.x | Testing | Already installed in shared workspace; run with `npm test --workspace=shared` |

### No New Dependencies Required
This phase introduces zero new npm packages. All work is configuration, bug fixes, and new React components using existing primitives.

**Installation:** None needed.

---

## Architecture Patterns

### Recommended Project Structure (additions only)

```
client/src/
├── pages/
│   └── HomePage.tsx          # NEW: replaces LobbyPage at route /
├── components/
│   └── NavBar.tsx            # NEW: top-level navigation across three role lenses
└── (existing structure unchanged)

client/
└── tailwind.config.js        # NEW: Court Vision design tokens (currently absent)

shared/
└── utils.test.ts             # EXTEND: add simulation correctness regression tests
```

### Pattern 1: allPlayers Closure for handleSimulateRoundInternal

**What:** `handleSimulateRoundInternal` must access the `allPlayers` array without receiving it as a call-site parameter (because the call site in `handleSubmitCoaching` does not have access to it). The correct approach mirrors how `socketManager.ts` passes `allPlayers` as a closure to all handlers: pass `allPlayers` into a factory/init function that creates the handler, or store `allPlayers` in a module-level variable accessible to `handlers-v2.ts`.

**When to use:** Whenever a handler that fires automatically (timer-triggered or all-decisions-in trigger) needs the player universe.

**Example (the working counterpart in the same file):**
```typescript
// Source: server/services/handlers-v2.ts lines 301–346
export function handleSimulateRound(
  io: SocketServer,
  lobbyId: string,
  teamIds: string[],
  allPlayers: Player[]
) {
  // ...
  for (const team of league.draftState.teams) {
    const roster = team.roster
      .map(pid => allPlayers.find(p => p.playerId === pid))
      .filter((p): p is Player => p !== undefined);

    if (roster.length > 0) {
      const aggregation = aggregateTeam(roster, team.teamId);
      teamAggregations.set(team.teamId, aggregation);
      teamNames.set(team.teamId, team.displayName);
    }
  }
  // ...
}
```

**Fix strategy:** The simplest approach is to add an `initHandlersV2(allPlayers: Player[])` export to `handlers-v2.ts` that stores `allPlayers` in a module-level variable, and call it from `socketManager.ts` (which already receives `allPlayers` in `initializeSocketServer`). This mirrors the pattern implicitly used for `handlers.ts` via the `allPlayers` parameter on `handleStartRegularSeason` and `handleStartDraft`.

### Pattern 2: WebSocket Event Registration

**What:** Every `socket.on(WS_EVENTS.X, ...)` registration in `socketManager.ts` follows the same structure. Adding `SUBMIT_QUARTER_COACHING` and `READY_FOR_QUARTER` requires creating handler functions and registering them inside `io.on(WS_EVENTS.CONNECT, (socket) => { ... })`.

**When to use:** Any new server-side WebSocket event handler.

**Example (existing pattern from socketManager.ts):**
```typescript
// Source: server/managers/socketManager.ts lines 236–238
socket.on(WS_EVENTS.SUBMIT_COACHING_DECISION, (payload: any) => {
  handleSubmitCoaching(io, socket, payload, userId);
});
```

**Quarter coaching handlers must:**
1. Validate that a `liveGame` exists for the `lobbyId`
2. Store or apply the decision to the `LiveGameState` in `leagueStore`
3. Emit `QUARTER_RESULT` when the quarter simulation completes
4. Emit `GAME_FINAL` after Q4 completes

### Pattern 3: Tailwind Design Token Extension

**What:** Court Vision visual identity requires a `tailwind.config.js` at `client/tailwind.config.js`. Currently this file does not exist — Tailwind is running with default config. Tokens must be added to `theme.extend` (not `theme` override) to preserve utility classes.

**When to use:** Any project-specific color, typography, or spacing values.

**Example:**
```javascript
// Source: Tailwind CSS 3.4 official docs — theme.extend pattern
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        'cv-court': '#1a472a',        // deep court green
        'cv-hardwood': '#c8a96e',     // hardwood amber
        'cv-chalk': '#f5f0e8',        // chalk white
        'cv-steel': '#1e293b',        // dark steel (backgrounds)
        'cv-accent': '#f97316',       // bright orange (CTAs)
      },
      fontFamily: {
        display: ['"Inter"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
```

**Note:** Exact color values are in Claude's discretion (FOUND-02). The palette above is a starting suggestion — adjust to match the intended Court Vision identity. The pattern (using `theme.extend` with `cv-` prefix for all custom tokens) is mandatory to avoid breaking existing Tailwind prose.

### Pattern 4: React Route Restructure for Homepage

**What:** `client/src/App.tsx` must add a `HomePage` component at `/` that is distinct from the draft-sim flow. The `GameRouting` auto-redirect logic only fires when `league` state is set — a fresh visitor (no `league`) will not be redirected. However, the current `/` route renders `LobbyPage` which is the draft-sim lobby creation form. This must be replaced.

**When to use:** Replacing the default route without breaking existing draft-sim routes.

```typescript
// Pattern: add HomePage route, push LobbyPage to /lobby
// App.tsx Routes change:
<Route path="/" element={<HomePage />} />          // NEW
<Route path="/lobby" element={<LobbyPage />} />    // MOVED from "/"
<Route path="/browse" element={<LobbyBrowserPage />} />
// ... rest unchanged
```

**GameRouting guard:** `GameRouting` already checks `if (!league) return;` before any redirect — homepage visitors with no active league state are unaffected.

### Anti-Patterns to Avoid

- **Touching `handlers.ts` or `handlers-v2.ts` handler logic beyond the allPlayers fix:** The handler split is acknowledged tech debt. Phase 1 fixes the bug; architectural consolidation is out of scope and risks introducing new bugs.
- **Adding Redux or Zustand for homepage state:** The three role lens lanes are static content. No state management library is needed; local `useState` is sufficient.
- **Overriding `theme` instead of `theme.extend` in tailwind.config.js:** Overriding `theme` removes all built-in utilities. Always use `theme.extend`.
- **Using `socket.emit` for READY_FOR_QUARTER without validating game state:** The client emits this from `QuarterCoachingPage`; the server handler must guard against missing `liveGame` before attempting to advance the quarter.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Simulation correctness test | Custom test runner script | Vitest (already installed in shared workspace) | Vitest is already wired; `npm test --workspace=shared` already works |
| Design tokens | Inline hex values in every component | `tailwind.config.js` `theme.extend.colors` | Tokens defined once, used everywhere as `bg-cv-court` etc. |
| WebSocket event name strings | Literal `'game:submit_quarter_coaching'` in handlers | `WS_EVENTS.SUBMIT_QUARTER_COACHING` from shared | Already defined; string literals break when names change |
| Type definitions for quarter events | New interfaces | Existing `CoachingDecision`, `LiveGameState`, `QuarterResult` in `shared/types.ts` | Already defined; Phase 1 does not change the data model |

---

## Common Pitfalls

### Pitfall 1: allPlayers Not Available in handleSimulateRoundInternal Call Path
**What goes wrong:** `handleSubmitCoaching` calls `handleSimulateRoundInternal(io, lobbyId)` without `allPlayers` when all decisions are submitted simultaneously. The internal function then creates stub aggregations with `overallRating: 50` and empty features, making every team equal and coaching decisions irrelevant.
**Why it happens:** `allPlayers` is passed to `initializeSocketServer` as a closure parameter but not threaded into the auto-sim path. The "all-in" trigger happens inside `handleSubmitCoaching` which doesn't receive `allPlayers`.
**How to avoid:** Store `allPlayers` at module level in `handlers-v2.ts` via an `initHandlersV2(players)` call at startup. The value never changes after server boot (it's the `LeagueSnapshot` player universe), so module-level storage is safe.
**Warning signs:** Auto-sim always produces 50/50-ish win rates regardless of team quality; high-rated teams don't beat low-rated teams with statistical significance.

### Pitfall 2: GameRouting Redirects Away from New Homepage
**What goes wrong:** If `league` state is somehow non-null for a fresh visitor (e.g., they rejoined an existing lobby), `GameRouting` will redirect them away from `/`. This is pre-existing behavior.
**Why it happens:** `GameRouting` fires on every `league` state change regardless of route.
**How to avoid:** `GameRouting` already has `if (!league) return;` — homepage visitors without an active league will not be redirected. Visitors who rejoin an existing lobby will be redirected to the appropriate game phase, which is correct behavior. No additional guard is needed.
**Warning signs:** Homepage briefly flashes before redirect; this is expected for rejoin scenarios.

### Pitfall 3: READY_FOR_QUARTER Has No WS_EVENTS Entry
**What goes wrong:** `READY_FOR_QUARTER` is in the `ClientMessage` union type but does NOT appear in the `WS_EVENTS` const object (confirmed by search). The client would need to use a raw string `'game:ready_for_quarter'` or the type needs to be added.
**Why it happens:** The V3 quarter system was partially implemented — types were added to the union but the WS_EVENTS const was not updated.
**How to avoid:** Add `READY_FOR_QUARTER: 'game:ready_for_quarter'` to `WS_EVENTS` in `shared/types.ts` before registering the handler. Rebuild shared package (`npm run build --workspace=shared`) before server uses it.
**Warning signs:** TypeScript will error if you try to use `WS_EVENTS.READY_FOR_QUARTER` without adding the entry.

### Pitfall 4: tailwind.config.js Content Glob Missing New Files
**What goes wrong:** If `HomePage.tsx` or `NavBar.tsx` are placed in a path not covered by the `content` glob in `tailwind.config.js`, Tailwind will not generate CSS for classes used in those files.
**Why it happens:** New config file with a narrower-than-needed content path.
**How to avoid:** Use `'./src/**/*.{ts,tsx}'` as the content glob — this covers all current and future files under `src/`.

### Pitfall 5: Regression Test Must Use Monte Carlo Sample Size
**What goes wrong:** A small simulation sample (e.g., 10 runs) may not produce statistically significant difference between a high-rated team and a 50-rated stub team, causing a flaky test.
**Why it happens:** Monte Carlo simulation has variance; small samples are noisy.
**How to avoid:** Run 1000+ simulations in the regression test. With `overallRating: 90` vs `overallRating: 50`, the win rate should be > 65% with p < 0.01 after 1000 samples. Threshold the assertion at 60% to be conservative but still meaningful.

---

## Code Examples

Verified patterns from codebase direct analysis:

### The Broken Auto-Sim Path (lines 240–296 of handlers-v2.ts)
```typescript
// Source: server/services/handlers-v2.ts (bug location)
function handleSimulateRoundInternal(io: SocketServer, lobbyId: string) {
  // BUG: No allPlayers access — creates stub aggregations
  teamAggregations.set(team.teamId, {
    teamId: team.teamId,
    features: {},        // empty — no real team data
    archetypes: {},      // empty — no real team data
    modifiers: { ... homeCourtAdvantage: 2 },
    overallRating: 50,   // every team is rated 50 — coaching has zero effect
    rotation: [],
  });
}
```

### The Working Counterpart (same file, lines 301–346)
```typescript
// Source: server/services/handlers-v2.ts (reference implementation)
export function handleSimulateRound(io, lobbyId, teamIds, allPlayers: Player[]) {
  for (const team of league.draftState.teams) {
    const roster = team.roster
      .map(pid => allPlayers.find(p => p.playerId === pid))
      .filter((p): p is Player => p !== undefined);
    if (roster.length > 0) {
      const aggregation = aggregateTeam(roster, team.teamId);  // real aggregation
      teamAggregations.set(team.teamId, aggregation);
    }
  }
}
```

### WebSocket Handler Registration Pattern
```typescript
// Source: server/managers/socketManager.ts lines 236–238
socket.on(WS_EVENTS.SUBMIT_COACHING_DECISION, (payload: any) => {
  handleSubmitCoaching(io, socket, payload, userId);
});
// Add analogously:
socket.on(WS_EVENTS.SUBMIT_QUARTER_COACHING, (payload: any) => {
  handleSubmitQuarterCoaching(io, socket, payload, userId);
});
socket.on(WS_EVENTS.READY_FOR_QUARTER, () => {
  handleReadyForQuarter(io, socket, userId);
});
```

### Vitest Test Pattern (simulation correctness regression)
```typescript
// Source: shared/utils.test.ts (existing test file — extend this file or add server test)
// NOTE: simulateMatchup lives in server/services/simulation.ts
// Regression test should be added to server/ with its own vitest config,
// OR test aggregateTeam + simulateMatchup behavior via integration test.
import { describe, it, expect } from 'vitest';

describe('handleSimulateRoundInternal fix', () => {
  it('real aggregations produce higher win rate than stub aggregations', () => {
    // Run 1000 simulations: high-rated team (overallRating 85) vs stub team (overallRating 50)
    // Assert win rate > 60% for the high-rated team
    let wins = 0;
    for (let i = 0; i < 1000; i++) {
      const result = simulateMatchup(highRatedAgg, stubAgg, 'teamA', 'teamB', {});
      if (result.winner === 'teamA') wins++;
    }
    expect(wins / 1000).toBeGreaterThan(0.60);
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `theme` override in tailwind | `theme.extend` (additive) | Tailwind 2.0+ | Preserving utility classes requires extend |
| String literals for WS events | `WS_EVENTS` const object | Already done in this codebase | No change needed; enforce the existing pattern |
| Default React `<title>` in public/index.html | HTML `<title>` tag | React 18 (no change) | For Phase 1, set title in `index.html`; React Helmet not needed yet |

**Deprecated/outdated:**
- React Helmet for page titles: overkill for Phase 1 single-page rebrand. Just edit `client/index.html` `<title>` tag and add `<meta name="description">`. React Helmet can be added later when per-route titles are needed.

---

## Open Questions

1. **Court Vision color palette specifics**
   - What we know: FOUND-02 requires color tokens and typography scale; no palette has been defined yet
   - What's unclear: Specific hex values for the Court Vision brand
   - Recommendation: This is Claude's discretion per the requirements. A basketball-inspired palette (deep court green, hardwood amber, chalk white, steel backgrounds) is suggested in the Architecture Patterns section. Commit to a palette in Wave 0 before any UI work begins.

2. **Quarter coaching handler behavior scope**
   - What we know: `SUBMIT_QUARTER_COACHING` and `READY_FOR_QUARTER` need server handlers; the client emits them from `QuarterCoachingPage.tsx`
   - What's unclear: The full quarter simulation loop — `simulateQuarter()` exists in `server/services/simulation.ts` but is not called from any handler currently. How much of the quarter-based game loop should FOUND-04 wire up?
   - Recommendation: FOUND-04 success criterion states the game must "advance through quarter transitions without hanging." This means the handlers must: receive the coaching decision, apply it to `LiveGameState`, advance the quarter via `simulateQuarter()`, emit `QUARTER_RESULT`, and emit `GAME_FINAL` at Q4 end. This is the minimal viable wiring to satisfy the success criterion.

3. **`allPlayers` storage approach for handlers-v2**
   - What we know: Module-level storage or factory init are both viable; `socketManager.ts` receives `allPlayers` from `initializeSocketServer`
   - What's unclear: Whether there's a preference for init function vs. passing through call chain
   - Recommendation: Use module-level init (`initHandlersV2(players: Player[])`). This is the lowest-change approach, matches the implicit pattern used for `handleStartRound` (which already receives `allPlayers` from socketManager), and avoids touching every call site.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.x (already installed in shared workspace) |
| Config file | `shared/package.json` `"test": "vitest"` — no separate config file |
| Quick run command | `npm test --workspace=shared` |
| Full suite command | `npm test --workspace=shared` (only test suite currently) |

**Note:** Server-side unit tests (for `simulateMatchup`, `aggregateTeam`) are not yet configured. Adding a Vitest config to the server workspace is a Wave 0 gap if simulation correctness tests are to live in the server package. Alternatively, the regression test can be written as a script in `scripts/` and invoked manually.

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FOUND-03 | Real aggregations produce statistically different outcomes from stub aggregations | unit (simulation correctness) | `npm test --workspace=shared` | ❌ Wave 0 |
| FOUND-04 | SUBMIT_QUARTER_COACHING and READY_FOR_QUARTER advance quarter without hang | integration (manual socket test) | Manual browser test — socket traffic inspection | ❌ Wave 0 |
| FOUND-01 | No "NBA Draft Sim" strings visible in browser tab, headings, meta tags | smoke (manual) | Manual browser check + `grep -r "NBA Draft Sim" client/src/` | Partial (grep exists) |
| FOUND-02 | Color tokens render in browser and are used by components | smoke (manual) | Manual browser check | ❌ Wave 0 |
| FOUND-05 | Homepage shows three role lens lanes on load with no navigation required | smoke (manual) | Manual browser check | ❌ Wave 0 |
| FOUND-06 | Navigation between all three role lenses works | smoke (manual) | Manual browser check | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test --workspace=shared` (shared utils test; fast)
- **Per wave merge:** `npm test --workspace=shared` + manual browser smoke test of affected pages
- **Phase gate:** Full suite green + all 5 success criteria verified manually before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `shared/simulation.test.ts` (or `server/src/__tests__/simulation.test.ts`) — covers FOUND-03 regression
- [ ] Vitest config in server workspace (`server/vitest.config.ts`) — if simulation test lives in server package
- [ ] Manual test checklist document for FOUND-04 WebSocket smoke test

*(Existing `shared/utils.test.ts` covers only `calculateWinPercentage` — it does not cover simulation engine behavior)*

---

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis — `server/services/handlers-v2.ts`, `server/managers/socketManager.ts`, `shared/types.ts`, `client/src/App.tsx`, `client/index.html`, `client/src/pages/QuarterCoachingPage.tsx`
- `.planning/codebase/CONCERNS.md` — confirmed bug locations, tech debt catalog
- `.planning/codebase/ARCHITECTURE.md` — data flow, layer descriptions, handler patterns
- `.planning/codebase/CONVENTIONS.md` — naming, import order, comment style
- `.planning/research/SUMMARY.md` — Phase 1 rationale and fix approach summary
- Tailwind CSS 3.4 official docs pattern — `theme.extend` additive configuration
- Vitest docs — `npm test --workspace=shared` invocation already confirmed working

### Secondary (MEDIUM confidence)
- Tailwind CSS 3.x color token naming conventions (cv- prefix) — standard community pattern; no verification needed for correctness, only for preference

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Bug fix approach (FOUND-03, FOUND-04): HIGH — bug locations confirmed by direct code read; fix pattern demonstrated by adjacent working code in same file
- Rebrand scope (FOUND-01): HIGH — files requiring change identified directly; scope is bounded
- Design token approach (FOUND-02): HIGH (pattern) / MEDIUM (specific values) — Tailwind extension pattern is well-established; exact Court Vision palette values are editorial discretion
- Homepage/navigation (FOUND-05, FOUND-06): HIGH — no technical unknowns; React component + route change with existing patterns

**Research date:** 2026-03-09
**Valid until:** 2026-06-09 (stable stack; no fast-moving dependencies in this phase)

# Testing Patterns

**Analysis Date:** 2026-03-09

## Test Framework

**Runner:**
- Vitest (configured in `shared/package.json`)
- Config: no separate `vitest.config.*` file — uses defaults with `"test": "vitest"` script
- Only available in the `shared` workspace package

**Assertion Library:**
- Vitest built-in (`expect`, `describe`, `it`)

**Run Commands:**
```bash
npm test --workspace=shared        # Run the one test file
npm run build --workspace=shared   # Build shared before testing server
```

## Test File Organization

**Location:**
- Co-located with source: `shared/utils.test.ts` lives next to `shared/utils.ts`
- No test directories (`__tests__/`, `tests/`) — single file only

**Naming:**
- `*.test.ts` suffix

**Structure:**
```
shared/
├── types.ts
├── utils.ts
├── utils.test.ts    ← only test file in the entire codebase
└── index.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect } from 'vitest';
import { calculateWinPercentage } from './utils';

describe('calculateWinPercentage', () => {
  it('should return 0.5 for a 10-10 record', () => {
    const record = { wins: 10, losses: 10 };
    expect(calculateWinPercentage(record)).toBe(0.5);
  });

  it('should return 0 for a 0-0 record', () => {
    const record = { wins: 0, losses: 0 };
    expect(calculateWinPercentage(record)).toBe(0);
  });

  it('should handle fractional results correctly', () => {
    const record = { wins: 1, losses: 2 };
    expect(calculateWinPercentage(record)).toBeCloseTo(0.333333);
  });
});
```

**Patterns:**
- No `beforeEach` / `afterEach` — tests are fully self-contained with inline data
- `toBe` for exact values, `toBeCloseTo` for floating point
- No mocking in the existing test (pure function, no dependencies)

## Mocking

**Framework:** Vitest built-in (`vi.mock`, `vi.fn`) — not currently used

**What to Mock (if tests were added):**
- `Math.random()` — simulation functions use it extensively; mock for deterministic results
- Python scraper child_process in `scripts/scraper.ts` — substitute `data/sample_players.json` path
- Socket.io `io` and `socket` objects — handler tests need mock emitters

**What NOT to Mock:**
- `shared/types.ts` constants — import directly as they are pure data
- Pure computation functions in `server/services/` — test directly with typed inputs

## Fixtures and Factories

**Test Data:**
- No fixture factories currently exist
- `data/sample_players.json` serves as runtime fallback data (not a test fixture per se)
- The validate-solo-draft script at `scripts/validate-solo-draft.mjs` is an integration sanity check, not a unit test

## Coverage

**Requirements:** None enforced (no coverage thresholds configured)

**View Coverage:**
```bash
# Not configured, but vitest supports:
npx vitest run --coverage --workspace=shared
```

## Test Types

**Unit Tests:**
- Only `shared/utils.test.ts` (5 tests for `calculateWinPercentage`)
- Server simulation engine, archetype scoring, feature extraction, reliability shrinkage, team modifiers — all **untested**
- Client AppContext, WebSocket service, page components — **untested**

**Integration Tests:**
- None. `scripts/validate-solo-draft.mjs` is a manual run script, not automated.

**E2E Tests:**
- Not used. No Playwright, Cypress, or similar configured.

## Common Patterns

**Async Testing:**
Not present in current tests. If needed for scraper or socket tests:
```typescript
it('should fetch player data', async () => {
  const players = await fetchPlayerData('2025-26');
  expect(players.length).toBeGreaterThan(0);
});
```

**Error Testing:**
Not present in current tests. Pattern to follow:
```typescript
it('should throw on empty roster', () => {
  expect(() => aggregateTeam([], 'team1')).toThrow('Cannot aggregate empty roster');
});
```

## Gaps Summary

The codebase has near-zero test coverage. The highest-value areas to test first:

1. **`server/services/simulation.ts`** — Monte Carlo engine; `simulateMatchup()` and `generateGameScores()` are the core game mechanic and have a known score-guard bug history. Priority: **High**
2. **`server/services/features.ts`** — 30-feature extraction with reliability shrinkage. Pure function, easy to test. Priority: **High**
3. **`server/services/archetypes.ts`** — Softmax archetype computation; outputs drive the whole team-building system. Priority: **High**
4. **`server/managers/leagueManager.ts`** — Phase transition guards; bad state transitions would corrupt a live game. Priority: **High**
5. **`server/managers/roundManager.ts`** — Round schedule generation, coaching decision collection. Priority: **Medium**
6. **`shared/utils.ts`** — Already tested (5 tests). Priority: **Done**

---

*Testing analysis: 2026-03-09*

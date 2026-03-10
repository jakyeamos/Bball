/**
 * server/src/__tests__/simulation-correctness.test.ts
 *
 * Monte Carlo regression test for the simulation engine.
 *
 * Phase 1 - FOUND-03: Verifies that simulateMatchup produces a win rate > 0.60
 * for a high-rated team (overallRating 85) vs a low-rated team (overallRating 50)
 * with real feature values. Previously, handleSimulateRoundInternal used stub
 * TeamAggregation objects with features: {} causing NaN arithmetic and zero
 * coaching influence. The fix stores allPlayers at module level via initHandlersV2()
 * and builds real aggregations using aggregateTeam() — mirroring handleSimulateRound.
 */

import { describe, it, expect } from 'vitest';
import { simulateMatchup } from '../../services/simulation';
import { TeamAggregation } from '@nba-draft-sim/shared';

// ---------------------------------------------------------------------------
// Helper: build a TeamAggregation directly with realistic feature values.
// Using direct construction avoids needing a full Player + aggregateTeam chain
// in the test environment, keeping the test hermetic.
// ---------------------------------------------------------------------------

function buildHighRatedAgg(): TeamAggregation {
  return {
    teamId: 'teamHigh',
    features: {
      // Shooting
      R: 1.0,
      TS: 0.60,           // elite (top-tier)
      THREE_P_PCT: 0.38,
      THREE_PA_RATE: 0.42,
      TWO_P_PCT: 0.52,
      TWO_PA_RATE: 0.58,
      FT_PCT: 0.80,
      FT_RATE: 0.28,
      EFG: 0.56,
      THREE_P_VOLUME: 900,
      // Playmaking
      AST: 28,
      AST_RATE: 0.62,
      POTENTIAL_AST: 0.18,
      AST_TO_PASS_RATE: 0.15,
      SECONDARY_AST: 0.05,
      PAR: 0.70,
      // Ball security
      TOV: 12,
      TOV_RATE: 0.12,
      A2T: 2.2,
      // Defense
      STL: 9,
      BLK: 5,
      STL_RATE: 0.02,
      BLK_RATE: 0.03,
      DEFLECTIONS: 3,
      PF_RATE: 0.12,
      CHARGES_DRAWN: 0.4,
      // Rebounding
      OREB_PCT: 0.28,
      DREB_PCT: 0.74,
      REB_TOTAL: 48,
      // Usage
      USG: 0.22,
      VI: 0.65,
    },
    archetypes: {} as any,
    modifiers: {
      total: 2.5,
      shootBonus: 0.8,
      creatorPen: 0,
      rimPen: 0,
      offenseBonus: 1.2,
      offensePenalty: 0,
      defenseBonus: 0.8,
      defensePenalty: 0,
      variancePenalty: 0,
      homeCourtAdvantage: 2,
    },
    overallRating: 85,
    rotation: [
      { playerId: 'p1', name: 'Star Guard', impactRating: 85 },
      { playerId: 'p2', name: 'Wing', impactRating: 80 },
      { playerId: 'p3', name: 'Big', impactRating: 75 },
    ],
  };
}

function buildStubAgg(): TeamAggregation {
  return {
    teamId: 'teamStub',
    // Empty features — as produced by the buggy handleSimulateRoundInternal.
    // With features: {}, key values like TS are undefined, causing NaN
    // in computeTeamRatings: `team.features.TS - 0.56` → NaN. Both muA and
    // muB become NaN, so `scoreA > NaN` is always false → winsA = 0.
    features: {} as any,
    archetypes: {} as any,
    modifiers: {
      total: 0,
      shootBonus: 0,
      creatorPen: 0,
      rimPen: 0,
      offenseBonus: 0,
      offensePenalty: 0,
      defenseBonus: 0,
      defensePenalty: 0,
      variancePenalty: 0,
      homeCourtAdvantage: 2,
    },
    overallRating: 50,
    rotation: [],
  };
}

function buildLowRatedAgg(): TeamAggregation {
  return {
    teamId: 'teamLow',
    features: {
      R: 1.0,
      TS: 0.54,           // below average
      THREE_P_PCT: 0.33,
      THREE_PA_RATE: 0.30,
      TWO_P_PCT: 0.46,
      TWO_PA_RATE: 0.70,
      FT_PCT: 0.72,
      FT_RATE: 0.22,
      EFG: 0.50,
      THREE_P_VOLUME: 500,
      AST: 20,
      AST_RATE: 0.50,
      POTENTIAL_AST: 0.10,
      AST_TO_PASS_RATE: 0.09,
      SECONDARY_AST: 0.03,
      PAR: 0.60,
      TOV: 15,
      TOV_RATE: 0.16,
      A2T: 1.5,
      STL: 7,
      BLK: 3,
      STL_RATE: 0.015,
      BLK_RATE: 0.02,
      DEFLECTIONS: 1.5,
      PF_RATE: 0.16,
      CHARGES_DRAWN: 0.2,
      OREB_PCT: 0.22,
      DREB_PCT: 0.68,
      REB_TOTAL: 42,
      USG: 0.20,
      VI: 0.50,
    },
    archetypes: {} as any,
    modifiers: {
      total: 0,
      shootBonus: 0,
      creatorPen: 0,
      rimPen: 0,
      offenseBonus: 0,
      offensePenalty: 0,
      defenseBonus: 0,
      defensePenalty: 0,
      variancePenalty: 0,
      homeCourtAdvantage: 2,
    },
    overallRating: 50,
    rotation: [
      { playerId: 'p4', name: 'Bench Guard', impactRating: 50 },
      { playerId: 'p5', name: 'Bench Wing', impactRating: 48 },
      { playerId: 'p6', name: 'Bench Big', impactRating: 46 },
    ],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('simulation-correctness', () => {
  /**
   * Phase 1 - FOUND-03: High-rated team beats low-rated team with real feature values.
   * handleSimulateRoundInternal now uses aggregateTeam() so all teams receive
   * proper feature vectors — no more stubs with features: {} that cause NaN.
   */
  it('simulateMatchup: high-rated team (overallRating 85) beats low-rated team (overallRating 50) > 60% of the time', () => {
    const highAgg = buildHighRatedAgg();
    const lowAgg = buildLowRatedAgg();

    let winsA = 0;
    const RUNS = 1000;

    for (let i = 0; i < RUNS; i++) {
      const result = simulateMatchup(highAgg, lowAgg, null, undefined, undefined, 1, i);
      if (result.winner === 'A') winsA++;
    }

    const winRate = winsA / RUNS;

    // Real aggregations produce valid float arithmetic; the high-rated team's
    // superior TS, AST, and STL/BLK features push its ORtg above the low team.
    expect(winRate).toBeGreaterThan(0.60);
  });

  /**
   * GREEN validation: verifies the simulation engine is correct when both teams
   * have proper feature values. After Task 2's fix, handleSimulateRoundInternal
   * builds real aggregations for all teams, making the internal sim path
   * equivalent to this test's setup.
   *
   * Uses a wide feature gap (elite TS 0.65 vs poor TS 0.50, plus big AST/TOV
   * differences) to reliably exceed the 60% win rate threshold despite variance.
   */
  it('simulateMatchup: high-rated team (overallRating 85) beats properly-aggregated low-rated team (overallRating 50) > 60% of the time', () => {
    // Elite team: notably better TS, AST, and lower TOV to produce clear ORtg lead
    const highAgg = {
      ...buildHighRatedAgg(),
      features: {
        ...buildHighRatedAgg().features,
        TS: 0.65,            // elite efficiency
        AST: 35,             // highly ball-moving
        TOV: 10,             // low turnover rate
        THREE_PA_RATE: 0.45, // high 3-point volume
        FT_RATE: 0.32,
      },
    } as ReturnType<typeof buildHighRatedAgg>;

    // Poor team: below-average across the board
    const lowAgg = {
      ...buildLowRatedAgg(),
      features: {
        ...buildLowRatedAgg().features,
        TS: 0.50,            // poor efficiency
        AST: 15,             // low creation
        TOV: 18,             // high turnovers
        THREE_PA_RATE: 0.25,
        FT_RATE: 0.18,
      },
    } as ReturnType<typeof buildLowRatedAgg>;

    let winsA = 0;
    const RUNS = 1000;

    for (let i = 0; i < RUNS; i++) {
      const result = simulateMatchup(highAgg, lowAgg, null, undefined, undefined, 1, i);
      if (result.winner === 'A') winsA++;
    }

    const winRate = winsA / RUNS;
    expect(winRate).toBeGreaterThan(0.60);
  });
});

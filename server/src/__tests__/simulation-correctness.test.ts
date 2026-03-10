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
 *
 * Bug detail: with features: {}, key values like TS are undefined, causing NaN
 * in computeTeamRatings: `team.features.TS - 0.56` → NaN. Both muA and muB
 * become NaN, so `scoreA > NaN` is always false → winsA = 0 → 0% win rate.
 *
 * Test design note: both teams have equal defensive stats (BLK, STL, REB_TOTAL)
 * so the defensive interaction term cancels out, and the TS/AST/TOV offensive
 * differential (dominant in the ORtg formula) drives the win rate differential.
 */

import { describe, it, expect } from 'vitest';
import { simulateMatchup } from '../../services/simulation';
import { TeamAggregation } from '@nba-draft-sim/shared';

// ---------------------------------------------------------------------------
// Both teams have EQUAL defensive stats. This neutralizes the DRtg interaction
// term (DEF_INTERACTION * (DRtg - BASE_DRTG) is equal for both teams) so
// only the offensive differential (TS, AST, TOV) drives the outcome.
// ---------------------------------------------------------------------------

const EQUAL_DEFENSE = {
  STL: 8,
  BLK: 4,
  STL_RATE: 0.016,
  BLK_RATE: 0.025,
  DEFLECTIONS: 2,
  PF_RATE: 0.14,
  CHARGES_DRAWN: 0.3,
  OREB_PCT: 0.24,
  DREB_PCT: 0.70,
  REB_TOTAL: 44,
};

function buildHighRatedAgg(): TeamAggregation {
  return {
    teamId: 'teamHigh',
    features: {
      R: 1.0,
      // --- Offense: elite ---
      TS: 0.65,           // dominant ORtg term: (0.65 - 0.56) * 30 = +2.7
      THREE_P_PCT: 0.38,
      THREE_PA_RATE: 0.45, // (0.45 - 0.35) * 15 = +1.5
      TWO_P_PCT: 0.52,
      TWO_PA_RATE: 0.55,
      FT_PCT: 0.82,
      FT_RATE: 0.32,       // (0.32 - 0.25) * 8 = +0.56
      EFG: 0.58,
      THREE_P_VOLUME: 950,
      AST: 35,             // 35/10 * 2.5 = 8.75
      AST_RATE: 0.65,
      POTENTIAL_AST: 0.20,
      AST_TO_PASS_RATE: 0.16,
      SECONDARY_AST: 0.06,
      PAR: 0.72,           // (0.72 - 0.60) * 1.5 = +0.18
      TOV: 10,             // 10/5 * -3 = -6
      TOV_RATE: 0.10,
      A2T: 2.5,
      VI: 0.68,
      USG: 0.23,
      ...EQUAL_DEFENSE,
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
    overallRating: 85,
    rotation: [
      { playerId: 'p1', name: 'Star Guard', impactRating: 85 },
      { playerId: 'p2', name: 'Wing', impactRating: 80 },
      { playerId: 'p3', name: 'Big', impactRating: 75 },
    ],
  };
}

function buildLowRatedAgg(): TeamAggregation {
  return {
    teamId: 'teamLow',
    features: {
      R: 1.0,
      // --- Offense: poor ---
      TS: 0.50,           // (0.50 - 0.56) * 30 = -1.8
      THREE_P_PCT: 0.32,
      THREE_PA_RATE: 0.25, // (0.25 - 0.35) * 15 = -1.5
      TWO_P_PCT: 0.44,
      TWO_PA_RATE: 0.75,
      FT_PCT: 0.70,
      FT_RATE: 0.18,       // (0.18 - 0.25) * 8 = -0.56
      EFG: 0.48,
      THREE_P_VOLUME: 450,
      AST: 15,             // 15/10 * 2.5 = 3.75
      AST_RATE: 0.45,
      POTENTIAL_AST: 0.08,
      AST_TO_PASS_RATE: 0.07,
      SECONDARY_AST: 0.02,
      PAR: 0.58,           // (0.58 - 0.60) * 1.5 = -0.03
      TOV: 18,             // 18/5 * -3 = -10.8
      TOV_RATE: 0.18,
      A2T: 1.2,
      VI: 0.46,
      USG: 0.19,
      ...EQUAL_DEFENSE,   // identical defense — cancels out in DRtg interaction
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
   * Phase 1 - FOUND-03: Core Monte Carlo regression test.
   *
   * Verifies simulateMatchup produces a win rate > 0.60 for a high-rated team
   * (TS 0.65, AST 35, TOV 10) vs a low-rated team (TS 0.50, AST 15, TOV 18)
   * over 1000 runs. Both teams share identical defensive stats so the DRtg
   * interaction term cancels out, isolating the offensive differential.
   *
   * ORtg high vs ORtg low (from TS alone): (0.65 - 0.56) * 30 - (0.50 - 0.56) * 30
   * = 2.7 - (-1.8) = +4.5 ORtg advantage for the high team.
   *
   * This test would fail at ~0% if features: {} stubs were passed (NaN arithmetic).
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

    // ORtg advantage ~4.5 from TS gap alone. Win rate is consistently > 0.60.
    expect(winRate).toBeGreaterThan(0.60);
  });
});

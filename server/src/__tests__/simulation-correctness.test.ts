import { describe, expect, it } from 'vitest';
import { TeamAggregation } from '@nba-draft-sim/shared';
import { simulateMatchup } from '../../services/simulation';

function buildAgg(
  teamId: string,
  overallRating: number,
  offenseBias: number,
  defenseBias: number,
): TeamAggregation {
  const perimeterDefense = 0.46 + defenseBias * 0.18;
  const rimDefense = 0.44 + defenseBias * 0.18;
  const turnoverPressure = 0.43 + defenseBias * 0.15;
  const transitionDefense = 0.46 + defenseBias * 0.16;
  const defensiveReboundRate = 0.70 + defenseBias * 0.06;
  return {
    teamId,
    features: {
      R: 1.0,
      TS: 0.56 + offenseBias * 0.08,
      THREE_P_PCT: 0.34 + offenseBias * 0.03,
      THREE_PA_RATE: 5 + offenseBias * 4,
      TWO_P_PCT: 0.50 + offenseBias * 0.04,
      TWO_PA_RATE: 9 - offenseBias * 2,
      FT_PCT: 0.76,
      FT_RATE: 0.20 + offenseBias * 0.06,
      EFG: 0.52 + offenseBias * 0.05,
      THREE_P_VOLUME: 5 + offenseBias * 4,
      AST: 4 + offenseBias * 3,
      AST_RATE: 20 + offenseBias * 8,
      POTENTIAL_AST: 7 + offenseBias * 4,
      AST_TO_PASS_RATE: 0.10 + offenseBias * 0.03,
      SECONDARY_AST: 1 + offenseBias * 1.2,
      PAR: 0.60 + offenseBias * 0.08,
      TOV: 2.6 - offenseBias * 0.6,
      TOV_RATE: 12 - offenseBias * 2.5,
      A2T: 1.6 + offenseBias,
      STL: 1 + defenseBias * 0.5,
      BLK: 0.8 + defenseBias * 0.4,
      STL_RATE: 1.4 + defenseBias * 0.5,
      BLK_RATE: 1.1 + defenseBias * 0.4,
      DEFLECTIONS: 2 + defenseBias,
      PF_RATE: 2.4 - defenseBias * 0.4,
      CHARGES_DRAWN: 0.2 + defenseBias * 0.1,
      OREB_PCT: 5 + offenseBias * 2,
      DREB_PCT: 18 + defenseBias * 3,
      REB_TOTAL: 7 + defenseBias * 1.2,
      USG: 0.20 + offenseBias * 0.05,
      VI: 0.50 + average([offenseBias, defenseBias]) * 0.15,
    },
    teamModel: {
      possessionVolume: 97 + offenseBias * 4,
      transitionShare: 0.11 + offenseBias * 0.04,
      transitionDefense,
      transitionContainment: transitionDefense * 1.01,
      turnoverRate: 0.15 - offenseBias * 0.03,
      foulRate: 0.12 + offenseBias * 0.02,
      freeThrowRate: 0.18 + offenseBias * 0.04,
      rimRate: 0.28 + offenseBias * 0.05,
      rimAccuracy: 0.57 + offenseBias * 0.05,
      paintRate: 0.19 + offenseBias * 0.03,
      paintAccuracy: 0.43 + offenseBias * 0.05,
      threeRate: 0.31 + offenseBias * 0.05,
      threeAccuracy: 0.35 + offenseBias * 0.04,
      offensiveReboundRate: 0.22 + offenseBias * 0.03,
      ballSecurity: 0.55 + offenseBias * 0.10,
      primaryCreation: 0.48 + offenseBias * 0.18,
      secondaryCreation: 0.42 + offenseBias * 0.14,
      spacing: 0.50 + offenseBias * 0.16,
      rimPressure: 0.48 + offenseBias * 0.16,
      finishing: 0.50 + offenseBias * 0.14,
      perimeterDefense,
      rimDefense,
      ballPressure: turnoverPressure * 0.76 + perimeterDefense * 0.24,
      paintPacking: rimDefense * 0.56 + defensiveReboundRate * 0.44,
      rimContest: rimDefense * 1.02,
      closeoutIntegrity: perimeterDefense * 1.01,
      reboundPositioning: defensiveReboundRate,
      turnoverPressure,
      defensiveReboundRate,
      foulDiscipline: 0.50 + defenseBias * 0.10,
      benchDepth: 0.54 + average([offenseBias, defenseBias]) * 0.08,
      volatility: 0.40 + offenseBias * 0.04,
      switchability: 0.48 + defenseBias * 0.12,
    },
    roleProfile: {
      rosterRoleCounts: { backcourt: 1, wing: 1, frontcourt: 1 },
      functionalRoleCounts: {
        primary_creator: 1,
        secondary_creator: 0,
        connector: 0,
        movement_shooter: 0,
        slasher_finisher: 0,
        two_way_wing: 1,
        stretch_big: 0,
        rim_big: 1,
      },
      rosterRoleShare: { backcourt: 0.34, wing: 0.33, frontcourt: 0.33 },
      functionalRoleShare: {
        primary_creator: 0.34,
        secondary_creator: 0,
        connector: 0,
        movement_shooter: 0,
        slasher_finisher: 0,
        two_way_wing: 0.33,
        stretch_big: 0,
        rim_big: 0.33,
      },
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
    overallRating,
    rotation: [
      { playerId: `${teamId}-1`, name: 'Lead', rosterRole: 'backcourt', functionalRole: 'primary_creator', impactRating: overallRating, draftValue: overallRating, tradeValue: overallRating, volatility: 0.45 },
      { playerId: `${teamId}-2`, name: 'Wing', rosterRole: 'wing', functionalRole: 'two_way_wing', impactRating: overallRating - 4, draftValue: overallRating - 3, tradeValue: overallRating - 3, volatility: 0.42 },
      { playerId: `${teamId}-3`, name: 'Big', rosterRole: 'frontcourt', functionalRole: 'rim_big', impactRating: overallRating - 7, draftValue: overallRating - 5, tradeValue: overallRating - 4, volatility: 0.40 },
    ],
  };
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

describe('simulation-correctness', () => {
  it('simulateMatchup: stronger event model roster beats weaker roster more than 60% of the time', () => {
    const highAgg = buildAgg('high', 85, 0.9, 0.8);
    const lowAgg = buildAgg('low', 52, 0.15, 0.2);

    let winsA = 0;
    const runs = 1000;

    for (let i = 0; i < runs; i++) {
      const result = simulateMatchup(highAgg, lowAgg, null, undefined, undefined, 1, i);
      if (result.winner === 'A') winsA++;
    }

    expect(winsA / runs).toBeGreaterThan(0.60);
  });
});

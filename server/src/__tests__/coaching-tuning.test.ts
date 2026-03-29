import { describe, expect, it } from 'vitest';
import type {
  CoachingDecision,
  FunctionalRole,
  RosterRole,
  TeamAggregation,
  TeamRoleProfile,
} from '@nba-draft-sim/shared';
import { buildGamePlan } from '../../services/simulation';

function buildRoleProfile(
  rosterRoleShare: Record<RosterRole, number>,
  functionalRoleShare: Record<FunctionalRole, number>,
): TeamRoleProfile {
  return {
    rosterRoleCounts: {
      backcourt: Math.round(rosterRoleShare.backcourt * 10),
      wing: Math.round(rosterRoleShare.wing * 10),
      frontcourt: Math.round(rosterRoleShare.frontcourt * 10),
    },
    functionalRoleCounts: {
      primary_creator: Math.round(functionalRoleShare.primary_creator * 10),
      secondary_creator: Math.round(functionalRoleShare.secondary_creator * 10),
      connector: Math.round(functionalRoleShare.connector * 10),
      movement_shooter: Math.round(functionalRoleShare.movement_shooter * 10),
      slasher_finisher: Math.round(functionalRoleShare.slasher_finisher * 10),
      two_way_wing: Math.round(functionalRoleShare.two_way_wing * 10),
      stretch_big: Math.round(functionalRoleShare.stretch_big * 10),
      rim_big: Math.round(functionalRoleShare.rim_big * 10),
    },
    rosterRoleShare,
    functionalRoleShare,
  };
}

function buildRotation(teamId: string) {
  return [
    { playerId: `${teamId}-1`, name: 'Guard 1', rosterRole: 'backcourt' as const, functionalRole: 'primary_creator' as const, impactRating: 88, draftValue: 86, tradeValue: 84, volatility: 0.42 },
    { playerId: `${teamId}-2`, name: 'Guard 2', rosterRole: 'backcourt' as const, functionalRole: 'secondary_creator' as const, impactRating: 84, draftValue: 82, tradeValue: 80, volatility: 0.40 },
    { playerId: `${teamId}-3`, name: 'Wing 1', rosterRole: 'wing' as const, functionalRole: 'two_way_wing' as const, impactRating: 82, draftValue: 80, tradeValue: 79, volatility: 0.38 },
    { playerId: `${teamId}-4`, name: 'Wing 2', rosterRole: 'wing' as const, functionalRole: 'movement_shooter' as const, impactRating: 80, draftValue: 79, tradeValue: 77, volatility: 0.37 },
    { playerId: `${teamId}-5`, name: 'Big', rosterRole: 'frontcourt' as const, functionalRole: 'stretch_big' as const, impactRating: 81, draftValue: 79, tradeValue: 78, volatility: 0.35 },
  ];
}

function buildTeam(
  teamId: string,
  roleProfile: TeamRoleProfile,
  teamModelOverrides: Partial<TeamAggregation['teamModel']>,
): TeamAggregation {
  const baseTeamModel: TeamAggregation['teamModel'] = {
    possessionVolume: 98,
    transitionShare: 0.16,
    transitionDefense: 0.58,
    transitionContainment: 0.59,
    turnoverRate: 0.13,
    foulRate: 0.12,
    freeThrowRate: 0.21,
    rimRate: 0.28,
    rimAccuracy: 0.59,
    paintRate: 0.18,
    paintAccuracy: 0.46,
    threeRate: 0.37,
    threeAccuracy: 0.37,
    offensiveReboundRate: 0.23,
    ballSecurity: 0.62,
    primaryCreation: 0.60,
    secondaryCreation: 0.56,
    spacing: 0.60,
    rimPressure: 0.46,
    finishing: 0.56,
    perimeterDefense: 0.58,
    rimDefense: 0.53,
    ballPressure: 0.57,
    paintPacking: 0.51,
    rimContest: 0.55,
    closeoutIntegrity: 0.59,
    reboundPositioning: 0.74,
    turnoverPressure: 0.56,
    defensiveReboundRate: 0.74,
    foulDiscipline: 0.60,
    benchDepth: 0.56,
    volatility: 0.36,
    switchability: 0.60,
  };
  const mergedTeamModel = {
    ...baseTeamModel,
    ...teamModelOverrides,
  };
  const perimeterDefense = mergedTeamModel.perimeterDefense;
  const rimDefense = mergedTeamModel.rimDefense;
  const transitionDefense = mergedTeamModel.transitionDefense;
  const turnoverPressure = mergedTeamModel.turnoverPressure;
  const defensiveReboundRate = mergedTeamModel.defensiveReboundRate;
  return {
    teamId,
    features: {
      R: 1,
      TS: 0.58,
      THREE_P_PCT: 0.37,
      THREE_PA_RATE: 0.39,
      TWO_P_PCT: 0.53,
      TWO_PA_RATE: 0.61,
      FT_PCT: 0.79,
      FT_RATE: 0.23,
      EFG: 0.56,
      THREE_P_VOLUME: 13,
      AST: 26,
      AST_RATE: 0.24,
      POTENTIAL_AST: 34,
      AST_TO_PASS_RATE: 0.12,
      SECONDARY_AST: 4,
      PAR: 0.66,
      TOV: 13,
      TOV_RATE: 0.12,
      A2T: 1.95,
      STL: 8,
      BLK: 5,
      STL_RATE: 0.018,
      BLK_RATE: 0.014,
      DEFLECTIONS: 17,
      PF_RATE: 0.19,
      CHARGES_DRAWN: 0.5,
      OREB_PCT: 0.24,
      DREB_PCT: 0.75,
      REB_TOTAL: 45,
      USG: 0.23,
      VI: 0.64,
    },
    teamModel: {
      ...mergedTeamModel,
      ballPressure: teamModelOverrides.ballPressure ?? Math.max(0.10, Math.min(1, turnoverPressure * 0.75 + perimeterDefense * 0.25)),
      paintPacking: teamModelOverrides.paintPacking ?? Math.max(0, Math.min(1, rimDefense * 0.55 + defensiveReboundRate * 0.45)),
      rimContest: teamModelOverrides.rimContest ?? Math.max(0.10, Math.min(1, rimDefense * 1.04)),
      closeoutIntegrity: teamModelOverrides.closeoutIntegrity ?? Math.max(0.10, Math.min(1, perimeterDefense * 1.02)),
      reboundPositioning: teamModelOverrides.reboundPositioning ?? Math.max(0.10, Math.min(1, defensiveReboundRate)),
      transitionContainment: teamModelOverrides.transitionContainment ?? Math.max(0.10, Math.min(1, transitionDefense * 1.01)),
    },
    roleProfile,
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
    overallRating: 68,
    rotation: buildRotation(teamId),
  };
}

function buildDecision(
  team: TeamAggregation,
  lineupStrategy: CoachingDecision['lineupStrategy'],
  offensiveStrategy: CoachingDecision['offensiveStrategy'],
  defensiveStrategy: CoachingDecision['defensiveStrategy'],
): CoachingDecision {
  return {
    teamId: team.teamId,
    roundNumber: 1,
    rotation: team.rotation.map((player) => player.playerId),
    rotationDepth: team.rotation.length,
    lineupStrategy,
    offensiveStrategy,
    defensiveStrategy,
    submittedAt: new Date().toISOString(),
  };
}

describe('coaching strategy tuning', () => {
  it('small_ball shifts plans toward pace, spacing, and switching', () => {
    const smallBallTeam = buildTeam(
      'small-ball',
      buildRoleProfile(
        { backcourt: 0.34, wing: 0.51, frontcourt: 0.15 },
        {
          primary_creator: 0.14,
          secondary_creator: 0.18,
          connector: 0.12,
          movement_shooter: 0.24,
          slasher_finisher: 0.07,
          two_way_wing: 0.17,
          stretch_big: 0.08,
          rim_big: 0,
        },
      ),
      {
        possessionVolume: 99,
        transitionShare: 0.18,
        spacing: 0.70,
        ballSecurity: 0.64,
        perimeterDefense: 0.67,
        rimDefense: 0.47,
        turnoverPressure: 0.62,
        defensiveReboundRate: 0.71,
        switchability: 0.74,
        offensiveReboundRate: 0.20,
      },
    );

    const baseline = buildGamePlan(
      smallBallTeam,
      buildDecision(smallBallTeam, 'balanced', 'balanced_attack', 'standard'),
    );
    const smallBall = buildGamePlan(
      smallBallTeam,
      buildDecision(smallBallTeam, 'small_ball', 'balanced_attack', 'standard'),
    );

    expect(smallBall.possessionVolume).toBeGreaterThan(baseline.possessionVolume);
    expect(smallBall.transitionShare).toBeGreaterThan(baseline.transitionShare);
    expect(smallBall.spacing).toBeGreaterThan(baseline.spacing);
    expect(smallBall.threeRate).toBeGreaterThan(baseline.threeRate);
    expect(smallBall.switchability).toBeGreaterThan(baseline.switchability);
    expect(smallBall.paintPacking).toBeLessThan(baseline.paintPacking);
    expect(smallBall.rimContest).toBeLessThan(baseline.rimContest);
    expect(smallBall.reboundPositioning).toBeLessThan(baseline.reboundPositioning);
  });

  it('motion_offense improves creation quality and ball security', () => {
    const motionTeam = buildTeam(
      'motion',
      buildRoleProfile(
        { backcourt: 0.42, wing: 0.43, frontcourt: 0.15 },
        {
          primary_creator: 0.12,
          secondary_creator: 0.28,
          connector: 0.28,
          movement_shooter: 0.20,
          slasher_finisher: 0.02,
          two_way_wing: 0.05,
          stretch_big: 0.05,
          rim_big: 0,
        },
      ),
      {
        primaryCreation: 0.50,
        secondaryCreation: 0.63,
        spacing: 0.62,
        ballSecurity: 0.66,
        turnoverRate: 0.126,
        threeRate: 0.38,
        threeAccuracy: 0.368,
        perimeterDefense: 0.54,
        rimDefense: 0.49,
      },
    );

    const baseline = buildGamePlan(
      motionTeam,
      buildDecision(motionTeam, 'balanced', 'balanced_attack', 'standard'),
    );
    const motion = buildGamePlan(
      motionTeam,
      buildDecision(motionTeam, 'balanced', 'motion_offense', 'standard'),
    );

    expect(motion.secondaryCreation).toBeGreaterThan(baseline.secondaryCreation);
    expect(motion.ballSecurity).toBeGreaterThan(baseline.ballSecurity);
    expect(motion.turnoverRate).toBeLessThan(baseline.turnoverRate);
    expect(motion.threeAccuracy).toBeGreaterThan(baseline.threeAccuracy);
    expect(motion.paintAccuracy).toBeGreaterThan(baseline.paintAccuracy);
  });

  it('pressure_ball increases disruption and pressure defense', () => {
    const pressureTeam = buildTeam(
      'pressure',
      buildRoleProfile(
        { backcourt: 0.45, wing: 0.38, frontcourt: 0.17 },
        {
          primary_creator: 0.18,
          secondary_creator: 0.10,
          connector: 0.10,
          movement_shooter: 0.07,
          slasher_finisher: 0.05,
          two_way_wing: 0.30,
          stretch_big: 0.05,
          rim_big: 0.15,
        },
      ),
      {
        perimeterDefense: 0.67,
        transitionDefense: 0.66,
        turnoverPressure: 0.70,
        switchability: 0.66,
        foulDiscipline: 0.59,
        ballSecurity: 0.55,
        spacing: 0.53,
        primaryCreation: 0.55,
      },
    );

    const baseline = buildGamePlan(
      pressureTeam,
      buildDecision(pressureTeam, 'balanced', 'balanced_attack', 'standard'),
    );
    const pressure = buildGamePlan(
      pressureTeam,
      buildDecision(pressureTeam, 'balanced', 'balanced_attack', 'pressure_ball'),
    );

    expect(pressure.ballPressure).toBeGreaterThan(baseline.ballPressure);
    expect(pressure.turnoverPressure).toBeGreaterThan(baseline.turnoverPressure);
    expect(pressure.transitionContainment).toBeGreaterThan(baseline.transitionContainment);
    expect(pressure.closeoutIntegrity).toBeGreaterThan(baseline.closeoutIntegrity);
    expect(pressure.perimeterDefense).toBeGreaterThan(baseline.perimeterDefense);
    expect(pressure.switchability).toBeGreaterThan(baseline.switchability);
    expect(pressure.foulDiscipline).toBeLessThan(baseline.foulDiscipline);
  });

  it('protect_paint increases interior security while conceding more perimeter access', () => {
    const paintDefenseTeam = buildTeam(
      'paint-defense',
      buildRoleProfile(
        { backcourt: 0.26, wing: 0.30, frontcourt: 0.44 },
        {
          primary_creator: 0.10,
          secondary_creator: 0.08,
          connector: 0.08,
          movement_shooter: 0.06,
          slasher_finisher: 0.06,
          two_way_wing: 0.14,
          stretch_big: 0.14,
          rim_big: 0.34,
        },
      ),
      {
        spacing: 0.51,
        perimeterDefense: 0.54,
        rimDefense: 0.71,
        defensiveReboundRate: 0.79,
        switchability: 0.52,
        transitionDefense: 0.53,
      },
    );

    const baseline = buildGamePlan(
      paintDefenseTeam,
      buildDecision(paintDefenseTeam, 'balanced', 'balanced_attack', 'standard'),
    );
    const protectPaint = buildGamePlan(
      paintDefenseTeam,
      buildDecision(paintDefenseTeam, 'balanced', 'balanced_attack', 'protect_paint'),
    );

    expect(protectPaint.paintPacking).toBeGreaterThan(baseline.paintPacking);
    expect(protectPaint.rimContest).toBeGreaterThan(baseline.rimContest);
    expect(protectPaint.defensiveReboundRate).toBeGreaterThan(baseline.defensiveReboundRate);
    expect(protectPaint.reboundPositioning).toBeGreaterThan(baseline.reboundPositioning);
    expect(protectPaint.foulDiscipline).toBeGreaterThan(baseline.foulDiscipline);
    expect(protectPaint.closeoutIntegrity).toBeLessThan(baseline.closeoutIntegrity);
    expect(protectPaint.perimeterDefense).toBeLessThanOrEqual(baseline.perimeterDefense);
    expect(protectPaint.switchability).toBeLessThan(baseline.switchability);
  });

  it('switch_everything boosts matchup versatility at the cost of rebounding structure', () => {
    const switchTeam = buildTeam(
      'switch',
      buildRoleProfile(
        { backcourt: 0.34, wing: 0.46, frontcourt: 0.20 },
        {
          primary_creator: 0.14,
          secondary_creator: 0.10,
          connector: 0.10,
          movement_shooter: 0.10,
          slasher_finisher: 0.06,
          two_way_wing: 0.34,
          stretch_big: 0.08,
          rim_big: 0.08,
        },
      ),
      {
        perimeterDefense: 0.68,
        switchability: 0.72,
        transitionDefense: 0.60,
        turnoverPressure: 0.58,
        rimDefense: 0.50,
        defensiveReboundRate: 0.75,
        offensiveReboundRate: 0.22,
      },
    );

    const baseline = buildGamePlan(
      switchTeam,
      buildDecision(switchTeam, 'balanced', 'balanced_attack', 'standard'),
    );
    const switchEverything = buildGamePlan(
      switchTeam,
      buildDecision(switchTeam, 'balanced', 'balanced_attack', 'switch_everything'),
    );

    expect(switchEverything.switchability).toBeGreaterThan(baseline.switchability);
    expect(switchEverything.ballPressure).toBeGreaterThan(baseline.ballPressure);
    expect(switchEverything.closeoutIntegrity).toBeGreaterThan(baseline.closeoutIntegrity);
    expect(switchEverything.transitionContainment).toBeGreaterThan(baseline.transitionContainment);
    expect(switchEverything.perimeterDefense).toBeGreaterThan(baseline.perimeterDefense);
    expect(switchEverything.transitionDefense).toBeGreaterThan(baseline.transitionDefense);
    expect(switchEverything.turnoverPressure).toBeGreaterThan(baseline.turnoverPressure);
    expect(switchEverything.defensiveReboundRate).toBeLessThan(baseline.defensiveReboundRate);
  });
});

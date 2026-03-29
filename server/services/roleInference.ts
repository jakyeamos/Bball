import {
  FunctionalRole,
  Player,
  PlayerAdvancedProfile,
  PlayerFeatures,
  PlayerRawStats,
  POSITION_TO_ROSTER_ROLE,
  ROSTER_ROLE_TO_ROLE_CATEGORY,
  RoleCategory,
  RosterRole,
} from '@nba-draft-sim/shared';

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

function safeDiv(numerator: number, denominator: number, fallback = 0): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return fallback;
  }
  return numerator / denominator;
}

function scale01(value: number, min: number, max: number): number {
  if (max <= min) return 0.5;
  return clamp(0, 1, (value - min) / (max - min));
}

function average(values: number[]): number {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return 0;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

type RoleBundle = {
  rosterRole: RosterRole;
  functionalRole: FunctionalRole;
  roleCategory: RoleCategory;
};

function profileOr(
  advancedProfile: PlayerAdvancedProfile | undefined,
  key: keyof PlayerAdvancedProfile,
  fallback: number,
): number {
  return advancedProfile?.[key] ?? fallback;
}

function featureOr(
  features: PlayerFeatures | undefined,
  key: keyof PlayerFeatures,
  fallback: number,
): number {
  return features?.[key] ?? fallback;
}

function explicitRosterRoleBonus(position: string): Record<RosterRole, number> {
  const direct = POSITION_TO_ROSTER_ROLE[position];
  return {
    backcourt: direct === 'backcourt' ? 0.18 : 0,
    wing: direct === 'wing' ? 0.16 : 0,
    frontcourt: direct === 'frontcourt' ? 0.20 : 0,
  };
}

function computeCoreSignals(
  rawStats: PlayerRawStats,
  advancedProfile?: PlayerAdvancedProfile,
  features?: PlayerFeatures,
) {
  const gp = Math.max(1, rawStats.GP);
  const astPerGame = rawStats.AST / gp;
  const rebPerGame = rawStats.REB / gp;
  const orbPerGame = rawStats.ORB / gp;
  const blkPerGame = rawStats.BLK / gp;
  const stlPerGame = rawStats.STL / gp;
  const threePerGame = rawStats.THREE_PM / gp;
  const threeAttemptsPerGame = rawStats.THREE_PA / gp;
  const usage = rawStats.USG_PROXY ?? safeDiv(rawStats.FGA + 0.44 * rawStats.FTA + rawStats.TOV, rawStats.FGA + rawStats.FTA + rawStats.TOV, 0.2);

  const playmaking = profileOr(advancedProfile, 'playmaking', scale01(astPerGame, 1.3, 8.5));
  const shotCreation = profileOr(advancedProfile, 'shotCreation', scale01(usage, 0.15, 0.35));
  const onBallUsage = profileOr(advancedProfile, 'onBallUsage', scale01(usage, 0.15, 0.35));
  const turnoverResistance = profileOr(
    advancedProfile,
    'turnoverResistance',
    scale01(featureOr(features, 'A2T', safeDiv(rawStats.AST, rawStats.TOV, 1.5)), 1.0, 3.8),
  );
  const spacing = profileOr(advancedProfile, 'spacing', scale01(threeAttemptsPerGame, 1.5, 8.0));
  const shootingGravity = profileOr(advancedProfile, 'shootingGravity', scale01(threePerGame, 0.7, 3.8));
  const offBallValue = profileOr(advancedProfile, 'offBallValue', scale01(threeAttemptsPerGame, 1.5, 8.0));
  const perimeterDefense = profileOr(advancedProfile, 'perimeterDefense', scale01(stlPerGame, 0.5, 1.8));
  const switchability = profileOr(
    advancedProfile,
    'switchability',
    average([
      scale01(rebPerGame, 4.0, 9.0),
      scale01(stlPerGame, 0.5, 1.8),
      scale01(threePerGame, 0.7, 3.8),
    ]),
  );
  const rimDeterrence = profileOr(advancedProfile, 'rimDeterrence', scale01(blkPerGame, 0.2, 2.4));
  const defensiveRebounding = profileOr(advancedProfile, 'defensiveRebounding', scale01(rebPerGame, 4.8, 12.5));
  const offensiveRebounding = profileOr(
    advancedProfile,
    'offensiveRebounding',
    average([
      scale01(orbPerGame, 0.4, 4.2),
      scale01(rawStats.OREB_PCT ?? 0, 1.0, 12.0),
    ]),
  );
  const finishing = profileOr(advancedProfile, 'finishing', scale01(rawStats.TWO_P_PCT, 0.48, 0.69));
  const rimPressure = profileOr(advancedProfile, 'rimPressure', scale01(rawStats.FTA / gp, 1.2, 8.0));
  const freeThrowPressure = profileOr(advancedProfile, 'freeThrowPressure', scale01(rawStats.FTA / gp, 1.2, 8.0));
  const secondaryCreation = profileOr(advancedProfile, 'secondaryCreation', scale01((rawStats.SECONDARY_AST ?? 0) / gp, 0.2, 2.6));
  const transitionOffense = profileOr(advancedProfile, 'transitionOffense', 0.5);
  const transitionDefense = profileOr(advancedProfile, 'transitionDefense', 0.5);
  const foulDiscipline = profileOr(advancedProfile, 'foulDiscipline', scale01(3.8 - rawStats.PF / gp, 0.2, 2.6));

  return {
    playmaking,
    shotCreation,
    onBallUsage,
    turnoverResistance,
    spacing,
    shootingGravity,
    offBallValue,
    perimeterDefense,
    switchability,
    rimDeterrence,
    defensiveRebounding,
    offensiveRebounding,
    finishing,
    rimPressure,
    freeThrowPressure,
    secondaryCreation,
    transitionOffense,
    transitionDefense,
    foulDiscipline,
    astPerGame,
    rebPerGame,
  };
}

export function inferRosterRole(
  rawStats: PlayerRawStats,
  advancedProfile?: PlayerAdvancedProfile,
  features?: PlayerFeatures,
): RosterRole {
  if (rawStats.position === 'C') return 'frontcourt';
  if (rawStats.position === 'PG') return 'backcourt';

  const bonus = explicitRosterRoleBonus(rawStats.position);
  const signals = computeCoreSignals(rawStats, advancedProfile, features);

  const backcourtScore = average([
    signals.playmaking,
    signals.shotCreation,
    signals.onBallUsage,
    signals.turnoverResistance,
    1 - scale01(signals.rebPerGame, 5.0, 11.0),
  ]) + bonus.backcourt;

  const wingScore = average([
    signals.spacing,
    signals.offBallValue,
    signals.perimeterDefense,
    signals.switchability,
    scale01(signals.rebPerGame, 4.0, 8.5),
  ]) + bonus.wing;

  const frontcourtScore = average([
    signals.rimDeterrence,
    signals.defensiveRebounding,
    signals.offensiveRebounding,
    signals.finishing,
    scale01(signals.rebPerGame, 5.5, 13.0),
  ]) + bonus.frontcourt;

  if (rawStats.position === 'PF' && frontcourtScore >= wingScore - 0.03) {
    return 'frontcourt';
  }

  if (rawStats.position === 'SF' && frontcourtScore >= Math.max(backcourtScore, wingScore) + 0.08) {
    return 'frontcourt';
  }

  if (frontcourtScore >= backcourtScore + 0.08 && frontcourtScore >= wingScore + 0.03) {
    return 'frontcourt';
  }

  if (backcourtScore >= wingScore + 0.10 && backcourtScore >= frontcourtScore + 0.08) {
    return 'backcourt';
  }

  return 'wing';
}

export function inferFunctionalRole(
  rawStats: PlayerRawStats,
  advancedProfile?: PlayerAdvancedProfile,
  features?: PlayerFeatures,
  rosterRole?: RosterRole,
): FunctionalRole {
  const resolvedRosterRole = rosterRole ?? inferRosterRole(rawStats, advancedProfile, features);
  const s = computeCoreSignals(rawStats, advancedProfile, features);

  const scores: Record<FunctionalRole, number> = {
    primary_creator: average([s.playmaking, s.playmaking, s.shotCreation, s.onBallUsage, s.rimPressure]),
    secondary_creator: average([s.playmaking, s.secondaryCreation, s.turnoverResistance, s.spacing, s.offBallValue]),
    connector: average([s.secondaryCreation, s.turnoverResistance, s.offBallValue, s.perimeterDefense, s.spacing]),
    movement_shooter: average([s.spacing, s.shootingGravity, s.offBallValue, s.transitionOffense]),
    slasher_finisher: average([s.rimPressure, s.finishing, s.freeThrowPressure, s.transitionOffense, s.shotCreation]),
    two_way_wing: average([s.perimeterDefense, s.switchability, s.spacing, s.offBallValue, s.transitionDefense]),
    stretch_big: average([s.spacing, s.shootingGravity, s.finishing, s.defensiveRebounding, s.rimDeterrence]),
    rim_big: average([s.rimDeterrence, s.defensiveRebounding, s.offensiveRebounding, s.finishing, s.foulDiscipline]),
  };

  if (resolvedRosterRole === 'backcourt') {
    scores.primary_creator += 0.08;
    scores.secondary_creator += 0.06;
    scores.connector += 0.04;
    scores.movement_shooter += 0.03;
  } else if (resolvedRosterRole === 'wing') {
    scores.two_way_wing += 0.08;
    scores.movement_shooter += 0.05;
    scores.slasher_finisher += 0.04;
    scores.connector += 0.03;
  } else {
    scores.rim_big += 0.10;
    scores.stretch_big += 0.08;
    scores.slasher_finisher += 0.03;
  }

  if (resolvedRosterRole === 'frontcourt' && scores.primary_creator >= 0.72 && s.playmaking >= 0.72) {
    return 'primary_creator';
  }

  return (Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'connector') as FunctionalRole;
}

export function inferPlayerRoles(
  rawStats: PlayerRawStats,
  advancedProfile?: PlayerAdvancedProfile,
  features?: PlayerFeatures,
): RoleBundle {
  const rosterRole = inferRosterRole(rawStats, advancedProfile, features);
  const functionalRole = inferFunctionalRole(rawStats, advancedProfile, features, rosterRole);
  return {
    rosterRole,
    functionalRole,
    roleCategory: ROSTER_ROLE_TO_ROLE_CATEGORY[rosterRole],
  };
}

export function inferRoleCategory(
  rawStats: PlayerRawStats,
  advancedProfile?: PlayerAdvancedProfile,
  features?: PlayerFeatures,
): RoleCategory {
  return inferPlayerRoles(rawStats, advancedProfile, features).roleCategory;
}

export function inferRoleCategoryForPlayer(player: Pick<Player, 'rawStats' | 'advancedProfile' | 'features'>): RoleCategory {
  return inferRoleCategory(player.rawStats, player.advancedProfile, player.features);
}

export function inferRosterRoleForPlayer(player: Pick<Player, 'rawStats' | 'advancedProfile' | 'features' | 'rosterRole'>): RosterRole {
  return player.rosterRole ?? inferRosterRole(player.rawStats, player.advancedProfile, player.features);
}

export function inferFunctionalRoleForPlayer(player: Pick<Player, 'rawStats' | 'advancedProfile' | 'features' | 'rosterRole' | 'functionalRole'>): FunctionalRole {
  return player.functionalRole ?? inferFunctionalRole(player.rawStats, player.advancedProfile, player.features, player.rosterRole);
}

export const ROSTER_ROLE_TARGET_SHARE: Record<RosterRole, number> = {
  backcourt: 0.4,
  wing: 0.3,
  frontcourt: 0.3,
};

export const FUNCTIONAL_ROLE_TRAITS: Record<FunctionalRole, {
  creation: number;
  secondaryCreation: number;
  spacing: number;
  rimPressure: number;
  ballPressure: number;
  motion: number;
  switching: number;
  smallBall: number;
  bigLineup: number;
  paintDefense: number;
}> = {
  primary_creator: {
    creation: 1.25,
    secondaryCreation: 0.8,
    spacing: 0.8,
    rimPressure: 1.0,
    ballPressure: 0.55,
    motion: 0.7,
    switching: 0.7,
    smallBall: 0.9,
    bigLineup: 0.6,
    paintDefense: 0.45,
  },
  secondary_creator: {
    creation: 0.95,
    secondaryCreation: 1.1,
    spacing: 0.9,
    rimPressure: 0.8,
    ballPressure: 0.65,
    motion: 1.05,
    switching: 0.85,
    smallBall: 0.95,
    bigLineup: 0.7,
    paintDefense: 0.55,
  },
  connector: {
    creation: 0.7,
    secondaryCreation: 1.0,
    spacing: 0.95,
    rimPressure: 0.65,
    ballPressure: 0.8,
    motion: 1.2,
    switching: 0.95,
    smallBall: 0.95,
    bigLineup: 0.8,
    paintDefense: 0.7,
  },
  movement_shooter: {
    creation: 0.55,
    secondaryCreation: 0.65,
    spacing: 1.3,
    rimPressure: 0.45,
    ballPressure: 0.65,
    motion: 1.15,
    switching: 0.8,
    smallBall: 1.15,
    bigLineup: 0.65,
    paintDefense: 0.5,
  },
  slasher_finisher: {
    creation: 0.75,
    secondaryCreation: 0.6,
    spacing: 0.55,
    rimPressure: 1.25,
    ballPressure: 0.75,
    motion: 0.85,
    switching: 0.8,
    smallBall: 0.95,
    bigLineup: 0.9,
    paintDefense: 0.75,
  },
  two_way_wing: {
    creation: 0.7,
    secondaryCreation: 0.75,
    spacing: 0.95,
    rimPressure: 0.8,
    ballPressure: 1.1,
    motion: 0.95,
    switching: 1.2,
    smallBall: 1.05,
    bigLineup: 0.85,
    paintDefense: 0.85,
  },
  stretch_big: {
    creation: 0.65,
    secondaryCreation: 0.65,
    spacing: 1.15,
    rimPressure: 0.75,
    ballPressure: 0.7,
    motion: 0.9,
    switching: 0.75,
    smallBall: 1.0,
    bigLineup: 0.95,
    paintDefense: 0.95,
  },
  rim_big: {
    creation: 0.35,
    secondaryCreation: 0.4,
    spacing: 0.35,
    rimPressure: 0.95,
    ballPressure: 0.55,
    motion: 0.55,
    switching: 0.55,
    smallBall: 0.45,
    bigLineup: 1.25,
    paintDefense: 1.25,
  },
};

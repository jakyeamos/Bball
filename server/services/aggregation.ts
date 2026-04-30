/**
 * server/services/aggregation.ts
 *
 * Team aggregation now builds a lineup-aware team event model that powers
 * drafting, scouting, and the hybrid event simulation engine.
 */

import {
  FunctionalRole,
  Player,
  PlayerFeatures,
  TeamAggregation,
  TeamModel,
  TeamRoleProfile,
} from '@nba-draft-sim/shared';
import { aggregateArchetypeProfiles } from './archetypes';
import { computeTeamModifiers } from './modifiers';
import { FUNCTIONAL_ROLE_TRAITS } from './roleInference';

const FEATURE_KEYS: Array<keyof PlayerFeatures> = [
  'TS',
  'THREE_P_PCT',
  'THREE_PA_RATE',
  'TWO_P_PCT',
  'TWO_PA_RATE',
  'FT_PCT',
  'FT_RATE',
  'EFG',
  'THREE_P_VOLUME',
  'AST',
  'AST_RATE',
  'POTENTIAL_AST',
  'AST_TO_PASS_RATE',
  'SECONDARY_AST',
  'PAR',
  'TOV',
  'TOV_RATE',
  'A2T',
  'STL',
  'BLK',
  'STL_RATE',
  'BLK_RATE',
  'DEFLECTIONS',
  'PF_RATE',
  'CHARGES_DRAWN',
  'OREB_PCT',
  'DREB_PCT',
  'REB_TOTAL',
  'USG',
  'VI',
];

const MINUTES_TIER_MULTIPLIER = {
  franchise: 1.12,
  core: 1.08,
  starter: 1.0,
  rotation: 0.94,
  depth: 0.88,
  development: 0.82,
} as const;

type FunctionalRoleTraits = (typeof FUNCTIONAL_ROLE_TRAITS)[FunctionalRole];

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]): number {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return 0;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

function getPlayerGameImpact(player: Player): number {
  return player.valueModel?.gameImpact ?? player.impactRating;
}

function getPlayerDraftValue(player: Player): number {
  return player.valueModel?.draftValue ?? player.impactRating;
}

function getPlayerTradeValue(player: Player): number {
  return player.valueModel?.tradeValue ?? player.impactRating;
}

function buildRotationWeights(rotation: Player[]): number[] {
  const rawWeights = rotation.map((player, index) => {
    const baseImpact = Math.max(1, getPlayerGameImpact(player));
    const tierMultiplier = MINUTES_TIER_MULTIPLIER[player.valueModel?.minutesTier ?? 'rotation'];
    const lineupMultiplier = Math.max(0.55, 1.12 - index * 0.045);
    return baseImpact * tierMultiplier * lineupMultiplier;
  });
  const total = rawWeights.reduce((sum, value) => sum + value, 0);
  return rawWeights.map((value) => value / Math.max(total, 1));
}

function weightedAverage(rotation: Player[], weights: number[], selector: (player: Player) => number): number {
  return rotation.reduce((sum, player, index) => sum + selector(player) * weights[index], 0);
}

function roleTrait(player: Player, key: keyof FunctionalRoleTraits): number {
  return FUNCTIONAL_ROLE_TRAITS[player.functionalRole]?.[key] ?? 1;
}

function buildRoleProfile(rotation: Player[], weights: number[]): TeamRoleProfile {
  const rosterRoleCounts: TeamRoleProfile['rosterRoleCounts'] = {
    backcourt: 0,
    wing: 0,
    frontcourt: 0,
  };
  const functionalRoleCounts: TeamRoleProfile['functionalRoleCounts'] = {
    primary_creator: 0,
    secondary_creator: 0,
    connector: 0,
    movement_shooter: 0,
    slasher_finisher: 0,
    two_way_wing: 0,
    stretch_big: 0,
    rim_big: 0,
  };
  const rosterRoleShare: TeamRoleProfile['rosterRoleShare'] = {
    backcourt: 0,
    wing: 0,
    frontcourt: 0,
  };
  const functionalRoleShare: TeamRoleProfile['functionalRoleShare'] = {
    primary_creator: 0,
    secondary_creator: 0,
    connector: 0,
    movement_shooter: 0,
    slasher_finisher: 0,
    two_way_wing: 0,
    stretch_big: 0,
    rim_big: 0,
  };

  rotation.forEach((player, index) => {
    const weight = weights[index] ?? 0;
    rosterRoleCounts[player.rosterRole] += 1;
    functionalRoleCounts[player.functionalRole] += 1;
    rosterRoleShare[player.rosterRole] += weight;
    functionalRoleShare[player.functionalRole] += weight;
  });

  return {
    rosterRoleCounts,
    functionalRoleCounts,
    rosterRoleShare,
    functionalRoleShare,
  };
}

function aggregateFeatures(rotation: Player[], weights: number[]): PlayerFeatures {
  const aggregated: Record<string, number> = { R: 1 };

  for (const key of FEATURE_KEYS) {
    aggregated[key] = weightedAverage(rotation, weights, (player) => player.features[key] ?? 0);
  }

  return aggregated as PlayerFeatures;
}

function aggregateTeamModel(rotation: Player[], weights: number[], roleProfile: TeamRoleProfile): TeamModel {
  const primaryCreators = [...rotation]
    .sort((a, b) => {
      const scoreA = average([a.advancedProfile.shotCreation, a.advancedProfile.playmaking]) * roleTrait(a, 'creation');
      const scoreB = average([b.advancedProfile.shotCreation, b.advancedProfile.playmaking]) * roleTrait(b, 'creation');
      return scoreB - scoreA;
    })
    .slice(0, 3);
  const creatorWeight = primaryCreators.length > 0 ? 1 / primaryCreators.length : 0;
  const creatorScore = primaryCreators.reduce(
    (sum, player) =>
      sum
      + average([player.advancedProfile.shotCreation, player.advancedProfile.playmaking])
      * roleTrait(player, 'creation')
      * creatorWeight,
    0,
  );

  const secondaryCreation = weightedAverage(rotation, weights, (player) =>
    average([player.advancedProfile.secondaryCreation, player.advancedProfile.playmaking * 0.65])
    * roleTrait(player, 'secondaryCreation'),
  );
  const spacing = weightedAverage(rotation, weights, (player) =>
    average([player.advancedProfile.spacing, player.advancedProfile.shootingGravity]) * roleTrait(player, 'spacing'),
  );
  const rimPressure = weightedAverage(rotation, weights, (player) =>
    average([player.advancedProfile.rimPressure, player.advancedProfile.freeThrowPressure]) * roleTrait(player, 'rimPressure'),
  );
  const finishing = weightedAverage(rotation, weights, (player) => player.advancedProfile.finishing);
  const ballPressure = weightedAverage(rotation, weights, (player) =>
    player.advancedProfile.perimeterDefense * average([roleTrait(player, 'ballPressure'), roleTrait(player, 'switching')]),
  );
  const rimContest = weightedAverage(rotation, weights, (player) =>
    player.advancedProfile.rimDeterrence
    * average([
      roleTrait(player, 'paintDefense'),
      player.rosterRole === 'frontcourt' ? 1.08 : 0.88,
    ]),
  );
  const paintPacking = weightedAverage(rotation, weights, (player) =>
    average([
      player.advancedProfile.rimDeterrence,
      player.advancedProfile.defensiveRebounding,
      player.advancedProfile.foulDiscipline,
    ])
    * average([
      roleTrait(player, 'paintDefense'),
      player.rosterRole === 'frontcourt' ? 1.08 : 0.86,
    ]),
  );
  const closeoutIntegrity = weightedAverage(rotation, weights, (player) =>
    average([
      player.advancedProfile.perimeterDefense,
      player.advancedProfile.switchability,
      player.advancedProfile.offBallValue,
    ]) * average([roleTrait(player, 'switching'), 1]),
  );
  const offensiveRebounding = weightedAverage(rotation, weights, (player) => player.advancedProfile.offensiveRebounding);
  const defensiveRebounding = weightedAverage(rotation, weights, (player) => player.advancedProfile.defensiveRebounding);
  const transitionOffense = weightedAverage(rotation, weights, (player) => player.advancedProfile.transitionOffense);
  const transitionContainment = weightedAverage(rotation, weights, (player) =>
    average([
      player.advancedProfile.transitionDefense,
      player.advancedProfile.foulDiscipline,
      player.advancedProfile.defensiveRebounding,
    ]) * average([roleTrait(player, 'ballPressure'), roleTrait(player, 'switching')]),
  );
  const turnoverResistance = weightedAverage(rotation, weights, (player) => player.advancedProfile.turnoverResistance);
  const foulDiscipline = weightedAverage(rotation, weights, (player) => player.advancedProfile.foulDiscipline);
  const switchability = weightedAverage(rotation, weights, (player) => player.advancedProfile.switchability * roleTrait(player, 'switching'));
  const reboundPositioning = weightedAverage(rotation, weights, (player) =>
    average([
      player.advancedProfile.defensiveRebounding,
      player.advancedProfile.foulDiscipline,
      player.advancedProfile.offBallValue,
    ]) * average([
      roleTrait(player, 'paintDefense'),
      player.rosterRole === 'frontcourt' ? 1.05 : 0.92,
    ]),
  );
  const benchPlayers = rotation.slice(5);
  const benchDepth = benchPlayers.length > 0
    ? average(benchPlayers.map((player) => getPlayerGameImpact(player) / 100))
    : average(rotation.map((player) => getPlayerGameImpact(player) / 100)) * 0.65;
  const volatility = weightedAverage(rotation, weights, (player) => player.advancedProfile.volatility);
  const onBallUsage = weightedAverage(rotation, weights, (player) => player.advancedProfile.onBallUsage);
  const backcourtShare = roleProfile.rosterRoleShare.backcourt;
  const wingShare = roleProfile.rosterRoleShare.wing;
  const frontcourtShare = roleProfile.rosterRoleShare.frontcourt;
  const primaryCreatorShare = roleProfile.functionalRoleShare.primary_creator;
  const motionShare = roleProfile.functionalRoleShare.connector
    + roleProfile.functionalRoleShare.secondary_creator
    + roleProfile.functionalRoleShare.movement_shooter;
  const shootingRoleShare = roleProfile.functionalRoleShare.movement_shooter
    + roleProfile.functionalRoleShare.stretch_big
    + roleProfile.functionalRoleShare.two_way_wing;
  const creatorConcentrationPenalty = Math.max(0, primaryCreatorShare - roleProfile.functionalRoleShare.secondary_creator - 0.10);

  const possessionVolume = clamp(
    92,
    106,
    94
      + transitionOffense * 7
      + onBallUsage * 5
      + backcourtShare * 1.5
      - frontcourtShare * 1.0
      - (1 - turnoverResistance) * 3,
  );
  const transitionShare = clamp(
    0.08,
    0.24,
    0.10 + transitionOffense * 0.12 + switchability * 0.015 + backcourtShare * 0.02,
  );
  const turnoverRate = clamp(0.09, 0.19, 0.155 - turnoverResistance * 0.055 + creatorConcentrationPenalty * 0.03);
  const foulRate = clamp(0.08, 0.22, 0.13 + rimPressure * 0.08 + creatorScore * 0.02);
  const freeThrowRate = clamp(0.12, 0.34, 0.16 + rimPressure * 0.10 + finishing * 0.04);
  const rimRate = clamp(0.20, 0.46, 0.24 + rimPressure * 0.16 + frontcourtShare * 0.03 - spacing * 0.04);
  const rimAccuracy = clamp(0.48, 0.72, 0.53 + finishing * 0.15 + creatorScore * 0.03);
  const paintRate = clamp(0.14, 0.34, 0.18 + creatorScore * 0.06 + finishing * 0.04 - spacing * 0.03);
  const paintAccuracy = clamp(0.34, 0.56, 0.39 + finishing * 0.11 + creatorScore * 0.03);
  const threeRate = clamp(0.20, 0.55, 0.24 + spacing * 0.22 + secondaryCreation * 0.04 + shootingRoleShare * 0.03 + wingShare * 0.02);
  const threeAccuracy = clamp(0.29, 0.42, 0.31 + spacing * 0.08);
  const offensiveReboundRate = clamp(0.16, 0.34, 0.19 + offensiveRebounding * 0.13 + frontcourtShare * 0.02);
  const defensiveReboundRate = clamp(
    0.65,
    0.84,
    0.68 + defensiveRebounding * 0.08 + reboundPositioning * 0.09 + frontcourtShare * 0.015,
  );
  const perimeterDefense = clamp(0, 1, average([ballPressure, closeoutIntegrity]));
  const rimDefense = clamp(0, 1, average([rimContest, paintPacking]));
  const transitionDefense = clamp(0, 1, average([transitionContainment, closeoutIntegrity * 0.35 + ballPressure * 0.65]));
  const turnoverPressure = clamp(0, 1, ballPressure * 0.68 + switchability * 0.18 + transitionContainment * 0.14);

  return {
    possessionVolume,
    transitionShare,
    turnoverRate,
    foulRate,
    freeThrowRate,
    rimRate,
    rimAccuracy,
    paintRate,
    paintAccuracy,
    threeRate,
    threeAccuracy,
    offensiveReboundRate,
    ballSecurity: turnoverResistance,
    primaryCreation: clamp(0, 1, creatorScore),
    secondaryCreation: clamp(0, 1, secondaryCreation + motionShare * 0.03),
    spacing: clamp(0, 1, spacing),
    rimPressure: clamp(0, 1, rimPressure),
    finishing: clamp(0, 1, finishing),
    perimeterDefense,
    rimDefense,
    transitionDefense,
    transitionContainment: clamp(0, 1, transitionContainment),
    ballPressure: clamp(0, 1, ballPressure),
    paintPacking: clamp(0, 1, paintPacking),
    rimContest: clamp(0, 1, rimContest),
    closeoutIntegrity: clamp(0, 1, closeoutIntegrity),
    reboundPositioning: clamp(0, 1, reboundPositioning),
    turnoverPressure,
    defensiveReboundRate,
    foulDiscipline: clamp(0, 1, foulDiscipline),
    benchDepth: clamp(0, 1, benchDepth),
    volatility: clamp(0, 1, volatility),
    switchability: clamp(0, 1, switchability),
  };
}

function calculateOverallRating(teamModel: TeamModel, modifierTotal: number): number {
  const offense = average([
    teamModel.primaryCreation,
    teamModel.secondaryCreation,
    teamModel.spacing,
    teamModel.rimPressure,
    teamModel.finishing,
    teamModel.ballSecurity,
    teamModel.transitionShare,
  ]);
  const defense = average([
    teamModel.ballPressure,
    teamModel.closeoutIntegrity,
    teamModel.paintPacking,
    teamModel.rimContest,
    teamModel.transitionContainment,
    (teamModel.defensiveReboundRate - 0.65) / 0.19,
    teamModel.foulDiscipline,
    teamModel.switchability,
  ]);

  return clamp(40, 99, 38 + offense * 30 + defense * 25 + teamModel.benchDepth * 6 + modifierTotal * 70);
}

export function aggregateTeam(roster: Player[], teamId: string): TeamAggregation {
  if (roster.length === 0) {
    throw new Error(`Cannot aggregate empty roster for team ${teamId}`);
  }

  const sortedRoster = [...roster].sort((a, b) => getPlayerGameImpact(b) - getPlayerGameImpact(a));
  const rotation = sortedRoster.slice(0, Math.min(10, sortedRoster.length));
  const weights = buildRotationWeights(rotation);
  const roleProfile = buildRoleProfile(rotation, weights);
  const features = aggregateFeatures(rotation, weights);
  const teamModel = aggregateTeamModel(rotation, weights, roleProfile);
  const archetypes = aggregateArchetypeProfiles(rotation.map((player) => player.archetypes));

  const provisional: TeamAggregation = {
    teamId,
    features,
    teamModel,
    roleProfile,
    archetypes,
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
      homeCourtAdvantage: 0,
    },
    overallRating: 0,
    rotation: [],
  };

  const modifiers = computeTeamModifiers(provisional, roster);
  const overallRating = calculateOverallRating(teamModel, modifiers.total);

  return {
    teamId,
    features,
    teamModel,
    roleProfile,
    archetypes,
    modifiers,
    overallRating,
    rotation: rotation.map((player) => ({
      playerId: player.playerId,
      name: player.name,
      rosterRole: player.rosterRole,
      functionalRole: player.functionalRole,
      impactRating: getPlayerGameImpact(player),
      draftValue: getPlayerDraftValue(player),
      tradeValue: getPlayerTradeValue(player),
      volatility: player.advancedProfile.volatility,
    })),
  };
}

export function calculateImpactRating(features: PlayerFeatures): number {
  const scoring = (features.TS ?? 0) * 28;
  const playmaking = (features.AST ?? 0) * 2.1;
  const defense = ((features.STL ?? 0) + (features.BLK ?? 0)) * 3.1;
  const efficiency = (features.PAR ?? 0) * 18;
  const usage = (features.USG ?? 0) * 15;
  return clamp(20, 99, scoring + playmaking + defense + efficiency + usage);
}

export function debugTeamAggregation(team: TeamAggregation): void {
  console.log(`\n📊 Team Aggregation: ${team.teamId}`);
  console.log(`Overall Rating: ${team.overallRating.toFixed(2)}`);
  console.log(`Rotation (${team.rotation.length} players):`);

  team.rotation.forEach((player, index) => {
    console.log(`  ${index + 1}. ${player.name} (${player.impactRating.toFixed(2)})`);
  });

  console.log('\nTeam Model:');
  console.log(`  Primary Creation: ${team.teamModel.primaryCreation.toFixed(3)}`);
  console.log(`  Spacing: ${team.teamModel.spacing.toFixed(3)}`);
  console.log(`  Rim Pressure: ${team.teamModel.rimPressure.toFixed(3)}`);
  console.log(`  Perimeter Defense: ${team.teamModel.perimeterDefense.toFixed(3)}`);
  console.log(`  Rim Defense: ${team.teamModel.rimDefense.toFixed(3)}`);
  console.log(`  Ball Pressure: ${team.teamModel.ballPressure.toFixed(3)}`);
  console.log(`  Paint Packing: ${team.teamModel.paintPacking.toFixed(3)}`);
  console.log(`  Rim Contest: ${team.teamModel.rimContest.toFixed(3)}`);
  console.log(`  Closeout Integrity: ${team.teamModel.closeoutIntegrity.toFixed(3)}`);
  console.log(`  Rebound Positioning: ${team.teamModel.reboundPositioning.toFixed(3)}`);
  console.log(`  Transition Containment: ${team.teamModel.transitionContainment.toFixed(3)}`);
  console.log(`  Bench Depth: ${team.teamModel.benchDepth.toFixed(3)}`);
  console.log(`  Volatility: ${team.teamModel.volatility.toFixed(3)}`);
  console.log('');
}

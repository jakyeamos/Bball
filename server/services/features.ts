/**
 * server/services/features.ts
 *
 * Data-driven player model pipeline:
 * 1. Raw stats -> advanced profile
 * 2. Advanced profile -> value model
 * 3. Advanced profile -> compact legacy PlayerFeatures
 *
 * The legacy PlayerFeatures shape remains available because archetypes,
 * scouting, and some client surfaces still depend on it. The backend now
 * treats the advanced profile and value model as the primary source of truth.
 */

import {
  FitVectors,
  PlayerAdvancedProfile,
  PlayerFeatures,
  PlayerRawStats,
  PlayerValueModel,
  PublicMetricPriors,
  VarianceProfile,
  MinutesTier,
} from '@nba-draft-sim/shared';

const ADVANCED_PROFILE_KEYS = [
  'reliability',
  'minutesLoad',
  'durability',
  'shotCreation',
  'rimPressure',
  'finishing',
  'shootingGravity',
  'spacing',
  'freeThrowPressure',
  'playmaking',
  'secondaryCreation',
  'turnoverResistance',
  'offensiveRebounding',
  'defensiveRebounding',
  'perimeterDefense',
  'rimDeterrence',
  'transitionOffense',
  'transitionDefense',
  'foulDiscipline',
  'switchability',
  'onBallUsage',
  'offBallValue',
  'volatility',
] as const;

const FEATURE_KEYS = [
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
] as const;

const SPARSE_ADVANCED_KEYS = new Set<keyof PlayerAdvancedProfile>([
  'shotCreation',
  'shootingGravity',
  'spacing',
  'playmaking',
  'secondaryCreation',
  'transitionOffense',
  'transitionDefense',
  'switchability',
  'offBallValue',
]);

const SPARSE_FEATURE_KEYS = new Set<string>([
  'POTENTIAL_AST',
  'AST_TO_PASS_RATE',
  'SECONDARY_AST',
  'DEFLECTIONS',
  'CHARGES_DRAWN',
]);

export interface RoleSummary {
  TS: number;
  THREE_P_PCT: number;
  THREE_PA_RATE: number;
  TWO_P_PCT: number;
  TWO_PA_RATE: number;
  FT_PCT: number;
  FT_RATE: number;
  EFG: number;
  THREE_P_VOLUME: number;
  AST: number;
  AST_RATE: number;
  POTENTIAL_AST: number;
  AST_TO_PASS_RATE: number;
  SECONDARY_AST: number;
  PAR: number;
  TOV: number;
  TOV_RATE: number;
  A2T: number;
  STL: number;
  BLK: number;
  STL_RATE: number;
  BLK_RATE: number;
  DEFLECTIONS: number;
  PF_RATE: number;
  CHARGES_DRAWN: number;
  OREB_PCT: number;
  DREB_PCT: number;
  REB_TOTAL: number;
  USG: number;
  VI: number;
  [key: string]: number;
}

export type AdvancedProfileSummary = PlayerAdvancedProfile;

export interface BuiltPlayerModel {
  advancedProfile: PlayerAdvancedProfile;
  valueModel: PlayerValueModel;
  features: PlayerFeatures;
}

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

function meanRecord<T extends string>(records: Array<Record<T, number>>, keys: readonly T[]): Record<T, number> {
  const result = {} as Record<T, number>;
  for (const key of keys) {
    result[key] = average(records.map((record) => record[key]));
  }
  return result;
}

function shrinkValue(value: number, prior: number, reliability: number, sparse = false): number {
  const adjustedReliability = sparse ? Math.pow(reliability, 1.35) : reliability;
  return adjustedReliability * value + (1 - adjustedReliability) * prior;
}

function mapVarianceProfile(volatility: number): VarianceProfile {
  if (volatility >= 0.67) return 'volatile';
  if (volatility <= 0.38) return 'stable';
  return 'balanced';
}

function mapMinutesTier(minutesLoad: number, gameImpact: number): MinutesTier {
  if (minutesLoad >= 0.85 && gameImpact >= 88) return 'franchise';
  if (minutesLoad >= 0.72 && gameImpact >= 76) return 'core';
  if (minutesLoad >= 0.58 && gameImpact >= 65) return 'starter';
  if (minutesLoad >= 0.42 && gameImpact >= 52) return 'rotation';
  if (minutesLoad >= 0.25) return 'depth';
  return 'development';
}

function estimatePossessions(raw: PlayerRawStats): number {
  if (raw.POSSESSIONS) return raw.POSSESSIONS;
  const offensiveRebounds = raw.ORB ?? 0;
  return Math.max(1, 0.96 * (raw.FGA + 0.44 * raw.FTA + raw.TOV - offensiveRebounds));
}

function calculateVersatilityIndex(raw: PlayerRawStats): number {
  const mp = Math.max(1, raw.MP_TOTAL);
  const pts36 = safeDiv(raw.PTS, mp) * 36;
  const reb36 = safeDiv(raw.REB, mp) * 36;
  const ast36 = safeDiv(raw.AST, mp) * 36;
  const stl36 = safeDiv(raw.STL, mp) * 36;
  const blk36 = safeDiv(raw.BLK, mp) * 36;

  let categories = 0;
  if (pts36 >= 12) categories++;
  if (reb36 >= 4) categories++;
  if (ast36 >= 3) categories++;
  if (stl36 >= 1) categories++;
  if (blk36 >= 0.5) categories++;
  return categories / 5;
}

function normalizePublicPriors(priors?: PublicMetricPriors): { offense: number; defense: number; overall: number } {
  if (!priors || priors.sourceCount === 0) {
    return { offense: 0.5, defense: 0.5, overall: 0.5 };
  }

  const offenseMetrics = [priors.darkoOpm, priors.orapm].filter((value): value is number => Number.isFinite(value));
  const defenseMetrics = [priors.darkoDpmDefense, priors.drapm].filter((value): value is number => Number.isFinite(value));
  const overallMetrics = [priors.darkoDpm, priors.rapm, priors.epm].filter((value): value is number => Number.isFinite(value));

  const offense = offenseMetrics.length > 0 ? average(offenseMetrics.map((value) => scale01(value, -4, 7))) : 0.5;
  const defense = defenseMetrics.length > 0 ? average(defenseMetrics.map((value) => scale01(value, -4, 7))) : 0.5;
  const overall = overallMetrics.length > 0 ? average(overallMetrics.map((value) => scale01(value, -5, 8))) : average([offense, defense]);

  return { offense, defense, overall };
}

export function calculateReliabilityFactor(gp: number, mpTotal: number): number {
  const minGames = 30;
  const minMinutes = 900;
  const gpFactor = Math.min(gp / minGames, 1.0);
  const mpFactor = Math.min(mpTotal / minMinutes, 1.0);
  return Math.sqrt(gpFactor * mpFactor);
}

function buildRawAdvancedProfile(rawStats: PlayerRawStats): PlayerAdvancedProfile {
  const reliability = calculateReliabilityFactor(rawStats.GP, rawStats.MP_TOTAL);
  const gp = Math.max(1, rawStats.GP);
  const mp = Math.max(1, rawStats.MP_TOTAL);
  const mpg = mp / gp;
  const possessions = estimatePossessions(rawStats);
  const usageProxy = rawStats.USG_PROXY ?? safeDiv(rawStats.FGA + 0.44 * rawStats.FTA + rawStats.TOV, possessions, 0.2);

  const touches = rawStats.TOUCHES
    ?? (rawStats.PASSES_RECEIVED ?? 0) + (rawStats.PASSES_MADE ?? 0) + rawStats.FGA * 1.8;
  const timeOfPossession = rawStats.TIME_OF_POSSESSION ?? touches * 2.6;
  const catchShoot3PA = rawStats.CATCH_SHOOT_3PA ?? rawStats.THREE_PA * 0.58;
  const catchShoot3PM = rawStats.CATCH_SHOOT_3PM ?? rawStats.THREE_PM * 0.60;
  const catchShoot3Pct = rawStats.CATCH_SHOOT_3_PCT ?? safeDiv(catchShoot3PM, catchShoot3PA, rawStats.THREE_P_PCT);
  const pullUp3PA = rawStats.PULL_UP_3PA ?? Math.max(0, rawStats.THREE_PA - catchShoot3PA);
  const driveFga = rawStats.DRIVE_FGA ?? Math.max(0, rawStats.FGA * 0.18);
  const driveFta = rawStats.DRIVE_FTA ?? rawStats.FTA * 0.48;
  const driveFgm = rawStats.DRIVE_FGM ?? driveFga * rawStats.TWO_P_PCT;
  const driveFgPct = safeDiv(driveFgm, driveFga, rawStats.TWO_P_PCT);
  const paintTouches = rawStats.PAINT_TOUCHES ?? driveFga * 0.8;
  const potentialAst = rawStats.POTENTIAL_AST ?? rawStats.AST * 1.65;
  const secondaryAst = rawStats.SECONDARY_AST ?? rawStats.AST * 0.35;
  const passesMade = rawStats.PASSES_MADE ?? rawStats.AST * 9;
  const drivesPerGame = driveFga / gp;
  const positionSwitchBase = ({
    PG: 0.25,
    SG: 0.42,
    SF: 0.74,
    PF: 0.68,
    C: 0.50,
    G: 0.34,
    F: 0.66,
    'G-F': 0.56,
    'F-G': 0.56,
    'F-C': 0.63,
    'C-F': 0.63,
  } as Record<string, number>)[rawStats.position] ?? 0.52;

  const shotCreation = average([
    scale01(usageProxy, 0.12, 0.36),
    scale01(safeDiv(pullUp3PA, Math.max(1, rawStats.THREE_PA), 0), 0.05, 0.60),
    scale01(rawStats.ISOLATION_FREQ ?? safeDiv(driveFga, possessions, 0.05), 0.02, 0.16),
    scale01(safeDiv(timeOfPossession, gp, 0), 5, 350),
  ]);

  const rimPressure = average([
    scale01(drivesPerGame, 1, 16),
    scale01(safeDiv(rawStats.FTA, Math.max(1, rawStats.FGA), 0), 0.08, 0.58),
    scale01(paintTouches / gp, 0.5, 14),
  ]);

  const finishing = average([
    scale01(rawStats.TWO_P_PCT, 0.42, 0.68),
    scale01(driveFgPct, 0.40, 0.70),
    scale01(rawStats.TS_PCT, 0.48, 0.70),
  ]);

  const shootingGravity = average([
    scale01(rawStats.THREE_PA / gp, 0.3, 10),
    scale01(rawStats.THREE_P_PCT, 0.28, 0.44),
    scale01(safeDiv(catchShoot3PA, Math.max(1, rawStats.FGA), 0), 0.02, 0.28),
  ]);

  const spacing = average([
    shootingGravity,
    scale01(catchShoot3Pct, 0.30, 0.46),
    scale01(rawStats.CATCH_SHOOT_3PA ?? catchShoot3PA, 0.5, 7.5),
  ]);

  const freeThrowPressure = average([
    scale01(rawStats.FTA / gp, 0.5, 8),
    rimPressure,
    scale01(driveFta / gp, 0, 4.5),
  ]);

  const playmaking = average([
    scale01(rawStats.AST / gp, 0.5, 11),
    scale01(potentialAst / gp, 1, 18),
    scale01((rawStats.AST_PCT_PROXY ?? safeDiv(rawStats.AST, possessions, 0) * 100), 5, 45),
  ]);

  const secondaryCreation = average([
    scale01(secondaryAst / gp, 0, 4.5),
    scale01(passesMade / gp, 8, 90),
    scale01(rawStats.HANDOFF_FREQ ?? 0.04, 0, 0.14),
  ]);

  const turnoverResistance = 1 - average([
    scale01(rawStats.TOV / gp, 0.5, 5),
    scale01((rawStats.TOV_PCT_PROXY ?? safeDiv(rawStats.TOV, possessions, 0) * 100), 5, 24),
  ]);

  const offensiveRebounding = average([
    scale01(rawStats.OREB_PCT ?? rawStats.ORB, 0.5, 14),
    scale01(rawStats.ORB / gp, 0, 4.5),
    scale01((rawStats.CONTESTED_REB ?? 0) / gp, 0, 2.5),
  ]);

  const defensiveRebounding = average([
    scale01(rawStats.DREB_PCT ?? rawStats.DRB, 5, 32),
    scale01(rawStats.DRB / gp, 0.5, 11),
    scale01((rawStats.BOX_OUTS ?? 0) / gp, 0, 3.5),
  ]);

  const perimeterDefense = average([
    scale01(rawStats.STL / gp, 0.2, 2.2),
    scale01((rawStats.DEFLECTIONS ?? rawStats.STL * 3) / gp, 0.3, 4.5),
    1 - scale01(rawStats.PF / gp, 1, 4.5),
  ]);

  const rimDeterrence = average([
    scale01(rawStats.BLK / gp, 0, 2.8),
    scale01((rawStats.CONTESTED_SHOTS ?? rawStats.BLK * 2.5) / gp, 0, 8),
    scale01(rawStats.DREB_PCT ?? 10, 8, 26),
  ]);

  const transitionOffense = average([
    scale01(rawStats.TRANSITION_FREQ ?? safeDiv(rawStats.STL + drivesPerGame, gp * 2, 0.08), 0.05, 0.24),
    scale01(rawStats.TRANSITION_PPP ?? (0.95 + rawStats.THREE_P_PCT * 0.65), 0.9, 1.35),
    scale01((rawStats.STL + drivesPerGame) / gp, 0.4, 4.5),
  ]);

  const transitionDefense = average([
    scale01((rawStats.LOOSE_BALLS_RECOVERED ?? rawStats.STL * 0.4) / gp, 0, 1.4),
    scale01((rawStats.BOX_OUTS ?? 0) / gp, 0, 3.5),
    scale01(rawStats.DREB_PCT ?? rawStats.DRB, 5, 32),
    1 - scale01(rawStats.PF / gp, 1, 4.5),
  ]);

  const foulDiscipline = 1 - scale01(rawStats.PF / gp, 1, 4.5);
  const mobility = average([
    scale01(rawStats.STL / gp, 0.2, 2.2),
    scale01((rawStats.DEFLECTIONS ?? rawStats.STL * 3) / gp, 0.3, 4.5),
    foulDiscipline,
  ]);
  const sizeCoverage = average([
    scale01(rawStats.REB / gp, 3.0, 11.5),
    scale01(rawStats.BLK / gp, 0, 2.2),
    positionSwitchBase,
  ]);
  const switchability = average([
    calculateVersatilityIndex(rawStats),
    mobility,
    sizeCoverage,
  ]);

  const onBallUsage = average([
    scale01(usageProxy, 0.12, 0.38),
    scale01(touches / gp, 10, 95),
    scale01(timeOfPossession / gp, 5, 350),
  ]);

  const offBallValue = average([
    spacing,
    offensiveRebounding,
    scale01((rawStats.SCREEN_ASSISTS ?? 0) / gp, 0, 5),
    scale01(rawStats.CUT_FREQ ?? 0.04, 0, 0.16),
  ]);

  const volatility = average([
    scale01(safeDiv(pullUp3PA, Math.max(1, rawStats.THREE_PA), 0), 0.05, 0.60),
    scale01(safeDiv(rawStats.THREE_PA, Math.max(1, rawStats.FGA), 0), 0.10, 0.65),
    1 - turnoverResistance,
  ]);

  return {
    reliability,
    minutesLoad: scale01(mpg, 12, 38),
    durability: average([scale01(rawStats.GP, 10, 82), scale01(mpg, 10, 38)]),
    shotCreation,
    rimPressure,
    finishing,
    shootingGravity,
    spacing,
    freeThrowPressure,
    playmaking,
    secondaryCreation,
    turnoverResistance,
    offensiveRebounding,
    defensiveRebounding,
    perimeterDefense,
    rimDeterrence,
    transitionOffense,
    transitionDefense,
    foulDiscipline,
    switchability,
    onBallUsage,
    offBallValue,
    volatility,
  };
}

function calibrateWithPublicPriors(
  profile: PlayerAdvancedProfile,
  priors?: PublicMetricPriors,
): PlayerAdvancedProfile {
  if (!priors || priors.sourceCount === 0) {
    return profile;
  }

  const normalized = normalizePublicPriors(priors);
  return {
    ...profile,
    shotCreation: clamp(0, 1, profile.shotCreation * 0.82 + normalized.offense * 0.18),
    playmaking: clamp(0, 1, profile.playmaking * 0.84 + normalized.offense * 0.16),
    perimeterDefense: clamp(0, 1, profile.perimeterDefense * 0.82 + normalized.defense * 0.18),
    rimDeterrence: clamp(0, 1, profile.rimDeterrence * 0.88 + normalized.defense * 0.12),
    switchability: clamp(0, 1, profile.switchability * 0.86 + normalized.overall * 0.14),
  };
}

export function buildPlayerAdvancedProfile(
  rawStats: PlayerRawStats,
  roleSummary?: AdvancedProfileSummary,
): PlayerAdvancedProfile {
  const base = buildRawAdvancedProfile(rawStats);
  if (!roleSummary) {
    return calibrateWithPublicPriors(base, rawStats.publicMetricPriors);
  }

  const shrunk = {} as PlayerAdvancedProfile;
  for (const key of ADVANCED_PROFILE_KEYS) {
    shrunk[key] = clamp(
      0,
      1,
      shrinkValue(base[key], roleSummary[key], base.reliability, SPARSE_ADVANCED_KEYS.has(key)),
    );
  }
  return calibrateWithPublicPriors(shrunk, rawStats.publicMetricPriors);
}

function deriveFitVectors(profile: PlayerAdvancedProfile): FitVectors {
  return {
    creation: clamp(0, 1, profile.shotCreation * 0.45 + profile.playmaking * 0.35 + profile.secondaryCreation * 0.20),
    spacing: clamp(0, 1, profile.spacing * 0.55 + profile.shootingGravity * 0.35 + profile.offBallValue * 0.10),
    rimPressure: clamp(0, 1, profile.rimPressure * 0.50 + profile.freeThrowPressure * 0.30 + profile.finishing * 0.20),
    perimeterDefense: clamp(0, 1, profile.perimeterDefense * 0.55 + profile.switchability * 0.25 + profile.transitionDefense * 0.20),
    rimDefense: clamp(0, 1, profile.rimDeterrence * 0.70 + profile.defensiveRebounding * 0.30),
    rebounding: average([profile.offensiveRebounding, profile.defensiveRebounding]),
    transition: average([profile.transitionOffense, profile.transitionDefense]),
    ballSecurity: clamp(0, 1, profile.turnoverResistance * 0.80 + profile.playmaking * 0.20),
  };
}

export function buildPlayerValueModel(
  rawStats: PlayerRawStats,
  advancedProfile: PlayerAdvancedProfile,
): PlayerValueModel {
  const priors = normalizePublicPriors(rawStats.publicMetricPriors);
  const age = rawStats.AGE ?? 27;
  const ageBonus = scale01(30 - age, -4, 10);

  const offense = clamp(
    0,
    1,
    advancedProfile.shotCreation * 0.22
      + advancedProfile.rimPressure * 0.14
      + advancedProfile.finishing * 0.12
      + advancedProfile.spacing * 0.14
      + advancedProfile.playmaking * 0.16
      + advancedProfile.secondaryCreation * 0.10
      + advancedProfile.transitionOffense * 0.06
      + advancedProfile.offBallValue * 0.06,
  );

  const defense = clamp(
    0,
    1,
    advancedProfile.perimeterDefense * 0.22
      + advancedProfile.rimDeterrence * 0.20
      + advancedProfile.transitionDefense * 0.14
      + advancedProfile.foulDiscipline * 0.14
      + advancedProfile.switchability * 0.14
      + advancedProfile.defensiveRebounding * 0.16,
  );

  const utility = clamp(
    0,
    1,
    advancedProfile.turnoverResistance * 0.35
      + advancedProfile.offensiveRebounding * 0.20
      + advancedProfile.durability * 0.20
      + advancedProfile.minutesLoad * 0.25,
  );

  const scarcity = clamp(
    0,
    1,
    advancedProfile.shotCreation * 0.42
      + advancedProfile.playmaking * 0.28
      + advancedProfile.rimDeterrence * 0.30,
  );

  const gameImpact = clamp(
    25,
    99,
    22
      + offense * 34
      + defense * 24
      + utility * 12
      + priors.overall * 7
  );

  const draftValue = clamp(
    20,
    99,
    gameImpact * 0.72
      + scarcity * 13
      + ageBonus * 8
      + advancedProfile.spacing * 4
      + advancedProfile.switchability * 3
  );

  const tradeValue = clamp(
    15,
    99,
    gameImpact * 0.68
      + scarcity * 10
      + ageBonus * 6
      + utility * 6
      - advancedProfile.volatility * 6
  );

  return {
    draftValue,
    gameImpact,
    tradeValue,
    fitVectors: deriveFitVectors(advancedProfile),
    minutesTier: mapMinutesTier(advancedProfile.minutesLoad, gameImpact),
    varianceProfile: mapVarianceProfile(advancedProfile.volatility),
  };
}

export function buildPlayerFeatures(
  rawStats: PlayerRawStats,
  roleSummary: RoleSummary,
  advancedProfile?: PlayerAdvancedProfile,
): PlayerFeatures {
  const profile = advancedProfile ?? buildPlayerAdvancedProfile(rawStats);
  const reliability = profile.reliability;
  const gp = Math.max(1, rawStats.GP);
  const possessions = estimatePossessions(rawStats);
  const rawFgm = rawStats.TWO_PM + rawStats.THREE_PM;
  const rawEfg = rawStats.FGA > 0 ? (rawFgm + 0.5 * rawStats.THREE_PM) / rawStats.FGA : 0;
  const passesMade = rawStats.PASSES_MADE ?? rawStats.AST * 9;
  const potentialAst = rawStats.POTENTIAL_AST ?? rawStats.AST * (1.45 + profile.playmaking * 0.6);
  const secondaryAst = rawStats.SECONDARY_AST ?? rawStats.AST * (0.22 + profile.secondaryCreation * 0.4);
  const deflections = rawStats.DEFLECTIONS ?? rawStats.STL * (2.6 + profile.perimeterDefense * 1.2);
  const chargesDrawn = rawStats.CHARGES_DRAWN ?? (profile.perimeterDefense + profile.foulDiscipline) * 0.18 * gp;
  const astToPass = safeDiv(rawStats.AST, passesMade, 0);
  const par = safeDiv(rawStats.AST, rawStats.AST + rawStats.TOV, 0.5);
  const tovPct = rawStats.TOV_PCT_PROXY != null
    ? rawStats.TOV_PCT_PROXY / 100
    : safeDiv(rawStats.TOV, possessions, 0);
  const astPct = rawStats.AST_PCT_PROXY != null
    ? rawStats.AST_PCT_PROXY / 100
    : safeDiv(rawStats.AST, possessions, 0);
  const rebTotal = safeDiv(rawStats.REB, gp, 0);
  const usageProxy = rawStats.USG_PROXY ?? safeDiv(rawStats.FGA + 0.44 * rawStats.FTA + rawStats.TOV, possessions, 0.2);

  const shrink = (key: keyof RoleSummary, value: number) =>
    shrinkValue(value, roleSummary[key], reliability, SPARSE_FEATURE_KEYS.has(key as string));

  return {
    R: reliability,
    TS: clamp(0.45, 0.75, shrink('TS', rawStats.TS_PCT + (profile.finishing - 0.5) * 0.04 + (profile.spacing - 0.5) * 0.015)),
    THREE_P_PCT: clamp(0.22, 0.50, shrink('THREE_P_PCT', rawStats.THREE_P_PCT + (profile.shootingGravity - 0.5) * 0.03)),
    THREE_PA_RATE: clamp(0.5, 14, shrink('THREE_PA_RATE', safeDiv(rawStats.THREE_PA, gp, 0) + profile.spacing * 1.8)),
    TWO_P_PCT: clamp(0.35, 0.75, shrink('TWO_P_PCT', rawStats.TWO_P_PCT + (profile.finishing - 0.5) * 0.045)),
    TWO_PA_RATE: clamp(0.5, 18, shrink('TWO_PA_RATE', safeDiv(rawStats.TWO_PA, gp, 0) + profile.rimPressure * 1.6)),
    FT_PCT: clamp(0.45, 0.95, shrink('FT_PCT', rawStats.FT_PCT)),
    FT_RATE: clamp(0, 1, shrink('FT_RATE', safeDiv(rawStats.FTA, Math.max(1, rawStats.FGA), 0) + (profile.freeThrowPressure - 0.5) * 0.08)),
    EFG: clamp(0.35, 0.8, shrink('EFG', rawEfg + (profile.spacing - 0.5) * 0.03)),
    THREE_P_VOLUME: clamp(0, 16, shrink('THREE_P_VOLUME', safeDiv(rawStats.THREE_PA, gp, 0) + profile.shootingGravity * 2.0)),
    AST: clamp(0, 15, shrink('AST', safeDiv(rawStats.AST, gp, 0) + profile.playmaking * 1.7)),
    AST_RATE: clamp(0, 100, shrink('AST_RATE', astPct * 100 + profile.playmaking * 8)),
    POTENTIAL_AST: clamp(0, 20, shrink('POTENTIAL_AST', safeDiv(potentialAst, gp, 0))),
    AST_TO_PASS_RATE: clamp(0, 1, shrink('AST_TO_PASS_RATE', astToPass + (profile.playmaking - 0.5) * 0.05)),
    SECONDARY_AST: clamp(0, 8, shrink('SECONDARY_AST', safeDiv(secondaryAst, gp, 0))),
    PAR: clamp(0, 1, shrink('PAR', par * 0.85 + profile.turnoverResistance * 0.15)),
    TOV: clamp(0, 8, shrink('TOV', Math.max(0, safeDiv(rawStats.TOV, gp, 0) - (profile.turnoverResistance - 0.5) * 0.8))),
    TOV_RATE: clamp(0, 100, shrink('TOV_RATE', Math.max(0, tovPct * 100 - profile.turnoverResistance * 4))),
    A2T: clamp(0, 10, shrink('A2T', rawStats.TOV > 0 ? rawStats.AST / rawStats.TOV : rawStats.AST)),
    STL: clamp(0, 4, shrink('STL', safeDiv(rawStats.STL, gp, 0) + profile.perimeterDefense * 0.25)),
    BLK: clamp(0, 4, shrink('BLK', safeDiv(rawStats.BLK, gp, 0) + profile.rimDeterrence * 0.22)),
    STL_RATE: clamp(0, 100, shrink('STL_RATE', safeDiv(rawStats.STL, possessions, 0) * 100 + profile.perimeterDefense * 2.5)),
    BLK_RATE: clamp(0, 100, shrink('BLK_RATE', safeDiv(rawStats.BLK, possessions, 0) * 100 + profile.rimDeterrence * 2.8)),
    DEFLECTIONS: clamp(0, 12, shrink('DEFLECTIONS', safeDiv(deflections, gp, 0))),
    PF_RATE: clamp(0, 8, shrink('PF_RATE', Math.max(0, safeDiv(rawStats.PF, gp, 0) - profile.foulDiscipline * 0.4))),
    CHARGES_DRAWN: clamp(0, 2, shrink('CHARGES_DRAWN', safeDiv(chargesDrawn, gp, 0))),
    OREB_PCT: clamp(0, 30, shrink('OREB_PCT', (rawStats.OREB_PCT ?? 0) + profile.offensiveRebounding * 2)),
    DREB_PCT: clamp(0, 40, shrink('DREB_PCT', (rawStats.DREB_PCT ?? 0) + profile.defensiveRebounding * 3)),
    REB_TOTAL: clamp(0, 20, shrink('REB_TOTAL', rebTotal + average([profile.offensiveRebounding, profile.defensiveRebounding]) * 1.4)),
    USG: clamp(0, 1, shrink('USG', clamp(0, 1, usageProxy * 0.78 + profile.onBallUsage * 0.22))),
    VI: clamp(0, 1, shrink('VI', average([calculateVersatilityIndex(rawStats), profile.switchability, profile.offBallValue]))),
  };
}

export function buildPlayerModel(
  rawStats: PlayerRawStats,
  advancedRoleSummary?: AdvancedProfileSummary,
  featureRoleSummary?: RoleSummary,
): BuiltPlayerModel {
  const advancedProfile = buildPlayerAdvancedProfile(rawStats, advancedRoleSummary);
  const valueModel = buildPlayerValueModel(rawStats, advancedProfile);
  const fallbackFeatureSummary = featureRoleSummary ?? buildFeatureSummaryBaseline(rawStats);
  const features = buildPlayerFeatures(rawStats, fallbackFeatureSummary, advancedProfile);

  return {
    advancedProfile,
    valueModel,
    features,
  };
}

function buildFeatureSummaryBaseline(rawStats: PlayerRawStats): RoleSummary {
  const gp = Math.max(1, rawStats.GP);
  const possessions = estimatePossessions(rawStats);
  return {
    TS: rawStats.TS_PCT,
    THREE_P_PCT: rawStats.THREE_P_PCT,
    THREE_PA_RATE: safeDiv(rawStats.THREE_PA, gp, 0),
    TWO_P_PCT: rawStats.TWO_P_PCT,
    TWO_PA_RATE: safeDiv(rawStats.TWO_PA, gp, 0),
    FT_PCT: rawStats.FT_PCT,
    FT_RATE: safeDiv(rawStats.FTA, Math.max(1, rawStats.FGA), 0),
    EFG: rawStats.FGA > 0 ? (rawStats.TWO_PM + 1.5 * rawStats.THREE_PM) / rawStats.FGA : 0,
    THREE_P_VOLUME: safeDiv(rawStats.THREE_PA, gp, 0),
    AST: safeDiv(rawStats.AST, gp, 0),
    AST_RATE: safeDiv(rawStats.AST, possessions, 0) * 100,
    POTENTIAL_AST: safeDiv(rawStats.POTENTIAL_AST ?? rawStats.AST * 1.5, gp, 0),
    AST_TO_PASS_RATE: safeDiv(rawStats.AST, rawStats.PASSES_MADE ?? rawStats.AST * 9, 0),
    SECONDARY_AST: safeDiv(rawStats.SECONDARY_AST ?? rawStats.AST * 0.3, gp, 0),
    PAR: safeDiv(rawStats.AST, rawStats.AST + rawStats.TOV, 0.5),
    TOV: safeDiv(rawStats.TOV, gp, 0),
    TOV_RATE: safeDiv(rawStats.TOV, possessions, 0) * 100,
    A2T: rawStats.TOV > 0 ? rawStats.AST / rawStats.TOV : rawStats.AST,
    STL: safeDiv(rawStats.STL, gp, 0),
    BLK: safeDiv(rawStats.BLK, gp, 0),
    STL_RATE: safeDiv(rawStats.STL, possessions, 0) * 100,
    BLK_RATE: safeDiv(rawStats.BLK, possessions, 0) * 100,
    DEFLECTIONS: safeDiv(rawStats.DEFLECTIONS ?? rawStats.STL * 3, gp, 0),
    PF_RATE: safeDiv(rawStats.PF, gp, 0),
    CHARGES_DRAWN: safeDiv(rawStats.CHARGES_DRAWN ?? 0, gp, 0),
    OREB_PCT: rawStats.OREB_PCT ?? 0,
    DREB_PCT: rawStats.DREB_PCT ?? 0,
    REB_TOTAL: safeDiv(rawStats.REB, gp, 0),
    USG: rawStats.USG_PROXY ?? safeDiv(rawStats.FGA + 0.44 * rawStats.FTA + rawStats.TOV, possessions, 0.2),
    VI: calculateVersatilityIndex(rawStats),
  };
}

export function computeAdvancedProfileAverages(
  profiles: PlayerAdvancedProfile[],
): AdvancedProfileSummary {
  return meanRecord(profiles, ADVANCED_PROFILE_KEYS);
}

export function standardizeFeatures(
  features: PlayerFeatures,
  populationMean: Record<string, number>,
  populationStd: Record<string, number>,
): Record<string, number> {
  const zScores: Record<string, number> = {};

  for (const key of FEATURE_KEYS) {
    const value = features[key] ?? 0;
    const mean = populationMean[key] ?? 0;
    const std = populationStd[key] ?? 1;
    zScores[key] = (value - mean) / Math.max(std, 0.0001);
  }

  return zScores;
}

export function zScoreToPercentile(z: number): number {
  const sign = z >= 0 ? 1 : -1;
  const x = Math.abs(z) / Math.sqrt(2);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1.0 / (1.0 + p * x);
  const erf = sign * (1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x));
  return 0.5 * (1.0 + erf);
}

export function computePopulationStats(
  allFeatures: PlayerFeatures[],
): { mean: Record<string, number>; std: Record<string, number> } {
  const mean: Record<string, number> = {};
  const std: Record<string, number> = {};

  for (const key of FEATURE_KEYS) {
    const values = allFeatures
      .map((feature) => feature[key] ?? 0)
      .filter(Number.isFinite);

    const avg = average(values);
    mean[key] = avg;
    const variance = average(values.map((value) => Math.pow(value - avg, 2)));
    std[key] = Math.sqrt(Math.max(variance, 0.0001));
  }

  return { mean, std };
}

/**
 * server/services/simulation.ts
 *
 * Hybrid event-based simulation engine. Games resolve through possession-level
 * buckets rather than a pure ORtg/DRtg Monte Carlo.
 */

import {
  CoachingDecision,
  FunctionalRole,
  MatchupDriver,
  MatchupResult,
  QuarterResult,
  RosterRole,
  SIMULATION_PARAMS,
  TeamAggregation,
} from '@nba-draft-sim/shared';

interface TeamGamePlan {
  possessionVolume: number;
  transitionShare: number;
  turnoverRate: number;
  foulRate: number;
  freeThrowRate: number;
  rimRate: number;
  rimAccuracy: number;
  paintRate: number;
  paintAccuracy: number;
  threeRate: number;
  threeAccuracy: number;
  offensiveReboundRate: number;
  ballSecurity: number;
  primaryCreation: number;
  secondaryCreation: number;
  spacing: number;
  rimPressure: number;
  finishing: number;
  perimeterDefense: number;
  rimDefense: number;
  ballPressure: number;
  paintPacking: number;
  rimContest: number;
  closeoutIntegrity: number;
  reboundPositioning: number;
  transitionDefense: number;
  transitionContainment: number;
  turnoverPressure: number;
  defensiveReboundRate: number;
  foulDiscipline: number;
  benchDepth: number;
  volatility: number;
  switchability: number;
  ftPct: number;
  coachingImpact: number;
}

interface TeamEventSummary {
  points: number;
  turnovers: number;
  foulTrips: number;
  rimAttempts: number;
  rimMakes: number;
  paintAttempts: number;
  paintMakes: number;
  threeAttempts: number;
  threeMakes: number;
  offensiveRebounds: number;
  transitionPoints: number;
}

interface SimulatedGame {
  scoreA: number;
  scoreB: number;
  summaryA: TeamEventSummary;
  summaryB: TeamEventSummary;
}

interface CoachingPlanAdjustments {
  pace: number;
  transitionShare: number;
  transitionDefense: number;
  turnoverRate: number;
  foulRate: number;
  freeThrowRate: number;
  rimRate: number;
  rimAccuracy: number;
  paintRate: number;
  paintAccuracy: number;
  threeRate: number;
  threeAccuracy: number;
  offensiveReboundRate: number;
  ballSecurity: number;
  primaryCreation: number;
  secondaryCreation: number;
  spacing: number;
  rimPressure: number;
  finishing: number;
  perimeterDefense: number;
  rimDefense: number;
  ballPressure: number;
  paintPacking: number;
  rimContest: number;
  closeoutIntegrity: number;
  reboundPositioning: number;
  turnoverPressure: number;
  transitionContainment: number;
  defensiveReboundRate: number;
  foulDiscipline: number;
  volatility: number;
  switchability: number;
  coachingImpact: number;
}

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]): number {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return 0;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

function randomNormal(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

function sampleCount(trials: number, probability: number): number {
  const p = clamp(0, 1, probability);
  let successes = 0;
  for (let i = 0; i < trials; i++) {
    if (Math.random() < p) successes++;
  }
  return successes;
}

function baseEventSummary(): TeamEventSummary {
  return {
    points: 0,
    turnovers: 0,
    foulTrips: 0,
    rimAttempts: 0,
    rimMakes: 0,
    paintAttempts: 0,
    paintMakes: 0,
    threeAttempts: 0,
    threeMakes: 0,
    offensiveRebounds: 0,
    transitionPoints: 0,
  };
}

function buildShotMix(
  rimRate: number,
  threeRate: number,
  minPaintRate: number,
  maxPaintRate: number,
): { rimRate: number; threeRate: number; paintRate: number } {
  const paintRate = clamp(minPaintRate, maxPaintRate, 1 - rimRate - threeRate);
  const total = Math.max(rimRate + threeRate + paintRate, 0.0001);

  return {
    rimRate: rimRate / total,
    threeRate: threeRate / total,
    paintRate: paintRate / total,
  };
}

function rosterRoleShare(team: TeamAggregation, role: RosterRole): number {
  return team.roleProfile?.rosterRoleShare?.[role] ?? 0;
}

function functionalRoleShare(team: TeamAggregation, role: FunctionalRole): number {
  return team.roleProfile?.functionalRoleShare?.[role] ?? 0;
}

function calculateCoachingAdjustments(team: TeamAggregation, decision?: CoachingDecision): CoachingPlanAdjustments {
  const adjustments: CoachingPlanAdjustments = {
    pace: 0,
    transitionShare: 0,
    transitionDefense: 0,
    turnoverRate: 0,
    foulRate: 0,
    freeThrowRate: 0,
    rimRate: 0,
    rimAccuracy: 0,
    paintRate: 0,
    paintAccuracy: 0,
    threeRate: 0,
    threeAccuracy: 0,
    offensiveReboundRate: 0,
    ballSecurity: 0,
    primaryCreation: 0,
    secondaryCreation: 0,
    spacing: 0,
    rimPressure: 0,
    finishing: 0,
    perimeterDefense: 0,
    rimDefense: 0,
    ballPressure: 0,
    paintPacking: 0,
    rimContest: 0,
    closeoutIntegrity: 0,
    reboundPositioning: 0,
    turnoverPressure: 0,
    transitionContainment: 0,
    defensiveReboundRate: 0,
    foulDiscipline: 0,
    volatility: 0,
    switchability: 0,
    coachingImpact: 0,
  };

  if (!decision) return adjustments;

  const backcourtShare = rosterRoleShare(team, 'backcourt');
  const wingShare = rosterRoleShare(team, 'wing');
  const frontcourtShare = rosterRoleShare(team, 'frontcourt');
  const primaryCreatorShare = functionalRoleShare(team, 'primary_creator');
  const secondaryCreatorShare = functionalRoleShare(team, 'secondary_creator');
  const connectorShare = functionalRoleShare(team, 'connector');
  const movementShooterShare = functionalRoleShare(team, 'movement_shooter');
  const twoWayWingShare = functionalRoleShare(team, 'two_way_wing');
  const stretchBigShare = functionalRoleShare(team, 'stretch_big');
  const rimBigShare = functionalRoleShare(team, 'rim_big');

  const smallBallFactor = clamp(
    0.75,
    1.35,
    0.78
      + wingShare * 0.35
      + movementShooterShare * 0.22
      + twoWayWingShare * 0.18
      + stretchBigShare * 0.12
      - rimBigShare * 0.15,
  );
  const bigLineupFactor = clamp(
    0.75,
    1.35,
    0.78
      + frontcourtShare * 0.35
      + rimBigShare * 0.22
      + stretchBigShare * 0.12
      - backcourtShare * 0.10,
  );
  const motionFactor = clamp(
    0.75,
    1.4,
    0.80
      + connectorShare * 0.32
      + secondaryCreatorShare * 0.22
      + movementShooterShare * 0.16
      + team.teamModel.ballSecurity * 0.12,
  );
  const isolationFactor = clamp(
    0.75,
    1.4,
    0.80
      + primaryCreatorShare * 0.34
      + team.teamModel.primaryCreation * 0.18
      - connectorShare * 0.08,
  );
  const pressureBallFactor = clamp(
    0.75,
    1.35,
    0.80
      + backcourtShare * 0.16
      + twoWayWingShare * 0.26
      + team.teamModel.ballPressure * 0.24
      + team.teamModel.closeoutIntegrity * 0.08,
  );
  const protectPaintFactor = clamp(
    0.75,
    1.35,
    0.80
      + frontcourtShare * 0.22
      + rimBigShare * 0.26
      + stretchBigShare * 0.10
      + average([team.teamModel.paintPacking, team.teamModel.rimContest]) * 0.18,
  );
  const switchFactor = clamp(
    0.75,
    1.35,
    0.80
      + wingShare * 0.18
      + twoWayWingShare * 0.28
      + team.teamModel.switchability * 0.16
      + team.teamModel.closeoutIntegrity * 0.10
      - rimBigShare * 0.08,
  );

  switch (decision.lineupStrategy) {
    case 'small_ball':
      adjustments.pace += 2.8 * smallBallFactor;
      adjustments.transitionShare += 0.024 * smallBallFactor;
      adjustments.transitionContainment += 0.02 * smallBallFactor;
      adjustments.spacing += 0.06 * smallBallFactor;
      adjustments.threeRate += 0.05 * smallBallFactor;
      adjustments.threeAccuracy += 0.012 * smallBallFactor;
      adjustments.secondaryCreation += 0.015 * smallBallFactor;
      adjustments.ballSecurity += 0.015 * smallBallFactor;
      adjustments.ballPressure += 0.02 * smallBallFactor;
      adjustments.closeoutIntegrity += 0.04 * smallBallFactor;
      adjustments.offensiveReboundRate -= 0.02 * smallBallFactor;
      adjustments.defensiveReboundRate -= 0.008 * smallBallFactor;
      adjustments.reboundPositioning -= 0.02 * smallBallFactor;
      adjustments.rimContest -= 0.025 * smallBallFactor;
      adjustments.paintPacking -= 0.03 * smallBallFactor;
      adjustments.switchability += 0.06 * smallBallFactor;
      adjustments.volatility += 0.02 * smallBallFactor;
      adjustments.coachingImpact += 2.05 * smallBallFactor;
      break;
    case 'big_lineup':
      adjustments.pace -= 2.0 * bigLineupFactor;
      adjustments.transitionShare -= 0.02 * bigLineupFactor;
      adjustments.transitionContainment -= 0.01 * bigLineupFactor;
      adjustments.offensiveReboundRate += 0.03 * bigLineupFactor;
      adjustments.defensiveReboundRate += 0.03 * bigLineupFactor;
      adjustments.reboundPositioning += 0.03 * bigLineupFactor;
      adjustments.rimContest += 0.05 * bigLineupFactor;
      adjustments.paintPacking += 0.045 * bigLineupFactor;
      adjustments.closeoutIntegrity -= 0.02 * bigLineupFactor;
      adjustments.switchability -= 0.015 * bigLineupFactor;
      adjustments.spacing -= 0.03 * bigLineupFactor;
      adjustments.coachingImpact += 1.6 * bigLineupFactor;
      break;
    case 'offense_first':
      adjustments.primaryCreation += 0.04;
      adjustments.spacing += 0.03;
      adjustments.finishing += 0.03;
      adjustments.perimeterDefense -= 0.03;
      adjustments.rimDefense -= 0.02;
      adjustments.coachingImpact += 1.2;
      break;
    case 'defense_first':
      adjustments.ballPressure += 0.03;
      adjustments.closeoutIntegrity += 0.02;
      adjustments.rimContest += 0.03;
      adjustments.paintPacking += 0.02;
      adjustments.defensiveReboundRate += 0.02;
      adjustments.primaryCreation -= 0.02;
      adjustments.threeRate -= 0.01;
      adjustments.coachingImpact += 1.2;
      break;
    default:
      break;
  }

  switch (decision.offensiveStrategy) {
    case 'pace_and_space':
      adjustments.pace += 2.5 * (0.85 + movementShooterShare * 0.30 + stretchBigShare * 0.15);
      adjustments.transitionShare += 0.015 * (0.85 + backcourtShare * 0.18);
      adjustments.threeRate += 0.05 * (0.85 + movementShooterShare * 0.30 + stretchBigShare * 0.18);
      adjustments.threeAccuracy += 0.02 * (0.85 + connectorShare * 0.18 + movementShooterShare * 0.18);
      adjustments.spacing += 0.05 * (0.85 + movementShooterShare * 0.25 + stretchBigShare * 0.18);
      adjustments.rimRate -= 0.03 * (0.85 + movementShooterShare * 0.16);
      adjustments.coachingImpact += 1.5 * (0.85 + movementShooterShare * 0.20 + stretchBigShare * 0.10);
      break;
    case 'inside_out':
      adjustments.rimRate += 0.04 * (0.85 + frontcourtShare * 0.22 + rimBigShare * 0.20);
      adjustments.paintRate += 0.03 * (0.85 + frontcourtShare * 0.22);
      adjustments.freeThrowRate += 0.03 * (0.85 + primaryCreatorShare * 0.14 + rimBigShare * 0.12);
      adjustments.offensiveReboundRate += 0.015 * (0.85 + frontcourtShare * 0.22 + rimBigShare * 0.18);
      adjustments.threeRate -= 0.03 * (0.85 + frontcourtShare * 0.12);
      adjustments.coachingImpact += 1.3 * (0.85 + frontcourtShare * 0.18 + rimBigShare * 0.12);
      break;
    case 'motion_offense':
      adjustments.pace += 0.7 * motionFactor;
      adjustments.secondaryCreation += 0.06 * motionFactor;
      adjustments.primaryCreation += 0.015 * motionFactor;
      adjustments.ballSecurity += 0.045 * motionFactor;
      adjustments.spacing += 0.025 * motionFactor;
      adjustments.threeRate += 0.02 * motionFactor;
      adjustments.threeAccuracy += 0.012 * motionFactor;
      adjustments.paintAccuracy += 0.012 * motionFactor;
      adjustments.turnoverRate -= 0.012 * motionFactor;
      adjustments.volatility -= 0.015 * motionFactor;
      adjustments.coachingImpact += 1.55 * motionFactor;
      break;
    case 'isolation':
      adjustments.primaryCreation += 0.05 * isolationFactor;
      adjustments.rimPressure += 0.03 * isolationFactor;
      adjustments.threeRate -= 0.015 * isolationFactor;
      adjustments.ballSecurity -= 0.02 * isolationFactor;
      adjustments.volatility += 0.05 * isolationFactor;
      adjustments.coachingImpact += 1.0 * isolationFactor;
      break;
    default:
      break;
  }

  switch (decision.defensiveStrategy) {
    case 'pressure_ball':
      adjustments.ballPressure += 0.11 * pressureBallFactor;
      adjustments.transitionShare += 0.014 * pressureBallFactor;
      adjustments.transitionContainment += 0.04 * pressureBallFactor;
      adjustments.closeoutIntegrity += 0.03 * pressureBallFactor;
      adjustments.switchability += 0.028 * pressureBallFactor;
      adjustments.foulDiscipline -= 0.008 * pressureBallFactor;
      adjustments.defensiveReboundRate -= 0.004 * pressureBallFactor;
      adjustments.coachingImpact += 1.85 * pressureBallFactor;
      break;
    case 'protect_paint':
      adjustments.paintPacking += 0.12 * protectPaintFactor;
      adjustments.rimContest += 0.08 * protectPaintFactor;
      adjustments.reboundPositioning += 0.05 * protectPaintFactor;
      adjustments.defensiveReboundRate += 0.055 * protectPaintFactor;
      adjustments.transitionContainment += 0.012 * protectPaintFactor;
      adjustments.closeoutIntegrity -= 0.05 * protectPaintFactor;
      adjustments.ballPressure -= 0.01 * protectPaintFactor;
      adjustments.switchability -= 0.01 * protectPaintFactor;
      adjustments.foulDiscipline += 0.024 * protectPaintFactor;
      adjustments.coachingImpact += 1.75 * protectPaintFactor;
      break;
    case 'switch_everything':
      adjustments.switchability += 0.10 * switchFactor;
      adjustments.closeoutIntegrity += 0.055 * switchFactor;
      adjustments.transitionContainment += 0.02 * switchFactor;
      adjustments.ballPressure += 0.018 * switchFactor;
      adjustments.rimContest += 0.02 * switchFactor;
      adjustments.paintPacking -= 0.008 * switchFactor;
      adjustments.offensiveReboundRate -= 0.008 * switchFactor;
      adjustments.defensiveReboundRate -= 0.016 * switchFactor;
      adjustments.reboundPositioning -= 0.018 * switchFactor;
      adjustments.coachingImpact += 1.7 * switchFactor;
      break;
    case 'pack_paint':
      adjustments.rimContest += 0.04 * protectPaintFactor;
      adjustments.paintPacking += 0.06 * protectPaintFactor;
      adjustments.reboundPositioning += 0.03 * protectPaintFactor;
      adjustments.defensiveReboundRate += 0.03 * protectPaintFactor;
      adjustments.closeoutIntegrity -= 0.04 * protectPaintFactor;
      adjustments.coachingImpact += 1.0 * protectPaintFactor;
      break;
    default:
      break;
  }

  return adjustments;
}

export function buildGamePlan(team: TeamAggregation, coaching?: CoachingDecision): TeamGamePlan {
  const adjustments = calculateCoachingAdjustments(team, coaching);
  const baseBallPressure = team.teamModel.ballPressure
    ?? team.teamModel.turnoverPressure
    ?? team.teamModel.perimeterDefense
    ?? 0.5;
  const basePaintPacking = team.teamModel.paintPacking
    ?? average([team.teamModel.rimDefense ?? 0.5, team.teamModel.defensiveReboundRate ?? 0.5])
    ?? 0.5;
  const baseRimContest = team.teamModel.rimContest
    ?? team.teamModel.rimDefense
    ?? 0.5;
  const baseCloseoutIntegrity = team.teamModel.closeoutIntegrity
    ?? team.teamModel.perimeterDefense
    ?? 0.5;
  const baseReboundPositioning = team.teamModel.reboundPositioning
    ?? team.teamModel.defensiveReboundRate
    ?? 0.5;
  const baseTransitionContainment = team.teamModel.transitionContainment
    ?? team.teamModel.transitionDefense
    ?? average([team.teamModel.perimeterDefense ?? 0.5, team.teamModel.turnoverPressure ?? 0.5])
    ?? 0.5;
  const ballPressure = clamp(0.10, 1, baseBallPressure + adjustments.ballPressure);
  const paintPacking = clamp(0, 1, basePaintPacking + adjustments.paintPacking);
  const rimContest = clamp(0.10, 1, baseRimContest + adjustments.rimContest);
  const closeoutIntegrity = clamp(0.10, 1, baseCloseoutIntegrity + adjustments.closeoutIntegrity);
  const reboundPositioning = clamp(0.10, 1, baseReboundPositioning + adjustments.reboundPositioning);
  const transitionContainment = clamp(0.10, 1, baseTransitionContainment + adjustments.transitionContainment);
  const switchability = clamp(0.10, 1, team.teamModel.switchability + adjustments.switchability);
  const perimeterDefense = clamp(0.10, 1, average([ballPressure, closeoutIntegrity]) + adjustments.perimeterDefense * 0.2);
  const rimDefense = clamp(0.10, 1, average([rimContest, paintPacking]) + adjustments.rimDefense * 0.2);
  const transitionDefense = clamp(
    0.10,
    1,
    average([transitionContainment, closeoutIntegrity * 0.35 + ballPressure * 0.65]) + adjustments.transitionDefense * 0.15,
  );
  const turnoverPressure = clamp(
    0.10,
    1,
    ballPressure * 0.70 + switchability * 0.18 + transitionContainment * 0.12 + adjustments.turnoverPressure * 0.10,
  );
  return {
    possessionVolume: clamp(90, 108, team.teamModel.possessionVolume + adjustments.pace),
    transitionShare: clamp(0.06, 0.28, team.teamModel.transitionShare + adjustments.transitionShare),
    transitionDefense,
    transitionContainment,
    turnoverRate: clamp(0.08, 0.22, team.teamModel.turnoverRate + adjustments.turnoverRate),
    foulRate: clamp(0.08, 0.24, team.teamModel.foulRate + adjustments.foulRate),
    freeThrowRate: clamp(0.08, 0.38, team.teamModel.freeThrowRate + adjustments.freeThrowRate),
    rimRate: clamp(0.16, 0.50, team.teamModel.rimRate + adjustments.rimRate),
    rimAccuracy: clamp(0.45, 0.76, team.teamModel.rimAccuracy + adjustments.rimAccuracy),
    paintRate: clamp(0.10, 0.38, team.teamModel.paintRate + adjustments.paintRate),
    paintAccuracy: clamp(0.32, 0.60, team.teamModel.paintAccuracy + adjustments.paintAccuracy),
    threeRate: clamp(0.18, 0.60, team.teamModel.threeRate + adjustments.threeRate),
    threeAccuracy: clamp(0.27, 0.45, team.teamModel.threeAccuracy + adjustments.threeAccuracy),
    offensiveReboundRate: clamp(0.12, 0.38, team.teamModel.offensiveReboundRate + adjustments.offensiveReboundRate),
    ballSecurity: clamp(0.20, 0.95, team.teamModel.ballSecurity + adjustments.ballSecurity),
    primaryCreation: clamp(0.15, 1, team.teamModel.primaryCreation + adjustments.primaryCreation),
    secondaryCreation: clamp(0.10, 1, team.teamModel.secondaryCreation + adjustments.secondaryCreation),
    spacing: clamp(0.15, 1, team.teamModel.spacing + adjustments.spacing),
    rimPressure: clamp(0.10, 1, team.teamModel.rimPressure + adjustments.rimPressure),
    finishing: clamp(0.15, 1, team.teamModel.finishing + adjustments.finishing),
    perimeterDefense,
    rimDefense,
    ballPressure,
    paintPacking,
    rimContest,
    closeoutIntegrity,
    reboundPositioning,
    turnoverPressure,
    defensiveReboundRate: clamp(
      0.60,
      0.90,
      team.teamModel.defensiveReboundRate + adjustments.defensiveReboundRate + (reboundPositioning - baseReboundPositioning) * 0.08,
    ),
    foulDiscipline: clamp(0.10, 1, team.teamModel.foulDiscipline + adjustments.foulDiscipline),
    benchDepth: team.teamModel.benchDepth,
    volatility: clamp(0.05, 1, team.teamModel.volatility + adjustments.volatility),
    switchability,
    ftPct: clamp(0.60, 0.90, team.features.FT_PCT ?? 0.76),
    coachingImpact: adjustments.coachingImpact,
  };
}

function resolveOffense(
  offense: TeamGamePlan,
  defense: TeamGamePlan,
  possessions: number,
  quarterScale = 1,
): TeamEventSummary {
  const summary = baseEventSummary();
  const scaledPossessions = Math.max(1, Math.round(possessions * quarterScale));
  const switchDisruption = clamp(
    0,
    0.20,
    defense.switchability * 0.09
      + defense.closeoutIntegrity * 0.05
      + defense.transitionContainment * 0.015
      - defense.paintPacking * 0.01,
  );
  const adjustedPrimaryCreation = clamp(
    0.10,
    1,
    offense.primaryCreation - switchDisruption * 0.75,
  );
  const adjustedSecondaryCreation = clamp(
    0.10,
    1,
    offense.secondaryCreation - switchDisruption * 0.55,
  );
  const adjustedSpacing = clamp(
    0.10,
    1,
    offense.spacing - defense.closeoutIntegrity * 0.03 - defense.switchability * 0.015,
  );
  const turnoverRate = clamp(
    0.08,
    0.22,
    offense.turnoverRate
      - offense.ballSecurity * 0.03
      + defense.ballPressure * 0.05
      + defense.switchability * 0.012
      + defense.closeoutIntegrity * 0.004,
  );
  summary.turnovers = sampleCount(scaledPossessions, turnoverRate);

  const livePossessions = Math.max(0, scaledPossessions - summary.turnovers);
  const foulTripRate = clamp(
    0.04,
    0.20,
    offense.foulRate
      + offense.freeThrowRate * 0.25
      - defense.foulDiscipline * 0.04
      - defense.paintPacking * 0.02
      - defense.rimContest * 0.015,
  );
  summary.foulTrips = sampleCount(livePossessions, foulTripRate);
  summary.points += Math.round(summary.foulTrips * (1.35 + offense.ftPct * 0.55));

  const shotPossessions = Math.max(0, livePossessions - summary.foulTrips);
  const transitionPossessions = sampleCount(
    shotPossessions,
    clamp(
      0.04,
      0.26,
      offense.transitionShare
        - defense.ballPressure * 0.01
        - defense.transitionContainment * 0.035
        - defense.switchability * 0.015
        - switchDisruption * 0.01,
    ),
  );
  const halfCourtPossessions = Math.max(0, shotPossessions - transitionPossessions);

  const transitionMix = buildShotMix(
    clamp(
      0.25,
      0.60,
      offense.rimRate
      + offense.rimPressure * 0.10
      + adjustedPrimaryCreation * 0.02
      - defense.transitionContainment * 0.055
      - defense.rimContest * 0.025
      - defense.paintPacking * 0.025
      - defense.switchability * 0.02
      - switchDisruption * 0.01,
    ),
    clamp(
      0.10,
      0.42,
      offense.threeRate
      + adjustedSpacing * 0.06
      + defense.paintPacking * 0.03
      - defense.closeoutIntegrity * 0.04
      - defense.switchability * 0.022
      - switchDisruption * 0.01,
    ),
    0.08,
    0.30,
  );
  const halfCourtMix = buildShotMix(
    clamp(
      0.16,
      0.50,
      offense.rimRate
      + offense.rimPressure * 0.05
      + adjustedPrimaryCreation * 0.025
      - defense.rimContest * 0.09
      - defense.paintPacking * 0.06
      - defense.switchability * 0.045
      - switchDisruption * 0.02,
    ),
    clamp(
      0.18,
      0.56,
      offense.threeRate
      + adjustedSpacing * 0.03
      + adjustedSecondaryCreation * 0.015
      + defense.paintPacking * 0.05
      + defense.rimContest * 0.015
      - defense.closeoutIntegrity * 0.07
      - defense.switchability * 0.035
      - switchDisruption * 0.015,
    ),
    0.10,
    0.34,
  );

  const rimAccuracy = clamp(
    0.42,
    0.76,
    offense.rimAccuracy
      + offense.finishing * 0.08
      - defense.rimContest * 0.08
      - defense.paintPacking * 0.03
      - defense.switchability * 0.01,
  );
  const paintAccuracy = clamp(
    0.32,
    0.60,
    offense.paintAccuracy
      + adjustedPrimaryCreation * 0.04
      - average([defense.rimContest, defense.closeoutIntegrity]) * 0.05
      - defense.paintPacking * 0.03
      - defense.switchability * 0.025
      - switchDisruption * 0.02,
  );
  const threeAccuracy = clamp(
    0.25,
    0.46,
    offense.threeAccuracy
      + adjustedSpacing * 0.05
      + adjustedSecondaryCreation * 0.02
      - defense.closeoutIntegrity * 0.085
      - defense.switchability * 0.045
      - switchDisruption * 0.02,
  );

  const transitionRimAttempts = sampleCount(transitionPossessions, transitionMix.rimRate);
  const transitionThreeAttempts = sampleCount(transitionPossessions - transitionRimAttempts, transitionMix.threeRate);
  const transitionPaintAttempts = Math.max(0, transitionPossessions - transitionRimAttempts - transitionThreeAttempts);

  const halfCourtRimAttempts = sampleCount(halfCourtPossessions, halfCourtMix.rimRate);
  const halfCourtThreeAttempts = sampleCount(halfCourtPossessions - halfCourtRimAttempts, halfCourtMix.threeRate);
  const halfCourtPaintAttempts = Math.max(0, halfCourtPossessions - halfCourtRimAttempts - halfCourtThreeAttempts);

  summary.rimAttempts = transitionRimAttempts + halfCourtRimAttempts;
  summary.threeAttempts = transitionThreeAttempts + halfCourtThreeAttempts;
  summary.paintAttempts = transitionPaintAttempts + halfCourtPaintAttempts;

  summary.rimMakes = sampleCount(summary.rimAttempts, rimAccuracy);
  summary.threeMakes = sampleCount(summary.threeAttempts, threeAccuracy);
  summary.paintMakes = sampleCount(summary.paintAttempts, paintAccuracy);

  const missedShots = (summary.rimAttempts - summary.rimMakes)
    + (summary.threeAttempts - summary.threeMakes)
    + (summary.paintAttempts - summary.paintMakes);
  summary.offensiveRebounds = sampleCount(
    missedShots,
    clamp(
      0.10,
      0.38,
      offense.offensiveReboundRate
        - (defense.defensiveReboundRate - 0.68) * 0.45
        - defense.reboundPositioning * 0.10,
    ),
  );

  const secondChancePossessions = Math.round(summary.offensiveRebounds * 0.72);
  if (secondChancePossessions > 0) {
    const secondChanceRimAttempts = sampleCount(
      secondChancePossessions,
      clamp(0.20, 0.56, offense.rimRate + 0.08 - defense.paintPacking * 0.06 - defense.rimContest * 0.04),
    );
    const secondChanceThreeAttempts = sampleCount(
      secondChancePossessions - secondChanceRimAttempts,
      clamp(0.10, 0.40, offense.threeRate - 0.05),
    );
    const secondChancePaintAttempts = Math.max(0, secondChancePossessions - secondChanceRimAttempts - secondChanceThreeAttempts);

    summary.rimAttempts += secondChanceRimAttempts;
    summary.threeAttempts += secondChanceThreeAttempts;
    summary.paintAttempts += secondChancePaintAttempts;

    const scRimMakes = sampleCount(
      secondChanceRimAttempts,
      clamp(0.45, 0.78, rimAccuracy + 0.03 - defense.paintPacking * 0.02 - defense.rimContest * 0.015),
    );
    const scThreeMakes = sampleCount(secondChanceThreeAttempts, threeAccuracy);
    const scPaintMakes = sampleCount(secondChancePaintAttempts, clamp(0.32, 0.60, paintAccuracy + 0.02));

    summary.rimMakes += scRimMakes;
    summary.threeMakes += scThreeMakes;
    summary.paintMakes += scPaintMakes;
  }

  summary.transitionPoints = (summary.rimMakes * 2 + summary.threeMakes * 3 + summary.paintMakes * 2)
    * clamp(0.15, 0.45, offense.transitionShare + 0.08);
  summary.points += summary.rimMakes * 2 + summary.paintMakes * 2 + summary.threeMakes * 3;

  return summary;
}

function simulateSingleGame(
  teamA: TeamAggregation,
  teamB: TeamAggregation,
  homeTeam: 'A' | 'B' | null,
  coachingA?: CoachingDecision,
  coachingB?: CoachingDecision,
  quarterScale = 1,
): SimulatedGame {
  const planA = buildGamePlan(teamA, coachingA);
  const planB = buildGamePlan(teamB, coachingB);
  let possessions = average([planA.possessionVolume, planB.possessionVolume]);
  possessions += (planA.transitionShare + planB.transitionShare - 0.2) * 6;
  possessions += randomNormal(0, 2 + average([planA.volatility, planB.volatility]) * 4);
  possessions = clamp(90, 112, possessions);

  let scoreA = 0;
  let scoreB = 0;
  if (homeTeam === 'A') scoreA += Math.round(teamA.modifiers.homeCourtAdvantage * 40);
  if (homeTeam === 'B') scoreB += Math.round(teamB.modifiers.homeCourtAdvantage * 40);

  const summaryA = resolveOffense(planA, planB, Math.round(possessions), quarterScale);
  const summaryB = resolveOffense(planB, planA, Math.round(possessions), quarterScale);

  scoreA += summaryA.points;
  scoreB += summaryB.points;

  return {
    scoreA,
    scoreB,
    summaryA,
    summaryB,
  };
}

function generateMatchupDrivers(teamA: TeamAggregation, teamB: TeamAggregation): MatchupDriver[] {
  const planA = buildGamePlan(teamA);
  const planB = buildGamePlan(teamB);
  const candidates: MatchupDriver[] = [
    {
      category: 'Spacing & Shooting',
      impact: Math.abs((planA.spacing + planA.threeAccuracy) - (planB.spacing + planB.threeAccuracy)),
      advantage: planA.spacing + planA.threeAccuracy > planB.spacing + planB.threeAccuracy ? 'A' : 'B',
    },
    {
      category: 'Rim Pressure',
      impact: Math.abs((planA.rimPressure + planA.finishing) - (planB.rimPressure + planB.finishing)),
      advantage: planA.rimPressure + planA.finishing > planB.rimPressure + planB.finishing ? 'A' : 'B',
    },
    {
      category: 'Turnover Battle',
      impact: Math.abs((planA.ballSecurity - planB.ballPressure) - (planB.ballSecurity - planA.ballPressure)),
      advantage: planA.ballSecurity - planB.ballPressure > planB.ballSecurity - planA.ballPressure ? 'A' : 'B',
    },
    {
      category: 'Offensive Glass',
      impact: Math.abs((planA.offensiveReboundRate - planB.defensiveReboundRate) - (planB.offensiveReboundRate - planA.defensiveReboundRate)),
      advantage: planA.offensiveReboundRate - planB.defensiveReboundRate > planB.offensiveReboundRate - planA.defensiveReboundRate ? 'A' : 'B',
    },
    {
      category: 'Transition Pressure',
      impact: Math.abs((planA.transitionShare - planB.transitionContainment) - (planB.transitionShare - planA.transitionContainment)),
      advantage: planA.transitionShare - planB.transitionContainment > planB.transitionShare - planA.transitionContainment ? 'A' : 'B',
    },
    {
      category: 'Rim Protection',
      impact: Math.abs(average([planA.rimContest, planA.paintPacking]) - average([planB.rimContest, planB.paintPacking])),
      advantage: average([planA.rimContest, planA.paintPacking]) > average([planB.rimContest, planB.paintPacking]) ? 'A' : 'B',
    },
  ];

  return candidates
    .sort((a, b) => b.impact - a.impact)
    .filter((driver) => driver.impact > 0.015)
    .slice(0, 3);
}

function buildMatchupResult(
  games: SimulatedGame[],
  teamA: TeamAggregation,
  teamB: TeamAggregation,
): MatchupResult {
  const winsA = games.filter((game) => game.scoreA > game.scoreB).length;
  const winsB = games.length - winsA;
  const winPctA = winsA / Math.max(games.length, 1);
  const winner = winsA >= winsB ? 'A' : 'B';
  const middleGame = games[Math.floor(games.length / 2)] ?? games[0];

  let finalScoreA = middleGame?.scoreA ?? 100;
  let finalScoreB = middleGame?.scoreB ?? 98;
  if (finalScoreA === finalScoreB) {
    if (winner === 'A') finalScoreA += 1;
    else finalScoreB += 1;
  }

  return {
    winner,
    winPctA,
    winsA,
    winsB,
    drivers: generateMatchupDrivers(teamA, teamB),
    finalScoreA,
    finalScoreB,
  };
}

export function simulateMatchup(
  teamA: TeamAggregation,
  teamB: TeamAggregation,
  homeTeam: 'A' | 'B' | null = null,
  coachingA?: CoachingDecision,
  coachingB?: CoachingDecision,
  numSims: number = SIMULATION_PARAMS.NUM_SIMULATIONS,
  seed?: number,
): MatchupResult {
  if (seed !== undefined) {
    // Use seed to perturb Math.random-dependent branches deterministically enough
    // for repeated matchup calls by incorporating it into one initial variance draw.
    randomNormal(seed % 1, 0.001);
  }

  const games: SimulatedGame[] = [];
  for (let i = 0; i < numSims; i++) {
    games.push(simulateSingleGame(teamA, teamB, homeTeam, coachingA, coachingB));
  }
  return buildMatchupResult(games, teamA, teamB);
}

export function simulateQuarter(
  teamA: TeamAggregation,
  teamB: TeamAggregation,
  homeTeam: 'A' | 'B',
  quarter: 1 | 2 | 3 | 4,
  coachingA?: CoachingDecision,
  coachingB?: CoachingDecision,
  previousQuarters: QuarterResult[] = [],
): QuarterResult {
  const game = simulateSingleGame(teamA, teamB, homeTeam, coachingA, coachingB, 0.25);
  const previousTotalA = previousQuarters.reduce((sum, result) => sum + result.scoreA, 0);
  const previousTotalB = previousQuarters.reduce((sum, result) => sum + result.scoreB, 0);

  return {
    quarter,
    scoreA: game.scoreA,
    scoreB: game.scoreB,
    totalScoreA: previousTotalA + game.scoreA,
    totalScoreB: previousTotalB + game.scoreB,
    coachingImpactA: clamp(-10, 10, buildGamePlan(teamA, coachingA).coachingImpact - buildGamePlan(teamB, coachingB).coachingImpact),
    coachingImpactB: clamp(-10, 10, buildGamePlan(teamB, coachingB).coachingImpact - buildGamePlan(teamA, coachingA).coachingImpact),
  };
}

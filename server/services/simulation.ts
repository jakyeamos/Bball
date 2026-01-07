/**
 * Matchup Simulation
 * Implements Section 7 from pseudocode: simulate games between teams
 */

import { TeamAggregation, TeamModifiers, MatchupResult, MatchupDriver } from '@nba-draft-sim/shared';
import { STRENGTH_WEIGHTS, SIM_PARAMS } from '@nba-draft-sim/shared';
import { logistic, randomNormal } from '../utils/utils';
import { computeTeamModifiers } from './modifiers';

/**
 * Calculate team strength from features and modifiers
 *
 * Offense: 0.40*TS + 0.20*AST + 0.15*3PA_RATE + 0.10*FT_RATE - 0.15*TOV
 * Defense: 0.25*BLK + 0.25*STL + 0.20*REB
 * Total: offense + defense + modifiers
 */
export function calculateTeamStrength(
  team: TeamAggregation,
  modifiers: TeamModifiers
): number {
  const { OFFENSE, DEFENSE } = STRENGTH_WEIGHTS;

  const offense =
    OFFENSE.TS * team.features.TS +
    OFFENSE.AST * team.features.AST +
    OFFENSE.THREE_PA_RATE * team.features.THREE_PA_RATE +
    OFFENSE.FT_RATE * team.features.FT_RATE +
    OFFENSE.TOV * team.features.TOV; // Note: weight is already negative

  const defense =
    DEFENSE.BLK * team.features.BLK +
    DEFENSE.STL * team.features.STL +
    DEFENSE.REB * team.features.REB;

  return offense + defense + modifiers.total;
}

/**
 * Generate matchup drivers (explanation of key advantages)
 * For v1, this is simplified - returns basic categorical advantages
 */
function generateMatchupDrivers(
  teamA: TeamAggregation,
  teamB: TeamAggregation,
  modsA: TeamModifiers,
  modsB: TeamModifiers
): MatchupDriver[] {
  const drivers: MatchupDriver[] = [];

  // Offense comparison
  const offenseDiff = teamA.features.TS - teamB.features.TS;
  if (Math.abs(offenseDiff) > 0.02) {
    drivers.push({
      category: 'Shooting Efficiency',
      impact: Math.abs(offenseDiff),
      advantage: offenseDiff > 0 ? 'A' : 'B',
    });
  }

  // Playmaking comparison
  const playDiff = teamA.features.AST - teamB.features.AST;
  if (Math.abs(playDiff) > 0.5) {
    drivers.push({
      category: 'Playmaking',
      impact: Math.abs(playDiff),
      advantage: playDiff > 0 ? 'A' : 'B',
    });
  }

  // Rim protection comparison
  const rimDiff = teamA.features.BLK - teamB.features.BLK;
  if (Math.abs(rimDiff) > 0.3) {
    drivers.push({
      category: 'Rim Protection',
      impact: Math.abs(rimDiff),
      advantage: rimDiff > 0 ? 'A' : 'B',
    });
  }

  // Team composition modifiers
  if (Math.abs(modsA.total - modsB.total) > 0.02) {
    drivers.push({
      category: 'Team Composition',
      impact: Math.abs(modsA.total - modsB.total),
      advantage: modsA.total > modsB.total ? 'A' : 'B',
    });
  }

  return drivers;
}

/**
 * Simulate a single matchup between two teams
 * Runs multiple simulations and returns win probability and winner
 */
export function simulateMatchup(
  teamA: TeamAggregation,
  teamB: TeamAggregation,
  numSims: number = SIM_PARAMS.SIMS_PER_MATCHUP
): MatchupResult {
  const { STRENGTH_SCALE, SHOOT_SIGMA, TOV_SIGMA, GAME_SIGMA } = SIM_PARAMS;

  // Calculate modifiers
  const modsA = computeTeamModifiers(teamA);
  const modsB = computeTeamModifiers(teamB);

  // Calculate base strength difference
  const strengthA = calculateTeamStrength(teamA, modsA);
  const strengthB = calculateTeamStrength(teamB, modsB);
  const baseDiff = (strengthA - strengthB) * STRENGTH_SCALE;

  // Run simulations
  let winsA = 0;

  for (let i = 0; i < numSims; i++) {
    // Add variance
    let diff = baseDiff;
    diff += randomNormal(0, SHOOT_SIGMA); // Shooting variance
    diff += randomNormal(0, TOV_SIGMA);   // Turnover variance
    diff += randomNormal(0, GAME_SIGMA);  // Generic game noise

    // Convert to win probability via logistic
    const probA = logistic(diff);

    // Simulate game outcome
    if (Math.random() < probA) {
      winsA++;
    }
  }

  const winsB = numSims - winsA;
  const winPctA = winsA / numSims;
  const winner = winsA > winsB ? 'A' : 'B';

  // Generate drivers
  const drivers = generateMatchupDrivers(teamA, teamB, modsA, modsB);

  return {
    winner,
    winPctA,
    winsA,
    winsB,
    drivers,
  };
}

/**
 * Simulate a best-of-N series (for playoffs)
 * Each "game" is actually 100 sims to determine winner
 */
export function simulateSeries(
  teamA: TeamAggregation,
  teamB: TeamAggregation,
  winsNeeded: number = 2
): { winsA: number; winsB: number; winner: 'A' | 'B'; games: MatchupResult[] } {
  let winsA = 0;
  let winsB = 0;
  const games: MatchupResult[] = [];

  while (winsA < winsNeeded && winsB < winsNeeded) {
    const gameResult = simulateMatchup(teamA, teamB);
    games.push(gameResult);

    if (gameResult.winner === 'A') {
      winsA++;
    } else {
      winsB++;
    }
  }

  return {
    winsA,
    winsB,
    winner: winsA >= winsNeeded ? 'A' : 'B',
    games,
  };
}

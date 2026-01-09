/**
 * Matchup Simulation
 * Upgraded: ratings-based + score sampling (μ/σ) instead of logistic coinflip.
 */

import { TeamAggregation, TeamModifiers, MatchupResult, MatchupDriver } from '@nba-draft-sim/shared';
import { SIMULATION_PARAMS } from '@nba-draft-sim/shared';
import { randomNormal, clamp } from '../utils/utils';

function getMod(mods: TeamModifiers, key: string): number {
  return (mods as any)[key] ?? 0;
}

/**
 * Convert team features + modifiers into ORtg/DRtg
 * Still v1-lightweight, but much stronger than linear "strength".
 */
function computeTeamRatings(team: TeamAggregation, mods: TeamModifiers) {
  const P = SIMULATION_PARAMS as any;

  const vi = (team.features as any).VI ?? 0.5;
  const par = (team.features as any).PAR ?? 0.6;

  const offenseBonus = getMod(mods, 'offenseBonus');
  const offensePenalty = getMod(mods, 'offensePenalty');
  const defenseBonus = getMod(mods, 'defenseBonus');
  const defensePenalty = getMod(mods, 'defensePenalty');

  // Tier 1 Randomness: Per-game team variance
  const teamPerformanceNoise = randomNormal(0, P.TEAM_PERF_VARIANCE_CLAMP / 2);
  const clampedTeamNoise = clamp(-P.TEAM_PERF_VARIANCE_CLAMP, P.TEAM_PERF_VARIANCE_CLAMP, teamPerformanceNoise);

  // Tier 1 Randomness: Stat-channel variance
  const shootingNoise = randomNormal(0, P.STAT_SHOOTING_VARIANCE_CLAMP / 2);
  const reboundingNoise = randomNormal(0, P.STAT_REBOUNDING_VARIANCE_CLAMP / 2);
  const turnoverNoise = randomNormal(0, P.STAT_TURNOVER_VARIANCE_CLAMP / 2);

  // ORtg from your allowed inputs + PAR/VI internally
  const ORtg =
    P.LEAGUE_ORtg +
    P.ORTG_TS_MULT * (team.features.TS - 0.56 + shootingNoise) +
    P.ORTG_AST_MULT * (team.features.AST / 10) +
    P.ORTG_PAR_MULT * (par - 0.60) +
    P.ORTG_3PA_MULT * (team.features.THREE_PA_RATE - 0.35) +
    P.ORTG_FT_MULT * (team.features.FT_RATE - 0.25) +
    P.ORTG_TOV_MULT * (team.features.TOV / 5 + turnoverNoise) +
    offenseBonus -
    offensePenalty +
    clampedTeamNoise;

  // DRtg (lower is better)
  const DRtg =
    P.LEAGUE_DRtg -
    P.DRTG_BLK_MULT * (team.features.BLK ?? 0) -
    P.DRTG_STL_MULT * (team.features.STL ?? 0) -
    P.DRTG_REB_MULT * (team.features.REB_TOTAL ?? 0 + reboundingNoise) +
    defensePenalty -
    defenseBonus -
    clampedTeamNoise;

  // Tier 1 Randomness: Player-specific noise (approximated)
  const impactRatings = team.rotation.map(p => p.impactRating);
  const meanImpact = impactRatings.reduce((a, b) => a + b, 0) / impactRatings.length;
  const stdevImpact = Math.sqrt(impactRatings.map(x => Math.pow(x - meanImpact, 2)).reduce((a, b) => a + b, 0) / impactRatings.length);

  // Score variance (series looks different even with same mapped series length)
  const sigma =
    P.BASE_SIGMA +
    P.SIGMA_THREES * team.features.THREE_PA_RATE +
    P.SIGMA_TOV * (team.features.TOV / 5) -
    P.SIGMA_VI * vi +
    getMod(mods, 'variancePenalty') * 10 +
    stdevImpact * P.SIGMA_IMPACT_STDEV_MULT;

  return { ORtg, DRtg, sigma };
}

function generateMatchupDrivers(
  teamA: TeamAggregation,
  teamB: TeamAggregation,
  modsA: TeamModifiers,
  modsB: TeamModifiers
): MatchupDriver[] {
  const drivers: MatchupDriver[] = [];

  const tsDiff = teamA.features.TS - teamB.features.TS;
  if (Math.abs(tsDiff) > 0.02) {
    drivers.push({ category: 'Shooting Efficiency', impact: Math.abs(tsDiff), advantage: tsDiff > 0 ? 'A' : 'B' });
  }

  const parA = (teamA.features as any).PAR ?? 0.6;
  const parB = (teamB.features as any).PAR ?? 0.6;
  const parDiff = parA - parB;
  if (Math.abs(parDiff) > 0.05) {
    drivers.push({ category: 'Ball Security (PAR)', impact: Math.abs(parDiff), advantage: parDiff > 0 ? 'A' : 'B' });
  }

  const threeDiff = teamA.features.THREE_PA_RATE - teamB.features.THREE_PA_RATE;
  if (Math.abs(threeDiff) > 0.06) {
    drivers.push({ category: 'Spacing / 3PA Rate', impact: Math.abs(threeDiff), advantage: threeDiff > 0 ? 'A' : 'B' });
  }

  const viA = (teamA.features as any).VI ?? 0.5;
  const viB = (teamB.features as any).VI ?? 0.5;
  const viDiff = viA - viB;
  if (Math.abs(viDiff) > 0.07) {
    drivers.push({ category: 'Lineup Versatility (VI)', impact: Math.abs(viDiff), advantage: viDiff > 0 ? 'A' : 'B' });
  }

  const compDiff = (modsA.total ?? 0) - (modsB.total ?? 0);
  if (Math.abs(compDiff) > 0.02) {
    drivers.push({ category: 'Team Composition', impact: Math.abs(compDiff), advantage: compDiff > 0 ? 'A' : 'B' });
  }

  return drivers.slice(0, 3);
}

export function simulateMatchup(
  teamA: TeamAggregation,
  teamB: TeamAggregation,
  homeTeam: 'A' | 'B' | null = null,
  numSims: number = SIMULATION_PARAMS.NUM_SIMULATIONS
): MatchupResult {
  const P = SIMULATION_PARAMS as any;

  const modsA = teamA.modifiers;
  const modsB = teamB.modifiers;

  const rA = computeTeamRatings(teamA, modsA);
  const rB = computeTeamRatings(teamB, modsB);

  // Offense vs opponent defense interaction
  let ORtgA_vs_B = rA.ORtg - P.DEF_INTERACTION * (rB.DRtg - P.LEAGUE_DRtg);
  let ORtgB_vs_A = rB.ORtg - P.DEF_INTERACTION * (rA.DRtg - P.LEAGUE_DRtg);

  // Apply home court advantage
  if (homeTeam === 'A') {
    ORtgA_vs_B += modsA.homeCourtAdvantage;
  } else if (homeTeam === 'B') {
    ORtgB_vs_A += modsB.homeCourtAdvantage;
  }

  const pace = P.BASE_PACE;

  const muA = pace * (ORtgA_vs_B / 100);
  const muB = pace * (ORtgB_vs_A / 100);

  let winsA = 0;

  for (let i = 0; i < numSims; i++) {
    const scoreA = randomNormal(muA, rA.sigma);
    const scoreB = randomNormal(muB, rB.sigma);
    if (scoreA > scoreB) winsA++;
  }

  const winsB = numSims - winsA;
  const winPctA = winsA / numSims;
  const winner = winsA > winsB ? 'A' : 'B';

  const drivers = generateMatchupDrivers(teamA, teamB, modsA, modsB);

  return { winner, winPctA, winsA, winsB, drivers };
}

export function simulateSeries(
  teamA: TeamAggregation,
  teamB: TeamAggregation,
  winsNeeded: number = 2
): { winsA: number; winsB: number; winner: 'A' | 'B'; games: MatchupResult[] } {
  let winsA = 0;
  let winsB = 0;
  const games: MatchupResult[] = [];
  let gameNum = 0;

  const homeCourtSchedule = winsNeeded === 2
    ? ['A', 'A', 'B'] // Best-of-3: H-H-A
    : ['A', 'A', 'B', 'A', 'B']; // Best-of-5: H-H-A-H-A

  while (winsA < winsNeeded && winsB < winsNeeded) {
    const homeTeam = homeCourtSchedule[gameNum];
    const gameResult = simulateMatchup(teamA, teamB, homeTeam as 'A' | 'B');
    games.push(gameResult);
    if (gameResult.winner === 'A') winsA++;
    else winsB++;
    gameNum++;
  }

  return { winsA, winsB, winner: winsA >= winsNeeded ? 'A' : 'B', games };
}

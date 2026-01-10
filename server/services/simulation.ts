/**
 * server/services/simulation.ts - V3 UPDATE
 * 
 * CHANGELOG:
 * - Added score guard to ensure winner always has higher score
 * - Added quarter-based game simulation
 * - Added generateGameScores with proper winner alignment
 */

import { 
  TeamAggregation, 
  TeamModifiers, 
  MatchupResult, 
  MatchupDriver, 
  CoachingDecision,
  QuarterResult,
  QuarterBasedGameResult,
  ScoutingReport,
  QuarterBlurb,
  SIMULATION_PARAMS
} from '@nba-draft-sim/shared';

// Utility functions
function randomNormal(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

const DEF_INTERACTION = 0.4;

function getMod(mods: TeamModifiers, key: string): number {
  return (mods as any)[key] ?? 0;
}

/**
 * Compute team ratings (ORtg/DRtg/sigma) from features and modifiers
 * Uses SIMULATION_PARAMS constants from shared/types.ts
 */
function computeTeamRatings(team: TeamAggregation, mods: TeamModifiers) {
  const P = SIMULATION_PARAMS;

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

  // ORtg calculation
  const ORtg =
    P.BASE_ORTG +
    P.ORTG_TS_MULT * (team.features.TS - 0.56 + shootingNoise) +
    P.ORTG_AST_MULT * (team.features.AST / 10) +
    P.ORTG_PAR_MULT * (par - 0.60) +
    P.ORTG_3PA_MULT * (team.features.THREE_PA_RATE - 0.35) +
    P.ORTG_FT_MULT * (team.features.FT_RATE - 0.25) +
    P.ORTG_TOV_MULT * (team.features.TOV / 5 + turnoverNoise) +
    offenseBonus -
    offensePenalty +
    clampedTeamNoise;

  // DRtg calculation (lower is better)
  const DRtg =
    P.BASE_DRTG -
    P.DRTG_BLK_MULT * (team.features.BLK ?? 0) -
    P.DRTG_STL_MULT * (team.features.STL ?? 0) -
    P.DRTG_REB_MULT * ((team.features.REB_TOTAL ?? 0) + reboundingNoise) +
    defensePenalty -
    defenseBonus -
    clampedTeamNoise;

  // Tier 1 Randomness: Player-specific noise (approximated)
  const impactRatings = team.rotation.map(p => p.impactRating);
  const meanImpact = impactRatings.length > 0 
    ? impactRatings.reduce((a, b) => a + b, 0) / impactRatings.length 
    : 0;
  const stdevImpact = impactRatings.length > 0
    ? Math.sqrt(impactRatings.map(x => Math.pow(x - meanImpact, 2)).reduce((a, b) => a + b, 0) / impactRatings.length)
    : 0;

  // Score variance (series looks different even with same mapped series length)
  const sigma =
    P.SIGMA_BASE +
    P.SIGMA_THREES * team.features.THREE_PA_RATE +
    P.SIGMA_TOV * (team.features.TOV / 5) -
    P.SIGMA_VI_PENALTY * vi +
    getMod(mods, 'variancePenalty') * 10 +
    stdevImpact * P.SIGMA_IMPACT_STDEV_MULT;

  return { ORtg, DRtg, sigma };
}

/**
 * Generate matchup drivers for editorial
 */
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

interface CoachingModifiers {
  ortgAdjust: number;
  drtgAdjust: number;
  sigmaAdjust: number;
  paceAdjust: number;
}

/**
 * Calculate coaching strategy modifiers
 */
function calculateCoachingModifiers(decision: CoachingDecision): CoachingModifiers {
  let ortgAdjust = 0;
  let drtgAdjust = 0;
  let sigmaAdjust = 0;
  let paceAdjust = 0;

  switch (decision.lineupStrategy) {
    case 'small_ball':
      paceAdjust += 3;
      ortgAdjust += 1.5;
      drtgAdjust += 1;
      break;
    case 'big_lineup':
      paceAdjust -= 3;
      drtgAdjust -= 1.5;
      ortgAdjust -= 1;
      break;
    case 'offense_first':
      ortgAdjust += 2.5;
      drtgAdjust += 2;
      break;
    case 'defense_first':
      drtgAdjust -= 2.5;
      ortgAdjust -= 2;
      break;
  }

  switch (decision.offensiveStrategy) {
    case 'pace_and_space':
      paceAdjust += 2;
      sigmaAdjust += 1;
      break;
    case 'inside_out':
      paceAdjust -= 2;
      sigmaAdjust -= 0.5;
      break;
  }

  switch (decision.defensiveStrategy) {
    case 'pressure_ball':
      sigmaAdjust += 1.5;
      break;
    case 'protect_paint':
      drtgAdjust -= 1;
      break;
  }

  return { ortgAdjust, drtgAdjust, sigmaAdjust, paceAdjust };
}

/**
 * V3: Generate realistic game scores with SCORE GUARD
 * Ensures the winner ALWAYS has the higher score
 */
export function generateGameScores(
  winPctA: number,
  winner: 'A' | 'B',
  seed: number = 0
): { scoreA: number; scoreB: number } {
  const pseudoRandom = (s: number) => {
    const x = Math.sin(s * 9999) * 10000;
    return x - Math.floor(x);
  };

  // Base scores (typical NBA game)
  const baseScore = 105 + pseudoRandom(seed + 1) * 20;
  
  // Point differential based on win probability
  const dominance = Math.abs(winPctA - 0.5);
  const baseSpread = dominance * 30; // 0-15 points based on how dominant
  
  // Add variance
  const variance = (pseudoRandom(seed + 2) - 0.5) * 10;
  let spread = Math.max(1, baseSpread + variance); // Minimum 1 point margin
  
  // Calculate scores with winner having higher score
  let scoreA: number;
  let scoreB: number;
  
  if (winner === 'A') {
    scoreA = Math.round(baseScore + spread / 2);
    scoreB = Math.round(baseScore - spread / 2);
  } else {
    scoreB = Math.round(baseScore + spread / 2);
    scoreA = Math.round(baseScore - spread / 2);
  }
  
  // SCORE GUARD: Ensure winner always has higher score
  if (winner === 'A' && scoreA <= scoreB) {
    scoreA = scoreB + Math.max(1, Math.round(pseudoRandom(seed + 5) * 5) + 1);
  } else if (winner === 'B' && scoreB <= scoreA) {
    scoreB = scoreA + Math.max(1, Math.round(pseudoRandom(seed + 5) * 5) + 1);
  }
  
  // Clamp to realistic NBA range
  scoreA = Math.max(85, Math.min(140, scoreA));
  scoreB = Math.max(85, Math.min(140, scoreB));
  
  // Final safety check after clamping
  if (winner === 'A' && scoreA <= scoreB) {
    scoreA = scoreB + 1;
  } else if (winner === 'B' && scoreB <= scoreA) {
    scoreB = scoreA + 1;
  }
  
  return { scoreA, scoreB };
}

/**
 * Simulate a single matchup (legacy compatibility)
 */
export function simulateMatchup(
  teamA: TeamAggregation,
  teamB: TeamAggregation,
  homeTeam: 'A' | 'B' | null = null,
  coachingA?: CoachingDecision,
  coachingB?: CoachingDecision,
  numSims: number = SIMULATION_PARAMS.NUM_SIMULATIONS
): MatchupResult {
  const P = SIMULATION_PARAMS as any;

  const modsA = teamA.modifiers;
  const modsB = teamB.modifiers;

  const rA = computeTeamRatings(teamA, modsA);
  const rB = computeTeamRatings(teamB, modsB);

  if (coachingA) {
    const cModsA = calculateCoachingModifiers(coachingA);
    rA.ORtg += cModsA.ortgAdjust;
    rA.DRtg += cModsA.drtgAdjust;
    rA.sigma += cModsA.sigmaAdjust;
  }

  if (coachingB) {
    const cModsB = calculateCoachingModifiers(coachingB);
    rB.ORtg += cModsB.ortgAdjust;
    rB.DRtg += cModsB.drtgAdjust;
    rB.sigma += cModsB.sigmaAdjust;
  }

  let ORtgA_vs_B = rA.ORtg - DEF_INTERACTION * (rB.DRtg - P.BASE_DRTG);
  let ORtgB_vs_A = rB.ORtg - DEF_INTERACTION * (rA.DRtg - P.BASE_DRTG);

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

  // V3: Generate scores with score guard
  const { scoreA, scoreB } = generateGameScores(winPctA, winner, Date.now());

  return { 
    winner, 
    winPctA, 
    winsA, 
    winsB, 
    drivers,
    finalScoreA: scoreA,
    finalScoreB: scoreB
  };
}

/**
 * V3: Simulate a single quarter
 */
export function simulateQuarter(
  teamA: TeamAggregation,
  teamB: TeamAggregation,
  homeTeam: 'A' | 'B',
  quarter: 1 | 2 | 3 | 4,
  coachingA?: CoachingDecision,
  coachingB?: CoachingDecision,
  previousQuarters: QuarterResult[] = []
): QuarterResult {
  const P = SIMULATION_PARAMS as any;

  const modsA = teamA.modifiers;
  const modsB = teamB.modifiers;

  const rA = computeTeamRatings(teamA, modsA);
  const rB = computeTeamRatings(teamB, modsB);

  // Apply coaching modifiers
  let coachingImpactA = 0;
  let coachingImpactB = 0;

  if (coachingA) {
    const cModsA = calculateCoachingModifiers(coachingA);
    rA.ORtg += cModsA.ortgAdjust;
    rA.DRtg += cModsA.drtgAdjust;
    coachingImpactA = cModsA.ortgAdjust - cModsA.drtgAdjust;
  }

  if (coachingB) {
    const cModsB = calculateCoachingModifiers(coachingB);
    rB.ORtg += cModsB.ortgAdjust;
    rB.DRtg += cModsB.drtgAdjust;
    coachingImpactB = cModsB.ortgAdjust - cModsB.drtgAdjust;
  }

  // Home court advantage
  let ORtgA_vs_B = rA.ORtg - DEF_INTERACTION * (rB.DRtg - P.BASE_DRTG);
  let ORtgB_vs_A = rB.ORtg - DEF_INTERACTION * (rA.DRtg - P.BASE_DRTG);

  if (homeTeam === 'A') {
    ORtgA_vs_B += modsA.homeCourtAdvantage * 0.25; // Quarter portion
  } else {
    ORtgB_vs_A += modsB.homeCourtAdvantage * 0.25;
  }

  // Quarter has ~25 possessions, so scale accordingly
  const quarterPace = P.BASE_PACE * 0.25;
  const muA = quarterPace * (ORtgA_vs_B / 100);
  const muB = quarterPace * (ORtgB_vs_A / 100);

  // Generate quarter scores with variance
  let scoreA = Math.round(randomNormal(muA, rA.sigma * 0.5));
  let scoreB = Math.round(randomNormal(muB, rB.sigma * 0.5));

  // Clamp to reasonable quarter scores (15-40 points)
  scoreA = Math.max(15, Math.min(40, scoreA));
  scoreB = Math.max(15, Math.min(40, scoreB));

  // Calculate running totals
  const previousTotalA = previousQuarters.reduce((sum, q) => sum + q.scoreA, 0);
  const previousTotalB = previousQuarters.reduce((sum, q) => sum + q.scoreB, 0);

  return {
    quarter,
    scoreA,
    scoreB,
    totalScoreA: previousTotalA + scoreA,
    totalScoreB: previousTotalB + scoreB,
    coachingImpactA: clamp(-10, 10, coachingImpactA),
    coachingImpactB: clamp(-10, 10, coachingImpactB),
  };
}

/**
 * V3: Simulate a full quarter-based game
 */
export function simulateQuarterBasedGame(
  gameId: string,
  teamA: TeamAggregation,
  teamB: TeamAggregation,
  teamAName: string,
  teamBName: string,
  homeTeam: 'A' | 'B',
  scoutingReport: ScoutingReport,
  coachingA?: CoachingDecision,
  coachingB?: CoachingDecision
): QuarterBasedGameResult {
  const quarters: QuarterResult[] = [];
  const quarterBlurbs: QuarterBlurb[] = [];

  // Simulate each quarter
  for (let q = 1; q <= 4; q++) {
    const quarterResult = simulateQuarter(
      teamA,
      teamB,
      homeTeam,
      q as 1 | 2 | 3 | 4,
      coachingA,
      coachingB,
      quarters
    );
    quarters.push(quarterResult);

    // Generate quarter blurb
    const blurb = generateQuarterBlurb(
      quarterResult,
      teamAName,
      teamBName,
      q as 1 | 2 | 3 | 4
    );
    quarterBlurbs.push(blurb);
  }

  // Final scores
  const finalScoreA = quarters.reduce((sum, q) => sum + q.scoreA, 0);
  const finalScoreB = quarters.reduce((sum, q) => sum + q.scoreB, 0);
  
  // Determine winner with score guard
  let winner: 'A' | 'B';
  let adjustedScoreA = finalScoreA;
  let adjustedScoreB = finalScoreB;

  if (finalScoreA > finalScoreB) {
    winner = 'A';
  } else if (finalScoreB > finalScoreA) {
    winner = 'B';
  } else {
    // Tie - use team strength to determine winner, add 1 point
    const strengthA = teamA.overallRating;
    const strengthB = teamB.overallRating;
    if (strengthA >= strengthB) {
      winner = 'A';
      adjustedScoreA = finalScoreA + 1;
    } else {
      winner = 'B';
      adjustedScoreB = finalScoreB + 1;
    }
  }

  // Create legacy MatchupResult for compatibility
  const winPctA = winner === 'A' ? 0.55 : 0.45;
  const result: MatchupResult = {
    winner,
    winPctA,
    winsA: winner === 'A' ? 1 : 0,
    winsB: winner === 'B' ? 1 : 0,
    drivers: generateMatchupDrivers(teamA, teamB, teamA.modifiers, teamB.modifiers),
    finalScoreA: adjustedScoreA,
    finalScoreB: adjustedScoreB,
  };

  // Generate game editorial
  const gameEditorial = generateFullGameEditorial(
    teamAName,
    teamBName,
    winner,
    adjustedScoreA,
    adjustedScoreB,
    quarters,
    result.drivers
  );

  return {
    gameId,
    teamAId: teamA.teamId,
    teamBId: teamB.teamId,
    homeTeam,
    scoutingReport,
    quarters,
    quarterBlurbs,
    finalScoreA: adjustedScoreA,
    finalScoreB: adjustedScoreB,
    winner,
    gameEditorial,
    result,
  };
}

/**
 * Generate quarter blurb with coaching insights shrouded in editorial fog
 */
function generateQuarterBlurb(
  quarterResult: QuarterResult,
  teamAName: string,
  teamBName: string,
  quarter: 1 | 2 | 3 | 4
): QuarterBlurb {
  const { scoreA, scoreB, totalScoreA, totalScoreB, coachingImpactA, coachingImpactB } = quarterResult;
  
  const quarterWinner = scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : 'even';
  const quarterWinnerName = quarterWinner === 'A' ? teamAName : quarterWinner === 'B' ? teamBName : 'Neither team';
  const quarterLoserName = quarterWinner === 'A' ? teamBName : quarterWinner === 'B' ? teamAName : '';
  
  const scoreDiff = Math.abs(scoreA - scoreB);
  
  // Narrative templates based on quarter flow
  const narrativeTemplates = {
    blowout: [
      `${quarterWinnerName} dominates the ${getQuarterOrdinal(quarter)} quarter, outscoring ${quarterLoserName} ${Math.max(scoreA, scoreB)}-${Math.min(scoreA, scoreB)}.`,
      `A ${scoreDiff}-point quarter advantage for ${quarterWinnerName} as they assert control.`,
      `${quarterWinnerName} takes over in the ${getQuarterOrdinal(quarter)}, imposing their will on both ends.`,
    ],
    comfortable: [
      `${quarterWinnerName} takes the ${getQuarterOrdinal(quarter)} quarter ${Math.max(scoreA, scoreB)}-${Math.min(scoreA, scoreB)}.`,
      `Solid execution from ${quarterWinnerName} in the ${getQuarterOrdinal(quarter)}.`,
      `${quarterWinnerName} builds on their gameplan with a ${scoreDiff}-point quarter edge.`,
    ],
    close: [
      `A tight ${getQuarterOrdinal(quarter)} quarter ends ${scoreA}-${scoreB}.`,
      `Neither team can separate as the ${getQuarterOrdinal(quarter)} ends deadlocked in intensity.`,
      `Both teams trade blows in a competitive ${getQuarterOrdinal(quarter)} frame.`,
    ],
    even: [
      `The teams trade buckets evenly in the ${getQuarterOrdinal(quarter)}, each scoring ${scoreA} points.`,
      `A perfectly matched ${getQuarterOrdinal(quarter)} quarter as both teams score ${scoreA}.`,
    ],
  };
  
  let narrativePool: string[];
  if (quarterWinner === 'even') {
    narrativePool = narrativeTemplates.even;
  } else if (scoreDiff >= 10) {
    narrativePool = narrativeTemplates.blowout;
  } else if (scoreDiff >= 5) {
    narrativePool = narrativeTemplates.comfortable;
  } else {
    narrativePool = narrativeTemplates.close;
  }
  
  const narrative = narrativePool[Math.floor(Math.random() * narrativePool.length)];
  
  // Coaching insight - shrouded in editorial fog
  const coachingDiff = coachingImpactA - coachingImpactB;
  let coachingInsight: string;
  
  if (Math.abs(coachingDiff) < 2) {
    coachingInsight = 'Both coaching staffs making solid adjustments.';
  } else if (coachingDiff > 5) {
    coachingInsight = `${teamAName}'s gameplan appears to be clicking on multiple levels.`;
  } else if (coachingDiff > 2) {
    coachingInsight = `${teamAName} seems to have found some favorable matchups.`;
  } else if (coachingDiff < -5) {
    coachingInsight = `${teamBName}'s adjustments are paying dividends.`;
  } else {
    coachingInsight = `${teamBName} making subtle but effective tweaks.`;
  }
  
  // Momentum
  let momentum: 'A' | 'B' | 'even';
  if (totalScoreA > totalScoreB + 8) {
    momentum = 'A';
  } else if (totalScoreB > totalScoreA + 8) {
    momentum = 'B';
  } else {
    momentum = 'even';
  }
  
  return {
    quarter,
    narrative,
    coachingInsight,
    momentum,
  };
}

function getQuarterOrdinal(quarter: number): string {
  const ordinals = ['first', 'second', 'third', 'fourth'];
  return ordinals[quarter - 1] || `${quarter}th`;
}

/**
 * Generate full game editorial summary
 */
function generateFullGameEditorial(
  teamAName: string,
  teamBName: string,
  winner: 'A' | 'B',
  scoreA: number,
  scoreB: number,
  quarters: QuarterResult[],
  drivers: MatchupDriver[]
): string {
  const winnerName = winner === 'A' ? teamAName : teamBName;
  const loserName = winner === 'A' ? teamBName : teamAName;
  const winnerScore = winner === 'A' ? scoreA : scoreB;
  const loserScore = winner === 'A' ? scoreB : scoreA;
  const margin = winnerScore - loserScore;
  
  // Find the best quarter for the winner
  const winnerQuarterScores = quarters.map(q => winner === 'A' ? q.scoreA : q.scoreB);
  const bestQuarter = winnerQuarterScores.indexOf(Math.max(...winnerQuarterScores)) + 1;
  
  let mainPhrase: string;
  if (margin >= 20) {
    mainPhrase = `${winnerName} dominates ${loserName} ${winnerScore}-${loserScore}`;
  } else if (margin >= 10) {
    mainPhrase = `${winnerName} handles ${loserName} ${winnerScore}-${loserScore}`;
  } else if (margin >= 5) {
    mainPhrase = `${winnerName} holds off ${loserName} ${winnerScore}-${loserScore}`;
  } else {
    mainPhrase = `${winnerName} edges ${loserName} in a thriller ${winnerScore}-${loserScore}`;
  }
  
  // Add driver context if available
  let driverPhrase = '';
  if (drivers.length > 0) {
    const topDriver = drivers[0];
    const advantageTeam = topDriver.advantage === 'A' ? teamAName : teamBName;
    
    if (topDriver.category.includes('Shooting')) {
      driverPhrase = ` ${advantageTeam}'s shooting efficiency proves decisive.`;
    } else if (topDriver.category.includes('Spacing')) {
      driverPhrase = ` ${advantageTeam}'s floor spacing opens up the offense.`;
    } else if (topDriver.category.includes('Ball Security')) {
      driverPhrase = ` Ball security makes the difference.`;
    }
  }
  
  return `${mainPhrase}.${driverPhrase}`;
}

/**
 * Simulate a playoff series
 */
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
    ? ['A', 'A', 'B']
    : ['A', 'A', 'B', 'A', 'B'];

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
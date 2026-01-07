/**
 * Playoffs Simulation
 * Implements Sections 9 and 10 from pseudocode: playoffs + suspense presentation
 */

import { TeamAggregation, PlayoffResults, PlayoffSeries, SeriesGame } from '@nba-draft-sim/shared';
import { PLAYOFF_PARAMS, SERIES_LENGTH_THRESHOLDS, SERIES_PATH_PARAMS } from '@nba-draft-sim/shared';
import { simulateSeries } from './simulation';
import { clamp } from '../utils/utils';
import { v4 as uuidv4 } from 'uuid';

/**
 * Map win percentage to displayed series length (for UI)
 *
 * 80%+ -> 4-0
 * 70%+ -> 4-1
 * 60%+ -> 4-2
 * else -> 4-3
 */
function mapWinPctToSeriesLength(winPctFavorite: number): [number, number] {
  for (const threshold of SERIES_LENGTH_THRESHOLDS) {
    if (winPctFavorite >= threshold.minWinPct) {
      return threshold.seriesLength;
    }
  }
  return [4, 3]; // Default
}

/**
 * Generate randomized series path that ends at correct result
 * Returns array like ['A', 'A', 'B', 'A', 'B', 'A'] for a 4-2 series
 *
 * Path is biased by probability but includes variety
 */
function generateSeriesPath(
  winsA: number,
  winsB: number,
  winPctA: number
): ('A' | 'B')[] {
  const { BIAS_STRENGTH, MIN_PROB, MAX_PROB } = SERIES_PATH_PARAMS;

  // Determine who wins last game
  const lastWinner = winsA > winsB ? 'A' : 'B';
  const totalGames = winsA + winsB;

  // Remaining wins to distribute (excluding last game)
  let remainingA = lastWinner === 'A' ? winsA - 1 : winsA;
  let remainingB = lastWinner === 'B' ? winsB - 1 : winsB;

  const path: ('A' | 'B')[] = [];

  // Generate games before the final one
  for (let i = 0; i < totalGames - 1; i++) {
    // Calculate bias based on win percentage
    const bias = clamp(-1, 1, (winPctA - 0.5) * 2);
    const probA = clamp(MIN_PROB, MAX_PROB, 0.5 + BIAS_STRENGTH * bias);

    // Decide winner of this game
    const wantA = Math.random() < probA;

    if (wantA && remainingA > 0) {
      path.push('A');
      remainingA--;
    } else if (remainingB > 0) {
      path.push('B');
      remainingB--;
    } else {
      // Forced to pick A (B is exhausted)
      path.push('A');
      remainingA--;
    }
  }

  // Add final game
  path.push(lastWinner);

  return path;
}

/**
 * Simulate a best-of-3 playoff series with UI presentation data
 */
function simulatePlayoffSeries(
  seriesId: string,
  teamAId: string,
  teamBId: string,
  teamA: TeamAggregation,
  teamB: TeamAggregation
): PlayoffSeries {
  // Run the actual simulation (best of 3)
  const result = simulateSeries(teamA, teamB, PLAYOFF_PARAMS.SERIES_WINS_NEEDED);

  // Convert games to SeriesGame format
  const games: SeriesGame[] = result.games.map((game, index) => ({
    gameNumber: index + 1,
    winner: game.winner,
    result: game,
  }));

  // Determine favorite (team with higher win percentage)
  const favoriteIsA = result.games[0].winPctA >= 0.5;
  const favWinPct = favoriteIsA ? result.games[0].winPctA : (1 - result.games[0].winPctA);

  // Map to displayed series length
  const displayedLength = mapWinPctToSeriesLength(favWinPct);

  // Generate series path for UI
  const seriesPath = generateSeriesPath(result.winsA, result.winsB, result.games[0].winPctA);

  return {
    seriesId,
    teamAId,
    teamBId,
    winsA: result.winsA,
    winsB: result.winsB,
    winner: result.winner === 'A' ? teamAId : teamBId,
    games,
    displayedSeriesLength: displayedLength,
    seriesPath,
  };
}

/**
 * Run complete playoffs bracket (top 4 teams, best-of-3)
 *
 * Bracket:
 * Semi 1: Seed 1 vs Seed 4
 * Semi 2: Seed 2 vs Seed 3
 * Finals: Winners of Semi 1 vs Semi 2
 */
export function runPlayoffs(
  topFourSeeds: string[],
  teams: Map<string, TeamAggregation>
): PlayoffResults {
  if (topFourSeeds.length !== 4) {
    throw new Error('Playoffs require exactly 4 teams');
  }

  const [seed1, seed2, seed3, seed4] = topFourSeeds;

  // Semi-final 1: 1 vs 4
  const semi1 = simulatePlayoffSeries(
    uuidv4(),
    seed1,
    seed4,
    teams.get(seed1)!,
    teams.get(seed4)!
  );

  // Semi-final 2: 2 vs 3
  const semi2 = simulatePlayoffSeries(
    uuidv4(),
    seed2,
    seed3,
    teams.get(seed2)!,
    teams.get(seed3)!
  );

  // Determine finalists
  const finalistA = semi1.winner;
  const finalistB = semi2.winner;

  // Finals
  const finals = simulatePlayoffSeries(
    uuidv4(),
    finalistA,
    finalistB,
    teams.get(finalistA)!,
    teams.get(finalistB)!
  );

  return {
    semiFinal1: semi1,
    semiFinal2: semi2,
    finals,
    champion: finals.winner,
  };
}

/**
 * Validate playoff bracket structure
 */
export function validatePlayoffSeeds(seeds: string[]): boolean {
  return seeds.length === 4 && new Set(seeds).size === 4;
}

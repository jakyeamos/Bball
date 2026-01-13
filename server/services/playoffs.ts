/**
 * server/services/playoffs.ts
 *
 * UPDATED for Phase 3: Editorial text generation and flexible series lengths
 */

import { v4 as uuidv4 } from 'uuid';
import {
  PlayoffResults,
  PlayoffSeries,
  SeriesGame,
  TeamAggregation,
  PLAYOFF_PARAMS
} from '@nba-draft-sim/shared';
import { simulateMatchup } from './simulation';
import {
  generateSeriesEditorial,
  generatePlayoffGameEditorial,
  generateChampionshipEditorial
} from './playoffEditorial'; // Phase 3: Import editorial

export interface PlayoffGameStartPayload {
  seriesId: string;
  gameId: string;
  matchupId: string;
  gameNumber: number;
  homeTeam: 'A' | 'B';
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
  winsA: number;
  winsB: number;
  winsNeeded: number;
}

type PlayoffGameStartHandler = (payload: PlayoffGameStartPayload) => void;

function buildHomeCourtSchedule(winsNeeded: number): Array<'A' | 'B'> {
  if (winsNeeded === 2) {
    return ['A', 'A', 'B'];
  }
  if (winsNeeded === 3) {
    return ['A', 'A', 'B', 'A', 'B'];
  }
  if (winsNeeded === 4) {
    return ['A', 'A', 'B', 'B', 'A', 'B', 'A'];
  }
  return Array.from({ length: winsNeeded * 2 - 1 }, (_, index) => (index % 2 === 0 ? 'A' : 'B'));
}

// ============================================================================
// SIMULATE PLAYOFF SERIES
// ============================================================================

function simulatePlayoffSeries(
  seriesId: string,
  teamAId: string,
  teamBId: string,
  teamAName: string, // Phase 3: Added parameter
  teamBName: string, // Phase 3: Added parameter
  teamA: TeamAggregation,
  teamB: TeamAggregation,
  winsNeeded: number, // Phase 3: Flexible series length
  isUpset: boolean = false,
  onGameStart?: PlayoffGameStartHandler
): PlayoffSeries {
  const games: SeriesGame[] = [];
  const gameEditorials: string[] = [];
  let winsA = 0;
  let winsB = 0;
  let gameNum = 0;
  const homeCourtSchedule = buildHomeCourtSchedule(winsNeeded);

  while (winsA < winsNeeded && winsB < winsNeeded) {
    const gameNumber = gameNum + 1;
    const homeTeam = homeCourtSchedule[gameNum] ?? (gameNum % 2 === 0 ? 'A' : 'B');
    const gameId = `${seriesId}-game-${gameNumber}`;

    onGameStart?.({
      seriesId,
      gameId,
      matchupId: gameId,
      gameNumber,
      homeTeam,
      teamAId,
      teamBId,
      teamAName,
      teamBName,
      winsA,
      winsB,
      winsNeeded,
    });

    const gameResult = simulateMatchup(teamA, teamB, homeTeam);
    if (gameResult.winner === 'A') winsA++;
    else winsB++;

    const editorial = generatePlayoffGameEditorial(
      teamAName,
      teamBName,
      {
        gameNumber,
        winner: gameResult.winner,
        result: gameResult,
      },
      winsA,
      winsB,
      winsNeeded
    );

    gameEditorials.push(editorial);
    games.push({
      gameNumber,
      winner: gameResult.winner,
      result: gameResult,
    });
    gameNum++;
  }

  // Determine favorite for UI display
  const favoriteIsA = games[0].result.winPctA >= 0.5;
  const favWinPct = favoriteIsA ? games[0].result.winPctA : (1 - games[0].result.winPctA);

  // Map to displayed series length
  const displayedLength = mapWinPctToSeriesLength(favWinPct);

  // Generate series path for UI
  const seriesPath = generateSeriesPath(winsA, winsB, games[0].result.winPctA);

  // Phase 3: Generate series-level editorial
  const seriesEditorial = generateSeriesEditorial(
    teamAName,
    teamBName,
    {
      seriesId,
      teamAId,
      teamBId,
      winsA,
      winsB,
      winner: winsA >= winsNeeded ? teamAId : teamBId,
      games,
      displayedSeriesLength: displayedLength,
      seriesPath,
      seriesEditorial: '', // Will be set below
      gameEditorials: [], // Will be set below
    },
    isUpset
  );

  return {
    seriesId,
    teamAId,
    teamBId,
    winsA,
    winsB,
    winner: winsA >= winsNeeded ? teamAId : teamBId,
    games,
    displayedSeriesLength: displayedLength,
    seriesPath,
    seriesEditorial, // Phase 3: Add editorial
    gameEditorials, // Phase 3: Add game editorials
  };
}

// ============================================================================
// RUN PLAYOFFS
// ============================================================================

export function runPlayoffs(
  topFourSeeds: string[],
  teams: Map<string, TeamAggregation>,
  teamNames: Map<string, string>, // Phase 3: Added parameter for editorial
  onGameStart?: PlayoffGameStartHandler
): PlayoffResults {
  if (topFourSeeds.length !== 4) {
    throw new Error('Playoffs require exactly 4 teams');
  }

  const [seed1, seed2, seed3, seed4] = topFourSeeds;

  // Semi-final 1: #1 vs #4 (Best-of-3, need 2 wins)
  const semi1 = simulatePlayoffSeries(
    uuidv4(),
    seed1,
    seed4,
    teamNames.get(seed1) || seed1,
    teamNames.get(seed4) || seed4,
    teams.get(seed1)!,
    teams.get(seed4)!,
    PLAYOFF_PARAMS.SEMIFINALS_WINS_NEEDED,
    false,
    onGameStart
  );

  // Semi-final 2: #2 vs #3 (Best-of-3, need 2 wins)
  const semi2 = simulatePlayoffSeries(
    uuidv4(),
    seed2,
    seed3,
    teamNames.get(seed2) || seed2,
    teamNames.get(seed3) || seed3,
    teams.get(seed2)!,
    teams.get(seed3)!,
    PLAYOFF_PARAMS.SEMIFINALS_WINS_NEEDED,
    false,
    onGameStart
  );

  // Determine finalists
  const finalistA = semi1.winner;
  const finalistB = semi2.winner;

  // Check for upset (lower seed made finals)
  const isUpset = (finalistA === seed4 || finalistA === seed3) &&
                  (finalistB === seed4 || finalistB === seed3);

  // Finals (Best-of-5, need 3 wins)
  const finals = simulatePlayoffSeries(
    uuidv4(),
    finalistA,
    finalistB,
    teamNames.get(finalistA) || finalistA,
    teamNames.get(finalistB) || finalistB,
    teams.get(finalistA)!,
    teams.get(finalistB)!,
    PLAYOFF_PARAMS.FINALS_WINS_NEEDED,
    isUpset,
    onGameStart
  );

  // Phase 3: Generate championship editorial
  const championName = teamNames.get(finals.winner) || finals.winner;
  const championshipEditorial = generateChampionshipEditorial(championName, finals);

  return {
    semiFinal1: semi1,
    semiFinal2: semi2,
    finals,
    champion: finals.winner,
    championshipEditorial, // Phase 3: Add championship editorial
  };
}

// ============================================================================
// MAP WIN PCT TO SERIES LENGTH (UI Display)
// ============================================================================

const SERIES_LENGTH_THRESHOLDS = [
  { minWinPct: 0.80, wins: [4, 0] },
  { minWinPct: 0.70, wins: [4, 1] },
  { minWinPct: 0.60, wins: [4, 2] },
  { minWinPct: 0.50, wins: [4, 3] },
  { minWinPct: 0.00, wins: [3, 4] },
] as const;

function mapWinPctToSeriesLength(winPctFavorite: number): [number, number] {
  for (const threshold of SERIES_LENGTH_THRESHOLDS) {
    if (winPctFavorite >= threshold.minWinPct) {
      return threshold.wins as [number, number];
    }
  }
  return [4, 3];
}

// ============================================================================
// GENERATE SERIES PATH (UI Animation)
// ============================================================================

const SERIES_PATH_PARAMS = {
  MIN_PROB: 0.45,
  MAX_PROB: 0.95,
} as const;

function generateSeriesPath(
  winsA: number,
  winsB: number,
  winPctA: number
): ('A' | 'B')[] {
  const path: ('A' | 'B')[] = [];
  let currentWinsA = 0;
  let currentWinsB = 0;
  const winsNeeded = Math.max(winsA, winsB);

  // Clamp win probability
  const clampedWinPct = Math.max(
    SERIES_PATH_PARAMS.MIN_PROB,
    Math.min(SERIES_PATH_PARAMS.MAX_PROB, winPctA)
  );

  // Simulate path
  while (currentWinsA < winsNeeded && currentWinsB < winsNeeded) {
    const rand = Math.random();
    if (rand < clampedWinPct) {
      path.push('A');
      currentWinsA++;
    } else {
      path.push('B');
      currentWinsB++;
    }
  }

  return path;
}

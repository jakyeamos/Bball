/**
 * server/services/playoffEditorial.ts
 *
 * NEW FILE - Phase 3
 * Playoff series editorial text generation
 */

import { PlayoffSeries, SeriesGame } from '@nba-draft-sim/shared';

/**
 * Series-level phrase pools
 */
const SERIES_PHRASE_POOLS = {
  sweep: [
    "{winner} sweeps {loser} in dominant fashion",
    "{winner} makes quick work of {loser}",
    "{winner} runs through {loser} without dropping a game",
    "{winner} overwhelms {loser} in lopsided series",
  ],

  gentlemans_sweep: [
    "{winner} dispatches {loser} in 4 games",
    "{winner} closes out {loser} efficiently",
    "{winner} handles {loser} with relative ease",
    "{winner} takes care of business against {loser}",
  ],

  hard_fought: [
    "{winner} outlasts {loser} in grueling series",
    "{winner} edges {loser} in back-and-forth battle",
    "{winner} survives {loser} in competitive affair",
    "{winner} guts out series win over {loser}",
  ],

  upset: [
    "{winner} shocks {loser} in stunning upset",
    "{winner} pulls off the improbable against {loser}",
    "In a major surprise, {winner} takes down {loser}",
    "{winner} defies expectations, eliminating {loser}",
  ],

  close_series: [
    "Every game was contested",
    "Neither team could gain separation",
    "The series lived up to the hype",
    "Both teams left everything on the floor",
  ],

  dominant_series: [
    "It was never really close",
    "The outcome felt inevitable",
    "{winner} imposed their will from the start",
    "{winner} controlled the pace throughout",
  ],

  clinching_game: [
    "{winner} closes the door in Game {game}",
    "{winner} finishes the job in Game {game}",
    "{winner} seals it with a Game {game} victory",
    "Game {game} belongs to {winner}",
  ],

  series_tied: [
    "The series is knotted at {wins}-{wins}",
    "We're all tied up at {wins} apiece",
    "Even series after {total} games",
    "Deadlocked heading into Game {next}",
  ],
};

/**
 * Generate editorial for an entire playoff series
 */
export function generateSeriesEditorial(
  teamAName: string,
  teamBName: string,
  series: PlayoffSeries,
  isUpset: boolean = false
): string {
  const winner = series.winner === series.teamAId ? teamAName : teamBName;
  const loser = series.winner === series.teamAId ? teamBName : teamAName;

  const phrases: string[] = [];

  const totalGames = series.winsA + series.winsB;
  const maxWins = Math.max(series.winsA, series.winsB);

  let outcomePool: string[];
  if (isUpset) {
    outcomePool = SERIES_PHRASE_POOLS.upset;
  } else if (maxWins === 3 && totalGames === 3) {
    outcomePool = SERIES_PHRASE_POOLS.sweep;
  } else if (maxWins === 3 && totalGames === 4) {
    outcomePool = SERIES_PHRASE_POOLS.gentlemans_sweep;
  } else {
    outcomePool = SERIES_PHRASE_POOLS.hard_fought;
  }

  const outcomePhrase = selectRandomPhrase(outcomePool, winner, loser);
  phrases.push(outcomePhrase);

  if (totalGames >= 5) {
    const contextPhrase = selectRandomPhrase(SERIES_PHRASE_POOLS.close_series, winner, loser);
    phrases.push(contextPhrase);
  } else if (totalGames <= 4 && !isUpset) {
    const contextPhrase = selectRandomPhrase(SERIES_PHRASE_POOLS.dominant_series, winner, loser);
    phrases.push(contextPhrase);
  }

  return phrases.join('. ') + '.';
}

/**
 * Generate editorial for individual playoff game
 */
export function generatePlayoffGameEditorial(
  teamAName: string,
  teamBName: string,
  game: SeriesGame,
  currentWinsA: number,
  currentWinsB: number,
  winsNeeded: number
): string {
  const winner = game.winner === 'A' ? teamAName : teamBName;
  const loser = game.winner === 'A' ? teamBName : teamAName;

  const phrases: string[] = [];

  const winMargin = Math.abs(game.result.winPctA - 0.5);

  let outcomePool: string[];
  if (winMargin < 0.10) {
    outcomePool = [
      "{winner} escapes with a Game {game} win",
      "{winner} edges {loser} in Game {game}",
      "{winner} survives Game {game}",
    ];
  } else if (winMargin < 0.20) {
    outcomePool = [
      "{winner} takes Game {game}",
      "{winner} controls Game {game}",
      "{winner} wins Game {game} handily",
    ];
  } else {
    outcomePool = [
      "{winner} dominates Game {game}",
      "{winner} blows out {loser} in Game {game}",
      "{winner} runs away with Game {game}",
    ];
  }

  const outcomePhrase = selectRandomPhrase(outcomePool, winner, loser)
    .replace(/{game}/g, String(game.gameNumber));
  phrases.push(outcomePhrase);

  const totalGames = currentWinsA + currentWinsB;

  if (Math.max(currentWinsA, currentWinsB) === winsNeeded) {
    const clinchPhrase = selectRandomPhrase(SERIES_PHRASE_POOLS.clinching_game, winner, loser)
      .replace(/{game}/g, String(game.gameNumber));
    phrases.push(clinchPhrase);
  } else if (currentWinsA === currentWinsB) {
    const tiedPhrase = selectRandomPhrase(SERIES_PHRASE_POOLS.series_tied, winner, loser)
      .replace(/{wins}/g, String(currentWinsA))
      .replace(/{total}/g, String(totalGames))
      .replace(/{next}/g, String(totalGames + 1));
    phrases.push(tiedPhrase);
  }

  return phrases.join('. ') + '.';
}

/**
 * Generate championship editorial
 */
export function generateChampionshipEditorial(
  championName: string,
  finalsSeries: PlayoffSeries
): string {
  const totalGames = finalsSeries.winsA + finalsSeries.winsB;

  const templates = [
    `${championName} claims the championship in ${totalGames} games`,
    `${championName} crowned champion after ${totalGames}-game Finals`,
    `${championName} secures the title`,
    `${championName} hoists the trophy as champions`,
  ];

  return templates[Math.floor(Math.random() * templates.length)] + '.';
}

function selectRandomPhrase(pool: string[], winner: string, loser: string): string {
  const template = pool[Math.floor(Math.random() * pool.length)];
  return template
    .replace(/{winner}/g, winner)
    .replace(/{loser}/g, loser)
    .replace(/{leader}/g, winner);
}

/**
 * Regular Season Simulation
 * Implements Section 8 from pseudocode: single round-robin tournament
 */

import { TeamAggregation, RegularSeasonResults, RegularSeasonGame, TeamRecord } from '@nba-draft-sim/shared';
import { simulateMatchup } from './simulation';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate all matchups for a single round-robin (each team plays each other once)
 */
function generateRoundRobinSchedule(teamIds: string[]): Array<[string, string]> {
  const matchups: Array<[string, string]> = [];

  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      matchups.push([teamIds[i], teamIds[j]]);
    }
  }

  return matchups;
}

/**
 * Initialize standings for all teams
 */
function initializeStandings(teamIds: string[]): Map<string, TeamRecord> {
  const standings = new Map<string, TeamRecord>();

  for (const teamId of teamIds) {
    standings.set(teamId, {
      teamId,
      wins: 0,
      losses: 0,
      winPct: 0.000,
    });
  }

  return standings;
}

/**
 * Update standings after a game
 */
function updateStandings(
  standings: Map<string, TeamRecord>,
  teamAId: string,
  teamBId: string,
  winner: 'A' | 'B'
): void {
  const recordA = standings.get(teamAId)!;
  const recordB = standings.get(teamBId)!;

  if (winner === 'A') {
    recordA.wins++;
    recordB.losses++;
  } else {
    recordB.wins++;
    recordA.losses++;
  }

  // Recalculate win percentages
  const totalGamesA = recordA.wins + recordA.losses;
  const totalGamesB = recordB.wins + recordB.losses;

  recordA.winPct = totalGamesA > 0 ? recordA.wins / totalGamesA : 0;
  recordB.winPct = totalGamesB > 0 ? recordB.wins / totalGamesB : 0;
}

/**
 * Run a complete regular season (single round-robin)
 */
export function runRegularSeason(
  teams: Map<string, TeamAggregation>
): RegularSeasonResults {
  const teamIds = Array.from(teams.keys());
  const standings = initializeStandings(teamIds);
  const games: RegularSeasonGame[] = [];

  // Generate all matchups
  const schedule = generateRoundRobinSchedule(teamIds);

  // Simulate each matchup
  for (const [teamAId, teamBId] of schedule) {
    const teamA = teams.get(teamAId)!;
    const teamB = teams.get(teamBId)!;

    const result = simulateMatchup(teamA, teamB);

    // Record game
    games.push({
      gameId: uuidv4(),
      teamAId,
      teamBId,
      result,
    });

    // Update standings
    updateStandings(standings, teamAId, teamBId, result.winner);
  }

  // Convert standings to sorted array
  const standingsArray = Array.from(standings.values()).sort((a, b) => {
    // Sort by win percentage (descending)
    if (b.winPct !== a.winPct) {
      return b.winPct - a.winPct;
    }
    // Tiebreaker: wins
    return b.wins - a.wins;
  });

  return {
    standings: standingsArray,
    games,
  };
}

/**
 * Get top N teams from standings
 */
export function getTopTeams(standings: TeamRecord[], n: number): string[] {
  return standings.slice(0, Math.min(n, standings.length)).map(r => r.teamId);
}

/**
 * Resolve head-to-head tiebreaker between teams
 * Returns the team that won when they played each other
 */
export function resolveHeadToHead(
  teamAId: string,
  teamBId: string,
  games: RegularSeasonGame[]
): string | null {
  // Find the game between these two teams
  const h2hGame = games.find(
    (g) =>
      (g.teamAId === teamAId && g.teamBId === teamBId) ||
      (g.teamAId === teamBId && g.teamBId === teamAId)
  );

  if (!h2hGame) return null;

  // Determine winner based on original matchup
  if (h2hGame.teamAId === teamAId) {
    return h2hGame.result.winner === 'A' ? teamAId : teamBId;
  } else {
    return h2hGame.result.winner === 'A' ? teamBId : teamAId;
  }
}

/**
 * Get top 4 teams with tiebreaker resolution
 */
export function getTop4WithTiebreaker(
  regularSeasonResults: RegularSeasonResults
): string[] {
  const { standings, games } = regularSeasonResults;

  // If we have 4 or fewer teams, return all
  if (standings.length <= 4) {
    return standings.map(s => s.teamId);
  }

  // Check if 4th and 5th place are tied
  const fourth = standings[3];
  const fifth = standings[4];

  if (fourth.winPct === fifth.winPct && fourth.wins === fifth.wins) {
    // Use head-to-head tiebreaker
    const winner = resolveHeadToHead(fourth.teamId, fifth.teamId, games);

    if (winner === fourth.teamId) {
      return standings.slice(0, 4).map(s => s.teamId);
    } else {
      // Replace 4th with 5th
      return [
        standings[0].teamId,
        standings[1].teamId,
        standings[2].teamId,
        fifth.teamId,
      ];
    }
  }

  // No tie, return top 4
  return standings.slice(0, 4).map(s => s.teamId);
}

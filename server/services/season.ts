/**
 * server/services/season.ts
 *
 * UPDATED for Phase 1: Editorial text generation for regular season games
 */

import { v4 as uuidv4 } from 'uuid';
import {
  RegularSeasonResults,
  RegularSeasonGame,
  TeamRecord,
  TeamAggregation,
  SeasonFormat,
  DraftOrder,
} from '@nba-draft-sim/shared';
import { simulateMatchup } from './simulation';
import { generateGameEditorial, generateSeasonSummary } from './editorial';

// ============================================================================
// RUN REGULAR SEASON
// ============================================================================

export function runRegularSeason(
  teams: Map<string, TeamAggregation>,
  teamNames: Map<string, string>,
  seasonFormat: SeasonFormat
): RegularSeasonResults {
  const teamIds = Array.from(teams.keys());
  const standings = initializeStandings(teamIds);
  const games: RegularSeasonGame[] = [];

  // Generate schedule based on format
  const schedule = generateSchedule(teamIds, seasonFormat);

  // Simulate each matchup
  for (const match of schedule) {
    const homeTeamId = match.home;
    const awayTeamId = match.away;
    const homeTeam = teams.get(homeTeamId)!;
    const awayTeam = teams.get(awayTeamId)!;

    // In the context of simulateMatchup, teamA is the home team
    const result = simulateMatchup(homeTeam, awayTeam, 'A');

    // Phase 1: Generate editorial for this game
    const homeTeamName = teamNames.get(homeTeamId) || homeTeamId;
    const awayTeamName = teamNames.get(awayTeamId) || awayTeamId;
    const editorial = generateGameEditorial(homeTeamName, awayTeamName, result);

    // Record game with editorial
    games.push({
      gameId: uuidv4(),
      teamAId: homeTeamId,
      teamBId: awayTeamId,
      homeTeam: 'A',
      result,
      editorial, // Phase 1: Add editorial
    });

    // Update standings
    updateStandings(standings, homeTeamId, awayTeamId, result.winner === 'A' ? 'A' : 'B');
  }

  // Sort standings
  const standingsArray = Array.from(standings.values()).sort((a, b) => {
    if (b.winPct !== a.winPct) {
      return b.winPct - a.winPct;
    }
    return b.wins - a.wins;
  });

  // Phase 1: Generate season summary
  const summary = generateSeasonSummary(standingsArray, teamNames);

  return {
    standings: standingsArray,
    games,
    summary, // Phase 1: Add summary
  };
}

// ============================================================================
// INITIALIZE STANDINGS
// ============================================================================

function initializeStandings(teamIds: string[]): Map<string, TeamRecord> {
  const standings = new Map<string, TeamRecord>();

  for (const teamId of teamIds) {
    standings.set(teamId, {
      teamId,
      wins: 0,
      losses: 0,
      winPct: 0,
    });
  }

  return standings;
}

// ============================================================================
// UPDATE STANDINGS
// ============================================================================

function updateStandings(
  standings: Map<string, TeamRecord>,
  teamAId: string,
  teamBId: string,
  winner: 'A' | 'B'
): void {
  const teamA = standings.get(teamAId)!;
  const teamB = standings.get(teamBId)!;

  if (winner === 'A') {
    teamA.wins++;
    teamB.losses++;
  } else {
    teamB.wins++;
    teamA.losses++;
  }

  // Update win percentages
  teamA.winPct = teamA.wins / (teamA.wins + teamA.losses);
  teamB.winPct = teamB.wins / (teamB.wins + teamB.losses);
}

// ============================================================================
// SCHEDULE GENERATION
// ============================================================================

function generateSchedule(
  teamIds: string[],
  seasonFormat: SeasonFormat
): Array<{ home: string; away: string }> {
  switch (seasonFormat) {
    case 'quick_sim':
    case 'single_round_robin':
      return generateSingleRoundRobinSchedule(teamIds);
    case 'double_round_robin':
    default: // Fallback for old configs or undefined
      return generateDoubleRoundRobinSchedule(teamIds);
  }
}

function generateSingleRoundRobinSchedule(
  teamIds: string[]
): Array<{ home: string; away: string }> {
  const schedule: Array<{ home: string; away: string }> = [];
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      // Each pair plays once. Alternate home team for fairness.
      if ((i + j) % 2 === 0) {
        schedule.push({ home: teamIds[i], away: teamIds[j] });
      } else {
        schedule.push({ home: teamIds[j], away: teamIds[i] });
      }
    }
  }
  return schedule;
}

function generateDoubleRoundRobinSchedule(
  teamIds: string[]
): Array<{ home: string; away: string }> {
  const schedule: Array<{ home: string; away: string }> = [];

  // Each team plays every other team twice (home and away)
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      schedule.push({ home: teamIds[i], away: teamIds[j] });
      schedule.push({ home: teamIds[j], away: teamIds[i] });
    }
  }

  return schedule;
}

// ============================================================================
// GET TOP TEAMS
// ============================================================================

export function getTopTeams(standings: TeamRecord[], n: number): string[] {
  return standings.slice(0, Math.min(n, standings.length)).map(r => r.teamId);
}

// ============================================================================
// GET TOP 4 WITH TIEBREAKER
// ============================================================================

export function getTop4WithTiebreaker(results: RegularSeasonResults): string[] {
  const sorted = [...results.standings].sort((a, b) => {
    // Primary: Win percentage
    if (b.winPct !== a.winPct) {
      return b.winPct - a.winPct;
    }
    // Tiebreaker: Total wins
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }
    // Tiebreaker: Random (coin flip)
    return Math.random() - 0.5;
  });

  return sorted.slice(0, 4).map(r => r.teamId);
}

/**
 * server/services/season.ts
 *
 * UPDATED for Phase 1: Editorial text generation for regular season games
 */

import { v4 as uuidv4 } from 'uuid';
import { RegularSeasonResults, RegularSeasonGame, TeamRecord, TeamAggregation } from '@nba-draft-sim/shared';
import { simulateMatchup } from './simulation';
import { generateGameEditorial, generateSeasonSummary } from './editorial'; // Phase 1: Import editorial

// ============================================================================
// RUN REGULAR SEASON
// ============================================================================

export function runRegularSeason(
  teams: Map<string, TeamAggregation>,
  teamNames: Map<string, string> // Phase 1: Added parameter for editorial
): RegularSeasonResults {
  const teamIds = Array.from(teams.keys());
  const standings = initializeStandings(teamIds);
  const games: RegularSeasonGame[] = [];

  // Generate round-robin schedule
  const schedule = generateRoundRobinSchedule(teamIds);

  // Simulate each matchup
  for (const [teamAId, teamBId] of schedule) {
    const teamA = teams.get(teamAId)!;
    const teamB = teams.get(teamBId)!;

    const result = simulateMatchup(teamA, teamB);

    // Phase 1: Generate editorial for this game
    const teamAName = teamNames.get(teamAId) || teamAId;
    const teamBName = teamNames.get(teamBId) || teamBId;
    const editorial = generateGameEditorial(teamAName, teamBName, result);

    // Record game with editorial
    games.push({
      gameId: uuidv4(),
      teamAId,
      teamBId,
      result,
      editorial, // Phase 1: Add editorial
    });

    // Update standings
    updateStandings(standings, teamAId, teamBId, result.winner);
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
// GENERATE ROUND-ROBIN SCHEDULE
// ============================================================================

function generateRoundRobinSchedule(teamIds: string[]): Array<[string, string]> {
  const schedule: Array<[string, string]> = [];

  // Double round-robin (each team plays every other team twice)
  for (let round = 0; round < 2; round++) {
    for (let i = 0; i < teamIds.length; i++) {
      for (let j = i + 1; j < teamIds.length; j++) {
        if (round === 0) {
          schedule.push([teamIds[i], teamIds[j]]);
        } else {
          // Reverse home/away for second round
          schedule.push([teamIds[j], teamIds[i]]);
        }
      }
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

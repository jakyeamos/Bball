/**
 * server/managers/leagueManager.ts
 *
 * UPDATED for:
 * - Phase 0: Phase validation for state transitions
 * - Phase 1: Pass team names to regular season for editorial
 * - Phase 3: Pass team names to playoffs for editorial
 */

import { LeagueState, Player, TRADE_WINDOW_DURATION_MS, DraftState } from '@nba-draft-sim/shared';
import { leagueStore } from '../stores/leagueStore';
import { runRegularSeason } from '../services/season';
import { runPlayoffs } from '../services/playoffs';
import { aggregateTeam } from '../services/aggregation';
import { getTop4WithTiebreaker } from '../services/season';

// ============================================================================
// START TRADE WINDOW
// ============================================================================

export function startTradeWindow(leagueId: string): LeagueState | undefined {
  const league = leagueStore.get(leagueId);

  // Phase 0: Validate current phase
  if (!league || league.phase !== 'draft_recap') {
    throw new Error(`Invalid phase for trade window. Current: ${league?.phase}`);
  }

  const endsAt = new Date(Date.now() + TRADE_WINDOW_DURATION_MS).toISOString();

  return leagueStore.update(leagueId, {
    phase: 'trade_window',
    tradeWindowEndsAt: endsAt,
  });
}

// ============================================================================
// EXECUTE TRADE
// ============================================================================

export function executeTrade(
  leagueId: string,
  teamAId: string,
  teamBId: string,
  playerAIds: string[],
  playerBIds: string[]
): LeagueState | undefined {
  const league = leagueStore.get(leagueId);

  if (!league || league.phase !== 'trade_window' || !league.draftState) {
    throw new Error('Invalid league state for trade');
  }

  // Find teams
  const teamA = league.draftState.teams.find(t => t.teamId === teamAId);
  const teamB = league.draftState.teams.find(t => t.teamId === teamBId);

  if (!teamA || !teamB) {
    throw new Error('Teams not found');
  }

  // Validate players belong to correct teams
  for (const pid of playerAIds) {
    if (!teamA.roster.includes(pid)) {
      throw new Error(`Player ${pid} not on team ${teamAId}`);
    }
  }
  for (const pid of playerBIds) {
    if (!teamB.roster.includes(pid)) {
      throw new Error(`Player ${pid} not on team ${teamBId}`);
    }
  }

  // Execute trade
  teamA.roster = teamA.roster.filter(p => !playerAIds.includes(p)).concat(playerBIds);
  teamB.roster = teamB.roster.filter(p => !playerBIds.includes(p)).concat(playerAIds);

  return leagueStore.update(leagueId, {
    draftState: league.draftState,
  });
}

// ============================================================================
// START REGULAR SEASON
// ============================================================================

export function startRegularSeason(
  leagueId: string,
  allPlayers: Player[]
): LeagueState | undefined {
  const league = leagueStore.get(leagueId);

  // Phase 0: Validate current phase
  if (!league || league.phase !== 'trade_window') {
    throw new Error(`Invalid phase for regular season. Current: ${league?.phase}`);
  }

  if (!league.draftState) {
    throw new Error('No draft state found');
  }

  // Build team aggregations
  const teamAggregations = new Map();
  const teamNames = new Map<string, string>(); // Phase 1: Build team names map

  for (const team of league.draftState.teams) {
    const roster = team.roster
      .map(playerId => allPlayers.find(p => p.playerId === playerId))
      .filter((p): p is Player => p !== undefined);

    if (roster.length === 0) {
      throw new Error(`Team ${team.teamId} has no players`);
    }

    const aggregation = aggregateTeam(roster, team.teamId);
    teamAggregations.set(team.teamId, aggregation);
    teamNames.set(team.teamId, team.displayName); // Phase 1: Store team name
  }

  // Phase 1: Pass team names to runRegularSeason for editorial generation
  const regularSeasonResults = runRegularSeason(teamAggregations, teamNames);

  return leagueStore.update(leagueId, {
    phase: 'regular_season',
    regularSeasonResults,
  });
}

// ============================================================================
// START PLAYOFFS
// ============================================================================

export function startPlayoffs(
  leagueId: string,
  allPlayers: Player[]
): LeagueState | undefined {
  const league = leagueStore.get(leagueId);

  // Phase 0: Validate current phase
  if (!league || league.phase !== 'regular_season') {
    throw new Error(`Invalid phase for playoffs. Current: ${league?.phase}`);
  }

  if (!league.regularSeasonResults || !league.draftState) {
    throw new Error('Regular season not completed');
  }

  // Get top 4 teams
  const top4Seeds = getTop4WithTiebreaker(league.regularSeasonResults);

  // Build team aggregations
  const teamAggregations = new Map();
  const teamNames = new Map<string, string>(); // Phase 3: Build team names map

  for (const team of league.draftState.teams) {
    const roster = team.roster
      .map(playerId => allPlayers.find(p => p.playerId === playerId))
      .filter((p): p is Player => p !== undefined);

    if (roster.length === 0) continue;

    const aggregation = aggregateTeam(roster, team.teamId);
    teamAggregations.set(team.teamId, aggregation);
    teamNames.set(team.teamId, team.displayName); // Phase 3: Store team name
  }

  // Phase 3: Pass team names to runPlayoffs for editorial generation
  const playoffResults = runPlayoffs(top4Seeds, teamAggregations, teamNames);

  return leagueStore.update(leagueId, {
    phase: 'playoffs',
    playoffResults,
  });
}

// ============================================================================
// COMPLETE LEAGUE (Phase 0: New function)
// ============================================================================

export function completeLeague(leagueId: string): LeagueState | undefined {
  const league = leagueStore.get(leagueId);

  if (!league || league.phase !== 'playoffs') {
    throw new Error(`Invalid phase for completion. Current: ${league?.phase}`);
  }

  return leagueStore.update(leagueId, {
    phase: 'complete',
  });
}

// ============================================================================
// GET LEAGUE
// ============================================================================

export function getLeague(leagueId: string): LeagueState | undefined {
  return leagueStore.get(leagueId);
}

export function createLeague(draftState: DraftState): LeagueState {
    throw new Error('Function not implemented.');
}


export function transitionToDraftRecap(lobbyId: string): LeagueState {
    throw new Error('Function not implemented.');
}

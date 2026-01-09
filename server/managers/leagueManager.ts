/**
 * server/managers/leagueManager.ts
 *
 * SIMPLIFIED: Removed Trade Window phase and Timer.
 * Trades are now allowed directly in 'draft_recap'.
 */

import { LeagueState, Player, DraftState } from '@nba-draft-sim/shared';
import { leagueStore } from '../stores/leagueStore';
import { runRegularSeason } from '../services/season';
import { runPlayoffs } from '../services/playoffs';
import { aggregateTeam } from '../services/aggregation';
import { getTop4WithTiebreaker } from '../services/season';

// ============================================================================
// CREATE LEAGUE
// ============================================================================

export function createLeague(draftState: DraftState): LeagueState {
  const now = new Date().toISOString();
  
  const league: LeagueState = {
    leagueId: draftState.draftId,
    phase: 'draft',
    draftState: draftState,
    regularSeasonResults: null,
    playoffResults: null,
    tradeWindowEndsAt: null, // No longer used, but kept for type safety
    createdAt: now,
    updatedAt: now,
  };

  leagueStore.set(league.leagueId, league);
  console.log(`✅ Created league ${league.leagueId} in 'draft' phase`);
  return league;
}

// ============================================================================
// TRANSITION TO DRAFT RECAP
// ============================================================================

export function transitionToDraftRecap(lobbyId: string): LeagueState {
  const league = leagueStore.get(lobbyId);
  
  if (!league) {
    throw new Error(`League not found: ${lobbyId}`);
  }
  
  if (league.phase !== 'draft') {
    throw new Error(`Invalid phase for draft recap transition. Current: ${league.phase}`);
  }
  
  const updatedLeague = leagueStore.update(lobbyId, {
    phase: 'draft_recap',
  });
  
  if (!updatedLeague) {
    throw new Error(`Failed to update league: ${lobbyId}`);
  }
  
  console.log(`✅ Transitioned league ${lobbyId} to 'draft_recap' phase`);
  return updatedLeague;
}

// ============================================================================
// EXECUTE TRADE (UPDATED)
// ============================================================================

export function executeTrade(
  leagueId: string,
  teamAId: string,
  teamBId: string,
  playerAIds: string[],
  playerBIds: string[]
): LeagueState | undefined {
  const league = leagueStore.get(leagueId);

  // FIXED: Allow trades specifically during 'draft_recap'
  if (!league || league.phase !== 'draft_recap' || !league.draftState) {
    throw new Error('Invalid league state for trade. Trades only allowed in Draft Recap.');
  }

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

  // Execute trade logic
  teamA.roster = teamA.roster.filter(p => !playerAIds.includes(p)).concat(playerBIds);
  teamB.roster = teamB.roster.filter(p => !playerBIds.includes(p)).concat(playerAIds);

  console.log(`✅ Trade executed in league ${leagueId} between ${teamAId} and ${teamBId}`);

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

  // Validate phase: Can start season directly from draft_recap
  if (!league || league.phase !== 'draft_recap') {
    throw new Error(`Invalid phase for regular season. Current: ${league?.phase}`);
  }

  if (!league.draftState) {
    throw new Error('No draft state found');
  }

  const { config: lobbyConfig, draftOrder } = league.draftState;
  if (!lobbyConfig || !draftOrder) {
    throw new Error('Draft state is missing config or draft order');
  }

  const teamAggregations = new Map();
  const teamNames = new Map<string, string>(); 

  for (const team of league.draftState.teams) {
    const roster = team.roster
      .map(playerId => allPlayers.find(p => p.playerId === playerId))
      .filter((p): p is Player => p !== undefined);

    if (roster.length === 0) {
      throw new Error(`Team ${team.teamId} has no players`);
    }

    const aggregation = aggregateTeam(roster, team.teamId);
    teamAggregations.set(team.teamId, aggregation);
    teamNames.set(team.teamId, team.displayName);
  }

  const regularSeasonResults = runRegularSeason(
    teamAggregations,
    teamNames,
    lobbyConfig.seasonFormat,
    draftOrder
  );

  console.log(`✅ Regular Season started for league ${leagueId}`);

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

  if (!league || league.phase !== 'regular_season') {
    throw new Error(`Invalid phase for playoffs. Current: ${league?.phase}`);
  }

  if (!league.regularSeasonResults || !league.draftState) {
    throw new Error('Regular season not completed');
  }

  const top4Seeds = getTop4WithTiebreaker(league.regularSeasonResults);
  const teamAggregations = new Map();
  const teamNames = new Map<string, string>(); 

  for (const team of league.draftState.teams) {
    const roster = team.roster
      .map(playerId => allPlayers.find(p => p.playerId === playerId))
      .filter((p): p is Player => p !== undefined);

    if (roster.length === 0) continue;

    const aggregation = aggregateTeam(roster, team.teamId);
    teamAggregations.set(team.teamId, aggregation);
    teamNames.set(team.teamId, team.displayName);
  }

  const playoffResults = runPlayoffs(top4Seeds, teamAggregations, teamNames);

  return leagueStore.update(leagueId, {
    phase: 'playoffs',
    playoffResults,
  });
}

// ============================================================================
// COMPLETE LEAGUE
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

export function getLeague(leagueId: string): LeagueState | undefined {
  return leagueStore.get(leagueId);
}
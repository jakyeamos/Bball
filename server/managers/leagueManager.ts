/**
 * League Manager
 * Orchestrates full league lifecycle: draft → regular season → playoffs
 */

import {
  LeagueState,
  LeaguePhase,
  DraftState,
  RegularSeasonResults,
  PlayoffResults,
  Player,
  TeamAggregation,
} from '@nba-draft-sim/shared';
import { TRADE_WINDOW_DURATION_MS } from '@nba-draft-sim/shared';
import { v4 as uuidv4 } from 'uuid';
import { aggregateTeam } from '../services/aggregation';
import { runRegularSeason, getTop4WithTiebreaker } from '../services/season';
import { runPlayoffs } from '../services/playoffs';

/**
 * In-memory league store
 */
class LeagueStore {
  private leagues: Map<string, LeagueState> = new Map();

  create(draftState: DraftState): LeagueState {
    const league: LeagueState = {
      leagueId: draftState.draftId,
      phase: 'draft',
      draftState,
      regularSeasonResults: null,
      playoffResults: null,
      tradeWindowEndsAt: null,
    };

    this.leagues.set(league.leagueId, league);
    return league;
  }

  get(leagueId: string): LeagueState | undefined {
    return this.leagues.get(leagueId);
  }

  update(leagueId: string, updates: Partial<LeagueState>): LeagueState | undefined {
    const league = this.leagues.get(leagueId);
    if (!league) return undefined;

    const updated = { ...league, ...updates };
    this.leagues.set(leagueId, updated);
    return updated;
  }

  delete(leagueId: string): boolean {
    return this.leagues.delete(leagueId);
  }

  getAll(): LeagueState[] {
    return Array.from(this.leagues.values());
  }

  clear(): void {
    this.leagues.clear();
  }
}

export const leagueStore = new LeagueStore();

/**
 * Create a new league (from draft)
 */
export function createLeague(draftState: DraftState): LeagueState {
  return leagueStore.create(draftState);
}

/**
 * Get league by ID
 */
export function getLeague(leagueId: string): LeagueState | undefined {
  return leagueStore.get(leagueId);
}

/**
 * Transition to draft recap phase
 */
export function transitionToDraftRecap(leagueId: string): LeagueState | undefined {
  const league = leagueStore.get(leagueId);
  if (!league || league.phase !== 'draft') {
    throw new Error('Invalid league state for draft recap transition');
  }

  return leagueStore.update(leagueId, {
    phase: 'draft_recap',
  });
}

/**
 * Start trade window
 */
export function startTradeWindow(leagueId: string): LeagueState | undefined {
  const league = leagueStore.get(leagueId);
  if (!league || league.phase !== 'draft_recap') {
    throw new Error('Invalid league state for trade window');
  }

  const endsAt = new Date(Date.now() + TRADE_WINDOW_DURATION_MS).toISOString();

  return leagueStore.update(leagueId, {
    phase: 'trade_window',
    tradeWindowEndsAt: endsAt,
  });
}

/**
 * Execute a trade
 */
export function executeTrade(
  leagueId: string,
  teamAId: string,
  teamBId: string,
  playerAIds: string[],
  playerBIds: string[]
): LeagueState | undefined {
  const league = leagueStore.get(leagueId);
  if (!league || league.phase !== 'trade_window' || !league.draftState) {
    throw new Error('Invalid league state for trades');
  }

  // Check trade window hasn't expired
  if (league.tradeWindowEndsAt && new Date(league.tradeWindowEndsAt) < new Date()) {
    throw new Error('Trade window has expired');
  }

  // Update rosters
  const updatedTeams = league.draftState.teams.map(team => {
    if (team.teamId === teamAId) {
      return {
        ...team,
        roster: team.roster
          .filter(p => !playerAIds.includes(p))
          .concat(playerBIds),
      };
    } else if (team.teamId === teamBId) {
      return {
        ...team,
        roster: team.roster
          .filter(p => !playerBIds.includes(p))
          .concat(playerAIds),
      };
    }
    return team;
  });

  const updatedDraftState = {
    ...league.draftState,
    teams: updatedTeams,
  };

  return leagueStore.update(leagueId, {
    draftState: updatedDraftState,
  });
}

/**
 * Start regular season simulation
 */
export function startRegularSeason(
  leagueId: string,
  allPlayers: Player[]
): LeagueState | undefined {
  const league = leagueStore.get(leagueId);
  if (!league || !league.draftState) {
    throw new Error('Invalid league state for regular season');
  }

  // Build team aggregations
  const teamAggregations = new Map<string, TeamAggregation>();

  for (const team of league.draftState.teams) {
    const roster = team.roster
      .map(playerId => allPlayers.find(p => p.playerId === playerId))
      .filter((p): p is Player => p !== undefined);

    if (roster.length === 0) {
      throw new Error(`Team ${team.teamId} has no players`);
    }

    const aggregation = aggregateTeam(roster, team.teamId);
    teamAggregations.set(team.teamId, aggregation);
  }

  // Run regular season
  const regularSeasonResults = runRegularSeason(teamAggregations);

  return leagueStore.update(leagueId, {
    phase: 'regular_season',
    regularSeasonResults,
  });
}

/**
 * Start playoffs
 */
export function startPlayoffs(
  leagueId: string,
  allPlayers: Player[]
): LeagueState | undefined {
  const league = leagueStore.get(leagueId);
  if (!league || !league.regularSeasonResults || !league.draftState) {
    throw new Error('Invalid league state for playoffs');
  }

  // Get top 4 teams
  const top4Seeds = getTop4WithTiebreaker(league.regularSeasonResults);

  // Build team aggregations
  const teamAggregations = new Map<string, TeamAggregation>();

  for (const team of league.draftState.teams) {
    const roster = team.roster
      .map(playerId => allPlayers.find(p => p.playerId === playerId))
      .filter((p): p is Player => p !== undefined);

    if (roster.length === 0) continue;

    const aggregation = aggregateTeam(roster, team.teamId);
    teamAggregations.set(team.teamId, aggregation);
  }

  // Run playoffs
  const playoffResults = runPlayoffs(top4Seeds, teamAggregations);

  return leagueStore.update(leagueId, {
    phase: 'playoffs',
    playoffResults,
  });
}

/**
 * Complete the league
 */
export function completeLeague(leagueId: string): LeagueState | undefined {
  const league = leagueStore.get(leagueId);
  if (!league || league.phase !== 'playoffs') {
    throw new Error('Invalid league state for completion');
  }

  return leagueStore.update(leagueId, {
    phase: 'complete',
  });
}

/**
 * Get league champion
 */
export function getChampion(league: LeagueState): string | null {
  return league.playoffResults?.champion || null;
}

/**
 * Get team by ID from league
 */
export function getTeamById(league: LeagueState, teamId: string) {
  return league.draftState?.teams.find(t => t.teamId === teamId);
}

/**
 * Get team roster (player objects)
 */
export function getTeamRoster(
  league: LeagueState,
  teamId: string,
  allPlayers: Player[]
): Player[] {
  const team = getTeamById(league, teamId);
  if (!team) return [];

  return team.roster
    .map(playerId => allPlayers.find(p => p.playerId === playerId))
    .filter((p): p is Player => p !== undefined);
}

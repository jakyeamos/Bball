/**
 * Draft State Manager
 * Handles draft state, picks, timer, and transitions
 */

import {
  DraftState,
  DraftStatus,
  DraftPick,
  DraftOrder,
  DraftTeam,
  LobbyConfig,
  Player,
} from '@nba-draft-sim/shared';
import { DRAFT_CONSTRAINTS } from '@nba-draft-sim/shared';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate snake draft order
 * Example for 4 teams, 3 rounds:
 * Round 1: 1, 2, 3, 4
 * Round 2: 4, 3, 2, 1
 * Round 3: 1, 2, 3, 4
 */
export function generateSnakeDraftOrder(teamIds: string[], rosterSize: number): DraftOrder[] {
  const order: DraftOrder[] = [];
  let pickNumber = 1;

  for (let round = 1; round <= rosterSize; round++) {
    const isOddRound = round % 2 === 1;
    const teams = isOddRound ? [...teamIds] : [...teamIds].reverse();

    for (const teamId of teams) {
      order.push({
        pickNumber,
        round,
        teamId,
      });
      pickNumber++;
    }
  }

  return order;
}

/**
 * Randomize team order for draft
 */
export function randomizeTeamOrder(teamIds: string[]): string[] {
  const shuffled = [...teamIds];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Create initial draft state
 */
export function createDraftState(
  lobbyId: string,
  config: LobbyConfig,
  teams: DraftTeam[],
  availablePlayers: string[],
  leagueSnapshotId: string
): DraftState {
  // Randomize and generate draft order
  const teamIds = teams.map(t => t.teamId);
  const randomizedTeamIds = randomizeTeamOrder(teamIds);
  const draftOrder = generateSnakeDraftOrder(randomizedTeamIds, config.rosterSize);

  return {
    draftId: lobbyId,
    status: 'ready',
    config,
    teams,
    draftOrder,
    picks: [],
    currentPickIndex: 0,
    timeRemaining: null,
    pausedBy: null,
    availablePlayers,
    leagueSnapshotId,
  };
}

/**
 * Get current pick info
 */
export function getCurrentPick(state: DraftState): DraftOrder | null {
  if (state.currentPickIndex >= state.draftOrder.length) {
    return null;
  }
  return state.draftOrder[state.currentPickIndex];
}

/**
 * Get team on the clock
 */
export function getCurrentTeam(state: DraftState): DraftTeam | null {
  const currentPick = getCurrentPick(state);
  if (!currentPick) return null;

  return state.teams.find(t => t.teamId === currentPick.teamId) || null;
}

/**
 * Check if draft is complete
 */
export function isDraftComplete(state: DraftState): boolean {
  return state.currentPickIndex >= state.draftOrder.length;
}

/**
 * Make a pick
 */
export function makePick(
  state: DraftState,
  playerId: string,
  isAutoPick: boolean = false
): DraftState {
  const currentPick = getCurrentPick(state);
  if (!currentPick) {
    throw new Error('No current pick available');
  }

  const currentTeam = getCurrentTeam(state);
  if (!currentTeam) {
    throw new Error('No team on the clock');
  }

  // Validate player is available
  if (!state.availablePlayers.includes(playerId)) {
    throw new Error('Player not available');
  }

  // Create pick record
  const pick: DraftPick = {
    pickNumber: currentPick.pickNumber,
    round: currentPick.round,
    teamId: currentPick.teamId,
    playerId,
    timestamp: new Date().toISOString(),
    isAutoPick,
  };

  // Update state
  const newState = { ...state };

  // Add pick to history
  newState.picks = [...state.picks, pick];

  // Remove player from available pool
  newState.availablePlayers = state.availablePlayers.filter(p => p !== playerId);

  // Add player to team roster
  newState.teams = state.teams.map(team => {
    if (team.teamId === currentTeam.teamId) {
      return {
        ...team,
        roster: [...team.roster, playerId],
        queue: team.queue.filter(p => p !== playerId), // Remove from queue if present
      };
    }
    return team;
  });

  // Advance to next pick
  newState.currentPickIndex = state.currentPickIndex + 1;

  // Reset timer
  newState.timeRemaining = state.config.pickTimer;

  // Check if draft is complete
  if (isDraftComplete(newState)) {
    newState.status = 'completed';
  }

  return newState;
}

/**
 * Start the draft
 */
export function startDraft(state: DraftState): DraftState {
  if (state.status !== 'ready') {
    throw new Error('Draft is not in ready state');
  }

  return {
    ...state,
    status: 'active',
    timeRemaining: state.config.pickTimer,
  };
}

/**
 * Pause the draft
 */
export function pauseDraft(state: DraftState, userId: string): DraftState {
  if (state.status !== 'active') {
    throw new Error('Draft is not active');
  }

  return {
    ...state,
    status: 'paused',
    pausedBy: userId,
  };
}

/**
 * Unpause the draft
 */
export function unpauseDraft(state: DraftState): DraftState {
  if (state.status !== 'paused') {
    throw new Error('Draft is not paused');
  }

  return {
    ...state,
    status: 'active',
    pausedBy: null,
  };
}

/**
 * Update timer (called every second)
 */
export function updateTimer(state: DraftState): DraftState {
  if (state.status !== 'active' || state.timeRemaining === null) {
    return state;
  }

  const newTime = Math.max(0, state.timeRemaining - 1);

  return {
    ...state,
    timeRemaining: newTime,
  };
}

/**
 * Check if timer has expired
 */
export function isTimerExpired(state: DraftState): boolean {
  return state.status === 'active' && state.timeRemaining === 0;
}

/**
 * Reset timer to full time
 */
export function resetTimer(state: DraftState): DraftState {
  return {
    ...state,
    timeRemaining: state.config.pickTimer,
  };
}

/**
 * Update team queue
 */
export function updateTeamQueue(
  state: DraftState,
  teamId: string,
  queue: string[]
): DraftState {
  // Validate all players in queue are available
  const invalidPlayers = queue.filter(p => !state.availablePlayers.includes(p));
  if (invalidPlayers.length > 0) {
    throw new Error('Queue contains unavailable players');
  }

  return {
    ...state,
    teams: state.teams.map(team => {
      if (team.teamId === teamId) {
        return { ...team, queue };
      }
      return team;
    }),
  };
}

/**
 * Get next player for auto-pick
 * 1. Check team's queue
 * 2. If queue empty or players unavailable, pick random from top 20 by impact
 */
export function getAutopickPlayer(
  state: DraftState,
  allPlayers: Player[]
): string | null {
  const currentTeam = getCurrentTeam(state);
  if (!currentTeam) return null;

  // Try queue first
  if (currentTeam.queue.length > 0) {
    const queuedPlayer = currentTeam.queue.find(p =>
      state.availablePlayers.includes(p)
    );
    if (queuedPlayer) {
      return queuedPlayer;
    }
  }

  // Fall back to top 20 random
  const availablePlayers = allPlayers.filter(p =>
    state.availablePlayers.includes(p.playerId)
  );

  if (availablePlayers.length === 0) return null;

  // Sort by impact rating
  const sorted = [...availablePlayers].sort((a, b) => b.impactRating - a.impactRating);

  // Take top 20 (or fewer if not enough players)
  const topPlayers = sorted.slice(0, Math.min(DRAFT_CONSTRAINTS.TOP_20_AUTO_PICK, sorted.length));

  // Random selection from top players
  const randomIndex = Math.floor(Math.random() * topPlayers.length);
  return topPlayers[randomIndex].playerId;
}

/**
 * Validate draft state integrity
 */
export function validateDraftState(state: DraftState): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check team count
  if (state.teams.length < DRAFT_CONSTRAINTS.TEAMS_MIN || state.teams.length > DRAFT_CONSTRAINTS.TEAMS_MAX) {
    errors.push(`Invalid team count: ${state.teams.length}`);
  }

  // Check roster size
  if (state.config.rosterSize < DRAFT_CONSTRAINTS.ROSTER_MIN || state.config.rosterSize > DRAFT_CONSTRAINTS.ROSTER_MAX) {
    errors.push(`Invalid roster size: ${state.config.rosterSize}`);
  }

  // Check draft order length
  const expectedPicks = state.teams.length * state.config.rosterSize;
  if (state.draftOrder.length !== expectedPicks) {
    errors.push(`Draft order length mismatch: expected ${expectedPicks}, got ${state.draftOrder.length}`);
  }

  // Check for duplicate picks
  const pickedPlayers = state.picks.map(p => p.playerId);
  const uniquePicks = new Set(pickedPlayers);
  if (pickedPlayers.length !== uniquePicks.size) {
    errors.push('Duplicate picks detected');
  }

  // Check all picked players are not in available pool
  const intersection = pickedPlayers.filter(p => p !== null && state.availablePlayers.includes(p));
  if (intersection.length > 0) {
    errors.push('Picked players still in available pool');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

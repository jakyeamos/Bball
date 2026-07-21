/**
 * Draft State Manager
 * Handles draft state, picks, timer, and transitions
 */

import {
  DraftState,
  DraftPick,
  DraftOrder,
  DraftTeam,
  LobbyConfig,
  Player,
  RosterRole,
} from '@nba-draft-sim/shared';
import { DRAFT_CONSTRAINTS } from '@nba-draft-sim/shared';
import { ROSTER_ROLE_TARGET_SHARE } from './roleInference';

interface TeamNeedVector {
  creation: number;
  spacing: number;
  rimPressure: number;
  perimeterDefense: number;
  rimDefense: number;
  rebounding: number;
  transition: number;
  ballSecurity: number;
  roleNeed: Record<RosterRole, number>;
  roleSurplus: Record<RosterRole, number>;
}

/**
 * Generate snake draft order
 * Example for 4 teams, 3 rounds:
 * Round 1: 1, 2, 3, 4
 * Round 2: 4, 3, 2, 1
 * Round 3: 1, 2, 3, 4
 */
function generateSnakeDraftOrder(teamIds: string[], rosterSize: number): DraftOrder[] {
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
function randomizeTeamOrder(teamIds: string[]): string[] {
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
function getCurrentPick(state: DraftState): DraftOrder | null {
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
function isDraftComplete(state: DraftState): boolean {
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

  const rosterPlayers = currentTeam.roster
    .map((playerId) => allPlayers.find((player) => player.playerId === playerId))
    .filter((player): player is Player => player !== undefined);

  const teamNeed = rosterPlayers.length > 0
    ? calculateTeamNeedVector(rosterPlayers)
    : null;

  // Sort by draft value with roster-fit adjustments.
  const sorted = [...availablePlayers].sort((a, b) => {
    return scoreAutopickCandidate(b, teamNeed, rosterPlayers.length) - scoreAutopickCandidate(a, teamNeed, rosterPlayers.length);
  });

  // Take top 20 (or fewer if not enough players)
  const topPlayers = sorted.slice(0, Math.min(DRAFT_CONSTRAINTS.TOP_20_AUTO_PICK, sorted.length));

  // Random selection from top players
  const randomIndex = Math.floor(Math.random() * topPlayers.length);
  return topPlayers[randomIndex].playerId;
}

function scoreAutopickCandidate(
  player: Player,
  teamNeed: TeamNeedVector | null,
  rosterSize: number,
): number {
  const draftValue = player.valueModel?.draftValue ?? player.impactRating;
  if (!teamNeed || rosterSize === 0) {
    return draftValue;
  }

  const fit = player.valueModel?.fitVectors;
  if (!fit) {
    return draftValue;
  }

  const needFit =
    fit.creation * teamNeed.creation +
    fit.spacing * teamNeed.spacing +
    fit.rimPressure * teamNeed.rimPressure +
    fit.perimeterDefense * teamNeed.perimeterDefense +
    fit.rimDefense * teamNeed.rimDefense +
    fit.rebounding * teamNeed.rebounding +
    fit.transition * teamNeed.transition +
    fit.ballSecurity * teamNeed.ballSecurity;

  const redundancyPenalty =
    Math.max(0, fit.creation - teamNeed.creation - 0.20) * 4 +
    Math.max(0, fit.spacing - teamNeed.spacing - 0.20) * 3 +
    Math.max(0, fit.rimDefense - teamNeed.rimDefense - 0.20) * 3;

  const roleNeedBonus = teamNeed.roleNeed[player.rosterRole] * 18;
  const roleRedundancyPenalty = teamNeed.roleSurplus[player.rosterRole] * 12;

  return draftValue + needFit * 22 + roleNeedBonus - redundancyPenalty - roleRedundancyPenalty;
}

function calculateTeamNeedVector(players: Player[]): TeamNeedVector {
  const averageFit = players.reduce(
    (acc, player) => {
      const fit = player.valueModel?.fitVectors;
      if (!fit) return acc;
      acc.creation += fit.creation;
      acc.spacing += fit.spacing;
      acc.rimPressure += fit.rimPressure;
      acc.perimeterDefense += fit.perimeterDefense;
      acc.rimDefense += fit.rimDefense;
      acc.rebounding += fit.rebounding;
      acc.transition += fit.transition;
      acc.ballSecurity += fit.ballSecurity;
      return acc;
    },
    {
      creation: 0,
      spacing: 0,
      rimPressure: 0,
      perimeterDefense: 0,
      rimDefense: 0,
      rebounding: 0,
      transition: 0,
      ballSecurity: 0,
    },
  );
  const roleCounts: Record<RosterRole, number> = {
    backcourt: 0,
    wing: 0,
    frontcourt: 0,
  };

  for (const player of players) {
    roleCounts[player.rosterRole] += 1;
  }

  const divisor = Math.max(players.length, 1);
  const target = 0.58;
  const roleNeed: Record<RosterRole, number> = {
    backcourt: Math.max(0, ROSTER_ROLE_TARGET_SHARE.backcourt - roleCounts.backcourt / divisor),
    wing: Math.max(0, ROSTER_ROLE_TARGET_SHARE.wing - roleCounts.wing / divisor),
    frontcourt: Math.max(0, ROSTER_ROLE_TARGET_SHARE.frontcourt - roleCounts.frontcourt / divisor),
  };
  const roleSurplus: Record<RosterRole, number> = {
    backcourt: Math.max(0, roleCounts.backcourt / divisor - (ROSTER_ROLE_TARGET_SHARE.backcourt + 0.10)),
    wing: Math.max(0, roleCounts.wing / divisor - (ROSTER_ROLE_TARGET_SHARE.wing + 0.10)),
    frontcourt: Math.max(0, roleCounts.frontcourt / divisor - (ROSTER_ROLE_TARGET_SHARE.frontcourt + 0.10)),
  };

  return {
    creation: Math.max(0, target - averageFit.creation / divisor),
    spacing: Math.max(0, target - averageFit.spacing / divisor),
    rimPressure: Math.max(0, target - averageFit.rimPressure / divisor),
    perimeterDefense: Math.max(0, target - averageFit.perimeterDefense / divisor),
    rimDefense: Math.max(0, target - averageFit.rimDefense / divisor),
    rebounding: Math.max(0, target - averageFit.rebounding / divisor),
    transition: Math.max(0, target - averageFit.transition / divisor),
    ballSecurity: Math.max(0, target - averageFit.ballSecurity / divisor),
    roleNeed,
    roleSurplus,
  };
}

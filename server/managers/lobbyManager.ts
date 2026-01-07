/**
 * Lobby Manager
 * Handles lobby creation, joining, and user assignment to teams
 */

import {
  LobbyState,
  LobbyConfig,
  LobbyUser,
  DraftTeam,
} from '@nba-draft-sim/shared';
import { DRAFT_CONSTRAINTS } from '@nba-draft-sim/shared';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a short invite code (6 characters)
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create a new lobby
 */
export function createLobby(
  commissionerId: string,
  displayName: string,
  config: LobbyConfig
): LobbyState {
  // Validate config
  validateLobbyConfig(config);

  const lobbyId = uuidv4();
  const inviteCode = generateInviteCode();

  const commissioner: LobbyUser = {
    userId: commissionerId,
    displayName: displayName || 'Team 1',
    teamId: null, // Will be assigned when lobby fills
    isCommissioner: true,
    isConnected: true,
    rejoinToken: uuidv4(),
  };

  const users = [commissioner];
  const canStart = users.length >= DRAFT_CONSTRAINTS.TEAMS_MIN;

  return {
    lobbyId,
    commissionerId,
    config,
    users,
    inviteCode,
    canStart,
  };
}

/**
 * Add user to lobby
 */
export function addUserToLobby(
  lobby: LobbyState,
  userId: string,
  displayName: string
): LobbyState {
  // Check if lobby is full
  if (lobby.users.length >= lobby.config.teamCount) {
    throw new Error('Lobby is full');
  }

  // Check if user already in lobby
  if (lobby.users.some(u => u.userId === userId)) {
    throw new Error('User already in lobby');
  }

  const newUser: LobbyUser = {
    userId,
    displayName: displayName || `Team ${lobby.users.length + 1}`,
    teamId: null,
    isCommissioner: false,
    isConnected: true,
    rejoinToken: uuidv4(),
  };

  const newUsers = [...lobby.users, newUser];
  const isFull = newUsers.length === lobby.config.teamCount;
  const canStart = newUsers.length >= DRAFT_CONSTRAINTS.TEAMS_MIN;

  // Assign teams if lobby is now full
  let usersWithTeams = newUsers;
  if (isFull) {
    usersWithTeams = assignTeamsToUsers(newUsers);
  }

  return {
    ...lobby,
    users: usersWithTeams,
    canStart,
  };
}

/**
 * Assign team IDs to all users when lobby fills
 */
function assignTeamsToUsers(users: LobbyUser[]): LobbyUser[] {
  return users.map((user, index) => ({
    ...user,
    teamId: `team_${index + 1}`,
  }));
}

/**
 * Remove user from lobby
 */
export function removeUserFromLobby(
  lobby: LobbyState,
  userId: string
): LobbyState {
  // Can't remove commissioner
  if (userId === lobby.commissionerId) {
    throw new Error('Cannot remove commissioner from lobby');
  }

  const newUsers = lobby.users.filter(u => u.userId !== userId);

  // If lobby was full and now isn't, unassign all teams
  const wasFull = lobby.users.length === lobby.config.teamCount;
  const canStart = newUsers.length >= DRAFT_CONSTRAINTS.TEAMS_MIN;

  let usersWithTeams = newUsers;
  if (wasFull && !canStart) {
    usersWithTeams = newUsers.map(u => ({ ...u, teamId: null }));
  }

  return {
    ...lobby,
    users: usersWithTeams,
    canStart,
  };
}

/**
 * Update user connection status
 */
export function updateUserConnection(
  lobby: LobbyState,
  userId: string,
  isConnected: boolean
): LobbyState {
  return {
    ...lobby,
    users: lobby.users.map(u =>
      u.userId === userId ? { ...u, isConnected } : u
    ),
  };
}

/**
 * Convert lobby users to draft teams
 */
export function createDraftTeamsFromLobby(lobby: LobbyState): DraftTeam[] {
  if (!lobby.canStart) {
    throw new Error('Lobby is not ready to start draft');
  }

  return lobby.users.map(user => ({
    teamId: user.teamId!,
    userId: user.userId,
    displayName: user.displayName,
    roster: [],
    queue: [],
  }));
}

/**
 * Validate lobby configuration
 */
function validateLobbyConfig(config: LobbyConfig): void {
  const errors: string[] = [];

  if (config.teamCount < DRAFT_CONSTRAINTS.TEAMS_MIN || config.teamCount > DRAFT_CONSTRAINTS.TEAMS_MAX) {
    errors.push(`Team count must be between ${DRAFT_CONSTRAINTS.TEAMS_MIN} and ${DRAFT_CONSTRAINTS.TEAMS_MAX}`);
  }

  if (config.rosterSize < DRAFT_CONSTRAINTS.ROSTER_MIN || config.rosterSize > DRAFT_CONSTRAINTS.ROSTER_MAX) {
    errors.push(`Roster size must be between ${DRAFT_CONSTRAINTS.ROSTER_MIN} and ${DRAFT_CONSTRAINTS.ROSTER_MAX}`);
  }

  if (!DRAFT_CONSTRAINTS.PICK_TIMER_OPTIONS_SECONDS.includes(config.pickTimer)) {
    errors.push(`Pick timer must be one of: ${DRAFT_CONSTRAINTS.PICK_TIMER_OPTIONS_SECONDS.join(', ')}`);
  }

  if (errors.length > 0) {
    throw new Error(`Invalid lobby config: ${errors.join(', ')}`);
  }
}

/**
 * Check if user is commissioner
 */
export function isCommissioner(lobby: LobbyState, userId: string): boolean {
  return lobby.commissionerId === userId;
}

/**
 * Get user by ID
 */
export function getUserById(lobby: LobbyState, userId: string): LobbyUser | undefined {
  return lobby.users.find(u => u.userId === userId);
}

/**
 * Update lobby configuration (only before draft starts)
 */
export function updateLobbyConfig(
  lobby: LobbyState,
  config: Partial<LobbyConfig>
): LobbyState {
  const newConfig = { ...lobby.config, ...config };
  validateLobbyConfig(newConfig);

  // If team count changes, reset user assignments
  const teamCountChanged = config.teamCount !== undefined && config.teamCount !== lobby.config.teamCount;

  let newUsers = lobby.users;
  if (teamCountChanged) {
    // Unassign all teams
    newUsers = lobby.users.map(u => ({ ...u, teamId: null }));

    // If new count matches current user count, reassign
    if (config.teamCount === lobby.users.length) {
      newUsers = assignTeamsToUsers(newUsers);
    }
  }

  return {
    ...lobby,
    config: newConfig,
    users: newUsers,
    canStart: newUsers.length >= DRAFT_CONSTRAINTS.TEAMS_MIN,
  };
}

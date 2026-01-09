/**
 * server/managers/lobbyManager.ts - UPDATED for Phase 1A
 * Handles lobby creation with public/private support
 */

import {
  LobbyState,
  LobbyConfig,
  LobbyUser,
  DraftTeam,
} from '@nba-draft-sim/shared';
import { DRAFT_CONSTRAINTS } from '@nba-draft-sim/shared';
import { v4 as uuidv4 } from 'uuid';

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create a new lobby - UPDATED for Phase 1A
 */
export function createLobby(
  commissionerId: string,
  displayName: string,
  config: LobbyConfig,
  isPublic: boolean = false // Phase 1A: Add isPublic parameter
): LobbyState {
  validateLobbyConfig(config);

  const lobbyId = uuidv4();
  const inviteCode = generateInviteCode();

  const commissioner: LobbyUser = {
    userId: commissionerId,
    displayName: displayName || 'Team 1',
    teamId: null,
    isCommissioner: true,
    isConnected: true,
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
    isPublic, // Phase 1A: Add isPublic field
    draftStarted: false, // Phase 1A: Track draft start status
    createdAt: new Date().toISOString(), // Phase 1A: Track creation time
  };
}

export function addUserToLobby(
  lobby: LobbyState,
  userId: string,
  displayName: string
): LobbyState {
  if (lobby.users.length >= lobby.config.teamCount) {
    throw new Error('Lobby is full');
  }

  if (lobby.users.some(u => u.userId === userId)) {
    throw new Error('User already in lobby');
  }

  const newUser: LobbyUser = {
    userId,
    displayName: displayName || `Team ${lobby.users.length + 1}`,
    teamId: null,
    isCommissioner: false,
    isConnected: true,
  };

  const newUsers = [...lobby.users, newUser];
  const isFull = newUsers.length === lobby.config.teamCount;
  const canStart = newUsers.length >= DRAFT_CONSTRAINTS.TEAMS_MIN;

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

function assignTeamsToUsers(users: LobbyUser[]): LobbyUser[] {
  return users.map((user, index) => ({
    ...user,
    teamId: `team_${index + 1}`,
  }));
}

export function removeUserFromLobby(
  lobby: LobbyState,
  userId: string
): LobbyState {
  if (userId === lobby.commissionerId) {
    throw new Error('Cannot remove commissioner from lobby');
  }

  const newUsers = lobby.users.filter(u => u.userId !== userId);
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
 * Mark lobby as draft started - Phase 1A
 */
export function markDraftStarted(lobby: LobbyState): LobbyState {
  return {
    ...lobby,
    draftStarted: true,
  };
}

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

  // Phase 1A: Validate rotation depth
  if (config.rotationDepth < DRAFT_CONSTRAINTS.ROTATION_MIN || config.rotationDepth > config.rosterSize) {
    errors.push(`Rotation depth must be between ${DRAFT_CONSTRAINTS.ROTATION_MIN} and roster size`);
  }

  // Phase 1A: Validate season format
  const validFormats = ['single_round_robin', 'double_round_robin', 'playoffs_only'];
  if (!validFormats.includes(config.seasonFormat)) {
    errors.push(`Season format must be one of: ${validFormats.join(', ')}`);
  }

  if (errors.length > 0) {
    throw new Error(`Invalid lobby config: ${errors.join(', ')}`);
  }
}

export function isCommissioner(lobby: LobbyState, userId: string): boolean {
  return lobby.commissionerId === userId;
}

export function getUserById(lobby: LobbyState, userId: string): LobbyUser | undefined {
  return lobby.users.find(u => u.userId === userId);
}

export function updateLobbyConfig(
  lobby: LobbyState,
  config: Partial<LobbyConfig>
): LobbyState {
  const newConfig = { ...lobby.config, ...config };
  validateLobbyConfig(newConfig);

  const teamCountChanged = config.teamCount !== undefined && config.teamCount !== lobby.config.teamCount;

  let newUsers = lobby.users;
  if (teamCountChanged) {
    newUsers = lobby.users.map(u => ({ ...u, teamId: null }));

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

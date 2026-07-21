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

function generateInviteCode(): string {
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
    displayName: normalizeDisplayName(displayName, 'Team 1'),
    teamId: null,
    isCommissioner: true,
    isConnected: true,
  };

  const users = config.teamCount === 1 ? assignTeamsToUsers([commissioner]) : [commissioner];
  const canStart = users.length === config.teamCount;

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
    displayName: normalizeDisplayName(displayName, `Team ${lobby.users.length + 1}`),
    teamId: null,
    isCommissioner: false,
    isConnected: true,
  };

  const newUsers = [...lobby.users, newUser];
  const isFull = newUsers.length === lobby.config.teamCount;
  const canStart = newUsers.length === lobby.config.teamCount;

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

function normalizeDisplayName(displayName: string, fallback: string): string {
  return displayName.trim() || fallback;
}

export function createDraftTeamsFromLobby(lobby: LobbyState): DraftTeam[] {
  if (!lobby.canStart) {
    throw new Error('Lobby is not ready to start draft');
  }

  return lobby.users.map(user => ({
    teamId: requireTeamId(user),
    userId: user.userId,
    displayName: user.displayName,
    roster: [],
    queue: [],
  }));
}

function requireTeamId(user: LobbyUser): string {
  if (!user.teamId) {
    throw new Error(`Lobby user ${user.displayName} does not have a draft team assigned`);
  }

  return user.teamId;
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

  // Phase 1A: Validate season format
  const validFormats: LobbyConfig['seasonFormat'][] = ['single_round_robin', 'double_round_robin', 'quick_sim'];
  if (!validFormats.includes(config.seasonFormat)) {
    errors.push(`Season format must be one of: ${validFormats.join(', ')}`);
  }

  if (errors.length > 0) {
    throw new Error(`Invalid lobby config: ${errors.join(', ')}`);
  }
}

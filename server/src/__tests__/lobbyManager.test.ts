import { describe, expect, it } from 'vitest';
import { addUserToLobby, createDraftTeamsFromLobby, createLobby } from '../../managers/lobbyManager';
import type { LobbyConfig } from '@nba-draft-sim/shared';

function makeConfig(overrides: Partial<LobbyConfig> = {}): LobbyConfig {
  return {
    teamCount: 6,
    rosterSize: 10,
    pickTimer: 60,
    seasonFormat: 'double_round_robin',
    ...overrides,
  };
}

describe('lobby manager draft readiness', () => {
  it('accepts the shared quick_sim season format', () => {
    const lobby = createLobby('commissioner', 'Commissioner Team', makeConfig({ seasonFormat: 'quick_sim' }));

    expect(lobby.config.seasonFormat).toBe('quick_sim');
  });

  it('does not allow a partially filled multiplayer lobby to start', () => {
    const lobby = createLobby('commissioner', 'Commissioner Team', makeConfig({ teamCount: 6 }));

    expect(lobby.canStart).toBe(false);
    expect(() => createDraftTeamsFromLobby(lobby)).toThrow('Lobby is not ready to start draft');
  });

  it('assigns team ids when a one-team lobby is ready to draft', () => {
    const lobby = createLobby('commissioner', 'Solo Team', makeConfig({ teamCount: 1 }));

    expect(lobby.canStart).toBe(true);
    expect(lobby.users[0].teamId).toBe('team_1');
    expect(createDraftTeamsFromLobby(lobby)).toEqual([
      {
        teamId: 'team_1',
        userId: 'commissioner',
        displayName: 'Solo Team',
        roster: [],
        queue: [],
      },
    ]);
  });

  it('normalizes the commissioner display name when creating a lobby', () => {
    const trimmedLobby = createLobby('commissioner', '  Trimmed Team  ', makeConfig({ teamCount: 1 }));
    const defaultedLobby = createLobby('commissioner', '   ', makeConfig({ teamCount: 1 }));

    expect(trimmedLobby.users[0].displayName).toBe('Trimmed Team');
    expect(defaultedLobby.users[0].displayName).toBe('Team 1');
  });

  it('assigns team ids only once a multiplayer lobby is full', () => {
    let lobby = createLobby('commissioner', 'Team 1', makeConfig({ teamCount: 2 }));

    expect(lobby.canStart).toBe(false);
    expect(lobby.users[0].teamId).toBeNull();

    lobby = addUserToLobby(lobby, 'user-2', 'Team 2');

    expect(lobby.canStart).toBe(true);
    expect(lobby.users.map((user) => user.teamId)).toEqual(['team_1', 'team_2']);
  });

  it('normalizes joined user display names with the same fallback pattern', () => {
    let lobby = createLobby('commissioner', 'Team 1', makeConfig({ teamCount: 3 }));

    lobby = addUserToLobby(lobby, 'user-2', '  Second Team  ');
    lobby = addUserToLobby(lobby, 'user-3', '   ');

    expect(lobby.users.map((user) => user.displayName)).toEqual(['Team 1', 'Second Team', 'Team 3']);
  });
});

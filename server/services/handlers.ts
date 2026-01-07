/**
 * WebSocket Event Handlers
 * Handles all Socket.io events for lobby, draft, and league
 */

import { Server as SocketServer, Socket } from 'socket.io';
import {
  ClientMessage,
  ServerMessage,
  LobbyState,
  DraftState,
  LeagueState,
  Player,
} from '@nba-draft-sim/shared';
import { WS_EVENTS } from '@nba-draft-sim/shared';
import {
  createLobby,
  addUserToLobby,
  createDraftTeamsFromLobby,
} from '../managers/lobbyManager';
import {
  createDraftState,
  startDraft,
  makePick,
  pauseDraft,
  unpauseDraft,
  updateTeamQueue,
  getCurrentTeam,
  getAutopickPlayer,
} from './draftState';
import {
  createLeague,
  transitionToDraftRecap,
  startTradeWindow,
  executeTrade,
  startRegularSeason,
  startPlayoffs,
  completeLeague,
  getLeague,
} from '../managers/leagueManager';
import { getOrCreateSession, validateSession } from '../managers/sessionManager';

/**
 * In-memory stores (for v1)
 * In production, use Redis or similar
 */
const lobbies = new Map<string, LobbyState>();
const drafts = new Map<string, DraftState>();
const inviteCodeToLobby = new Map<string, string>(); // inviteCode -> lobbyId

/**
 * Socket room management
 */
function joinLobbyRoom(socket: Socket, lobbyId: string) {
  socket.join(`lobby:${lobbyId}`);
}

function leaveLobbyRoom(socket: Socket, lobbyId: string) {
  socket.leave(`lobby:${lobbyId}`);
}

function emitToLobby(io: SocketServer, lobbyId: string, event: string, data: ServerMessage) {
  io.to(`lobby:${lobbyId}`).emit(event, data);
}

/**
 * Handle CREATE_LOBBY event
 */
import { LobbyConfig } from '@nba-draft-sim/shared';

export function handleCreateLobby(
  io: SocketServer,
  socket: Socket,
  payload: { config: LobbyConfig },
  userId: string,
  displayName: string
) {
  console.log('🟢 handleCreateLobby called!', { userId, displayName, config: payload.config });
  try {
    const lobby = createLobby(userId, displayName, payload.config);

    // Store lobby
    lobbies.set(lobby.lobbyId, lobby);
    inviteCodeToLobby.set(lobby.inviteCode, lobby.lobbyId);

    // Join room
    joinLobbyRoom(socket, lobby.lobbyId);

    // Store lobby ID on socket
    socket.data.lobbyId = lobby.lobbyId;

    // Send response
    socket.emit(WS_EVENTS.LOBBY_CREATED, { payload: lobby });
  } catch (error: any) {
    socket.emit(WS_EVENTS.ERROR, { payload: { message: error.message } });
  }
}

/**
 * Handle JOIN_LOBBY event
 */
export function handleJoinLobby(
  io: SocketServer,
  socket: Socket,
  payload: { inviteCode: string; displayName: string },
  userId: string
) {
  try {
    const lobbyId = inviteCodeToLobby.get(payload.inviteCode);
    if (!lobbyId) {
      throw new Error('Invalid invite code');
    }

    const lobby = lobbies.get(lobbyId);
    if (!lobby) {
      throw new Error('Lobby not found');
    }

    // Add user to lobby
    const updatedLobby = addUserToLobby(lobby, userId, payload.displayName);
    lobbies.set(lobbyId, updatedLobby);

    // Join room
    joinLobbyRoom(socket, lobbyId);
    socket.data.lobbyId = lobbyId;

    // Broadcast update to all users in lobby
    emitToLobby(io, lobbyId, WS_EVENTS.LOBBY_UPDATED, {
      type: 'LOBBY_UPDATED',
      payload: updatedLobby
    });
  } catch (error: any) {
    socket.emit(WS_EVENTS.ERROR, { payload: { message: error.message } });
  }
}

/**
 * Handle START_DRAFT event
 */
export function handleStartDraft(
  io: SocketServer,
  socket: Socket,
  userId: string,
  allPlayers: Player[]
) {
  try {
    const lobbyId = socket.data.lobbyId;
    if (!lobbyId) {
      throw new Error('Not in a lobby');
    }

    const lobby = lobbies.get(lobbyId);
    if (!lobby) {
      throw new Error('Lobby not found');
    }

    // Verify user is commissioner
    if (lobby.commissionerId !== userId) {
      throw new Error('Only commissioner can start draft');
    }

    if (!lobby.canStart) {
      throw new Error('Lobby is not ready to start');
    }

    // Create draft teams
    const teams = createDraftTeamsFromLobby(lobby);

    // Get all available player IDs
    const availablePlayers = allPlayers.map(p => p.playerId);

    // Create draft state
    const draftState = createDraftState(
      lobbyId,
      lobby.config,
      teams,
      availablePlayers,
      'snapshot_v1' // TODO: Use actual snapshot ID
    );

    // Start the draft
    const activeDraft = startDraft(draftState);
    drafts.set(lobbyId, activeDraft);

    // Create league
    createLeague(activeDraft);

    // Broadcast draft start
    emitToLobby(io, lobbyId, WS_EVENTS.DRAFT_STARTED, { type: 'DRAFT_STARTED', payload: activeDraft });
  } catch (error: any) {
    socket.emit(WS_EVENTS.ERROR, { payload: { message: error.message } });
  }
}

/**
 * Handle MAKE_PICK event
 */
export function handleMakePick(
  io: SocketServer,
  socket: Socket,
  payload: { playerId: string },
  userId: string
) {
  try {
    const lobbyId = socket.data.lobbyId;
    if (!lobbyId) {
      throw new Error('Not in a lobby');
    }

    const draftState = drafts.get(lobbyId);
    if (!draftState) {
      throw new Error('Draft not found');
    }

    // Verify it's the user's turn
    const currentTeam = getCurrentTeam(draftState);
    if (!currentTeam || currentTeam.userId !== userId) {
      throw new Error('Not your turn to pick');
    }

    // Make the pick
    const updatedDraft = makePick(draftState, payload.playerId, false);
    drafts.set(lobbyId, updatedDraft);

    // Update league
    const league = getLeague(lobbyId);
    if (league) {
      league.draftState = updatedDraft;
    }

    // Broadcast pick
    const pick = updatedDraft.picks[updatedDraft.picks.length - 1];
    emitToLobby(io, lobbyId, WS_EVENTS.PICK_MADE, { type: 'PICK_MADE', payload: pick });
    emitToLobby(io, lobbyId, WS_EVENTS.DRAFT_UPDATED, { type: 'DRAFT_UPDATED', payload: updatedDraft });

    // Check if draft is complete
    if (updatedDraft.status === 'completed') {
      emitToLobby(io, lobbyId, WS_EVENTS.DRAFT_COMPLETED, { type: 'DRAFT_COMPLETED', payload: updatedDraft });

      // Transition to draft recap
      const updatedLeague = transitionToDraftRecap(lobbyId);
      if (updatedLeague) {
        emitToLobby(io, lobbyId, WS_EVENTS.LEAGUE_UPDATED, { type: 'LEAGUE_UPDATED', payload: updatedLeague });
      }
    }
  } catch (error: any) {
    socket.emit(WS_EVENTS.ERROR, { payload: { message: error.message } });
  }
}

/**
 * Handle UPDATE_QUEUE event
 */
export function handleUpdateQueue(
  io: SocketServer,
  socket: Socket,
  payload: { queue: string[] },
  userId: string
) {
  try {
    const lobbyId = socket.data.lobbyId;
    if (!lobbyId) {
      throw new Error('Not in a lobby');
    }

    const draftState = drafts.get(lobbyId);
    if (!draftState) {
      throw new Error('Draft not found');
    }

    // Find user's team
    const team = draftState.teams.find(t => t.userId === userId);
    if (!team) {
      throw new Error('Team not found');
    }

    // Update queue
    const updatedDraft = updateTeamQueue(draftState, team.teamId, payload.queue);
    drafts.set(lobbyId, updatedDraft);

    // Only send update to the user (queue is private)
    socket.emit(WS_EVENTS.DRAFT_UPDATED, { payload: updatedDraft });
  } catch (error: any) {
    socket.emit(WS_EVENTS.ERROR, { payload: { message: error.message } });
  }
}

/**
 * Handle PAUSE_DRAFT event
 */
export function handlePauseDraft(
  io: SocketServer,
  socket: Socket,
  userId: string
) {
  try {
    const lobbyId = socket.data.lobbyId;
    if (!lobbyId) {
      throw new Error('Not in a lobby');
    }

    const lobby = lobbies.get(lobbyId);
    if (!lobby || lobby.commissionerId !== userId) {
      throw new Error('Only commissioner can pause draft');
    }

    const draftState = drafts.get(lobbyId);
    if (!draftState) {
      throw new Error('Draft not found');
    }

    const pausedDraft = pauseDraft(draftState, userId);
    drafts.set(lobbyId, pausedDraft);

    emitToLobby(io, lobbyId, WS_EVENTS.DRAFT_UPDATED, { type: 'DRAFT_UPDATED', payload: pausedDraft });
  } catch (error: any) {
    socket.emit(WS_EVENTS.ERROR, { payload: { message: error.message } });
  }
}

/**
 * Handle UNPAUSE_DRAFT event
 */
export function handleUnpauseDraft(
  io: SocketServer,
  socket: Socket,
  userId: string
) {
  try {
    const lobbyId = socket.data.lobbyId;
    if (!lobbyId) {
      throw new Error('Not in a lobby');
    }

    const lobby = lobbies.get(lobbyId);
    if (!lobby || lobby.commissionerId !== userId) {
      throw new Error('Only commissioner can unpause draft');
    }

    const draftState = drafts.get(lobbyId);
    if (!draftState) {
      throw new Error('Draft not found');
    }

    const unpausedDraft = unpauseDraft(draftState);
    drafts.set(lobbyId, unpausedDraft);

    emitToLobby(io, lobbyId, WS_EVENTS.DRAFT_UPDATED, { type: 'DRAFT_UPDATED', payload: unpausedDraft });
  } catch (error: any) {
    socket.emit(WS_EVENTS.ERROR, { payload: { message: error.message } });
  }
}

/**
 * Handle START_TRADE_WINDOW event
 */
export function handleStartTradeWindow(
  io: SocketServer,
  socket: Socket,
  userId: string
) {
  try {
    const lobbyId = socket.data.lobbyId;
    if (!lobbyId) {
      throw new Error('Not in a lobby');
    }

    const lobby = lobbies.get(lobbyId);
    if (!lobby || lobby.commissionerId !== userId) {
      throw new Error('Only commissioner can start trade window');
    }

    const updatedLeague = startTradeWindow(lobbyId);
    if (!updatedLeague) {
      throw new Error('Failed to start trade window');
    }

    emitToLobby(io, lobbyId, WS_EVENTS.TRADE_WINDOW_STARTED, { type: 'TRADE_WINDOW_STARTED',
      payload: { endsAt: updatedLeague.tradeWindowEndsAt ?? String(Date.now()) },
    });
    emitToLobby(io, lobbyId, WS_EVENTS.LEAGUE_UPDATED, { type: 'LEAGUE_UPDATED', payload: updatedLeague });
  } catch (error: any) {
    socket.emit(WS_EVENTS.ERROR, { payload: { message: error.message } });
  }
}

/**
 * Handle EXECUTE_TRADE event
 */
export function handleExecuteTrade(
  io: SocketServer,
  socket: Socket,
  payload: { teamAId: string; teamBId: string; playerAIds: string[]; playerBIds: string[] },
  userId: string
) {
  try {
    const lobbyId = socket.data.lobbyId;
    if (!lobbyId) {
      throw new Error('Not in a lobby');
    }

    const lobby = lobbies.get(lobbyId);
    if (!lobby || lobby.commissionerId !== userId) {
      throw new Error('Only commissioner can execute trades');
    }

    const updatedLeague = executeTrade(
      lobbyId,
      payload.teamAId,
      payload.teamBId,
      payload.playerAIds,
      payload.playerBIds
    );

    if (!updatedLeague || !updatedLeague.draftState) {
      throw new Error('Failed to execute trade');
    }

    // Update draft state
    drafts.set(lobbyId, updatedLeague.draftState);

    emitToLobby(io, lobbyId, WS_EVENTS.TRADE_EXECUTED, { type: 'TRADE_EXECUTED', payload: updatedLeague.draftState });
    emitToLobby(io, lobbyId, WS_EVENTS.LEAGUE_UPDATED, { type: 'LEAGUE_UPDATED', payload: updatedLeague });
  } catch (error: any) {
    socket.emit(WS_EVENTS.ERROR, { payload: { message: error.message } });
  }
}

/**
 * Handle START_REGULAR_SEASON event
 */
export function handleStartRegularSeason(
  io: SocketServer,
  socket: Socket,
  userId: string,
  allPlayers: Player[]
) {
  try {
    const lobbyId = socket.data.lobbyId;
    if (!lobbyId) {
      throw new Error('Not in a lobby');
    }

    const lobby = lobbies.get(lobbyId);
    if (!lobby || lobby.commissionerId !== userId) {
      throw new Error('Only commissioner can start regular season');
    }

    const updatedLeague = startRegularSeason(lobbyId, allPlayers);
    if (!updatedLeague || !updatedLeague.regularSeasonResults) {
      throw new Error('Failed to start regular season');
    }

    emitToLobby(io, lobbyId, WS_EVENTS.REGULAR_SEASON_STARTED, { type: 'REGULAR_SEASON_STARTED',
      payload: updatedLeague.regularSeasonResults,
    });
    emitToLobby(io, lobbyId, WS_EVENTS.LEAGUE_UPDATED, { type: 'LEAGUE_UPDATED', payload: updatedLeague });
  } catch (error: any) {
    socket.emit(WS_EVENTS.ERROR, { payload: { message: error.message } });
  }
}

/**
 * Handle START_PLAYOFFS event
 */
export function handleStartPlayoffs(
  io: SocketServer,
  socket: Socket,
  userId: string,
  allPlayers: Player[]
) {
  try {
    const lobbyId = socket.data.lobbyId;
    if (!lobbyId) {
      throw new Error('Not in a lobby');
    }

    const lobby = lobbies.get(lobbyId);
    if (!lobby || lobby.commissionerId !== userId) {
      throw new Error('Only commissioner can start playoffs');
    }

    const updatedLeague = startPlayoffs(lobbyId, allPlayers);
    if (!updatedLeague || !updatedLeague.playoffResults) {
      throw new Error('Failed to start playoffs');
    }

    // Mark league as complete
    const completedLeague = completeLeague(lobbyId);

    emitToLobby(io, lobbyId, WS_EVENTS.PLAYOFFS_STARTED, { type: 'PLAYOFFS_STARTED',
      payload: updatedLeague.playoffResults,
    });

    if (completedLeague) {
      emitToLobby(io, lobbyId, WS_EVENTS.LEAGUE_UPDATED, { type: 'LEAGUE_UPDATED', payload: completedLeague });
    }
  } catch (error: any) {
    socket.emit(WS_EVENTS.ERROR, { payload: { message: error.message } });
  }
}

/**
 * Handle auto-pick when timer expires
 */
export function handleAutoPick(
  io: SocketServer,
  lobbyId: string,
  allPlayers: Player[]
) {
  try {
    const draftState = drafts.get(lobbyId);
    if (!draftState) return;

    const playerId = getAutopickPlayer(draftState, allPlayers);
    if (!playerId) return;

    const updatedDraft = makePick(draftState, playerId, true);
    drafts.set(lobbyId, updatedDraft);

    // Update league
    const league = getLeague(lobbyId);
    if (league) {
      league.draftState = updatedDraft;
    }

    // Broadcast pick
    const pick = updatedDraft.picks[updatedDraft.picks.length - 1];
    emitToLobby(io, lobbyId, WS_EVENTS.PICK_MADE, { type: 'PICK_MADE', payload: pick });
    emitToLobby(io, lobbyId, WS_EVENTS.DRAFT_UPDATED, { type: 'DRAFT_UPDATED', payload: updatedDraft });

    // Check if draft is complete
    if (updatedDraft.status === 'completed') {
      emitToLobby(io, lobbyId, WS_EVENTS.DRAFT_COMPLETED, { type: 'DRAFT_COMPLETED', payload: updatedDraft });

      const updatedLeague = transitionToDraftRecap(lobbyId);
      if (updatedLeague) {
        emitToLobby(io, lobbyId, WS_EVENTS.LEAGUE_UPDATED, { type: 'LEAGUE_UPDATED', payload: updatedLeague });
      }
    }
  } catch (error) {
    console.error('Auto-pick error:', error);
  }
}

/**
 * Handle REJOIN_DRAFT event
 */
export function handleRejoinDraft(
    io: SocketServer,
    socket: Socket,
    payload: { token: string },
    allPlayers: Player[]
) {
    try {
        const { token } = payload;
        let lobbyId: string | undefined;
        let userId: string | undefined;

        // Find the lobby and user with the given rejoin token
        for (const [id, lobby] of lobbies.entries()) {
            const user = lobby.users.find(u => u.rejoinToken === token);
            if (user) {
                lobbyId = id;
                userId = user.userId;
                break;
            }
        }

        if (!lobbyId || !userId) {
            throw new Error('Invalid rejoin token');
        }

        const draftState = drafts.get(lobbyId);
        if (!draftState) {
            throw new Error('Draft not found');
        }

        // Join the lobby room
        joinLobbyRoom(socket, lobbyId);
        socket.data.lobbyId = lobbyId;
        socket.data.userId = userId;

        // Send the current draft state to the user
        socket.emit('rejoin:success', { payload: draftState });
    } catch (error: any) {
        socket.emit('rejoin:failure', { payload: { message: error.message } });
    }
}

/**
 * Export stores for timer management
 */
export { lobbies, drafts };

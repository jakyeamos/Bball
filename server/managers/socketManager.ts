/**
 * Socket Manager
 * Orchestrates WebSocket connections and event routing
 * 
 * UPDATED: Emits SESSION_INFO on connection so client knows their userId
 * FIX: Import handlers from correct files
 */

import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { Player } from '@nba-draft-sim/shared';
import { WS_EVENTS } from '@nba-draft-sim/shared';
import { getOrCreateSession, SESSION_COOKIE_NAME } from './sessionManager';
// FIX: Import core handlers from handlers.ts
import {
  handleCreateLobby,
  handleJoinLobby,
  handleStartDraft,
  handleMakePick,
  handleUpdateQueue,
  handlePauseDraft,
  handleUnpauseDraft,
  handleStartRegularSeason,
  handleStartPlayoffs,
  handleCompleteLeague,
} from '../services/handlers';
// FIX: Import new handlers from handlers-v2.ts
import {
  handleStartRound,
  handleSubmitCoaching,
  handleProposeTrade,
  handleRespondToTrade,
  handleCancelTrade,
  initHandlersV2,
  handleSubmitQuarterCoaching,
  handleReadyForQuarter,
} from '../services/handlers-v2';
import { startDraftTimer, stopDraftTimer, stopAllTimers } from './timerManager';
import { stopTradeWindowTimer, stopAllTradeTimers } from './tradeTimerManager';
import { rejoinManager } from './rejoinManager';
import { lobbies, drafts } from '../services/handlers';
import { getLeague } from '../managers/leagueManager';
import { isAllowedCorsOrigin } from '../utils/corsOrigins';

/**
 * Initialize Socket.io server
 */
export function initializeSocketServer(
  httpServer: HttpServer,
  allPlayers: Player[]
): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        if (isAllowedCorsOrigin(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Middleware: Session authentication
  io.use((socket, next) => {
    try {
      // Get session from cookie or create new
      const cookies = socket.handshake.headers.cookie;
      let userId: string | null = null;

      if (cookies) {
        const sessionCookie = cookies
          .split(';')
          .find(c => c.trim().startsWith(`${SESSION_COOKIE_NAME}=`));

        if (sessionCookie) {
          userId = sessionCookie.split('=')[1];
        }
      }

      // Get or create session
      const displayName = socket.handshake.auth.displayName as string | undefined;
      const session = getOrCreateSession(userId, displayName);

      // Store session info on socket
      socket.data.userId = session.userId;
      socket.data.displayName = session.displayName;

      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  // Phase 1: FOUND-03 — provide allPlayers to handlers-v2 auto-sim path
  initHandlersV2(allPlayers);

  // Connection handler
  io.on(WS_EVENTS.CONNECT, (socket: Socket) => {
    console.log(`✅ Client connected: ${socket.id} (user: ${socket.data.userId})`);
    console.log('🔵 Registering CREATE_LOBBY listener for event:', WS_EVENTS.CREATE_LOBBY);

    socket.onAny((eventName, ...args) => {
      console.log(`📥 Received event: "${eventName}"`, args);
    });

    console.log(`Client connected: ${socket.id} (user: ${socket.data.userId})`);

    const userId = socket.data.userId;
    const displayName = socket.data.displayName;

    // ═══════════════════════════════════════════════════════════════════════
    // 🆕 EMIT SESSION INFO - Tell the client who they are
    // ═══════════════════════════════════════════════════════════════════════
    socket.emit(WS_EVENTS.SESSION_INFO, {
      payload: {
        userId: userId,
        displayName: displayName,
      }
    });
    console.log(`📤 Sent SESSION_INFO to client: userId=${userId}`);
    // ═══════════════════════════════════════════════════════════════════════

    // ═══════════════════════════════════════════════════════════════════════
    // 🔄 REJOIN POLICY - Check if user has an existing session
    // ═══════════════════════════════════════════════════════════════════════
    const existingLobbyId = rejoinManager.getUserLobby(userId);
    if (existingLobbyId) {
      console.log(`🔄 User ${userId} has existing session in lobby ${existingLobbyId}, rejoining...`);

      const lobby = lobbies.get(existingLobbyId);
      if (lobby) {
        // Update user connection status
        const updatedLobby = {
          ...lobby,
          users: lobby.users.map(u =>
            u.userId === userId ? { ...u, isConnected: true } : u
          ),
        };
        lobbies.set(existingLobbyId, updatedLobby);

        // Rejoin lobby room
        socket.join(`lobby:${existingLobbyId}`);
        socket.data.lobbyId = existingLobbyId;

        // Send current state to rejoining user
        socket.emit(WS_EVENTS.LOBBY_UPDATED, {
          type: 'LOBBY_UPDATED',
          payload: updatedLobby
        });

        // Check if draft exists and send draft state
        const draft = drafts.get(existingLobbyId);
        if (draft) {
          socket.emit(WS_EVENTS.DRAFT_UPDATED, {
            type: 'DRAFT_UPDATED',
            payload: draft
          });
        }

        // Check if league exists and send league state
        const league = getLeague(existingLobbyId);
        if (league) {
          socket.emit(WS_EVENTS.LEAGUE_UPDATED, {
            type: 'LEAGUE_UPDATED',
            payload: league
          });
        }

        console.log(`✅ User ${userId} successfully rejoined lobby ${existingLobbyId}`);
      } else {
        // Lobby no longer exists, clean up rejoin mapping
        rejoinManager.removeUser(userId);
        console.log(`⚠️ Lobby ${existingLobbyId} no longer exists, cleaned up rejoin mapping`);
      }
    }
    // ═══════════════════════════════════════════════════════════════════════

    // CREATE_LOBBY
    socket.on(WS_EVENTS.CREATE_LOBBY, (payload: any) => {
      console.log('🟢 CREATE_LOBBY EVENT RECEIVED!', payload);

      handleCreateLobby(io, socket, payload, userId, displayName);
    });

    // JOIN_LOBBY
    socket.on(WS_EVENTS.JOIN_LOBBY, (payload: any) => {
      handleJoinLobby(io, socket, payload, userId);
    });

    // START_DRAFT
    socket.on(WS_EVENTS.START_DRAFT, () => {
      handleStartDraft(io, socket, userId, allPlayers);

      // Start timer for this lobby
      const lobbyId = socket.data.lobbyId;
      if (lobbyId) {
        startDraftTimer(io, lobbyId, allPlayers);
      }
    });

    // MAKE_PICK
    socket.on(WS_EVENTS.MAKE_PICK, (payload: any) => {
      handleMakePick(io, socket, payload, userId);
    });

    // UPDATE_QUEUE
    socket.on(WS_EVENTS.UPDATE_QUEUE, (payload: any) => {
      handleUpdateQueue(io, socket, payload, userId);
    });

    // PAUSE_DRAFT
    socket.on(WS_EVENTS.PAUSE_DRAFT, () => {
      handlePauseDraft(io, socket, userId);
    });

    // UNPAUSE_DRAFT
    socket.on(WS_EVENTS.UNPAUSE_DRAFT, () => {
      handleUnpauseDraft(io, socket, userId);
    });

    // START_REGULAR_SEASON
    socket.on(WS_EVENTS.START_REGULAR_SEASON, () => {
      handleStartRegularSeason(io, socket, userId, allPlayers);
    });

    socket.on(WS_EVENTS.START_ROUND, () => {
      handleStartRound(io, socket, userId, allPlayers);
    });

    socket.on(WS_EVENTS.SUBMIT_COACHING_DECISION, (payload: any) => {
      handleSubmitCoaching(io, socket, payload, userId);
    });

    socket.on(WS_EVENTS.PROPOSE_TRADE, (payload: any) => {
      handleProposeTrade(io, socket, payload, userId);
    });

    socket.on(WS_EVENTS.RESPOND_TO_TRADE, (payload: any) => {
      handleRespondToTrade(io, socket, payload, userId);
    });

    socket.on(WS_EVENTS.CANCEL_TRADE_PROPOSAL, (payload: any) => {
      handleCancelTrade(io, socket, payload, userId);
    });

    // Phase 1: FOUND-04 — wire missing quarter coaching WebSocket events
    socket.on(WS_EVENTS.SUBMIT_QUARTER_COACHING, (payload: any) => {
      handleSubmitQuarterCoaching(io, socket, payload, userId);
    });
    socket.on(WS_EVENTS.READY_FOR_QUARTER, () => {
      handleReadyForQuarter(io, socket, userId);
    });

    // START_PLAYOFFS
    socket.on(WS_EVENTS.START_PLAYOFFS, () => {
      handleStartPlayoffs(io, socket, userId, allPlayers);
    });

    // COMPLETE_LEAGUE
    socket.on(WS_EVENTS.COMPLETE_LEAGUE, () => {
      handleCompleteLeague(io, socket, userId);
    });

    // DISCONNECT
    socket.on(WS_EVENTS.DISCONNECT, () => {
      console.log(`Client disconnected: ${socket.id} (user: ${userId})`);

      const lobbyId = socket.data.lobbyId;
      if (lobbyId) {
        // Mark user as disconnected but keep them in the lobby (rejoin policy)
        const lobby = lobbies.get(lobbyId);
        if (lobby) {
          const updatedLobby = {
            ...lobby,
            users: lobby.users.map(u =>
              u.userId === userId ? { ...u, isConnected: false } : u
            ),
          };
          lobbies.set(lobbyId, updatedLobby);

          // Notify other users about disconnection
          io.to(`lobby:${lobbyId}`).emit(WS_EVENTS.LOBBY_UPDATED, {
            type: 'LOBBY_UPDATED',
            payload: updatedLobby
          });

          console.log(`📴 User ${userId} marked as disconnected in lobby ${lobbyId}`);
        }

        // Clean up timer if this was the last connected user in a lobby
        const roomSockets = io.sockets.adapter.rooms.get(`lobby:${lobbyId}`);
        if (!roomSockets || roomSockets.size === 0) {
          stopDraftTimer(lobbyId);
        }
        stopTradeWindowTimer(lobbyId);
      }
    });
  });

  // Cleanup on server shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, cleaning up...');
    stopAllTimers();
    stopAllTradeTimers();
    io.close();
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, cleaning up...');
    stopAllTimers();
    stopAllTradeTimers();
    io.close();
  });

  return io;
}

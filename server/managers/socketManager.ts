/**
 * Socket Manager
 * Orchestrates WebSocket connections and event routing
 * 
 * UPDATED: Emits SESSION_INFO on connection so client knows their userId
 */

import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { Player } from '@nba-draft-sim/shared';
import { WS_EVENTS } from '@nba-draft-sim/shared';
import { getOrCreateSession, SESSION_COOKIE_NAME } from './sessionManager';
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
  handleStartRound,
  handleSubmitCoaching,
  handleProposeTrade,
  handleRespondToTrade,
  handleCancelTrade,
} from '../services/handlers-v2';
import { startDraftTimer, stopDraftTimer, stopAllTimers } from './timerManager';
import { stopTradeWindowTimer, stopAllTradeTimers } from './tradeTimerManager';

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

        const allowedOrigins = [
          'http://localhost:3000',
          'https://bball-client.vercel.app',
        ];

        const isVercelPreview = /^https:\/\/bball-client-.*\.vercel\.app$/.test(origin);

        if (allowedOrigins.includes(origin) || isVercelPreview) {
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

    // ════════════════════════════════════════════════════════════════════════
    // 🆕 EMIT SESSION INFO - Tell the client who they are
    // ════════════════════════════════════════════════════════════════════════
    socket.emit(WS_EVENTS.SESSION_INFO, {
      payload: {
        userId: userId,
        displayName: displayName,
      }
    });
    console.log(`📤 Sent SESSION_INFO to client: userId=${userId}`);
    // ════════════════════════════════════════════════════════════════════════

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
      console.log(`Client disconnected: ${socket.id}`);

      // Clean up timer if this was the last user in a lobby
      const lobbyId = socket.data.lobbyId;
      if (lobbyId) {
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
/**
 * Socket Manager
 * Orchestrates WebSocket connections and event routing
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
  handleStartTradeWindow,
  handleExecuteTrade,
  handleStartRegularSeason,
  handleStartPlayoffs,
} from '../services/handlers';
import { startDraftTimer, stopDraftTimer, stopAllTimers } from './timerManager';
console.log('Server WS_EVENTS.CREATE_LOBBY:', WS_EVENTS.CREATE_LOBBY);

/**
 * Initialize Socket.io server
 */
export function initializeSocketServer(
  httpServer: HttpServer,
  allPlayers: Player[]
): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
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

    // START_TRADE_WINDOW
    socket.on(WS_EVENTS.START_TRADE_WINDOW, () => {
      handleStartTradeWindow(io, socket, userId);
    });

    // EXECUTE_TRADE
    socket.on(WS_EVENTS.EXECUTE_TRADE, (payload: any) => {
      handleExecuteTrade(io, socket, payload, userId);
    });

    // START_REGULAR_SEASON
    socket.on(WS_EVENTS.START_REGULAR_SEASON, () => {
      handleStartRegularSeason(io, socket, userId, allPlayers);
    });

    // START_PLAYOFFS
    socket.on(WS_EVENTS.START_PLAYOFFS, () => {
      handleStartPlayoffs(io, socket, userId, allPlayers);
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
      }
    });
  });

  // Cleanup on server shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, cleaning up...');
    stopAllTimers();
    io.close();
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, cleaning up...');
    stopAllTimers();
    io.close();
  });

  return io;
}

/**
 * WebSocket Service
 * Socket.io client for real-time communication with server
 */

import { io, Socket } from 'socket.io-client';
import {
  LobbyConfig,
} from '@nba-draft-sim/shared';
import { WS_EVENTS } from '@nba-draft-sim/shared';
import { getSocketUrl } from '../lib/runtimeConfig';
import { createLogger } from '../lib/logger';

const logger = createLogger('websocket');

class WebSocketService {
  socket: Socket | null = null;
  private eventHandlers: Map<string, Set<(data: any) => void>> = new Map();

  /**
   * Connect to the server
   */
  connect(displayName?: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve(this.socket);
        return;
      }

      this.socket = io(getSocketUrl(), {
        withCredentials: true,
        auth: {
          displayName,
        },
      });

      this.socket.on(WS_EVENTS.CONNECT, () => {
        logger.debug('connected');

        // Register all event handlers
        this.registerEventHandlers();

        resolve(this.socket!);
      });

      this.socket.on('connect_error', (error) => {
        logger.debug('connect_error', error.message);
        reject(error);
      });
    });
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Register event handlers
   */
  private registerEventHandlers() {
    if (!this.socket) return;

    // Register all server → client events
    Object.values(WS_EVENTS).forEach((event) => {
      this.socket!.on(event, (data: any) => {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
          handlers.forEach((handler) => handler(data));
        }
      });
    });
  }

  /**
   * Subscribe to an event
   */
  on(event: string, handler: (data: any) => void) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  /**
   * Emit an event to server
   */
  emit(event: string, data?: any) {
    if (!this.socket) {
      throw new Error('Socket not connected');
    }
    logger.debug(`emit:${event}`, data);
    this.socket.emit(event, data);
  }

  /**
   * Create a lobby
   */
  createLobby(config: LobbyConfig) {
    this.emit(WS_EVENTS.CREATE_LOBBY, { config });
  }

  /**
   * Join a lobby
   */
  joinLobby(inviteCode: string, displayName: string) {
    this.emit(WS_EVENTS.JOIN_LOBBY, { inviteCode, displayName });
  }

  /**
   * Start the draft
   */
  startDraft() {
    this.emit(WS_EVENTS.START_DRAFT);
  }

  /**
   * Make a pick
   */
  makePick(playerId: string) {
    this.emit(WS_EVENTS.MAKE_PICK, { playerId });
  }

  /**
   * Update queue
   */
  updateQueue(queue: string[]) {
    this.emit(WS_EVENTS.UPDATE_QUEUE, { queue });
  }

  /**
   * Pause draft
   */
  pauseDraft() {
    this.emit(WS_EVENTS.PAUSE_DRAFT);
  }

  /**
   * Unpause draft
   */
  unpauseDraft() {
    this.emit(WS_EVENTS.UNPAUSE_DRAFT);
  }

  /**
   * Start trade window
   */
  startTradeWindow() {
    this.emit(WS_EVENTS.START_TRADE_WINDOW);
  }

  /**
   * Execute trade
   */
  executeTrade(
    teamAId: string,
    teamBId: string,
    playerAIds: string[],
    playerBIds: string[]
  ) {
    logger.debug('execute_trade', {
      event: WS_EVENTS.EXECUTE_TRADE,
      teamAId,
      teamBId,
      playerAIds,
      playerBIds,
    });
    this.emit(WS_EVENTS.EXECUTE_TRADE, {
      teamAId,
      teamBId,
      playerAIds,
      playerBIds,
    });
  }

  /**
   * Start regular season
   */
  startRegularSeason() {
    this.emit(WS_EVENTS.START_REGULAR_SEASON);
  }

  /**
   * Start playoffs
   */
  startPlayoffs() {
    this.emit(WS_EVENTS.START_PLAYOFFS);
  }

  /**
   * Complete league
   */
  completeLeague() {
    this.emit(WS_EVENTS.COMPLETE_LEAGUE);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Singleton instance
export const wsService = new WebSocketService();

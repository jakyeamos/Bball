/**
 * server/managers/tradeTimerManager.ts
 *
 * NEW FILE - Phase 0
 * Trade window countdown timer management
 */

import { Server as SocketServer } from 'socket.io';
import { WS_EVENTS, Player } from '@nba-draft-sim/shared';
import { getLeague, startRegularSeason } from './leagueManager';

/**
 * Active trade window timers
 * Maps lobbyId -> NodeJS.Timeout
 */
const tradeTimers = new Map<string, NodeJS.Timeout>();

/**
 * Start trade window timer for a lobby
 * Checks every second if trade window has expired
 */
export function startTradeWindowTimer(
  io: SocketServer,
  lobbyId: string,
  allPlayers: Player[]
) {
  // Clear any existing timer
  stopTradeWindowTimer(lobbyId);

  // Create interval that ticks every second
  const interval = setInterval(() => {
    const league = getLeague(lobbyId);
    if (!league) {
      stopTradeWindowTimer(lobbyId);
      return;
    }

    // Only check if we're in trade window phase
    if (league.phase !== 'trade_window') {
      stopTradeWindowTimer(lobbyId);
      return;
    }

    // Check if timer expired
    if (league.tradeWindowEndsAt) {
      const now = new Date();
      const endsAt = new Date(league.tradeWindowEndsAt);
      const timeRemaining = Math.max(0, Math.floor((endsAt.getTime() - now.getTime()) / 1000));

      // Emit time remaining update
      io.to(`lobby:${lobbyId}`).emit(WS_EVENTS.TRADE_TIMER_TICK, {
        type: 'TRADE_TIMER_TICK',
        payload: { timeRemaining }
      });

      // If expired, auto-start regular season
      if (timeRemaining === 0) {
        console.log(`⏰ Trade window expired for lobby ${lobbyId}, auto-starting regular season`);

        try {
          const updatedLeague = startRegularSeason(lobbyId, allPlayers);

          if (updatedLeague && updatedLeague.phase === 'regular_season') {
            // Emit that regular season has started
            io.to(`lobby:${lobbyId}`).emit(WS_EVENTS.REGULAR_SEASON_STARTED, {
              type: 'REGULAR_SEASON_STARTED',
              payload: updatedLeague.regularSeasonResults
            });
            io.to(`lobby:${lobbyId}`).emit(WS_EVENTS.LEAGUE_UPDATED, {
              type: 'LEAGUE_UPDATED',
              payload: updatedLeague
            });
          }
        } catch (error) {
          console.error('Error auto-starting regular season:', error);
        }

        stopTradeWindowTimer(lobbyId);
      }
    }
  }, 1000); // Tick every second

  tradeTimers.set(lobbyId, interval);
  console.log(`✅ Started trade window timer for lobby ${lobbyId}`);
}

/**
 * Stop trade window timer for a lobby
 */
export function stopTradeWindowTimer(lobbyId: string) {
  const interval = tradeTimers.get(lobbyId);
  if (interval) {
    clearInterval(interval);
    tradeTimers.delete(lobbyId);
    console.log(`⏹️  Stopped trade window timer for lobby ${lobbyId}`);
  }
}

/**
 * Pause trade window timer (for commissioner control)
 */
export function pauseTradeWindowTimer(lobbyId: string) {
  stopTradeWindowTimer(lobbyId);
}

/**
 * Resume trade window timer
 */
export function resumeTradeWindowTimer(
  io: SocketServer,
  lobbyId: string,
  allPlayers: Player[]
) {
  startTradeWindowTimer(io, lobbyId, allPlayers);
}

/**
 * Stop all timers (cleanup on server shutdown)
 */
export function stopAllTradeTimers() {
  for (const [lobbyId, interval] of tradeTimers.entries()) {
    clearInterval(interval);
  }
  tradeTimers.clear();
  console.log('🛑 Stopped all trade timers');
}

/**
 * server/managers/tradeTimerManager.ts
 *
 * NEW FILE - Phase 0
 * Trade window countdown timer management
 */

/**
 * Active trade window timers
 * Maps lobbyId -> NodeJS.Timeout
 */
const tradeTimers = new Map<string, NodeJS.Timeout>();

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
 * Stop all timers (cleanup on server shutdown)
 */
export function stopAllTradeTimers() {
  for (const interval of tradeTimers.values()) {
    clearInterval(interval);
  }
  tradeTimers.clear();
  console.log('🛑 Stopped all trade timers');
}

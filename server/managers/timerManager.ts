/**
 * Draft Timer Manager
 * Handles pick timer countdown and auto-pick execution
 */

import { Server as SocketServer } from 'socket.io';
import { Player } from '@nba-draft-sim/shared';
import { WS_EVENTS } from '@nba-draft-sim/shared';
import { updateTimer, isTimerExpired, resetTimer } from '../services/draftState';
import { drafts, handleAutoPick } from '../services/handlers';
import { clearInterval as clearIntervalNode } from 'timers';


/**
 * Active timer intervals
 * Maps lobbyId -> NodeJS.Timer
 */
const activeTimers = new Map<string, NodeJS.Timeout>();

/**
 * Start draft timer for a lobby
 */
export function startDraftTimer(
  io: SocketServer,
  lobbyId: string,
  allPlayers: Player[]
) {
  // Clear any existing timer
  stopDraftTimer(lobbyId);

  // Create interval that ticks every second
  const interval = setInterval(() => {
    const draftState = drafts.get(lobbyId);
    if (!draftState) {
      stopDraftTimer(lobbyId);
      return;
    }

    // Only tick if draft is active (not paused or completed)
    if (draftState.status !== 'active') {
      return;
    }

    // Update timer
    const updatedDraft = updateTimer(draftState);
    drafts.set(lobbyId, updatedDraft);

    // Emit timer tick
    if (updatedDraft.timeRemaining !== null) {
      io.to(`lobby:${lobbyId}`).emit(WS_EVENTS.TIMER_TICK, {
        payload: { timeRemaining: updatedDraft.timeRemaining },
      });
    }

    // Check if timer expired
    if (isTimerExpired(updatedDraft)) {
      // Execute auto-pick
      handleAutoPick(io, lobbyId, allPlayers);

      // Timer will be reset by the pick handler
      // Reset happens in makePick function
    }
  }, 1000); // Tick every second

  activeTimers.set(lobbyId, interval);
}

/**
 * Stop draft timer for a lobby
 */
export function stopDraftTimer(lobbyId: string) {
  const interval = activeTimers.get(lobbyId);
  if (interval) {
    clearInterval(interval);  // This should work now
    activeTimers.delete(lobbyId);
  }
}

/**
 * Pause draft timer (keeps interval running but won't decrement)
 * Handled by draft status check in the interval
 */
export function pauseDraftTimer(lobbyId: string) {
  // Timer will automatically pause when status is 'paused'
  // No action needed here - handled by status check in interval
}

/**
 * Resume draft timer
 */
export function resumeDraftTimer(lobbyId: string) {
  // Timer will automatically resume when status is 'active'
  // No action needed here - handled by status check in interval
}

/**
 * Stop all timers (cleanup on server shutdown)
 */
export function stopAllTimers() {
  for (const [lobbyId, interval] of activeTimers.entries()) {
    clearInterval(interval);
  }
  activeTimers.clear();
}

/**
 * Get active timer count (for debugging)
 */
export function getActiveTimerCount(): number {
  return activeTimers.size;
}

/**
 * Draft Timer Manager
 * Handles pick timer countdown and auto-pick execution
 */

import { Server as SocketServer } from 'socket.io';
import { Player } from '@nba-draft-sim/shared';
import { WS_EVENTS } from '@nba-draft-sim/shared';
import { updateTimer, isTimerExpired } from '../services/draftState';
import { drafts, handleAutoPick } from '../services/handlers';


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
 * Stop all timers (cleanup on server shutdown)
 */
export function stopAllTimers() {
  for (const interval of activeTimers.values()) {
    clearInterval(interval);
  }
  activeTimers.clear();
}

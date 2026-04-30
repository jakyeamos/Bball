import { Server as SocketServer } from 'socket.io';
import { WS_EVENTS, DRAFT_CONSTRAINTS } from '@nba-draft-sim/shared';
import { getLeague } from '../stores/leagueStore';
import { getCoachingTimeRemaining } from './roundManager';
import { handleSubmitCoaching, getDefaultCoachingDecision } from '../services/handlers-v2';

const timers = new Map<string, NodeJS.Timeout>();

export function startCoachingTimer(io: SocketServer, lobbyId: string) {
  stopCoachingTimer(lobbyId);

  const interval = setInterval(() => {
    const league = getLeague(lobbyId);
    if (!league || !league.roundState) {
      stopCoachingTimer(lobbyId);
      return;
    }

    // Handle SCOUTING phase
    if (league.roundState.phase === 'scouting') {
      const endsAt = league.roundState.scoutingWindowEndsAt ? new Date(league.roundState.scoutingWindowEndsAt).getTime() : 0;
      const now = Date.now();
      const timeRemaining = Math.max(0, Math.floor((endsAt - now) / 1000));

      // Emit tick
      io.to(`lobby:${lobbyId}`).emit(WS_EVENTS.COACHING_WINDOW_TICK, {
        type: 'SCOUTING_WINDOW_TICK',
        payload: {
          timeRemaining,
          phase: 'scouting'
        }
      });

      // Transition to COACHING
      if (timeRemaining === 0) {
        console.log(`[Timer] Scouting finished for lobby ${lobbyId}, starting Coaching Window`);

        // Update state to coaching_window
        league.roundState.phase = 'coaching_window';
        league.roundState.scoutingWindowEndsAt = null;
        league.roundState.coachingWindowEndsAt = new Date(Date.now() + DRAFT_CONSTRAINTS.PREGAME_COACHING_SECONDS * 1000).toISOString();

        // Broadcast phase update
        io.to(`lobby:${lobbyId}`).emit(WS_EVENTS.ROUND_UPDATED, {
          type: 'ROUND_UPDATED',
          payload: league.roundState
        });

        // Timer continues running to handle coaching phase in next tick
      }
      return;
    }

    // Handle COACHING_WINDOW phase
    if (league.roundState.phase === 'coaching_window') {
      const timeRemaining = getCoachingTimeRemaining(league.roundState);

      io.to(`lobby:${lobbyId}`).emit(WS_EVENTS.COACHING_WINDOW_TICK, {
        type: 'COACHING_WINDOW_TICK',
        payload: {
          timeRemaining,
          phase: 'coaching_window'
        }
      });

      if (timeRemaining === 0) {
        // ... existing auto-submit logic ...
        if (!league.draftState) {
          stopCoachingTimer(lobbyId);
          return;
        }

        const activeTeamIds = league.draftState.teams.map(t => t.teamId);
        const submittedTeamIds = Object.keys(league.roundState.coachingDecisions);
        const missingTeamIds = activeTeamIds.filter(id => !submittedTeamIds.includes(id));

        for (const teamId of missingTeamIds) {
          const team = league.draftState.teams.find(t => t.teamId === teamId);
          if (team) {
            const decision = getDefaultCoachingDecision(teamId, league.roundState.roundNumber);
            const mockSocket = { data: { lobbyId }, emit: () => { } };
            handleSubmitCoaching(io, mockSocket as any, { decision }, team.userId);
          }
        }
        stopCoachingTimer(lobbyId);
      }
    }
  }, 1000);

  timers.set(lobbyId, interval);
}

export function stopCoachingTimer(lobbyId: string) {
  const timer = timers.get(lobbyId);
  if (timer) {
    clearInterval(timer);
    timers.delete(lobbyId);
  }
}
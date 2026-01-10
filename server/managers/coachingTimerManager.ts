import { Server as SocketServer } from 'socket.io';
import { WS_EVENTS, DraftTeam } from '@nba-draft-sim/shared';
import { getLeague, leagueStore } from '../stores/leagueStore';
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

    const timeRemaining = getCoachingTimeRemaining(league.roundState);

    io.to(`lobby:${lobbyId}`).emit(WS_EVENTS.COACHING_WINDOW_TICK, {
      type: 'COACHING_WINDOW_TICK',
      payload: { timeRemaining }
    });

    if (timeRemaining === 0) {
      // FIX: Add null check for draftState
      if (!league.draftState) {
        stopCoachingTimer(lobbyId);
        return;
      }

      const activeTeamIds = league.draftState.teams.map(t => t.teamId);
      const submittedTeamIds = Object.keys(league.roundState.coachingDecisions);
      const missingTeamIds = activeTeamIds.filter(id => !submittedTeamIds.includes(id));

      for (const teamId of missingTeamIds) {
        // FIX: Add null check for draftState
        const team = league.draftState.teams.find(t => t.teamId === teamId);
        if (team) {
          const decision = getDefaultCoachingDecision(teamId, league.roundState.roundNumber);
          // We need a mock socket object here, since handleSubmitCoaching expects it.
          const mockSocket = { data: { lobbyId }, emit: () => {} };
          handleSubmitCoaching(io, mockSocket as any, { decision }, team.userId);
        }
      }
      stopCoachingTimer(lobbyId);
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
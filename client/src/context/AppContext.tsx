/**
 * App Context
 * Global state management for the NBA Draft Simulator
 * 
 * FIXED: 
 * - Added TRADE_EXECUTED handler
 * - Sync draft state when league updates (trades update league.draftState)
 * - Added userId tracking via SESSION_INFO event
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { wsService } from '../services/websocket';
import {
  Player,
  LobbyState,
  DraftState,
  LeagueState,
  RegularSeasonResults,
  PlayoffResults,
  RoundState,
  ScoutingReport,
} from '@nba-draft-sim/shared';
import { WS_EVENTS } from '@nba-draft-sim/shared';

interface AppState {
  // Connection
  isConnected: boolean;
  
  // User Identity - Track who the current user is
  userId: string | null;

  // Player data
  allPlayers: Player[];

  // Lobby
  lobby: LobbyState | null;

  // Draft
  draft: DraftState | null;
  timeRemaining: number | null;

  // League
  league: LeagueState | null;
  regularSeasonResults: RegularSeasonResults | null;
  playoffResults: PlayoffResults | null;

  // Round-based gameplay
  scoutingReports: Record<string, ScoutingReport>; // matchupId -> ScoutingReport

  // Error
  error: string | null;
}

interface AppContextValue extends AppState {
  // Actions
  clearError: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, setState] = useState<AppState>({
    isConnected: false,
    userId: null,
    allPlayers: [],
    lobby: null,
    draft: null,
    timeRemaining: null,
    league: null,
    regularSeasonResults: null,
    playoffResults: null,
    scoutingReports: {},
    error: null,
  });

  useEffect(() => {
    // Connect to WebSocket - use promise resolution instead of event
    wsService.connect()
      .then(() => {
        setState((prev) => ({ ...prev, isConnected: true }));
      })
      .catch((error) => {
        setState((prev) => ({ ...prev, error: error.message }));
      });

    // Subscribe to events
    const unsubscribers: Array<() => void> = [];

    // Disconnect event
    unsubscribers.push(
      wsService.on(WS_EVENTS.DISCONNECT, () => {
        setState((prev) => ({ ...prev, isConnected: false }));
      })
    );

    // ═══════════════════════════════════════════════════════════════════════
    // SESSION INFO - Receive userId from server
    // ═══════════════════════════════════════════════════════════════════════
    unsubscribers.push(
      wsService.on(WS_EVENTS.SESSION_INFO, (data: any) => {
        console.log('🔵 SESSION_INFO received:', data);
        const userId = data.payload?.userId || data.userId;
        setState((prev) => ({ ...prev, userId }));
        console.log('✅ userId set to:', userId);
      })
    );

    // Lobby events - EXTRACT PAYLOAD
    unsubscribers.push(
      wsService.on(WS_EVENTS.LOBBY_CREATED, (data: any) => {
        console.log('🔵 LOBBY_CREATED event received:', data);
        setState((prev) => ({ ...prev, lobby: data.payload }));
      })
    );

    unsubscribers.push(
      wsService.on(WS_EVENTS.LOBBY_UPDATED, (data: any) => {
        console.log('🔵 LOBBY_UPDATED event received:', data);
        setState((prev) => ({ ...prev, lobby: data.payload }));
        const user = data.payload.users.find((u: any) => u.userId === wsService.socket?.id);
        if (user) {
          localStorage.setItem('rejoinToken', user.rejoinToken);
        }
      })
    );

    // Draft events - EXTRACT PAYLOAD
    unsubscribers.push(
      wsService.on(WS_EVENTS.DRAFT_STARTED, (data: any) => {
        console.log('🔵 DRAFT_STARTED event received:', data);
        setState((prev) => ({
          ...prev,
          draft: data.payload,
          timeRemaining: data.payload.timeRemaining,
        }));
      })
    );

    unsubscribers.push(
      wsService.on(WS_EVENTS.DRAFT_UPDATED, (data: any) => {
        console.log('🔵 DRAFT_UPDATED event received:', data);
        setState((prev) => ({
          ...prev,
          draft: data.payload,
        }));
      })
    );

    unsubscribers.push(
      wsService.on(WS_EVENTS.PICK_MADE, (data: any) => {
        console.log('🔵 PICK_MADE event received:', data);
        // Pick is already in draft state, just trigger re-render
        setState((prev) => ({ ...prev }));
      })
    );

    unsubscribers.push(
      wsService.on(WS_EVENTS.TIMER_TICK, (data: any) => {
        setState((prev) => ({
          ...prev,
          timeRemaining: data.payload.timeRemaining,
        }));
      })
    );

    unsubscribers.push(
      wsService.on(WS_EVENTS.DRAFT_COMPLETED, (data: any) => {
        console.log('🔵 DRAFT_COMPLETED event received:', data);
        setState((prev) => ({ ...prev, draft: data.payload }));
      })
    );

    // ═══════════════════════════════════════════════════════════════════════
    // 🆕 FIX: TRADE_EXECUTED handler - sync draft state from league
    // ═══════════════════════════════════════════════════════════════════════
    unsubscribers.push(
      wsService.on(WS_EVENTS.TRADE_EXECUTED, (data: any) => {
        console.log('🔵 TRADE_EXECUTED event received:', data);
        const updatedLeague = data.payload as LeagueState;
        
        // Update both league AND draft state (draft contains team rosters)
        setState((prev) => ({
          ...prev,
          league: updatedLeague,
          // 🆕 CRITICAL: Sync draft state from league.draftState
          draft: updatedLeague.draftState || prev.draft,
        }));
        console.log('✅ Trade executed - draft and league state synced');
      })
    );

    // ═══════════════════════════════════════════════════════════════════════
    // 🆕 FIX: LEAGUE_UPDATED - also sync draft state from league.draftState
    // ═══════════════════════════════════════════════════════════════════════
    unsubscribers.push(
      wsService.on(WS_EVENTS.LEAGUE_UPDATED, (data: any) => {
        console.log('🔵 LEAGUE_UPDATED event received:', data);
        const updatedLeague = data.payload as LeagueState;
        
        setState((prev) => ({
          ...prev,
          league: updatedLeague,
          // 🆕 CRITICAL: Keep draft in sync with league.draftState
          // This ensures trades and other updates reflect correctly
          draft: updatedLeague.draftState || prev.draft,
        }));
      })
    );

    unsubscribers.push(
      wsService.on(WS_EVENTS.REGULAR_SEASON_STARTED, (data: any) => {
        console.log('🔵 REGULAR_SEASON_STARTED event received:', data);
        setState((prev) => ({ ...prev, regularSeasonResults: data.payload }));
      })
    );

    unsubscribers.push(
      wsService.on(WS_EVENTS.PLAYOFFS_STARTED, (data: any) => {
        console.log('🔵 PLAYOFFS_STARTED event received:', data);
        setState((prev) => ({ ...prev, playoffResults: data.payload }));
      })
    );

    // ═══════════════════════════════════════════════════════════════════════
    // Round-based events for coaching windows
    // ═══════════════════════════════════════════════════════════════════════
    unsubscribers.push(
      wsService.on(WS_EVENTS.ROUND_STARTED, (data: any) => {
        console.log('🔵 ROUND_STARTED event received:', data);
        const { roundNumber, matchups, roundState } = data.payload;

        setState((prev) => ({
          ...prev,
          league: prev.league ? {
            ...prev.league,
            currentRound: roundNumber,
            roundState: roundState,
          } : null,
        }));
      })
    );

    unsubscribers.push(
      wsService.on(WS_EVENTS.GAME_SCOUTING_REPORT, (data: any) => {
        console.log('🔵 GAME_SCOUTING_REPORT event received:', data);
        const { scoutingReport } = data.payload;

        setState((prev) => ({
          ...prev,
          scoutingReports: {
            ...prev.scoutingReports,
            [scoutingReport.matchup.matchupId]: scoutingReport,
          },
        }));
      })
    );

    unsubscribers.push(
      wsService.on(WS_EVENTS.ROUND_SIMULATED, (data: any) => {
        console.log('🔵 ROUND_SIMULATED event received:', data);
        const roundResults = data.payload.roundResults;

        setState((prev) => ({
          ...prev,
          league: prev.league && prev.league.roundState ? {
            ...prev.league,
            roundState: {
              ...prev.league.roundState,
              phase: 'results',
              roundResults: roundResults,
            },
          } : prev.league,
        }));
      })
    );

    unsubscribers.push(
      wsService.on(WS_EVENTS.ROUND_COMPLETED, (data: any) => {
        console.log('🔵 ROUND_COMPLETED event received:', data);
        setState((prev) => ({
          ...prev,
          league: prev.league ? {
            ...prev.league,
            roundState: data.payload,
          } : null,
        }));
      })
    );

    // ═══════════════════════════════════════════════════════════════════════
    // 🆕 FIX: LEAGUE_COMPLETED handler
    // ═══════════════════════════════════════════════════════════════════════
    unsubscribers.push(
      wsService.on(WS_EVENTS.LEAGUE_COMPLETED, (data: any) => {
        console.log('🔵 LEAGUE_COMPLETED event received:', data);
        const updatedLeague = data.payload as LeagueState;
        setState((prev) => ({
          ...prev,
          league: updatedLeague,
          draft: updatedLeague.draftState || prev.draft,
        }));
      })
    );

    // Error events - EXTRACT PAYLOAD
    unsubscribers.push(
      wsService.on(WS_EVENTS.ERROR, (data: any) => {
        console.log('🔴 ERROR event received:', data);
        setState((prev) => ({ ...prev, error: data.payload.message }));
      })
    );

    // Cleanup on unmount
    return () => {
      unsubscribers.forEach((unsub) => unsub());
      wsService.disconnect();
    };
  }, []);

  // Fetch players on mount
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/players`)
      .then((res) => res.json())
      .then((data) => {
        setState((prev) => ({ ...prev, allPlayers: data.players }));
      })
      .catch((error) => {
        setState((prev) => ({ ...prev, error: error.message }));
      })
  }, []);

  const clearError = () => {
    setState((prev) => ({ ...prev, error: null }));
  };

  return (
    <AppContext.Provider value={{ ...state, clearError }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
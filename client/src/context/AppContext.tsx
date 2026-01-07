/**
 * App Context
 * Manages global app state from WebSocket events
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  LobbyState,
  DraftState,
  LeagueState,
  Player,
  RegularSeasonResults,
  PlayoffResults,
} from '@nba-draft-sim/shared';
import { WS_EVENTS } from '@nba-draft-sim/shared';
import { wsService } from '../services/websocket';

interface AppState {
  // Connection
  isConnected: boolean;

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
    allPlayers: [],
    lobby: null,
    draft: null,
    timeRemaining: null,
    league: null,
    regularSeasonResults: null,
    playoffResults: null,
    error: null,
  });

  useEffect(() => {
    // Connect to WebSocket
    wsService.connect().catch((error) => {
      setState((prev) => ({ ...prev, error: error.message }));
    });

    // Subscribe to events
    const unsubscribers: Array<() => void> = [];

    // Connection events
    unsubscribers.push(
      wsService.on(WS_EVENTS.CONNECT, () => {
        setState((prev) => ({ ...prev, isConnected: true }));
      })
    );

    unsubscribers.push(
      wsService.on(WS_EVENTS.DISCONNECT, () => {
        setState((prev) => ({ ...prev, isConnected: false }));
      })
    );

    // Lobby events
    unsubscribers.push(
      wsService.on(WS_EVENTS.LOBBY_CREATED, (payload: LobbyState) => {
        setState((prev) => ({ ...prev, lobby: payload }));
      })
    );

    unsubscribers.push(
      wsService.on(WS_EVENTS.LOBBY_UPDATED, (payload: LobbyState) => {
        setState((prev) => ({ ...prev, lobby: payload }));
      })
    );

    // Draft events
    unsubscribers.push(
      wsService.on(WS_EVENTS.DRAFT_STARTED, (payload: DraftState) => {
        setState((prev) => ({
          ...prev,
          draft: payload,
          timeRemaining: payload.timeRemaining,
        }));
      })
    );

    unsubscribers.push(
      wsService.on(WS_EVENTS.DRAFT_UPDATED, (payload: DraftState) => {
        setState((prev) => ({
          ...prev,
          draft: payload,
        }));
      })
    );

    unsubscribers.push(
      wsService.on(WS_EVENTS.PICK_MADE, (payload: DraftPick) => {
        // Pick is already in draft state, just trigger re-render
        setState((prev) => ({ ...prev }));
      })
    );

    unsubscribers.push(
      wsService.on(WS_EVENTS.TIMER_TICK, (payload: { timeRemaining: number }) => {
        setState((prev) => ({
          ...prev,
          timeRemaining: payload.timeRemaining,
        }));
      })
    );

    unsubscribers.push(
      wsService.on(WS_EVENTS.DRAFT_COMPLETED, (payload: DraftState) => {
        setState((prev) => ({ ...prev, draft: payload }));
      })
    );

    // League events
    unsubscribers.push(
      wsService.on(WS_EVENTS.LEAGUE_UPDATED, (payload: LeagueState) => {
        setState((prev) => ({ ...prev, league: payload }));
      })
    );

    unsubscribers.push(
      wsService.on(WS_EVENTS.REGULAR_SEASON_STARTED, (payload: RegularSeasonResults) => {
        setState((prev) => ({ ...prev, regularSeasonResults: payload }));
      })
    );

    unsubscribers.push(
      wsService.on(WS_EVENTS.PLAYOFFS_STARTED, (payload: PlayoffResults) => {
        setState((prev) => ({ ...prev, playoffResults: payload }));
      })
    );

    // Error events
    unsubscribers.push(
      wsService.on(WS_EVENTS.ERROR, (payload: { message: string }) => {
        setState((prev) => ({ ...prev, error: payload.message }));
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
    fetch('/api/players')
      .then((res) => res.json())
      .then((data) => {
        setState((prev) => ({ ...prev, allPlayers: data.players }));
      })
      .catch((error) => {
        setState((prev) => ({ ...prev, error: error.message }));
      });
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

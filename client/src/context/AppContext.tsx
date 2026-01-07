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
import { useNavigate } from 'react-router-dom';
import { WS_EVENTS } from '@nba-draft-sim/shared';
import { wsService } from '../services/websocket';
import { DraftPick } from '@nba-draft-sim/shared';

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
  isLoading: boolean;
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
  const navigate = useNavigate();
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
    isLoading: true, // Add isLoading state
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

    // Lobby events - EXTRACT PAYLOAD
    unsubscribers.push(
      wsService.on(WS_EVENTS.LOBBY_CREATED, (data: any) => {
        console.log('🔵 LOBBY_CREATED event received:', data);
        setState((prev) => ({ ...prev, lobby: data.payload }));
        const user = data.payload.users.find((u: any) => u.userId === wsService.socket?.id);
        if (user) {
          localStorage.setItem('rejoinToken', user.rejoinToken);
        }
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
        navigate('/draft');
      })
    );

    unsubscribers.push(
        wsService.on('rejoin:success', (data: any) => {
            console.log('🔵 REJOIN_SUCCESS event received:', data);
            setState((prev) => ({
                ...prev,
                draft: data.payload,
                timeRemaining: data.payload.timeRemaining,
            }));
            navigate('/draft');
        })
    );

    unsubscribers.push(
        wsService.on('rejoin:failure', (data: any) => {
            console.log('🔴 REJOIN_FAILURE event received:', data);
            localStorage.removeItem('rejoinToken');
            setState((prev) => ({ ...prev, error: data.payload.message }));
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

    // League events - EXTRACT PAYLOAD
    unsubscribers.push(
      wsService.on(WS_EVENTS.LEAGUE_UPDATED, (data: any) => {
        console.log('🔵 LEAGUE_UPDATED event received:', data);
        setState((prev) => ({ ...prev, league: data.payload }));
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
    fetch('/api/players')
      .then((res) => res.json())
      .then((data) => {
        setState((prev) => ({ ...prev, allPlayers: data.players }));
      })
      .catch((error) => {
        setState((prev) => ({ ...prev, error: error.message }));
      })
      .finally(() => {
        setState((prev) => ({ ...prev, isLoading: false }));
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
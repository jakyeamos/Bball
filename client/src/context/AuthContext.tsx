import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import supabase, { isSupabaseConfigured } from '../lib/supabaseClient';
import { getGuestUserId } from '../lib/userIdentity';

interface AuthState {
  session: Session | null;
  user: User | null;
  resolvedUserId: string | null;
  authMode: 'guest' | 'supabase';
  isLoading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  clearError: () => void;
  signOutUser: () => Promise<void>;
  isSupabaseConfigured: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

function guestFallbackState(): AuthState {
  return {
    session: null,
    user: null,
    resolvedUserId: getGuestUserId(),
    authMode: 'guest',
    isLoading: false,
    error: null,
  };
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>(() => ({
    session: null,
    user: null,
    resolvedUserId: null,
    authMode: isSupabaseConfigured ? 'supabase' : 'guest',
    isLoading: true,
    error: null,
  }));

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setState(guestFallbackState());
      return;
    }

    let didUnmount = false;

    async function bootstrapAuth() {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (sessionData.session) {
          if (!didUnmount) {
            setState({
              session: sessionData.session,
              user: sessionData.session.user,
              resolvedUserId: sessionData.session.user.id,
              authMode: 'supabase',
              isLoading: false,
              error: null,
            });
          }
          return;
        }

        const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();

        if (signInError) {
          throw signInError;
        }

        if (!didUnmount) {
          setState({
            session: signInData.session,
            user: signInData.user,
            resolvedUserId: signInData.user?.id ?? getGuestUserId(),
            authMode: signInData.user ? 'supabase' : 'guest',
            isLoading: false,
            error: null,
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown auth error';

        if (!didUnmount) {
          setState({
            ...guestFallbackState(),
            error: `Supabase unavailable, using local guest mode. ${message}`,
          });
        }
      }
    }

    bootstrapAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (didUnmount) return;

        if (session?.user) {
          setState({
            session,
            user: session.user,
            resolvedUserId: session.user.id,
            authMode: 'supabase',
            isLoading: false,
            error: null,
          });
          return;
        }

        setState(guestFallbackState());
      }
    );

    return () => {
      didUnmount = true;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      clearError: () => setState((prev) => ({ ...prev, error: null })),
      signOutUser: async () => {
        if (supabase) {
          await supabase.auth.signOut();
        }
        setState(guestFallbackState());
      },
      isSupabaseConfigured,
    }),
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }

  return ctx;
}

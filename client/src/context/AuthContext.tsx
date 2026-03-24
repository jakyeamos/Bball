/**
 * AuthContext — anonymous session bootstrap for Court Vision
 *
 * On first render:
 *   1. Calls getSession() to recover any existing Supabase session.
 *   2. If no session exists, calls signInAnonymously() once to create a
 *      durable anonymous user id persisted in localStorage.
 *   3. Attaches onAuthStateChange listener so any future sign-in or token
 *      refresh automatically updates context state.
 *
 * Guarantees:
 *   - The app never blocks indefinitely: isLoading transitions to false even
 *     when the sign-in call fails, exposing a recoverable error state.
 *   - session, user, isLoading, and error are always available to consumers.
 *
 * Usage:
 *   Wrap the root component tree with <AuthProvider> (done in index.tsx).
 *   Consume with useAuth() from anywhere in the component tree.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import supabase from '../lib/supabaseClient';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthState {
  /** Current Supabase session (null when unauthenticated or still loading). */
  session: Session | null;
  /** Convenience shortcut to session.user (null when no session). */
  user: User | null;
  /** True while the initial getSession / signInAnonymously call is in-flight. */
  isLoading: boolean;
  /** Non-null when the bootstrap failed. App renders a fallback but stays usable. */
  error: string | null;
}

interface AuthContextValue extends AuthState {
  /** Clear any transient auth error (e.g. after showing an error banner). */
  clearError: () => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let didUnmount = false;

    /**
     * Bootstrap sequence:
     *   1. Recover existing session from localStorage.
     *   2. If absent, create an anonymous session so every visitor has a
     *      stable Supabase user id from their very first page load.
     */
    async function bootstrapAuth() {
      try {
        console.log('[AuthContext] bootstrapping anonymous session...');

        // Step 1: Try to recover existing session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (sessionData.session) {
          // Existing session found — nothing to do
          console.log(
            '[AuthContext] existing session recovered, user id:',
            sessionData.session.user.id
          );
          if (!didUnmount) {
            setState({
              session: sessionData.session,
              user: sessionData.session.user,
              isLoading: false,
              error: null,
            });
          }
          return;
        }

        // Step 2: No session — sign in anonymously
        console.log('[AuthContext] no existing session; signing in anonymously...');
        const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();

        if (signInError) {
          throw signInError;
        }

        console.log(
          '[AuthContext] anonymous sign-in success, user id:',
          signInData.user?.id ?? '(none)'
        );

        if (!didUnmount) {
          setState({
            session: signInData.session,
            user: signInData.user,
            isLoading: false,
            error: null,
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown auth error';
        console.error('[AuthContext] bootstrap failed:', message);

        // Do NOT block the app — expose the error and let the UI decide how to
        // surface it. isLoading MUST be false here so the app can render.
        if (!didUnmount) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: message,
          }));
        }
      }
    }

    bootstrapAuth();

    // ---------------------------------------------------------------------------
    // Auth state change listener
    // Keeps context in sync after token refreshes, sign-out, sign-in upgrades, etc.
    // ---------------------------------------------------------------------------
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (didUnmount) return;

        console.log('[AuthContext] onAuthStateChange:', event, 'user id:', session?.user.id ?? 'none');
        setState((prev) => ({
          ...prev,
          session,
          user: session?.user ?? null,
          // Only keep isLoading true if we haven't resolved yet
          isLoading: prev.isLoading ? false : prev.isLoading,
        }));
      }
    );

    return () => {
      didUnmount = true;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const clearError = () =>
    setState((prev) => ({ ...prev, error: null }));

  return (
    <AuthContext.Provider value={{ ...state, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/** Access the current auth state from any component inside AuthProvider. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}

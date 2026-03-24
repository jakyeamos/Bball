/**
 * client/src/lib/queryClient.ts
 * Phase 02-03: Singleton TanStack Query client for Court Vision.
 *
 * Configuration choices:
 *   - retry: 2  — retry transient network errors twice before surfacing to UI
 *   - retryDelay: exponential back-off capped at 30 s; formula matches TanStack
 *     default but is explicit here so it can be tuned centrally
 *   - staleTime: 60 s — lessons and progress data don't change mid-session;
 *     avoid redundant network round-trips while the user navigates
 *   - gcTime: 5 min — keep inactive query results in cache for in-session
 *     back-navigation without a refetch
 *   - refetchOnWindowFocus: true (TanStack default) — ensure fresh data when
 *     user switches tabs, which is common during film-breakdown lessons
 */

import { QueryClient } from '@tanstack/react-query';

const RETRY_COUNT = 2;
const RETRY_DELAY_MAX_MS = 30_000;

function computeRetryDelay(attempt: number): number {
  // Exponential back-off: 1 s, 2 s, 4 s … capped at 30 s
  return Math.min(1_000 * 2 ** attempt, RETRY_DELAY_MAX_MS);
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: RETRY_COUNT,
      retryDelay: computeRetryDelay,
      staleTime: 60_000,       // 60 seconds
      gcTime: 5 * 60_000,      // 5 minutes
    },
    mutations: {
      retry: 0, // Mutations are not retried by default — avoid double-submits
    },
  },
});

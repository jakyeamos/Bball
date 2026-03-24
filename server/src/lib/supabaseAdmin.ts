/**
 * Supabase Admin Client (server-only)
 *
 * Uses the service-role key which bypasses Row Level Security.
 * This module MUST only be imported by server-side code.
 * The service-role key must never appear in client bundles or log output.
 *
 * Required env vars (must be set in .env):
 *   SUPABASE_URL              — project URL from Supabase dashboard
 *   SUPABASE_SERVICE_ROLE_KEY — service-role key (keep secret)
 *
 * Call validateSupabaseAdminEnv() during server startup to fail fast when
 * either variable is missing.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Env validation
// ---------------------------------------------------------------------------

/**
 * Validates required Supabase server env vars and throws a descriptive error
 * when either is missing.  Call this once inside startServer() before any
 * Supabase operations.
 *
 * The service-role key value is intentionally never logged — only the
 * variable name is mentioned so secrets never appear in console output.
 */
export function validateSupabaseAdminEnv(): void {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

  if (!SUPABASE_URL) {
    throw new Error(
      '[supabaseAdmin] Missing required env var: SUPABASE_URL\n' +
        'Add it to your .env file. See .env.example for reference.'
    );
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      '[supabaseAdmin] Missing required env var: SUPABASE_SERVICE_ROLE_KEY\n' +
        'Add it to your .env file. See .env.example for reference.'
    );
  }
}

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------

let _supabaseAdmin: SupabaseClient | null = null;

/**
 * Returns the singleton service-role Supabase client.
 *
 * Lazy-initialised on first call so the module can be imported before env
 * vars are confirmed present (validateSupabaseAdminEnv() enforces presence
 * at startup, not at import time).
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (_supabaseAdmin) {
    return _supabaseAdmin;
  }

  const url = process.env.SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  _supabaseAdmin = createClient(url, serviceRoleKey, {
    auth: {
      // Service-role client does not manage user sessions
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _supabaseAdmin;
}

/**
 * Convenience re-export for code that wants to import the client directly.
 * This is a function call rather than a top-level constant so it only runs
 * after the module is imported (post env validation in startServer).
 */
export default getSupabaseAdmin;

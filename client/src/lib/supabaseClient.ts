/**
 * Supabase Browser Client
 *
 * Singleton browser client for Court Vision.
 * Validates required env vars at import time so missing config fails fast
 * rather than producing silent runtime 401s.
 *
 * Required env vars (must be set in .env):
 *   VITE_SUPABASE_URL      — project URL from Supabase dashboard
 *   VITE_SUPABASE_ANON_KEY — public anon key (safe to expose in browser bundles)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Singleton Supabase browser client.
 * Import and use this throughout the client — do not call createClient elsewhere.
 */
const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export default supabase;

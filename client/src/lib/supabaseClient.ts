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

if (!supabaseUrl) {
  throw new Error(
    '[supabaseClient] Missing required env var: VITE_SUPABASE_URL\n' +
      'Add it to your .env file. See .env.example for reference.'
  );
}

if (!supabaseAnonKey) {
  throw new Error(
    '[supabaseClient] Missing required env var: VITE_SUPABASE_ANON_KEY\n' +
      'Add it to your .env file. See .env.example for reference.'
  );
}

/**
 * Singleton Supabase browser client.
 * Import and use this throughout the client — do not call createClient elsewhere.
 */
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persist session in localStorage so anonymous users keep their identity
    // across page reloads and browser restarts.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export default supabase;

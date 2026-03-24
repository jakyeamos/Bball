---
phase: 02-infrastructure-supabase-and-auth
plan: 01
subsystem: auth
tags: [supabase, anonymous-auth, react-context, typescript, vite, express]

# Dependency graph
requires:
  - phase: 01-foundation-and-bug-fixes
    provides: Monorepo structure with client (Vite/React) and server (Express/TypeScript) workspaces ready to extend

provides:
  - Typed Supabase browser client singleton with fail-fast env validation (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
  - Anonymous session bootstrap via AuthContext: getSession -> signInAnonymously on first load with localStorage persistence
  - onAuthStateChange listener with cleanup for future sign-in upgrades
  - Server-side Supabase admin client (service-role) with startup env validation and no secret leakage
  - Full env contract documented in .env.example for both client and server scopes

affects:
  - 02-02 (schema migrations via supabaseAdmin)
  - 02-03 (RLS policies referencing auth.uid() from anonymous sessions)
  - 04-01 (lesson progress storage tied to anonymous user id)
  - all phases requiring Supabase access

# Tech tracking
tech-stack:
  added:
    - "@supabase/supabase-js ^2.100.0 (client workspace)"
    - "@supabase/supabase-js ^2.100.0 (server workspace)"
  patterns:
    - "Singleton browser client created once in supabaseClient.ts; imported everywhere in client"
    - "Lazy-init server admin client in supabaseAdmin.ts; validateSupabaseAdminEnv() called at startup"
    - "AuthProvider wraps root in index.tsx; useAuth() hook for consumption"
    - "Bootstrap sequence: getSession() -> signInAnonymously() when no session; isLoading never blocks app on failure"

key-files:
  created:
    - client/src/lib/supabaseClient.ts
    - client/src/context/AuthContext.tsx
    - server/src/lib/supabaseAdmin.ts
  modified:
    - client/src/index.tsx
    - server/index.ts
    - client/package.json
    - server/package.json
    - .env.example

key-decisions:
  - "supabaseClient.ts validates env at import time (throws on missing vars) so silent 401s are impossible"
  - "AuthContext bootstrap never blocks app: isLoading -> false on error, exposing recoverable error state"
  - "supabaseAdmin uses lazy init (not top-level const) so module can be imported before env is validated"
  - "validateSupabaseAdminEnv() never logs SUPABASE_SERVICE_ROLE_KEY value — only the variable name"
  - "Anonymous sessions use persistSession:true so user id survives reloads without any sign-in UI"

patterns-established:
  - "Singleton pattern: one Supabase client per runtime (browser/server), imported not re-created"
  - "Fail-fast env validation: throw descriptive errors at startup rather than silent runtime failures"
  - "Non-blocking auth context: error state exposed, isLoading always resolves, app never hung"
  - "Server startup validation sequence: env check runs before any data fetching begins"

requirements-completed: []

# Metrics
duration: 4min
completed: 2026-03-24
---

# Phase 2 Plan 1: Supabase Client Setup and Anonymous Auth Bootstrap Summary

**@supabase/supabase-js wired in both workspaces with anonymous-session bootstrap on first load, fail-fast env validation, and service-role admin client for server-side Phase 2 operations**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-24T20:16:27Z
- **Completed:** 2026-03-24T20:20:31Z
- **Tasks:** 3 of 3
- **Files modified:** 8

## Accomplishments

- Supabase browser client singleton (`supabaseClient.ts`) validates `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` at import time, throwing descriptive errors rather than producing silent 401s
- `AuthContext` runs `getSession()` on first load, falls back to `signInAnonymously()` when no session exists, and attaches `onAuthStateChange` for future token refreshes and sign-in upgrades — anonymous user id persists across reloads via localStorage
- Server admin client (`supabaseAdmin.ts`) uses service-role key with lazy init; `validateSupabaseAdminEnv()` is called as step 1 of `startServer()` and never logs the secret value

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Supabase dependencies and explicit env contract** - `2538164` (chore)
2. **Task 2: Create client auth bootstrap with anonymous sign-in on first load** - `0d12f02` (feat)
3. **Task 3: Add server-side Supabase admin client and startup validation hooks** - `4969a3c` (feat)

**Plan metadata:** (docs commit — below)

## Files Created/Modified

- `client/src/lib/supabaseClient.ts` - Typed Supabase browser client singleton with env validation
- `client/src/context/AuthContext.tsx` - Anonymous session bootstrap, auth state exposure, loading/error boundaries
- `client/src/index.tsx` - Root wrapped with AuthProvider for app-wide session access
- `server/src/lib/supabaseAdmin.ts` - Service-role Supabase admin client with lazy init and startup validation helper
- `server/index.ts` - validateSupabaseAdminEnv() called at step 1 of startServer(); step numbering renumbered
- `client/package.json` - @supabase/supabase-js ^2.100.0 added
- `server/package.json` - @supabase/supabase-js ^2.100.0 added
- `.env.example` - VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (client), SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (server) with scope comments

## Decisions Made

- `supabaseClient.ts` validates at import time rather than lazily — a missing var is a developer error that should surface immediately on `npm run dev`, not on first API call
- `AuthContext` bootstrap does not block the app on failure: `isLoading` always becomes `false` even if `signInAnonymously()` rejects, so the UI can render a graceful fallback
- `supabaseAdmin.ts` uses a lazy-init factory (`getSupabaseAdmin()`) so the module can be safely imported before `dotenv.config()` sets env vars — only the explicit `validateSupabaseAdminEnv()` call enforces presence
- `SUPABASE_SERVICE_ROLE_KEY` value is never logged; only the variable name is referenced in error messages

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration before this code can run.**

Environment variables must be populated before starting either workspace:

1. Create a Supabase project at https://supabase.com
2. From Project Settings > API, copy:
   - Project URL
   - Anon/public key
   - Service-role key (keep secret)
3. Add to `.env` (copy `.env.example` as starting point):
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
4. In Supabase dashboard, enable **Anonymous sign-ins**:
   Authentication > Providers > Anonymous

**Verification:** Run `npm run dev` (client); browser console should log `[AuthContext] anonymous sign-in success, user id: <uuid>`.

## Known Stubs

None — all three artifacts are fully wired. Auth bootstrap runs live against Supabase once env vars are configured.

## Next Phase Readiness

- `getSupabaseAdmin()` is exported and ready for Phase 2 Plans 2-3 (schema migrations, RLS policies)
- Anonymous user id (`session.user.id`) is available via `useAuth()` for Phase 4 progress tracking
- Blocker from STATE.md still applies: RLS behavior for anonymous vs unauthenticated users requires an empirical three-session test before Phase 4 begins

---
*Phase: 02-infrastructure-supabase-and-auth*
*Completed: 2026-03-24*

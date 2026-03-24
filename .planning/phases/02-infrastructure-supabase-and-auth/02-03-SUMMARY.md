---
phase: 02-infrastructure-supabase-and-auth
plan: 03
subsystem: api-contracts-and-client-data
tags: [tanstack-query, validation, zod-pattern, typescript, express, react, shared-schemas]

# Dependency graph
requires:
  - phase: 02-infrastructure-supabase-and-auth (02-01)
    provides: Supabase client/admin setup and AuthContext
  - phase: 02-infrastructure-supabase-and-auth (02-02)
    provides: lesson_progress / offseason_runs tables and shared/schemas.ts ValidationResult pattern

provides:
  - shared/schemas.ts: LessonRecord, ProgressWritePayload, OffseasonRunPayload schemas with safeParse() API
  - server/src/middleware/validateBody.ts: reusable Express RequestHandler that validates req.body against any Schema<T>
  - server/src/routes/lessons.ts: GET /api/lessons (role_lens filter) and GET /api/lessons/:id with schema-validated responses
  - server/src/routes/progress.ts: POST /api/progress with validateBody middleware; in-memory store placeholder for Phase 4
  - client/src/lib/queryClient.ts: singleton QueryClient with retry/back-off/stale-time defaults
  - client/src/features/learning/queries.ts: useLessons(), useLesson(), useWriteProgress() TanStack Query hooks
  - client/src/pages/LessonPage.tsx: lesson detail page with loading/error/completion states

affects:
  - 04-01 (lesson components build on top of useLessons/useLesson hooks from this plan)
  - 04-02 (progress writes use useWriteProgress — mutation invalidation keys already established)
  - 05-01 (daily challenge could use the same validateBody middleware pattern)
  - 09-01 (offseasonRunSchema in shared/schemas.ts is ready for the offseason run creation endpoint)

# Tech tracking
tech-stack:
  added:
    - "@tanstack/react-query@^5 (client)"
    - "@tanstack/react-query-devtools@^5 (client, dev-only)"
  patterns:
    - "safeParse() adapter on every schema object — same call-site API as Zod without adding a runtime dep to shared"
    - "validateBody(schema) middleware: wraps safeParse, emits { error, issues } 400 on failure, attaches result.data to res.locals.validatedBody"
    - "learningKeys query key factory in queries.ts — centralised key shapes prevent string-literal drift across the codebase"
    - "useMutation onSuccess invalidates both lesson-detail and lesson-list keys — cache stays consistent after any progress write"
    - "ReactQueryDevtools conditionally mounted via import.meta.env.DEV — tree-shaken from production bundle automatically"

key-files:
  created:
    - server/src/middleware/validateBody.ts
    - server/src/routes/lessons.ts
    - server/src/routes/progress.ts
    - client/src/lib/queryClient.ts
    - client/src/features/learning/queries.ts
    - client/src/pages/LessonPage.tsx
  modified:
    - shared/schemas.ts
    - shared/index.ts (already exports schemas; no change needed)
    - client/src/services/api.ts
    - client/src/pages/HomePage.tsx
    - client/src/index.tsx
    - server/index.ts

key-decisions:
  - "safeParse() API on manual validators (not Zod) — preserves shared package dependency-free constraint established in 02-02 while matching the call-site pattern the plan specified"
  - "validateBody middleware returns path-extracted { path, message } issues array — field name extracted from leading word of error string so callers can map to form fields"
  - "In-memory progressStore in progress route — Supabase upsert is Phase 4; placeholder avoids blocking TanStack Query wiring now"
  - "LessonPage 'Mark Complete' button disabled after first success — prevents double-submit without a separate confirmation state"
  - "useLessons() wired in HomePage with graceful empty fallback — lesson lanes still render static copy when API is unavailable"

# Metrics
duration: 6min
completed: 2026-03-24
---

# Phase 2 Plan 3: Shared Schema Contracts and TanStack Query Summary

**Dependency-free safeParse schemas for lesson/progress/offseason payloads, server validateBody middleware, and TanStack Query v5 hooks replacing ad-hoc fetch state across the learning layer**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-24T20:30:02Z
- **Completed:** 2026-03-24T20:36:07Z
- **Tasks:** 3 of 3
- **Files modified:** 10

## Accomplishments

- `shared/schemas.ts` extended with `LessonRecord`, `ProgressWritePayload`, `OffseasonRunPayload` interfaces and validators; each exposes `safeParse(body): ValidationResult<T>` via a `makeSchema()` factory — no Zod/yup dependency added to the shared package
- `server/src/middleware/validateBody.ts` provides a reusable `validateBody(schema)` Express RequestHandler; malformed payloads return HTTP 400 with structured `{ error, issues[] }` before handler runs
- `server/src/routes/lessons.ts`: `GET /api/lessons` (optional `role_lens` filter) and `GET /api/lessons/:id`; responses validated against `lessonRecordSchema` — data integrity errors surface as 500 with clear message
- `server/src/routes/progress.ts`: `POST /api/progress` uses `validateBody(progressWriteSchema)`; in-memory store for Phase 2 infrastructure testing
- TanStack Query v5 installed in client; singleton `QueryClient` with retry=2, exponential back-off, staleTime=60s, gcTime=5min; `QueryClientProvider` wraps app root; devtools mounted only in DEV
- `client/src/features/learning/queries.ts`: `useLessons()`, `useLesson()`, `useWriteProgress()` hooks with centralised `learningKeys` factory; mutation invalidates both detail and list caches on success
- `client/src/pages/LessonPage.tsx`: full detail page with loading/404/error handling and Mark Complete button wired to `useWriteProgress`
- `HomePage.tsx` queries all lessons and renders per-lens preview lists; gracefully falls back to static copy when API returns empty or errors

## Task Commits

1. **Task 1: Shared schema contracts and server validation middleware** - `aa773c8` (feat)
2. **Task 2: Install and configure TanStack Query client** - `b8dff9d` (feat)
3. **Task 3: Migrate learning-layer calls to query/mutation hooks** - `4033813` (feat)

## Files Created/Modified

**Created:**
- `server/src/middleware/validateBody.ts` - Reusable Express body validation middleware
- `server/src/routes/lessons.ts` - Lesson list and detail endpoints
- `server/src/routes/progress.ts` - Progress write endpoint with validateBody middleware
- `client/src/lib/queryClient.ts` - Singleton QueryClient with production-appropriate defaults
- `client/src/features/learning/queries.ts` - useLessons / useLesson / useWriteProgress hooks
- `client/src/pages/LessonPage.tsx` - Lesson detail page

**Modified:**
- `shared/schemas.ts` - Added LessonRecord, ProgressWritePayload, OffseasonRunPayload schemas with safeParse API
- `client/src/services/api.ts` - Added getLessons / getLesson / writeProgress adapters; introduced ApiError class
- `client/src/pages/HomePage.tsx` - Integrated useLessons() for per-lens lesson previews
- `client/src/index.tsx` - Wrapped root with QueryClientProvider + ReactQueryDevtools
- `server/index.ts` - Mounted /api/lessons and /api/progress routes

## Decisions Made

- **safeParse not Zod in shared** — The plan specified "Zod contracts" and `safeParse` pattern, but Phase 02-02 established that shared must be dependency-free. Resolution: implemented a `safeParse(body): ValidationResult<T>` API using the existing manual-guard pattern. Server and client call `schema.safeParse(body)` identically to Zod — same interface, no runtime dep.
- **validateBody middleware uses path extraction** — Zod provides structured `.path[]` on issues; manual validators produce flat strings. The middleware extracts the leading word (field name) from each error string to produce `{ path, message }` objects. This is consistent enough for form field mapping in Phase 4 components.
- **In-memory progress store** — Writing to `lesson_progress` table requires Supabase auth JWT extraction (Phase 4 concern). Placeholder store lets TanStack Query mutation wiring be tested now without blocking on auth middleware.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Scope Notes

- Pre-existing TypeScript errors in `StandingsTable.tsx`, `PlayoffResultsPage.tsx`, `RegularSeasonPage.tsx`, `RoundResultsPage.tsx` were present before this plan. They are out of scope (unrelated to learning-layer changes) and were not modified.

## Known Stubs

- **`server/src/routes/progress.ts` progressStore** — in-memory `Map` at line 38. Data does not survive server restarts. This is intentional for Phase 02-03 infrastructure testing; Phase 4 will replace with `supabase.from('lesson_progress').upsert()`.
- **`server/src/routes/lessons.ts` SEED_LESSONS** — static array at line 31. Phase 4 replaces with a Supabase query against the `lessons` table once the content admin layer is built.

Both stubs are explicitly documented as placeholders and do not prevent the plan's goal (API contract validation + TanStack Query wiring) from being achieved.

## Self-Check: PASSED

- [x] Shared schemas compile and export cleanly (`tsc --noEmit` passes on shared package)
- [x] Invalid requests return structured 400 validation responses (validateBody middleware + progress/lessons routes)
- [x] Query client is active in root app provider stack (QueryClientProvider in index.tsx)
- [x] Learning read/write flows run through TanStack Query hooks (useLessons/useLesson in HomePage+LessonPage; useWriteProgress in LessonPage)
- [x] INFRA-05 and INFRA-06 complete: API boundary validation and client async state are standardized
- [x] Phase 2 is fully complete and ready for dependent Phases 4 and 5

---
*Phase: 02-infrastructure-supabase-and-auth*
*Completed: 2026-03-24*

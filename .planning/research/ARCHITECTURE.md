# Architecture Patterns

**Domain:** Learning platform + offseason simulator integrated into existing real-time multiplayer NBA draft sim monorepo
**Researched:** 2026-03-09
**Confidence:** HIGH (existing codebase read directly; Supabase and BallDontLie from official docs)

---

## Existing System Snapshot (What We Are Extending)

The current monorepo is a three-package npm workspace:

```
nba-draft-sim/            ← npm workspace root
  shared/                 ← @nba-draft-sim/shared — TypeScript types + WS_EVENTS const
  server/                 ← Express 4 + Socket.io 4, all state in process memory
  client/                 ← React 18 SPA, Vite, Tailwind CSS
```

**Current data flow:** All truth lives server-side in `Map` objects (`lobbies`, `drafts`, `leagueStore`). The client is a dumb subscriber — it receives WebSocket events and renders. No database. No auth beyond ephemeral cookie sessions.

**Current state machine:** `draft → draft_recap → regular_season → playoffs → complete`, driven by `LeagueState.phase` on the server, mirrored to the client via `AppContext`.

---

## Recommended Architecture

### Overview

The expansion adds three parallel capability tracks alongside the existing draft sim, all sharing the same monorepo and Express server:

```
Court Vision Monorepo
├── shared/                   (extended — add lesson types, offseason sim types, Supabase user type)
├── server/
│   ├── services/             (existing draft sim engine — keep as-is after bug fixes)
│   ├── managers/             (existing — keep as-is)
│   ├── stores/               (existing in-memory + new Supabase client module)
│   ├── routes/               (extend — add REST routes for lessons, offseason sim, user profile)
│   └── data/                 (new — BallDontLie cache layer + static seed file)
├── client/src/
│   ├── context/
│   │   ├── AppContext.tsx    (existing — draft sim state, keep isolated)
│   │   └── LearningContext.tsx (new — lesson progress, user profile, daily challenge)
│   ├── features/
│   │   ├── team-composition/ (existing)
│   │   ├── lessons/          (new — lesson card, film player, pause-predict interaction)
│   │   ├── offseason-sim/    (new — 7-phase state machine, save/resume, BallDontLie data)
│   │   └── cms-admin/        (new — admin forms, lesson editing, scheduling)
│   └── services/
│       ├── websocket.ts      (existing — unchanged)
│       ├── api.ts            (existing — extend with lesson/profile REST calls)
│       └── supabase.ts       (new — Supabase client, auth, anon sign-in)
└── supabase/                 (new — migrations, seed SQL, RLS policies)
```

### Design Principle: Orthogonal Concerns, Single Server

The learning platform and offseason sim are **REST-based**, not WebSocket-based. The existing draft sim is **WebSocket-only**. These two paradigms coexist on the same Express server without coupling:

- Draft sim: Socket.io events, in-memory state, real-time sync
- Learning platform: REST endpoints, Supabase persistence, request/response
- Offseason sim: REST endpoints + Supabase persistence for save/resume; no real-time requirement

This means the new features do not touch `socketManager.ts`, `handlers.ts`, `handlers-v2.ts`, or the simulation engine services. The integration surface is narrow.

---

## Component Boundaries

### Component 1: Supabase Client Module (`server/stores/supabaseClient.ts`)

**Responsibility:** Single import point for the Supabase admin client on the server. Used by REST route handlers to read/write lesson content, user progress, offseason sim saves, and daily challenge state.

**Boundary:** Only this module knows the `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` env vars. All other server code imports from this module, never from `@supabase/supabase-js` directly.

**Does NOT touch:** Socket.io, in-memory stores, draft sim engine.

**Communicates with:** `server/routes/lessons.ts`, `server/routes/offseasonSim.ts`, `server/routes/userProfile.ts`, `server/routes/admin.ts`.

---

### Component 2: BallDontLie Data Layer (`server/data/`)

**Responsibility:** Fetch and cache real NBA team, player, and season stats data from the BallDontLie API. Serve this data to the offseason sim routes. The free tier allows only 5 requests/minute, so caching is mandatory.

**Structure:**
```
server/data/
  ballDontLieClient.ts     ← typed API wrapper around @balldontlie/sdk
  nbaDataCache.ts          ← writes JSON to disk at server/data/cache/; TTL-based refresh
  staticSeed.ts            ← imports server/data/seed/nba-seed.json (coaches, curated picks data)
  nba-seed.json            ← static seed file: coaches (not in BallDontLie), draft picks context
```

**Boundary:** Offseason sim routes call `nbaDataCache.getTeamRoster(teamId)`, etc. Nothing outside this directory speaks directly to the BallDontLie API.

**Coach data gap:** BallDontLie does not provide coach data. Coach profiles must come entirely from `nba-seed.json`, which is author-maintained. This is a known constraint (MEDIUM confidence — verified against official docs).

**Communicates with:** `server/routes/offseasonSim.ts`, `server/services/offseasonSimEngine.ts`.

---

### Component 3: Offseason Sim Engine (`server/services/offseasonSimEngine.ts`)

**Responsibility:** Pure computation for the 7-phase offseason simulation. Accepts phase inputs (team selection, coaching hires, trade decisions, draft picks, free agency) and returns phase outputs (grades, fit reports, recommendations). Stateless — the Express route layer handles persistence.

**Phases handled:**
1. Team context — accepts teamId, returns roster + pick inventory + needs assessment
2. Coaching market — accepts coach selections, returns adjusted player valuations
3. Scouting / pre-draft — accepts board configuration, returns uncertainty-weighted prospect grades
4. Trade market — accepts trade proposals, returns fit-based analysis
5. Draft night — delegates picks to existing `simulateMatchup` / Monte Carlo engine logic where applicable, adds teaching overlays
6. Free agency — accepts signing decisions against simplified cap constraints
7. Post-offseason recap — returns team grade, fit report, developmental environment score

**Boundary:** Does not own state. Does not call Supabase or BallDontLie directly. Receives pre-fetched data from route handlers. Returns serializable result objects.

**Reuses existing engine:** Phase 5 (draft night) can call existing `aggregateTeam()` and `computeArchetypeProfile()` from `server/services/aggregation.ts` and `server/services/archetypes.ts`. These are already pure functions — no modification needed.

**Communicates with:** `server/routes/offseasonSim.ts` (data in), shared types (types).

---

### Component 4: REST Routes (`server/routes/`)

New route files added alongside existing `lobbies.ts`:

```
server/routes/
  lobbies.ts              ← existing, unchanged
  lessons.ts              ← GET /api/lessons, GET /api/lessons/:id, GET /api/lessons/:id/answer-key
  lessonProgress.ts       ← GET/POST /api/progress (user's lesson completion + accuracy)
  offseasonSim.ts         ← GET/POST /api/offseason/* (phase transitions, save, resume)
  userProfile.ts          ← GET/PUT /api/profile (skill profile, streaks, badges)
  dailyChallenge.ts       ← GET /api/daily-challenge, POST /api/daily-challenge/submit
  admin.ts                ← POST/PUT /api/admin/* (lesson CRUD, answer-key config, scheduling)
```

**Auth middleware:** A new `server/middleware/supabaseAuth.ts` verifies the Supabase JWT from the `Authorization` header. For anonymous users, it reads the Supabase anon session token. All protected routes run this middleware. Admin routes additionally check a `role` claim in the JWT.

**Draft sim routes are untouched.** Only `GET /api/lobbies` exists currently and stays that way.

**Communicates with:** `supabaseClient.ts`, `offseasonSimEngine.ts`, `nbaDataCache.ts`.

---

### Component 5: Learning System (`client/src/features/lessons/`)

**Responsibility:** Lesson card rendering, film breakdown pages, pause-and-predict interaction, scenario simulations.

**Sub-components:**
```
features/lessons/
  LessonCard.tsx           ← title, role lens badge, difficulty, format icon, completion state
  LessonPage.tsx           ← full lesson layout: media + annotation + interaction + takeaway
  FilmPlayer.tsx           ← YouTube IFrame API wrapper; exposes pauseAt(seconds) imperatively
  PauseAndPredict.tsx      ← receives a cue point; pauses FilmPlayer; renders question + answer reveal
  ScenarioSimulation.tsx   ← process-based question flow with role-lens scoring
  LessonProgress.tsx       ← tracks completion, accuracy per lesson; syncs to Supabase or localStorage
```

**YouTube IFrame API pattern:** `FilmPlayer.tsx` loads the IFrame API script once via a singleton loader, creates a `YT.Player` instance on mount, and exposes a ref with `pauseAt(seconds)` and `seekTo(seconds)`. `PauseAndPredict.tsx` calls `pauseAt()` via the ref at a configured cue point, shows the interaction UI, then calls `seekTo(seconds + 1)` on reveal. This matches the established IFrame API pattern (`seekTo`, `pauseVideo`, `playVideo` calls on the player object).

**Communicates with:** `LearningContext.tsx` (progress state), `client/src/services/api.ts` (lesson fetch).

---

### Component 6: Offseason Sim UI (`client/src/features/offseason-sim/`)

**Responsibility:** 7-phase wizard UI for the offseason simulator. Manages phase navigation, displays BallDontLie-sourced team data, and handles save/resume.

**Sub-components:**
```
features/offseason-sim/
  OffseasonSimProvider.tsx    ← context + save/resume logic; calls POST /api/offseason/save
  PhaseRouter.tsx             ← renders correct phase component based on current phase
  phases/
    TeamContextPhase.tsx
    CoachingMarketPhase.tsx
    ScoutingPhase.tsx
    TradeMarketPhase.tsx
    DraftNightPhase.tsx       ← reuses existing PlayerCard, MatchupCard components
    FreeAgencyPhase.tsx
    RecapPhase.tsx
```

**Save/resume:** `OffseasonSimProvider` serializes the current phase index + all phase decisions to `POST /api/offseason/save` after each phase transition. On load, `GET /api/offseason/resume` returns the last saved run for the authenticated user. This is pure REST — no WebSocket involvement.

**Communicates with:** `client/src/services/api.ts` (phase API calls), `LearningContext.tsx` (user identity for save key).

---

### Component 7: CMS Admin Layer (`client/src/features/cms-admin/`)

**Responsibility:** Admin-only interface for creating/editing lessons, configuring answer keys, tagging content, and scheduling daily challenges.

**Access control:** A route-level guard checks the Supabase session for an `admin` role claim before rendering any admin page. The guard is purely client-side for UX; the server-side admin routes enforce the same check independently.

**Not a separate app.** The admin UI lives inside the existing React SPA behind a `/admin` route prefix. It is excluded from the public navigation. This avoids build complexity.

**Communicates with:** `client/src/services/api.ts` (admin REST endpoints).

---

### Component 8: LearningContext (`client/src/context/LearningContext.tsx`)

**Responsibility:** Global client state for the learning platform — user identity (anon or authenticated), lesson progress, streak, daily challenge state, skill profile.

**Explicitly separate from `AppContext`**: `AppContext` owns draft sim WebSocket state. `LearningContext` owns everything else. They do not share state. `App.tsx` wraps the entire tree in both providers.

**Anonymous-first pattern:**
1. On first page load, `LearningContext` calls `supabase.auth.signInAnonymously()` if no session exists.
2. Progress is written to Supabase under the anonymous user's UUID.
3. A localStorage mirror of progress is maintained as a fallback and for instant reads before Supabase responds.
4. When a user creates an account (`supabase.auth.updateUser({ email, password })`), the same UUID is preserved — all prior progress automatically persists under the new authenticated account.
5. If localStorage and Supabase diverge (e.g., after clearing storage), Supabase is the authoritative source.

**Communicates with:** `client/src/services/supabase.ts` (auth), `client/src/services/api.ts` (progress REST calls).

---

## Data Flow

### Lesson Progress Flow

```
User completes lesson interaction
  → PauseAndPredict / ScenarioSimulation records result locally
  → LearningContext.recordProgress(lessonId, result)
    → writes to localStorage immediately (optimistic, fast)
    → POST /api/progress with Supabase JWT in Authorization header
      → server verifies JWT via supabaseClient
      → INSERT/UPDATE lesson_progress row (user_id, lesson_id, score, completed_at)
      → returns updated skill profile
    → LearningContext updates skill profile in React state
```

### Offseason Sim State Flow

```
User selects team (Phase 1)
  → POST /api/offseason/start { teamId, userId }
    → server fetches roster from nbaDataCache (BallDontLie or disk cache)
    → offseasonSimEngine.initRun(teamId, rosterData)
    → saves initial SimRun row to Supabase
    → returns phase 1 data (roster, picks, needs)
  → OffseasonSimProvider stores phase 1 state in React

User makes phase decision (Phase 2–6)
  → POST /api/offseason/phase { runId, phase, decisions }
    → offseasonSimEngine.processPhase(phase, decisions, existingRunData)
    → updates SimRun.phase_state JSONB column in Supabase
    → returns phase output (grades, next phase prompt)
  → OffseasonSimProvider advances PhaseRouter
  → Each phase saves immediately — user can close browser and resume

User resumes
  → GET /api/offseason/resume
    → SELECT latest SimRun for user_id WHERE status = 'in_progress'
    → returns { currentPhase, phaseDecisions, phaseOutputs }
  → OffseasonSimProvider restores state, PhaseRouter renders correct phase
```

### Draft Sim (Unchanged) Flow

```
Existing WebSocket flow — unchanged
  Socket.io events → socketManager → handlers/managers → in-memory stores → WS emit
  AppContext receives events → renders draft UI
```

### BallDontLie Data Flow

```
Server startup (or first offseason sim request)
  → nbaDataCache.warmUp()
    → checks server/data/cache/*.json for fresh files (TTL: 24 hours)
    → if stale: GET https://api.balldontlie.io/v1/teams (free tier: 5 req/min)
    → writes JSON to disk
  → staticSeed.ts merges coach data from nba-seed.json

Offseason sim route handler
  → nbaDataCache.getTeamRoster(teamId) → reads from disk cache
  → staticSeed.getCoachesForTeam(teamId) → reads from in-memory seed object
  → offseasonSimEngine receives merged data object
```

**Rate limit constraint:** At 5 requests/minute on the free tier, the cache warm-up for all 30 teams across multiple endpoints takes ~6+ minutes on cold start. Cache warm-up must run on a background interval, not on the request path. The server starts serving requests from disk cache immediately; BallDontLie calls happen async in the background.

---

## How Supabase Replaces / Augments the Current In-Memory Store

### What Supabase Takes Over

| Current (in-memory) | Supabase Replacement | Notes |
|---------------------|---------------------|-------|
| `SessionStore` (cookie identity) | `supabase.auth` (anonymous → authenticated) | Supabase JWT replaces ephemeral cookie for learning platform identity |
| None (no lesson persistence) | `lesson_progress` table | New — user completion, accuracy, timestamps |
| None (no offseason saves) | `offseason_runs` table | New — JSONB `phase_state` column stores full run |
| None (no content storage) | `lessons` table | New — lesson metadata, media URLs, tags |
| None (no daily challenge state) | `daily_challenges` + `daily_submissions` tables | New |

### What Stays In-Memory

The draft sim's `lobbies`, `drafts`, `leagueStore` Maps **remain in-memory**. The existing session cookie system (`SESSION_COOKIE_NAME`) also stays for draft sim identity. These two identity systems run side by side:

- Draft sim: existing cookie-based ephemeral session (no Supabase)
- Learning platform + offseason sim: Supabase JWT (anonymous or authenticated)

A single user might have both: a cookie session for an active draft lobby AND a Supabase anon session for their lesson progress. This is intentional — decoupling means each system fails independently.

### Supabase Schema (Core Tables)

```sql
-- Users managed by Supabase Auth (auth.users) — no custom users table needed

-- Lesson content (admin-managed)
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  role_lens TEXT CHECK (role_lens IN ('player', 'coach', 'gm')) NOT NULL,
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')) NOT NULL,
  format TEXT CHECK (format IN ('film', 'scenario', 'article', 'mixed')) NOT NULL,
  media_url TEXT,           -- YouTube URL for film lessons
  content JSONB NOT NULL,   -- lesson body, annotations, interaction config
  answer_key JSONB,         -- correct answers + explanations
  tags TEXT[],
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User lesson progress
CREATE TABLE lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES lessons(id),
  completed BOOLEAN DEFAULT false,
  score NUMERIC(5,2),       -- 0–100 accuracy
  attempts INTEGER DEFAULT 1,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, lesson_id)
);

-- Offseason simulator runs
CREATE TABLE offseason_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id INTEGER NOT NULL,  -- BallDontLie team ID
  current_phase INTEGER DEFAULT 1,
  phase_state JSONB NOT NULL DEFAULT '{}',   -- all phase decisions + outputs
  status TEXT CHECK (status IN ('in_progress', 'completed', 'abandoned')) DEFAULT 'in_progress',
  started_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Daily challenge
CREATE TABLE daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  lesson_id UUID REFERENCES lessons(id),
  role_lens TEXT NOT NULL,
  published_at TIMESTAMPTZ
);

CREATE TABLE daily_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES daily_challenges(id),
  score NUMERIC(5,2),
  submitted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, challenge_id)
);
```

**RLS policies:** Each table gets a policy `USING (auth.uid() = user_id)` for SELECT, INSERT, UPDATE. The `lessons` and `daily_challenges` tables have a SELECT policy for all authenticated users (including anon), restricted INSERT/UPDATE to admin role via service role key on the server.

---

## How the Offseason Sim Data Layer Sits Alongside the Draft Sim Engine

The two simulation engines are deliberately isolated:

```
Draft Sim Engine                    Offseason Sim Engine
────────────────────────────────    ──────────────────────────────────
Monte Carlo matchup simulation      Phase-based decision processing
server/services/simulation.ts       server/services/offseasonSimEngine.ts
In-memory state (LeagueState)       Supabase persistence (offseason_runs)
WebSocket-driven                    REST-driven
allPlayers from LeagueSnapshot      Real roster from BallDontLie cache
Fictional player pool               Real NBA names + stats
```

**Shared computation:** Phase 5 (draft night) in the offseason sim reuses `aggregateTeam()` and `computeArchetypeProfile()` from the existing engine. These are already pure functions that accept typed inputs and return typed outputs — no side effects. The offseason sim calls them with real player stat data mapped to the existing `PlayerFeatures` type. This is the only integration point between the two engines.

**Separate player universes:** The existing draft sim uses a fictional player pool derived from the `LeagueSnapshot` (seeded from NBA stats but abstracted). The offseason sim uses real NBA player names and team associations from BallDontLie. These two universes do not mix — the offseason sim never touches `leagueSnapshot`, and the draft sim never touches the BallDontLie cache.

---

## Suggested Build Order

The dependencies between components dictate a clear build order. Each group can only start after the prior group's blocking items are complete.

### Group 1: Prerequisites (Unblock Everything Else)

These must complete first because later components depend on their contracts.

1. **Fix `handleSimulateRoundInternal` coaching bug** — the existing sim correctness bug must be fixed before any teaching layer is built on top of it. Adding a teaching layer to a broken sim embeds the bug into user-facing explanations.

2. **Extend `shared/types.ts`** — add types for `Lesson`, `LessonProgress`, `OffseasonRun`, `SimPhase`, `BallDontLiePlayer`. Both server and client need these before any feature work starts.

3. **Supabase project initialization + schema migrations** — create the Supabase project, run the schema SQL above, configure RLS policies, enable anonymous auth. Without this, no persistence is possible.

4. **`server/stores/supabaseClient.ts`** — the single Supabase admin client module. Required by all new REST routes.

5. **`client/src/services/supabase.ts`** — Supabase browser client + `signInAnonymously()` initialization. Required by `LearningContext`.

6. **`LearningContext.tsx` (auth + identity only)** — just the anonymous sign-in and session management, no lesson logic yet. Establishes the user identity that all later features depend on.

### Group 2: Content Foundation

These can proceed in parallel once Group 1 is complete.

7. **BallDontLie cache layer** (`server/data/`) — warm-up script, disk cache, static seed for coaches. Required by offseason sim routes.

8. **Lesson REST routes + Supabase reads** (`server/routes/lessons.ts`, `server/routes/lessonProgress.ts`) — CRUD without admin yet (read-only from seed data).

9. **Lesson UI components** (`features/lessons/LessonCard.tsx`, `LessonPage.tsx`) — no film or interactions yet; renders lesson metadata from the API.

10. **CMS admin route + UI (basic)** — lesson creation form, enough to seed 15–20 launch lessons without touching SQL directly.

### Group 3: Learning Interactions

11. **YouTube `FilmPlayer.tsx` + `PauseAndPredict.tsx`** — depends on lesson content existing (Group 2 step 9–10).

12. **`ScenarioSimulation.tsx`** — depends on lesson content and answer key structure being established.

13. **Progress tracking wired end-to-end** — `LessonProgress` → `POST /api/progress` → Supabase. Depends on auth (Group 1 step 6) and lesson routes (Group 2 step 8).

### Group 4: Offseason Sim

14. **`offseasonSimEngine.ts` (phases 1–3)** — team context, coaching market, scouting. Can start once BallDontLie cache exists (Group 2 step 7) and shared types are defined (Group 1 step 2).

15. **Offseason sim REST routes** (`server/routes/offseasonSim.ts`) — depends on engine (step 14) and Supabase client (Group 1 step 4).

16. **`OffseasonSimProvider` + `PhaseRouter` + phase UIs (phases 1–3)** — depends on routes (step 15).

17. **Offseason sim phases 4–7 (trade, draft, free agency, recap)** — Phase 5 (draft night) reuses existing engine components. These extend the engine and UIs from steps 14–16.

### Group 5: Engagement Features

18. **Daily challenge system** — depends on lesson content (Group 2) and progress tracking (Group 3 step 13).

19. **Streak tracking + badges** — depends on daily challenge (step 18) and progress tracking.

20. **Friend leaderboard (daily challenge scope)** — depends on daily challenge and Supabase user records.

### Group 6: Polish

21. **Rebrand to Court Vision** — design tokens, Tailwind theme, new nav. Can technically start earlier but last to avoid rework if lesson/sim UI evolves.

22. **Post-draft teaching layer** — contextual tips during existing draft sim. Depends on lesson content established in Group 2 (for tip content) and coaching bug fixed in Group 1.

---

## Integration Points with Existing Code

| Existing File | How New Code Integrates | Risk Level |
|---------------|------------------------|------------|
| `server/index.ts` | Add BallDontLie cache warm-up on startup (background, non-blocking); mount new route files | LOW — additive |
| `server/managers/socketManager.ts` | No changes needed | NONE |
| `server/services/simulation.ts` | Fix coaching bug in `handleSimulateRoundInternal`; no structural changes | LOW — contained fix |
| `server/services/aggregation.ts` | Offseason sim phase 5 calls `aggregateTeam()` as-is | NONE — pure function |
| `server/services/archetypes.ts` | Offseason sim calls `computeArchetypeProfile()` as-is | NONE — pure function |
| `shared/types.ts` | Add new types for lessons, offseason sim, Supabase user; do not modify existing types | LOW — additive |
| `client/src/App.tsx` | Add `<LearningContext.Provider>` wrapper; add new top-level routes (`/learn`, `/offseason`, `/admin`) | LOW — additive |
| `client/src/context/AppContext.tsx` | No changes — draft sim context stays isolated | NONE |
| `client/src/services/api.ts` | Add new fetch helpers for lesson/progress/offseason REST calls | LOW — additive |

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Mixing WebSocket State with Learning State in AppContext

**What:** Adding `lessons`, `progress`, `offseasonRun` fields to the existing `AppContext` state object.

**Why bad:** `AppContext` is rebuilt on every WebSocket event. The entire lesson/progress tree would re-render on every draft pick, timer tick, or coaching submission. Lesson state and draft state have completely different lifecycles and should not share a provider.

**Instead:** Keep `LearningContext` fully separate. `App.tsx` wraps the tree in both providers independently.

---

### Anti-Pattern 2: Calling BallDontLie API on the Client

**What:** Putting the BallDontLie API key in the React client and calling the API directly from the browser.

**Why bad:** Exposes the API key. Also, the free tier's 5 req/min limit would be consumed by individual user browsers rather than shared across a server cache. Immediate exhaustion with any real user count.

**Instead:** All BallDontLie calls go through the server's cache layer. The client calls `GET /api/offseason/teams` which returns pre-cached data.

---

### Anti-Pattern 3: Using the Supabase Service Role Key on the Client

**What:** Importing `SUPABASE_SERVICE_ROLE_KEY` in the React client bundle.

**Why bad:** The service role key bypasses all Row Level Security — anyone who extracts it from the JS bundle can read or modify any row in the database.

**Instead:** The service role key is server-only, in `server/stores/supabaseClient.ts`, never in the client bundle. The client uses the anon key (`SUPABASE_ANON_KEY`) and the JWT from `signInAnonymously()`. RLS enforces access control at the database level.

---

### Anti-Pattern 4: Persisting Offseason Sim State Only in React (No Save/Resume)

**What:** Keeping all 7 phases in React context without persisting to Supabase after each phase.

**Why bad:** An offseason run spanning multiple sessions (required per PROJECT.md) would be lost on page refresh, tab close, or browser crash. This was explicitly identified as infrastructure, not a feature.

**Instead:** `OffseasonSimProvider` persists to Supabase after every phase transition. Each phase completion triggers a `PUT /api/offseason/:runId` that updates the `phase_state` JSONB column. Resume is a `GET /api/offseason/resume` on load.

---

### Anti-Pattern 5: Replacing the Existing Cookie Session with Supabase Everywhere

**What:** Migrating the draft sim's `SessionStore` and cookie identity to Supabase auth as part of the learning platform expansion.

**Why bad:** The existing draft sim works today. Migrating its session system would require touching `socketManager.ts`, `sessionManager.ts`, the lobby creation flow, and all the reconnection logic — a high-risk change that could break real-time multiplayer for no user-facing learning benefit.

**Instead:** Run two identity systems in parallel. The learning platform uses Supabase auth. The draft sim uses existing cookies. If unification is ever needed, it is a dedicated phase, not an incidental change.

---

## Scalability Considerations

| Concern | Current | With Expansion | Mitigation |
|---------|---------|---------------|------------|
| In-memory draft sim | 1 server process | Unchanged | Still single-process; acceptable for v1 |
| BallDontLie rate limit (5 req/min) | N/A | Blocks cold cache rebuild | Disk cache + background warm-up; never on request path |
| Offseason sim compute | N/A | Phase 5 Monte Carlo (100 sims) per pick | Runs server-side, acceptable for async REST; consider worker threads if latency is felt |
| Supabase RLS at scale | N/A | Each row has `user_id` predicate | Standard pattern; Postgres handles well at v1 scale |
| Anonymous Supabase users accumulating | N/A | `auth.users` grows without account creation | Supabase provides anonymous user cleanup after configurable inactivity period |
| `coachingTimerManager` timer leaks | Existing per-lobby intervals | Unchanged | Existing concern; does not worsen with expansion |

---

## Sources

- Existing codebase read directly: `server/`, `client/`, `shared/` (HIGH confidence)
- [Supabase Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous) — anonymous auth, upgrade to account, user ID persistence (HIGH confidence)
- [BallDontLie API Documentation](https://docs.balldontlie.io) — endpoints, rate limits (5/min free tier), data fields, confirmed no coach data endpoint (HIGH confidence)
- [BallDontLie TypeScript SDK](https://github.com/balldontlie-api/typescript) — SDK structure and usage (MEDIUM confidence — GitHub README only)
- [YouTube IFrame Player API Reference](https://developers.google.com/youtube/iframe_api_reference) — `pauseVideo`, `seekTo`, `cueVideoById` API (HIGH confidence)
- [react-youtube npm](https://www.npmjs.com/package/react-youtube) — React IFrame API wrapper pattern (MEDIUM confidence)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — RLS policy patterns (HIGH confidence)
- [Supabase REST API with Express](https://medium.com/codex/rest-api-with-express-and-supabase-e8370a463d84) — Express + Supabase integration pattern (MEDIUM confidence)
- [Supabase User Sessions](https://supabase.com/docs/guides/auth/sessions) — JWT and session management (HIGH confidence)

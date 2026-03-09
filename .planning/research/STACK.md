# Technology Stack — Court Vision Expansion Layer

**Project:** Court Vision (NBA Draft Simulator monorepo expansion)
**Researched:** 2026-03-09
**Scope:** NEW stack additions only — learning platform layer, Supabase persistence, offseason simulator data layer. Do NOT re-implement existing React 18 / Express 4 / Socket.io 4 / TypeScript / Tailwind CSS stack.

---

## Existing Stack (Locked — Do Not Change)

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend framework | React | 18.2 |
| Routing | React Router DOM | 6.21 |
| Build tool | Vite | 7.3 |
| Styling | Tailwind CSS | 3.4 |
| Backend HTTP | Express | 4.18 |
| Real-time | Socket.io | 4.7 (server) / 4.6 (client) |
| TypeScript | strict mode | 5.2–5.3 |
| Package manager | npm workspaces | Node 20 |
| Monorepo | 3-package workspace (shared, client, server) | — |

---

## New Stack: Layer by Layer

### 1. Supabase — Persistence, Auth, and Daily Challenge Scheduling

**Install location:** `client` workspace (anon key, user-facing), `server` workspace (service-role key, admin operations)

```bash
# client workspace
npm install @supabase/supabase-js --workspace=client

# server workspace
npm install @supabase/supabase-js --workspace=server
```

**Version:** `@supabase/supabase-js` 2.98.0 (current as of 2026-03-09; actively maintained, published ~10 days prior)

**Do NOT install in `shared` workspace.** The shared package is pure TypeScript types + utils with zero runtime deps. Importing Supabase there would pollute both client and server build graphs unnecessarily.

**Two client instances — never share them:**

| Instance | Location | Key | Bypasses RLS? | Purpose |
|----------|---------|-----|--------------|---------|
| Browser client | `client/src/lib/supabase.ts` | `VITE_SUPABASE_ANON_KEY` | No | User auth, progress reads, leaderboard reads |
| Server admin client | `server/src/lib/supabaseAdmin.ts` | `SUPABASE_SERVICE_ROLE_KEY` | Yes | Lesson seeding, daily challenge scheduling, admin writes |

**Why two clients:** The service-role key bypasses Row-Level Security. It must never reach the browser. Express already holds server secrets (session keys, CORS config), so adding `SUPABASE_SERVICE_ROLE_KEY` to server `.env` is consistent with existing patterns. The browser client uses the anon key, which is safe to expose — RLS policies gate what it can access.

**Environment variables to add:**

```
# .env (server)
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# .env (client / Vercel)
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Note on API key migration (2025):** Supabase announced that new projects created after November 2025 no longer use the legacy `anon`/`service_role` key naming — they use "publishable" and "secret" keys respectively. Functionally identical; just use whatever the project dashboard provides.

---

### 2. Supabase Auth — Anonymous-First with Optional Upgrade

**Why Supabase anonymous auth instead of continuing with existing cookie sessions:**

The existing `sessionManager.ts` uses ephemeral cookie sessions (no database). That works for the draft sim, which is intentionally session-scoped. For the learning platform, progress must survive browser restarts, device switches, and eventually account creation — which requires a durable identity. Supabase `signInAnonymously()` is the right bridge: it creates a real JWT-authenticated user with no credentials required, stores the session in localStorage, and provides a first-class upgrade path.

**Anonymous sign-in pattern:**

```typescript
// client/src/lib/auth.ts
import { supabase } from './supabase'

export async function ensureSession() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    await supabase.auth.signInAnonymously()
  }
}
```

Call `ensureSession()` in the root `App.tsx` `useEffect` on first load. This is non-blocking and transparent to the user.

**Upgrade path (anonymous → permanent account):**

Supabase supports two upgrade methods — both require enabling "Manual Linking" in the Supabase dashboard:

1. **Email/password:** Call `supabase.auth.updateUser({ email })` → user verifies email → call `updateUser({ password })`. This is the recommended path for this platform.
2. **OAuth:** Call `supabase.auth.linkIdentity({ provider: 'google' })`.

The anonymous user's `user.id` (UUID) remains the same after upgrade — all progress rows stay linked. No data migration needed.

**localStorage and Supabase session storage:** By default, `@supabase/supabase-js` stores the session in `localStorage` under the key `sb-<project-ref>-auth-token`. This coexists with the existing `nba_draft_sim_session` cookie used by Express. No conflict — different storage mechanisms, different purposes.

**RLS note:** Anonymous users receive JWTs with `is_anonymous: true`. Write RLS policies that allow anonymous users to insert/update their own rows (using `auth.uid() = user_id`), but restrict admin-only tables to service-role or a custom `role` claim.

---

### 3. localStorage Schema — Anonymous Progress (Pre-Account)

**Strategy:** Store learning progress in localStorage as the primary source during the anonymous phase. When a Supabase anonymous session is created, sync localStorage → Supabase in the background. If the user later creates a real account, Supabase becomes the canonical store and localStorage is treated as a write-through cache.

**Why not Supabase-only from day one:** Network latency on every lesson interaction would hurt the feel of the learning UX. localStorage is synchronous and instant. The sync is a background concern.

**Proposed localStorage key schema:**

```typescript
// Key: "cv_progress_v1"
// Namespace with version prefix — enables clean migration if schema changes

interface LocalProgressStore {
  version: 1
  userId: string | null          // Supabase auth.uid() once session is established
  onboarding: {
    completed: boolean
    favoriteTeams: string[]      // NBA team abbreviations
    knowledgeLevel: 'casual' | 'intermediate' | 'advanced'
    goal: string
    completedAt: string | null   // ISO timestamp
  }
  lessons: {
    [lessonId: string]: {
      status: 'not_started' | 'in_progress' | 'completed'
      score: number | null       // 0–100, null if not scored
      attempts: number
      lastAttemptAt: string      // ISO timestamp
    }
  }
  dailyChallenges: {
    [dateKey: string]: {         // dateKey: "2026-03-09"
      completed: boolean
      score: number | null
      streakDay: number
    }
  }
  badges: string[]               // badge IDs earned
  streak: {
    current: number
    longest: number
    lastActivityDate: string     // ISO date
  }
}
```

**Key design decisions:**
- Version prefix in the key (`cv_progress_v1`) allows schema migration without data loss — bump the version, migrate on read.
- `userId` field enables a sync check: if `localStorage.userId !== supabase.auth.uid()`, the user has a session but progress hasn't been linked — trigger a one-time upsert.
- All timestamps are ISO strings — consistent with Supabase `timestamptz` columns.
- Keep the schema flat and small. Do not store full lesson content or player data in localStorage — only completion/score state.

---

### 4. Data Fetching — TanStack Query v5

```bash
npm install @tanstack/react-query --workspace=client
npm install @tanstack/react-query-devtools --workspace=client
```

**Version:** `@tanstack/react-query` 5.90.21 (current as of 2026-03-09)

**Why TanStack Query and not SWR:**

The learning platform has complex server-state requirements that SWR handles poorly at scale: lesson lists with filters (by lens, difficulty, format), individual lesson fetches, leaderboard queries, and offseason sim state that persists across re-renders. TanStack Query v5's cache invalidation model, devtools, and mutation lifecycle hooks are material advantages for this complexity. SWR's simpler API would require hand-rolling the same patterns.

**Why not extend the existing AppContext pattern (single useState):** The current `AppContext` is correct for WebSocket-driven game state, where all updates are server-pushed and the state is a single flat object. Learning platform state is REST/Supabase-driven, paginated, and multi-entity — a fundamentally different fetch pattern that warrants a dedicated layer. Do not collapse these.

**Setup:** Wrap the React root in `QueryClientProvider` alongside the existing `AppProvider`. The two contexts do not conflict.

```typescript
// client/src/index.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes — lessons don't change frequently
      retry: 2,
    },
  },
})
```

**Supabase + TanStack Query pattern:** Use query functions that call Supabase directly from the client (for user-facing reads) rather than routing through Express. This avoids adding a REST proxy layer to Express for every Supabase table — Express already does WebSocket orchestration for the game; let Supabase handle its own data transport.

```typescript
// Example query
const { data: lessons } = useQuery({
  queryKey: ['lessons', { lens: 'coach', difficulty: 'beginner' }],
  queryFn: () => supabase
    .from('lessons')
    .select('*')
    .eq('lens', 'coach')
    .eq('difficulty', 'beginner')
    .then(({ data, error }) => {
      if (error) throw error
      return data
    }),
})
```

---

### 5. YouTube IFrame API — Pause-and-Predict Interactions

**Do NOT use `react-youtube` (tjallingt).** The package is on version 10.1.0, last published 3 years ago, and has a single maintainer. It has known React 18 compatibility issues and is functionally abandoned.

**Use `@u-wave/react-youtube` instead.**

```bash
npm install @u-wave/react-youtube --workspace=client
```

**Version:** 1.x (actively maintained as of late 2025, last updated ~4 months before research date)

**Why this package:** It wraps the YouTube IFrame API directly, exposes the full `YT.Player` instance via a ref, and its API more closely mirrors the underlying IFrame API than alternatives. For pause-and-predict, you need direct player control: `player.seekTo(timestamp)`, `player.pauseVideo()`, `player.getPlayerState()`. This package makes those available without fighting abstraction layers.

**Pause-and-predict interaction pattern:**

The IFrame API supports all required operations natively:
- `seekTo(seconds, allowSeekAhead)` — jump to a timestamp
- `pauseVideo()` — programmatic pause
- `onStateChange` — detect when user manually plays past a pause point
- `getCurrentTime()` — check position for grading

```typescript
// Conceptual pattern for a pause-and-predict component
const playerRef = useRef<YT.Player | null>(null)

// Pause at a defined timestamp when video plays past it
useEffect(() => {
  const interval = setInterval(() => {
    const player = playerRef.current
    if (player && player.getCurrentTime() >= pauseAtSeconds && !hasShownQuestion) {
      player.pauseVideo()
      setShowQuestion(true)
      setHasShownQuestion(true)
    }
  }, 500) // poll at 500ms — sufficient granularity, low CPU cost
  return () => clearInterval(interval)
}, [pauseAtSeconds, hasShownQuestion])
```

**Alternative if `@u-wave/react-youtube` creates issues:** Load the IFrame API script manually via a `useEffect` that appends the `<script src="https://www.youtube.com/iframe_api">` tag, then instantiate `new YT.Player()` directly. This is the zero-dependency path and gives full API access. More boilerplate but completely stable.

**Content policy note:** YouTube embeds require the video to be embeddable (channel allows it). For the initial 15–20 seed lessons, verify each video is embeddable before publishing. Store the YouTube video ID, not the full URL, in the CMS — IDs are stable, URL formats are not.

---

### 6. BallDontLie API — Real NBA Data

**Rate limits (confirmed from official documentation, 2026-03-09):**

| Tier | Rate Limit | Monthly Cost | Key Endpoints Unlocked |
|------|-----------|-------------|----------------------|
| Free | 5 req/min | $0 | Teams, Players |
| ALL-STAR | 60 req/min | $9.99 | + Game Stats, Injuries |
| GOAT | 600 req/min | $39.99 | + Season Averages, Advanced Stats |

**Recommendation: Start Free tier, plan to upgrade to ALL-STAR for season stat access.**

Season Averages require the GOAT tier ($39.99/mo). This is too expensive for v1 of the offseason simulator. Instead:

**Hybrid data strategy for the offseason simulator:**
1. **BallDontLie Free tier** — Fetch current player and team lists at build time / app startup. Cache in a static JSON file in `server/data/` (extend the existing `data/sample_players.json` pattern). Refresh the seed file manually or via a scheduled script each offseason.
2. **Static curated seed file** — Coach profiles, draft pick ownership, team timelines, and contract data. No public free API provides coach data; BallDontLie has no coaches endpoint. Curate manually once per season from Basketball-Reference and official NBA team pages.
3. **Existing Python scraper** — The existing `scripts/scrape_nba_stats.py` already fetches player data from `nba_api`. Extend it to also pull current rosters and save to `server/data/nba_offseason_seed.json`. Run seasonally.

**BallDontLie wrapper pattern (no external SDK needed):**

```typescript
// server/src/services/ballDontLieClient.ts
const BDL_BASE = 'https://api.balldontlie.io/v1'
const BDL_KEY = process.env.BALLDONTLIE_API_KEY

async function bdlFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BDL_BASE}${path}`)
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url.toString(), {
    headers: { Authorization: BDL_KEY! },
  })
  if (res.status === 429) throw new Error('BallDontLie rate limit hit')
  if (!res.ok) throw new Error(`BDL error: ${res.status}`)
  return res.json()
}
```

Do not install a BallDontLie npm wrapper library — none have the maturity to justify an extra dependency. Node 20's native `fetch` is sufficient.

**Cursor-based pagination:** BallDontLie uses cursor pagination (`cursor` param, max 100 per page). For seeding, paginate all players at startup and cache the full set. Do not call BallDontLie per user request in the offseason sim — the rate limit makes that unusable at even small traffic volumes.

---

### 7. Input Validation — Zod

```bash
npm install zod --workspace=server
npm install zod --workspace=client
```

**Version:** Zod 4.3.6 (stable, released July 2025; current as of 2026-03-09)

**Why now:** The existing codebase has zero input validation — handlers do ad-hoc field checks and throw free-text errors. Adding a learning platform with lesson submissions, onboarding forms, and offseason sim inputs without a validation layer creates a correctness and security gap. Zod is the TypeScript-native choice and aligns with the existing strict TypeScript posture.

**Why Zod 4 over Zod 3:** 14x faster string parsing, 7x faster array parsing. The existing simulation code does heavy computation — Zod 4 won't add meaningful overhead. The breaking changes from v3 to v4 are manageable since Zod isn't yet in the codebase.

**Integration pattern (Express routes):**

```typescript
// Generic middleware — add to server/src/middleware/validate.ts
import { ZodSchema } from 'zod'
import { Request, Response, NextFunction } from 'express'

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({ errors: result.error.flatten() })
    }
    req.body = result.data
    next()
  }
}
```

Use `safeParse` (not `parse`) everywhere — never throw from middleware, always return structured errors.

**Shared schemas:** Place Zod schemas for shared data shapes (lesson config, onboarding answers, daily challenge submission) in `shared/src/schemas.ts`. Both client (for form validation) and server (for API validation) can import from the shared workspace. The shared package currently emits CommonJS — Zod 4 supports both CJS and ESM, so no conflict.

---

### 8. CMS Strategy — Custom Admin Forms Over Headless CMS

**Decision: Build custom admin forms in the Express + React monorepo rather than adopting a headless CMS (Payload, Sanity, Strapi, etc.).**

**Why not Payload CMS v3:** Payload v3 is deeply Next.js-native. Adapting it to run alongside an existing Express 4 server would require running two Node processes or significant middleware bridging — both are architectural complexity that adds no value for a platform that is admin-light by nature. The Court Vision CMS needs are narrow: lesson creation, answer-key config, tagging, and daily challenge scheduling. That is a forms problem, not a CMS platform problem.

**Why not Sanity or Strapi:** External SaaS CMS adds a vendor dependency and per-seat cost for a free platform with a small admin team. The lesson schema is domain-specific (pause timestamps, role lenses, predict-answer pairs) — modeling this in a generic CMS requires as much custom work as building the forms directly.

**What to build:**

A lightweight admin section under a protected Express route (`/admin`) with React pages (new route prefix, same client SPA) and Supabase as the backing store. The admin client uses the service-role Supabase client via the Express backend (not directly from the browser) to avoid exposing the service key.

**Admin capabilities needed in v1:**
- Create/edit lessons (title, role lens, difficulty, embed ID, pause timestamps, questions, answers, takeaways, tags)
- Schedule daily challenges (select a lesson or question set, pick a date)
- View basic completion stats (count, average score per lesson)

**Auth for admin panel:** Add a `role` custom claim to the Supabase JWT (set via a Postgres function or Edge Function on specific user IDs). Express middleware checks `req.user.app_metadata.role === 'admin'` before serving admin API routes.

**Daily challenge scheduling:** Use Supabase's built-in `pg_cron` module (available on all Supabase projects) to run a daily job that promotes the next scheduled challenge to "active" status. No separate cron service needed. Schedule: `0 5 * * *` (5AM UTC daily — covers overnight for US audiences).

```sql
-- Supabase SQL: schedule daily challenge rotation
SELECT cron.schedule(
  'activate-daily-challenge',
  '0 5 * * *',
  $$
    UPDATE daily_challenges
    SET status = 'active'
    WHERE scheduled_date = CURRENT_DATE
      AND status = 'scheduled';
  $$
);
```

---

### 9. Offseason Simulator — Persistence Layer

**The existing in-memory state pattern is intentional for the draft sim and must be preserved.** Socket.io game state lives in `leagueStore.ts` (in-memory Maps) and that is correct for real-time multiplayer sessions with no durability requirement.

**The offseason sim is different.** It spans multiple sessions and requires save/resume — in-memory is a hard blocker. Use Supabase for persistence via the server admin client.

**Database table structure (conceptual, not prescriptive — finalize during phase implementation):**

```sql
-- Offseason sim runs
offseason_runs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id),
  team_id     text NOT NULL,           -- NBA team abbreviation
  season      text NOT NULL,           -- e.g. "2025-26"
  phase       text NOT NULL,           -- 'team_context' | 'coaching' | 'scouting' | ...
  state       jsonb NOT NULL,          -- serialized sim state
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
)
```

**State serialization:** Serialize the offseason sim state to JSON (JSONB column). The existing simulation engine already works with plain TypeScript objects — they are JSON-serializable. Do not introduce an ORM or separate serialization layer. Express endpoints handle the serialize/deserialize boundary.

**Upsert pattern on every phase transition:**

```typescript
await supabaseAdmin
  .from('offseason_runs')
  .upsert({ id: runId, user_id: userId, state: currentState, phase: currentPhase, updated_at: new Date().toISOString() })
```

**Anonymous users and offseason sim:** An anonymous Supabase user has a `user_id` — offseason runs can be keyed to anonymous users from day one. If the user later creates a real account, the `user_id` stays the same. No migration needed.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Auth / DB | Supabase | Firebase, PlanetScale + custom auth | Supabase integrates auth + Postgres + realtime in one service, matches TypeScript-first stack, generous free tier |
| Anonymous auth | `signInAnonymously()` | Continue cookie-only sessions | Cookies are ephemeral; Supabase anonymous auth gives a durable UUID and upgrade path |
| CMS | Custom admin forms | Payload CMS, Sanity | Payload v3 is Next.js-native (conflict); Sanity adds vendor cost and doesn't model domain types cleanly |
| Data fetching | TanStack Query v5 | SWR, extend AppContext | AppContext is WS-push state — wrong pattern for REST; TanStack Query handles complex cache/mutation requirements SWR can't |
| YouTube wrapper | `@u-wave/react-youtube` | `react-youtube` (tjallingt) | `react-youtube` is 3-year-old abandonware; u-wave fork is actively maintained |
| Validation | Zod 4 | Joi, Yup, express-validator | Zod has native TypeScript inference and shares schemas across client + server; Joi/Yup are JavaScript-first |
| BallDontLie SDK | None (native fetch) | `balldontlie` npm package | No wrapper library has sufficient maturity; Node 20 fetch handles this in ~20 lines |
| Daily scheduling | Supabase pg_cron | External cron (node-cron, Railway crons) | pg_cron is already in Supabase, zero extra infrastructure, runs at DB level with no network hop |

---

## What NOT to Use

| Technology | Reason to Avoid |
|-----------|----------------|
| Redux / Redux Toolkit | Overkill. AppContext handles WS state. TanStack Query handles server state. Adding Redux creates a third state layer with no gain. |
| Prisma or Drizzle ORM | Supabase client handles typed queries with generated types. An ORM adds a build step, a migration system in conflict with Supabase migrations, and complexity for no benefit given the JSONB-heavy offseason sim state pattern. |
| Next.js | The project is explicitly an Express + React SPA monorepo. Do not introduce Next.js for any part of this — it would create two incompatible server paradigms. |
| GraphQL | REST via Supabase's auto-generated API is sufficient. GraphQL adds a schema layer, a resolver layer, and a client library for data shapes that are simple table queries. |
| Storybook | No design system exists yet. Build the design token layer and component primitives first; Storybook is post-v1. |
| Supabase Realtime (for leaderboard) | Daily challenge leaderboard does not require real-time updates — it updates once per day when the challenge rotates. Poll on mount with TanStack Query and a 5-minute stale time. Real-time is not justified until the feature needs sub-minute updates. |

---

## Monorepo Installation Summary

```bash
# Supabase client — both workspaces
npm install @supabase/supabase-js --workspace=client
npm install @supabase/supabase-js --workspace=server

# Data fetching
npm install @tanstack/react-query --workspace=client
npm install @tanstack/react-query-devtools --workspace=client

# YouTube embed
npm install @u-wave/react-youtube --workspace=client

# Validation
npm install zod --workspace=server
npm install zod --workspace=client
```

No new dependencies are needed in the `shared` workspace. Zod schemas placed in `shared/src/schemas.ts` can use the same `zod` install from whichever workspace imports them (each workspace resolves its own `node_modules`). If type-sharing across workspaces causes resolution issues, declare `zod` as a `peerDependency` in `shared/package.json`.

---

## Environment Variable Changes

Add to `server/.env` (and server hosting environment — Railway/Render):

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
BALLDONTLIE_API_KEY=
```

Add to `client/.env` (and Vercel environment):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## Confidence Assessment

| Area | Confidence | Source | Notes |
|------|-----------|--------|-------|
| Supabase JS version (2.98.0) | HIGH | npm registry (10 days old at research date) | Actively maintained |
| Anonymous auth + upgrade path | HIGH | Official Supabase docs verified | `signInAnonymously` stable; manual linking requires dashboard toggle |
| BallDontLie rate limits (5/60/600 req/min) | HIGH | Official API site confirmed | No coaches endpoint confirmed |
| TanStack Query v5 version (5.90.21) | HIGH | npm registry | React 18 confirmed compatible |
| Zod v4 stable (4.3.6) | HIGH | npm + InfoQ confirmed July 2025 release | Breaking changes from v3 documented |
| `@u-wave/react-youtube` maintenance | MEDIUM | GitHub activity ~4 months ago | Actively maintained but small project; direct IFrame API is the zero-risk fallback |
| Supabase pg_cron for daily scheduling | HIGH | Official Supabase docs | Available on all project tiers |
| Coach data not available via BallDontLie | HIGH | Official API endpoint list reviewed | Static seed file is the only viable approach |
| Payload CMS incompatibility with Express | MEDIUM | Official Payload docs (Next.js-native v3) | Technically possible to run separately but adds operational complexity — not recommended |

---

## Sources

- [@supabase/supabase-js npm](https://www.npmjs.com/package/@supabase/supabase-js)
- [Supabase Anonymous Sign-Ins guide](https://supabase.com/docs/guides/auth/auth-anonymous)
- [Supabase Identity Linking](https://supabase.com/docs/guides/auth/auth-identity-linking)
- [Supabase pg_cron docs](https://supabase.com/docs/guides/database/extensions/pg_cron)
- [BallDontLie NBA API official site](https://nba.balldontlie.io/)
- [TanStack Query v5 installation](https://tanstack.com/query/v5/docs/react/installation)
- [@tanstack/react-query npm](https://www.npmjs.com/package/@tanstack/react-query)
- [YouTube IFrame Player API reference](https://developers.google.com/youtube/iframe_api_reference)
- [@u-wave/react-youtube GitHub](https://github.com/u-wave/react-youtube)
- [Zod v4 release notes](https://zod.dev/v4)
- [Zod v4 InfoQ announcement](https://www.infoq.com/news/2025/08/zod-v4-available/)
- [TanStack Query vs SWR 2025 — Refine](https://refine.dev/blog/react-query-vs-tanstack-query-vs-swr-2025/)
- [Payload CMS v3 Next.js-native announcement](https://payloadcms.com/posts/blog/payload-30-the-first-cms-that-installs-directly-into-any-nextjs-app)

---

*Stack research: 2026-03-09*

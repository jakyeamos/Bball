# Project Research Summary

**Project:** Court Vision — Basketball IQ Learning Platform + Offseason Simulator
**Domain:** Sports Education / Interactive Learning Platform (monorepo expansion)
**Researched:** 2026-03-09
**Confidence:** HIGH

## Executive Summary

Court Vision is a basketball IQ education platform being built as an expansion layer inside an existing NBA Draft Simulator monorepo. It adds three parallel capability tracks — a structured learning system (lessons with pause-and-predict film interactions), a daily engagement loop (challenges, streaks, shareable cards), and a GM-perspective offseason simulator — on top of an existing Express 4 + Socket.io + React 18 SPA. The recommended approach is to extend, not rebuild: keep the existing WebSocket-driven draft sim fully isolated, add a separate REST + Supabase persistence layer for the new platform, and run two identity systems in parallel (existing cookie sessions for the draft sim, Supabase anonymous auth for learning progress). This orthogonal design means new features cannot break the existing product and the two track can evolve independently.

The core product differentiation is the three-lens role framing (Player / Coach / GM IQ) — no competitor teaches basketball from all three perspectives — combined with pause-and-predict film interactions that apply the testing effect to fan learning. The offseason simulator (real NBA teams, real names, 7-phase decision loop) is the "capstone after you've learned" product, not the entry point. Research is emphatic: build and validate the lesson platform first, defer the offseason sim until content density is established. The lesson platform needs only 15–20 launch lessons to be viable; the sim requires BallDontLie data infrastructure, Supabase save/resume, and a functioning 7-phase engine — all of which are independent workstreams.

The critical risk is the existing simulation correctness bug: `handleSimulateRoundInternal` runs with stub team data, making all auto-sim results meaningless. Any teaching layer or offseason sim phase built before this is fixed will mislead users about whether decisions have consequences — destroying the platform's educational premise. This bug must be the first item addressed, before any learning content is built. Secondary risks are Supabase RLS configuration (silent failures for anonymous users are common and hard to diagnose) and YouTube embed availability (videos get removed by rights holders; lesson components need built-in fallback states). Both risks have clear prevention patterns documented in PITFALLS.md.

---

## Key Findings

### Recommended Stack

The stack adds four new packages to the existing monorepo without touching the locked core (React 18, Express 4, Socket.io 4, TypeScript 5, Tailwind CSS 3, Vite 7, npm workspaces). Supabase (`@supabase/supabase-js` 2.98.0) handles auth, persistence, and daily challenge scheduling via built-in `pg_cron`. TanStack Query v5 handles REST-based server state for the learning platform — AppContext's WebSocket push pattern is the wrong model for paginated lesson queries. `@u-wave/react-youtube` wraps the YouTube IFrame API for pause-and-predict interactions. Zod 4 (14x faster than v3) validates inputs across client and server, with shared schemas living in the `shared` workspace.

The CMS decision is critical: do not adopt Payload, Sanity, or Strapi. Build custom admin forms in the existing monorepo under a `/admin` route prefix. The lesson schema (pause timestamps, role lenses, predict-answer pairs, embeddability flags) is too domain-specific to model cleanly in a generic CMS, and Payload v3 is Next.js-native — incompatible with Express without significant bridging complexity. BallDontLie API is used at the free tier (5 req/min) for player/team identity only; all responses are disk-cached at server startup and never called on the request path. Coach data has no API source at any tier — it must be hand-curated in a `nba-seed.json` file and treated as editorial content.

**Core technologies:**
- `@supabase/supabase-js` 2.98.0: auth + Postgres persistence — anonymous-first with upgrade path; replaces nothing in draft sim
- `@tanstack/react-query` 5.90.21: REST server state for lessons/progress — avoids extending AppContext with incompatible fetch patterns
- `@u-wave/react-youtube` 1.x: YouTube IFrame API wrapper — actively maintained fork; `react-youtube` (tjallingt) is 3-year-old abandonware
- `zod` 4.3.6: input validation — shared schemas across client and server; Zod 4 performance eliminates overhead concern
- BallDontLie API (free tier): NBA player/team identity — disk-cached; never called live on request path
- Supabase `pg_cron`: daily challenge rotation — eliminates external cron service; runs at DB level

**What NOT to add:** Redux (AppContext + TanStack Query covers all state), Prisma/Drizzle ORM (Supabase client provides typed queries; JSONB offseason state doesn't benefit from ORM), Next.js (incompatible server paradigm), GraphQL (simple table queries don't justify the schema layer), Supabase Realtime for leaderboard (daily update frequency doesn't require real-time).

### Expected Features

The market benchmark analysis (HooperIQ, Duolingo, Hudl, Basketball GM, The Athletic) identifies clear table stakes and strong differentiators. The most important anti-feature insight: full gamification economies (XP accumulation, rank ladders) cause psychological fatigue in casual users. Court Vision should use only binary streaks (done/not done), light milestone badges, and no XP system.

**Must have at launch (15–20 lessons):**
- Lesson card system with three role lenses — core product definition; every lesson needs a lens assignment
- Film breakdown pages with timestamped YouTube embeds — sports education without video is abstract
- Pause-and-predict interactions — primary differentiator; prediction before reveal outperforms passive watching
- Searchable content library with lens/difficulty/format filters — makes 15–20 lessons feel organized
- Anonymous progress tracking via localStorage — zero-friction entry; forced registration kills top-of-funnel
- Daily challenge with streak tracking — 7-day streaks increase next-day return rate 2.4x (Duolingo data)
- Shareable daily challenge result cards — zero-cost acquisition loop; Wordle proved the model
- Onboarding: team preference + knowledge level + goal — routes users to relevant content immediately
- Admin CMS (custom forms) — without this, no content exists; must ship before first lesson is authored
- Homepage showing all three lenses simultaneously — no single-path lock-in

**Should have (shortly after launch):**
- User skill profile (requires 20+ lessons to be meaningful — empty early)
- Supabase auth + cross-device progress sync (optional account upgrade from anonymous)
- Teaching layer in existing draft simulator (existing asset, high leverage, low rebuild cost)
- Post-draft analysis (closes the existing sim's educational loop)

**Defer until post-PMF validation:**
- NBA Offseason Simulator (7-phase loop) — massive scope; validate lesson platform first
- Friend leaderboard — needs user base before it has value
- "What We Saw" NBA news-to-lesson recaps — editorial process dependency; build after content rhythm is proven
- Low-tech discussion board — needs content density before users have something to discuss

**Explicitly excluded (per PRD):** Native mobile apps, live game companion, multi-year franchise mode, user-generated content, creator economy, fantasy integrations.

### Architecture Approach

The architecture is deliberately orthogonal: the learning platform and offseason sim use REST endpoints and Supabase persistence; the existing draft sim uses WebSocket events and in-memory Maps. These two paradigms run on the same Express server with no coupling. The new features do not touch `socketManager.ts`, `handlers.ts`, `handlers-v2.ts`, or the existing simulation engine (except the coaching bug fix and the shared `aggregateTeam()`/`computeArchetypeProfile()` pure functions reused by the offseason sim's draft night phase). The integration surface is narrow and additive.

Two identity systems run in parallel: existing cookie sessions for the draft sim (ephemeral, no change), and Supabase anonymous JWT for the learning platform (durable, upgradeable). Anonymous users get a real UUID from `signInAnonymously()` on first load; all progress rows are keyed to that UUID; when the user creates an account the UUID stays the same — no data migration needed. localStorage mirrors Supabase writes for instant reads; Supabase is authoritative if they diverge.

**Major components:**
1. **Supabase client module** (`server/stores/supabaseClient.ts`) — single import point for service-role admin client; all REST routes use this; never touches WS layer
2. **BallDontLie data layer** (`server/data/`) — disk-cached API wrapper + static coach seed; warm-up runs async on server startup; never called on request path
3. **Offseason sim engine** (`server/services/offseasonSimEngine.ts`) — pure computation; stateless; accepts pre-fetched data, returns serializable outputs; reuses existing `aggregateTeam()` for draft phase
4. **REST routes** (`server/routes/lessons.ts`, `lessonProgress.ts`, `offseasonSim.ts`, `userProfile.ts`, `dailyChallenge.ts`, `admin.ts`) — new route files mounted alongside existing `lobbies.ts`; all protected by `supabaseAuth.ts` JWT middleware
5. **Learning system UI** (`client/src/features/lessons/`) — `FilmPlayer.tsx` + `PauseAndPredict.tsx` + `ScenarioSimulation.tsx` + `LessonCard.tsx`; pause-and-predict uses `seekTo`/`pauseVideo` in `onReady`, not autoplay-then-pause
6. **LearningContext** (`client/src/context/LearningContext.tsx`) — completely separate from `AppContext`; owns user identity, progress, streak, daily challenge state; runs `signInAnonymously()` on first load
7. **Offseason sim UI** (`client/src/features/offseason-sim/`) — 7-phase wizard; `OffseasonSimProvider` persists to Supabase after every phase transition; resume is a `GET /api/offseason/resume` on load
8. **CMS admin layer** (`client/src/features/cms-admin/`) — admin-only React pages under `/admin` route prefix; inside existing SPA, not a separate app

**Supabase schema (core tables):** `lessons`, `lesson_progress`, `offseason_runs` (JSONB `phase_state`), `daily_challenges`, `daily_submissions`. All user-keyed tables have RLS `USING (auth.uid() = user_id)`. Anonymous users assume the `authenticated` Postgres role via `is_anonymous` JWT claim — this must be accounted for in all RLS policies.

### Critical Pitfalls

1. **Silent coaching simulation bug** — `handleSimulateRoundInternal` uses stub team data (all ratings at 50), making auto-sim results random. Fix by passing `allPlayers` through the auto-sim path before any new feature is built on top. Write a regression test (1000 sims, high-rated team beats 50-rated team at statistically significant rate). *Must be Phase 1, before any learning content or offseason sim work begins.*

2. **BallDontLie rate limits and missing coach data** — Free tier is 5 req/min; season averages and coach data do not exist at any tier. Cache all responses to disk at server startup; never call live on request path. Treat coach profiles as hand-curated editorial content (`nba-seed.json`), not API data. *Must be addressed before data layer design for offseason sim.*

3. **Supabase RLS silent failures for anonymous users** — `USING (auth.uid() = user_id)` evaluates to `null = user_id` (always false) for non-Supabase sessions, returning empty results with no error. Write RLS policies that handle three states explicitly: authenticated, Supabase-anonymous, and unauthenticated. Test with three simultaneous browser sessions before any progress feature ships. *Must be addressed in infrastructure phase before progress tables are created.*

4. **YouTube embed availability** — Videos get removed by rights holders; official NBA clips are high risk. Build a three-state lesson component (API ready / video unavailable / API failed) and an admin-facing health-check script that hits the YouTube oEmbed endpoint weekly. Store video IDs (not full URLs) and a `lastVerifiedAt` date in the CMS. *Must be addressed before first pause-and-predict lesson is authored.*

5. **Offseason sim schema evolution** — JSONB-serialized run state breaks on model changes (save-file compatibility problem). Add `schemaVersion: number` to every saved run from day one. Write a `migrateRun()` function alongside the schema and update it with every model change. Use Zod at the deserialization boundary — never blind-cast from JSONB. *Must be addressed before first save is ever written to Supabase.*

---

## Implications for Roadmap

Based on combined research, the dependency graph and pitfall mitigations dictate a clear 6-phase structure. The ordering is non-negotiable: the coaching bug fix must precede all educational content, infrastructure must precede features, and the offseason sim must follow — not precede — lesson platform validation.

### Phase 1: Foundation and Bug Fixes

**Rationale:** The existing simulation correctness bug (`handleSimulateRoundInternal`) and the quarter coaching wiring gap make the codebase unsafe to build on. Any teaching layer built before these fixes misleads users. Additionally, the debug logger, snapshot ID hardcode, and Socket.io version mismatch are minor issues that compound if left until later. Fixing everything in one foundational phase creates a clean, tested baseline.

**Delivers:** A correctly functioning simulation engine; wired quarter coaching phase transitions; consolidated server handler architecture (`lobbies`/`drafts` Maps moved to `server/stores/`); cleaned-up minor issues; regression tests for simulation correctness.

**Addresses:** Coaching lesson accuracy (content can now truthfully say decisions have consequences), offseason sim phase 5 integrity (draft night reuses the fixed engine).

**Avoids:** Pitfalls 1 (coaching bug), 6 (quarter coaching wiring gap), 9 (production debug logger), 10 (hardcoded snapshot ID), 11 (Socket.io version mismatch).

**Research flag:** Standard patterns — no deeper research needed. Bug locations are known; fixes are surgical.

---

### Phase 2: Infrastructure (Supabase + Auth + Data Layer)

**Rationale:** All subsequent features depend on Supabase persistence and the BallDontLie data cache. Auth and schema decisions made incorrectly here cascade into every feature that follows. This phase has the highest architectural risk — RLS misconfiguration, dual-authority state, and anonymous user handling must be resolved before any feature writes user data.

**Delivers:** Supabase project initialized with full schema (lessons, lesson_progress, offseason_runs, daily_challenges, daily_submissions); RLS policies covering all three user states (authenticated, anonymous, unauthenticated); `LearningContext` with anonymous sign-in; BallDontLie disk cache with background warm-up; static `nba-seed.json` with curated coach profiles; Zod validation middleware wired to Express routes; shared type extensions in `shared/types.ts`.

**Uses:** `@supabase/supabase-js` 2.98.0 (both workspaces), `zod` 4.3.6 (both workspaces), BallDontLie free tier, Supabase `pg_cron` for daily challenge rotation.

**Avoids:** Pitfalls 2 (BallDontLie rate limits), 3 (dual-authority state), 5 (RLS silent failures for anonymous users).

**Research flag:** Needs careful implementation validation. RLS policy testing (three simultaneous browser sessions) and authority boundary documentation must happen before Phase 3 begins. Consider a research-phase milestone to validate RLS behavior empirically.

---

### Phase 3: Core Learning System

**Rationale:** This is the minimum viable product. Once infrastructure exists, the lesson card system, film player, pause-and-predict interactions, admin CMS, and anonymous progress tracking can be built. The daily challenge and streak system belong here too — without a retention loop, early users have no reason to return. Must ship with 15–20 authored lessons.

**Delivers:** Lesson card system with three role lenses; film breakdown pages with timestamped YouTube embeds; pause-and-predict interactions (`FilmPlayer.tsx`, `PauseAndPredict.tsx`) with three-state fallback; `ScenarioSimulation.tsx` with process-based scoring; searchable content library; anonymous progress tracking (localStorage + Supabase sync); daily challenge with streak tracking; shareable result cards; onboarding (team preference, level, goal); admin CMS (lesson authoring, answer-key config, daily challenge scheduling); homepage showing all three lenses.

**Implements:** Learning system UI components, LearningContext (full — progress tracking wired end-to-end), CMS admin layer, REST routes for lessons/progress/daily challenge.

**Avoids:** Pitfall 4 (YouTube embed availability — three-state component and health-check script built before first lesson is authored), Pitfall 8 (content staleness — `lastReviewedAt` and `contentLockedToSeason` CMS fields from day one).

**Research flag:** Pause-and-predict interaction design may need research-phase. The interaction state machine (polling at 500ms, `seekTo`/`pauseVideo` in `onReady`, mobile behavior differences) is well-documented in STACK.md and ARCHITECTURE.md but has nuance that warrants a focused implementation spike before building the full lesson component system.

---

### Phase 4: Draft Simulator Teaching Layer

**Rationale:** The existing draft simulator is an underutilized educational asset. Adding a teaching overlay and post-draft analysis is high leverage at low rebuild cost — it reuses the existing game engine (now fixed), maps draft decisions to the lesson taxonomy created in Phase 3, and gives users an immediate "apply what you learned" experience. This phase validates that the lesson taxonomy is deep enough to generate meaningful post-activity analysis — a prerequisite signal before investing in the offseason simulator.

**Delivers:** Teaching overlay during draft picks (contextual tips mapped to lesson taxonomy tags); post-draft analysis (what you got right, what you missed, which decision patterns mattered); integration of existing Monte Carlo output with lesson categories; user account upgrade flow (localStorage → Supabase, optional email registration).

**Avoids:** Pitfall 1 (coaching bug must be fixed before teaching overlays reference simulation outcomes as instructive).

**Research flag:** Standard patterns — lesson taxonomy mapping is editorial work, not technical research. Post-draft analysis logic follows established patterns from Phase 3 interaction scoring.

---

### Phase 5: User Profile and Engagement Features

**Rationale:** The user skill profile becomes meaningful only after sufficient lesson completion history exists (20+ lessons completed). Building it before Phase 3 content is established produces an empty, misleading experience. Similarly, friend leaderboards need a user base. This phase transforms the platform from content delivery into a personalized learning system.

**Delivers:** Role-lens-aware skill profile ("Your Coach IQ is strong; your GM IQ asset valuation understanding is weak — try these next"); Supabase auth account upgrade with cross-device sync; friend leaderboard scoped to daily challenge scores; streak freeze mechanic; badge system for meaningful milestones (not XP accumulation).

**Implements:** `userProfile.ts` REST route; Supabase account upgrade flow; `GET /api/profile` with lens-aggregated accuracy data; friend leaderboard query.

**Avoids:** Anti-feature: full XP gamification economy (streaks stay binary; no rank ladders).

**Research flag:** Skill profile recommendation logic may need a research spike. The aggregation model (how to weight lesson accuracy by recency, lens, subcategory depth) has no single established pattern — it warrants design-first thinking before implementation.

---

### Phase 6: NBA Offseason Simulator

**Rationale:** The offseason simulator is the capstone product — powerful, but only meaningful after users have GM IQ lesson foundation. It is also the most complex workstream by a significant margin (7-phase state machine, BallDontLie data, Supabase save/resume, simplified cap constraints, phase-by-phase grading). Deferring it until Phase 5 ensures the lesson platform is validated and content-rich before engineering resources shift to this major new engine.

**Delivers:** 7-phase offseason simulation loop (team context → coaching market → scouting/pre-draft → trade market → draft night → free agency → post-offseason recap); real NBA team/player/coach names; save/resume across sessions; phase-based grading and fit reports; simplified (but realistic) cap constraint model; recap screen with developmental environment score.

**Uses:** BallDontLie data layer (from Phase 2), offseason sim engine (`offseasonSimEngine.ts`), existing `aggregateTeam()`/`computeArchetypeProfile()` pure functions for draft night phase, Supabase `offseason_runs` table (JSONB `phase_state`).

**Avoids:** Pitfall 7 (schema evolution — `schemaVersion` on all saved runs from day one, `migrateRun()` function, Zod at deserialization boundary); anti-feature: perfect CBA simulation (simplified-but-realistic constraints only); anti-feature: multi-year continuity mode.

**Research flag:** Needs research-phase before implementation. The 7-phase decision engine design, simplified cap model parameters, and coaching/trade grading rubrics all require domain research that is out of scope for a general architecture survey. Phase-specific research is strongly recommended before the offseason sim begins.

---

### Phase Ordering Rationale

- Phase 1 before everything: the coaching bug is a correctness issue, not a polish issue. Building learning content on top of a broken sim makes the content factually wrong.
- Phase 2 before Phase 3: no feature can write user data until RLS policies and the authority boundary are defined. Getting this wrong causes silent data loss that is hard to diagnose retroactively.
- Phase 3 before Phase 4: the draft teaching layer requires lesson taxonomy depth (the tags, lenses, difficulty levels) that only exists after Phase 3 content is authored.
- Phase 4 before Phase 5: the skill profile requires completion history. The draft teaching layer is the first mechanism to generate meaningful cross-lesson completion data.
- Phase 5 before Phase 6: the offseason sim is positioned as a GM capstone. Users should arrive with GM IQ lesson background. The skill profile (Phase 5) also provides the "you're ready for the sim" signal.
- Phase 6 last: highest complexity, clearest dependency on everything before it.

### Research Flags

Phases needing deeper research during planning:
- **Phase 2 (Infrastructure):** RLS policy behavior for anonymous Supabase users vs. unauthenticated sessions is subtle. Recommend an empirical validation spike (three-session test) before proceeding to Phase 3.
- **Phase 3 (Core Learning System):** Pause-and-predict interaction state machine has mobile-specific behavior (autoplay blocked, `onReady` required) that warrants an implementation spike before full lesson component build.
- **Phase 5 (User Profile):** Skill profile recommendation aggregation logic (weighting by recency, lens, subcategory) has no established pattern. Needs design-first milestone before implementation.
- **Phase 6 (Offseason Simulator):** The 7-phase decision engine, simplified cap model, and grading rubrics require dedicated domain research before build. Do not start without a research-phase milestone.

Phases with standard patterns (research-phase optional):
- **Phase 1 (Foundation):** Bug locations are known from codebase analysis. Fixes are surgical. No new patterns introduced.
- **Phase 4 (Draft Teaching Layer):** Lesson taxonomy mapping is editorial work. Post-draft analysis follows Phase 3 scoring patterns. No novel technical territory.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All packages verified on npm registry as of 2026-03-09. BallDontLie rate limits confirmed from official docs. Supabase anonymous auth stable. `react-youtube` abandonment verified. |
| Features | HIGH (table stakes), MEDIUM (competitive) | Table stakes from peer-reviewed learning research and official Duolingo data. HooperIQ competitive analysis is MEDIUM — limited public information about their feature set. |
| Architecture | HIGH | Existing codebase read directly. Supabase and BallDontLie from official docs. The orthogonal REST/WS design is well-established. |
| Pitfalls | HIGH (codebase-specific), MEDIUM (general) | Coaching bug, quarter coaching wiring gap, and snapshot ID hardcode are from direct code analysis. RLS misconfiguration risk corroborated by official Supabase docs and community reports. |

**Overall confidence:** HIGH

### Gaps to Address

- **Coach profile data model:** What tendency tags should `nba-seed.json` carry (pace preference, defensive intensity, 3pt emphasis, player development reputation, etc.)? This is an editorial question with no research answer. Decide during Phase 2 data layer design with domain expertise.
- **Simplified cap model parameters:** What level of CBA abstraction is right for casual fans? Too simple and the sim feels fake; too complex and it confuses. No research source settles this. Requires user research or expert input during Phase 6 design.
- **Skill profile recommendation algorithm:** How to aggregate lesson accuracy across lenses and subcategories into actionable "try these next" recommendations is not a solved problem in sports education. Needs design-first exploration during Phase 5 planning.
- **Content volume for meaningful skill profile:** Research suggests 20+ lessons before the profile has signal. Launch with 15–20 lessons; plan a content sprint for Month 2 to reach the threshold where skill profile recommendations are credible.
- **`@u-wave/react-youtube` long-term maintenance:** MEDIUM confidence on this package. If it creates issues, the zero-dependency fallback (load IFrame API script manually via `useEffect`, instantiate `new YT.Player()` directly) is fully documented in STACK.md and carries no risk.

---

## Sources

### Primary (HIGH confidence)
- Existing codebase (`server/`, `client/`, `shared/`) — direct analysis; coaching bug, wiring gap, and all architectural patterns
- [Supabase Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous) — anonymous auth, upgrade path, UUID persistence
- [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) — RLS policy patterns, null semantics
- [Supabase pg_cron docs](https://supabase.com/docs/guides/database/extensions/pg_cron) — daily challenge scheduling
- [BallDontLie official API docs](https://nba.balldontlie.io/) — rate limits (5/60/600 req/min), endpoint availability, confirmed no coach data
- [TanStack Query v5 docs](https://tanstack.com/query/v5/docs/react/installation) — React 18 compatibility, setup
- [YouTube IFrame Player API reference](https://developers.google.com/youtube/iframe_api_reference) — `seekTo`, `pauseVideo`, `onStateChange`, error codes
- [Zod v4 release](https://zod.dev/v4) — stable July 2025; breaking changes from v3 documented
- [Duolingo streak research](https://blog.duolingo.com/improving-the-streak/) — 7-day streak retention data, XP-coupling pitfalls
- Court Vision PRD (`PROJECT.md`) — scope constraints, anti-features, offseason sim requirements
- `.planning/codebase/CONCERNS.md` — codebase audit; coaching bug, timer leak, duplicate reliability calculation

### Secondary (MEDIUM confidence)
- [HooperIQ Platform](https://www.hooperiq.com/) — competitor feature analysis
- [@u-wave/react-youtube GitHub](https://github.com/u-wave/react-youtube) — maintenance activity (~4 months before research date)
- [Interactive video learning — PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11965562/) — testing effect, pause-and-predict efficacy
- [Algolia search filter UX best practices](https://www.algolia.com/blog/ux/search-filter-ux-best-practices/) — filter/search UX patterns
- [Gamification anti-patterns — ScienceDirect](https://www.sciencedirect.com/science/article/abs/pii/S0378720625000369) — XP fatigue, pointsification
- [Supabase REST API with Express (Medium)](https://medium.com/codex/rest-api-with-express-and-supabase-e8370a463d84) — Express + Supabase integration pattern
- [Payload CMS v3 announcement](https://payloadcms.com/posts/blog/payload-30-the-first-cms-that-installs-directly-into-any-nextjs-app) — Next.js-native; Express incompatibility rationale

### Tertiary (LOW confidence)
- RLS misconfiguration pattern reports (community sources) — corroborated against official Supabase docs; treat specific statistics with caution

---

*Research completed: 2026-03-09*
*Ready for roadmap: yes*

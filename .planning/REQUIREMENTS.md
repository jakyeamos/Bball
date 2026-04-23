# Requirements: Court Vision

**Defined:** 2026-03-09
**Core Value:** The platform only succeeds if users' basketball IQ genuinely improves ??? education comes before surface polish.

## v1 Requirements

### Foundation

- [x] **FOUND-01**: Codebase is rebranded to Court Vision (app name, page titles, meta tags, repo identity)
- [x] **FOUND-02**: Court Vision visual identity is established: color tokens, typography scale, and Tailwind theme configured in a design system layer
- [x] **FOUND-03**: Coaching simulation bug is fixed ??? `handleSimulateRoundInternal` uses real `TeamAggregation` objects, not blank stubs, so auto-sim produces correct results
- [x] **FOUND-04**: Quarter-by-quarter coaching WebSocket events are wired ??? `SUBMIT_QUARTER_COACHING` and `READY_FOR_QUARTER` are handled in `socketManager.ts`
- [x] **FOUND-05**: Homepage shows all three role lenses (Player IQ, Coach IQ, GM IQ) immediately on load
- [x] **FOUND-06**: Top-level navigation allows fluid browsing across all three role lenses without locking the user into one

### Infrastructure

- [ ] **INFRA-01**: Supabase project is initialized with environment variables configured for both client (anon key) and server (service-role key) workspaces
- [ ] **INFRA-02**: Anonymous user sign-in is established at app load via `supabase.auth.signInAnonymously()` ??? every visitor gets a durable UUID from first visit
- [ ] **INFRA-03**: Supabase database schema is created: `users`, `lesson_progress`, `daily_challenge_attempts`, `offseason_runs`, `coach_profiles` tables with correct RLS policies
- [ ] **INFRA-04**: Anonymous-to-account upgrade path works ??? existing `user_id` persists through email/password account creation with no data loss
- [ ] **INFRA-05**: Zod validation schemas are added to `shared/src/schemas.ts` covering lesson, progress, and offseason sim data shapes
- [ ] **INFRA-06**: TanStack Query v5 is installed in the client workspace and wraps all REST API calls for the learning platform layer

### Data Layer

- [x] **DATA-01**: Build-time seed (`nba_api` Python + TS driver) fetches active NBA teams and roster players and writes to `server/data/nba-seed.json` — never called at runtime
- [x] **DATA-02**: NBA identity disk cache is implemented with warm-up on server start and a seasonal refresh mechanism (`npm run refresh:nba-cache`)
- [x] **DATA-03**: Static coach profiles seed file (`server/data/coaches-seed.json`) contains real NBA head coaches with tendency tags: pace, scheme, youth development flag, driver-friendly flag, shooter-friendly flag
- [x] **DATA-04**: Existing Python `nba_api` scraper is retained and extended to pull player season averages and map them to the existing 30-feature `PlayerFeatures` schema
- [x] **DATA-05**: nba_api / scrape pipeline stats fields are mapped to the existing 30-feature `PlayerFeatures` schema with explicit field-by-field documentation (`docs/data/player-feature-mapping.md`)
- [ ] **DATA-06**: **Unified stat utilization** — Draft sim, Phase 7 teaching/post-draft analysis, and later offseason (and any lesson or profile UI that cites player evaluation) **consume** the same documented pipeline: [`docs/data/player-feature-mapping.md`](../docs/data/player-feature-mapping.md), [`docs/data/nba-stats-stack-delta-todos.md`](../docs/data/nba-stats-stack-delta-todos.md), [`docs/data/external-data-sources.md`](../docs/data/external-data-sources.md). **Retroactive rule:** when the seed/scrape/mapping layer adds or changes official stats, derived metrics, or league-relative context, the **draft simulator is updated in the same release** or a **blocking** issue tracks the gap so the legacy sim does not drift from the rest of the product. Optional third-party or PBP-derived metrics follow caching/attribution notes in `external-data-sources.md`. **Phase 6 (optional):** If a daily challenge includes **NBA stat-backed** prompts or explanations (e.g. player comparison, true shooting context), copy and any displayed numbers follow the same **DATA-06** contracts — not ad-hoc definitions.

**Sourcing roadmap (living docs):** Net-new work on the core NBA stats stack (multi-endpoint ingest, playtypes, shot data, league-relative metrics) is listed in [`docs/data/nba-stats-stack-delta-todos.md`](../docs/data/nba-stats-stack-delta-todos.md). Free/public options outside stats.nba.com (DARKO/EPM surfaces, PBP + `pbpstats`, cap sites, injury reports, G League / NCAA entry points) are catalogued in [`docs/data/external-data-sources.md`](../docs/data/external-data-sources.md).

### Core Learning System

- [ ] **LEARN-01**: Lesson card component renders: title, role lens badge (Player/Coach/GM IQ), difficulty indicator, media embed, takeaway text, and interaction type label
- [ ] **LEARN-02**: Film breakdown page renders a YouTube embed with timestamped annotation sidebar; annotations are linked to specific video timestamps
- [ ] **LEARN-03**: Pause-and-predict interaction works end-to-end: video plays, pauses automatically at a configured timestamp, user submits an answer, explanation reveals, video resumes
- [ ] **LEARN-04**: Pause-and-predict handles three states gracefully: playing normally, video unavailable (YouTube removed), YouTube IFrame API failure
- [ ] **LEARN-05**: Scenario simulation component presents a situation, collects the user's decision, scores it against a process-based answer key, and explains the reasoning
- [ ] **LEARN-06**: "Learn More" expandable section is available on lesson cards for optional depth content without cluttering the main lesson
- [ ] **LEARN-07**: 15???20 seed lessons are authored and live at launch, distributed across Player IQ, Coach IQ, and GM IQ tracks
- [ ] **LEARN-08**: Lesson completion is recorded ??? user's progress persists across sessions (localStorage for anonymous users, Supabase for account holders)

### Content Authoring (CMS)

- [ ] **CMS-01**: Admin lesson creation form allows: title, role lens, difficulty, YouTube URL + timestamp pairs, takeaway, interaction type, answer key config, tags
- [ ] **CMS-02**: Admin can edit existing lessons (all fields) and publish / unpublish them
- [ ] **CMS-03**: Daily challenge scheduling UI allows admin to assign a lesson to a specific calendar date and set the challenge question and answer key
- [ ] **CMS-04**: Admin tag management UI allows creating, renaming, and deleting content tags (used for content library filtering)
- [ ] **CMS-05**: CMS is protected by Supabase auth with an admin role check ??? not publicly accessible

### Daily Engagement

- [ ] **DAILY-01**: Daily Challenge is surfaced on the homepage ??? one challenge per day, rotating across all three tracks
- [ ] **DAILY-02**: User can complete the Daily Challenge and see their result with an explanation
- [ ] **DAILY-03**: Streak counter tracks consecutive days a user has completed the Daily Challenge ??? resets on a missed day
- [ ] **DAILY-04**: Light badge-style progression: user earns badges for streak milestones (3 days, 7 days, 30 days) and first completion in each track
- [ ] **DAILY-05**: Shareable result card is generated after Daily Challenge completion ??? shows the user's answer, whether it was correct, and the track/date
- [ ] **DAILY-06**: Friend leaderboard shows daily challenge completion status for a user's friends ??? scoped to current day only, not a persistent ranked ladder

### Content Discovery

- [ ] **DISC-01**: Searchable content library lists all lessons with filters: role lens, subcategory, difficulty, format (film / scenario / explainer)
- [ ] **DISC-02**: "What We Saw" recap articles are publishable from the CMS and surface in the content library, connecting recent NBA / college / overseas basketball to lesson topics
- [ ] **DISC-03**: Low-tech discussion board allows users to leave text comments on lessons ??? no upvoting, no feeds, no hot-take layer

### Onboarding

- [ ] **ONBD-01**: First-visit onboarding flow captures: favorite team(s), self-rated current knowledge level, and primary improvement goal (Player / Coach / GM lens)
- [ ] **ONBD-02**: Onboarding output surfaces: 3 recommended starter lessons, one benchmark challenge, and a direct path into the content library
- [ ] **ONBD-03**: Onboarding is skippable ??? users who decline are dropped directly onto the homepage with all three lenses visible

### User Profile

- [ ] **PROF-01**: User skill profile page shows: completion count by track, accuracy rate by track, badge collection, and suggested next lessons based on gaps
- [ ] **PROF-02**: User can optionally create an account (email + password via Supabase) to sync progress across devices ??? existing anonymous progress migrates automatically
- [ ] **PROF-03**: User can log out and log back in with their account credentials without losing progress

### Draft Simulator Integration

- [ ] **DRAFT-01**: Draft simulator UI is reskinned to feel native to the Court Vision brand ??? same simulation engine, refreshed visual layer
- [ ] **DRAFT-02**: Teaching overlay appears during the draft at key moments: contextual tips, strategy guidance, and decision explanations for each pick; tips may reference **stat dimensions** from the shared `PlayerFeatures` / mapping docs where they reinforce the lesson taxonomy
- [ ] **DRAFT-03**: Post-draft analysis page explains: what the user got right, what they missed, and which process mistakes mattered most ??? tied to Player IQ, Coach IQ, and GM IQ rubrics; analysis **grounds explanations in the same stat features** the sim uses (per DATA-06), not a parallel undocumented model
- [ ] **DRAFT-04**: Draft simulator is positioned as the "final exam" capstone ??? surfaced prominently in all three IQ tracks after a user has completed a threshold of lessons

### NBA Offseason Simulator ??? Data and Engine

- [ ] **OSIM-01**: Offseason sim engine: Team Context phase ??? user selects a real NBA team and the system loads real roster, draft picks, timeline assessment, and obvious team needs
- [x] **OSIM-02**: Offseason sim engine: Coaching Market phase ??? user interviews and hires from a pool of real coaches; selected coach's tendency tags adjust valuations and grade weights for the rest of the run
- [ ] **OSIM-03**: Offseason sim engine: Scouting and Pre-Draft phase ??? user builds a draft board using stats, workouts, interview signals, and explicit uncertainty signals; no pick is ever "certain"; **player stat presentation aligns with DATA-06** (same contracts and docs as draft sim / `PlayerFeatures` pipeline)
- [ ] **OSIM-04**: Offseason sim engine: Trade Market phase ??? user can explore trades involving players and picks; fit-based scoring explains why a trade helps or hurts
- [ ] **OSIM-05**: Offseason sim engine: Draft Night phase ??? user makes picks using the existing draft engine with teaching overlays and explanation-first grades
- [ ] **OSIM-06**: Offseason sim engine: Free Agency and Roster Balancing phase ??? user fills remaining needs using simplified but realistic spending constraints
- [ ] **OSIM-07**: Offseason sim engine: Post-Offseason Recap ??? team grade, fit report, developmental environment assessment, and projected direction with explanations for why the offseason succeeded or failed
- [ ] **OSIM-08**: Save and resume works ??? every phase transition persists to Supabase; user can close the browser and return to any in-progress run
- [ ] **OSIM-09**: Offseason sim state schema includes a `schemaVersion` field from day one ??? migration function handles version upgrades for saved runs
- [ ] **OSIM-10**: Offseason simulator is reachable from the GM IQ lens directly, and surfaced as a recommended advanced module after completing core GM IQ lessons

---

## v2 Requirements

### Accounts and Social
- **V2-01**: OAuth login (Google, GitHub) ??? email/password sufficient for v1
- **V2-02**: Full friend management (add/remove friends) ??? daily leaderboard uses a simpler invite-code mechanic in v1
- **V2-03**: Push / email notifications for daily challenge reminders

### Content
- **V2-04**: Video clip hosting beyond YouTube embeds (Cloudflare Stream or Mux) ??? once usage patterns justify cost
- **V2-05**: User-generated lesson creation ??? admin-only in v1
- **V2-06**: Live game companion mode ??? post-v1

### Offseason Simulator
- **V2-07**: Multi-year franchise continuity ??? single offseason runs only in v1
- **V2-08**: Full CBA / salary-cap replica ??? simplified constraints in v1
- **V2-09**: Multi-team offseason sim ??? one team per run in v1

### Platform
- **V2-10**: Native mobile apps (iOS / Android) ??? web-first only in v1
- **V2-11**: Live game API integration for "What We Saw" automation

---

## Out of Scope

| Feature | Reason |
|---------|--------|
| Native mobile apps | Web-first; mobile post-v1 |
| Heavy social mechanics (feeds, upvoting, hot takes) | Arguing is not learning; low-tech board only |
| Full gamification economy (loot boxes, rank ladders, complex XP) | Streaks + badges only; complex XP hurts retention per Duolingo research |
| Fantasy basketball integrations | Different product entirely |
| Perfect CBA / salary-cap replica in offseason sim v1 | Complexity outweighs learning value at this stage |
| User-vs-user debate products | Arguing is not learning |
| Paid expert marketplace or creator economy | Free platform only |
| Youth-specific segmentation | Single audience for now |
| Full film-annotation tooling for end users | Admin CMS only |
| Live game companion mode | Post-v1 |
| Multi-difficulty simulator ladders | Realism and ambiguity create challenge; tiers add fake certainty |
| Deep analytics dashboards | Practical progress profile + explanation-first recap only |
| Multi-year franchise mode in offseason sim v1 | Single offseason runs only; continuity is v2 |

---

## Traceability

*(Updated after roadmap creation ??? 10-phase fine granularity)*

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1: Foundation and Bug Fixes | Complete |
| FOUND-02 | Phase 1: Foundation and Bug Fixes | Complete |
| FOUND-03 | Phase 1: Foundation and Bug Fixes | Complete |
| FOUND-04 | Phase 1: Foundation and Bug Fixes | Complete |
| FOUND-05 | Phase 1: Foundation and Bug Fixes | Complete |
| FOUND-06 | Phase 1: Foundation and Bug Fixes | Complete |
| INFRA-01 | Phase 2: Infrastructure ??? Supabase and Auth | Pending |
| INFRA-02 | Phase 2: Infrastructure ??? Supabase and Auth | Pending |
| INFRA-03 | Phase 2: Infrastructure ??? Supabase and Auth | Pending |
| INFRA-04 | Phase 2: Infrastructure ??? Supabase and Auth | Pending |
| INFRA-05 | Phase 2: Infrastructure ??? Supabase and Auth | Pending |
| INFRA-06 | Phase 2: Infrastructure ??? Supabase and Auth | Pending |
| DATA-01 | Phase 3: Data Layer | Complete |
| DATA-02 | Phase 3: Data Layer | Complete |
| DATA-03 | Phase 3: Data Layer | Complete |
| DATA-04 | Phase 3: Data Layer | Complete |
| DATA-05 | Phase 3: Data Layer | Complete |
| DATA-06 | Phase 7 (primary); Phases 9–10 extend; Phase 6 when challenges are stat-backed; ongoing with data pipeline | Pending |
| LEARN-01 | Phase 4: Lesson Components and CMS | Pending |
| LEARN-02 | Phase 4: Lesson Components and CMS | Pending |
| LEARN-03 | Phase 4: Lesson Components and CMS | Pending |
| LEARN-04 | Phase 4: Lesson Components and CMS | Pending |
| LEARN-05 | Phase 4: Lesson Components and CMS | Pending |
| LEARN-06 | Phase 4: Lesson Components and CMS | Pending |
| LEARN-07 | Phase 4: Lesson Components and CMS | Pending |
| CMS-01 | Phase 4: Lesson Components and CMS | Pending |
| CMS-02 | Phase 4: Lesson Components and CMS | Pending |
| CMS-03 | Phase 4: Lesson Components and CMS | Pending |
| CMS-04 | Phase 4: Lesson Components and CMS | Pending |
| CMS-05 | Phase 4: Lesson Components and CMS | Pending |
| LEARN-08 | Phase 5: Progress, Onboarding, and Content Discovery | Pending |
| ONBD-01 | Phase 5: Progress, Onboarding, and Content Discovery | Pending |
| ONBD-02 | Phase 5: Progress, Onboarding, and Content Discovery | Pending |
| ONBD-03 | Phase 5: Progress, Onboarding, and Content Discovery | Pending |
| DISC-01 | Phase 5: Progress, Onboarding, and Content Discovery | Pending |
| DISC-02 | Phase 5: Progress, Onboarding, and Content Discovery | Pending |
| DISC-03 | Phase 5: Progress, Onboarding, and Content Discovery | Pending |
| DAILY-01 | Phase 6: Daily Engagement | Pending |
| DAILY-02 | Phase 6: Daily Engagement | Pending |
| DAILY-03 | Phase 6: Daily Engagement | Pending |
| DAILY-04 | Phase 6: Daily Engagement | Pending |
| DAILY-05 | Phase 6: Daily Engagement | Pending |
| DAILY-06 | Phase 6: Daily Engagement | Pending |
| DRAFT-01 | Phase 7: Draft Simulator Teaching Layer | Pending |
| DRAFT-02 | Phase 7: Draft Simulator Teaching Layer | Pending |
| DRAFT-03 | Phase 7: Draft Simulator Teaching Layer | Pending |
| DRAFT-04 | Phase 7: Draft Simulator Teaching Layer | Pending |
| PROF-01 | Phase 8: User Profile and Account Upgrade | Pending |
| PROF-02 | Phase 8: User Profile and Account Upgrade | Pending |
| PROF-03 | Phase 8: User Profile and Account Upgrade | Pending |
| OSIM-01 | Phase 9: Offseason Simulator ??? Foundation | Pending |
| OSIM-08 | Phase 9: Offseason Simulator ??? Foundation | Pending |
| OSIM-09 | Phase 9: Offseason Simulator ??? Foundation | Pending |
| OSIM-10 | Phase 9: Offseason Simulator ??? Foundation | Pending |
| OSIM-02 | Phase 10: Offseason Simulator ??? Decision Loop | Complete |
| OSIM-03 | Phase 10: Offseason Simulator ??? Decision Loop | Pending |
| OSIM-04 | Phase 10: Offseason Simulator ??? Decision Loop | Pending |
| OSIM-05 | Phase 10: Offseason Simulator ??? Decision Loop | Pending |
| OSIM-06 | Phase 10: Offseason Simulator ??? Decision Loop | Pending |
| OSIM-07 | Phase 10: Offseason Simulator ??? Decision Loop | Pending |

**Coverage:**
- v1 requirements: 60 total
- Mapped to phases: 60
- Unmapped: 0

---
*Requirements defined: 2026-03-09*
*Last updated: 2026-03-24 — DATA-06 unified stat utilization + DRAFT-02/03 stat alignment*
